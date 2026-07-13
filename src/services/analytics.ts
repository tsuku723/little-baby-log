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
    const analytics = require("@react-native-firebase/analytics").default;
    return analytics().logEvent(name);
  });

export const logRecordCreated = () => logEvent("record_created");

export const logCalendarOpened = () => logEvent("calendar_opened");

export const logTodayOpened = () => logEvent("today_opened");

export const logProfileCreated = () => logEvent("profile_created");
