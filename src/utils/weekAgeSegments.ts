import { AgeFormat, CalendarDay } from "@/models/dataModels";
import {
  formatCalendarAgeLabel,
  toYearMonthFromTotalMonths,
  totalMonthsFromParts,
} from "@/utils/dateUtils";
import { stripChronologicalPrefix } from "@/utils/ageLabelNormalization";

export type WeekAgeSegment = {
  dayCount: number;
  // null は対象外（誕生日前）の空白区間。
  totalMonths: number | null;
  // 週内で最も日数が多い区間にのみラベルを持たせる。他は null。
  label: string | null;
};

const totalMonthsForDay = (
  day: CalendarDay,
  birthDate: string | null
): number | null => {
  if (!day.ageInfo) return null;
  if (birthDate && day.date < birthDate) return null;
  return totalMonthsFromParts(day.ageInfo.chronological);
};

export const buildWeekAgeSegments = (
  row: CalendarDay[],
  ageFormat: AgeFormat,
  birthDate: string | null
): WeekAgeSegment[] | null => {
  const keys = row.map((day) => totalMonthsForDay(day, birthDate));
  if (keys.every((key) => key === null)) return null;

  const grouped: { dayCount: number; totalMonths: number | null }[] = [];
  for (const key of keys) {
    const last = grouped[grouped.length - 1];
    if (last && last.totalMonths === key) {
      last.dayCount += 1;
    } else {
      grouped.push({ dayCount: 1, totalMonths: key });
    }
  }

  let largestIndex = -1;
  let largestDayCount = 0;
  grouped.forEach((segment, index) => {
    if (segment.totalMonths != null && segment.dayCount > largestDayCount) {
      largestDayCount = segment.dayCount;
      largestIndex = index;
    }
  });

  return grouped.map((segment, index) => {
    if (segment.totalMonths == null) {
      return { dayCount: segment.dayCount, totalMonths: null, label: null };
    }
    const label =
      index === largestIndex
        ? stripChronologicalPrefix(
            formatCalendarAgeLabel(
              toYearMonthFromTotalMonths(segment.totalMonths),
              ageFormat,
              false
            )
          )
        : null;
    return {
      dayCount: segment.dayCount,
      totalMonths: segment.totalMonths,
      label,
    };
  });
};
