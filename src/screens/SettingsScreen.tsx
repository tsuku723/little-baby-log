import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { SettingsStackParamList } from "@/navigation";
import AppText from "@/components/AppText";
import { useAppState } from "@/state/AppStateContext";
import {
  createBackup,
  restoreBackup,
  validateBackup,
  INVALID_FORMAT_ERROR,
} from "@/services/backupService";
import { COLORS } from "@/constants/colors";

type Props = NativeStackScreenProps<SettingsStackParamList, "Settings">;

type SupportRoute =
  | "About"
  | "PrivacyPolicy"
  | "Terms"
  | "OpenSourceLicenses"
  | "Contact";

const supportMenus: Array<{ label: string; route: SupportRoute }> = [
  { label: "このアプリについて", route: "About" },
  { label: "プライバシーポリシー", route: "PrivacyPolicy" },
  { label: "利用規約", route: "Terms" },
  { label: "オープンソースライセンス", route: "OpenSourceLicenses" },
  { label: "お問い合わせ", route: "Contact" },
];

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { state, setActiveUser, restoreState } = useAppState();
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  const handleSelectChild = useCallback(
    async (userId: string) => {
      await setActiveUser(userId);
    },
    [setActiveUser]
  );

  const handleCreateBackup = useCallback(async () => {
    setBackupLoading(true);
    setBackupError(null);
    try {
      const uri = await createBackup(state.users, state.achievements);
      await Sharing.shareAsync(uri);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "不明なエラーが発生しました";
      setBackupError(message);
    } finally {
      setBackupLoading(false);
    }
  }, [state.users, state.achievements]);

  const handleImport = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/zip",
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const uri = result.assets[0].uri;

    try {
      await validateBackup(uri);
    } catch (e) {
      const raw = e instanceof Error ? e.message : "";
      const message =
        raw === INVALID_FORMAT_ERROR || raw === "未対応のバックアップ形式です"
          ? raw
          : INVALID_FORMAT_ERROR;
      Alert.alert("エラー", message);
      return;
    }

    await new Promise<void>((resolve) => {
      Alert.alert(
        "バックアップをインポート",
        "現在のすべてのデータ（プロフィール・記録・写真）が、バックアップの内容に置き換えられます。この操作は元に戻せません。続けますか？",
        [
          { text: "キャンセル", style: "cancel", onPress: () => resolve() },
          {
            text: "インポート",
            style: "destructive",
            onPress: async () => {
              setImportLoading(true);
              try {
                const { profiles, achievements } = await restoreBackup(uri);
                await restoreState(profiles, achievements);
                Alert.alert("完了", "バックアップからデータを復元しました");
              } catch (e) {
                const raw = e instanceof Error ? e.message : "";
                const message =
                  raw === INVALID_FORMAT_ERROR ||
                  raw === "未対応のバックアップ形式です"
                    ? raw
                    : INVALID_FORMAT_ERROR;
                Alert.alert("エラー", message);
              } finally {
                setImportLoading(false);
                resolve();
              }
            },
          },
        ]
      );
    });
  }, [restoreState]);

  const handleDevResetAllData = useCallback(() => {
    Alert.alert(
      "【開発用】全データを削除",
      "プロフィール・記録などすべてのデータを削除します。この操作は元に戻せません。続けますか？",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除する",
          style: "destructive",
          onPress: () => {
            void restoreState([], {});
          },
        },
      ]
    );
  }, [restoreState]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <AppText style={styles.title} weight="medium">
          設定
        </AppText>
      </View>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.field}>
          <Text style={styles.label}>ベビーを選択</Text>
          <View style={styles.childList}>
            {state.users.map((child) => {
              const isActive = child.id === state.activeUserId;
              return (
                <TouchableOpacity
                  key={child.id}
                  style={styles.childRow}
                  onPress={() => handleSelectChild(child.id)}
                  accessibilityRole="button"
                >
                  <View style={styles.childInfo}>
                    <Text
                      style={[
                        styles.childName,
                        isActive && styles.childNameActive,
                      ]}
                    >
                      {child.name || "名前未設定"}
                    </Text>
                    <Text style={styles.childMeta}>
                      {child.birthDate ? child.birthDate : "生年月日未設定"}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.childCheck,
                      isActive && styles.childCheckActive,
                    ]}
                  >
                    {isActive ? "✓" : ""}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate("ProfileManager")}
            accessibilityRole="button"
          >
            <Text style={styles.addButtonText}>＋ 子どもを追加・編集</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.notice}>
          ※このアプリの記録は、この端末の中だけに保存されます。
        </Text>

        <View style={styles.backupSection}>
          <Text style={styles.label}>データ</Text>
          <TouchableOpacity
            testID="backup-button"
            style={[
              styles.backupButton,
              backupLoading && styles.backupButtonDisabled,
            ]}
            onPress={handleCreateBackup}
            disabled={backupLoading}
            accessibilityRole="button"
          >
            {backupLoading ? (
              <ActivityIndicator size="small" color={COLORS.textPrimary} />
            ) : (
              <Text style={styles.backupButtonText}>バックアップを作成</Text>
            )}
          </TouchableOpacity>
          {backupError !== null && (
            <Text style={styles.backupError}>{backupError}</Text>
          )}
          <TouchableOpacity
            testID="import-button"
            style={[
              styles.backupButton,
              importLoading && styles.backupButtonDisabled,
            ]}
            onPress={handleImport}
            disabled={importLoading}
            accessibilityRole="button"
          >
            {importLoading ? (
              <ActivityIndicator size="small" color={COLORS.textPrimary} />
            ) : (
              <Text style={styles.backupButtonText}>
                バックアップをインポート
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.supportSection}>
          <Text style={styles.label}>サポート</Text>
          <View style={styles.supportMenuContainer}>
            {supportMenus.map((menu, index) => {
              const isLast = index === supportMenus.length - 1;
              return (
                <TouchableOpacity
                  key={menu.route}
                  style={[
                    styles.supportMenuRow,
                    isLast && styles.supportMenuRowLast,
                  ]}
                  onPress={() => navigation.navigate(menu.route)}
                  accessibilityRole="button"
                >
                  <Text style={styles.supportMenuLabel}>{menu.label}</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {__DEV__ && (
          <View style={styles.devSection}>
            <Text style={styles.label}>開発用</Text>
            <TouchableOpacity
              testID="dev-reset-button"
              style={styles.devResetButton}
              onPress={handleDevResetAllData}
              accessibilityRole="button"
            >
              <Text style={styles.devResetButtonText}>
                全データを削除（テスト用）
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
  container: {
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 20,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  childList: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  childRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  childInfo: {
    gap: 4,
    flex: 1,
  },
  childName: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  childNameActive: {
    color: COLORS.saturday,
  },
  childMeta: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  childCheck: {
    width: 24,
    textAlign: "center",
    color: COLORS.textPrimary,
    fontSize: 18,
  },
  childCheckActive: {
    color: COLORS.saturday,
    fontWeight: "700",
  },
  addButton: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.filterBackground,
  },
  addButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  notice: {
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.cellDimmed,
    padding: 12,
    borderRadius: 8,
  },
  backupSection: {
    gap: 8,
  },
  backupButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.filterBackground,
    alignItems: "center",
  },
  backupButtonDisabled: {
    opacity: 0.5,
  },
  backupButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  backupError: {
    fontSize: 13,
    color: "#D32F2F",
    paddingHorizontal: 4,
  },
  supportSection: {
    gap: 8,
    marginBottom: 16,
  },
  supportMenuContainer: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  supportMenuRow: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  supportMenuRowLast: {
    borderBottomWidth: 0,
  },
  supportMenuLabel: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  devSection: {
    gap: 8,
    marginBottom: 16,
  },
  devResetButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D32F2F",
    backgroundColor: "#FBE9E7",
    alignItems: "center",
  },
  devResetButtonText: {
    color: "#D32F2F",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default SettingsScreen;
