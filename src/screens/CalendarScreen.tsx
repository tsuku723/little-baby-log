import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NavigationProp, useNavigation } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import CalendarGrid from "@/components/CalendarGrid";
import CalendarDecorations from "@/components/CalendarDecorations";
import DatePickerModal from "@/components/DatePickerModal";
import MonthHeader from "@/components/MonthHeader";
import AppText from "@/components/AppText";
import UserAvatar from "@/components/UserAvatar";
import {
  CalendarStackParamList,
  RootStackParamList,
  TabParamList,
} from "@/navigation";
import { useAchievements } from "@/state/AchievementsContext";
import { useActiveUser, useAppState } from "@/state/AppStateContext";
import { useDateViewContext } from "@/state/DateViewContext";
import {
  buildCalendarMonthView,
  calculateAgeInfo,
  monthKey,
  normalizeToUtcDate,
  toIsoDateString,
  toUtcDateOnly,
} from "@/utils/dateUtils";
import { COLORS } from "@/constants/colors";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { logCalendarOpened } from "@/services/analytics";

type Props = NativeStackScreenProps<CalendarStackParamList, "Calendar">;
type RootNavigation = NavigationProp<RootStackParamList & TabParamList>;

const WEEK_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

const CalendarScreen: React.FC<Props> = ({ navigation }) => {
  useFocusEffect(
    useCallback(() => {
      void logCalendarOpened();
    }, [])
  );
  const rootNavigation = useNavigation<RootNavigation>();
  const insets = useSafeAreaInsets();
  const user = useActiveUser();
  const { updateUser } = useAppState();
  const { monthCounts, loadMonth } = useAchievements();
  const { selectDateFromCalendar } = useDateViewContext();
  const [anchorDate, setAnchorDate] = useState<Date>(() => {
    if (user?.settings.lastViewedMonth) {
      const normalized = normalizeToUtcDate(user.settings.lastViewedMonth);
      if (!Number.isNaN(normalized.getTime())) {
        return new Date(normalized.getFullYear(), normalized.getMonth(), 1);
      }
    }
    return toUtcDateOnly(new Date());
  });
  const monthKeyValue = monthKey(anchorDate);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // useState の lazy initializer は user=null（AsyncStorage ロード前）で実行されるため
  // lastViewedMonth が読めない。user が初めてロードされたタイミングで1度だけ補正する。
  const hasRestoredMonthRef = useRef(false);
  useEffect(() => {
    if (hasRestoredMonthRef.current) return;
    if (user === null) return;
    hasRestoredMonthRef.current = true;
    if (!user.settings.lastViewedMonth) return;
    const normalized = normalizeToUtcDate(user.settings.lastViewedMonth);
    if (!Number.isNaN(normalized.getTime())) {
      setAnchorDate(
        new Date(normalized.getFullYear(), normalized.getMonth(), 1)
      );
    }
  }, [user]);
  const MIN_DATE = useMemo(() => new Date(1900, 0, 1), []);
  const MAX_DATE = useMemo(() => new Date(2100, 11, 31), []);

  useEffect(() => {
    void loadMonth(monthKeyValue);
    const isoMonth = `${anchorDate.getFullYear()}-${String(anchorDate.getMonth() + 1).padStart(2, "0")}-01`;
    if (user?.settings.lastViewedMonth !== isoMonth && user?.id) {
      void updateUser(user.id, {
        settings: { ...user.settings, lastViewedMonth: isoMonth },
      });
    }
  }, [
    anchorDate,
    loadMonth,
    monthKeyValue,
    updateUser,
    user?.id,
    user?.settings.lastViewedMonth,
  ]);

  const monthView = useMemo(
    () =>
      buildCalendarMonthView({
        anchorDate,
        settings: {
          showCorrectedUntilMonths:
            user?.settings.showCorrectedUntilMonths ?? null,
          ageFormat: user?.settings.ageFormat ?? "md",
          showDaysSinceBirth: user?.settings.showDaysSinceBirth ?? true,
          lastViewedMonth: user?.settings.lastViewedMonth ?? null,
        },
        birthDate: user?.birthDate ?? null,
        dueDate: user?.dueDate ?? null,
        achievementCountsByDay: monthCounts[monthKeyValue],
      }),
    [anchorDate, monthCounts, monthKeyValue, user]
  );

  const handlePrev = () => {
    const prev = new Date(
      anchorDate.getFullYear(),
      anchorDate.getMonth() - 1,
      1
    );
    setAnchorDate(prev);
  };

  const handleNext = () => {
    const next = new Date(
      anchorDate.getFullYear(),
      anchorDate.getMonth() + 1,
      1
    );
    setAnchorDate(next);
  };

  const handleToday = () => {
    const today = toUtcDateOnly(new Date());
    setAnchorDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const openMonthPicker = () => {
    setShowMonthPicker(true);
  };

  const closeMonthPicker = () => {
    setShowMonthPicker(false);
  };

  const handleMonthConfirm = (pickedDate: Date) => {
    const next = new Date(pickedDate.getFullYear(), pickedDate.getMonth(), 1);
    setAnchorDate(next);
    closeMonthPicker();
  };

  const monthLabel = `${anchorDate.getFullYear()}/${String(anchorDate.getMonth() + 1).padStart(2, "0")}`;

  const handlePressDay = (iso: string) => {
    const normalized = normalizeToUtcDate(iso);
    if (Number.isNaN(normalized.getTime())) return;

    selectDateFromCalendar(normalized);
    const normalizedIso = toIsoDateString(normalized);
    navigation.push("Today", { isoDate: normalizedIso });
  };

  const todayDate = useMemo(() => toUtcDateOnly(new Date()), []);
  const todayIso = useMemo(() => toIsoDateString(todayDate), [todayDate]);
  const ageFormat = user?.settings.ageFormat ?? "md";
  const showDaysSinceBirth = user?.settings.showDaysSinceBirth ?? true;

  const todayAgeInfo = useMemo(() => {
    if (!user?.birthDate) return null;
    try {
      return calculateAgeInfo({
        targetDate: todayIso,
        birthDate: user.birthDate,
        dueDate: user.dueDate,
        showCorrectedUntilMonths: user.settings.showCorrectedUntilMonths,
        ageFormat,
      });
    } catch {
      return null;
    }
  }, [
    ageFormat,
    todayIso,
    user?.birthDate,
    user?.dueDate,
    user?.settings.showCorrectedUntilMonths,
  ]);

  const monthPickerValue = useMemo(
    () => new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1),
    [anchorDate]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        style={styles.backgroundLayer}
        pointerEvents="none"
        accessible={false}
      >
        <View style={styles.backgroundTop} />
        <View style={styles.backgroundBottom} />
      </View>
      <CalendarDecorations topOffset={insets.top} />
      <View style={styles.fixedHeader}>
        {user ? (
          <UserAvatar
            name={user.name}
            profilePhotoPath={user.profilePhotoPath}
            onPress={() =>
              rootNavigation.navigate("SettingsStack", {
                screen: "ProfileEdit",
                params: { profileId: user.id },
              })
            }
            size={64}
          />
        ) : null}
        <View style={styles.headerInfo}>
          <AppText style={styles.headerName} weight="medium">
            {user?.name ?? "プロフィール未設定"}
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
              {showDaysSinceBirth ? (
                <Text style={styles.headerDays}>
                  生まれてから{todayAgeInfo.daysSinceBirth}日目
                </Text>
              ) : null}
            </View>
          ) : (
            <Text style={styles.headerPlaceholder}>
              年齢情報は設定済みのプロフィールで表示されます
            </Text>
          )}
        </View>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroll}>
        <View style={styles.container}>
          <MonthHeader
            monthLabel={monthLabel}
            onPrev={handlePrev}
            onNext={handleNext}
            onToday={handleToday}
            onPressMonthLabel={openMonthPicker}
          />
          <View style={styles.weekRow}>
            {WEEK_LABELS.map((label, idx) => (
              <Text
                key={label}
                style={[
                  styles.weekLabel,
                  idx === 0 && { color: COLORS.sunday },
                  idx === 6 && { color: COLORS.saturday },
                  idx !== 0 && idx !== 6 && { color: COLORS.weekday },
                ]}
              >
                {label}
              </Text>
            ))}
          </View>
          <CalendarGrid days={monthView.days} onPressDay={handlePressDay} />
          <Text style={styles.footer}>
            出産予定日前の修正月齢は在胎週数で表示しています。
          </Text>
          <Text style={styles.footer}>
            修正月齢の表記は目安です。医療的判断は主治医にご相談ください。
          </Text>
        </View>
      </ScrollView>
      <TouchableOpacity
        style={styles.fab}
        accessibilityRole="button"
        onPress={() =>
          rootNavigation.navigate("RecordInput", { isoDate: todayIso })
        }
      >
        <Text style={styles.fabText}>＋記録</Text>
      </TouchableOpacity>
      <DatePickerModal
        visible={showMonthPicker}
        title="年月を選択"
        value={monthPickerValue}
        minimumDate={MIN_DATE}
        maximumDate={MAX_DATE}
        onConfirm={handleMonthConfirm}
        onCancel={closeMonthPicker}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundTop: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backgroundBottom: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  fixedHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.headerBackground,
    gap: 12,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  scroll: {
    backgroundColor: COLORS.background,
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
  headerPlaceholder: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  container: {
    flex: 1,
    gap: 12,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  weekLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  footer: {
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: 12,
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

export default CalendarScreen;
