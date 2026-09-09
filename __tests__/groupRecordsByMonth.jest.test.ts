import { groupRecordsByMonth } from "../src/utils/groupRecordsByMonth";
import { Achievement } from "../src/models/dataModels";

const makeRecord = (
  id: string,
  date: string,
  photoPath?: string
): Achievement => ({
  id,
  date,
  title: `title-${id}`,
  createdAt: `${date}T00:00:00.000Z`,
  updatedAt: `${date}T00:00:00.000Z`,
  ...(photoPath ? { photoPath } : {}),
});

describe("groupRecordsByMonth", () => {
  test("空配列は空配列を返す", () => {
    expect(groupRecordsByMonth([])).toEqual([]);
  });

  test("写真なし1件 — featuredId は null", () => {
    const records = [makeRecord("a", "2025-11-26")];
    const sections = groupRecordsByMonth(records);
    expect(sections).toHaveLength(1);
    expect(sections[0].monthKey).toBe("2025-11");
    expect(sections[0].monthLabel).toBe("2025年11月");
    expect(sections[0].featuredId).toBeNull();
    expect(sections[0].records).toHaveLength(1);
  });

  test("写真あり1件 — featuredId はその record の id", () => {
    const records = [makeRecord("a", "2025-11-26", "/photos/a.jpg")];
    const sections = groupRecordsByMonth(records);
    expect(sections[0].featuredId).toBe("a");
  });

  test("同月に写真なし複数 — featuredId は null", () => {
    const records = [
      makeRecord("a", "2025-11-26"),
      makeRecord("b", "2025-11-20"),
    ];
    const sections = groupRecordsByMonth(records);
    expect(sections).toHaveLength(1);
    expect(sections[0].featuredId).toBeNull();
    expect(sections[0].records).toHaveLength(2);
  });

  test("同月に写真あり1件・なし1件 — featuredId は写真ありの id", () => {
    const records = [
      makeRecord("a", "2025-11-26"),
      makeRecord("b", "2025-11-20", "/photos/b.jpg"),
    ];
    const sections = groupRecordsByMonth(records);
    expect(sections[0].featuredId).toBe("b");
  });

  test("同月に写真あり複数 — featuredId は入力の先頭（最新）の id", () => {
    // 入力は date desc でソート済みを前提とする
    const records = [
      makeRecord("newer", "2025-11-26", "/photos/newer.jpg"),
      makeRecord("older", "2025-11-20", "/photos/older.jpg"),
    ];
    const sections = groupRecordsByMonth(records);
    expect(sections[0].featuredId).toBe("newer");
  });

  test("複数月にまたがる記録 — 月ごとにセクションが作られる", () => {
    const records = [
      makeRecord("nov", "2025-11-10"),
      makeRecord("oct", "2025-10-05", "/photos/oct.jpg"),
    ];
    const sections = groupRecordsByMonth(records);
    expect(sections).toHaveLength(2);
    expect(sections[0].monthKey).toBe("2025-11");
    expect(sections[1].monthKey).toBe("2025-10");
  });

  test("セクションは入力の出現順（date desc）で並ぶ", () => {
    const records = [
      makeRecord("dec", "2025-12-01"),
      makeRecord("nov", "2025-11-01"),
      makeRecord("oct", "2025-10-01"),
    ];
    const sections = groupRecordsByMonth(records);
    expect(sections.map((s) => s.monthKey)).toEqual([
      "2025-12",
      "2025-11",
      "2025-10",
    ]);
  });

  test("monthLabel は「YYYY年M月」形式（月は先頭ゼロなし）", () => {
    const records = [makeRecord("a", "2025-01-15")];
    const sections = groupRecordsByMonth(records);
    expect(sections[0].monthLabel).toBe("2025年1月");
  });

  test("年をまたぐ同月 — monthLabel で年を判別できる", () => {
    const records = [
      makeRecord("a", "2026-05-10"),
      makeRecord("b", "2025-05-10"),
    ];
    const sections = groupRecordsByMonth(records);
    expect(sections.map((s) => s.monthLabel)).toEqual([
      "2026年5月",
      "2025年5月",
    ]);
  });
});
