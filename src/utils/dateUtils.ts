import {
  AgeFormat,
  AgeInfo,
  CalendarDay,
  CalendarMonthView,
  UserSettings,
} from "../models/dataModels";
import { getDayMilestoneBadge } from "./milestones";

type AgeParts = { years: number; months: number; days: number };

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const isIsoDateString = (value: unknown): value is string =>
  typeof value === "string" && ISO_DATE_RE.test(value);

const daysInMonth = (year: number, month: number): number =>
  new Date(year, month, 0).getDate();

const parseIsoDateStrict = (isoDate: string): Date | null => {
  if (!isIsoDateString(isoDate)) return null;

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

export const normalizeToUtcDate = (
  isoDate: string | null | undefined
): Date => {
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

export const safeParseIsoLocal = (
  isoDate: string | null | undefined,
  fallback: Date
): Date => {
  const parsed = isoDate ? parseIsoDateStrict(isoDate) : null;
  if (parsed) return parsed;
  return toUtcDateOnly(fallback);
};

export const toUtcDateOnly = (date: Date): Date => {
  if (Number.isNaN(date.getTime())) {
    return new Date(NaN);
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const toIsoDateString = (date: Date): string => {
  if (Number.isNaN(date.getTime())) {
    throw new Error("toIsoDateString: Invalid Date provided");
  }
  const d = toUtcDateOnly(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const todayIsoDate = (): string =>
  toIsoDateString(toUtcDateOnly(new Date()));

const utcDateMs = (date: Date): number =>
  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());

export const addMonthsClamped = (base: Date, monthsToAdd: number): Date => {
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

const diffYmdAnchored = (start: Date, end: Date): AgeParts => {
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

  const days = daysBetweenUtc(anchor, end);
  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    days,
  };
};

const formatAge = (parts: AgeParts, ageFormat: AgeFormat): string => {
  if (ageFormat === "md") {
    const totalMonths = parts.years * 12 + parts.months;
    return `${totalMonths}ヶ月${parts.days}日`;
  }
  return `${parts.years}才${parts.months}ヶ月${parts.days}日`;
};

const totalMonthsFromParts = (parts: {
  years: number;
  months: number;
}): number => parts.years * 12 + parts.months;

const toYearMonthFromTotalMonths = (
  totalMonths: number
): { years: number; months: number } => ({
  years: Math.floor(totalMonths / 12),
  months: totalMonths % 12,
});

export const formatCalendarAgeLabel = (
  parts: { years: number; months: number },
  _ageFormat: AgeFormat,
  isCorrected: boolean
): string => {
  const labelPrefix = isCorrected ? "修正 " : "暦 ";
  if (_ageFormat === "md") {
    return `${labelPrefix}${totalMonthsFromParts(parts)}ヶ月`;
  }
  return `${labelPrefix}${parts.years}才${parts.months}ヶ月`;
};

const formatGestational = (weeks: number, days: number): string =>
  `${weeks}週${days}日`;

const isWithinCorrectedLimit = (
  parts: AgeParts,
  limitMonths: number | null
): boolean => {
  if (limitMonths === null) return true;
  const months = parts.years * 12 + parts.months;
  if (months > limitMonths) return false;
  if (months === limitMonths && parts.days > 0) return false;
  return true;
};

export const daysBetweenUtc = (start: Date, end: Date): number => {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const diff = Math.floor((utcDateMs(end) - utcDateMs(start)) / MS_PER_DAY);
  return diff < 0 ? 0 : diff;
};

export const calculateAgeInfo = (params: {
  targetDate: string;
  birthDate: string;
  dueDate: string | null;
  showCorrectedUntilMonths: number | null;
  ageFormat: AgeFormat;
}): AgeInfo => {
  const target = normalizeToUtcDate(params.targetDate);
  const birth = normalizeToUtcDate(params.birthDate);
  const dueRaw = params.dueDate ? normalizeToUtcDate(params.dueDate) : null;
  const due = dueRaw && !Number.isNaN(dueRaw.getTime()) ? dueRaw : null;

  if (Number.isNaN(target.getTime()) || Number.isNaN(birth.getTime())) {
    throw new Error("calculateAgeInfo: Invalid date input");
  }

  const chronologicalParts = diffYmdAnchored(birth, target);
  const daysSinceBirth = daysBetweenUtc(birth, target);

  const prematurityDays = due ? daysBetweenUtc(birth, due) : 0;
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

  const showMode: AgeInfo["flags"]["showMode"] = !isPreterm
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

export const monthKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const startOfCalendarGrid = (anchor: Date): Date => {
  const firstDay = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const startDay = firstDay.getDay();
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - startDay);
  return startDate;
};

export const buildCalendarMonthView = ({
  anchorDate,
  settings,
  birthDate,
  dueDate,
  achievementCountsByDay,
}: {
  anchorDate: Date;
  settings: UserSettings;
  birthDate: string | null;
  dueDate: string | null;
  achievementCountsByDay?: Record<string, number>;
}): CalendarMonthView => {
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
  const todayIso = todayIsoDate();
  const days: CalendarDay[] = [];
  const hasValidBirthDate = Boolean(birthDate) && isIsoDateString(birthDate);
  const normalizedDueDate =
    dueDate && isIsoDateString(dueDate) ? dueDate : null;
  const dueDayOfMonth = normalizedDueDate
    ? normalizeToUtcDate(normalizedDueDate).getDate()
    : null;
  const birthToDueTotalMonths =
    hasValidBirthDate && normalizedDueDate
      ? totalMonthsFromParts(
          calculateAgeInfo({
            targetDate: normalizedDueDate,
            birthDate: birthDate as string,
            dueDate: null,
            showCorrectedUntilMonths: settings.showCorrectedUntilMonths,
            ageFormat: settings.ageFormat,
          }).chronological
        )
      : null;
  let previousAgeInfo: AgeInfo | null = null;

  for (let offset = 0; offset < cellCount; offset += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + offset);
    const iso = toIsoDateString(date);
    const isCurrentMonth =
      date.getFullYear() === anchorDate.getFullYear() &&
      date.getMonth() === anchorDate.getMonth();

    const ageInfo =
      hasValidBirthDate && iso
        ? calculateAgeInfo({
            targetDate: iso,
            birthDate: birthDate as string,
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
      ageInfo?.corrected.visible === true &&
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
      ageInfo?.gestational.visible === true &&
      ageInfo.gestational.formatted != null;
    const previousGestationalVisible =
      previousAgeInfo?.gestational.visible === true &&
      previousAgeInfo.gestational.formatted != null;
    const gestationalChanged =
      gestationalVisible &&
      ((previousGestationalVisible &&
        ageInfo!.gestational.weeks ===
          previousAgeInfo!.gestational.weeks + 1) ||
        !previousGestationalVisible ||
        isBirthDay); // 出生日は前日と在胎週数が同じになるため強制表示

    let calendarAgeLabel =
      ageInfo &&
      (chronologicalChanged || correctedChanged || gestationalChanged)
        ? {
            chronological: chronologicalChanged
              ? isBirthDay
                ? "誕生日"
                : formatCalendarAgeLabel(
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
                  return formatCalendarAgeLabel(
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
        ? getDayMilestoneBadge(ageInfo.daysSinceBirth)
        : null;

    days.push({
      date: iso,
      isCurrentMonth,
      isToday: iso === todayIso,
      ageInfo,
      calendarAgeLabel,
      achievementCount: achievementCountsByDay?.[iso] ?? 0,
      hasAchievements: (achievementCountsByDay?.[iso] ?? 0) > 0,
      milestoneBadge,
    });

    previousAgeInfo = ageInfo;
  }

  const monthDays = days.filter((day) => day.isCurrentMonth);
  const hasChronologicalLabelInMonth = monthDays.some(
    (day) => day.calendarAgeLabel?.chronological != null
  );

  if (!hasChronologicalLabelInMonth) {
    // 誕生日前のセルに暦月齢を補完表示しないため、birthDate 以降のセルのみ対象にする。
    const fallbackDay = monthDays.find(
      (day) =>
        day.ageInfo != null && (birthDate == null || day.date >= birthDate)
    );
    if (fallbackDay?.ageInfo) {
      const fallbackChronologicalLabel = formatCalendarAgeLabel(
        fallbackDay.ageInfo.chronological,
        settings.ageFormat,
        false
      );
      fallbackDay.calendarAgeLabel = {
        ...(fallbackDay.calendarAgeLabel ?? {}),
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
