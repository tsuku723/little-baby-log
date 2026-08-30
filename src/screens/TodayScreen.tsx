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
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Asset } from "expo-asset";
import * as MediaLibrary from "expo-media-library";
import ViewShot from "react-native-view-shot";

import { NavigationProp, useNavigation } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { Achievement } from "@/models/dataModels";
import {
  CalendarStackParamList,
  RootStackParamList,
  TabParamList,
} from "@/navigation";
import AgeBadge from "@/components/AgeBadge";
import AppText from "@/components/AppText";
import UserAvatar from "@/components/UserAvatar";
import { useActiveUser } from "@/state/AppStateContext";
import { useAchievements } from "@/state/AchievementsContext";
import { useDateViewContext } from "@/state/DateViewContext";
import {
  calculateAgeInfo,
  normalizeToUtcDate,
  toIsoDateString,
  toUtcDateOnly,
} from "@/utils/dateUtils";
import { ensureFileExistsAsync, resolvePhotoPath } from "@/utils/photo";
import { COLORS } from "@/constants/colors";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { logTodayOpened } from "@/services/analytics";

type RecordCardProps = {
  item: Achievement;
  onPress: () => void;
};

const RecordCard: React.FC<RecordCardProps> = ({ item, onPress }) => {
  const [resolvedPhoto, setResolvedPhoto] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    void ensureFileExistsAsync(item.photoPath ?? null).then((path) => {
      if (mounted) setResolvedPhoto(path);
    });
    return () => {
      mounted = false;
    };
  }, [item.photoPath]);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={styles.cardLeft}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title || "(タイトルなし)"}
        </Text>
        <Text style={styles.cardDate}>{item.date.replace(/-/g, "/")}</Text>
      </View>
      <View style={styles.cardThumb}>
        {resolvedPhoto ? (
          <Image
            source={{ uri: resolvePhotoPath(resolvedPhoto) }}
            style={styles.cardThumbImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.cardThumbPlaceholder}>
            <Ionicons
              name="camera-outline"
              size={24}
              color={COLORS.textSecondary}
            />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

type Props = NativeStackScreenProps<CalendarStackParamList, "Today">;
type RootNavigation = NavigationProp<RootStackParamList & TabParamList>;

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

const EXPORT_BACKGROUND_IMAGE = require("../../assets/export/bg_base_green.png");
const EXPORT_DECORATION_IMAGE = require("../../assets/export/deco_overlay_green.png");

// エクスポート画像（1024×1536px）上の座標・サイズ
const EXPORT_CANVAS = { WIDTH: 1024, HEIGHT: 1536 } as const;
const EXPORT_PHOTO_FRAME = {
  LEFT: 114,
  TOP: 161,
  WIDTH: 796,
  HEIGHT: 796,
} as const;
const EXPORT_AGE_BLOCK_TOP = 980;
const EXPORT_RECORD_CARD = { LEFT: 114, RIGHT: 114, TOP: 1140 } as const;
const EXPORT_DATE_BLOCK_TOP = 50;

const EXPORT_IMAGE_READY_TIMEOUT_MS = 3000;
const EXPORT_IMAGE_READY_POLL_INTERVAL_MS = 50;

const waitUntil = async (
  condition: () => boolean,
  timeoutMs = EXPORT_IMAGE_READY_TIMEOUT_MS
) => {
  const startedAt = Date.now();
  while (!condition() && Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) =>
      setTimeout(resolve, EXPORT_IMAGE_READY_POLL_INTERVAL_MS)
    );
  }
};

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
  const viewShotRef = useRef<ViewShot | null>(null);
  const [latestPhotoPath, setLatestPhotoPath] = useState<string | null>(null);
  const exportBackgroundLoadedRef = useRef(false);
  const exportDecorationLoadedRef = useRef(false);

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

  const handleSaveImage = async () => {
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "権限を確認してください",
          "写真へのアクセスを許可すると画像を保存できます。"
        );
        return;
      }

      // Expo Go等の開発環境ではrequire()画像がMetro経由で遅延取得されるため、
      // キャプチャ前に読み込み完了を保証する。Asset.loadAsyncはファイルの
      // ダウンロードのみ保証するため、<Image>側の描画完了(onLoadEnd)も待つ
      await Asset.loadAsync([EXPORT_BACKGROUND_IMAGE, EXPORT_DECORATION_IMAGE]);
      await waitUntil(
        () =>
          exportBackgroundLoadedRef.current && exportDecorationLoadedRef.current
      );

      const uri = await viewShotRef.current?.capture?.();
      if (!uri) {
        throw new Error("capture failed");
      }

      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("保存しました", "写真アプリに画像を保存しました。");
    } catch (error) {
      console.error("Failed to save day image", error);
      Alert.alert("保存に失敗しました", "時間をおいて再度お試しください。");
    }
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
              onPress={handleSaveImage}
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
      {/* 保存用の描画領域（画面には表示しない） */}
      <View style={styles.hiddenRenderer} pointerEvents="none">
        <ViewShot
          ref={viewShotRef}
          options={{ format: "png", quality: 1 }}
          style={styles.exportContainer}
        >
          <View style={styles.exportContent} collapsable={false}>
            <View style={styles.exportBackground}>
              <Image
                source={EXPORT_BACKGROUND_IMAGE}
                style={styles.exportBackgroundImage}
                resizeMode="contain"
                onLoadEnd={() => {
                  exportBackgroundLoadedRef.current = true;
                }}
              />
              <View style={styles.exportPhotoFrame}>
                {latestPhotoPath ? (
                  <Image
                    source={{ uri: resolvePhotoPath(latestPhotoPath) }}
                    style={styles.exportPhoto}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.exportPhotoPlaceholder} />
                )}
              </View>
              <View style={styles.exportDecorationOverlay} pointerEvents="none">
                <Image
                  source={EXPORT_DECORATION_IMAGE}
                  style={styles.exportDecorationImage}
                  resizeMode="contain"
                  onLoadEnd={() => {
                    exportDecorationLoadedRef.current = true;
                  }}
                />
              </View>
              <View style={styles.exportDateBlock}>
                <Text
                  style={styles.exportDateText}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  {exportDisplayDate}
                </Text>
              </View>

              <View style={styles.exportAgeBlock}>
                {ageInfo?.flags.showMode === "gestational" &&
                ageInfo.gestational.formatted ? (
                  <>
                    <Text style={styles.exportChronologicalAge}>
                      {ageInfo.chronological.formatted}
                    </Text>
                    <Text style={styles.exportCorrectedAge}>
                      （在胎 {ageInfo.gestational.formatted}）
                    </Text>
                  </>
                ) : ageInfo?.corrected.visible &&
                  ageInfo.corrected.formatted ? (
                  <>
                    <Text style={styles.exportChronologicalAge}>
                      {ageInfo.chronological.formatted}
                    </Text>
                    <Text style={styles.exportCorrectedAge}>
                      （修正 {ageInfo.corrected.formatted}）
                    </Text>
                  </>
                ) : (
                  <Text style={styles.exportChronologicalAge}>
                    {ageInfo?.chronological.formatted ?? "-"}
                  </Text>
                )}
              </View>

              <View style={styles.exportRecordCard}>
                {exportRecordLines.map((line, index) => (
                  <Text
                    key={`${line}-${index}`}
                    style={styles.exportRecordText}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {line}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        </ViewShot>
      </View>
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
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8,
  },
  cardLeft: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  cardDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  cardThumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: "hidden",
  },
  cardThumbImage: {
    width: "100%",
    height: "100%",
  },
  cardThumbPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.cellDimmed,
    alignItems: "center",
    justifyContent: "center",
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
  hiddenRenderer: {
    position: "absolute",
    top: 0,
    left: 0,
    opacity: 0,
  },
  exportContainer: {
    width: EXPORT_CANVAS.WIDTH,
    height: EXPORT_CANVAS.HEIGHT,
  },
  exportContent: {
    width: EXPORT_CANVAS.WIDTH,
    height: EXPORT_CANVAS.HEIGHT,
  },
  exportBackground: {
    width: "100%",
    height: "100%",
  },
  exportBackgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  exportPhotoFrame: {
    position: "absolute",
    left: EXPORT_PHOTO_FRAME.LEFT,
    top: EXPORT_PHOTO_FRAME.TOP,
    width: EXPORT_PHOTO_FRAME.WIDTH,
    height: EXPORT_PHOTO_FRAME.HEIGHT,
    borderRadius: 34,
    padding: 17,
    backgroundColor: "rgba(255,255,255,0.55)",
    overflow: "hidden",
  },
  exportPhoto: {
    width: "100%",
    height: "100%",
    borderRadius: 23,
    backgroundColor: COLORS.cellDimmed,
  },
  exportPhotoPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  exportAgeBlock: {
    position: "absolute",
    top: EXPORT_AGE_BLOCK_TOP,
    width: "100%",
    alignItems: "center",
    gap: 6,
    zIndex: 2,
  },
  exportChronologicalAge: {
    fontSize: 68,
    fontWeight: "800",
    color: "#3F5F55",
  },
  exportCorrectedAge: {
    fontSize: 32,
    fontWeight: "600",
    color: "#7F9C93",
  },
  exportRecordCard: {
    position: "absolute",
    left: EXPORT_RECORD_CARD.LEFT,
    right: EXPORT_RECORD_CARD.RIGHT,
    top: EXPORT_RECORD_CARD.TOP,
    borderRadius: 25,
    paddingVertical: 19,
    paddingHorizontal: 25,
    backgroundColor: "rgba(255,255,255,0.6)",
    zIndex: 2,
  },
  exportRecordText: {
    fontSize: 32,
    lineHeight: 43,
    color: "#2F4F4F",
  },
  exportDecorationOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  exportDecorationImage: {
    ...StyleSheet.absoluteFillObject,
  },
  exportDateBlock: {
    position: "absolute",
    top: EXPORT_DATE_BLOCK_TOP,
    width: "100%",
    alignItems: "center",
    zIndex: 2,
  },
  exportDateText: {
    fontSize: 44,
    fontWeight: "700",
    color: "#4E6F66",
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 23,
    paddingVertical: 11,
    paddingHorizontal: 21,
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
