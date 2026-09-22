import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
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
import GrowthChart, { MEASUREMENT_FIELD } from "@/components/GrowthChart";
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
import {
  toDecimalMonths,
  toIsoDateString,
  toUtcDateOnly,
} from "@/utils/dateUtils";

type Props = NativeStackScreenProps<GrowthStackParamList, "GrowthTop">;
type RootNavigation = NavigationProp<RootStackParamList & TabParamList>;

type NumericGrowthField = (typeof MEASUREMENT_FIELD)[GrowthMeasurementType];

const MEASUREMENT_TABS: {
  key: GrowthMeasurementType;
  label: string;
  field: NumericGrowthField;
  unit: string;
}[] = [
  { key: "weight", label: "体重", field: MEASUREMENT_FIELD.weight, unit: "kg" },
  { key: "height", label: "身長", field: MEASUREMENT_FIELD.height, unit: "cm" },
  {
    key: "headCircumference",
    label: "頭囲",
    field: MEASUREMENT_FIELD.headCircumference,
    unit: "cm",
  },
  {
    key: "chestCircumference",
    label: "胸囲",
    field: MEASUREMENT_FIELD.chestCircumference,
    unit: "cm",
  },
];

const ALL_NUMERIC_FIELDS: NumericGrowthField[] = [
  "weightKg",
  "heightCm",
  "headCircumferenceCm",
  "chestCircumferenceCm",
];

type RangeKey = "y1" | "y2" | "y3" | "y6" | "all";

// 実月齢（出生日起点）で区切る境界。基準線データの終端とは厳密には一致しないが許容する
const RANGE_TABS: { key: RangeKey; label: string; maxMonths: number | null }[] =
  [
    { key: "y1", label: "〜1歳", maxMonths: 12 },
    { key: "y2", label: "〜2歳", maxMonths: 24 },
    { key: "y3", label: "〜3歳", maxMonths: 36 },
    { key: "y6", label: "〜6歳", maxMonths: 72 },
    { key: "all", label: "すべて", maxMonths: null },
  ];

// 対象の子どもの現在の実月齢に応じた範囲タブを自動選択する。該当なし（6歳以上等）は「すべて」
export const getDefaultRangeKey = (chronologicalMonths: number): RangeKey => {
  const matched = RANGE_TABS.find(
    (tab) => tab.maxMonths !== null && chronologicalMonths <= tab.maxMonths
  );
  return matched ? matched.key : "all";
};

const dateLabel = (iso: string): string => iso.replace(/-/g, "/");

