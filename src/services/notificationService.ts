import * as Notifications from "expo-notifications";

import type { UserProfile } from "@/state/AppStateContext";
import { todayIsoDate } from "@/utils/dateUtils";
import { calculateMilestones } from "@/utils/milestones";

const NOTIFICATION_HOUR = 9;
const IDENTIFIER_PREFIX = "milestone-";
// iOSのスケジュール上限(64件)に収めるため、直近のマイルストームのみを予約する。
// アプリ起動のたびに再同期されるため、この期間を超えて未起動でも
// 次回起動時に以降のマイルストーンが予約し直される。
const SCHEDULE_WINDOW_DAYS = 180;

const buildIdentifier = (userId: string, milestoneKey: string): string =>
  `${IDENTIFIER_PREFIX}${userId}-${milestoneKey}`;

export const requestNotificationPermissionAsync =
  async (): Promise<boolean> => {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    if (existingStatus === "granted") return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  };

export const cancelMilestoneNotificationsForUserAsync = async (
  userId: string
): Promise<void> => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const prefix = buildIdentifier(userId, "");
  const targets = scheduled.filter((item) =>
    item.identifier.startsWith(prefix)
  );
  await Promise.all(
    targets.map((item) =>
      Notifications.cancelScheduledNotificationAsync(item.identifier)
    )
  );
};

export const scheduleMilestoneNotificationsForUserAsync = async (
  user: UserProfile
): Promise<void> => {
  await cancelMilestoneNotificationsForUserAsync(user.id);

  const milestones = calculateMilestones({
    birthDate: user.birthDate,
    dueDate: user.dueDate,
  });
  const todayIso = todayIsoDate();
  const windowEnd = new Date();
  windowEnd.setDate(windowEnd.getDate() + SCHEDULE_WINDOW_DAYS);

  const targets = milestones
    .filter((milestone) => milestone.date > todayIso)
    .map((milestone) => {
      const [y, m, d] = milestone.date.split("-").map(Number);
      const triggerDate = new Date(y, m - 1, d, NOTIFICATION_HOUR, 0, 0);
      return { milestone, triggerDate };
    })
    .filter(({ triggerDate }) => triggerDate <= windowEnd);

  await Promise.all(
    targets.map(({ milestone, triggerDate }) =>
      Notifications.scheduleNotificationAsync({
        identifier: buildIdentifier(user.id, milestone.key),
        content: {
          title: `${user.name}の成長記録`,
          body: milestone.title,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      })
    )
  );
};

/**
 * 全プロフィールの通知設定に合わせて、ローカル通知の予約状態を同期する。
 * アプリ起動時、およびプロフィール保存時に呼び出す。
 */
export const syncMilestoneNotificationsAsync = async (
  users: UserProfile[]
): Promise<void> => {
  await Promise.all(
    users.map((user) =>
      user.settings.notifyMilestoneEnabled
        ? scheduleMilestoneNotificationsForUserAsync(user)
        : cancelMilestoneNotificationsForUserAsync(user.id)
    )
  );
};
