import assert from "node:assert/strict";

import {
  buildCalendarMonthView,
  calculateAgeInfo,
} from "../src/utils/dateUtils";

const hasNegativeSign = (value: string) => value.includes("-");

const shouldShowDaysText = (
  showDaysSinceBirth: boolean,
  daysSinceBirth: number
): string | null =>
  showDaysSinceBirth ? `生まれてから${daysSinceBirth}日目` : null;

const monthEnd = calculateAgeInfo({
  targetDate: "2025-03-01",
  birthDate: "2025-01-31",
  dueDate: null,
  showCorrectedUntilMonths: null,
  ageFormat: "md",
});
assert.equal(hasNegativeSign(monthEnd.chronological.formatted), false);
assert.equal(monthEnd.chronological.days >= 0, true);

const leap28 = calculateAgeInfo({
  targetDate: "2024-03-28",
  birthDate: "2024-02-29",
  dueDate: null,
  showCorrectedUntilMonths: null,
  ageFormat: "md",
});
assert.equal(leap28.chronological.days >= 0, true);

const leap29 = calculateAgeInfo({
  targetDate: "2024-03-29",
  birthDate: "2024-02-29",
  dueDate: null,
  showCorrectedUntilMonths: null,
  ageFormat: "md",
});
assert.equal(leap29.chronological.days >= 0, true);

const preterm258 = calculateAgeInfo({
  targetDate: "2025-02-01",
  birthDate: "2025-01-01",
  dueDate: "2025-01-23", // 22日差 -> 280-22=258
  showCorrectedUntilMonths: null,
  ageFormat: "md",
});
assert.equal(preterm258.flags.isPreterm, true);

const term259 = calculateAgeInfo({
  targetDate: "2025-02-01",
  birthDate: "2025-01-01",
  dueDate: "2025-01-22", // 21日差 -> 280-21=259
  showCorrectedUntilMonths: null,
  ageFormat: "md",
});
assert.equal(term259.flags.isPreterm, false);

const beforeDue = calculateAgeInfo({
  targetDate: "2025-01-20",
  birthDate: "2025-01-01",
  dueDate: "2025-01-23",
  showCorrectedUntilMonths: null,
  ageFormat: "md",
});
assert.equal(beforeDue.gestational.visible, true);
assert.equal(beforeDue.corrected.visible, false);

const onDue = calculateAgeInfo({
  targetDate: "2025-01-23",
  birthDate: "2025-01-01",
  dueDate: "2025-01-23",
  showCorrectedUntilMonths: null,
  ageFormat: "md",
});
assert.equal(onDue.corrected.visible, true);
assert.equal(onDue.corrected.formatted, "0ヶ月0日");
assert.equal(onDue.gestational.visible, false);

assert.equal(shouldShowDaysText(false, onDue.daysSinceBirth), null);

console.log("age.dateUtils tests passed");

const pretermSettings = {
  ageFormat: "md" as const,
  showCorrectedUntilMonths: null,
  showDaysSinceBirth: true,
  lastViewedMonth: null,
  notifyMilestoneEnabled: false,
};

const februaryView = buildCalendarMonthView({
  anchorDate: new Date(2025, 1, 1),
  settings: pretermSettings,
  birthDate: "2025-01-01",
  dueDate: "2025-03-01",
});
const feb1 = februaryView.days.find((day) => day.date === "2025-02-01");
assert.ok(feb1);
assert.equal(feb1?.calendarAgeLabel?.corrected == null, true);

const marchView = buildCalendarMonthView({
  anchorDate: new Date(2025, 2, 1),
  settings: pretermSettings,
  birthDate: "2025-01-01",
  dueDate: "2025-03-01",
});
const mar1 = marchView.days.find((day) => day.date === "2025-03-01");
assert.ok(mar1);
assert.equal(mar1?.calendarAgeLabel?.chronological != null, true);
assert.equal(mar1?.calendarAgeLabel?.corrected, "修正 0ヶ月");

