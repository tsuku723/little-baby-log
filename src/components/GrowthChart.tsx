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
  toCorrectedDecimalMonthsForGrowth,
  toGestationalWeeksAtDate,
} from "@/utils/dateUtils";

type Props = {
  records: GrowthRecord[];
  measurementType: GrowthMeasurementType;
  gender: Gender | null;
  birthDate: string;
  dueDate: string | null;
};

const CHART_HEIGHT = 260;
const PADDING = { top: 12, right: 12, bottom: 28, left: 40 };
const STANDARD_SAMPLE_STEP_MONTHS = 0.5;

const MEASUREMENT_FIELD: Record<GrowthMeasurementType, keyof GrowthRecord> = {
  weight: "weightKg",
  height: "heightCm",
  headCircumference: "headCircumferenceCm",
  chestCircumference: "chestCircumferenceCm",
};

const STANDARD_LINE_COLOR = "#B8C7BE";
const STANDARD_MEDIAN_COLOR = "#8BBBA5";
const STANDARD_DASHED_COLOR = "#D5B1B1";

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

  // 実測値: 修正月齢が負（出産予定日前）の場合は0ヶ月にクリップし、
  // クリップした点には在胎週数ラベル（例: 30w）を添えて元の時期が分かるようにする
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
        const gestational =
          months < 0
            ? toGestationalWeeksAtDate({
                targetDate: record.date,
                birthDate,
                dueDate,
              })
            : null;
        return {
          months: Math.max(0, months),
          value,
          gestationalLabel: gestational ? `${gestational.weeks}w` : null,
        };
      })
      .filter(
        (
          p
        ): p is {
          months: number;
          value: number;
          gestationalLabel: string | null;
        } => p !== null
      )
      .sort((a, b) => a.months - b.months);
  }, [birthDate, dueDate, field, records]);

  const standardPoints = gender
    ? GROWTH_STANDARDS[gender][measurementType]
    : [];
  const hasStandard = standardPoints.length > 0;

  // 基準線の月齢範囲と実測値の月齢範囲を包含するX軸レンジ
  const xMax = useMemo(() => {
    const standardMax = hasStandard
      ? standardPoints[standardPoints.length - 1].months
      : 0;
    const dataMax = dataPoints.reduce((max, p) => Math.max(max, p.months), 0);
    return Math.max(12, Math.ceil(Math.max(standardMax, dataMax)));
  }, [dataPoints, hasStandard, standardPoints]);

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
    if (values.length === 0) return { yMin: 0, yMax: 10 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || Math.abs(max) || 1;
    const step = niceStep(range);
    return {
      yMin: Math.floor((min - range * 0.1) / step) * step,
      yMax: Math.ceil((max + range * 0.1) / step) * step,
    };
  }, [dataPoints, standardLines]);

  const plotWidth = Math.max(0, width - PADDING.left - PADDING.right);
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const scaleX = (months: number) => PADDING.left + (months / xMax) * plotWidth;
  const scaleY = (value: number) =>
    PADDING.top + (1 - (value - yMin) / (yMax - yMin || 1)) * plotHeight;

  const yStep = niceStep(yMax - yMin);
  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax + 1e-9; v += yStep) yTicks.push(v);

  const xStep = xMax <= 12 ? 1 : xMax <= 36 ? 3 : 6;
  const xTicks: number[] = [];
  for (let m = 0; m <= xMax; m += xStep) xTicks.push(m);

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
          {xTicks.map((m) => (
            <React.Fragment key={`x-${m}`}>
              <Line
                x1={scaleX(m)}
                x2={scaleX(m)}
                y1={PADDING.top}
                y2={CHART_HEIGHT - PADDING.bottom}
                stroke={COLORS.border}
                strokeWidth={1}
              />
              <SvgText
                x={scaleX(m)}
                y={CHART_HEIGHT - PADDING.bottom + 14}
                fontSize={10}
                fill={COLORS.textSecondary}
                textAnchor="middle"
              >
                {m}
              </SvgText>
            </React.Fragment>
          ))}
          <SvgText
            x={width - PADDING.right}
            y={CHART_HEIGHT - 2}
            fontSize={10}
            fill={COLORS.textSecondary}
            textAnchor="end"
          >
            修正月齢（ヶ月）
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
          {dataPoints.map((p, index) =>
            p.gestationalLabel ? (
              <SvgText
                key={`pt-label-${index}`}
                x={scaleX(p.months) + 4}
                y={scaleY(p.value) - 6}
                fontSize={9}
                fill={COLORS.textSecondary}
                textAnchor="start"
              >
                {p.gestationalLabel}
              </SvgText>
            ) : null
          )}
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
