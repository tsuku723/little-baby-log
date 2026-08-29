export {
  AgeFormat,
  Achievement,
  AchievementStore,
  AgeInfo,
  CalendarDay,
  CalendarMonthView,
  AchievementListItem,
  UserSettings,
} from "../models/dataModels";

export const DEFAULT_SETTINGS: import("../models/dataModels").UserSettings = {
  showCorrectedUntilMonths: 24,
  ageFormat: "ymd",
  showDaysSinceBirth: true,
  lastViewedMonth: null,
  notifyMilestoneEnabled: false,
};
