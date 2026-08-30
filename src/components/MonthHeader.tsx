import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS } from "@/constants/colors";

interface Props {
  monthLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onPressMonthLabel: () => void;
}

const MonthHeader: React.FC<Props> = ({
  monthLabel,
  onPrev,
  onNext,
  onToday,
  onPressMonthLabel,
}) => (
  <View style={styles.container}>
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPrev}
      style={styles.navButton}
    >
      <Ionicons name="chevron-back" size={22} color={COLORS.accentMain} />
    </TouchableOpacity>
    <View style={styles.center}>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={onPressMonthLabel}
        style={styles.monthButton}
      >
        <Text style={styles.month}>{monthLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" onPress={onToday}>
        <Text style={styles.today}>今日へ</Text>
      </TouchableOpacity>
    </View>
    <View style={styles.rightActions}>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={onNext}
        style={styles.navButton}
      >
        <Ionicons name="chevron-forward" size={22} color={COLORS.accentMain} />
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  center: {
    alignItems: "center",
    gap: 2,
  },
  monthButton: {
    alignItems: "center",
  },
  month: {
    fontSize: 20,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  today: {
    fontSize: 14,
    color: COLORS.accentMain,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});

export default MonthHeader;
