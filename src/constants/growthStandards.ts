import { Gender } from "@/state/AppStateContext";

export type GrowthMeasurementType =
  | "weight"
  | "height"
  | "headCircumference"
  | "chestCircumference";

/** 1行 = 1性別・1項目・1月齢時点の統計値 */
export type GrowthStandardPoint = {
  months: number; // 修正月齢（小数可）
  median: number;
  sd1Upper: number; // +1SD
  sd1Lower: number; // -1SD
  sd2Upper: number; // +2SD
  sd2Lower: number; // -2SD
};

// TODO(#240): 厚生労働省「令和5年乳幼児身体発育調査」の実データに差し替える。
// 現在はプレースホルダー（空配列）。月齢刻みは実データ入手後に確定させる。
// 出典: 厚生労働省 令和5年度乳幼児身体発育調査 報告書
export const GROWTH_STANDARDS: Record<
  Gender,
  Record<GrowthMeasurementType, GrowthStandardPoint[]>
> = {
  male: {
    weight: [],
    height: [],
    headCircumference: [],
    chestCircumference: [],
  },
  female: {
    weight: [],
    height: [],
    headCircumference: [],
    chestCircumference: [],
  },
};
