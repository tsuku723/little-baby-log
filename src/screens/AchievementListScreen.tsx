import React, { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { NavigationProp, useNavigation } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { Achievement, AgeInfo } from "@/models/dataModels";
import {
  RecordListStackParamList,
  RootStackParamList,
  TabParamList,
} from "@/navigation";
import AgeBadge from "@/components/AgeBadge";
import AppText from "@/components/AppText";
import DatePickerModal from "@/components/DatePickerModal";
import UserAvatar from "@/components/UserAvatar";
import { useAchievements } from "@/state/AchievementsContext";
import { useActiveUser } from "@/state/AppStateContext";
import {
  calculateAgeInfo,
  isIsoDateString,
  safeParseIsoLocal,
  toIsoDateString,
  toUtcDateOnly,
} from "@/utils/dateUtils";
import { groupRecordsByMonth } from "@/utils/groupRecordsByMonth";
import { resolvePhotoPath } from "@/utils/photo";
import { normalizeSearchText } from "@/utils/text";
import { COLORS } from "@/constants/colors";

type Props = NativeStackScreenProps<
  RecordListStackParamList,
  "AchievementList"
>;
type RootNavigation = NavigationProp<RootStackParamList & TabParamList>;

type ListRow =
  | { type: "sectionHeader"; key: string; monthLabel: string }
  | { type: "featured"; key: string; record: Achievement }
  | { type: "standard"; key: string; record: Achievement };

const dateLabel = (iso: string): string => iso.replace(/-/g, "/");

const startOfLocalDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());
const cloneDate = (d: Date) => new Date(d.getTime());

const toIsoDateFromPicker = (picked: Date): string => toIsoDateString(picked);

const getPickerDate = (value: string | null, fallback: Date): Date => {
  const parsed = safeParseIsoLocal(
    value && isIsoDateString(value) ? value : null,
    fallback
  );
  if (Number.isNaN(parsed.getTime())) return cloneDate(fallback);
  return cloneDate(parsed);
};

