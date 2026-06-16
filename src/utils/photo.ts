import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

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
  if (
    relativePath.startsWith("achievement-photos/") ||
    relativePath.startsWith("profile-photos/")
  ) {
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

const ensurePhotoDirAsync = async () => {
  const dirInfo = await FileSystem.getInfoAsync(PHOTO_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  }
};

const ensureProfilePhotoDirAsync = async () => {
  const dirInfo = await FileSystem.getInfoAsync(PROFILE_PHOTO_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(PROFILE_PHOTO_DIR, {
      intermediates: true,
    });
  }
};

const buildPhotoFileName = () => {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `achievement-${Date.now()}-${suffix}.jpg`;
};

const buildProfilePhotoFileName = () => {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `profile-${Date.now()}-${suffix}.jpg`;
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

/**
 * 画像をライブラリから選択し、アプリ専用ディレクトリに JPEG として保存する。
 * - 長辺 1600px 以内にリサイズ
 * - JPEG 圧縮 0.75（0.7〜0.8 の中間）
 * - HEIC/PNG なども JPEG に変換
 * - 戻り値は相対パス（例: achievement-photos/xxx.jpg）
 */
export const pickAndSavePhotoAsync = async (): Promise<string | null> => {
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
  const resizeActions = calculateResize(asset.width, asset.height);

  const manipulated = await ImageManipulator.manipulateAsync(
    asset.uri,
    resizeActions,
    {
      compress: JPEG_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  await ensurePhotoDirAsync();
  const fileName = buildPhotoFileName();
  const destination = `${PHOTO_DIR}${fileName}`;

  await FileSystem.moveAsync({ from: manipulated.uri, to: destination });
  return `achievement-photos/${fileName}`;
};

/**
 * プロフィール写真をライブラリから選択し、profile-photos/ に JPEG として保存する。
 * - 戻り値は相対パス（例: profile-photos/xxx.jpg）
 */
export const pickAndSaveProfilePhotoAsync = async (): Promise<
  string | null
> => {
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
  const resizeActions = calculateResize(asset.width, asset.height);

  const manipulated = await ImageManipulator.manipulateAsync(
    asset.uri,
    resizeActions,
    {
      compress: JPEG_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  await ensureProfilePhotoDirAsync();
  const fileName = buildProfilePhotoFileName();
  const destination = `${PROFILE_PHOTO_DIR}${fileName}`;

  await FileSystem.moveAsync({ from: manipulated.uri, to: destination });
  return `profile-photos/${fileName}`;
};

/**
 * FileSystem 上にファイルが存在するかを確認し、存在すれば相対パスを返す。
 * 入力は相対パス（achievement-photos/xxx.jpg 形式）を期待する。
 */
export const ensureFileExistsAsync = async (
  path?: string | null
): Promise<string | null> => {
  if (!path) return null;
  if (!isSafePhotoPath(path)) {
    console.warn("Unsafe photoPath rejected:", path);
    return null;
  }
  try {
    const info = await FileSystem.getInfoAsync(resolvePhotoPath(path));
    return info.exists ? path : null;
  } catch (error) {
    console.warn("Failed to check file existence", error);
    return null;
  }
};

/**
 * ファイルが存在すれば削除する（エラーは呼び出し元に伝搬させない）。
 * 入力は相対パス（achievement-photos/xxx.jpg 形式）を期待する。
 */
export const deleteIfExistsAsync = async (path?: string | null) => {
  if (!path) return;
  if (!isSafePhotoPath(path)) {
    console.warn("Unsafe photoPath rejected:", path);
    return;
  }
  try {
    const absolutePath = resolvePhotoPath(path);
    const info = await FileSystem.getInfoAsync(absolutePath);
    if (info.exists) {
      await FileSystem.deleteAsync(absolutePath, { idempotent: true });
    }
  } catch (error) {
    console.warn("Failed to delete file", error);
  }
};
