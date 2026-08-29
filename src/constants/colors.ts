export const COLORS = {
  // Backgrounds
  background: "#FFFDF7",
  bottomBackground: "#FFFDF7",
  surface: "#FFFDF7",
  filterBackground: "#DFECE3",

  // Calendar cells
  cellCurrent: "#FFFDF7",
  cellDimmed: "#F3EFE3",
  todayFill: "#F7F2E8",

  // Borders
  border: "rgba(0, 0, 0, 0.06)",

  // Text
  textPrimary: "#4A3F35",
  textSecondary: "#8B8278",

  // Accents
  accentMain: "#F2A48A",
  accentSub: "#F6C1CC",
  highlightToday: "#CFE6D6",
  headerBackground: "#BFDCCF",
  /**
   * Floating Action Button の背景色。
   * 既存の accentMain (#F2A48A) と同じ値を使う。
   */
  fabBackground: "#F2A48A",
  optionSelectedBorder: "#8BBBA5",

  // Age badge colors
  ageBadgeChronologicalBg: "#8BBBA5",
  ageBadgeCorrectedBg: "#F2A48A",
  ageBadgeGestationalBg: "#F2A48A",
  ageBadgeMilestoneBg: "#F6C1CC",
  ageBadgeText: "#FFFFFF",

  // Weekdays
  sunday: "#E7A3A3",
  saturday: "#A9C4E4",
  weekday: "#8B8278",
};

export type ColorKeys = keyof typeof COLORS;
