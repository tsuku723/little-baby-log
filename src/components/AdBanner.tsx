import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { useTrackingReady } from "@/state/TrackingReadyContext";

const BANNER_AD_UNIT_ID = "ca-app-pub-8166243489339783/3517337126";
const BANNER_HEIGHT = 50;

const AdBanner: React.FC = () => {
  const isTrackingReady = useTrackingReady();

  if (__DEV__) {
    return (
      <View style={styles.placeholder} testID="ad-banner-placeholder">
        <Text style={styles.placeholderText}>Ad Banner</Text>
      </View>
    );
  }

  // ATT許諾フローが完了するまでAdMob SDKを初期化・広告リクエストさせない
  if (!isTrackingReady) {
    return null;
  }

  const { BannerAd, BannerAdSize } = require("react-native-google-mobile-ads");
  return (
    <View style={styles.bannerContainer} testID="ad-banner-real">
      <BannerAd unitId={BANNER_AD_UNIT_ID} size={BannerAdSize.BANNER} />
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    alignItems: "center",
  },
  placeholder: {
    height: BANNER_HEIGHT,
    backgroundColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: "#888",
    fontSize: 12,
  },
});

export default AdBanner;
