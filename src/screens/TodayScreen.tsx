// TODO: This screen functions as a day-based view.
// Renaming to DayScreen is deferred for future refactor.

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { NavigationProp, useNavigation } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import {
  CalendarStackParamList,
  RootStackParamList,
  TabParamList,
} from "@/navigation";
import AgeBadge from "@/components/AgeBadge";
import AppText from "@/components/AppText";
import UserAvatar from "@/components/UserAvatar";
import RecordCard from "@/components/RecordCard";
import ExportView, { ExportViewHandle } from "@/components/ExportView";
import { useActiveUser } from "@/state/AppStateContext";
import { useAchievements } from "@/state/AchievementsContext";
import { useDateViewContext } from "@/state/DateViewContext";
import {
  calculateAgeInfo,
  normalizeToUtcDate,
  toIsoDateString,
  toUtcDateOnly,
} from "@/utils/dateUtils";
import { ensureFileExistsAsync } from "@/utils/photo";
import { COLORS } from "@/constants/colors";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { logTodayOpened } from "@/services/analytics";

type Props = NativeStackScreenProps<CalendarStackParamList, "Today">;
type RootNavigation = NavigationProp<RootStackParamList & TabParamList>;

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

const TodayScreen: React.FC<Props> = ({
  navigation: stackNavigation,
  route,
}) => {
  useFocusEffect(
    useCallback(() => {
      void logTodayOpened();
    }, [])
  );
  const rootNavigation = useNavigation<RootNavigation>();
  // Hooks should remain at top level (no conditional hooks)
  const user = useActiveUser();
  const { byDay, loading: achievementsLoading } = useAchievements();
  const { selectedDate, selectDateFromCalendar } = useDateViewContext();
  const exportViewRef = useRef<ExportViewHandle | null>(null);
  const [latestPhotoPath, setLatestPhotoPath] = useState<string | null>(null);

  const shouldHideTabBar = !user || !user.birthDate;

  const normalizedRouteDate = useMemo(
    () => normalizeToUtcDate(route.params.isoDate),
    [route.params.isoDate]
  );

  useEffect(() => {
    if (Number.isNaN(normalizedRouteDate.getTime())) return;
    selectDateFromCalendar(normalizedRouteDate);
  }, [normalizedRouteDate, selectDateFromCalendar]);

  const activeDate = useMemo(
    () =>
      !Number.isNaN(normalizedRouteDate.getTime())
        ? normalizedRouteDate
        : selectedDate,
    [normalizedRouteDate, selectedDate]
  );

  const selectedDateIso = useMemo(
    () => toIsoDateString(activeDate),
    [activeDate]
  );

  const todayIso = useMemo(
    () => toIsoDateString(toUtcDateOnly(new Date())),
    []
  );

  const ageInfo = useMemo(() => {
    if (!user || !user.birthDate) return null;
    try {
      return calculateAgeInfo({
        targetDate: selectedDateIso,
        birthDate: user.birthDate,
        dueDate: user.dueDate,
        showCorrectedUntilMonths: user.settings.showCorrectedUntilMonths,
        ageFormat: user.settings.ageFormat,
      });
    } catch {
      return null;
    }
  }, [
    user,
    selectedDateIso,
    user?.birthDate,
    user?.dueDate,
    user?.settings.showCorrectedUntilMonths,
    user?.settings.ageFormat,
  ]);

  const todayAgeInfo = useMemo(() => {
    if (!user || !user.birthDate) return null;
    try {
      return calculateAgeInfo({
        targetDate: todayIso,
        birthDate: user.birthDate,
        dueDate: user.dueDate,
        showCorrectedUntilMonths: user.settings.showCorrectedUntilMonths,
        ageFormat: user.settings.ageFormat,
      });
    } catch {
      return null;
    }
  }, [
    user,
    todayIso,
    user?.birthDate,
    user?.dueDate,
    user?.settings.showCorrectedUntilMonths,
    user?.settings.ageFormat,
  ]);

  const todaysAchievements = useMemo(
    () => byDay[selectedDateIso] ?? [],
    [byDay, selectedDateIso]
  );
  const sortedAchievements = useMemo(
    () =>
      todaysAchievements
        .slice()
        .sort((a, b) =>
          (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt)
        ),
    [todaysAchievements]
  );
  const exportRecordLines = useMemo(() => {
    const maxVisibleRecords = 6;
    const lines = sortedAchievements.map(
      (item) => `・${item.title || "(タイトルなし)"}`
    );
    if (lines.length === 0) {
      return ["まだ記録がありません"];
    }
    if (lines.length <= maxVisibleRecords) {
      return lines;
    }
    const hiddenCount = lines.length - maxVisibleRecords;
    return [...lines.slice(0, maxVisibleRecords), `…他${hiddenCount}件`];
  }, [sortedAchievements]);

  const exportDisplayDate = selectedDateIso.replace(/-/g, ".");
  const sectionTitleDate = useMemo(() => {
    const dayLabel = DAY_LABELS[activeDate.getDay()];
    return `${selectedDateIso.replace(/-/g, "/")}(${dayLabel})の記録`;
  }, [activeDate, selectedDateIso]);

  useLayoutEffect(() => {
    const parent = stackNavigation.getParent();
    if (!parent) return;
    if (shouldHideTabBar) {
      parent.setOptions({ tabBarStyle: { display: "none" } });
      return () => {
        parent.setOptions({ tabBarStyle: { display: "flex" } });
      };
    }
    parent.setOptions({ tabBarStyle: { display: "flex" } });
  }, [stackNavigation, shouldHideTabBar]);

  useEffect(() => {
    let mounted = true;
    const resolveLatestPhoto = async () => {
      const photoCandidate = sortedAchievements.find((item) => item.photoPath);
      const ensured = await ensureFileExistsAsync(
        photoCandidate?.photoPath ?? null
      );
      if (!mounted) return;
      setLatestPhotoPath(ensured);
    };

    void resolveLatestPhoto();
    return () => {
      mounted = false;
    };
  }, [sortedAchievements]);

  const handleOpenCalendar = () => {
    // popToTop はスタックに Calendar が残っていない場合に無効化する。
    // navigate だとスタックが [Today] のみの状態から [Today, Calendar] という
    // 非正規の順序になってしまうため、reset で必ず [Calendar] 単独の状態にする。
    stackNavigation.reset({ index: 0, routes: [{ name: "Calendar" }] });
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.title}>プロフィールを作成してください</Text>
          <Text style={styles.subtitle}>
            最初にプロフィール設定から始めましょう
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() =>
                rootNavigation.navigate("SettingsStack", {
                  screen: "ProfileManager",
                })
              }
              accessibilityRole="button"
            >
              <Text style={styles.navButtonText}>設定へ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!user.birthDate) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.title}>{user.name}</Text>
          <Text style={styles.subtitle}>生年月日が未設定です</Text>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() =>
              rootNavigation.navigate("SettingsStack", {
                screen: "ProfileManager",
              })
            }
            accessibilityRole="button"
          >
            <Text style={styles.navButtonText}>プロフィールを編集</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <UserAvatar
          name={user.name}
          profilePhotoPath={user.profilePhotoPath}
          size={64}
        />
        <View style={styles.headerInfo}>
          <AppText style={styles.headerName} weight="medium">
            {user.name}
          </AppText>
          {todayAgeInfo ? (
            <View style={styles.headerAgeBlock}>
              <View style={styles.headerAgeRow}>
                <Text style={styles.headerChronological}>
                  {todayAgeInfo.chronological.formatted}
                </Text>
                {todayAgeInfo.flags.showMode === "gestational" &&
                todayAgeInfo.gestational.formatted ? (
                  <View style={styles.headerCorrectedBadge}>
                    <Text style={styles.headerCorrectedBadgeText}>
                      在胎 {todayAgeInfo.gestational.formatted}
                    </Text>
                  </View>
                ) : todayAgeInfo.corrected.visible &&
                  todayAgeInfo.corrected.formatted ? (
                  <View style={styles.headerCorrectedBadge}>
                    <Text style={styles.headerCorrectedBadgeText}>
                      修正 {todayAgeInfo.corrected.formatted}
                    </Text>
                  </View>
                ) : null}
              </View>
              {user.settings.showDaysSinceBirth ? (
                <Text style={styles.headerDays}>
                  生まれてから{todayAgeInfo.daysSinceBirth}日目
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.headerCalendarButton}
          onPress={handleOpenCalendar}
          accessibilityRole="button"
          accessibilityLabel="カレンダーへ戻る"
        >
          <Ionicons
            name="calendar-outline"
            size={22}
            color={COLORS.textPrimary}
          />
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {sortedAchievements.length > 0 && (
          <View style={styles.exportActionRow}>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={() => void exportViewRef.current?.saveToLibrary()}
              accessibilityRole="button"
            >
              <Ionicons
                name="image-outline"
                size={18}
                color={COLORS.textPrimary}
              />
              <Text style={styles.exportButtonText}>画像として保存</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{sectionTitleDate}</Text>
          {ageInfo !== null && selectedDateIso >= user.birthDate ? (
            <View style={styles.badgeRow}>
              <AgeBadge
                label={ageInfo.chronological.formatted}
                variant="chronological"
              />
              {ageInfo.flags.showMode === "gestational" &&
              ageInfo.gestational.visible &&
              ageInfo.gestational.formatted ? (
                <AgeBadge
                  label={`在胎 ${ageInfo.gestational.formatted}`}
                  variant="gestational"
                />
              ) : null}
              {ageInfo.corrected.visible && ageInfo.corrected.formatted ? (
                <AgeBadge
                  label={`修正 ${ageInfo.corrected.formatted}`}
                  variant="corrected"
                />
              ) : null}
              {user.settings.showDaysSinceBirth ? (
                <AgeBadge
                  label={`${ageInfo.daysSinceBirth}日目`}
                  variant="days"
                />
              ) : null}
            </View>
          ) : null}
          {achievementsLoading ? (
            <Text style={styles.empty}>読み込み中...</Text>
          ) : todaysAchievements.length === 0 ? (
            <Text style={styles.empty}>気づいたことがあれば記録しよう</Text>
          ) : (
            sortedAchievements.map((item) => (
              <RecordCard
                key={item.id}
                item={item}
                onPress={() =>
                  rootNavigation.navigate("RecordDetail", {
                    recordId: item.id,
                    from: "today",
                  })
                }
              />
            ))
          )}
        </View>
      </ScrollView>
      <ExportView
        ref={exportViewRef}
        ageInfo={ageInfo}
        exportDisplayDate={exportDisplayDate}
        exportRecordLines={exportRecordLines}
        latestPhotoPath={latestPhotoPath}
      />
      <TouchableOpacity
        style={styles.fab}
        accessibilityRole="button"
        onPress={() =>
          rootNavigation.navigate("RecordInput", { isoDate: selectedDateIso })
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.headerBackground,
    gap: 12,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  headerName: {
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  headerAgeBlock: {
    gap: 2,
  },
  headerAgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerChronological: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  headerCorrectedBadge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  headerCorrectedBadgeText: {
    fontSize: 12,
    color: COLORS.accentMain,
    fontWeight: "600",
  },
  headerDays: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  headerCalendarButton: {
    position: "absolute",
    right: 16,
    padding: 6,
  },
  container: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 140, // FAB に重ならない余白を確保
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  exportActionRow: {
    alignSelf: "flex-start",
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.filterBackground,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exportButtonText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  section: {
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.accentMain,
    marginBottom: 8,
  },
  empty: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  buttonRow: {
    marginTop: 12,
  },
  navButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.filterBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  navButtonText: {
    color: COLORS.textPrimary,
    fontWeight: "600",
    fontSize: 14,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    backgroundColor: COLORS.accentMain,
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

export default TodayScreen;
