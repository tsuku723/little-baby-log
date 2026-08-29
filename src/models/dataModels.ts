// ---------------------------------------
// 基本設定
// ---------------------------------------

export type AgeFormat = "md" | "ymd";

// UserSettings はプロフィールに紐付かない表示設定のみを扱う。
// birthDate / dueDate は UserProfile 側で保持し、ここでは扱わない。
export type UserSettings = {
  showCorrectedUntilMonths: number | null;
  ageFormat: AgeFormat;
  showDaysSinceBirth: boolean;
  lastViewedMonth: string | null; // "YYYY-MM-DD"
  notifyMilestoneEnabled: boolean;
};

// ---------------------------------------
// Achievement（実績）
// ---------------------------------------

export type Achievement = {
  id: string;
  date: string; // normalized ISO "YYYY-MM-DD"
  category?: string; // 現在未使用。将来のタグ機能用予約フィールド。
  title: string;
  memo?: string;
  photoPath?: string; // アプリ内に保存した JPEG のファイルパス

  // storage.ts に合わせて「必須」に統一
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime（optional ではない）
};

// ---------------------------------------
// 永続化全体（辞書形式）
// ---------------------------------------
// storage.ts は Record<string, Achievement[]> を使うため、
// この形式に合わせる必要がある。

export type AchievementStore = Record<string, Achievement[]>;

// ---------------------------------------
// (任意) DailyRecord
// ---------------------------------------
// カレンダー1日の情報として使いたい場合用。
// ただし辞書形式の key/value がそのまま DailyRecord になるため、
// 「仕様上は不要」。使う場合のみ定義を正しくする。

export type DailyRecord = {
  date: string;
  items: Achievement[];
};

// ---------------------------------------
// 年齢情報
// ---------------------------------------

export type AgeInfo = {
  chronological: {
    parts: {
      years: number;
      months: number;
      days: number;
    };
    years: number;
    months: number;
    days: number;
    formatted: string;
  };
  corrected: {
    parts: {
      years: number;
      months: number;
      days: number;
    };
    years: number;
    months: number;
    days: number;
    formatted: string | null;
    visible: boolean;
  };
  gestational: {
    weeks: number;
    days: number;
    formatted: string | null;
    visible: boolean;
  };
  flags: {
    isPreterm: boolean;
    showMode: "chronologicalOnly" | "gestational" | "corrected";
  };
  daysSinceBirth: number;
};

// ---------------------------------------
// カレンダー
// ---------------------------------------

export type CalendarDay = {
  date: string; // "YYYY-MM-DD"
  isCurrentMonth: boolean;
  isToday: boolean;
  ageInfo: AgeInfo | null;
  calendarAgeLabel: {
    chronological?: string;
    corrected?: string;
    gestational?: string;
  } | null;

  achievementCount: number;

  // 永続化は配列のため hasAchievements は boolean のままでOK
  hasAchievements: boolean;

  // 100/200/365/1000日目のマイルストームバッジ（例:"100日","1歳"）。対象外の日は null。
  milestoneBadge: string | null;
};

export type CalendarMonthView = {
  year: number;
  month: number;
  days: CalendarDay[];
};

// ---------------------------------------
// 一覧表示用
// ---------------------------------------

export type AchievementListItem = {
  id: string;
  date: string; // YYYY-MM-DD
  dateLabel: string;
  title: string;
};
