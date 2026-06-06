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
  path.startsWith(PHOTO_DIR) || path.startsWith(PROFILE_PHOTO_DIR);

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
  return destination;
};

/**
 * プロフィール写真をライブラリから選択し、profile-photos/ に JPEG として保存する。
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
  return destination;
};

/**
 * FileSystem 上にファイルが存在するかを確認し、存在すればパスを返す。
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
    const info = await FileSystem.getInfoAsync(path);
    return info.exists ? path : null;
  } catch (error) {
    console.warn("Failed to check file existence", error);
    return null;
  }
};

/**
 * ファイルが存在すれば削除する（エラーは呼び出し元に伝搬させない）。
 */
export const deleteIfExistsAsync = async (path?: string | null) => {
  if (!path) return;
  if (!isSafePhotoPath(path)) {
    console.warn("Unsafe photoPath rejected:", path);
    return;
  }
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      await FileSystem.deleteAsync(path, { idempotent: true });
    }
  } catch (error) {
    console.warn("Failed to delete file", error);
  }
};
