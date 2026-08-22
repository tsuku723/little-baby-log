import {
  addMonthsClamped,
  calculateAgeInfo,
  isIsoDateString,
  normalizeToUtcDate,
  toIsoDateString,
} from "./dateUtils";

export type Milestone = {
  key: string;
  date: string; // "YYYY-MM-DD"
  title: string;
};

const DAY_MILESTONES: { days: number; title: string }[] = [
  { days: 100, title: "生まれてから100日目です" },
  { days: 200, title: "生まれてから200日目です" },
  { days: 365, title: "1歳のお誕生日です🎉" },
  { days: 1000, title: "生まれてから1000日目です" },
];

// 修正月齢の概念が一般的に使われる期間に合わせる
const MONTH_MILESTONE_LIMIT = 24;

const addDaysIso = (baseIso: string, days: number): string => {
  const [y, m, d] = baseIso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toIsoDateString(date);
};

const addMonthsIso = (baseIso: string, months: number): string =>
  toIsoDateString(addMonthsClamped(normalizeToUtcDate(baseIso), months));

/**
 * 誕生日(birthDate)・出産予定日(dueDate)から、通知・カレンダー表示対象の
 * マイルストーン日付一覧を計算する。修正月齢は早産児(isPreterm)の場合のみ含む。
 */
export const calculateMilestones = (params: {
  birthDate: string;
  dueDate: string | null;
}): Milestone[] => {
  const { birthDate, dueDate } = params;
  if (!isIsoDateString(birthDate)) return [];

  const milestones: Milestone[] = [];

  for (const { days, title } of DAY_MILESTONES) {
    milestones.push({
      key: `days-${days}`,
      date: addDaysIso(birthDate, days),
      title,
    });
  }

  for (let month = 1; month <= MONTH_MILESTONE_LIMIT; month += 1) {
    milestones.push({
      key: `chronological-${month}`,
      date: addMonthsIso(birthDate, month),
      title: `生後${month}ヶ月になりました`,
    });
  }

  const normalizedDueDate =
    dueDate && isIsoDateString(dueDate) ? dueDate : null;
  if (normalizedDueDate) {
    const { flags } = calculateAgeInfo({
      targetDate: birthDate,
      birthDate,
      dueDate: normalizedDueDate,
      showCorrectedUntilMonths: null,
      ageFormat: "ymd",
    });

    if (flags.isPreterm) {
      for (let month = 1; month <= MONTH_MILESTONE_LIMIT; month += 1) {
        milestones.push({
          key: `corrected-${month}`,
          date: addMonthsIso(normalizedDueDate, month),
          title: `修正月齢${month}ヶ月になりました`,
        });
      }
    }
  }

  return milestones;
};

/**
 * 生まれてからの日数(daysSinceBirth)がカレンダーセルにバッジ表示すべき
 * 節目(100/200/365/1000日目)かどうかを判定する。
 */
export const getDayMilestoneBadge = (daysSinceBirth: number): string | null => {
  const found = DAY_MILESTONES.find((m) => m.days === daysSinceBirth);
  if (!found) return null;
  return found.days === 365 ? "1歳" : `${found.days}日`;
};
