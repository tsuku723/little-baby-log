import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { RootStackParamList } from "@/navigation";
import AppText from "@/components/AppText";
import DatePickerModal from "@/components/DatePickerModal";
import { useActiveUser } from "@/state/AppStateContext";
import {
  SaveAchievementPayload,
  useAchievements,
} from "@/state/AchievementsContext";
import { useDateViewContext } from "@/state/DateViewContext";
import { clampComment, remainingChars } from "@/utils/text";
import {
  safeParseIsoLocal,
  toIsoDateString,
  toUtcDateOnly,
} from "@/utils/dateUtils";
import {
  deleteIfExistsAsync,
  ensureFileExistsAsync,
  pickAndSavePhotoAsync,
  resolvePhotoPath,
  PhotoPermissionDeniedError,
} from "@/utils/photo";
import { RECORD_TITLE_CANDIDATE_SECTIONS } from "./recordTitleCandidates";
import { COLORS } from "@/constants/colors";
import { logRecordCreated } from "@/services/analytics";

type Props = NativeStackScreenProps<RootStackParamList, "RecordInput">;

const RecordInputScreen: React.FC<Props> = ({ navigation, route }) => {
  const user = useActiveUser();
  const { store, upsert, remove } = useAchievements();
  const { selectedDate } = useDateViewContext();

  const recordId = route.params?.recordId;
  const preferredDate = route.params?.isoDate;
  const from = route.params?.from;

  // 編集対象のレコードを store から検索（isoDate があれば優先して絞り込む）
  const editingRecord = useMemo(() => {
    if (!recordId) return null;
    if (preferredDate && store[preferredDate]) {
      return store[preferredDate].find((item) => item.id === recordId) ?? null;
    }
    const all = Object.values(store).flat();
    return all.find((item) => item.id === recordId) ?? null;
  }, [preferredDate, recordId, store]);

  const selectedDateIso = useMemo(
    () => toIsoDateString(selectedDate),
    [selectedDate]
  );
  const [recordDate, setRecordDate] = useState<Date>(() =>
    safeParseIsoLocal(preferredDate ?? selectedDateIso, selectedDate)
  );
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [title, setTitle] = useState<string>(editingRecord?.title ?? "");
  const [content, setContent] = useState<string>(editingRecord?.memo ?? "");
  const [photoPath, setPhotoPath] = useState<string | null>(
    editingRecord?.photoPath ?? null
  );
  const [hasRemovedPhoto, setHasRemovedPhoto] = useState<boolean>(false);
  const [isTitleSheetVisible, setTitleSheetVisible] = useState(false);
  const MIN_DATE = useMemo(() => new Date(1900, 0, 1), []);
  const MAX_DATE = useMemo(() => new Date(2100, 11, 31), []);

  // 編集対象が変わったらフォームを最新の値に合わせる
  useEffect(() => {
    if (editingRecord) {
      setRecordDate(safeParseIsoLocal(editingRecord.date, selectedDate));
      setTitle(editingRecord.title ?? "");
      setContent(editingRecord.memo ?? "");
      setPhotoPath(editingRecord.photoPath ?? null);
      setHasRemovedPhoto(false);
    } else if (preferredDate) {
      setRecordDate(safeParseIsoLocal(preferredDate, selectedDate));
      setTitle("");
      setContent("");
      setPhotoPath(null);
      setHasRemovedPhoto(false);
    } else {
      setRecordDate(safeParseIsoLocal(selectedDateIso, selectedDate));
    }
  }, [editingRecord, preferredDate, selectedDate, selectedDateIso]);

  // 編集対象の photoPath が実ファイルとして存在するかを確認する
  useEffect(() => {
    let mounted = true;
    const verifyPhoto = async () => {
      const ensured = await ensureFileExistsAsync(
        editingRecord?.photoPath ?? null
      );
      if (!mounted) return;
      setPhotoPath(ensured);
      setHasRemovedPhoto(!ensured && Boolean(editingRecord?.photoPath));
    };
    void verifyPhoto();
    return () => {
      mounted = false;
    };
  }, [editingRecord?.photoPath]);

  // ボトムシートを開くタイミングでフラグを立てる
  const openTitleSheet = () => {
    setTitleSheetVisible(true);
  };

  const closeTitleSheet = () => setTitleSheetVisible(false);

  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const closeDatePicker = () => {
    setShowDatePicker(false);
  };

  const handleDateConfirm = (nextDate: Date) => {
    setRecordDate(nextDate);
    closeDatePicker();
  };

  const setDateToToday = () => {
    setRecordDate(toUtcDateOnly(new Date()));
  };

  // 候補選択時のハンドリング
  const handleSelectCandidate = (candidate: string) => {
    setTitle(candidate);
    setTitleSheetVisible(false);
  };

  const handlePickPhoto = async () => {
    const previousTempPhoto =
      photoPath && photoPath !== editingRecord?.photoPath ? photoPath : null;
    try {
      const next = await pickAndSavePhotoAsync();
      if (!next) return;

      if (previousTempPhoto && previousTempPhoto !== next) {
        // 編集画面で選び直した未保存の写真は不要になるためクリーンアップする
        await deleteIfExistsAsync(previousTempPhoto);
      }

      setPhotoPath(next);
      setHasRemovedPhoto(false);
    } catch (error) {
      if (error instanceof PhotoPermissionDeniedError) {
        Alert.alert(
          "写真へのアクセスが許可されていません",
          "写真を追加するには、設定アプリでこのアプリの写真アクセスを許可してください。",
          [
            { text: "キャンセル", style: "cancel" },
            { text: "設定を開く", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      console.error("Failed to pick photo", error);
      Alert.alert("写真の追加に失敗しました", "再度お試しください。");
    }
  };

  const handleRemovePhoto = async () => {
    try {
      if (photoPath && photoPath !== editingRecord?.photoPath) {
        // 保存前に追加した写真はここで破棄する
        await deleteIfExistsAsync(photoPath);
      }
    } catch (error) {
      console.warn("Failed to delete temp photo", error);
    }
    setPhotoPath(null);
    setHasRemovedPhoto(Boolean(editingRecord?.photoPath));
  };

  const charsLeft = useMemo(() => remainingChars(content), [content]);

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
    const isoDate = toIsoDateString(recordDate);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert("タイトルを入力してください", "記録タイトルは必須です。");
      return;
    }

    const photoPayload: string | null | undefined = (() => {
      if (hasRemovedPhoto && editingRecord?.photoPath && !photoPath)
        return null; // 既存の写真を削除
      if (photoPath && photoPath !== editingRecord?.photoPath) return photoPath; // 新規に差し替え
      if (!editingRecord && photoPath) return photoPath; // 新規レコードで写真あり
      return undefined; // 変更なし
    })();
    const payload: SaveAchievementPayload = {
      id: editingRecord?.id,
      date: isoDate,
      title: trimmedTitle,
      memo: content,
      photoPath: photoPayload,
    };

    try {
      await upsert(payload);
      if (!editingRecord) void logRecordCreated();
      navigation.goBack();
    } catch (error) {
      console.error("Failed to save record", error);
      Alert.alert("保存に失敗しました", "時間をおいて再度お試しください。");
    }
  };

  // 削除確認ダイアログを表示する（Web は window.confirm を使用）
  const confirmDelete = () => {
    if (!editingRecord) return;

    if (Platform.OS === "web") {
      const ok = window.confirm("この記録を削除します。よろしいですか？");
      if (!ok) return;
      const targetStack = from === "list" ? "RecordListStack" : "CalendarStack";
      (navigation as any).replace("MainTabs", { screen: targetStack });
      remove(editingRecord.id, editingRecord.date).catch((error) => {
        console.error("Failed to delete record", error);
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
          const targetStack =
            from === "list" ? "RecordListStack" : "CalendarStack";
          (navigation as any).replace("MainTabs", { screen: targetStack });
          try {
            await remove(editingRecord.id, editingRecord.date);
          } catch (error) {
            console.error("Failed to delete record", error);
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
    // プロフィールが無い場合は案内のみ表示して戻る
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.title}>プロフィールを作成してください</Text>
          <Text style={styles.note}>
            記録を保存するにはプロフィールが必要です。
          </Text>
          <Button title="戻る" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 入力画面ヘッダー：キャンセル／記録する */}
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
          記録する
        </AppText>
        <View style={styles.headerRight} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* ヘッダーに文言を移したため、ここではタイトルを表示しない */}

        <View style={styles.field}>
          <Text style={styles.label}>タイトル</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={(text) => setTitle(text.slice(0, 80))}
            placeholder="短いタイトル（任意）"
            accessibilityLabel="タイトル"
          />
          <TouchableOpacity
            style={styles.titleSuggestionButton}
            onPress={openTitleSheet}
            accessibilityRole="button"
          >
            <Text style={styles.titleSuggestionText}>候補から選ぶ（任意）</Text>
          </TouchableOpacity>
        </View>

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
          <Text style={styles.label}>メモ</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={content}
            onChangeText={(text) => setContent(clampComment(text))}
            placeholder="今日の成長や出来事を書き残しましょう（最大500文字）"
            accessibilityLabel="メモ"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          <Text style={styles.helper}>残り {charsLeft} / 500</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>写真（任意）</Text>
          <View style={styles.photoActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handlePickPhoto}
              accessibilityRole="button"
            >
              <Ionicons
                name="image-outline"
                size={18}
                color={COLORS.textPrimary}
              />
              <Text style={styles.actionButtonText}>
                {photoPath ? "写真を差し替える" : "写真を追加"}
              </Text>
            </TouchableOpacity>
            {photoPath ? (
              <TouchableOpacity
                style={styles.photoRemoveButton}
                onPress={handleRemovePhoto}
                accessibilityRole="button"
              >
                <Text style={styles.photoRemoveText}>写真を外す</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {photoPath ? (
            <View style={styles.photoPreviewWrapper}>
              <Image
                source={{ uri: resolvePhotoPath(photoPath) }}
                style={styles.photoPreview}
                resizeMode="cover"
              />
              <Text style={styles.helper}>
                保存時にこの写真を記録へ紐付けます。
              </Text>
            </View>
          ) : (
            <Text style={styles.helper}>
              写真はアプリ内で JPEG 形式で保存されます。
            </Text>
          )}
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
      <Modal
        animationType="slide"
        transparent
        visible={isTitleSheetVisible}
        onRequestClose={closeTitleSheet}
        statusBarTranslucent
      >
        <Pressable
          style={styles.sheetOverlay}
          onPress={closeTitleSheet}
          accessibilityRole="button"
        />
        <View style={styles.sheetContainer}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>タイトル候補</Text>

          <SectionList
            sections={RECORD_TITLE_CANDIDATE_SECTIONS}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.sheetList}
            keyboardShouldPersistTaps="handled"
            renderSectionHeader={({ section }) => (
              <Text style={styles.sectionHeader}>{section.name}</Text>
            )}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.candidateItem}
                onPress={() => handleSelectCandidate(item)}
                accessibilityRole="button"
              >
                <Text style={styles.candidateText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
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
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 20,
    paddingBottom: 140,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  note: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  field: {
    gap: 10,
  },
  label: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  helper: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  photoActions: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
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
  photoRemoveButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  photoRemoveText: {
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  photoPreviewWrapper: {
    marginTop: 10,
    gap: 6,
  },
  photoPreview: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    backgroundColor: COLORS.cellDimmed,
  },
  titleSuggestionButton: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  titleSuggestionText: {
    fontSize: 13,
    color: COLORS.accentMain,
    textDecorationLine: "underline",
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: COLORS.surface,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
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
  dateRowLabel: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  dateRowValue: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: "700",
  },
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
  textarea: {
    minHeight: 140,
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
  fixedActionButton: {
    width: "100%",
  },
  saveButton: {
    alignSelf: "center",
  },
  /* 記録入力ヘッダー */
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
  headerRight: {
    position: "absolute",
    right: 16,
    width: 24,
    height: 24,
  },
  headerTitle: {
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  headerCancel: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  deleteButton: {
    backgroundColor: COLORS.sunday,
    borderColor: COLORS.sunday,
  },
  deleteButtonText: {
    color: COLORS.surface,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  sheetContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: "70%",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  sheetList: {
    paddingBottom: 12,
    gap: 10,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: COLORS.cellDimmed,
    marginTop: 4,
  },
  candidateItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  candidateText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
});

export default RecordInputScreen;
