import React from "react";
import { StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import {
  useFonts,
  ZenMaruGothic_400Regular,
  ZenMaruGothic_500Medium,
} from "@expo-google-fonts/zen-maru-gothic";

import Navigator from "@/navigation";
import { AppStateProvider } from "@/state/AppStateContext";
import { AchievementsProvider } from "@/state/AchievementsContext";
import { GrowthRecordsProvider } from "@/state/GrowthRecordsContext";
import { TrackingReadyProvider } from "@/state/TrackingReadyContext";
import { useTrackingPermission } from "@/hooks/useTrackingPermission";

const App: React.FC = () => {
  const isTrackingReady = useTrackingPermission();
  const [fontsLoaded] = useFonts({
    "ZenMaruGothic-Regular": ZenMaruGothic_400Regular,
    "ZenMaruGothic-Medium": ZenMaruGothic_500Medium,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar barStyle="dark-content" />
        <AppStateProvider>
          <AchievementsProvider>
            <GrowthRecordsProvider>
              <TrackingReadyProvider value={isTrackingReady}>
                <Navigator />
              </TrackingReadyProvider>
            </GrowthRecordsProvider>
          </AchievementsProvider>
        </AppStateProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
};

export default App;
