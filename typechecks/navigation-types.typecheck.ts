import type { RootStackParamList } from "../src/navigation/types";

// RootStackParamList の型契約を compile-time で固定するための typecheck 専用サンプル。
const rootStackSample: RootStackParamList = {
  MainTabs: undefined,
  RecordInput: { recordId: "r1", isoDate: "2025-01-01", from: "today" },
  RecordDetail: { recordId: "r2", from: "list" },
  GrowthRecordInput: { recordId: "g1", isoDate: "2025-01-01" },
};

void rootStackSample;
