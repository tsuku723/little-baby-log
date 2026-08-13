jest.mock("expo-tracking-transparency", () => ({
  getTrackingPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ status: "undetermined" }),
  requestTrackingPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ status: "granted" }),
  PermissionStatus: {
    UNDETERMINED: "undetermined",
    GRANTED: "granted",
    DENIED: "denied",
  },
}));

jest.mock("react-native-google-mobile-ads", () => ({
  BannerAd: () => null,
  BannerAdSize: { BANNER: "BANNER" },
}));

jest.mock("react-native/Libraries/AppState/AppState", () => ({
  __esModule: true,
  default: {
    currentState: "active",
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
  },
}));
