import { AgeFormat, CalendarDay } from "@/models/dataModels";
import {
  formatCalendarAgeLabel,
  toYearMonthFromTotalMonths,
  totalMonthsFromParts,
} from "@/utils/dateUtils";
import { stripChronologicalPrefix } from "@/utils/ageLabelNormalization";

export type WeekAgeSegment = {
  dayCount: number;
  // null は対象外（誕生日前）の空白区間。それ以外は色分け用のキー（偶数/奇数で交互配色）。
  totalMonths: number | null;
  // 週内で最も日数が多い区間にのみラベルを持たせる。他は null。
  label: string | null;
};

type SegmentMode = "chronological" | "gestational" | "corrected";

type DaySegmentKey = {
  mode: SegmentMode;
  key: number;
} | null;

const segmentKeyForDay = (
  day: CalendarDay,
  birthDate: string | null
): DaySegmentKey => {
  // 前月/翌月のパディング日はDayCell側で月齢表示を隠しているため、
  // 週帯の計算からも除外する（隣接月の日が帯を支配しないように）。
  if (!day.isCurrentMonth) return null;
  if (!day.ageInfo) return null;
  if (birthDate && day.date < birthDate) return null;

  const { flags, chronological, corrected, gestational } = day.ageInfo;
  // showCorrectedUntilMonths（修正月齢の表示期限設定）は帯の表示には適用しない。
  // showMode は早産・出産予定日の前後のみで決まるため、期限に関わらず対象月齢を判定できる。
  if (flags.showMode === "gestational") {
    return { mode: "gestational", key: gestational.weeks };
  }
  if (flags.showMode === "corrected") {
    return { mode: "corrected", key: totalMonthsFromParts(corrected.parts) };
  }
  return { mode: "chronological", key: totalMonthsFromParts(chronological) };
};

const sameSegmentKey = (a: DaySegmentKey, b: DaySegmentKey): boolean => {
  if (a == null || b == null) return a === b;
  return a.mode === b.mode && a.key === b.key;
};

const labelForSegment = (
  segment: DaySegmentKey,
  ageFormat: AgeFormat
): string | null => {
  if (segment == null) return null;
  if (segment.mode === "gestational") {
    return `在胎 ${segment.key}週`;
  }
  if (segment.mode === "corrected") {
    return formatCalendarAgeLabel(
      toYearMonthFromTotalMonths(segment.key),
      ageFormat,
      true
    );
  }
  return stripChronologicalPrefix(
    formatCalendarAgeLabel(
      toYearMonthFromTotalMonths(segment.key),
      ageFormat,
      false
    )
  );
};

export const buildWeekAgeSegments = (
  row: CalendarDay[],
  ageFormat: AgeFormat,
  birthDate: string | null
): WeekAgeSegment[] | null => {
  const keys = row.map((day) => segmentKeyForDay(day, birthDate));
  if (keys.every((key) => key === null)) return null;

  const grouped: { dayCount: number; segment: DaySegmentKey }[] = [];
  for (const key of keys) {
    const last = grouped[grouped.length - 1];
    if (last && sameSegmentKey(last.segment, key)) {
      last.dayCount += 1;
    } else {
      grouped.push({ dayCount: 1, segment: key });
    }
  }

  let largestIndex = -1;
  let largestDayCount = 0;
  grouped.forEach((segment, index) => {
    if (segment.segment != null && segment.dayCount > largestDayCount) {
      largestDayCount = segment.dayCount;
      largestIndex = index;
    }
  });

  return grouped.map((segment, index) => {
    if (segment.segment == null) {
      return { dayCount: segment.dayCount, totalMonths: null, label: null };
    }
    const label =
      index === largestIndex
        ? labelForSegment(segment.segment, ageFormat)
        : null;
    return {
      dayCount: segment.dayCount,
      totalMonths: segment.segment.key,
      label,
    };
  });
};
