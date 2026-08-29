import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "@/constants/colors";
import DayCell from "@/components/DayCell";
import { CalendarDay, AgeFormat } from "@/models/dataModels";
import { buildWeekAgeSegments } from "@/utils/weekAgeSegments";

interface Props {
  days: CalendarDay[];
  onPressDay: (iso: string) => void;
  ageFormat: AgeFormat;
  birthDate: string | null;
}

const segmentColor = (totalMonths: number | null): string => {
  if (totalMonths == null) return "transparent";
  return totalMonths % 2 === 0
    ? COLORS.ageBadgeChronologicalBg
    : COLORS.accentSub;
};

const CalendarGrid: React.FC<Props> = ({
  days,
  onPressDay,
  ageFormat,
  birthDate,
}) => {
  const rows = useMemo(() => {
    const chunks: CalendarDay[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      chunks.push(days.slice(i, i + 7));
    }
    return chunks;
  }, [days]);

  return (
    <View style={[styles.container, { flex: 1 }]}>
      {rows.map((row, rowIndex) => {
        const segments = buildWeekAgeSegments(row, ageFormat, birthDate);
        return (
          <View key={rowIndex}>
            {segments ? (
              <View
                style={[
                  styles.weekAgeBar,
                  rowIndex > 0 && styles.weekAgeBarSpacing,
                ]}
              >
                {segments.map((segment, segmentIndex) => (
                  <View
                    key={segmentIndex}
                    style={[
                      styles.weekAgeSegment,
                      {
                        flex: segment.dayCount,
                        backgroundColor: segmentColor(segment.totalMonths),
                      },
                    ]}
                  >
                    {segment.label ? (
                      <Text style={styles.weekAgeBarText}>{segment.label}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}
            <View style={styles.row}>
              {row.map((day, colIndex) => (
                <DayCell
                  key={day.date}
                  day={day}
                  onPress={onPressDay}
                  gridPos={{
                    rowIndex,
                    colIndex,
                    isLastRow: rowIndex === rows.length - 1,
                    isLastCol: colIndex === 6,
                  }}
                />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 0,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  row: {
    flexDirection: "row",
  },
  weekAgeBar: {
    flexDirection: "row",
    height: 18,
    overflow: "hidden",
  },
  weekAgeBarSpacing: {
    marginTop: 4,
  },
  weekAgeSegment: {
    alignItems: "center",
    justifyContent: "center",
  },
  weekAgeBarText: {
    color: COLORS.ageBadgeText,
    fontSize: 12,
    fontWeight: "700",
  },
});

export default CalendarGrid;
