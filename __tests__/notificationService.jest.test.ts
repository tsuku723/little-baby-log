import * as Notifications from "expo-notifications";
import {
  requestNotificationPermissionAsync,
  scheduleMilestoneNotificationsForUserAsync,
  cancelMilestoneNotificationsForUserAsync,
  syncMilestoneNotificationsAsync,
} from "../src/services/notificationService";
import type { UserProfile } from "../src/state/AppStateContext";

const mockGetPermissions = Notifications.getPermissionsAsync as jest.Mock;
const mockRequestPermissions =
  Notifications.requestPermissionsAsync as jest.Mock;
const mockGetAllScheduled =
  Notifications.getAllScheduledNotificationsAsync as jest.Mock;
const mockSchedule = Notifications.scheduleNotificationAsync as jest.Mock;
const mockCancel = Notifications.cancelScheduledNotificationAsync as jest.Mock;

const baseUser: UserProfile = {
  id: "user-1",
  name: "たろう",
  birthDate: "2024-01-01",
  dueDate: null,
  settings: {
    showCorrectedUntilMonths: 24,
    ageFormat: "ymd",
    showDaysSinceBirth: true,
    lastViewedMonth: null,
    notifyMilestoneEnabled: true,
  },
  createdAt: "2024-01-01T00:00:00.000Z",
};

describe("notificationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllScheduled.mockResolvedValue([]);
    mockSchedule.mockResolvedValue("scheduled-id");
    mockCancel.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("requestNotificationPermissionAsync", () => {
    it("既に許可済みなら requestPermissionsAsync を呼ばない", async () => {
      mockGetPermissions.mockResolvedValue({ status: "granted" });

      const result = await requestNotificationPermissionAsync();

      expect(result).toBe(true);
      expect(mockRequestPermissions).not.toHaveBeenCalled();
    });

    it("未決定なら requestPermissionsAsync を呼び、結果を返す", async () => {
      mockGetPermissions.mockResolvedValue({ status: "undetermined" });
      mockRequestPermissions.mockResolvedValue({ status: "denied" });

      const result = await requestNotificationPermissionAsync();

      expect(result).toBe(false);
      expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
    });
  });

  describe("scheduleMilestoneNotificationsForUserAsync", () => {
    it("既存の当該ユーザーの通知をキャンセルしてから、未来のマイルストーンのみ予約する", async () => {
      jest.useFakeTimers().setSystemTime(new Date(2024, 3, 9)); // 2024-04-09（100日目の前日）

      mockGetAllScheduled.mockResolvedValue([
        { identifier: "milestone-user-1-days-100" },
        { identifier: "milestone-user-2-days-100" },
      ]);

      await scheduleMilestoneNotificationsForUserAsync(baseUser);

      expect(mockCancel).toHaveBeenCalledWith("milestone-user-1-days-100");
      expect(mockCancel).not.toHaveBeenCalledWith("milestone-user-2-days-100");

      const scheduledIdentifiers = mockSchedule.mock.calls.map(
        (call) => call[0].identifier
      );
      expect(scheduledIdentifiers).toContain("milestone-user-1-days-100");
      // 過去日付(days-100は明日なので含まれるが、既に過ぎた日は含まれないはず)
      expect(scheduledIdentifiers).not.toContain("milestone-user-1-days-1");
    });

    it("180日より先のマイルストーンは予約しない", async () => {
      jest.useFakeTimers().setSystemTime(new Date(2024, 0, 2)); // 出生翌日

      await scheduleMilestoneNotificationsForUserAsync(baseUser);

      const scheduledIdentifiers = mockSchedule.mock.calls.map(
        (call) => call[0].identifier
      );
      // days-1000(生後1000日目)は180日以内に収まらないため除外される
      expect(scheduledIdentifiers).not.toContain("milestone-user-1-days-1000");
      // days-100(生後100日目)は180日以内なので含まれる
      expect(scheduledIdentifiers).toContain("milestone-user-1-days-100");
    });
  });

  describe("cancelMilestoneNotificationsForUserAsync", () => {
    it("指定ユーザーのマイルストーン通知のみをキャンセルする", async () => {
      mockGetAllScheduled.mockResolvedValue([
        { identifier: "milestone-user-1-days-100" },
        { identifier: "milestone-user-2-days-100" },
        { identifier: "other-notification" },
      ]);

      await cancelMilestoneNotificationsForUserAsync("user-1");

      expect(mockCancel).toHaveBeenCalledTimes(1);
      expect(mockCancel).toHaveBeenCalledWith("milestone-user-1-days-100");
    });
  });

  describe("syncMilestoneNotificationsAsync", () => {
    it("notifyMilestoneEnabled が true のユーザーはスケジュールし、false のユーザーはキャンセルする", async () => {
      jest.useFakeTimers().setSystemTime(new Date(2024, 0, 2));

      const disabledUser: UserProfile = {
        ...baseUser,
        id: "user-2",
        settings: { ...baseUser.settings, notifyMilestoneEnabled: false },
      };

      await syncMilestoneNotificationsAsync([baseUser, disabledUser]);

      expect(mockSchedule).toHaveBeenCalled();
      const scheduledIdentifiers = mockSchedule.mock.calls.map(
        (call) => call[0].identifier
      );
      expect(scheduledIdentifiers.every((id) => id.includes("user-1"))).toBe(
        true
      );
    });
  });
});
