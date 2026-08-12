import { useEffect, useState } from "react";

import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
  PermissionStatus,
} from "expo-tracking-transparency";

const ATT_REQUESTED_KEY = "att_requested";

export function useTrackingPermission() {
  const [isResolved, setIsResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function requestIfNeeded() {
      const already = await AsyncStorage.getItem(ATT_REQUESTED_KEY);
      if (already) {
        if (!cancelled) setIsResolved(true);
        return;
      }

      const { status } = await getTrackingPermissionsAsync();
      if (status === PermissionStatus.UNDETERMINED) {
        await requestTrackingPermissionsAsync();
      }

      await AsyncStorage.setItem(ATT_REQUESTED_KEY, "true");
      if (!cancelled) setIsResolved(true);
    }

    // ウィンドウがアクティブになる前にATTダイアログを呼ぶと、
    // iOS側がダイアログを表示せず解決してしまうことがあるため、
    // アプリが完全にフォアグラウンド・アクティブになってからリクエストする
    if (AppState.currentState === "active") {
      requestIfNeeded();
      return () => {
        cancelled = true;
      };
    }

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        subscription.remove();
        requestIfNeeded();
      }
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  return isResolved;
}
