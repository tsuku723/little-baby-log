/**
 * テスト用バックアップZIPフィクスチャを生成するスクリプト
 * 出力先: __tests__/fixtures/backup/
 *
 * 実行: node scripts/generate-backup-fixtures.mjs
 */

import JSZip from "jszip";
import { writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../__tests__/fixtures/backup");

mkdirSync(OUT_DIR, { recursive: true });

// --- ベースデータ ---

const profileNormal = {
  id: "u1",
  name: "さくらちゃん",
  birthDate: "2024-01-15",
  dueDate: null,
  settings: {
    showCorrectedUntilMonths: null,
    ageFormat: "ymd",
    showDaysSinceBirth: true,
    lastViewedMonth: null,
  },
  createdAt: "2024-01-15T00:00:00.000Z",
};

const profilePremature = {
  id: "u2",
  name: "はるくん",
  birthDate: "2023-10-01",
  dueDate: "2023-12-15", // 10週早産
  settings: {
    showCorrectedUntilMonths: 24,
    ageFormat: "ymd",
    showDaysSinceBirth: true,
    lastViewedMonth: null,
  },
  createdAt: "2023-10-01T00:00:00.000Z",
};

const profileSecond = {
  id: "u3",
  name: "ゆきちゃん",
  birthDate: "2022-05-10",
  dueDate: null,
  settings: {
    showCorrectedUntilMonths: null,
    ageFormat: "ymd",
    showDaysSinceBirth: false,
    lastViewedMonth: null,
  },
  createdAt: "2022-05-10T00:00:00.000Z",
};

const achievement1 = {
  id: "a1",
  date: "2024-02-01",
  title: "はじめての笑顔",
  createdAt: "2024-02-01T00:00:00.000Z",
  updatedAt: "2024-02-01T00:00:00.000Z",
};

const achievement2 = {
  id: "a2",
  date: "2024-03-15",
  title: "首がすわった",
  createdAt: "2024-03-15T00:00:00.000Z",
  updatedAt: "2024-03-15T00:00:00.000Z",
};

const achievement3 = {
  id: "a3",
  date: "2024-05-01",
  title: "寝返り成功！",
  createdAt: "2024-05-01T00:00:00.000Z",
  updatedAt: "2024-05-01T00:00:00.000Z",
};

// 1x1ピクセルのダミーJPEG（base64）
const DUMMY_PHOTO_BASE64 =
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAAR" +
  "CAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAA" +
  "AAAA/9oADAMBAAIRAxEAPwCwAB//2Q==";

// --- ヘルパー ---

function makeBackupData(overrides = {}) {
  return {
    version: 1,
    appVersion: "1.0.0",
    exportedAt: "2024-06-01T00:00:00.000Z",
    profiles: [profileNormal],
    achievements: {},
    ...overrides,
  };
}

async function makeZipBuffer(backupData, photos = {}) {
  const zip = new JSZip();
  zip.file("backup.json", JSON.stringify(backupData, null, 2));
  for (const [zipPath, base64] of Object.entries(photos)) {
    zip.file(zipPath, Buffer.from(base64, "base64"), { base64: true });
  }
  return zip.generateAsync({ type: "nodebuffer" });
}

function save(filename, buffer) {
  writeFileSync(join(OUT_DIR, filename), buffer);
  console.log(`  ✓ ${filename}`);
}

// --- 生成 ---

async function generate() {
  console.log("バックアップフィクスチャを生成中...\n[正常系]");

  // 01: 最小構成（子ども1人・記録なし）
  save(
    "valid_single_child_no_records.zip",
    await makeZipBuffer(makeBackupData())
  );

  // 02: 子ども1人・記録複数・写真なし
  save(
    "valid_single_child_with_records.zip",
    await makeZipBuffer(
      makeBackupData({
        achievements: { u1: [achievement1, achievement2, achievement3] },
      })
    )
  );

  // 03: 子ども1人・記録あり・写真1枚
  save(
    "valid_single_child_with_photo.zip",
    await makeZipBuffer(
      makeBackupData({
        achievements: {
          u1: [{ ...achievement1, photoPath: "photos/photo_a1.jpg" }],
        },
      }),
      { "photos/photo_a1.jpg": DUMMY_PHOTO_BASE64 }
    )
  );

  // 04: 早産（dueDate あり）・修正月齢設定あり
  save(
    "valid_premature_with_due_date.zip",
    await makeZipBuffer(
      makeBackupData({
        profiles: [profilePremature],
        achievements: { u2: [achievement1] },
      })
    )
  );

  // 05: 子ども2人・それぞれ記録あり
  save(
    "valid_two_children.zip",
    await makeZipBuffer(
      makeBackupData({
        profiles: [profileNormal, profileSecond],
        achievements: {
          u1: [achievement1],
          u3: [
            {
              id: "b1",
              date: "2022-08-01",
              title: "ひとり立ち",
              createdAt: "2022-08-01T00:00:00.000Z",
              updatedAt: "2022-08-01T00:00:00.000Z",
            },
          ],
        },
      })
    )
  );

  // 06: 子ども2人・1人は早産
  save(
    "valid_two_children_one_premature.zip",
    await makeZipBuffer(
      makeBackupData({
        profiles: [profileNormal, profilePremature],
        achievements: {
          u1: [achievement1],
          u2: [
            {
              id: "c1",
              date: "2023-11-01",
              title: "修正月齢1ヶ月",
              createdAt: "2023-11-01T00:00:00.000Z",
              updatedAt: "2023-11-01T00:00:00.000Z",
            },
          ],
        },
      })
    )
  );

  // 07: メモあり
  save(
    "valid_record_with_memo.zip",
    await makeZipBuffer(
      makeBackupData({
        achievements: {
          u1: [
            {
              ...achievement1,
              memo: "パパの前でニコッと笑ってくれた。本当に可愛かった！",
            },
          ],
        },
      })
    )
  );

  // 09: 大量記録（100件）
  const manyRecords = Array.from({ length: 100 }, (_, i) => ({
    id: `a${i + 1}`,
    date: `2024-0${Math.floor(i / 30) + 1}-${String((i % 28) + 1).padStart(2, "0")}`,
    title: `記録 ${i + 1}`,
    createdAt: "2024-01-15T00:00:00.000Z",
    updatedAt: "2024-01-15T00:00:00.000Z",
  }));
  save(
    "valid_many_records.zip",
    await makeZipBuffer(makeBackupData({ achievements: { u1: manyRecords } }))
  );

  // 10: 複数記録が同一写真を参照
  save(
    "valid_shared_photo.zip",
    await makeZipBuffer(
      makeBackupData({
        achievements: {
          u1: [
            { ...achievement1, id: "a1", photoPath: "photos/shared.jpg" },
            { ...achievement2, id: "a2", photoPath: "photos/shared.jpg" },
          ],
        },
      }),
      { "photos/shared.jpg": DUMMY_PHOTO_BASE64 }
    )
  );

  // 10b: photoPath あり記録だがZIP内に写真なし
  save(
    "valid_photo_path_missing_in_zip.zip",
    await makeZipBuffer(
      makeBackupData({
        achievements: {
          u1: [{ ...achievement1, photoPath: "photos/missing.jpg" }],
        },
      })
      // photos/missing.jpg をZIPに含めない
    )
  );

  console.log("\n[異常系]");

  // 11: ZIPでない
  save("invalid_not_a_zip.zip", Buffer.from("これはZIPファイルではありません"));

  // 12: ZIPだがbackup.jsonなし
  {
    const zip = new JSZip();
    zip.file("readme.txt", "backup.json is missing intentionally");
    save(
      "invalid_no_backup_json.zip",
      await zip.generateAsync({ type: "nodebuffer" })
    );
  }

  // 13: backup.jsonが不正なJSON
  {
    const zip = new JSZip();
    zip.file("backup.json", "{ this is not valid json ,,, }");
    save(
      "invalid_broken_json.zip",
      await zip.generateAsync({ type: "nodebuffer" })
    );
  }

  // 14: version フィールドなし
  {
    const { version: _, ...rest } = makeBackupData();
    save("invalid_missing_version.zip", await makeZipBuffer(rest));
  }

  // 15: profiles フィールドなし
  {
    const { profiles: _, ...rest } = makeBackupData();
    save("invalid_missing_profiles.zip", await makeZipBuffer(rest));
  }

  // 16: achievements フィールドなし
  {
    const { achievements: _, ...rest } = makeBackupData();
    save("invalid_missing_achievements.zip", await makeZipBuffer(rest));
  }

  // 17: profiles が空配列
  save(
    "invalid_empty_profiles.zip",
    await makeZipBuffer(makeBackupData({ profiles: [] }))
  );

  // 18: version: 3（未対応バージョン）
  save(
    "invalid_version_3.zip",
    await makeZipBuffer(makeBackupData({ version: 3 }))
  );

  // 19: version: 2（growthRecords あり）
  save(
    "valid_v2_with_growth_records.zip",
    await makeZipBuffer(
      makeBackupData({
        version: 2,
        growthRecords: {
          u1: [
            {
              id: "g1",
              date: "2024-03-01",
              weightKg: 4.12,
              heightCm: 55.3,
              createdAt: "2024-03-01T00:00:00.000Z",
            },
          ],
        },
      })
    )
  );

  console.log(`\n完了！ → ${OUT_DIR}`);
}

generate().catch((e) => {
  console.error(e);
  process.exit(1);
});
