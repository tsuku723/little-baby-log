import React from "react";
import { Text } from "react-native";
import { act, render, waitFor } from "@testing-library/react-native";

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: (...args: any[]) => mockGetItem(...args),
    setItem: (...args: any[]) => mockSetItem(...args),
    removeItem: (...args: any[]) => mockRemoveItem(...args),
  },
}));

const mockLoadUserSettings = jest.fn();
const mockLoadAchievements = jest.fn();

jest.mock("../src/storage/storage", () => ({
  STORAGE_KEYS: {
    userSettings: "legacy_settings",
    achievementStore: "legacy_achievements",
  },
  loadUserSettings: (...args: any[]) => mockLoadUserSettings(...args),
  loadAchievements: (...args: any[]) => mockLoadAchievements(...args),
}));

jest.mock("uuid", () => ({
  v4: jest.fn(() => "uuid-fixed"),
}));

import {
  AppStateProvider,
  MAX_PROFILES,
  useAppState,
  useAchievements,
  useActiveUser,
  UserSettings,
} from "../src/state/AppStateContext";

const settings: UserSettings = {
  showCorrectedUntilMonths: 24,
  ageFormat: "ymd",
  showDaysSinceBirth: true,
  lastViewedMonth: null,
};

describe("AppStateContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockReset();
    mockSetItem.mockReset();
    mockRemoveItem.mockReset();
    mockLoadUserSettings.mockReset();
    mockLoadAchievements.mockReset();
  });

  test("useAppState throws outside provider", () => {
    const Probe = () => {
      useAppState();
      return <Text>ng</Text>;
    };
    expect(() => render(<Probe />)).toThrow(
      "useAppState must be used within AppStateProvider"
    );
  });

  test("initial load uses APP_STATE_KEY JSON and sets loading false", async () => {
    mockGetItem.mockResolvedValueOnce(
      JSON.stringify({
        users: [
          {
            id: "u1",
            name: "A",
            birthDate: "2025-01-01",
            dueDate: null,
            settings,
            createdAt: "2025-01-01T00:00:00.000Z",
          },
        ],
        activeUserId: "u1",
        achievements: { u1: [] },
      })
    );

    let captured: ReturnType<typeof useAppState> | null = null;
    const Probe = () => {
      captured = useAppState();
      return <Text>ok</Text>;
    };

    render(
      <AppStateProvider>
        <Probe />
      </AppStateProvider>
    );

    await waitFor(() => expect(captured?.loading).toBe(false));
    expect(captured!.state.activeUserId).toBe("u1");
    expect(captured!.state.users).toHaveLength(1);
  });

  test("addUser creates achievement list and sets active when null", async () => {
    mockGetItem
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    let captured: ReturnType<typeof useAppState> | null = null;
    const Probe = () => {
      captured = useAppState();
      return <Text>ok</Text>;
    };

    render(
      <AppStateProvider>
        <Probe />
      </AppStateProvider>
    );
    await waitFor(() => expect(captured?.loading).toBe(false));

    await act(async () => {
      await captured!.addUser({
        name: "Baby",
        birthDate: "2025-01-01",
        dueDate: null,
        settings,
      });
    });

    expect(captured!.state.users.map((u) => u.id)).toContain("uuid-fixed");
    expect(captured!.state.achievements["uuid-fixed"]).toEqual([]);
    expect(captured!.state.activeUserId).toBe("uuid-fixed");
  });

  test("setActiveUser ignores unknown user id", async () => {
    mockGetItem.mockResolvedValueOnce(
      JSON.stringify({
        users: [
          {
            id: "u1",
            name: "A",
            birthDate: "2025-01-01",
            dueDate: null,
            settings,
            createdAt: "t",
          },
          {
            id: "u2",
            name: "B",
            birthDate: "2025-01-02",
            dueDate: null,
            settings,
            createdAt: "t",
          },
        ],
        activeUserId: "u1",
        achievements: { u1: [], u2: [] },
      })
    );

    let captured: ReturnType<typeof useAppState> | null = null;
    const Probe = () => {
      captured = useAppState();
      return <Text>ok</Text>;
    };

    render(
      <AppStateProvider>
        <Probe />
      </AppStateProvider>
    );
    await waitFor(() => expect(captured?.loading).toBe(false));

    await act(async () => {
      await captured!.setActiveUser("missing");
    });

    expect(captured!.state.activeUserId).toBe("u1");
  });

  test("deleteUser switches active to next user or null", async () => {
    mockGetItem.mockResolvedValueOnce(
      JSON.stringify({
        users: [
          {
            id: "u1",
            name: "A",
            birthDate: "2025-01-01",
            dueDate: null,
            settings,
            createdAt: "t",
          },
          {
            id: "u2",
            name: "B",
            birthDate: "2025-01-02",
            dueDate: null,
            settings,
            createdAt: "t",
          },
        ],
        activeUserId: "u1",
        achievements: { u1: [], u2: [] },
      })
    );

    let captured: ReturnType<typeof useAppState> | null = null;
    const Probe = () => {
      captured = useAppState();
      return <Text>ok</Text>;
    };

    render(
      <AppStateProvider>
        <Probe />
      </AppStateProvider>
    );
    await waitFor(() => expect(captured?.loading).toBe(false));

    await act(async () => {
      await captured!.deleteUser("u1");
    });
    expect(captured!.state.activeUserId).toBe("u2");

    await act(async () => {
      await captured!.deleteUser("u2");
    });
    expect(captured!.state.activeUserId).toBeNull();
  });

  test("legacy migration loads old keys, removes legacy keys, persists app state", async () => {
    mockGetItem
      .mockResolvedValueOnce(null) // APP_STATE_KEY
      .mockResolvedValueOnce("{legacy-settings}")
      .mockResolvedValueOnce("{legacy-achievements}");

    mockLoadUserSettings.mockResolvedValue({
      birthDate: "2025-01-01",
      dueDate: "2025-02-01",
      showCorrectedUntilMonths: 12,
      ageFormat: "md",
      showDaysSinceBirth: false,
      lastViewedMonth: "2025-01-01",
    });
    mockLoadAchievements.mockResolvedValue({
      "2025-01-10": [
        {
          id: "a1",
          date: "2025-01-10",
          title: "x",
          tag: "did",
          createdAt: "c1",
        },
      ],
    });

    let captured: ReturnType<typeof useAppState> | null = null;
    const Probe = () => {
      captured = useAppState();
      return <Text>ok</Text>;
    };

    render(
      <AppStateProvider>
        <Probe />
      </AppStateProvider>
    );

    await waitFor(() => expect(captured?.loading).toBe(false));

    expect(mockRemoveItem).toHaveBeenCalledWith("legacy_settings");
    expect(mockRemoveItem).toHaveBeenCalledWith("legacy_achievements");
    expect(mockSetItem).toHaveBeenCalled();
    expect(captured!.state.users[0].id).toBe("uuid-fixed");
    expect(captured!.state.activeUserId).toBe("uuid-fixed");
    expect(captured!.state.achievements["uuid-fixed"][0].category).toBe(
      "growth"
    );
  });

  test("useActiveUser and useAchievements read derived values", async () => {
    mockGetItem.mockResolvedValueOnce(
      JSON.stringify({
        users: [
          {
            id: "u1",
            name: "A",
            birthDate: "2025-01-01",
            dueDate: null,
            settings,
            createdAt: "t",
          },
        ],
        activeUserId: "u1",
        achievements: {
          u1: [{ id: "a1", date: "2025-01-10", title: "x", createdAt: "t" }],
        },
      })
    );

    let activeUserName = "";
    let achievementCount = -1;

    const Probe = () => {
      const user = useActiveUser();
      const achievements = useAchievements();
      activeUserName = user?.name ?? "";
      achievementCount = achievements.length;
      return <Text>ok</Text>;
    };

    render(
      <AppStateProvider>
        <Probe />
      </AppStateProvider>
    );
    await waitFor(() => expect(achievementCount).toBe(1));
    expect(activeUserName).toBe("A");
  });

  test("broken APP_STATE_KEY falls back to empty state", async () => {
    const warnSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    mockGetItem
      .mockResolvedValueOnce("{broken-json") // APP_STATE_KEY
      .mockResolvedValueOnce(null) // legacy settings
      .mockResolvedValueOnce(null); // legacy achievements

    let captured: ReturnType<typeof useAppState> | null = null;
    const Probe = () => {
      captured = useAppState();
      return <Text>ok</Text>;
    };

    render(
      <AppStateProvider>
        <Probe />
      </AppStateProvider>
    );
    await waitFor(() => expect(captured?.loading).toBe(false));

    expect(captured!.state.users).toEqual([]);
    expect(captured!.state.activeUserId).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      "Failed to parse AppState; resetting",
      expect.any(Error)
    );
  });

  test("ensureStateIntegrity fixes invalid active user and missing achievements map", async () => {
    mockGetItem.mockResolvedValueOnce(
      JSON.stringify({
        users: [
          {
            id: "u1",
            name: "A",
            birthDate: "2025-01-01",
            dueDate: null,
            settings,
            createdAt: "t",
          },
        ],
        activeUserId: "missing-user",
        achievements: {},
      })
    );

    let captured: ReturnType<typeof useAppState> | null = null;
    const Probe = () => {
      captured = useAppState();
      return <Text>ok</Text>;
    };

    render(
      <AppStateProvider>
        <Probe />
      </AppStateProvider>
    );
    await waitFor(() => expect(captured?.loading).toBe(false));

    expect(captured!.state.activeUserId).toBe("u1");
    expect(captured!.state.achievements.u1).toEqual([]);
  });

  test("updateUser merges nested settings and keeps id", async () => {
    mockGetItem.mockResolvedValueOnce(
      JSON.stringify({
        users: [
          {
            id: "u1",
            name: "A",
            birthDate: "2025-01-01",
            dueDate: null,
            settings,
            createdAt: "t",
          },
        ],
        activeUserId: "u1",
        achievements: { u1: [] },
      })
    );

    let captured: ReturnType<typeof useAppState> | null = null;
    const Probe = () => {
      captured = useAppState();
      return <Text>ok</Text>;
    };

    render(
      <AppStateProvider>
        <Probe />
      </AppStateProvider>
    );
    await waitFor(() => expect(captured?.loading).toBe(false));

    await act(async () => {
      await captured!.updateUser("u1", {
        name: "Updated",
        settings: { ageFormat: "md" },
      });
    });

    expect(captured!.state.users[0].id).toBe("u1");
    expect(captured!.state.users[0].name).toBe("Updated");
    expect(captured!.state.users[0].settings.ageFormat).toBe("md");
    expect(captured!.state.users[0].settings.showDaysSinceBirth).toBe(true);
  });

  test("persist warning is emitted when AsyncStorage.setItem fails", async () => {
    const warnSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    mockGetItem
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockSetItem.mockRejectedValueOnce(new Error("persist-failure"));

    let captured: ReturnType<typeof useAppState> | null = null;
    const Probe = () => {
      captured = useAppState();
      return <Text>ok</Text>;
    };

    render(
      <AppStateProvider>
        <Probe />
      </AppStateProvider>
    );
    await waitFor(() => expect(captured?.loading).toBe(false));

    await act(async () => {
      await captured!.addUser({
        name: "Baby",
        birthDate: "2025-01-01",
        dueDate: null,
        settings,
      });
    });

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(
        "Failed to persist AppState",
        expect.any(Error)
      );
    });
  });

  test("legacy migration without settings keeps defaults and normalizes tried/unknown tags", async () => {
    mockGetItem
      .mockResolvedValueOnce(null) // APP_STATE_KEY
      .mockResolvedValueOnce(null) // legacy settings
      .mockResolvedValueOnce("{legacy-achievements}");

    mockLoadAchievements.mockResolvedValue({
      "2025-01-10": [
        { id: "a1", date: "2025-01-10", title: "x", tag: "tried" },
        { id: "a2", date: "2025-01-11", title: "y", tag: "other" },
      ],
    });

    let captured: ReturnType<typeof useAppState> | null = null;
    const Probe = () => {
      captured = useAppState();
      return <Text>ok</Text>;
    };

    render(
      <AppStateProvider>
        <Probe />
      </AppStateProvider>
    );
    await waitFor(() => expect(captured?.loading).toBe(false));

    expect(captured!.state.users[0].settings.ageFormat).toBe("ymd");
    expect(captured!.state.achievements["uuid-fixed"][0].category).toBe(
      "effort"
    );
    expect(captured!.state.achievements["uuid-fixed"][1].category).toBe(
      "growth"
    );
  });

  test("ensureStateIntegrity fills null users/achievements and useAchievements returns empty for missing active map", async () => {
    mockGetItem.mockResolvedValueOnce(
      JSON.stringify({ users: null, activeUserId: "ghost", achievements: null })
    );

    let captured: ReturnType<typeof useAppState> | null = null;
    let activeAchievements: ReturnType<typeof useAchievements> = [];
    const Probe = () => {
      captured = useAppState();
      activeAchievements = useAchievements();
      return <Text>ok</Text>;
    };

    render(
      <AppStateProvider>
        <Probe />
      </AppStateProvider>
    );
    await waitFor(() => expect(captured?.loading).toBe(false));

    expect(captured!.state.users).toEqual([]);
    expect(captured!.state.achievements).toEqual({});
    expect(activeAchievements).toEqual([]);
  });

  test("updateUser keeps non-target users unchanged", async () => {
    mockGetItem.mockResolvedValueOnce(
      JSON.stringify({
        users: [
          {
            id: "u1",
            name: "A",
            birthDate: "2025-01-01",
            dueDate: null,
            settings,
            createdAt: "t",
          },
          {
            id: "u2",
            name: "B",
            birthDate: "2025-01-02",
            dueDate: null,
            settings,
            createdAt: "t",
          },
        ],
        activeUserId: "u1",
        achievements: { u1: [], u2: [] },
      })
    );

    let captured: ReturnType<typeof useAppState> | null = null;
    const Probe = () => {
      captured = useAppState();
      return <Text>ok</Text>;
    };

    render(
      <AppStateProvider>
        <Probe />
      </AppStateProvider>
    );
    await waitFor(() => expect(captured?.loading).toBe(false));

    await act(async () => {
      await captured!.updateUser("u1", { name: "Updated" });
    });

    expect(captured!.state.users.find((u) => u.id === "u2")?.name).toBe("B");
  });

  test("add/update/delete achievement handle missing user bucket via fallback branches", async () => {
    mockGetItem.mockResolvedValueOnce(
      JSON.stringify({
        users: [
          {
            id: "u1",
            name: "A",
            birthDate: "2025-01-01",
            dueDate: null,
            settings,
            createdAt: "t",
          },
        ],
        activeUserId: "u1",
        achievements: { u1: [] },
      })
    );

    let captured: ReturnType<typeof useAppState> | null = null;
    let activeAchievements: ReturnType<typeof useAchievements> = [];
    const Probe = () => {
      captured = useAppState();
      activeAchievements = useAchievements();
      return <Text>ok</Text>;
    };

    render(
      <AppStateProvider>
        <Probe />
      </AppStateProvider>
    );
    await waitFor(() => expect(captured?.loading).toBe(false));

    await act(async () => {
      await captured!.addAchievement("u2", {
        id: "a1",
        date: "2025-01-10",
        title: "x",
        createdAt: "t",
      } as any);
    });
    expect(captured!.state.achievements.u2).toHaveLength(1);

    await act(async () => {
      await captured!.updateAchievement("u2", "a1", { title: "updated" });
      await captured!.deleteAchievement("u2", "a1");
      await captured!.deleteAchievement("u3", "none");
    });

    expect(captured!.state.achievements.u2).toEqual([]);
    expect(activeAchievements).toEqual([]);
  });

  test("legacy migration with settings-only uses empty achievements fallback", async () => {
    mockGetItem
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("{legacy-settings}")
      .mockResolvedValueOnce(null);
    mockLoadUserSettings.mockResolvedValue({
      birthDate: "2025-01-01",
      dueDate: null,
      showCorrectedUntilMonths: 18,
      ageFormat: "md",
      showDaysSinceBirth: false,
      lastViewedMonth: "2025-01-01",
    });

    let captured: ReturnType<typeof useAppState> | null = null;
    const Probe = () => {
      captured = useAppState();
      return <Text>ok</Text>;
    };

    render(
      <AppStateProvider>
        <Probe />
      </AppStateProvider>
    );
    await waitFor(() => expect(captured?.loading).toBe(false));

    expect(captured!.state.achievements["uuid-fixed"]).toEqual([]);
    expect(mockLoadAchievements).not.toHaveBeenCalled();
  });

  test("legacy migration skips non-array lists and fills defaults for missing id/date/title", async () => {
    mockGetItem
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("{legacy-settings}")
      .mockResolvedValueOnce("{legacy-achievements}");
    mockLoadUserSettings.mockResolvedValue({ birthDate: "2025-01-01" });
    mockLoadAchievements.mockResolvedValue({
      "2025-01-10": { bad: true },
      "2025-01-11": [{}],
    });

    let captured: ReturnType<typeof useAppState> | null = null;
    const Probe = () => {
      captured = useAppState();
      return <Text>ok</Text>;
    };

    render(
      <AppStateProvider>
        <Probe />
      </AppStateProvider>
    );
    await waitFor(() => expect(captured?.loading).toBe(false));

    const list = captured!.state.achievements["uuid-fixed"];
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("uuid-fixed");
    expect(list[0].date).toBe("");
    expect(list[0].title).toBe("");
  });

  test("deleteUser keeps active user when deleting non-active user and updateAchievement keeps list when id not found", async () => {
    mockGetItem.mockResolvedValueOnce(
      JSON.stringify({
        users: [
          {
            id: "u1",
            name: "A",
            birthDate: "2025-01-01",
            dueDate: null,
            settings,
            createdAt: "t",
          },
          {
            id: "u2",
            name: "B",
            birthDate: "2025-01-02",
            dueDate: null,
            settings,
            createdAt: "t",
          },
        ],
        activeUserId: "u1",
        achievements: {
          u1: [{ id: "a1", date: "2025-01-10", title: "x", createdAt: "t" }],
          u2: [],
        },
      })
    );

    let captured: ReturnType<typeof useAppState> | null = null;
    let activeAchievements: ReturnType<typeof useAchievements> = [];
    const Probe = () => {
      captured = useAppState();
      activeAchievements = useAchievements();
      return <Text>ok</Text>;
    };

    render(
      <AppStateProvider>
        <Probe />
      </AppStateProvider>
    );
    await waitFor(() => expect(captured?.loading).toBe(false));

    await act(async () => {
      await captured!.deleteUser("u2");
      await captured!.updateAchievement("u1", "missing", { title: "ignored" });
      await captured!.deleteAchievement("u1", "missing");
      await captured!.setActiveUser("u2");
    });

    expect(captured!.state.activeUserId).toBe("u1");
    expect(captured!.state.achievements.u1).toHaveLength(1);
    expect(activeAchievements).toHaveLength(1);

    expect(captured!.state.activeUserId).toBe("u1");
  });

  test("updateAchievement creates empty bucket when user achievements are missing", async () => {
    mockGetItem.mockResolvedValueOnce(
      JSON.stringify({
        users: [
          {
            id: "u1",
            name: "A",
            birthDate: "2025-01-01",
            dueDate: null,
            settings,
            createdAt: "t",
          },
        ],
        activeUserId: "u1",
        achievements: { u1: [] },
      })
    );

    let captured: ReturnType<typeof useAppState> | null = null;
    const Probe = () => {
      captured = useAppState();
      return <Text>ok</Text>;
    };

    render(
      <AppStateProvider>
        <Probe />
      </AppStateProvider>
    );
    await waitFor(() => expect(captured?.loading).toBe(false));

    await act(async () => {
      await captured!.updateAchievement("u-missing", "x", { title: "noop" });
    });

    expect(captured!.state.achievements["u-missing"]).toEqual([]);
  });

  test("addUser: 5人目まで登録できる", async () => {
    mockGetItem
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    let captured: ReturnType<typeof useAppState> | null = null;
    const Probe = () => {
      captured = useAppState();
      return <Text>ok</Text>;
    };

    render(
      <AppStateProvider>
        <Probe />
      </AppStateProvider>
    );
    await waitFor(() => expect(captured?.loading).toBe(false));

    for (let i = 1; i <= MAX_PROFILES; i++) {
      await act(async () => {
        await captured!.addUser({
          name: `Baby${i}`,
          birthDate: "2025-01-01",
          dueDate: null,
          settings,
          id: `u${i}`,
        });
      });
    }

    expect(captured!.state.users).toHaveLength(MAX_PROFILES);
  });

  test("addUser: 上限(5人)を超える登録は無視される", async () => {
    const initialUsers = Array.from({ length: MAX_PROFILES }, (_, i) => ({
      id: `u${i + 1}`,
      name: `Baby${i + 1}`,
      birthDate: "2025-01-01",
      dueDate: null,
      settings,
      createdAt: "t",
    }));
    const initialAchievements = Object.fromEntries(
      initialUsers.map((u) => [u.id, []])
    );

    mockGetItem.mockResolvedValueOnce(
      JSON.stringify({
        users: initialUsers,
        activeUserId: "u1",
        achievements: initialAchievements,
      })
    );

    let captured: ReturnType<typeof useAppState> | null = null;
    const Probe = () => {
      captured = useAppState();
      return <Text>ok</Text>;
    };

    render(
      <AppStateProvider>
        <Probe />
      </AppStateProvider>
    );
    await waitFor(() => expect(captured?.loading).toBe(false));

    await act(async () => {
      await captured!.addUser({
        name: "Baby6",
        birthDate: "2025-01-01",
        dueDate: null,
        settings,
        id: "u6",
      });
    });

    expect(captured!.state.users).toHaveLength(MAX_PROFILES);
    expect(captured!.state.users.find((u) => u.id === "u6")).toBeUndefined();
  });

  test("useAchievements returns empty when active user points to missing bucket", async () => {
    mockGetItem.mockResolvedValueOnce(
      JSON.stringify({
        users: [
          {
            id: "u1",
            name: "A",
            birthDate: "2025-01-01",
            dueDate: null,
            settings,
            createdAt: "t",
          },
        ],
        activeUserId: "u1",
        achievements: { u1: [] },
      })
    );

    let captured: ReturnType<typeof useAppState> | null = null;
    let achievements: ReturnType<typeof useAchievements> = [];
    const Probe = () => {
      captured = useAppState();
      achievements = useAchievements();
      return <Text>ok</Text>;
    };

    render(
      <AppStateProvider>
        <Probe />
      </AppStateProvider>
    );
    await waitFor(() => expect(captured?.loading).toBe(false));

    await act(async () => {
      await captured!.addUser({
        name: "B",
        birthDate: "2025-01-02",
        dueDate: null,
        settings,
        id: "u2",
      });
      await captured!.setActiveUser("u2");
      await captured!.deleteAchievement("u2", "none");
      await captured!.setActiveUser("u1");
      await captured!.deleteUser("u1");
      await captured!.addUser({
        name: "C",
        birthDate: "2025-01-03",
        dueDate: null,
        settings,
        id: "u3",
      });
      await captured!.setActiveUser("u3");
    });

    expect(achievements).toEqual([]);
  });
});