const AchievementListScreen: React.FC<Props> = () => {
  const rootNavigation = useNavigation<RootNavigation>();
  const user = useActiveUser();
  const { loading, store } = useAchievements();
  const [searchText, setSearchText] = useState<string>("");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [isFilterExpanded, setFilterExpanded] = useState(false);
  const today = useMemo(() => startOfLocalDay(new Date()), []);
  const todayIso = useMemo(
    () => toIsoDateString(toUtcDateOnly(new Date())),
    []
  );
  const MIN_DATE = useMemo(() => new Date(1900, 0, 1), []);
  const MAX_DATE = useMemo(() => new Date(2100, 11, 31), []);
  const [pickerTarget, setPickerTarget] = useState<"from" | "to" | null>(null);
  const [pickerValue, setPickerValue] = useState<Date>(today);

  const applyFromDate = (nextFrom: string | null) => {
    setFromDate(nextFrom);
    if (nextFrom && toDate && isIsoDateString(toDate) && nextFrom > toDate) {
      setToDate(nextFrom);
    }
  };

  const applyToDate = (nextTo: string | null) => {
    setToDate(nextTo);
    if (nextTo && fromDate && isIsoDateString(fromDate) && nextTo < fromDate) {
      setFromDate(nextTo);
    }
  };

  const openPicker = (target: "from" | "to") => {
    setPickerTarget(target);
    setPickerValue(getPickerDate(target === "from" ? fromDate : toDate, today));
  };

  const items = useMemo(() => {
    const allList: Achievement[] = Object.values(store).flat();
    const normalizedQuery = normalizeSearchText(searchText);
    const filteredBySearch = normalizedQuery
      ? allList.filter((item) => {
          const normalizedTarget = normalizeSearchText(
            `${item.title} ${item.memo ?? ""}`
          );
          return normalizedTarget.includes(normalizedQuery);
        })
      : allList;
    const validFrom = fromDate && isIsoDateString(fromDate) ? fromDate : null;
    const validTo = toDate && isIsoDateString(toDate) ? toDate : null;
    const filteredByRange = filteredBySearch.filter((item) => {
      if (validFrom && item.date < validFrom) return false;
      if (validTo && item.date > validTo) return false;
      return true;
    });
    return filteredByRange.slice().sort((a, b) => {
      if (a.date === b.date)
        return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
      return b.date.localeCompare(a.date);
    });
  }, [fromDate, searchText, store, toDate]);

  const todayAgeInfo = useMemo((): AgeInfo | null => {
    if (!user?.birthDate) return null;
    try {
      return calculateAgeInfo({
        targetDate: toIsoDateString(toUtcDateOnly(new Date())),
        birthDate: user.birthDate,
        dueDate: user.dueDate,
        showCorrectedUntilMonths: user.settings.showCorrectedUntilMonths,
        ageFormat: user.settings.ageFormat,
      });
    } catch {
      return null;
    }
  }, [user]);

  const ageInfoByRecordId = useMemo((): Map<string, AgeInfo | null> => {
    const map = new Map<string, AgeInfo | null>();
    if (!user?.birthDate) return map;
    for (const record of items) {
      try {
        map.set(
          record.id,
          calculateAgeInfo({
            targetDate: record.date,
            birthDate: user.birthDate,
            dueDate: user.dueDate,
            showCorrectedUntilMonths: user.settings.showCorrectedUntilMonths,
            ageFormat: user.settings.ageFormat,
          })
        );
      } catch {
        map.set(record.id, null);
      }
    }
    return map;
  }, [items, user]);

  const listRows = useMemo((): ListRow[] => {
    const sections = groupRecordsByMonth(items);
    const rows: ListRow[] = [];
    for (const section of sections) {
      rows.push({
        key: `header-${section.monthKey}`,
        type: "sectionHeader",
        monthLabel: section.monthLabel,
      });
      for (const record of section.records) {
        const isFeatured = record.id === section.featuredId;
        rows.push({
          key: record.id,
          type: isFeatured ? "featured" : "standard",
          record,
        });
      }
    }
    return rows;
  }, [items]);

  const renderAgeBadge = (ageInfo: AgeInfo | null) => {
    if (!ageInfo) return null;
    if (
      ageInfo.flags.showMode === "gestational" &&
      ageInfo.gestational.formatted
    ) {
      return (
        <AgeBadge
          label={`在胎 ${ageInfo.gestational.formatted}`}
          variant="gestational"
        />
      );
    }
    if (ageInfo.corrected.visible && ageInfo.corrected.formatted) {
      return (
        <AgeBadge
          label={`修正 ${ageInfo.corrected.formatted}`}
          variant="corrected"
        />
      );
    }
    return null;
  };

  const renderFeaturedCard = (record: Achievement) => {
    const ageInfo = ageInfoByRecordId.get(record.id) ?? null;
    return (
      <TouchableOpacity
        key={record.id}
        style={styles.featuredCard}
        onPress={() =>
          rootNavigation.navigate("RecordDetail", {
            recordId: record.id,
            from: "list",
          })
        }
        accessibilityRole="button"
      >
        {record.photoPath ? (
          <Image
            source={{ uri: resolvePhotoPath(record.photoPath) }}
            style={styles.featuredPhoto}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.featuredPhoto, styles.photoPlaceholder]}>
            <Ionicons
              name="camera-outline"
              size={36}
              color={COLORS.textSecondary}
            />
          </View>
        )}
        <View style={styles.featuredContent}>
          <Text style={styles.featuredTitle} numberOfLines={2}>
            {record.title || "(タイトルなし)"}
          </Text>
          <View style={styles.cardMeta}>
            {renderAgeBadge(ageInfo)}
            <Text style={styles.cardDate}>{dateLabel(record.date)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderStandardCard = (record: Achievement) => {
    const ageInfo = ageInfoByRecordId.get(record.id) ?? null;
    return (
      <TouchableOpacity
        key={record.id}
        style={styles.standardCard}
        onPress={() =>
          rootNavigation.navigate("RecordDetail", {
            recordId: record.id,
            from: "list",
          })
        }
        accessibilityRole="button"
      >
        <View style={styles.standardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {record.title || "(タイトルなし)"}
          </Text>
          {record.memo ? (
            <Text style={styles.cardMemo} numberOfLines={2}>
              {record.memo}
            </Text>
          ) : null}
          <View style={styles.cardMeta}>
            {renderAgeBadge(ageInfo)}
            <Text style={styles.cardDate}>{dateLabel(record.date)}</Text>
          </View>
        </View>
        <View style={styles.thumbnailArea}>
          {record.photoPath ? (
            <Image
              source={{ uri: resolvePhotoPath(record.photoPath) }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Ionicons
                name="camera-outline"
                size={22}
                color={COLORS.textSecondary}
              />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderRow = ({ item }: { item: ListRow }) => {
    if (item.type === "sectionHeader") {
      return <Text style={styles.sectionHeader}>{item.monthLabel}</Text>;
    }
    if (item.type === "featured") {
      return renderFeaturedCard(item.record);
    }
    return renderStandardCard(item.record);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        {user ? (
          <UserAvatar
            name={user.name}
            profilePhotoPath={user.profilePhotoPath}
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
              {user?.settings.showDaysSinceBirth ? (
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
      <View style={styles.content}>
        <View style={styles.filterBar}>
          <Ionicons name="search" size={18} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="タイトル / メモを検索"
            value={searchText}
            onChangeText={(text) => setSearchText(text)}
            accessibilityLabel="フリーワード検索"
          />
          <TouchableOpacity
            onPress={() => setFilterExpanded((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel="絞り込みを切り替える"
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>
        {isFilterExpanded ? (
          <View style={styles.filterPanel}>
            <TouchableOpacity
              style={styles.filterRow}
              onPress={() => openPicker("from")}
              accessibilityRole="button"
              accessibilityLabel="開始日を選択"
            >
              <Text style={styles.filterLabel}>From</Text>
              <Text style={styles.filterValue}>{fromDate ?? "未設定"}</Text>
              <Ionicons
                name="calendar-outline"
                size={18}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterRow}
              onPress={() => openPicker("to")}
              accessibilityRole="button"
              accessibilityLabel="終了日を選択"
            >
              <Text style={styles.filterLabel}>To</Text>
              <Text style={styles.filterValue}>{toDate ?? "未設定"}</Text>
              <Ionicons
                name="calendar-outline"
                size={18}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setFromDate(null);
                setToDate(null);
              }}
              accessibilityRole="button"
            >
              <Text style={styles.clearButtonText}>範囲クリア</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <FlatList
          data={listRows}
          keyExtractor={(item) => item.key}
          renderItem={renderRow}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {loading ? "読み込み中..." : "まだ記録がありません"}
            </Text>
          }
        />
      </View>
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
        visible={pickerTarget !== null}
        title={pickerTarget === "from" ? "From" : "To"}
        value={pickerValue}
        minimumDate={MIN_DATE}
        maximumDate={MAX_DATE}
        onCancel={() => setPickerTarget(null)}
        onConfirm={(date) => {
          if (!pickerTarget) {
            setPickerTarget(null);
            return;
          }
          const iso = toIsoDateFromPicker(date);
          if (pickerTarget === "from") {
            applyFromDate(iso);
          } else {
            applyToDate(iso);
          }
          setPickerTarget(null);
        }}
      />
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
  headerPlaceholder: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  filterPanel: {
    gap: 6,
  },
  filterRow: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  filterLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    width: 44,
  },
  filterValue: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  clearButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  clearButtonText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  list: {
    gap: 10,
    paddingBottom: 120,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textSecondary,
    paddingTop: 8,
    paddingBottom: 2,
  },
  featuredCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  featuredPhoto: {
    width: "100%",
    height: 180,
    backgroundColor: COLORS.cellDimmed,
  },
  featuredContent: {
    padding: 12,
    gap: 6,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  standardCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  standardContent: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  cardMemo: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  cardDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: "auto",
  },
  thumbnailArea: {
    justifyContent: "flex-start",
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: COLORS.cellDimmed,
  },
  thumbnailPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  photoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
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

export default AchievementListScreen;
