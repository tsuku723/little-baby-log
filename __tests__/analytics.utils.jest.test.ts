const mockLogEvent = jest.fn().mockResolvedValue(undefined);

jest.mock("@react-native-firebase/analytics", () => {
  const analytics = () => ({ logEvent: mockLogEvent });
  return { __esModule: true, default: analytics };
});

const setupModule = (bundleIdentifier: string | undefined, isDev: boolean) => {
  jest.resetModules();
  jest.doMock("expo-constants", () => ({
    __esModule: true,
    default: { expoConfig: { ios: { bundleIdentifier } } },
  }));
  (global as any).__DEV__ = isDev;
  return require("../src/services/analytics");
};

describe("analytics service", () => {
  const originalDev = (global as any).__DEV__;

  afterEach(() => {
    jest.clearAllMocks();
    (global as any).__DEV__ = originalDev;
  });

  test("__DEV__ === true: logEventを送信しない", async () => {
    const { logRecordCreated } = setupModule(
      "com.example.app",
      /* isDev */ true
    );
    await logRecordCreated();
    expect(mockLogEvent).not.toHaveBeenCalled();
  });

  test("開発ビルド(.dev サフィックス)では送信しない", async () => {
    const { logRecordCreated } = setupModule(
      "studio.teeda.littlebabylog.dev",
      /* isDev */ false
    );
    await logRecordCreated();
    expect(mockLogEvent).not.toHaveBeenCalled();
  });

  test("本番相当ビルドでは各イベント名でlogEventが呼ばれる", async () => {
    const {
      logRecordCreated,
      logCalendarOpened,
      logTodayOpened,
      logProfileCreated,
    } = setupModule("studio.teeda.littlebabylog", /* isDev */ false);

    await logRecordCreated();
    expect(mockLogEvent).toHaveBeenCalledWith("record_created");

    await logCalendarOpened();
    expect(mockLogEvent).toHaveBeenCalledWith("calendar_opened");

    await logTodayOpened();
    expect(mockLogEvent).toHaveBeenCalledWith("today_opened");

    await logProfileCreated();
    expect(mockLogEvent).toHaveBeenCalledWith("profile_created");
  });

  test("logEventが失敗しても例外は外に伝播しない", async () => {
    mockLogEvent.mockRejectedValueOnce(new Error("network error"));
    const { logRecordCreated } = setupModule(
      "studio.teeda.littlebabylog",
      /* isDev */ false
    );
    await expect(logRecordCreated()).resolves.toBeUndefined();
  });
});
