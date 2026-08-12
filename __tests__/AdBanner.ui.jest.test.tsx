import React from "react";
import { render } from "@testing-library/react-native";

import AdBanner from "@/components/AdBanner";
import { TrackingReadyProvider } from "@/state/TrackingReadyContext";

jest.mock("react-native-google-mobile-ads", () => ({
  BannerAd: () => null,
  BannerAdSize: { BANNER: "BANNER" },
}));

describe("AdBanner", () => {
  const originalDev = __DEV__;

  afterEach(() => {
    // @ts-ignore
    global.__DEV__ = originalDev;
  });

  test("__DEV__ === true のとき、プレースホルダーを表示する", () => {
    // @ts-ignore
    global.__DEV__ = true;
    const { getByTestId } = render(<AdBanner />);
    expect(getByTestId("ad-banner-placeholder")).toBeTruthy();
  });

  test("ATT許諾フローが未完了のとき、何も表示しない", () => {
    // @ts-ignore
    global.__DEV__ = false;
    const { queryByTestId } = render(
      <TrackingReadyProvider value={false}>
        <AdBanner />
      </TrackingReadyProvider>
    );
    expect(queryByTestId("ad-banner-real")).toBeNull();
  });

  test("ATT許諾フロー完了後、AdMob バナーをレンダリングする", () => {
    // @ts-ignore
    global.__DEV__ = false;
    const { getByTestId } = render(
      <TrackingReadyProvider value={true}>
        <AdBanner />
      </TrackingReadyProvider>
    );
    expect(getByTestId("ad-banner-real")).toBeTruthy();
  });
});
