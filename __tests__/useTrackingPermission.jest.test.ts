import { renderHook, waitFor } from "@testing-library/react-native";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Tracking from "expo-tracking-transparency";
import { useTrackingPermission } from "../src/hooks/useTrackingPermission";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock("expo-tracking-transparency", () => ({
  getTrackingPermissionsAsync: jest.fn(),
  requestTrackingPermissionsAsync: jest.fn(),
  PermissionStatus: {
    UNDETERMINED: "undetermined",
    GRANTED: "granted",
    DENIED: "denied",
  },
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockGetTracking = Tracking.getTrackingPermissionsAsync as jest.Mock;
const mockRequestTracking =
  Tracking.requestTrackingPermissionsAsync as jest.Mock;

describe("useTrackingPermission", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetItem.mockResolvedValue(undefined);
    AppState.currentState = "active";
  });

  test("ATTステータスが未決定のとき、requestTrackingPermissionsAsync を呼ぶ", async () => {
    mockGetItem.mockResolvedValue(null);
    mockGetTracking.mockResolvedValue({ status: "undetermined" });
    mockRequestTracking.mockResolvedValue({ status: "granted" });

    renderHook(() => useTrackingPermission());

    await waitFor(() => {
      expect(mockRequestTracking).toHaveBeenCalledTimes(1);
    });
    expect(mockSetItem).toHaveBeenCalledWith("att_requested", "true");
  });

  test("ATTステータスが許可済みのとき、requestTrackingPermissionsAsync を呼ばない", async () => {
    mockGetItem.mockResolvedValue(null);
    mockGetTracking.mockResolvedValue({ status: "granted" });

    renderHook(() => useTrackingPermission());

    await waitFor(() => {
      expect(mockSetItem).toHaveBeenCalledWith("att_requested", "true");
    });
    expect(mockRequestTracking).not.toHaveBeenCalled();
  });

  test("ATTステータスが拒否済みのとき、requestTrackingPermissionsAsync を呼ばない", async () => {
    mockGetItem.mockResolvedValue(null);
    mockGetTracking.mockResolvedValue({ status: "denied" });

    renderHook(() => useTrackingPermission());

    await waitFor(() => {
      expect(mockSetItem).toHaveBeenCalledWith("att_requested", "true");
    });
    expect(mockRequestTracking).not.toHaveBeenCalled();
  });

  test("AsyncStorage にリクエスト済みフラグがある場合、ダイアログをスキップする", async () => {
    mockGetItem.mockResolvedValue("true");

    renderHook(() => useTrackingPermission());

    await waitFor(() => {
      expect(mockGetItem).toHaveBeenCalledWith("att_requested");
    });
    expect(mockGetTracking).not.toHaveBeenCalled();
    expect(mockRequestTracking).not.toHaveBeenCalled();
  });

  test("アプリがアクティブでないとき、activeになるまでリクエストを待つ", async () => {
    // @ts-ignore
    AppState.currentState = "background";
    let changeHandler: ((state: string) => void) | undefined;
    (AppState.addEventListener as jest.Mock).mockImplementation(
      (_event, handler) => {
        changeHandler = handler;
        return { remove: jest.fn() };
      }
    );

    mockGetItem.mockResolvedValue(null);
    mockGetTracking.mockResolvedValue({ status: "undetermined" });
    mockRequestTracking.mockResolvedValue({ status: "granted" });

    renderHook(() => useTrackingPermission());

    expect(mockGetTracking).not.toHaveBeenCalled();

    changeHandler?.("active");

    await waitFor(() => {
      expect(mockRequestTracking).toHaveBeenCalledTimes(1);
    });
  });
});
