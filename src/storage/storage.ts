import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  Achievement,
  AchievementStore,
  UserSettings,
} from "../models/dataModels";
import { normalizeToUtcDate, toIsoDateString } from "../utils/dateUtils";

export const STORAGE_KEYS = {
  userSettings: "little_baby_calendar_user_settings",
  achievementStore: "little_baby_calendar_achievements",
};

// 設定は画面表示に関するもののみを保持する。出生情報はプロフィールで管理する。
const DEFAULT_SETTINGS: UserSettings = {
  showCorrectedUntilMonths: 24,
  ageFormat: "ymd",
  showDaysSinceBirth: true,
  lastViewedMonth: null,
  notifyMilestoneEnabled: false,
};

const DEFAULT_ACHIEVEMENTS: AchievementStore = {};

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn("Failed to parse stored JSON", error);
    return fallback;
  }
};

const saveJson = async (key: string, value: unknown): Promise<void> => {
  try {
    const serialized = JSON.stringify(value);
    await AsyncStorage.setItem(key, serialized);
  } catch (error) {
    console.warn(`Failed to save key=${key}`, error);
    throw error;
  }
};

const saveAchievements = async (store: AchievementStore): Promise<void> => {
  await saveJson(STORAGE_KEYS.achievementStore, store);
};

const normalizeDateKey = (isoString: string): string =>
  toIsoDateString(normalizeToUtcDate(isoString));

const normalizeDateKeySafe = (isoString: string): string | null => {
  try {
    return normalizeDateKey(isoString);
  } catch (error) {
    console.warn("normalizeDateKey failed; skipping value", isoString, error);
    return null;
  }
};

const ensureTimestamps = (record: Achievement, now: string): Achievement => {
  const created = record.createdAt ?? now;
  const updated = record.updatedAt ?? now;
  return { ...record, createdAt: created, updatedAt: updated };
};

const isMapFormat = (input: unknown): input is AchievementStore => {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  return Object.entries(input as Record<string, unknown>).every(
    ([_, value]) => {
      if (!Array.isArray(value)) return false;
      return value.every((item) => {
        const rec = item as Achievement;
        return (
          typeof rec === "object" && !!rec?.date && typeof rec.date === "string"
        );
      });
    }
  );
};

const migrateToMap = async (input: unknown): Promise<AchievementStore> => {
  const now = new Date().toISOString();
  const nextStore: AchievementStore = {};

  const addList = (dateKey: string, list: Achievement[]) => {
    const normalizedKey = normalizeDateKeySafe(dateKey);
    if (!normalizedKey) return;
    const safeList = list
      .filter((item) => Boolean(item?.date))
      .map((rec) => ensureTimestamps(rec, now));
    if (safeList.length > 0) {
      nextStore[normalizedKey] = safeList;
    }
  };

  if (isMapFormat(input)) {
    Object.entries(input).forEach(([dateKey, list]) => {
      addList(dateKey, list as Achievement[]);
    });
  } else if (
    input &&
    typeof input === "object" &&
    !Array.isArray(input) &&
    Array.isArray((input as any).achievements)
  ) {
    const list = (input as any).achievements as Achievement[];
    list.forEach((item) => {
      if (!item?.date) return;
      addList(item.date, [item]);
    });
  } else if (Array.isArray(input)) {
    (input as Achievement[]).forEach((item) => {
      if (!item?.date) return;
      addList(item.date, [item]);
    });
  }

  await saveAchievements(nextStore);
  return nextStore;
};

// レガシー互換: 過去バージョンでは birthDate / dueDate を設定に保存していた。
// ここでは UserSettings に含めず、あくまで表示設定のみ返却する。
export const loadUserSettings = async (): Promise<
  UserSettings & { birthDate?: string; dueDate?: string | null }
> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.userSettings);
  const parsed = safeParse<
    UserSettings & { birthDate?: string; dueDate?: string | null }
  >(raw, DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...parsed };
};

export const loadAchievements = async (): Promise<AchievementStore> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.achievementStore);
  const parsed = safeParse<unknown>(raw, DEFAULT_ACHIEVEMENTS);
  return migrateToMap(parsed);
};
