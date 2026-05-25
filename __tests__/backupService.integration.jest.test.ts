/**
 * backupService の統合テスト
 * __tests__/fixtures/backup/ の実ZIPファイルを使って validateBackup / restoreBackup を検証する。
 * jszip はモックせず実際のZIPを解析させる。
 */

import * as FileSystem from "expo-file-system/legacy";
import { readFileSync } from "fs";
import { join } from "path";
import {
  INVALID_FORMAT_ERROR,
  restoreBackup,
  validateBackup,
} from "../src/services/backupService";

jest.mock("expo-file-system/legacy", () => ({
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  cacheDirectory: "file:///cache/",
  documentDirectory: "file:///documents/",
  EncodingType: { Base64: "base64" },
}));

const mockGetInfoAsync = FileSystem.getInfoAsync as jest.Mock;
const mockReadAsStringAsync = FileSystem.readAsStringAsync as jest.Mock;
const mockWriteAsStringAsync = FileSystem.writeAsStringAsync as jest.Mock;
const mockMakeDirectoryAsync = FileSystem.makeDirectoryAsync as jest.Mock;

const FIXTURES_DIR = join(__dirname, "fixtures/backup");

function loadFixture(filename: string): string {
  return readFileSync(join(FIXTURES_DIR, filename)).toString("base64");
}

function setupFile(filename: string) {
  const base64 = loadFixture(filename);
  mockGetInfoAsync.mockResolvedValue({ exists: true, size: base64.length });
  mockReadAsStringAsync.mockResolvedValue(base64);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockWriteAsStringAsync.mockResolvedValue(undefined);
  mockMakeDirectoryAsync.mockResolvedValue(undefined);
});

