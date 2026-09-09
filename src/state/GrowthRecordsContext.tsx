import "react-native-get-random-values";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { v4 as uuid } from "uuid";

import {
  GrowthRecord,
  useActiveUser,
  useAppState,
} from "@/state/AppStateContext";
import {
  isIsoDateString,
  normalizeToUtcDate,
  toIsoDateString,
} from "@/utils/dateUtils";

// GrowthRecordsContext は AppStateContext の activeUserId を唯一の正とする。
// プロフィールごとに成長記録を分離するため、AppStateContext 経由でのみ読書きする。

export type SaveGrowthRecordPayload = {
  id?: string;
  date: string;
  weightKg?: number;
  heightCm?: number;
  headCircumferenceCm?: number;
  chestCircumferenceCm?: number;
};

interface GrowthRecordsState {
  loading: boolean;
  records: GrowthRecord[]; // 日付昇順
  upsert: (payload: SaveGrowthRecordPayload) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const GrowthRecordsContext = createContext<GrowthRecordsState | undefined>(
  undefined
);

export const GrowthRecordsProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { state, addGrowthRecord, updateGrowthRecord, deleteGrowthRecord } =
    useAppState();
  const user = useActiveUser();
  const [loading, setLoading] = useState<boolean>(false);

  const activeGrowthRecords = useMemo(() => {
    if (!state.activeUserId) return [];
    return state.growthRecords[state.activeUserId] ?? [];
  }, [state.activeUserId, state.growthRecords]);

  const records = useMemo(
    () => [...activeGrowthRecords].sort((a, b) => a.date.localeCompare(b.date)),
    [activeGrowthRecords]
  );

  const upsert = useCallback(
    async (payload: SaveGrowthRecordPayload) => {
      if (!user || !state.activeUserId) {
        console.warn("upsert skipped: active user not set");
        return;
      }
      if (!isIsoDateString(payload.date)) {
        console.error(`Invalid date format in upsert: ${payload.date}`);
        return;
      }
      const normalizedDate = toIsoDateString(normalizeToUtcDate(payload.date));
      const now = new Date().toISOString();
      const recordId = payload.id ?? uuid();
      const existing = activeGrowthRecords.find((item) => item.id === recordId);

      const record: GrowthRecord = {
        id: recordId,
        date: normalizedDate,
        weightKg: payload.weightKg,
        heightCm: payload.heightCm,
        headCircumferenceCm: payload.headCircumferenceCm,
        chestCircumferenceCm: payload.chestCircumferenceCm,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      setLoading(true);
      try {
        if (existing) {
          await updateGrowthRecord(state.activeUserId, recordId, record);
        } else {
          await addGrowthRecord(state.activeUserId, record);
        }
      } catch (err) {
        console.error("upsert failed:", err);
      } finally {
        setLoading(false);
      }
    },
    [
      activeGrowthRecords,
      addGrowthRecord,
      state.activeUserId,
      updateGrowthRecord,
      user,
    ]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!state.activeUserId) {
        console.warn("remove skipped: active user not set");
        return;
      }
      setLoading(true);
      try {
        await deleteGrowthRecord(state.activeUserId, id);
      } catch (err) {
        console.error("remove failed:", err);
      } finally {
        setLoading(false);
      }
    },
    [deleteGrowthRecord, state.activeUserId]
  );

  const value = useMemo(
    () => ({ loading, records, upsert, remove }),
    [loading, records, upsert, remove]
  );

  return (
    <GrowthRecordsContext.Provider value={value}>
      {children}
    </GrowthRecordsContext.Provider>
  );
};

export const useGrowthRecords = (): GrowthRecordsState => {
  const ctx = useContext(GrowthRecordsContext);
  if (!ctx) {
    throw new Error(
      "useGrowthRecords must be used within GrowthRecordsProvider"
    );
  }
  return ctx;
};
