"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCalendarMonthView =
  exports.monthKey =
  exports.calculateAgeInfo =
  exports.daysBetweenUtc =
  exports.formatCalendarAgeLabel =
  exports.todayIsoDate =
  exports.toIsoDateString =
  exports.toUtcDateOnly =
  exports.safeParseIsoLocal =
  exports.normalizeToUtcDate =
  exports.isIsoDateString =
    void 0;
const milestones_1 = require("./milestones");
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isIsoDateString = (value) =>
  typeof value === "string" && ISO_DATE_RE.test(value);
exports.isIsoDateString = isIsoDateString;
const daysInMonth = (year, month) => new Date(year, month, 0).getDate();
const parseIsoDateStrict = (isoDate) => {
  if (!(0, exports.isIsoDateString)(isoDate)) return null;
  const [y, m, d] = isoDate.split("-").map(Number);
  const parsed = new Date(y, m - 1, d);
  if (
    parsed.getFullYear() !== y ||
    parsed.getMonth() + 1 !== m ||
    parsed.getDate() !== d
  ) {
    return null;
  }
  return parsed;
};
const normalizeToUtcDate = (isoDate) => {
  if (isoDate == null || isoDate === "") {
    console.warn("normalizeToUtcDate: isoDate が未定義です", isoDate);
    return new Date(NaN);
  }
  const parsed = parseIsoDateStrict(isoDate);
  if (!parsed) {
    console.warn("normalizeToUtcDate: isoDate が不正な形式です", isoDate);
    return new Date(NaN);
  }
  return parsed;
};
exports.normalizeToUtcDate = normalizeToUtcDate;
const safeParseIsoLocal = (isoDate, fallback) => {
  const parsed = isoDate ? parseIsoDateStrict(isoDate) : null;
  if (parsed) return parsed;
  return (0, exports.toUtcDateOnly)(fallback);
};
exports.safeParseIsoLocal = safeParseIsoLocal;
const toUtcDateOnly = (date) => {
  if (Number.isNaN(date.getTime())) {
    return new Date(NaN);
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};
exports.toUtcDateOnly = toUtcDateOnly;
const toIsoDateString = (date) => {
  if (Number.isNaN(date.getTime())) {
    throw new Error("toIsoDateString: Invalid Date provided");
  }
  const d = (0, exports.toUtcDateOnly)(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
exports.toIsoDateString = toIsoDateString;
const todayIsoDate = () =>
  (0, exports.toIsoDateString)((0, exports.toUtcDateOnly)(new Date()));
exports.todayIsoDate = todayIsoDate;
const utcDateMs = (date) =>
  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
const addMonthsClamped = (base, monthsToAdd) => {
  const baseYear = base.getFullYear();
  const baseMonth = base.getMonth();
  const baseDay = base.getDate();
  const totalMonths = baseMonth + monthsToAdd;
  const targetYear = baseYear + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;
  const maxDay = daysInMonth(targetYear, targetMonth + 1);
  const clampedDay = Math.min(baseDay, maxDay);
  return new Date(targetYear, targetMonth, clampedDay);
};
const diffYmdAnchored = (start, end) => {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { years: 0, months: 0, days: 0 };
  }
  if (utcDateMs(end) < utcDateMs(start)) {
    return { years: 0, months: 0, days: 0 };
  }
  let totalMonths =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  let anchor = addMonthsClamped(start, totalMonths);
  if (utcDateMs(anchor) > utcDateMs(end)) {
    totalMonths -= 1;
    anchor = addMonthsClamped(start, totalMonths);
  }
  const days = (0, exports.daysBetweenUtc)(anchor, end);
  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    days,
  };
};
const formatAge = (parts, ageFormat) => {
  if (ageFormat === "md") {
    const totalMonths = parts.years * 12 + parts.months;
    return `${totalMonths}ヶ月${parts.days}日`;
  }
  return `${parts.years}才${parts.months}ヶ月${parts.days}日`;
};
const totalMonthsFromParts = (parts) => parts.years * 12 + parts.months;
const toYearMonthFromTotalMonths = (totalMonths) => ({
  years: Math.floor(totalMonths / 12),
  months: totalMonths % 12,
});
const formatCalendarAgeLabel = (parts, _ageFormat, isCorrected) => {
  const labelPrefix = isCorrected ? "修正 " : "暦 ";
  if (_ageFormat === "md") {
    return `${labelPrefix}${totalMonthsFromParts(parts)}ヶ月`;
  }
  return `${labelPrefix}${parts.years}才${parts.months}ヶ月`;
};
exports.formatCalendarAgeLabel = formatCalendarAgeLabel;
const formatGestational = (weeks, days) => `${weeks}週${days}日`;
const isWithinCorrectedLimit = (parts, limitMonths) => {
  if (limitMonths === null) return true;
  const months = parts.years * 12 + parts.months;
  if (months > limitMonths) return false;
  if (months === limitMonths && parts.days > 0) return false;
  return true;
};
const daysBetweenUtc = (start, end) => {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const diff = Math.floor((utcDateMs(end) - utcDateMs(start)) / MS_PER_DAY);
  return diff < 0 ? 0 : diff;
};
exports.daysBetweenUtc = daysBetweenUtc;
const calculateAgeInfo = (params) => {
  const target = (0, exports.normalizeToUtcDate)(params.targetDate);
  const birth = (0, exports.normalizeToUtcDate)(params.birthDate);
  const dueRaw = params.dueDate
    ? (0, exports.normalizeToUtcDate)(params.dueDate)
    : null;
  const due = dueRaw && !Number.isNaN(dueRaw.getTime()) ? dueRaw : null;
  if (Number.isNaN(target.getTime()) || Number.isNaN(birth.getTime())) {
    throw new Error("calculateAgeInfo: Invalid date input");
  }
  const chronologicalParts = diffYmdAnchored(birth, target);
  const daysSinceBirth = (0, exports.daysBetweenUtc)(birth, target);
  const prematurityDays = due ? (0, exports.daysBetweenUtc)(birth, due) : 0;
  const gestationAtBirthDays = 280 - prematurityDays;
  const isPreterm = Boolean(due) && gestationAtBirthDays < 259;
  const isBeforeDue = Boolean(due && utcDateMs(target) < utcDateMs(due));
  const correctedParts =
    due && isPreterm
      ? diffYmdAnchored(due, target)
      : { years: 0, months: 0, days: 0 };
  const correctedVisible =
    Boolean(due) &&
    isPreterm &&
    !isBeforeDue &&
    isWithinCorrectedLimit(correctedParts, params.showCorrectedUntilMonths);
  const gestationAtTargetDays = gestationAtBirthDays + daysSinceBirth;
  const gestationalWeeks = Math.floor(gestationAtTargetDays / 7);
  const gestationalDays = gestationAtTargetDays % 7;
  const gestationalVisible =
    Boolean(due) &&
    isPreterm &&
    isBeforeDue &&
    utcDateMs(target) >= utcDateMs(birth); // 出生日前は在胎非表示
  const showMode = !isPreterm
    ? "chronologicalOnly"
    : isBeforeDue
      ? "gestational"
      : "corrected";
  return {
    chronological: {
      parts: chronologicalParts,
      ...chronologicalParts,
      formatted: formatAge(chronologicalParts, params.ageFormat),
    },
    corrected: {
      parts: correctedParts,
      ...correctedParts,
      formatted: correctedVisible
        ? formatAge(correctedParts, params.ageFormat)
        : null,
      visible: correctedVisible,
    },
    gestational: {
      weeks: gestationalWeeks,
      days: gestationalDays,
      formatted: gestationalVisible
        ? formatGestational(gestationalWeeks, gestationalDays)
        : null,
      visible: gestationalVisible,
    },
    flags: {
      isPreterm,
      showMode,
    },
    daysSinceBirth,
  };
};
exports.calculateAgeInfo = calculateAgeInfo;
const monthKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};
exports.monthKey = monthKey;
const startOfCalendarGrid = (anchor) => {
  const firstDay = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const startDay = firstDay.getDay();
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - startDay);
  return startDate;
};
const buildCalendarMonthView = ({
  anchorDate,
  settings,
  birthDate,
  dueDate,
  achievementCountsByDay,
}) => {
  var _a, _b, _c;
  const startDate = startOfCalendarGrid(anchorDate);
  const firstDay = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const startDay = firstDay.getDay();
  const daysInCurrentMonth = daysInMonth(
    anchorDate.getFullYear(),
    anchorDate.getMonth() + 1
  );
  const totalCells = startDay + daysInCurrentMonth;
  const weeks = Math.max(5, Math.min(6, Math.ceil(totalCells / 7)));
  const cellCount = weeks * 7;
  const todayIso = (0, exports.todayIsoDate)();
  const days = [];
  const hasValidBirthDate =
    Boolean(birthDate) && (0, exports.isIsoDateString)(birthDate);
  const normalizedDueDate =
    dueDate && (0, exports.isIsoDateString)(dueDate) ? dueDate : null;
  const dueDayOfMonth = normalizedDueDate
    ? (0, exports.normalizeToUtcDate)(normalizedDueDate).getDate()
    : null;
  const birthToDueTotalMonths =
    hasValidBirthDate && normalizedDueDate
      ? totalMonthsFromParts(
          (0, exports.calculateAgeInfo)({
            targetDate: normalizedDueDate,
            birthDate: birthDate,
            dueDate: null,
            showCorrectedUntilMonths: settings.showCorrectedUntilMonths,
            ageFormat: settings.ageFormat,
          }).chronological
        )
      : null;
  let previousAgeInfo = null;
  for (let offset = 0; offset < cellCount; offset += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + offset);
    const iso = (0, exports.toIsoDateString)(date);
    const isCurrentMonth =
      date.getFullYear() === anchorDate.getFullYear() &&
      date.getMonth() === anchorDate.getMonth();
    const ageInfo =
      hasValidBirthDate && iso
        ? (0, exports.calculateAgeInfo)({
            targetDate: iso,
            birthDate: birthDate,
            dueDate: normalizedDueDate,
            showCorrectedUntilMonths: settings.showCorrectedUntilMonths,
            ageFormat: settings.ageFormat,
          })
        : null;
    const isBirthDay = Boolean(birthDate && iso === birthDate);
    const chronologicalChanged =
      Boolean(
        ageInfo &&
        previousAgeInfo &&
        totalMonthsFromParts(ageInfo.chronological) ===
          totalMonthsFromParts(previousAgeInfo.chronological) + 1
      ) || isBirthDay;
    const correctedVisible =
      (ageInfo === null || ageInfo === void 0
        ? void 0
        : ageInfo.corrected.visible) === true &&
      ageInfo.corrected.formatted != null;
    const chronologicalTotalMonths = ageInfo
      ? totalMonthsFromParts(ageInfo.chronological)
      : -1;
    const correctedCurrentTotalMonths =
      correctedVisible && birthToDueTotalMonths != null
        ? chronologicalTotalMonths - birthToDueTotalMonths
        : -1;
    const daysInTargetMonth = daysInMonth(
      date.getFullYear(),
      date.getMonth() + 1
    );
    const isDueAnniversary =
      dueDayOfMonth != null &&
      (date.getDate() === dueDayOfMonth ||
        (dueDayOfMonth > daysInTargetMonth &&
          date.getDate() === daysInTargetMonth));
    // 修正月齢ラベルは月初ではなく、予定日と同じ日付（なければ月末）にのみ表示する。
    const correctedChanged = correctedVisible && isDueAnniversary;
    const gestationalVisible =
      (ageInfo === null || ageInfo === void 0
        ? void 0
        : ageInfo.gestational.visible) === true &&
      ageInfo.gestational.formatted != null;
    const previousGestationalVisible =
      (previousAgeInfo === null || previousAgeInfo === void 0
        ? void 0
        : previousAgeInfo.gestational.visible) === true &&
      previousAgeInfo.gestational.formatted != null;
    const gestationalChanged =
      gestationalVisible &&
      ((previousGestationalVisible &&
        ageInfo.gestational.weeks === previousAgeInfo.gestational.weeks + 1) ||
        !previousGestationalVisible ||
        isBirthDay); // 出生日は前日と在胎週数が同じになるため強制表示
    let calendarAgeLabel =
      ageInfo &&
      (chronologicalChanged || correctedChanged || gestationalChanged)
        ? {
            chronological: chronologicalChanged
              ? isBirthDay
                ? "誕生日"
                : (0, exports.formatCalendarAgeLabel)(
                    ageInfo.chronological,
                    settings.ageFormat,
                    false
                  )
              : undefined,
            corrected: correctedChanged
              ? (() => {
                  const correctedDisplayMonths = Math.max(
                    correctedCurrentTotalMonths,
                    0
                  );
                  return (0, exports.formatCalendarAgeLabel)(
                    toYearMonthFromTotalMonths(correctedDisplayMonths),
                    settings.ageFormat,
                    true
                  );
                })()
              : undefined,
            gestational: gestationalChanged
              ? `在胎 ${ageInfo.gestational.formatted}`
              : undefined,
          }
        : null;
    if (!isCurrentMonth) {
      calendarAgeLabel = null;
    }
    const milestoneBadge =
      isCurrentMonth && ageInfo
        ? (0, milestones_1.getDayMilestoneBadge)(ageInfo.daysSinceBirth)
        : null;
    days.push({
      date: iso,
      isCurrentMonth,
      isToday: iso === todayIso,
      ageInfo,
      calendarAgeLabel,
      achievementCount:
        (_a =
          achievementCountsByDay === null || achievementCountsByDay === void 0
            ? void 0
            : achievementCountsByDay[iso]) !== null && _a !== void 0
          ? _a
          : 0,
      hasAchievements:
        ((_b =
          achievementCountsByDay === null || achievementCountsByDay === void 0
            ? void 0
            : achievementCountsByDay[iso]) !== null && _b !== void 0
          ? _b
          : 0) > 0,
      milestoneBadge,
    });
    previousAgeInfo = ageInfo;
  }
  const monthDays = days.filter((day) => day.isCurrentMonth);
  const hasChronologicalLabelInMonth = monthDays.some((day) => {
    var _a;
    return (
      ((_a = day.calendarAgeLabel) === null || _a === void 0
        ? void 0
        : _a.chronological) != null
    );
  });
  if (!hasChronologicalLabelInMonth) {
    // 誕生日前のセルに暦月齢を補完表示しないため、birthDate 以降のセルのみ対象にする。
    const fallbackDay = monthDays.find(
      (day) =>
        day.ageInfo != null && (birthDate == null || day.date >= birthDate)
    );
    if (
      fallbackDay === null || fallbackDay === void 0
        ? void 0
        : fallbackDay.ageInfo
    ) {
      const fallbackChronologicalLabel = (0, exports.formatCalendarAgeLabel)(
        fallbackDay.ageInfo.chronological,
        settings.ageFormat,
        false
      );
      fallbackDay.calendarAgeLabel = {
        ...((_c = fallbackDay.calendarAgeLabel) !== null && _c !== void 0
          ? _c
          : {}),
        chronological: fallbackChronologicalLabel,
      };
    }
  }
  return {
    year: anchorDate.getFullYear(),
    month: anchorDate.getMonth() + 1,
    days,
  };
};
exports.buildCalendarMonthView = buildCalendarMonthView;
