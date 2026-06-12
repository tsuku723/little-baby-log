import analytics from "@react-native-firebase/analytics";

const guard = async (fn: () => Promise<void>) => {
  if (__DEV__) return;
  try {
    await fn();
  } catch {
    // analytics failures are non-critical
  }
};

export const logRecordCreated = () =>
  guard(() => analytics().logEvent("record_created"));

export const logCalendarOpened = () =>
  guard(() => analytics().logEvent("calendar_opened"));

export const logTodayOpened = () =>
  guard(() => analytics().logEvent("today_opened"));

export const logProfileCreated = () =>
  guard(() => analytics().logEvent("profile_created"));
