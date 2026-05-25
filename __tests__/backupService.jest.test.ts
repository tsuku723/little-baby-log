import * as FileSystem from "expo-file-system/legacy";
import JSZip from "jszip";

jest.mock("expo-file-system/legacy", () => ({
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  cacheDirectory: "file:///cache/",
  documentDirectory: "file:///documents/",
  EncodingType: { Base64: "base64" },
}));

jest.mock("jszip");

const mockGetInfoAsync = FileSystem.getInfoAsync as jest.Mock;
const mockReadAsStringAsync = FileSystem.readAsStringAsync as jest.Mock;
const mockWriteAsStringAsync = FileSystem.writeAsStringAsync as jest.Mock;
const mockMakeDirectoryAsync = FileSystem.makeDirectoryAsync as jest.Mock;

let mockZipInstance: { file: jest.Mock; generateAsync: jest.Mock };

beforeEach(() => {
  jest.clearAllMocks();
  mockZipInstance = {
    file: jest.fn(),
    generateAsync: jest.fn().mockResolvedValue("base64zipdata"),
  };
  (JSZip as unknown as jest.Mock).mockImplementation(() => mockZipInstance);
  mockGetInfoAsync.mockResolvedValue({ exists: false });
  mockWriteAsStringAsync.mockResolvedValue(undefined);
  mockMakeDirectoryAsync.mockResolvedValue(undefined);
});

const baseProfile = {
  id: "u1",
  name: "テストちゃん",
  birthDate: "2024-01-01",
  dueDate: null,
  settings: {
    showCorrectedUntilMonths: 24,
    ageFormat: "ymd" as const,
    showDaysSinceBirth: true,
    lastViewedMonth: null,
  },
  createdAt: "2024-01-01T00:00:00.000Z",
};

const baseAchievement = {
  id: "a1",
  date: "2024-06-01",
  title: "はじめての笑顔",
  createdAt: "2024-06-01T00:00:00.000Z",
  updatedAt: "2024-06-01T00:00:00.000Z",
};

