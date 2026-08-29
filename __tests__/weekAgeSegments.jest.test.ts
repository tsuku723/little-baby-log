import { buildWeekAgeSegments } from "../src/utils/weekAgeSegments";
import { calculateAgeInfo } from "../src/utils/dateUtils";
import { CalendarDay } from "../src/models/dataModels";

const settings = {
  showCorrectedUntilMonths: null,
  ageFormat: "ymd" as const,
};

const makeDay = (
  iso: string,
  birthDate: string,
  isCurrentMonth = true
): CalendarDay => ({
  date: iso,
  isCurrentMonth,
  isToday: false,
  ageInfo: calculateAgeInfo({
    targetDate: iso,
    birthDate,
    dueDate: null,
    showCorrectedUntilMonths: settings.showCorrectedUntilMonths,
    ageFormat: settings.ageFormat,
  }),
  calendarAgeLabel: null,
  achievementCount: 0,
  hasAchievements: false,
});

describe("buildWeekAgeSegments", () => {
  test("週内で月齢が変わらない週は単一セグメントになる", () => {
    const birthDate = "2026-01-01";
    const row = [
      "2026-09-06",
      "2026-09-07",
      "2026-09-08",
      "2026-09-09",
      "2026-09-10",
      "2026-09-11",
      "2026-09-12",
    ].map((d) => makeDay(d, birthDate));

    const segments = buildWeekAgeSegments(row, "ymd", birthDate);

    expect(segments).not.toBeNull();
    expect(segments).toHaveLength(1);
    expect(segments![0].dayCount).toBe(7);
    expect(segments![0].label).not.toBeNull();
  });

  test("週内で月齢が変わる週は日数比率で分割され、最大区間にのみラベルが付く", () => {
    // 生後8ヶ月ちょうどを週の2日目に迎えるように誕生日を設定する
    const birthDate = "2026-01-13"; // 9/13で満8ヶ月
    const row = [
      "2026-09-06",
      "2026-09-07",
      "2026-09-08",
      "2026-09-09",
      "2026-09-10",
      "2026-09-11",
      "2026-09-12",
    ].map((d) => makeDay(d, birthDate));

    const segments = buildWeekAgeSegments(row, "ymd", birthDate);

    expect(segments).not.toBeNull();
    expect(segments!.reduce((sum, s) => sum + s.dayCount, 0)).toBe(7);
    const withLabel = segments!.filter((s) => s.label != null);
    expect(withLabel).toHaveLength(1);
    // 最大日数の区間にのみラベルが付く
    const maxDayCount = Math.max(...segments!.map((s) => s.dayCount));
    expect(withLabel[0].dayCount).toBe(maxDayCount);
  });

  test("誕生日より前の日は空白セグメントになる", () => {
    const birthDate = "2026-09-10";
    const row = [
      "2026-09-06",
      "2026-09-07",
      "2026-09-08",
      "2026-09-09",
      "2026-09-10",
      "2026-09-11",
      "2026-09-12",
    ].map((d) => makeDay(d, birthDate));

    const segments = buildWeekAgeSegments(row, "ymd", birthDate);

    expect(segments).not.toBeNull();
    const blank = segments!.find((s) => s.totalMonths == null);
    expect(blank).toBeDefined();
    expect(blank!.dayCount).toBe(4); // 9/6-9/9
  });

  test("全日が誕生日より前の週はnullを返す（帯自体を表示しない）", () => {
    const birthDate = "2026-10-01";
    const row = [
      "2026-09-06",
      "2026-09-07",
      "2026-09-08",
      "2026-09-09",
      "2026-09-10",
      "2026-09-11",
      "2026-09-12",
    ].map((d) => makeDay(d, birthDate));

    const segments = buildWeekAgeSegments(row, "ymd", birthDate);

    expect(segments).toBeNull();
  });

  test("3歳（36ヶ月）を超えても週帯は表示される（上限なし）", () => {
    const birthDate = "2023-08-01"; // 2026-08-10時点で満3歳
    const row = [
      "2026-08-08",
      "2026-08-09",
      "2026-08-10",
      "2026-08-11",
      "2026-08-12",
      "2026-08-13",
      "2026-08-14",
    ].map((d) => makeDay(d, birthDate));

    const segments = buildWeekAgeSegments(row, "ymd", birthDate);

    expect(segments).not.toBeNull();
    expect(segments!.some((s) => s.label != null)).toBe(true);
  });

  test("前月/翌月のパディング日（isCurrentMonth: false）は週帯の計算対象から除外される", () => {
    // 8月画面の最初の週：7/26〜7/31は前月のパディング日、8/1のみ当月。
    // 誕生日を7/15にして、パディング日も当月日も同じ月齢になるようにする。
    const birthDate = "2026-07-15";
    const paddingDays = [
      "2026-07-26",
      "2026-07-27",
      "2026-07-28",
      "2026-07-29",
      "2026-07-30",
      "2026-07-31",
    ].map((d) => makeDay(d, birthDate, false));
    const currentMonthDay = makeDay("2026-08-01", birthDate, true);
    const row = [...paddingDays, currentMonthDay];

    const segments = buildWeekAgeSegments(row, "ymd", birthDate);

    expect(segments).not.toBeNull();
    // パディング日6日分は空白セグメントにまとめられ、当月の1日だけが有効なセグメントになる
    const blank = segments!.find((s) => s.totalMonths == null);
    expect(blank).toBeDefined();
    expect(blank!.dayCount).toBe(6);
    const withLabel = segments!.filter((s) => s.label != null);
    expect(withLabel).toHaveLength(1);
    expect(withLabel[0].dayCount).toBe(1);
  });

  test("全日が誕生日以降ならnullにならない", () => {
    const birthDate = "2026-01-01";
    const row = [
      "2026-08-30",
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
    ].map((d) => makeDay(d, birthDate));

    const segments = buildWeekAgeSegments(row, "ymd", birthDate);

    expect(segments).not.toBeNull();
  });
});
