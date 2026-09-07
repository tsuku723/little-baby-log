import type analytics from "@react-native-firebase/analytics";
import Constants from "expo-constants";

// 開発ビルド(studio.teeda.littlebabylog.dev)はGoogleService-Info.plistがTestFlight版と
// 同一のため、送信するとFirebase上でプロダクションのアナリティクスデータに混ざってしまう
const isDevelopmentBuild = Boolean(
  Constants.expoConfig?.ios?.bundleIdentifier?.endsWith(".dev")
);

const guard = async (fn: () => Promise<void>) => {
  if (__DEV__ || isDevelopmentBuild) return;
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
