import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { CropRect } from "@/utils/cropMath";

export class PhotoPermissionDeniedError extends Error {
  constructor() {
    super("Media library permission denied");
    this.name = "PhotoPermissionDeniedError";
  }
}

/** 選択した写真の寸法が取得できず、トリミング座標を計算できない場合に投げる。 */
export class PhotoDimensionsUnavailableError extends Error {
  constructor() {
    super("Picked photo is missing width/height");
    this.name = "PhotoDimensionsUnavailableError";
  }
}

const PHOTO_DIR = `${FileSystem.documentDirectory}achievement-photos/`;
const PROFILE_PHOTO_DIR = `${FileSystem.documentDirectory}profile-photos/`;
const MAX_LONG_EDGE = 1600;
const JPEG_QUALITY = 0.75;

const isSafePhotoPath = (path: string): boolean =>
  path.startsWith("achievement-photos/") || path.startsWith("profile-photos/");

/**
 * 相対パスを絶対URIに変換する。表示・FS操作の直前にのみ使用する。
 * 相対パスでない場合（レガシーの絶対パス等）はそのまま返す。
 */
export const resolvePhotoPath = (relativePath: string): string => {
  if (isSafePhotoPath(relativePath)) {
    return `${FileSystem.documentDirectory}${relativePath}`;
  }
  return relativePath;
};

/**
 * 絶対パスから相対パスを抽出する（マイグレーション用）。
 * achievement-photos/ または profile-photos/ を含むパスに対して動作する。
 */
export const toRelativePhotoPath = (absolutePath: string): string | null => {
  const achievementIdx = absolutePath.indexOf("/achievement-photos/");
  if (achievementIdx !== -1) {
    return absolutePath.slice(achievementIdx + 1);
  }
  const profileIdx = absolutePath.indexOf("/profile-photos/");
  if (profileIdx !== -1) {
    return absolutePath.slice(profileIdx + 1);
  }
  return null;
};

const ensureDirAsync = async (dir: string) => {
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
};

const buildFileName = (prefix: string) => {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now()}-${suffix}.jpg`;
};

const calculateResize = (
  width?: number,
  height?: number
): ImageManipulator.Action[] => {
  if (!width || !height) {
    // 画像の寸法が取得できない場合でも、縦横 1600px の範囲に収める
    return [{ resize: { width: MAX_LONG_EDGE } }];
  }

  const longEdge = Math.max(width, height);
  if (longEdge <= MAX_LONG_EDGE) {
    return [];
  }

  const ratio = longEdge / MAX_LONG_EDGE;
  return width >= height
    ? [{ resize: { width: Math.round(width / ratio) } }]
    : [{ resize: { height: Math.round(height / ratio) } }];
};

export type PickedPhoto = { uri: string; width: number; height: number };

/**
 * 画像をライブラリから選択する（保存は行わない）。
 * 戻り値のサイズはトリミングUIでの表示・crop座標計算に使う。
 */
export const pickPhotoAsync = async (): Promise<PickedPhoto | null> => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new PhotoPermissionDeniedError();
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: "images",
    allowsMultipleSelection: false,
    quality: 1,
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  const asset = result.assets[0];
  if (!asset.width || !asset.height) {
    throw new PhotoDimensionsUnavailableError();
  }
  return { uri: asset.uri, width: asset.width, height: asset.height };
};

/**
 * 指定範囲でクロップ後、長辺 1600px 以内にリサイズ・JPEG圧縮(0.75)する。
 * HEIC/PNG なども JPEG に変換。加工後の一時ファイルURIを返す。
 */
const cropResizeCompressAsync = async (
  sourceUri: string,
  cropRect: CropRect
): Promise<string> => {
  const resizeActions = calculateResize(cropRect.width, cropRect.height);
  const manipulated = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ crop: cropRect }, ...resizeActions],
    {
      compress: JPEG_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );
  return manipulated.uri;
};

const saveCroppedPhotoToDirAsync = async (
  sourceUri: string,
  cropRect: CropRect,
  dir: string,
  relativeDir: "achievement-photos" | "profile-photos",
  filePrefix: string
): Promise<string> => {
  const manipulatedUri = await cropResizeCompressAsync(sourceUri, cropRect);

  await ensureDirAsync(dir);
  const fileName = buildFileName(filePrefix);
  const destination = `${dir}${fileName}`;

  await FileSystem.moveAsync({ from: manipulatedUri, to: destination });
  return `${relativeDir}/${fileName}`;
};

/**
 * トリミング済み画像をアプリ専用ディレクトリに JPEG として保存する。
 * 戻り値は相対パス（例: achievement-photos/xxx.jpg）
 */
export const saveCroppedPhotoAsync = (
  sourceUri: string,
  cropRect: CropRect
): Promise<string> =>
  saveCroppedPhotoToDirAsync(
    sourceUri,
    cropRect,
    PHOTO_DIR,
    "achievement-photos",
    "achievement"
  );

/**
 * トリミング済みプロフィール写真を profile-photos/ に JPEG として保存する。
 * 戻り値は相対パス（例: profile-photos/xxx.jpg）
 */
export const saveCroppedProfilePhotoAsync = (
  sourceUri: string,
  cropRect: CropRect
): Promise<string> =>
  saveCroppedPhotoToDirAsync(
    sourceUri,
    cropRect,
    PROFILE_PHOTO_DIR,
    "profile-photos",
    "profile"
  );

const toSafeRelativePath = (path: string): string | null => {
  if (isSafePhotoPath(path)) return path;
  const relative = toRelativePhotoPath(path);
  return relative && isSafePhotoPath(relative) ? relative : null;
};

/**
 * FileSystem 上にファイルが存在するかを確認し、存在すれば相対パスを返す。
 * 入力は相対パスを期待するが、レガシー絶対パスも正規化して処理する。
 */
export const ensureFileExistsAsync = async (
  path?: string | null
): Promise<string | null> => {
  if (!path) return null;
  const safePath = toSafeRelativePath(path);
  if (!safePath) {
    console.warn("Unsafe photoPath rejected:", path);
    return null;
  }
  try {
    const info = await FileSystem.getInfoAsync(resolvePhotoPath(safePath));
    return info.exists ? safePath : null;
  } catch (error) {
    console.warn("Failed to check file existence", error);
    return null;
  }
};

/**
 * ファイルが存在すれば削除する（エラーは呼び出し元に伝搬させない）。
 * 入力は相対パスを期待するが、レガシー絶対パスも正規化して処理する。
 */
export const deleteIfExistsAsync = async (path?: string | null) => {
  if (!path) return;
  const safePath = toSafeRelativePath(path);
  if (!safePath) {
    console.warn("Unsafe photoPath rejected:", path);
    return;
  }
  try {
    const absolutePath = resolvePhotoPath(safePath);
    const info = await FileSystem.getInfoAsync(absolutePath);
    if (info.exists) {
      await FileSystem.deleteAsync(absolutePath, { idempotent: true });
    }
  } catch (error) {
    console.warn("Failed to delete file", error);
  }
};
