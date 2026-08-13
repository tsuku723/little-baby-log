import React from "react";
import { StatusBar, View } from "react-native";

import {
  useFonts,
  ZenMaruGothic_400Regular,
  ZenMaruGothic_500Medium,
} from "@expo-google-fonts/zen-maru-gothic";

import Navigator from "@/navigation";
import { AppStateProvider } from "@/state/AppStateContext";
import { AchievementsProvider } from "@/state/AchievementsContext";
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
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      <AppStateProvider>
        <AchievementsProvider>
          <TrackingReadyProvider value={isTrackingReady}>
            <Navigator />
          </TrackingReadyProvider>
        </AchievementsProvider>
      </AppStateProvider>
    </View>
  );
};

export default App;
