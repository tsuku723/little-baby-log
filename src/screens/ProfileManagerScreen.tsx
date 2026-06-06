import React, { useLayoutEffect } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { SettingsStackParamList } from "@/navigation";
import AppText from "@/components/AppText";
import { MAX_PROFILES, useAppState } from "@/state/AppStateContext";
import { COLORS } from "@/constants/colors";

type Props = NativeStackScreenProps<SettingsStackParamList, "ProfileManager">;

const ProfileManagerScreen: React.FC<Props> = ({ navigation }) => {
  const { state } = useAppState();
  const { users } = state;
  const isAtLimit = users.length >= MAX_PROFILES;

  useLayoutEffect(() => {
    const parent = navigation.getParent();
    parent?.setOptions({ tabBarStyle: { display: "none" } });
    return () => {
      parent?.setOptions({ tabBarStyle: { display: "flex" } });
    };
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="戻る"
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle} weight="medium">
          プロフィール編集
        </AppText>
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerTextBlock}>
          <Text style={styles.subtitle}>編集したいこどもを選んでください</Text>
        </View>

        {users.map((user) => (
          <View key={user.id} style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{user.name || "名前未設定"}</Text>
                <Text style={styles.cardMeta}>誕生日: {user.birthDate}</Text>
                <Text style={styles.cardMeta}>
                  予定日: {user.dueDate ?? "なし"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() =>
                  navigation.navigate("ProfileEdit", { profileId: user.id })
                }
                accessibilityRole="button"
              >
                <Text style={styles.editButtonText}>編集</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.addButton, isAtLimit && styles.addButtonDisabled]}
            onPress={() => {
              if (isAtLimit) {
                Alert.alert("", "子どもは最大5人まで登録できます");
                return;
              }
              navigation.navigate("ProfileEdit");
            }}
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.addButtonText,
                isAtLimit && styles.addButtonTextDisabled,
              ]}
            >
              ＋ 新しいこどもを追加
            </Text>
          </TouchableOpacity>
        </View>
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
  backButton: {
    position: "absolute",
    left: 16,
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  container: {
    padding: 16,
    gap: 12,
  },
  headerTextBlock: {
    gap: 4,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  cardMeta: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  editButton: {
    backgroundColor: COLORS.filterBackground,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  editButtonText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  footer: {
    marginTop: 12,
  },
  addButton: {
    backgroundColor: COLORS.filterBackground,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  addButtonTextDisabled: {
    color: COLORS.textSecondary,
  },
});

export default ProfileManagerScreen;
