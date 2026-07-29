import type analytics from "@react-native-firebase/analytics";

const guard = async (fn: () => Promise<void>) => {
  if (__DEV__) return;
  try {
    await fn();
  } catch {
    // analytics failures are non-critical
  }
};

const logEvent = (name: string) =>
  guard(() => {
    const getAnalytics: typeof analytics =
      require("@react-native-firebase/analytics").default;
    return getAnalytics().logEvent(name);
  });

export const logRecordCreated = () => logEvent("record_created");

export const logCalendarOpened = () => logEvent("calendar_opened");

export const logTodayOpened = () => logEvent("today_opened");

export const logProfileCreated = () => logEvent("profile_created");