describe("restoreBackup（実ZIPフィクスチャ）", () => {
  describe("正常系", () => {
    test("01: 最小構成 — 子ども1人・記録なし", async () => {
      setupFile("valid_single_child_no_records.zip");

      const result = await restoreBackup("file:///any.zip");

      expect(result.profiles).toHaveLength(1);
      expect(result.profiles[0].name).toBe("さくらちゃん");
      expect(result.achievements).toEqual({});
    });

    test("02: 子ども1人・記録3件・写真なし", async () => {
      setupFile("valid_single_child_with_records.zip");

      const result = await restoreBackup("file:///any.zip");

      expect(result.achievements.u1).toHaveLength(3);
      expect(result.achievements.u1[0].title).toBe("はじめての笑顔");
      expect(result.achievements.u1[1].title).toBe("首がすわった");
      expect(result.achievements.u1[2].title).toBe("寝返り成功！");
    });

    test("03: 写真あり — documentDirectory/achievement-photos/ に保存しローカルパスに変換", async () => {
      setupFile("valid_single_child_with_photo.zip");

      const result = await restoreBackup("file:///any.zip");

      expect(mockWriteAsStringAsync).toHaveBeenCalledWith(
        "file:///documents/achievement-photos/photo_a1.jpg",
        expect.any(String),
        { encoding: "base64" }
      );
      expect(result.achievements.u1[0].photoPath).toBe(
        "file:///documents/achievement-photos/photo_a1.jpg"
      );
    });

    test("04: 早産 — dueDate と showCorrectedUntilMonths が保持される", async () => {
      setupFile("valid_premature_with_due_date.zip");

      const result = await restoreBackup("file:///any.zip");

      const profile = result.profiles[0];
      expect(profile.dueDate).toBe("2023-12-15");
      expect(profile.settings.showCorrectedUntilMonths).toBe(24);
    });

    test("05: 子ども2人 — 両方の profiles と achievements が復元される", async () => {
      setupFile("valid_two_children.zip");

      const result = await restoreBackup("file:///any.zip");

      expect(result.profiles).toHaveLength(2);
      expect(result.achievements.u1).toHaveLength(1);
      expect(result.achievements.u3).toHaveLength(1);
      expect(result.achievements.u3[0].title).toBe("ひとり立ち");
    });

    test("06: 子ども2人・1人は早産 — 早産プロフィールの dueDate が保持される", async () => {
      setupFile("valid_two_children_one_premature.zip");

      const result = await restoreBackup("file:///any.zip");

      const premature = result.profiles.find(
        (p: { id: string }) => p.id === "u2"
      );
      expect(premature).toBeDefined();
      expect(premature.dueDate).toBe("2023-12-15");
    });

    test("07: memo フィールドが保持される", async () => {
      setupFile("valid_record_with_memo.zip");

      const result = await restoreBackup("file:///any.zip");

      expect(result.achievements.u1[0].memo).toBe(
        "パパの前でニコッと笑ってくれた。本当に可愛かった！"
      );
    });

    test("09: 大量記録（100件）— 全件復元される", async () => {
      setupFile("valid_many_records.zip");

      const result = await restoreBackup("file:///any.zip");

      expect(result.achievements.u1).toHaveLength(100);
    });

    test("10: 同一写真を参照する2件の記録 — 両方のローカルパスが設定される", async () => {
      setupFile("valid_shared_photo.zip");

      const result = await restoreBackup("file:///any.zip");

      expect(result.achievements.u1[0].photoPath).toBe(
        "file:///documents/achievement-photos/shared.jpg"
      );
      expect(result.achievements.u1[1].photoPath).toBe(
        "file:///documents/achievement-photos/shared.jpg"
      );
    });

    test("10b: photoPath あり記録だがZIP内に写真なし — photoPath が undefined になる", async () => {
      setupFile("valid_photo_path_missing_in_zip.zip");

      const result = await restoreBackup("file:///any.zip");

      expect(result.achievements.u1[0].photoPath).toBeUndefined();
      expect(mockWriteAsStringAsync).not.toHaveBeenCalled();
    });
  });

  describe("異常系", () => {
    test("11: ZIPでないファイル — INVALID_FORMAT_ERROR", async () => {
      setupFile("invalid_not_a_zip.zip");

      await expect(restoreBackup("file:///any.zip")).rejects.toThrow(
        INVALID_FORMAT_ERROR
      );
    });

    test("12: backup.json が存在しない — INVALID_FORMAT_ERROR", async () => {
      setupFile("invalid_no_backup_json.zip");

      await expect(restoreBackup("file:///any.zip")).rejects.toThrow(
        INVALID_FORMAT_ERROR
      );
    });

    test("13: backup.json が不正なJSON — INVALID_FORMAT_ERROR", async () => {
      setupFile("invalid_broken_json.zip");

      await expect(restoreBackup("file:///any.zip")).rejects.toThrow(
        INVALID_FORMAT_ERROR
      );
    });

    test("14: version フィールドなし — INVALID_FORMAT_ERROR", async () => {
      setupFile("invalid_missing_version.zip");

      await expect(restoreBackup("file:///any.zip")).rejects.toThrow(
        INVALID_FORMAT_ERROR
      );
    });

    test("15: profiles フィールドなし — INVALID_FORMAT_ERROR", async () => {
      setupFile("invalid_missing_profiles.zip");

      await expect(restoreBackup("file:///any.zip")).rejects.toThrow(
        INVALID_FORMAT_ERROR
      );
    });

    test("16: achievements フィールドなし — INVALID_FORMAT_ERROR", async () => {
      setupFile("invalid_missing_achievements.zip");

      await expect(restoreBackup("file:///any.zip")).rejects.toThrow(
        INVALID_FORMAT_ERROR
      );
    });

    test("17: profiles が空配列 — INVALID_FORMAT_ERROR", async () => {
      setupFile("invalid_empty_profiles.zip");

      await expect(restoreBackup("file:///any.zip")).rejects.toThrow(
        INVALID_FORMAT_ERROR
      );
    });

    test("18: version: 2（未対応）— 専用エラーメッセージ", async () => {
      setupFile("invalid_version_2.zip");

      await expect(restoreBackup("file:///any.zip")).rejects.toThrow(
        "未対応のバックアップ形式です"
      );
    });
  });
});

describe("validateBackup（実ZIPフィクスチャ）", () => {
  test("正常系ZIPでエラーなし", async () => {
    setupFile("valid_single_child_with_records.zip");

    await expect(validateBackup("file:///any.zip")).resolves.toBeUndefined();
  });

  test("invalid_version_2.zip — 未対応エラー", async () => {
    setupFile("invalid_version_2.zip");

    await expect(validateBackup("file:///any.zip")).rejects.toThrow(
      "未対応のバックアップ形式です"
    );
  });

  test("invalid_not_a_zip.zip — INVALID_FORMAT_ERROR", async () => {
    setupFile("invalid_not_a_zip.zip");

    await expect(validateBackup("file:///any.zip")).rejects.toThrow(
      INVALID_FORMAT_ERROR
    );
  });
});
