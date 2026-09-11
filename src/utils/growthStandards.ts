import {
  GROWTH_STANDARDS,
  GrowthMeasurementType,
  GrowthStandardPoint,
} from "@/constants/growthStandards";
import { Gender } from "@/state/AppStateContext";

export type GrowthStandardAtMonth = GrowthStandardPoint & {
  sd25Lower: number; // -2.5SD（正規分布近似）
  sd30Lower: number; // -3.0SD（正規分布近似）
};

/**
 * 指定月齢の基準値を線形補間で取得する。
 * データ点が無い、または月齢がテーブルの範囲外の場合は null を返す。
 */
export const getGrowthStandardAtMonth = (
  gender: Gender,
  type: GrowthMeasurementType,
  months: number
): GrowthStandardAtMonth | null => {
  const points = GROWTH_STANDARDS[gender][type];
  if (points.length === 0) return null;
  if (months < points[0].months || months > points[points.length - 1].months) {
    return null;
  }

  let lower = points[0];
  let upper = points[points.length - 1];
  for (let i = 0; i < points.length - 1; i += 1) {
    if (months >= points[i].months && months <= points[i + 1].months) {
      lower = points[i];
      upper = points[i + 1];
      break;
    }
  }

  const ratio =
    upper.months === lower.months
      ? 0
      : (months - lower.months) / (upper.months - lower.months);
  const lerp = (a: number, b: number) => a + (b - a) * ratio;

  const median = lerp(lower.median, upper.median);
  const sd2Lower = lerp(lower.sd2Lower, upper.sd2Lower);
  const sd = (median - sd2Lower) / 2; // 2SD幅から1SD幅を逆算する正規分布近似

  return {
    months,
    median,
    sd1Upper: lerp(lower.sd1Upper, upper.sd1Upper),
    sd1Lower: lerp(lower.sd1Lower, upper.sd1Lower),
    sd2Upper: lerp(lower.sd2Upper, upper.sd2Upper),
    sd2Lower,
    sd25Lower: median - 2.5 * sd,
    sd30Lower: median - 3.0 * sd,
  };
};
