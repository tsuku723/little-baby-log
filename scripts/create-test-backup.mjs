/**
 * テスト用バックアップzipを生成するスクリプト
 * 使い方: node scripts/create-test-backup.mjs
 * 出力: scripts/test-backup.zip
 */

import JSZip from "jszip";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const backupData = {
  version: 1,
  appVersion: "1.0.0",
  exportedAt: new Date().toISOString(),
  profiles: [
    {
      id: "test-user-1",
      name: "テストちゃん",
      birthDate: "2024-03-15",
      dueDate: null,
      settings: {
        showCorrectedUntilMonths: null,
        ageFormat: "ymd",
        showDaysSinceBirth: true,
        lastViewedMonth: null,
      },
      createdAt: "2024-03-15T00:00:00.000Z",
    },
  ],
  achievements: {
    "test-user-1": [
      {
        id: "ach-1",
        date: "2024-04-01",
        title: "はじめての笑顔",
        memo: "朝ごはんの後に笑ってくれた！",
        createdAt: "2024-04-01T09:00:00.000Z",
      },
      {
        id: "ach-2",
        date: "2024-05-10",
        title: "首が据わった",
        createdAt: "2024-05-10T14:00:00.000Z",
      },
      {
        id: "ach-3",
        date: "2024-07-20",
        title: "寝返りができた",
        memo: "突然ゴロンと！",
        createdAt: "2024-07-20T16:30:00.000Z",
      },
    ],
  },
};

const zip = new JSZip();
zip.file("backup.json", JSON.stringify(backupData, null, 2));

const base64 = await zip.generateAsync({ type: "nodebuffer" });
const outputPath = join(__dirname, "test-backup.zip");
writeFileSync(outputPath, base64);

console.log(`生成完了: ${outputPath}`);
console.log(`プロフィール: ${backupData.profiles.length}件`);
console.log(`記録: ${backupData.achievements["test-user-1"].length}件`);
