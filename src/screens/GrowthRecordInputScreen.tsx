import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { RootStackParamList } from "@/navigation";
import AppText from "@/components/AppText";
import DatePickerModal from "@/components/DatePickerModal";
import { useActiveUser } from "@/state/AppStateContext";
import {
  SaveGrowthRecordPayload,
  useGrowthRecords,
} from "@/state/GrowthRecordsContext";
import { useDateViewContext } from "@/state/DateViewContext";
import {
  safeParseIsoLocal,
  toIsoDateString,
  toUtcDateOnly,
} from "@/utils/dateUtils";
import { COLORS } from "@/constants/colors";

type Props = NativeStackScreenProps<RootStackParamList, "GrowthRecordInput">;

type WeightUnit = "kg" | "g";

const MIN_DATE = new Date(1900, 0, 1);
const MAX_DATE = new Date(2100, 11, 31);

// 小数第n位までに丸めた数値を返す。空文字は undefined、数値として不正（"3.5.0" や 0以下）なら null。
const parseDecimal = (
  text: string,
  fractionDigits: number
): number | undefined | null => {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) return null;
  const factor = 10 ** fractionDigits;
  return Math.round(value * factor) / factor;
};

const GrowthRecordInputScreen: React.FC<Props> = ({ navigation, route }) => {
  const user = useActiveUser();
  const { records, upsert, remove } = useGrowthRecords();
  const { selectedDate } = useDateViewContext();

  const recordId = route.params?.recordId;
  const preferredDate = route.params?.isoDate;

  const editingRecord = useMemo(() => {
    if (!recordId) return null;
    return records.find((item) => item.id === recordId) ?? null;
  }, [recordId, records]);

  const selectedDateIso = useMemo(
    () => toIsoDateString(selectedDate),
    [selectedDate]
  );

  const [recordDate, setRecordDate] = useState<Date>(() =>
    safeParseIsoLocal(preferredDate ?? selectedDateIso, selectedDate)
  );
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [weightText, setWeightText] = useState<string>("");
  const [heightText, setHeightText] = useState<string>("");
  const [headText, setHeadText] = useState<string>("");
  const [chestText, setChestText] = useState<string>("");

  useEffect(() => {
    if (editingRecord) {
      setRecordDate(safeParseIsoLocal(editingRecord.date, selectedDate));
      setWeightUnit("kg");
      setWeightText(
        editingRecord.weightKg != null ? String(editingRecord.weightKg) : ""
      );
      setHeightText(
        editingRecord.heightCm != null ? String(editingRecord.heightCm) : ""
      );
      setHeadText(
        editingRecord.headCircumferenceCm != null
          ? String(editingRecord.headCircumferenceCm)
          : ""
      );
      setChestText(
        editingRecord.chestCircumferenceCm != null
          ? String(editingRecord.chestCircumferenceCm)
          : ""
      );
    } else if (preferredDate) {
      setRecordDate(safeParseIsoLocal(preferredDate, selectedDate));
    }
  }, [editingRecord, preferredDate, selectedDate]);

  const openDatePicker = () => setShowDatePicker(true);
  const closeDatePicker = () => setShowDatePicker(false);
  const handleDateConfirm = (nextDate: Date) => {
    setRecordDate(nextDate);
    closeDatePicker();
  };
  const setDateToToday = () => setRecordDate(toUtcDateOnly(new Date()));

  const handleSave = async () => {
    if (!user) {
      Alert.alert(
        "プロフィール未設定",
        "プロフィールを作成してから記録してください。"
      );
      return;
    }
    if (Number.isNaN(recordDate.getTime())) {
      Alert.alert("日付を確認してください", "有効な日付を選択してください。");
      return;
    }

    const rawWeight = parseDecimal(weightText, weightUnit === "kg" ? 3 : 0);
    const heightCm = parseDecimal(heightText, 1);
    const headCircumferenceCm = parseDecimal(headText, 1);
    const chestCircumferenceCm = parseDecimal(chestText, 1);

    const invalidLabels = [
      rawWeight === null ? "体重" : null,
      heightCm === null ? "身長" : null,
      headCircumferenceCm === null ? "頭囲" : null,
      chestCircumferenceCm === null ? "胸囲" : null,
    ].filter((label): label is string => label !== null);
    if (invalidLabels.length > 0) {
      Alert.alert(
        "入力値を確認してください",
        `${invalidLabels.join("・")}に正しい数値（0より大きい値）を入力してください。`
      );
      return;
    }

    const weightKg =
      rawWeight == null
        ? undefined
        : weightUnit === "kg"
          ? rawWeight
          : Math.round((rawWeight / 1000) * 1000) / 1000;

    if (
      weightKg == null &&
      heightCm == null &&
      headCircumferenceCm == null &&
      chestCircumferenceCm == null
    ) {
      Alert.alert(
        "記録項目を入力してください",
        "体重・身長・頭囲・胸囲のうち、最低1つを入力してください。"
      );
      return;
    }

    const payload: SaveGrowthRecordPayload = {
      id: editingRecord?.id,
      date: toIsoDateString(recordDate),
      weightKg,
      heightCm: heightCm ?? undefined,
      headCircumferenceCm: headCircumferenceCm ?? undefined,
      chestCircumferenceCm: chestCircumferenceCm ?? undefined,
    };

    try {
      await upsert(payload);
      navigation.goBack();
    } catch (error) {
      console.error("Failed to save growth record", error);
      Alert.alert("保存に失敗しました", "時間をおいて再度お試しください。");
    }
  };

  const confirmDelete = () => {
    if (!editingRecord) return;

    if (Platform.OS === "web") {
      const ok = window.confirm("この記録を削除します。よろしいですか？");
      if (!ok) return;
      navigation.goBack();
      remove(editingRecord.id).catch((error) => {
        console.error("Failed to delete growth record", error);
        window.alert("削除に失敗しました。時間をおいて再度お試しください。");
      });
      return;
    }

    Alert.alert("削除しますか？", "この記録を削除します。よろしいですか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          navigation.goBack();
          try {
            await remove(editingRecord.id);
          } catch (error) {
            console.error("Failed to delete growth record", error);
            Alert.alert(
              "削除に失敗しました",
              "時間をおいて再度お試しください。"
            );
          }
        },
      },
    ]);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <Text style={styles.title}>プロフィールを作成してください</Text>
          <Text style={styles.note}>
            最初にプロフィール設定から始めましょう
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          style={styles.headerLeft}
        >
          <AppText weight="medium" style={styles.headerCancel}>
            キャンセル
          </AppText>
        </TouchableOpacity>
        <AppText weight="medium" style={styles.headerTitle}>
          成長記録を入力
        </AppText>
        <View style={styles.headerRight} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.field}>
          <TouchableOpacity
            style={styles.dateRow}
            onPress={openDatePicker}
            accessibilityRole="button"
            accessibilityLabel="日付を選択"
          >
            <Text style={styles.dateRowLabel}>日付</Text>
            <Text style={styles.dateRowValue}>
              {toIsoDateString(recordDate)} ▼
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.todayButton}
            onPress={setDateToToday}
            accessibilityRole="button"
          >
            <Text style={styles.todayButtonText}>今日へ</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>体重</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputFlex]}
              value={weightText}
              onChangeText={setWeightText}
              placeholder={weightUnit === "kg" ? "例: 3.500" : "例: 3500"}
              keyboardType="decimal-pad"
              accessibilityLabel="体重"
            />
            <View style={styles.optionRow}>
              {(
                [
                  { label: "kg", value: "kg" as WeightUnit },
                  { label: "g", value: "g" as WeightUnit },
                ] as const
              ).map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.optionButton,
                    weightUnit === option.value && styles.optionButtonSelected,
                  ]}
                  onPress={() => setWeightUnit(option.value)}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      weightUnit === option.value &&
                        styles.optionButtonTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>身長 (cm)</Text>
          <TextInput
            style={styles.input}
            value={heightText}
            onChangeText={setHeightText}
            placeholder="例: 50.0"
            keyboardType="decimal-pad"
            accessibilityLabel="身長"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>頭囲 (cm)</Text>
          <TextInput
            style={styles.input}
            value={headText}
            onChangeText={setHeadText}
            placeholder="例: 33.0"
            keyboardType="decimal-pad"
            accessibilityLabel="頭囲"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>胸囲 (cm)</Text>
          <TextInput
            style={styles.input}
            value={chestText}
            onChangeText={setChestText}
            placeholder="例: 32.0"
            keyboardType="decimal-pad"
            accessibilityLabel="胸囲"
          />
        </View>
      </ScrollView>
      <View style={styles.fixedActions}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.fixedActionButton,
            styles.saveButton,
          ]}
          onPress={handleSave}
          accessibilityRole="button"
        >
          <Text style={styles.actionButtonText}>保存</Text>
        </TouchableOpacity>
        {editingRecord ? (
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.fixedActionButton,
              styles.deleteButton,
            ]}
            onPress={confirmDelete}
            accessibilityRole="button"
          >
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
              この記録を削除
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <DatePickerModal
        visible={showDatePicker}
        title="日付を選択"
        value={recordDate}
        minimumDate={MIN_DATE}
        maximumDate={MAX_DATE}
        onConfirm={handleDateConfirm}
        onCancel={closeDatePicker}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  container: { flexGrow: 1, padding: 24, gap: 20, paddingBottom: 140 },
  emptyContainer: { flexGrow: 1, padding: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: "700", color: COLORS.textPrimary },
  note: { fontSize: 16, color: COLORS.textPrimary },
  field: { gap: 10 },
  label: { fontSize: 16, color: COLORS.textPrimary, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: COLORS.surface,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  inputFlex: { flex: 1 },
  optionRow: { flexDirection: "row", gap: 8 },
  optionButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  optionButtonSelected: {
    backgroundColor: COLORS.accentMain,
    borderColor: COLORS.accentMain,
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  optionButtonTextSelected: { color: COLORS.surface },
  dateRow: {
    height: 52,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateRowLabel: { fontSize: 16, color: COLORS.textPrimary, fontWeight: "600" },
  dateRowValue: { fontSize: 16, color: COLORS.textPrimary, fontWeight: "700" },
  todayButton: {
    marginTop: 8,
    alignSelf: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  todayButtonText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  fixedActions: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 12,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.filterBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionButtonText: {
    color: COLORS.textPrimary,
    fontWeight: "600",
    fontSize: 14,
  },
  fixedActionButton: { width: "100%" },
  saveButton: { alignSelf: "center" },
  deleteButton: { backgroundColor: COLORS.sunday, borderColor: COLORS.sunday },
  deleteButtonText: { color: COLORS.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.headerBackground,
  },
  headerLeft: {
    position: "absolute",
    left: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRight: { position: "absolute", right: 16, width: 24, height: 24 },
  headerTitle: { fontSize: 18, color: COLORS.textPrimary },
  headerCancel: { fontSize: 16, color: COLORS.textPrimary },
});

export default GrowthRecordInputScreen;
