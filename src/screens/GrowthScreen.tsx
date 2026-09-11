import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { NavigationProp, useNavigation } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import AppText from "@/components/AppText";
import GrowthChart from "@/components/GrowthChart";
import UserAvatar from "@/components/UserAvatar";
import { COLORS } from "@/constants/colors";
import { GrowthMeasurementType } from "@/constants/growthStandards";
import {
  GrowthStackParamList,
  RootStackParamList,
  TabParamList,
} from "@/navigation";
import { GrowthRecord, useActiveUser } from "@/state/AppStateContext";
import { useGrowthRecords } from "@/state/GrowthRecordsContext";
import { toIsoDateString, toUtcDateOnly } from "@/utils/dateUtils";

type Props = NativeStackScreenProps<GrowthStackParamList, "GrowthTop">;
type RootNavigation = NavigationProp<RootStackParamList & TabParamList>;

const MEASUREMENT_TABS: { key: GrowthMeasurementType; label: string }[] = [
  { key: "weight", label: "体重" },
  { key: "height", label: "身長" },
  { key: "headCircumference", label: "頭囲" },
  { key: "chestCircumference", label: "胸囲" },
];

const dateLabel = (iso: string): string => iso.replace(/-/g, "/");

const formatValues = (record: GrowthRecord): string => {
  const parts: string[] = [];
  if (typeof record.weightKg === "number") {
    parts.push(`体重 ${record.weightKg.toFixed(1)}kg`);
  }
  if (typeof record.heightCm === "number") {
    parts.push(`身長 ${record.heightCm.toFixed(1)}cm`);
  }
  if (typeof record.headCircumferenceCm === "number") {
    parts.push(`頭囲 ${record.headCircumferenceCm.toFixed(1)}cm`);
  }
  if (typeof record.chestCircumferenceCm === "number") {
    parts.push(`胸囲 ${record.chestCircumferenceCm.toFixed(1)}cm`);
  }
  return parts.join(" / ");
};

const GrowthScreen: React.FC<Props> = () => {
  const rootNavigation = useNavigation<RootNavigation>();
  const user = useActiveUser();
  const { loading, records } = useGrowthRecords();
  const [measurementType, setMeasurementType] =
    useState<GrowthMeasurementType>("weight");
  const todayIso = useMemo(
    () => toIsoDateString(toUtcDateOnly(new Date())),
    []
  );

  // 一覧は新しい記録が上に来るよう日付降順（同日は作成日時降順）
  const listItems = useMemo(
    () =>
      [...records].sort((a, b) => {
        if (a.date === b.date) {
          return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
        }
        return b.date.localeCompare(a.date);
      }),
    [records]
  );

  const renderItem = ({ item }: { item: GrowthRecord }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        rootNavigation.navigate("GrowthRecordInput", { recordId: item.id })
      }
      accessibilityRole="button"
    >
      <Text style={styles.cardDate}>{dateLabel(item.date)}</Text>
      <Text style={styles.cardValues}>{formatValues(item)}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        {user ? (
          <UserAvatar
            name={user.name}
            profilePhotoPath={user.profilePhotoPath}
            size={48}
          />
        ) : null}
        <AppText style={styles.headerName} weight="medium">
          {user?.name ?? "プロフィール未設定"}
        </AppText>
      </View>
      <FlatList
        data={listItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.chartArea}>
            <View style={styles.tabRow}>
              {MEASUREMENT_TABS.map((tab) => {
                const selected = tab.key === measurementType;
                return (
                  <Pressable
                    key={tab.key}
                    style={[
                      styles.tabButton,
                      selected && styles.tabButtonSelected,
                    ]}
                    onPress={() => setMeasurementType(tab.key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text
                      style={[
                        styles.tabLabel,
                        selected && styles.tabLabelSelected,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {user ? (
              <GrowthChart
                records={records}
                measurementType={measurementType}
                gender={user.gender}
                birthDate={user.birthDate}
                dueDate={user.dueDate}
              />
            ) : (
              <Text style={styles.empty}>
                グラフはプロフィール設定後に表示されます
              </Text>
            )}
            <Text style={styles.listTitle}>記録一覧</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loading ? "読み込み中..." : "まだ記録がありません"}
          </Text>
        }
      />
      <TouchableOpacity
        style={styles.fab}
        accessibilityRole="button"
        onPress={() =>
          rootNavigation.navigate("GrowthRecordInput", { isoDate: todayIso })
        }
      >
        <Text style={styles.fabText}>＋記録</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.headerBackground,
    gap: 12,
  },
  headerName: {
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120,
    gap: 10,
  },
  chartArea: {
    gap: 12,
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: "center",
  },
  tabButtonSelected: {
    borderColor: COLORS.optionSelectedBorder,
    backgroundColor: COLORS.filterBackground,
  },
  tabLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  tabLabelSelected: {
    color: COLORS.textPrimary,
    fontWeight: "700",
  },
  listTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textSecondary,
    paddingTop: 8,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    gap: 4,
  },
  cardDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  cardValues: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  empty: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 24,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    backgroundColor: COLORS.fabBackground,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 32,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: "700",
  },
});

export default GrowthScreen;
