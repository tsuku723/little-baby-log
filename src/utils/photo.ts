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

/** 寸法が確定している、トリミングUIに渡せる状態の写真。 */
export type SizedPickedPhoto = { uri: string; width: number; height: number };

export type PickedPhoto =
  | SizedPickedPhoto
  | { uri: string; width: null; height: null };

/**
 * 画像をライブラリから選択する（保存は行わない）。
 * 戻り値のサイズはトリミングUIでの表示・crop座標計算に使う。
 * 端末・ピッカーによっては寸法が取得できないことがあり、その場合は width/height が null になる
 * （呼び出し側はトリミングをスキップして保存する）。
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
    return { uri: asset.uri, width: null, height: null };
  }
  return { uri: asset.uri, width: asset.width, height: asset.height };
};

/**
 * （指定範囲があればクロップ後）長辺 1600px 以内にリサイズ・JPEG圧縮(0.75)する。
 * HEIC/PNG なども JPEG に変換。加工後の一時ファイルURIを返す。
 */
const resizeCompressAsync = async (
  sourceUri: string,
  cropRect?: CropRect
): Promise<string> => {
  if (cropRect) {
    const manipulated = await ImageManipulator.manipulateAsync(
      sourceUri,
      [{ crop: cropRect }, ...calculateResize(cropRect.width, cropRect.height)],
      {
        compress: JPEG_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    return manipulated.uri;
  }

  // crop無し（寸法不明な端末向けフォールバック）の場合、長辺1600pxを正しく守るため
  // 一度実寸を取得してからリサイズ量を決める。
  const probe = await ImageManipulator.manipulateAsync(sourceUri, []);
  const manipulated = await ImageManipulator.manipulateAsync(
    sourceUri,
    calculateResize(probe.width, probe.height),
    {
      compress: JPEG_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );
  return manipulated.uri;
};

const persistManipulatedPhotoAsync = async (
  manipulatedUri: string,
  dir: string,
  relativeDir: "achievement-photos" | "profile-photos",
  filePrefix: string
): Promise<string> => {
  await ensureDirAsync(dir);
  const fileName = buildFileName(filePrefix);
  const destination = `${dir}${fileName}`;

  await FileSystem.moveAsync({ from: manipulatedUri, to: destination });
  return `${relativeDir}/${fileName}`;
};

const saveCroppedPhotoToDirAsync = async (
  sourceUri: string,
  cropRect: CropRect,
  dir: string,
  relativeDir: "achievement-photos" | "profile-photos",
  filePrefix: string
): Promise<string> => {
  const manipulatedUri = await resizeCompressAsync(sourceUri, cropRect);
  return persistManipulatedPhotoAsync(
    manipulatedUri,
    dir,
    relativeDir,
    filePrefix
  );
};

const saveDirectPhotoToDirAsync = async (
  sourceUri: string,
  dir: string,
  relativeDir: "achievement-photos" | "profile-photos",
  filePrefix: string
): Promise<string> => {
  const manipulatedUri = await resizeCompressAsync(sourceUri);
  return persistManipulatedPhotoAsync(
    manipulatedUri,
    dir,
    relativeDir,
    filePrefix
  );
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
 * トリミングをスキップし、画像をそのまま（1600px基準にリサイズのみ）
 * アプリ専用ディレクトリに JPEG として保存する。
 * 選択した画像の寸法が取得できない端末向けのフォールバック。
 * 戻り値は相対パス（例: achievement-photos/xxx.jpg）
 */
export const saveDirectPhotoAsync = (sourceUri: string): Promise<string> =>
  saveDirectPhotoToDirAsync(
    sourceUri,
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

/**
 * トリミングをスキップし、画像をそのまま（1600px基準にリサイズのみ）
 * profile-photos/ に JPEG として保存する。
 * 選択した画像の寸法が取得できない端末向けのフォールバック。
 * 戻り値は相対パス（例: profile-photos/xxx.jpg）
 */
export const saveDirectProfilePhotoAsync = (
  sourceUri: string
): Promise<string> =>
  saveDirectPhotoToDirAsync(
    sourceUri,
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