const GrowthScreen: React.FC<Props> = () => {
  const rootNavigation = useNavigation<RootNavigation>();
  const user = useActiveUser();
  const { loading, records, upsert, remove } = useGrowthRecords();
  const [measurementType, setMeasurementType] =
    useState<GrowthMeasurementType>("weight");
  const [rangeKey, setRangeKey] = useState<RangeKey>("all");
  const todayIso = useMemo(
    () => toIsoDateString(toUtcDateOnly(new Date())),
    []
  );

  // 対象の子どもを切り替えたら範囲タブの選択を自動選択にリセットする。
  // 項目タブ（体重/身長/…）の切り替えでは維持したいため、依存は user.id のみにする
  useEffect(() => {
    if (!user) return;
    const chronologicalMonths = toDecimalMonths(user.birthDate, todayIso);
    setRangeKey(getDefaultRangeKey(chronologicalMonths));
  }, [user?.id]);

  const activeTab = useMemo(
    () => MEASUREMENT_TABS.find((tab) => tab.key === measurementType)!,
    [measurementType]
  );

  const activeRangeTab = useMemo(
    () => RANGE_TABS.find((tab) => tab.key === rangeKey)!,
    [rangeKey]
  );

  // 一覧は新しい記録が上に来るよう日付降順（同日は作成日時降順）
  // 選択中タブの項目が入力されている記録のみを対象にする
  const listItems = useMemo(
    () =>
      [...records]
        .filter((record) => typeof record[activeTab.field] === "number")
        .sort((a, b) => {
          if (a.date === b.date) {
            return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
          }
          return b.date.localeCompare(a.date);
        }),
    [records, activeTab]
  );

  const handleDeleteField = (record: GrowthRecord) => {
    const remainingFields = ALL_NUMERIC_FIELDS.filter(
      (field) => field !== activeTab.field && typeof record[field] === "number"
    );
    const deleteRecord = async () => {
      try {
        if (remainingFields.length === 0) {
          await remove(record.id);
          return;
        }
        await upsert({
          id: record.id,
          date: record.date,
          weightKg:
            activeTab.field === "weightKg" ? undefined : record.weightKg,
          heightCm:
            activeTab.field === "heightCm" ? undefined : record.heightCm,
          headCircumferenceCm:
            activeTab.field === "headCircumferenceCm"
              ? undefined
              : record.headCircumferenceCm,
          chestCircumferenceCm:
            activeTab.field === "chestCircumferenceCm"
              ? undefined
              : record.chestCircumferenceCm,
        });
      } catch (error) {
        console.error("Failed to delete growth record field", error);
        if (Platform.OS === "web") {
          window.alert("削除に失敗しました。時間をおいて再度お試しください。");
        } else {
          Alert.alert("削除に失敗しました", "時間をおいて再度お試しください。");
        }
      }
    };

    if (Platform.OS === "web") {
      const ok = window.confirm(
        `${activeTab.label}の記録を削除します。よろしいですか？`
      );
      if (!ok) return;
      deleteRecord();
      return;
    }

    Alert.alert(
      "削除しますか？",
      `${activeTab.label}の記録を削除します。よろしいですか？`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: deleteRecord,
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: GrowthRecord }) => {
    const value = item[activeTab.field];
    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardMain}
          onPress={() =>
            rootNavigation.navigate("GrowthRecordInput", {
              recordId: item.id,
            })
          }
          accessibilityRole="button"
        >
          <Text style={styles.cardDate}>{dateLabel(item.date)}</Text>
          <Text style={styles.cardValues}>
            {activeTab.label}{" "}
            {typeof value === "number" ? value.toFixed(1) : ""}
            {activeTab.unit}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteField(item)}
          accessibilityRole="button"
          accessibilityLabel={`${activeTab.label}の記録を削除`}
        >
          <Text style={styles.deleteButtonText}>削除</Text>
        </TouchableOpacity>
      </View>
    );
  };

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
            <View style={styles.rangeTabRow}>
              {RANGE_TABS.map((tab) => {
                const selected = tab.key === rangeKey;
                return (
                  <Pressable
                    key={tab.key}
                    style={[
                      styles.rangeTabButton,
                      selected && styles.rangeTabButtonSelected,
                    ]}
                    onPress={() => setRangeKey(tab.key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text
                      style={[
                        styles.rangeTabLabel,
                        selected && styles.rangeTabLabelSelected,
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
                rangeMaxMonths={activeRangeTab.maxMonths}
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
            {loading ? "読み込み中..." : `${activeTab.label}の記録がありません`}
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
    paddingVertical: 5,
    borderRadius: 8,
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
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  tabLabelSelected: {
    color: COLORS.textPrimary,
    fontWeight: "700",
  },
  rangeTabRow: {
    flexDirection: "row",
    gap: 6,
  },
  rangeTabButton: {
    flex: 1,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: "center",
  },
  rangeTabButtonSelected: {
    borderColor: COLORS.optionSelectedBorder,
    backgroundColor: COLORS.filterBackground,
  },
  rangeTabLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  rangeTabLabelSelected: {
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    gap: 4,
  },
  cardMain: {
    flex: 1,
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
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deleteButtonText: {
    fontSize: 13,
    color: COLORS.sunday,
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
