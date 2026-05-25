import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { NativeStackScreenProps } from "@react-navigation/native-stack";

import AppText from "@/components/AppText";
import DatePickerModal from "@/components/DatePickerModal";
import { COLORS } from "@/constants/colors";
import { UserSettings } from "@/models/dataModels";
import { SettingsStackParamList } from "@/navigation";
import { useAppState } from "@/state/AppStateContext";
import {
  isIsoDateString,
  safeParseIsoLocal,
  toIsoDateString,
} from "@/utils/dateUtils";
import {
  PhotoPermissionDeniedError,
  deleteIfExistsAsync,
  pickAndSaveProfilePhotoAsync,
} from "@/utils/photo";

type Props = NativeStackScreenProps<SettingsStackParamList, "ProfileEdit">;

type FormState = {
  name: string;
  birthDate: string;
  dueDate: string;
  profilePhotoPath?: string;
};

const createEmptyForm = (): FormState => ({
  name: "",
  birthDate: toIsoDateString(new Date()),
  dueDate: "",
  profilePhotoPath: undefined,
});

const ProfileEditScreen: React.FC<Props> = ({ navigation, route }) => {
  const { state, addUser, updateUser, deleteUser } = useAppState();
  const { users } = state;
  const profileId = route.params?.profileId;

  const existing = useMemo(
    () => users.find((u) => u.id === profileId),
    [users, profileId]
  );

  const [formState, setFormState] = useState<FormState>(() => {
    if (existing) {
      return {
        name: existing.name,
        birthDate: existing.birthDate,
        dueDate: existing.dueDate ?? "",
        profilePhotoPath: existing.profilePhotoPath,
      };
    }
    return createEmptyForm();
  });

  const [draftSettings, setDraftSettings] = useState<UserSettings>(() => {
    if (existing) return { ...existing.settings };
    return {
      showCorrectedUntilMonths: 24,
      ageFormat: "ymd",
      showDaysSinceBirth: true,
      lastViewedMonth: null,
    };
  });

  const startOfLocalDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const cloneDate = (d: Date) => new Date(d.getTime());
  const sanitizePickerDate = (date: Date, fallback: Date) => {
    if (Number.isNaN(date.getTime())) return cloneDate(fallback);
    return cloneDate(date);
  };
  const safeDate = (iso: string, fallback: Date) => {
    const parsed = safeParseIsoLocal(iso, fallback);
    if (!parsed) return cloneDate(fallback);
    return sanitizePickerDate(parsed, fallback);
  };

  const today = useMemo(() => startOfLocalDay(new Date()), []);
  const MIN_DATE = useMemo(() => new Date(1900, 0, 1), []);
  const MAX_DUE_DATE = useMemo(() => new Date(2100, 11, 31), []);

  const [activeDateField, setActiveDateField] = useState<
    "birth" | "due" | null
  >(null);
  const [isDateModalVisible, setDateModalVisible] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(() =>
    safeDate(formState.birthDate, today)
  );

  useLayoutEffect(() => {
    const parent = navigation.getParent();
    parent?.setOptions({ tabBarStyle: { display: "none" } });
    return () => {
      parent?.setOptions({ tabBarStyle: { display: "flex" } });
    };
  }, [navigation]);

  useEffect(() => {
    if (existing) {
      setFormState({
        name: existing.name,
        birthDate: existing.birthDate,
        dueDate: existing.dueDate ?? "",
        profilePhotoPath: existing.profilePhotoPath,
      });
      setDraftSettings({ ...existing.settings });
    } else {
      setFormState(createEmptyForm());
      setDraftSettings({
        showCorrectedUntilMonths: 24,
        ageFormat: "ymd",
        showDaysSinceBirth: true,
        lastViewedMonth: null,
      });
    }
  }, [existing]);

  const isFormValid = useMemo(() => {
    const name = formState.name.trim();
    const birthDate = formState.birthDate.trim();
    return Boolean(name) && isIsoDateString(birthDate);
  }, [formState.birthDate, formState.name]);

  const handlePickPhoto = async () => {
    try {
      const newPath = await pickAndSaveProfilePhotoAsync();
      if (!newPath) return;
      const prev = formState.profilePhotoPath;
      if (prev && prev !== existing?.profilePhotoPath) {
        await deleteIfExistsAsync(prev);
      }
      setFormState((s) => ({ ...s, profilePhotoPath: newPath }));
    } catch (e) {
      if (e instanceof PhotoPermissionDeniedError) {
        Alert.alert(
          "アクセス許可が必要です",
          "設定からフォトライブラリへのアクセスを許可してください。"
        );
      }
    }
  };

  const handleRemovePhoto = async () => {
    const current = formState.profilePhotoPath;
    if (current && current !== existing?.profilePhotoPath) {
      await deleteIfExistsAsync(current);
    }
    setFormState((s) => ({ ...s, profilePhotoPath: undefined }));
  };

  const handleCancel = async () => {
    const current = formState.profilePhotoPath;
    if (current && current !== existing?.profilePhotoPath) {
      await deleteIfExistsAsync(current);
    }
    navigation.goBack();
  };

  const handleSave = async () => {
    const name = formState.name.trim();
    const birthDate = formState.birthDate.trim();
    const dueDate = formState.dueDate.trim() || null;
    const profilePhotoPath = formState.profilePhotoPath ?? null;

    if (!name || !birthDate) {
      Alert.alert("入力エラー", "名前と生年月日は必須です。");
      return;
    }

    if (existing) {
      if (
        existing.profilePhotoPath &&
        existing.profilePhotoPath !== profilePhotoPath
      ) {
        await deleteIfExistsAsync(existing.profilePhotoPath);
      }
      await updateUser(existing.id, {
        name,
        birthDate,
        dueDate,
        profilePhotoPath: profilePhotoPath ?? undefined,
        settings: draftSettings,
      });
    } else {
      await addUser({
        name,
        birthDate,
        dueDate,
        profilePhotoPath: profilePhotoPath ?? undefined,
        settings: draftSettings,
      });
    }

    navigation.popToTop();
  };

  const openDatePicker = (field: "birth" | "due") => {
    setActiveDateField(field);
    const nextTempDate =
      field === "birth"
        ? safeDate(formState.birthDate, today)
        : safeDate(formState.dueDate, today);
    setTempDate(sanitizePickerDate(nextTempDate, today));
    setDateModalVisible(true);
  };

  const closeDatePicker = () => {
    setDateModalVisible(false);
    setActiveDateField(null);
  };

  const pickerValue = useMemo(
    () => sanitizePickerDate(tempDate, today),
    [tempDate, today]
  );

  const handleDateConfirm = (date: Date) => {
    if (!activeDateField) return;
    const finalDate = sanitizePickerDate(date, today);
    setTempDate(finalDate);
    if (activeDateField === "birth") {
      setFormState((prev) => ({
        ...prev,
        birthDate: toIsoDateString(finalDate),
      }));
    } else {
      setFormState((prev) => ({
        ...prev,
        dueDate: toIsoDateString(finalDate),
      }));
    }
    closeDatePicker();
  };

  const handleDelete = async () => {
    if (!existing) return;
    if (users.length <= 1) {
      Alert.alert("削除できません", "プロフィールは1件以上必要です。");
      return;
    }
    Alert.alert("削除しますか？", "このプロフィールと記録を削除します。", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          const achievementPhotos = (state.achievements[existing.id] ?? [])
            .map((a) => a.photoPath)
            .filter(Boolean) as string[];
          await Promise.all(achievementPhotos.map(deleteIfExistsAsync));
          await deleteIfExistsAsync(existing.profilePhotoPath);
          await deleteUser(existing.id);
          navigation.popToTop();
        },
      },
    ]);
  };

  const title = existing ? "プロフィールを編集" : "新しいこどもを追加";

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={handleCancel}
          accessibilityRole="button"
        >
          <Text style={styles.headerLeftText}>キャンセル</Text>
        </TouchableOpacity>
        <AppText style={styles.headerTitle} weight="medium">
          {title}
        </AppText>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={handlePickPhoto}
            style={styles.avatarContainer}
            accessibilityRole="button"
            accessibilityLabel="プロフィール写真を選択"
          >
            {formState.profilePhotoPath ? (
              <Image
                source={{ uri: formState.profilePhotoPath }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {formState.name.trim() ? formState.name.trim()[0] : "+"}
                </Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Text style={styles.avatarEditBadgeText}>編集</Text>
            </View>
          </TouchableOpacity>
          {formState.profilePhotoPath ? (
            <TouchableOpacity
              onPress={handleRemovePhoto}
              accessibilityRole="button"
            >
              <Text style={styles.removePhotoText}>写真を削除</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>名前</Text>
          <TextInput
            value={formState.name}
            onChangeText={(text) =>
              setFormState((prev) => ({ ...prev, name: text }))
            }
            style={styles.input}
            placeholder="お名前"
          />
        </View>

        <View style={styles.field}>
          <TouchableOpacity
            style={styles.dateRow}
            onPress={() => openDatePicker("birth")}
            accessibilityRole="button"
            accessibilityLabel="出生日を選択"
          >
            <Text style={styles.dateRowLabel}>出生日</Text>
            <Text style={styles.dateRowValue}>{formState.birthDate} ▼</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <TouchableOpacity
            style={styles.dateRow}
            onPress={() => openDatePicker("due")}
            accessibilityRole="button"
            accessibilityLabel="出産予定日を選択"
          >
            <Text style={styles.dateRowLabel}>出産予定日</Text>
            <Text style={styles.dateRowValue}>{formState.dueDate} ▼</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>こども表示設定</Text>
          <Text style={styles.description}>
            ここで変更した設定は、「保存」を押すまで反映されません。
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>修正月齢の表示上限</Text>
            <View style={styles.optionRow}>
              {[
                { label: "24か月", value: 24 },
                { label: "36か月", value: 36 },
                { label: "制限なし", value: null },
              ].map((option) => (
                <Pressable
                  key={option.label}
                  style={[
                    styles.optionButton,
                    draftSettings.showCorrectedUntilMonths === option.value &&
                      styles.optionButtonSelected,
                  ]}
                  onPress={() =>
                    setDraftSettings((prev) => ({
                      ...prev,
                      showCorrectedUntilMonths: option.value,
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.optionLabel,
                      draftSettings.showCorrectedUntilMonths === option.value &&
                        styles.optionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>月齢表記</Text>
            <View style={styles.optionRow}>
              {[
                { label: "〇才〇ヵ月〇日", value: "ymd" },
                { label: "〇〇ヵ月〇日", value: "md" },
              ].map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.optionButton,
                    draftSettings.ageFormat === option.value &&
                      styles.optionButtonSelected,
                  ]}
                  onPress={() =>
                    setDraftSettings((prev) => ({
                      ...prev,
                      ageFormat: option.value as UserSettings["ageFormat"],
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.optionLabel,
                      draftSettings.ageFormat === option.value &&
                        styles.optionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>生まれてからの日数表示</Text>
            <View style={styles.switchRow}>
              <Text style={styles.optionLabel}>
                {draftSettings.showDaysSinceBirth ? "ON" : "OFF"}
              </Text>
              <Switch
                value={draftSettings.showDaysSinceBirth}
                onValueChange={(value) =>
                  setDraftSettings((prev) => ({
                    ...prev,
                    showDaysSinceBirth: value,
                  }))
                }
              />
            </View>
          </View>

          <View style={styles.notesBox}>
            <Text style={styles.noteText}>
              ・予定日は妊娠40週0日（280日）相当として扱います
            </Text>
            <Text style={styles.noteText}>
              ・予定日前は修正月齢が負になり得るため、本アプリでは在胎週数で表示します
            </Text>
            <Text style={styles.noteText}>
              ・表示は目安であり医療判断ではありません
            </Text>
          </View>
        </View>
      </ScrollView>
      <View style={styles.fixedActions}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.saveButton,
            !isFormValid && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          accessibilityRole="button"
          disabled={!isFormValid}
        >
          <Text style={styles.actionButtonText}>保存</Text>
        </TouchableOpacity>
        {existing ? (
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.deleteButton,
              users.length <= 1 && styles.deleteButtonDisabled,
            ]}
            onPress={handleDelete}
            disabled={users.length <= 1}
            accessibilityRole="button"
          >
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
              このプロフィールを削除する
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {activeDateField ? (
        <DatePickerModal
          visible={isDateModalVisible}
          title={activeDateField === "birth" ? "出生日" : "出産予定日"}
          value={pickerValue}
          minimumDate={MIN_DATE}
          maximumDate={activeDateField === "birth" ? today : MAX_DUE_DATE}
          onCancel={closeDatePicker}
          onConfirm={handleDateConfirm}
        />
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.headerBackground,
  },
  headerLeft: {
    position: "absolute",
    left: 16,
  },
  headerLeftText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  scroll: {
    flex: 1,
  },
  container: {
    padding: 20,
    gap: 16,
  },
  avatarSection: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.highlightToday,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPlaceholderText: {
    fontSize: 32,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.headerBackground,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  avatarEditBadgeText: {
    fontSize: 11,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  removePhotoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
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
  section: {
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  optionRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  optionButtonSelected: {
    borderColor: COLORS.optionSelectedBorder,
  },
  optionLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  optionLabelSelected: {
    color: COLORS.optionSelectedBorder,
    fontWeight: "700",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  notesBox: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    gap: 6,
  },
  noteText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  fixedActions: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 12,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actions: {
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
    width: "100%",
  },
  actionButtonText: {
    color: COLORS.textPrimary,
    fontWeight: "600",
    fontSize: 14,
  },
  saveButton: {
    alignSelf: "center",
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  deleteButton: {
    backgroundColor: COLORS.sunday,
    borderColor: COLORS.sunday,
  },
  deleteButtonDisabled: {
    opacity: 0.4,
  },
  deleteButtonText: {
    color: COLORS.surface,
  },
});

export default ProfileEditScreen;
