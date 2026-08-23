import {
  buildCalendarMonthView,
  calculateAgeInfo,
  daysBetweenUtc,
  formatCalendarAgeLabel,
  isIsoDateString,
  monthKey,
  normalizeToUtcDate,
  safeParseIsoLocal,
  toIsoDateString,
  toUtcDateOnly,
  todayIsoDate,
} from "../src/utils/dateUtils";

const settings = {
  ageFormat: "ymd" as const,
  showCorrectedUntilMonths: 24,
  showDaysSinceBirth: true,
  lastViewedMonth: null,
};

describe("dateUtils exported functions", () => {
  test("isIsoDateString validates strict yyyy-mm-dd", () => {
    expect(isIsoDateString("2024-02-29")).toBe(true);
    expect(isIsoDateString("2024-2-29")).toBe(false);
    expect(isIsoDateString("abc")).toBe(false);
  });

  test("normalizeToUtcDate returns Invalid Date for invalid input", () => {
    expect(Number.isNaN(normalizeToUtcDate("2024-02-30").getTime())).toBe(true);
    expect(Number.isNaN(normalizeToUtcDate(undefined).getTime())).toBe(true);
  });

  test("safeParseIsoLocal falls back when input is invalid", () => {
    const fallback = new Date(2026, 0, 31, 12, 0, 0);
    expect(toIsoDateString(safeParseIsoLocal("2026-01-30", fallback))).toBe(
      "2026-01-30"
    );
    expect(toIsoDateString(safeParseIsoLocal("invalid", fallback))).toBe(
      "2026-01-31"
    );
  });

  test("toUtcDateOnly and toIsoDateString normalize date component only", () => {
    const date = new Date("2026-07-20T15:45:59.999Z");
    const normalized = toUtcDateOnly(date);
    expect(normalized.getHours()).toBe(0);
    expect(toIsoDateString(normalized)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(() => toIsoDateString(new Date(NaN))).toThrow(
      "toIsoDateString: Invalid Date provided"
    );
  });

  test("todayIsoDate returns ISO date string", () => {
    expect(todayIsoDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("formatCalendarAgeLabel formats md and ymd with prefixes", () => {
    expect(formatCalendarAgeLabel({ years: 1, months: 2 }, "md", false)).toBe(
      "暦 14ヶ月"
    );
    expect(formatCalendarAgeLabel({ years: 1, months: 2 }, "ymd", true)).toBe(
      "修正 1才2ヶ月"
    );
  });

  test("daysBetweenUtc handles leap-day and negative range boundary", () => {
    const feb28 = new Date(2024, 1, 28);
    const feb29 = new Date(2024, 1, 29);
    const mar1 = new Date(2024, 2, 1);
    expect(daysBetweenUtc(feb28, feb29)).toBe(1);
    expect(daysBetweenUtc(feb29, mar1)).toBe(1);
    expect(daysBetweenUtc(mar1, feb28)).toBe(0);
  });

  test("monthKey is zero-padded", () => {
    expect(monthKey(new Date(2026, 0, 1))).toBe("2026-01");
  });

  test("calculateAgeInfo throws for invalid input and handles corrected limit", () => {
    expect(() =>
      calculateAgeInfo({
        targetDate: "bad",
        birthDate: "2025-01-01",
        dueDate: null,
        showCorrectedUntilMonths: null,
        ageFormat: "md",
      })
    ).toThrow("calculateAgeInfo: Invalid date input");

    const visibleAtLimit = calculateAgeInfo({
      targetDate: "2025-05-15",
      birthDate: "2025-01-01",
      dueDate: "2025-02-15",
      showCorrectedUntilMonths: 3,
      ageFormat: "md",
    });
    expect(visibleAtLimit.corrected.visible).toBe(true);

    const hiddenAfterLimit = calculateAgeInfo({
      targetDate: "2025-05-16",
      birthDate: "2025-01-01",
      dueDate: "2025-02-15",
      showCorrectedUntilMonths: 3,
      ageFormat: "md",
    });
    expect(hiddenAfterLimit.corrected.visible).toBe(false);
  });

  test("buildCalendarMonthView sets milestoneBadge on 100th day and null otherwise", () => {
    const view = buildCalendarMonthView({
      anchorDate: new Date(2024, 3, 1), // 2024-04: 出生日2024-01-01の100日目(2024-04-10)を含む
      settings,
      birthDate: "2024-01-01",
      dueDate: null,
    });

    expect(view.days.find((d) => d.date === "2024-04-10")?.milestoneBadge).toBe(
      "100日"
    );
    expect(
      view.days.find((d) => d.date === "2024-04-09")?.milestoneBadge
    ).toBeNull();
  });

  test("buildCalendarMonthView sets milestoneBadge to 誕生日 on every birthday anniversary", () => {
    const firstBirthdayView = buildCalendarMonthView({
      anchorDate: new Date(2025, 0, 1),
      settings,
      birthDate: "2024-01-01",
      dueDate: null,
    });
    expect(
      firstBirthdayView.days.find((d) => d.date === "2025-01-01")
        ?.milestoneBadge
    ).toBe("誕生日");

    const secondBirthdayView = buildCalendarMonthView({
      anchorDate: new Date(2026, 0, 1),
      settings,
      birthDate: "2024-01-01",
      dueDate: null,
    });
    expect(
      secondBirthdayView.days.find((d) => d.date === "2026-01-01")
        ?.milestoneBadge
    ).toBe("誕生日");
  });

  test("buildCalendarMonthView keeps corrected label on due-day fallback at month end", () => {
    const view = buildCalendarMonthView({
      anchorDate: new Date(2025, 1, 1),
      settings,
      birthDate: "2024-11-30",
      dueDate: "2025-01-31",
    });

    expect(view.days).toHaveLength(35);
    expect(
      view.days.find((d) => d.date === "2025-02-28")?.calendarAgeLabel
        ?.corrected
    ).toBe("修正 0才1ヶ月");
    expect(
      view.days.find((d) => d.date === "2025-02-27")?.calendarAgeLabel
        ?.corrected
    ).toBeUndefined();
  });

  test("buildCalendarMonthView omits ageInfo for invalid birthDate and keeps non-current month labels null", () => {
    const view = buildCalendarMonthView({
      anchorDate: new Date(2026, 0, 1),
      settings,
      birthDate: "invalid",
      dueDate: "2026-01-10",
      achievementCountsByDay: { "2025-12-30": 2, "2026-01-05": 1 },
    });

    const outsideMonth = view.days.find((d) => d.date === "2025-12-30");
    const inMonth = view.days.find((d) => d.date === "2026-01-05");

    expect(outsideMonth?.isCurrentMonth).toBe(false);
    expect(outsideMonth?.calendarAgeLabel).toBeNull();
    expect(outsideMonth?.ageInfo).toBeNull();
    expect(outsideMonth?.achievementCount).toBe(2);
    expect(inMonth?.hasAchievements).toBe(true);
  });

  test("buildCalendarMonthView injects fallback chronological label after birth date", () => {
    const view = buildCalendarMonthView({
      anchorDate: new Date(2025, 0, 1),
      settings,
      birthDate: "2025-01-30",
      dueDate: null,
    });

    const jan30 = view.days.find((d) => d.date === "2025-01-30");
    const jan29 = view.days.find((d) => d.date === "2025-01-29");
    expect(jan30?.calendarAgeLabel?.chronological).toBe("誕生日");
    expect(jan29?.calendarAgeLabel?.chronological).toBeUndefined();
  });

  test("toUtcDateOnly returns Invalid Date when input is Invalid Date", () => {
    const invalid = toUtcDateOnly(new Date(NaN));
    expect(Number.isNaN(invalid.getTime())).toBe(true);
  });

  test("daysBetweenUtc returns 0 when either start or end is Invalid Date", () => {
    expect(daysBetweenUtc(new Date(NaN), new Date(2025, 0, 1))).toBe(0);
    expect(daysBetweenUtc(new Date(2025, 0, 1), new Date(NaN))).toBe(0);
  });

  test("buildCalendarMonthView shows no gestational label on cells before birth date", () => {
    // 出生日: 2026-03-18, 予定日: 2026-05-18 → 出生前の2月はラベルなし（#89）
    const view = buildCalendarMonthView({
      anchorDate: new Date(2026, 1, 1), // 2月
      settings,
      birthDate: "2026-03-18",
      dueDate: "2026-05-18",
    });

    const allCurrentMonth = view.days.filter((d) => d.isCurrentMonth);
    const gestationalLabels = allCurrentMonth.filter(
      (d) => d.calendarAgeLabel?.gestational != null
    );
    expect(gestationalLabels).toHaveLength(0);
  });
  test("buildCalendarMonthView shows gestational label on birth date for preterm baby", () => {
    // 出生日: 2025-03-10, 予定日: 2025-05-19 (70日早産 → 在胎30週0日)
    const view = buildCalendarMonthView({
      anchorDate: new Date(2025, 2, 1),
      settings,
      birthDate: "2025-03-10",
      dueDate: "2025-05-19",
    });

    const birthDay = view.days.find((d) => d.date === "2025-03-10");
    const dayBefore = view.days.find((d) => d.date === "2025-03-09");
    const oneWeekLater = view.days.find((d) => d.date === "2025-03-17");

    // 出生日は在胎ラベルと暦ラベルを両方持つ
    expect(birthDay?.calendarAgeLabel?.gestational).toBe("在胎 30週0日");
    expect(birthDay?.calendarAgeLabel?.chronological).toBe("誕生日");
    // 前日は在胎ラベルなし（週が変わっていない）
    expect(dayBefore?.calendarAgeLabel?.gestational).toBeUndefined();
    // 1週後は在胎ラベルあり（週が進んだ）
    expect(oneWeekLater?.calendarAgeLabel?.gestational).toBe("在胎 31週0日");
  });

  test("buildCalendarMonthView fallback injects chronological label when month has no chronological changes", () => {
    const view = buildCalendarMonthView({
      anchorDate: new Date(2025, 1, 1),
      settings,
      birthDate: "2024-12-31",
      dueDate: null,
    });

    const currentMonthDays = view.days.filter((d) => d.isCurrentMonth);
    const chronologicalLabels = currentMonthDays.filter(
      (d) => d.calendarAgeLabel?.chronological != null
    );

    expect(chronologicalLabels.length).toBeGreaterThanOrEqual(1);
    expect(
      currentMonthDays.some((d) => d.date >= "2024-12-31" && d.ageInfo != null)
    ).toBe(true);
  });
});
