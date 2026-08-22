"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const dateUtils_1 = require("../src/utils/dateUtils");
const hasNegativeSign = (value) => value.includes("-");
const shouldShowDaysText = (showDaysSinceBirth, daysSinceBirth) =>
  showDaysSinceBirth ? `生まれてから${daysSinceBirth}日目` : null;
const monthEnd = (0, dateUtils_1.calculateAgeInfo)({
  targetDate: "2025-03-01",
  birthDate: "2025-01-31",
  dueDate: null,
  showCorrectedUntilMonths: null,
  ageFormat: "md",
});
strict_1.default.equal(
  hasNegativeSign(monthEnd.chronological.formatted),
  false
);
strict_1.default.equal(monthEnd.chronological.days >= 0, true);
const leap28 = (0, dateUtils_1.calculateAgeInfo)({
  targetDate: "2024-03-28",
  birthDate: "2024-02-29",
  dueDate: null,
  showCorrectedUntilMonths: null,
  ageFormat: "md",
});
strict_1.default.equal(leap28.chronological.days >= 0, true);
const leap29 = (0, dateUtils_1.calculateAgeInfo)({
  targetDate: "2024-03-29",
  birthDate: "2024-02-29",
  dueDate: null,
  showCorrectedUntilMonths: null,
  ageFormat: "md",
});
strict_1.default.equal(leap29.chronological.days >= 0, true);
const preterm258 = (0, dateUtils_1.calculateAgeInfo)({
  targetDate: "2025-02-01",
  birthDate: "2025-01-01",
  dueDate: "2025-01-23", // 22日差 -> 280-22=258
  showCorrectedUntilMonths: null,
  ageFormat: "md",
});
strict_1.default.equal(preterm258.flags.isPreterm, true);
const term259 = (0, dateUtils_1.calculateAgeInfo)({
  targetDate: "2025-02-01",
  birthDate: "2025-01-01",
  dueDate: "2025-01-22", // 21日差 -> 280-21=259
  showCorrectedUntilMonths: null,
  ageFormat: "md",
});
strict_1.default.equal(term259.flags.isPreterm, false);
const beforeDue = (0, dateUtils_1.calculateAgeInfo)({
  targetDate: "2025-01-20",
  birthDate: "2025-01-01",
  dueDate: "2025-01-23",
  showCorrectedUntilMonths: null,
  ageFormat: "md",
});
strict_1.default.equal(beforeDue.gestational.visible, true);
strict_1.default.equal(beforeDue.corrected.visible, false);
const onDue = (0, dateUtils_1.calculateAgeInfo)({
  targetDate: "2025-01-23",
  birthDate: "2025-01-01",
  dueDate: "2025-01-23",
  showCorrectedUntilMonths: null,
  ageFormat: "md",
});
strict_1.default.equal(onDue.corrected.visible, true);
strict_1.default.equal(onDue.corrected.formatted, "0ヶ月0日");
strict_1.default.equal(onDue.gestational.visible, false);
strict_1.default.equal(shouldShowDaysText(false, onDue.daysSinceBirth), null);
console.log("age.dateUtils tests passed");
const pretermSettings = {
  ageFormat: "md",
  showCorrectedUntilMonths: null,
  showDaysSinceBirth: true,
  lastViewedMonth: null,
  notifyMilestoneEnabled: false,
};
const februaryView = (0, dateUtils_1.buildCalendarMonthView)({
  anchorDate: new Date(2025, 1, 1),
  settings: pretermSettings,
  birthDate: "2025-01-01",
  dueDate: "2025-03-01",
});
const feb1 = februaryView.days.find((day) => day.date === "2025-02-01");
strict_1.default.ok(feb1);
strict_1.default.equal(
  ((_a = feb1 === null || feb1 === void 0 ? void 0 : feb1.calendarAgeLabel) ===
    null || _a === void 0
    ? void 0
    : _a.corrected) == null,
  true
);
const marchView = (0, dateUtils_1.buildCalendarMonthView)({
  anchorDate: new Date(2025, 2, 1),
  settings: pretermSettings,
  birthDate: "2025-01-01",
  dueDate: "2025-03-01",
});
const mar1 = marchView.days.find((day) => day.date === "2025-03-01");
strict_1.default.ok(mar1);
strict_1.default.equal(
  ((_b = mar1 === null || mar1 === void 0 ? void 0 : mar1.calendarAgeLabel) ===
    null || _b === void 0
    ? void 0
    : _b.chronological) != null,
  true
);
strict_1.default.equal(
  (_c = mar1 === null || mar1 === void 0 ? void 0 : mar1.calendarAgeLabel) ===
    null || _c === void 0
    ? void 0
    : _c.corrected,
  "修正 0ヶ月"
);
const dueDayAgeInfo = (0, dateUtils_1.calculateAgeInfo)({
  targetDate: "2025-03-01",
  birthDate: "2025-01-01",
  dueDate: "2025-03-01",
  showCorrectedUntilMonths: null,
  ageFormat: "md",
});
strict_1.default.equal(dueDayAgeInfo.corrected.visible, true);
strict_1.default.equal(dueDayAgeInfo.corrected.formatted, "0ヶ月0日");
const nonPretermView = (0, dateUtils_1.buildCalendarMonthView)({
  anchorDate: new Date(2025, 11, 1),
  settings: pretermSettings,
  birthDate: "2025-11-11",
  dueDate: "2026-01-10",
});
const dec11 = nonPretermView.days.find((day) => day.date === "2025-12-11");
strict_1.default.ok(dec11);
strict_1.default.equal(
  ((_d =
    dec11 === null || dec11 === void 0 ? void 0 : dec11.calendarAgeLabel) ===
    null || _d === void 0
    ? void 0
    : _d.chronological) != null,
  true
);
strict_1.default.equal(
  ((_e =
    dec11 === null || dec11 === void 0 ? void 0 : dec11.calendarAgeLabel) ===
    null || _e === void 0
    ? void 0
    : _e.corrected) == null,
  true
);
const dueOffsetSettings = {
  ageFormat: "ymd",
  showCorrectedUntilMonths: null,
  showDaysSinceBirth: true,
  lastViewedMonth: null,
  notifyMilestoneEnabled: false,
};
const preDueView = (0, dateUtils_1.buildCalendarMonthView)({
  anchorDate: new Date(2026, 0, 1),
  settings: dueOffsetSettings,
  birthDate: "2025-11-11",
  dueDate: "2026-01-10",
});
const jan9 = preDueView.days.find((day) => day.date === "2026-01-09");
strict_1.default.ok(jan9);
strict_1.default.equal(
  ((_f = jan9 === null || jan9 === void 0 ? void 0 : jan9.calendarAgeLabel) ===
    null || _f === void 0
    ? void 0
    : _f.corrected) == null,
  true
);
const jan10 = preDueView.days.find((day) => day.date === "2026-01-10");
strict_1.default.ok(jan10);
strict_1.default.equal(
  (_g =
    jan10 === null || jan10 === void 0 ? void 0 : jan10.calendarAgeLabel) ===
    null || _g === void 0
    ? void 0
    : _g.corrected,
  "修正 0才0ヶ月"
);
const correctedFebView = (0, dateUtils_1.buildCalendarMonthView)({
  anchorDate: new Date(2026, 1, 1),
  settings: dueOffsetSettings,
  birthDate: "2025-11-11",
  dueDate: "2026-01-10",
});
const feb10 = correctedFebView.days.find((day) => day.date === "2026-02-10");
strict_1.default.ok(feb10);
strict_1.default.equal(
  (_h =
    feb10 === null || feb10 === void 0 ? void 0 : feb10.calendarAgeLabel) ===
    null || _h === void 0
    ? void 0
    : _h.corrected,
  "修正 0才1ヶ月"
);
const correctedFeb1 = correctedFebView.days.find(
  (day) => day.date === "2026-02-01"
);
strict_1.default.ok(correctedFeb1);
strict_1.default.equal(
  ((_j =
    correctedFeb1 === null || correctedFeb1 === void 0
      ? void 0
      : correctedFeb1.calendarAgeLabel) === null || _j === void 0
    ? void 0
    : _j.corrected) == null,
  true
);
const correctedMarView = (0, dateUtils_1.buildCalendarMonthView)({
  anchorDate: new Date(2026, 2, 1),
  settings: dueOffsetSettings,
  birthDate: "2025-11-11",
  dueDate: "2026-01-10",
});
const mar10 = correctedMarView.days.find((day) => day.date === "2026-03-10");
strict_1.default.ok(mar10);
strict_1.default.equal(
  (_k =
    mar10 === null || mar10 === void 0 ? void 0 : mar10.calendarAgeLabel) ===
    null || _k === void 0
    ? void 0
    : _k.corrected,
  "修正 0才2ヶ月"
);
const correctedMar1 = correctedMarView.days.find(
  (day) => day.date === "2026-03-01"
);
strict_1.default.ok(correctedMar1);
strict_1.default.equal(
  ((_l =
    correctedMar1 === null || correctedMar1 === void 0
      ? void 0
      : correctedMar1.calendarAgeLabel) === null || _l === void 0
    ? void 0
    : _l.corrected) == null,
  true
);
const correctedNovView = (0, dateUtils_1.buildCalendarMonthView)({
  anchorDate: new Date(2026, 10, 1),
  settings: dueOffsetSettings,
  birthDate: "2025-11-11",
  dueDate: "2026-01-10",
});
const nov10 = correctedNovView.days.find((day) => day.date === "2026-11-10");
strict_1.default.ok(nov10);
strict_1.default.equal(
  (_m =
    nov10 === null || nov10 === void 0 ? void 0 : nov10.calendarAgeLabel) ===
    null || _m === void 0
    ? void 0
    : _m.corrected,
  "修正 0才10ヶ月"
);
const preBirthView = (0, dateUtils_1.buildCalendarMonthView)({
  anchorDate: new Date(2025, 10, 1),
  settings: dueOffsetSettings,
  birthDate: "2025-11-11",
  dueDate: "2026-01-10",
});
const preBirthDay = preBirthView.days.find((day) => day.date === "2025-11-01");
strict_1.default.ok(preBirthDay);
strict_1.default.equal(
  ((_o =
    preBirthDay === null || preBirthDay === void 0
      ? void 0
      : preBirthDay.calendarAgeLabel) === null || _o === void 0
    ? void 0
    : _o.chronological) == null,
  true
);
