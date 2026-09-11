import React, { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";

import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";

import { COLORS } from "@/constants/colors";
import {
  GROWTH_STANDARDS,
  GrowthMeasurementType,
} from "@/constants/growthStandards";
import { Gender, GrowthRecord } from "@/state/AppStateContext";
import { getGrowthStandardAtMonth } from "@/utils/growthStandards";
import {
  getGrowthChartPrematurityOffsetMonths,
  gestationalWeeksAtChronologicalMonths,
  toCorrectedDecimalMonthsForGrowth,
} from "@/utils/dateUtils";

type Props = {
  records: GrowthRecord[];
  measurementType: GrowthMeasurementType;
  gender: Gender | null;
  birthDate: string;
  dueDate: string | null;
};

const CHART_HEIGHT = 320;
const PADDING = { top: 12, right: 38, bottom: 40, left: 40 };
const STANDARD_SAMPLE_STEP_MONTHS = 0.5;

const STANDARD_LINE_LABEL: Record<
  | "median"
  | "sd1Upper"
  | "sd1Lower"
  | "sd2Upper"
  | "sd2Lower"
  | "sd25Lower"
  | "sd30Lower",
  string
> = {
  median: "中央値",
  sd1Upper: "+1SD",
  sd1Lower: "-1SD",
  sd2Upper: "+2SD",
  sd2Lower: "-2SD",
  sd25Lower: "-2.5SD",
  sd30Lower: "-3SD",
};

const MEASUREMENT_FIELD: Record<GrowthMeasurementType, keyof GrowthRecord> = {
  weight: "weightKg",
  height: "heightCm",
  headCircumference: "headCircumferenceCm",
  chestCircumference: "chestCircumferenceCm",
};

// Y軸の最低表示範囲。母子健康手帳の0〜1歳の発育曲線に合わせ、
// 記録が少なくても一般的な成長グラフと同じスケール感で見えるようにする
const BASE_Y_RANGE: Record<
  GrowthMeasurementType,
  { min: number; max: number }
> = {
  weight: { min: 0, max: 12 },
  height: { min: 40, max: 90 },
  headCircumference: { min: 30, max: 50 },
  chestCircumference: { min: 30, max: 50 },
};

const STANDARD_LINE_COLOR = "#B8C7BE";
const STANDARD_MEDIAN_COLOR = "#8BBBA5";
const STANDARD_DASHED_COLOR = "#D5B1B1";

// GROWTH_STANDARDSのデータ出典（src/constants/growthStandards.ts のコメント参照）。
// 胸囲のみ他項目と調査年度が異なるため、項目別に出典を切り替えて表示する。
const STANDARD_SOURCE_LABEL: Record<GrowthMeasurementType, string> = {
  weight: "こども家庭庁「令和5年乳幼児身体発育調査」",
  height: "こども家庭庁「令和5年乳幼児身体発育調査」",
  headCircumference: "こども家庭庁「令和5年乳幼児身体発育調査」",
  chestCircumference: "厚生労働省「平成22年乳幼児身体発育調査」",
};

type XY = { x: number; y: number };

const toPolylinePoints = (points: XY[]): string =>
  points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

// 目盛り間隔は値域を4〜6分割程度になる「きりの良い数」に丸める
const niceStep = (range: number): number => {
  if (range <= 0) return 1;
  const rough = range / 5;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const factor =
    normalized < 1.5 ? 1 : normalized < 3.5 ? 2 : normalized < 7.5 ? 5 : 10;
  return factor * magnitude;
};

const GrowthChart: React.FC<Props> = ({
  records,
  measurementType,
  gender,
  birthDate,
  dueDate,
}) => {
  const [width, setWidth] = useState<number>(0);

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const field = MEASUREMENT_FIELD[measurementType];

  // 早産児は実月齢（出生日起点）と修正月齢（出産予定日起点）がずれる。
  // 正期産なら0（両者が一致するため軸を1本化できる）
  const offsetMonths = useMemo(
    () => getGrowthChartPrematurityOffsetMonths({ birthDate, dueDate }),
    [birthDate, dueDate]
  );

  // 実測値の位置は修正月齢（出産予定日前ならマイナス）で決める。
  // 基準曲線も修正月齢基準のため、プロット位置はこの軸のまま揃える
  const dataPoints = useMemo(() => {
    return records
      .map((record) => {
        const value = record[field];
        if (typeof value !== "number") return null;
        const months = toCorrectedDecimalMonthsForGrowth({
          targetDate: record.date,
          birthDate,
          dueDate,
        });
        if (Number.isNaN(months)) return null;
        return { months, value };
      })
      .filter((p): p is { months: number; value: number } => p !== null)
      .sort((a, b) => a.months - b.months);
  }, [birthDate, dueDate, field, records]);

  const standardPoints = gender
    ? GROWTH_STANDARDS[gender][measurementType]
    : [];
  const hasStandard = standardPoints.length > 0;

  // 基準線の月齢範囲と実測値の月齢範囲（マイナス含む）を包含するX軸レンジ
  const xMax = useMemo(() => {
    const standardMax = hasStandard
      ? standardPoints[standardPoints.length - 1].months
      : 0;
    const dataMax = dataPoints.reduce((max, p) => Math.max(max, p.months), 0);
    return Math.max(12, Math.ceil(Math.max(standardMax, dataMax)));
  }, [dataPoints, hasStandard, standardPoints]);

  const xMin = useMemo(() => {
    const dataMin = dataPoints.reduce((min, p) => Math.min(min, p.months), 0);
    return Math.min(-offsetMonths, dataMin);
  }, [dataPoints, offsetMonths]);

  const standardLines = useMemo(() => {
    if (!gender || !hasStandard) return null;
    const first = standardPoints[0].months;
    const last = standardPoints[standardPoints.length - 1].months;
    const keys = [
      "median",
      "sd1Upper",
      "sd1Lower",
      "sd2Upper",
      "sd2Lower",
      "sd25Lower",
      "sd30Lower",
    ] as const;
    const lines: Record<
      (typeof keys)[number],
      { months: number; value: number }[]
    > = {
      median: [],
      sd1Upper: [],
      sd1Lower: [],
      sd2Upper: [],
      sd2Lower: [],
      sd25Lower: [],
      sd30Lower: [],
    };
    for (let m = first; m <= last + 1e-9; m += STANDARD_SAMPLE_STEP_MONTHS) {
      const s = getGrowthStandardAtMonth(
        gender,
        measurementType,
        Math.min(m, last)
      );
      if (!s) continue;
      for (const key of keys) {
        lines[key].push({ months: s.months, value: s[key] });
      }
    }
    return lines;
  }, [gender, hasStandard, measurementType, standardPoints]);

  const { yMin, yMax } = useMemo(() => {
    const values: number[] = dataPoints.map((p) => p.value);
    if (standardLines) {
      values.push(...standardLines.sd30Lower.map((p) => p.value));
      values.push(...standardLines.sd2Upper.map((p) => p.value));
    }
    const base = BASE_Y_RANGE[measurementType];
    if (values.length === 0) return { yMin: base.min, yMax: base.max };
    // 基準範囲に収まらない値がある場合だけ、きりの良い目盛りまで広げる
    const step = niceStep(base.max - base.min);
    return {
      yMin: Math.min(base.min, Math.floor(Math.min(...values) / step) * step),
      yMax: Math.max(base.max, Math.ceil(Math.max(...values) / step) * step),
    };
  }, [dataPoints, measurementType, standardLines]);

  const plotWidth = Math.max(0, width - PADDING.left - PADDING.right);
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const scaleX = (months: number) =>
    PADDING.left + ((months - xMin) / (xMax - xMin || 1)) * plotWidth;
  const scaleY = (value: number) =>
    PADDING.top + (1 - (value - yMin) / (yMax - yMin || 1)) * plotHeight;

  const yStep = niceStep(yMax - yMin);
  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax + 1e-9; v += yStep) yTicks.push(v);

  // X軸の目盛りは実月齢（出生日起点、常に0,1,2...）を主軸にする。
  // 早産児は目盛りごとに副ラベルとして、出産予定日前なら在胎週数（30w）、以降なら修正月齢（修1）を添える
  const chronologicalMax = Math.ceil(xMax + offsetMonths);
  const chronStep = chronologicalMax <= 18 ? 1 : chronologicalMax <= 36 ? 3 : 6;
  const xTicks: {
    chronological: number;
    corrected: number;
    subLabel: string | null;
  }[] = [];
  for (
    let chronological = 0;
    chronological <= chronologicalMax + 1e-9;
    chronological += chronStep
  ) {
    const corrected = chronological - offsetMonths;
    if (corrected < xMin - 1e-9 || corrected > xMax + 1e-9) continue;
    let subLabel: string | null = null;
    if (offsetMonths > 1e-9) {
      if (corrected < -1e-9) {
        const gestational = gestationalWeeksAtChronologicalMonths({
          chronologicalMonths: chronological,
          birthDate,
          dueDate,
        });
        subLabel = gestational ? `${gestational.weeks}w` : null;
      } else {
        subLabel = `修${Math.round(corrected)}`;
      }
    }
    xTicks.push({ chronological, corrected, subLabel });
  }

  const hasAnythingToPlot = dataPoints.length > 0 || standardLines !== null;

  return (
    <View style={styles.container} onLayout={onLayout}>
      {width > 0 ? (
        <Svg width={width} height={CHART_HEIGHT}>
          {yTicks.map((v) => (
            <React.Fragment key={`y-${v}`}>
              <Line
                x1={PADDING.left}
                x2={width - PADDING.right}
                y1={scaleY(v)}
                y2={scaleY(v)}
                stroke={COLORS.border}
                strokeWidth={1}
              />
              <SvgText
                x={PADDING.left - 6}
                y={scaleY(v) + 4}
                fontSize={10}
                fill={COLORS.textSecondary}
                textAnchor="end"
              >
                {Number.isInteger(yStep) ? v.toFixed(0) : v.toFixed(1)}
              </SvgText>
            </React.Fragment>
          ))}
          {xTicks.map((tick) => (
            <React.Fragment key={`x-${tick.chronological}`}>
              <Line
                x1={scaleX(tick.corrected)}
                x2={scaleX(tick.corrected)}
                y1={PADDING.top}
                y2={CHART_HEIGHT - PADDING.bottom}
                stroke={COLORS.border}
                strokeWidth={1}
              />
              <SvgText
                x={scaleX(tick.corrected)}
                y={CHART_HEIGHT - PADDING.bottom + 14}
                fontSize={10}
                fill={COLORS.textSecondary}
                textAnchor="middle"
              >
                {tick.chronological}
              </SvgText>
              {tick.subLabel ? (
                <SvgText
                  x={scaleX(tick.corrected)}
                  y={CHART_HEIGHT - PADDING.bottom + 25}
                  fontSize={8}
                  fill={COLORS.textSecondary}
                  textAnchor="middle"
                >
                  {tick.subLabel}
                </SvgText>
              ) : null}
            </React.Fragment>
          ))}
          <SvgText
            x={width - PADDING.right}
            y={CHART_HEIGHT - 2}
            fontSize={10}
            fill={COLORS.textSecondary}
            textAnchor="end"
          >
            実月齢（ヶ月）
          </SvgText>

          {standardLines ? (
            <>
              {(["sd2Upper", "sd1Upper", "sd1Lower", "sd2Lower"] as const).map(
                (key) => (
                  <Polyline
                    key={key}
                    points={toPolylinePoints(
                      standardLines[key].map((p) => ({
                        x: scaleX(p.months),
                        y: scaleY(p.value),
                      }))
                    )}
                    fill="none"
                    stroke={STANDARD_LINE_COLOR}
                    strokeWidth={1}
                  />
                )
              )}
              <Polyline
                points={toPolylinePoints(
                  standardLines.median.map((p) => ({
                    x: scaleX(p.months),
                    y: scaleY(p.value),
                  }))
                )}
                fill="none"
                stroke={STANDARD_MEDIAN_COLOR}
                strokeWidth={1.5}
              />
              {(["sd25Lower", "sd30Lower"] as const).map((key) => (
                <Polyline
                  key={key}
                  points={toPolylinePoints(
                    standardLines[key].map((p) => ({
                      x: scaleX(p.months),
                      y: scaleY(p.value),
                    }))
                  )}
                  fill="none"
                  stroke={STANDARD_DASHED_COLOR}
                  strokeWidth={1}
                  strokeDasharray="4,3"
                />
              ))}
              {(
                [
                  ["sd2Upper", STANDARD_LINE_COLOR],
                  ["sd1Upper", STANDARD_LINE_COLOR],
                  ["median", STANDARD_MEDIAN_COLOR],
                  ["sd1Lower", STANDARD_LINE_COLOR],
                  ["sd2Lower", STANDARD_LINE_COLOR],
                  ["sd25Lower", STANDARD_DASHED_COLOR],
                  ["sd30Lower", STANDARD_DASHED_COLOR],
                ] as const
              ).map(([key, color]) => {
                const last = standardLines[key][standardLines[key].length - 1];
                if (!last) return null;
                return (
                  <SvgText
                    key={`label-${key}`}
                    x={scaleX(last.months) + 3}
                    y={scaleY(last.value) + 3}
                    fontSize={8}
                    fill={color}
                    textAnchor="start"
                  >
                    {STANDARD_LINE_LABEL[key]}
                  </SvgText>
                );
              })}
            </>
          ) : null}

          {dataPoints.length > 1 ? (
            <Polyline
              points={toPolylinePoints(
                dataPoints.map((p) => ({
                  x: scaleX(p.months),
                  y: scaleY(p.value),
                }))
              )}
              fill="none"
              stroke={COLORS.accentMain}
              strokeWidth={2}
            />
          ) : null}
          {dataPoints.map((p, index) => (
            <Circle
              key={`pt-${index}`}
              cx={scaleX(p.months)}
              cy={scaleY(p.value)}
              r={4}
              fill={COLORS.accentMain}
              stroke={COLORS.surface}
              strokeWidth={1.5}
            />
          ))}
        </Svg>
      ) : null}
      {!hasAnythingToPlot ? (
        <Text style={styles.emptyText}>まだ記録がありません</Text>
      ) : null}
      {gender === null ? (
        <Text style={styles.noteText}>
          プロフィールで性別を設定すると基準線が表示されます
        </Text>
      ) : gender && !hasStandard ? (
        <Text style={styles.noteText}>基準線データは準備中です</Text>
      ) : gender && hasStandard ? (
        <Text style={styles.noteText}>
          出典: {STANDARD_SOURCE_LABEL[measurementType]}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 8,
  },
  emptyText: {
    position: "absolute",
    top: CHART_HEIGHT / 2 - 10,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  noteText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
});

export default GrowthChart;