const dueDayAgeInfo = calculateAgeInfo({
  targetDate: "2025-03-01",
  birthDate: "2025-01-01",
  dueDate: "2025-03-01",
  showCorrectedUntilMonths: null,
  ageFormat: "md",
});
assert.equal(dueDayAgeInfo.corrected.visible, true);
assert.equal(dueDayAgeInfo.corrected.formatted, "0ヶ月0日");

const nonPretermView = buildCalendarMonthView({
  anchorDate: new Date(2025, 11, 1),
  settings: pretermSettings,
  birthDate: "2025-11-11",
  dueDate: "2026-01-10",
});
const dec11 = nonPretermView.days.find((day) => day.date === "2025-12-11");
assert.ok(dec11);
assert.equal(dec11?.calendarAgeLabel?.chronological != null, true);
assert.equal(dec11?.calendarAgeLabel?.corrected == null, true);

const dueOffsetSettings = {
  ageFormat: "ymd" as const,
  showCorrectedUntilMonths: null,
  showDaysSinceBirth: true,
  lastViewedMonth: null,
  notifyMilestoneEnabled: false,
};

const preDueView = buildCalendarMonthView({
  anchorDate: new Date(2026, 0, 1),
  settings: dueOffsetSettings,
  birthDate: "2025-11-11",
  dueDate: "2026-01-10",
});
const jan9 = preDueView.days.find((day) => day.date === "2026-01-09");
assert.ok(jan9);
assert.equal(jan9?.calendarAgeLabel?.corrected == null, true);
const jan10 = preDueView.days.find((day) => day.date === "2026-01-10");
assert.ok(jan10);
assert.equal(jan10?.calendarAgeLabel?.corrected, "修正 0才0ヶ月");

const correctedFebView = buildCalendarMonthView({
  anchorDate: new Date(2026, 1, 1),
  settings: dueOffsetSettings,
  birthDate: "2025-11-11",
  dueDate: "2026-01-10",
});
const feb10 = correctedFebView.days.find((day) => day.date === "2026-02-10");
assert.ok(feb10);
assert.equal(feb10?.calendarAgeLabel?.corrected, "修正 0才1ヶ月");
const correctedFeb1 = correctedFebView.days.find(
  (day) => day.date === "2026-02-01"
);
assert.ok(correctedFeb1);
assert.equal(correctedFeb1?.calendarAgeLabel?.corrected == null, true);

const correctedMarView = buildCalendarMonthView({
  anchorDate: new Date(2026, 2, 1),
  settings: dueOffsetSettings,
  birthDate: "2025-11-11",
  dueDate: "2026-01-10",
});
const mar10 = correctedMarView.days.find((day) => day.date === "2026-03-10");
assert.ok(mar10);
assert.equal(mar10?.calendarAgeLabel?.corrected, "修正 0才2ヶ月");
const correctedMar1 = correctedMarView.days.find(
  (day) => day.date === "2026-03-01"
);
assert.ok(correctedMar1);
assert.equal(correctedMar1?.calendarAgeLabel?.corrected == null, true);

const correctedNovView = buildCalendarMonthView({
  anchorDate: new Date(2026, 10, 1),
  settings: dueOffsetSettings,
  birthDate: "2025-11-11",
  dueDate: "2026-01-10",
});
const nov10 = correctedNovView.days.find((day) => day.date === "2026-11-10");
assert.ok(nov10);
assert.equal(nov10?.calendarAgeLabel?.corrected, "修正 0才10ヶ月");

const preBirthView = buildCalendarMonthView({
  anchorDate: new Date(2025, 10, 1),
  settings: dueOffsetSettings,
  birthDate: "2025-11-11",
  dueDate: "2026-01-10",
});
const preBirthDay = preBirthView.days.find((day) => day.date === "2025-11-01");
assert.ok(preBirthDay);
assert.equal(preBirthDay?.calendarAgeLabel?.chronological == null, true);