describe("BackupService", () => {
  test("プロフィールと記録が backup.json に含まれる", async () => {
    const { createBackup } = require("../src/services/backupService");
    const profiles = [baseProfile];
    const achievements = { u1: [baseAchievement] };

    await createBackup(profiles, achievements);

    expect(mockZipInstance.file).toHaveBeenCalledWith(
      "backup.json",
      expect.stringContaining('"テストちゃん"')
    );
    expect(mockZipInstance.file).toHaveBeenCalledWith(
      "backup.json",
      expect.stringContaining('"はじめての笑顔"')
    );
  });

  test("backup.json に version・appVersion・exportedAt が含まれる", async () => {
    const { createBackup } = require("../src/services/backupService");

    await createBackup([baseProfile], { u1: [baseAchievement] });

    const [, jsonString] = mockZipInstance.file.mock.calls.find(
      ([name]: [string]) => name === "backup.json"
    );
    const parsed = JSON.parse(jsonString);
    expect(parsed.version).toBe(1);
    expect(parsed.appVersion).toBeDefined();
    expect(parsed.exportedAt).toBeDefined();
  });

  test("写真が存在する場合は photos/ に格納し photoPath を ZIP 内パスに変換する", async () => {
    const { createBackup } = require("../src/services/backupService");
    mockGetInfoAsync.mockResolvedValue({ exists: true });
    mockReadAsStringAsync.mockResolvedValue("base64photo");

    const achievementWithPhoto = {
      ...baseAchievement,
      photoPath: "file:///documents/photo_a1.jpg",
    };

    await createBackup([baseProfile], { u1: [achievementWithPhoto] });

    expect(mockZipInstance.file).toHaveBeenCalledWith(
      "photos/photo_a1.jpg",
      "base64photo",
      { base64: true }
    );

    const [, jsonString] = mockZipInstance.file.mock.calls.find(
      ([name]: [string]) => name === "backup.json"
    );
    const parsed = JSON.parse(jsonString);
    expect(parsed.achievements.u1[0].photoPath).toBe("photos/photo_a1.jpg");
  });

  test("写真ファイルが存在しない場合は ZIP に含めない", async () => {
    const { createBackup } = require("../src/services/backupService");
    mockGetInfoAsync.mockResolvedValue({ exists: false });

    const achievementWithPhoto = {
      ...baseAchievement,
      photoPath: "file:///documents/missing.jpg",
    };

    await createBackup([baseProfile], { u1: [achievementWithPhoto] });

    const photoFileCalls = mockZipInstance.file.mock.calls.filter(
      ([name]: [string]) => name.startsWith("photos/")
    );
    expect(photoFileCalls).toHaveLength(0);
  });

  test("generateAsync が失敗した場合は例外を投げる", async () => {
    const { createBackup } = require("../src/services/backupService");
    mockZipInstance.generateAsync.mockRejectedValue(new Error("ZIP生成失敗"));

    await expect(createBackup([baseProfile], {})).rejects.toThrow(
      "ZIP生成失敗"
    );
  });

  test("返り値のURIにファイル名と日付が含まれる", async () => {
    const { createBackup } = require("../src/services/backupService");

    const uri = await createBackup([baseProfile], {});

    expect(uri).toMatch(/little-baby-log-backup-\d{8}\.zip$/);
    expect(uri).toContain("file:///cache/");
  });

  test("同一写真パスは一度だけ ZIP に追加される", async () => {
    const { createBackup } = require("../src/services/backupService");
    mockGetInfoAsync.mockResolvedValue({ exists: true });
    mockReadAsStringAsync.mockResolvedValue("base64photo");

    const sharedPhotoPath = "file:///documents/shared.jpg";
    const achievements = {
      u1: [
        { ...baseAchievement, id: "a1", photoPath: sharedPhotoPath },
        { ...baseAchievement, id: "a2", photoPath: sharedPhotoPath },
      ],
    };

    await createBackup([baseProfile], achievements);

    const photoFileCalls = mockZipInstance.file.mock.calls.filter(
      ([name]: [string]) => name === "photos/shared.jpg"
    );
    expect(photoFileCalls).toHaveLength(1);
  });

  describe("restoreBackup", () => {
    let mockLoadAsync: jest.Mock;
    let mockZipFile: jest.Mock;

    const makeTextFile = (data: object) => ({
      async: jest.fn().mockResolvedValue(JSON.stringify(data)),
    });

    const makePhotoFile = (base64: string) => ({
      async: jest.fn().mockResolvedValue(base64),
    });

    const validBackupData = {
      version: 1,
      appVersion: "1.0.0",
      exportedAt: "2024-01-01T00:00:00.000Z",
      profiles: [baseProfile],
      achievements: { u1: [baseAchievement] },
    };

    beforeEach(() => {
      mockGetInfoAsync.mockResolvedValue({ exists: true, size: 1024 });
      mockReadAsStringAsync.mockResolvedValue("base64zipdata");
      mockZipFile = jest.fn();
      mockLoadAsync = jest.fn().mockResolvedValue({ file: mockZipFile });
      (JSZip as any).loadAsync = mockLoadAsync;
    });

    test("正常系: profiles と achievements を返す", async () => {
      const { restoreBackup } = require("../src/services/backupService");
      mockZipFile.mockImplementation((name: string) => {
        if (name === "backup.json") return makeTextFile(validBackupData);
        return null;
      });

      const result = await restoreBackup("file:///cache/backup.zip");

      expect(result.profiles).toEqual([baseProfile]);
      expect(result.achievements.u1[0].title).toBe("はじめての笑顔");
    });

    test("正常系: ZIP 内に写真がある場合 documentDirectory/photos/ に保存し photoPath をローカルパスに書き換える", async () => {
      const { restoreBackup } = require("../src/services/backupService");
      const achievementWithPhoto = {
        ...baseAchievement,
        photoPath: "photos/photo_a1.jpg",
      };
      const backupWithPhoto = {
        ...validBackupData,
        achievements: { u1: [achievementWithPhoto] },
      };

      mockZipFile.mockImplementation((name: string) => {
        if (name === "backup.json") return makeTextFile(backupWithPhoto);
        if (name === "photos/photo_a1.jpg") return makePhotoFile("base64photo");
        return null;
      });

      const result = await restoreBackup("file:///cache/backup.zip");

      expect(mockWriteAsStringAsync).toHaveBeenCalledWith(
        "file:///documents/achievement-photos/photo_a1.jpg",
        "base64photo",
        { encoding: "base64" }
      );
      expect(result.achievements.u1[0].photoPath).toBe(
        "file:///documents/achievement-photos/photo_a1.jpg"
      );
    });

    test("正常系: ZIP 内に写真がない場合 photoPath を undefined にする", async () => {
      const { restoreBackup } = require("../src/services/backupService");
      const achievementWithPhoto = {
        ...baseAchievement,
        photoPath: "photos/missing.jpg",
      };
      const backupWithPhoto = {
        ...validBackupData,
        achievements: { u1: [achievementWithPhoto] },
      };

      mockZipFile.mockImplementation((name: string) => {
        if (name === "backup.json") return makeTextFile(backupWithPhoto);
        return null;
      });

      const result = await restoreBackup("file:///cache/backup.zip");

      expect(result.achievements.u1[0].photoPath).toBeUndefined();
    });

    test("バリデーション: backup.json が ZIP に存在しない", async () => {
      const { restoreBackup } = require("../src/services/backupService");
      mockZipFile.mockReturnValue(null);

      await expect(restoreBackup("file:///cache/backup.zip")).rejects.toThrow(
        "バックアップファイルの形式が正しくありません"
      );
    });

    test("バリデーション: version フィールドが欠損", async () => {
      const { restoreBackup } = require("../src/services/backupService");
      const { version: _v, ...withoutVersion } = validBackupData;
      mockZipFile.mockImplementation((name: string) => {
        if (name === "backup.json") return makeTextFile(withoutVersion);
        return null;
      });

      await expect(restoreBackup("file:///cache/backup.zip")).rejects.toThrow(
        "バックアップファイルの形式が正しくありません"
      );
    });

    test("バリデーション: profiles フィールドが欠損", async () => {
      const { restoreBackup } = require("../src/services/backupService");
      const { profiles: _p, ...withoutProfiles } = validBackupData;
      mockZipFile.mockImplementation((name: string) => {
        if (name === "backup.json") return makeTextFile(withoutProfiles);
        return null;
      });

      await expect(restoreBackup("file:///cache/backup.zip")).rejects.toThrow(
        "バックアップファイルの形式が正しくありません"
      );
    });

    test("バリデーション: achievements フィールドが欠損", async () => {
      const { restoreBackup } = require("../src/services/backupService");
      const { achievements: _a, ...withoutAchievements } = validBackupData;
      mockZipFile.mockImplementation((name: string) => {
        if (name === "backup.json") return makeTextFile(withoutAchievements);
        return null;
      });

      await expect(restoreBackup("file:///cache/backup.zip")).rejects.toThrow(
        "バックアップファイルの形式が正しくありません"
      );
    });

    test("バリデーション: profiles が空配列", async () => {
      const { restoreBackup } = require("../src/services/backupService");
      mockZipFile.mockImplementation((name: string) => {
        if (name === "backup.json")
          return makeTextFile({ ...validBackupData, profiles: [] });
        return null;
      });

      await expect(restoreBackup("file:///cache/backup.zip")).rejects.toThrow(
        "バックアップファイルの形式が正しくありません"
      );
    });

    test("バリデーション: version が 1 以外", async () => {
      const { restoreBackup } = require("../src/services/backupService");
      mockZipFile.mockImplementation((name: string) => {
        if (name === "backup.json")
          return makeTextFile({ ...validBackupData, version: 2 });
        return null;
      });

      await expect(restoreBackup("file:///cache/backup.zip")).rejects.toThrow(
        "未対応のバックアップ形式です"
      );
    });
  });
});
