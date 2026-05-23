import * as FileSystem from "expo-file-system/legacy";
import JSZip from "jszip";

import { Achievement, UserProfile } from "@/state/AppStateContext";

const APP_VERSION = "1.0.0";
const BACKUP_FORMAT_VERSION = 1;

export const INVALID_FORMAT_ERROR =
  "バックアップファイルの形式が正しくありません";

export type BackupData = {
  version: number;
  appVersion: string;
  exportedAt: string;
  profiles: UserProfile[];
  achievements: Record<string, Achievement[]>;
};

export const createBackup = async (
  profiles: UserProfile[],
  achievements: Record<string, Achievement[]>
): Promise<string> => {
  const zip = new JSZip();
  const exportedAt = new Date().toISOString();

  const photoMap: Record<string, string> = {};

  for (const records of Object.values(achievements)) {
    for (const achievement of records) {
      if (achievement.photoPath && !photoMap[achievement.photoPath]) {
        const originalPath = achievement.photoPath;
        const filename =
          originalPath.split("/").pop() ?? `photo_${achievement.id}.jpg`;
        const zipPath = `photos/${filename}`;
        photoMap[originalPath] = zipPath;

        const fileInfo = await FileSystem.getInfoAsync(originalPath);
        if (fileInfo.exists) {
          const base64 = await FileSystem.readAsStringAsync(originalPath, {
            encoding: FileSystem.EncodingType.Base64,
          });
          zip.file(zipPath, base64, { base64: true });
        }
      }
    }
  }

  const exportedAchievements: Record<string, Achievement[]> = {};
  for (const [userId, records] of Object.entries(achievements)) {
    exportedAchievements[userId] = records.map((a) => ({
      ...a,
      photoPath: a.photoPath ? photoMap[a.photoPath] : undefined,
    }));
  }

  const exportedProfiles = profiles.map((p) => ({
    ...p,
    profilePhotoPath: undefined,
  }));

  const backupData: BackupData = {
    version: BACKUP_FORMAT_VERSION,
    appVersion: APP_VERSION,
    exportedAt,
    profiles: exportedProfiles,
    achievements: exportedAchievements,
  };

  zip.file("backup.json", JSON.stringify(backupData, null, 2));

  const base64Zip = await zip.generateAsync({ type: "base64" });
  const date = exportedAt.slice(0, 10).replace(/-/g, "");
  const outputUri = `${FileSystem.cacheDirectory}little-baby-log-backup-${date}.zip`;

  await FileSystem.writeAsStringAsync(outputUri, base64Zip, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return outputUri;
};

export const validateBackup = async (zipUri: string): Promise<void> => {
  const fileInfo = await FileSystem.getInfoAsync(zipUri);
  if (
    !fileInfo.exists ||
    ("size" in fileInfo && fileInfo.size > 150 * 1024 * 1024)
  ) {
    throw new Error(INVALID_FORMAT_ERROR);
  }

  const KNOWN_ERRORS = [INVALID_FORMAT_ERROR, "未対応のバックアップ形式です"];

  let backupData: BackupData;
  try {
    const base64Zip = await FileSystem.readAsStringAsync(zipUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const zip = await JSZip.loadAsync(base64Zip, { base64: true });
    const backupFile = zip.file("backup.json");
    if (!backupFile) throw new Error(INVALID_FORMAT_ERROR);
    const jsonText = await backupFile.async("text");
    backupData = JSON.parse(jsonText) as BackupData;
  } catch (e) {
    if (e instanceof Error && KNOWN_ERRORS.includes(e.message)) throw e;
    throw new Error(INVALID_FORMAT_ERROR);
  }

  if (
    backupData.version === undefined ||
    !Array.isArray(backupData.profiles) ||
    backupData.achievements === undefined ||
    backupData.profiles.length === 0
  ) {
    throw new Error(INVALID_FORMAT_ERROR);
  }

  if (backupData.version !== BACKUP_FORMAT_VERSION) {
    throw new Error("未対応のバックアップ形式です");
  }
};

export const restoreBackup = async (
  zipUri: string
): Promise<{
  profiles: UserProfile[];
  achievements: Record<string, Achievement[]>;
}> => {
  const fileInfo = await FileSystem.getInfoAsync(zipUri);
  if (
    !fileInfo.exists ||
    ("size" in fileInfo && fileInfo.size > 150 * 1024 * 1024)
  ) {
    throw new Error(INVALID_FORMAT_ERROR);
  }

  const KNOWN_ERRORS = [INVALID_FORMAT_ERROR, "未対応のバックアップ形式です"];

  let zip: JSZip;
  let backupData: BackupData;
  try {
    const base64Zip = await FileSystem.readAsStringAsync(zipUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    zip = await JSZip.loadAsync(base64Zip, { base64: true });
    const backupFile = zip.file("backup.json");
    if (!backupFile) throw new Error(INVALID_FORMAT_ERROR);
    const jsonText = await backupFile.async("text");
    backupData = JSON.parse(jsonText) as BackupData;
  } catch (e) {
    if (e instanceof Error && KNOWN_ERRORS.includes(e.message)) throw e;
    throw new Error(INVALID_FORMAT_ERROR);
  }

  if (
    backupData.version === undefined ||
    !Array.isArray(backupData.profiles) ||
    backupData.achievements === undefined ||
    backupData.profiles.length === 0
  ) {
    throw new Error(INVALID_FORMAT_ERROR);
  }

  if (backupData.version !== BACKUP_FORMAT_VERSION) {
    throw new Error("未対応のバックアップ形式です");
  }

  const photosDir = `${FileSystem.documentDirectory}photos/`;
  await FileSystem.makeDirectoryAsync(photosDir, { intermediates: true });

  const restoredAchievements: Record<string, Achievement[]> = {};
  for (const [userId, records] of Object.entries(backupData.achievements)) {
    restoredAchievements[userId] = await Promise.all(
      (records as Achievement[]).map(async (achievement) => {
        if (!achievement.photoPath) return achievement;

        const zipPath = achievement.photoPath;
        const filename = zipPath.split("/").pop() ?? "";
        const localPath = `${photosDir}${filename}`;

        const photoFile = zip.file(zipPath);
        if (photoFile) {
          const base64 = await photoFile.async("base64");
          await FileSystem.writeAsStringAsync(localPath, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          return { ...achievement, photoPath: localPath };
        }

        return { ...achievement, photoPath: undefined };
      })
    );
  }

  return { profiles: backupData.profiles, achievements: restoredAchievements };
};
