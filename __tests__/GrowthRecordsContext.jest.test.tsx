import React from "react";
import { Text } from "react-native";
import { act, render, waitFor } from "@testing-library/react-native";

jest.mock("uuid", () => ({
  v4: jest.fn(() => "rec-fixed-id"),
}));

jest.mock("@/state/AppStateContext", () => ({
  useAppState: jest.fn(),
  useActiveUser: jest.fn(),
}));

import { useAppState, useActiveUser } from "@/state/AppStateContext";
import {
  GrowthRecordsProvider,
  useGrowthRecords,
} from "../src/state/GrowthRecordsContext";

const mockUseAppState = useAppState as jest.Mock;
const mockUseActiveUser = useActiveUser as jest.Mock;

const buildAppStateMock = (overrides: {
  activeUserId?: string | null;
  growthRecords?: Record<string, any[]>;
  addGrowthRecord?: jest.Mock;
  updateGrowthRecord?: jest.Mock;
  deleteGrowthRecord?: jest.Mock;
}) => ({
  state: {
    activeUserId: "activeUserId" in overrides ? overrides.activeUserId : "u1",
    growthRecords: overrides.growthRecords ?? {},
  },
  addGrowthRecord: overrides.addGrowthRecord ?? jest.fn(async () => undefined),
  updateGrowthRecord:
    overrides.updateGrowthRecord ?? jest.fn(async () => undefined),
  deleteGrowthRecord:
    overrides.deleteGrowthRecord ?? jest.fn(async () => undefined),
});

let growCtx: ReturnType<typeof useGrowthRecords> | null;

const Probe = () => {
  growCtx = useGrowthRecords();
  return <Text>{growCtx.records.length}</Text>;
};

const renderProvider = () =>
  render(
    <GrowthRecordsProvider>
      <Probe />
    </GrowthRecordsProvider>
  );

describe("GrowthRecordsContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    growCtx = null;
  });

  test("useGrowthRecords throws outside provider", () => {
    const ProbeOutside = () => {
      useGrowthRecords();
      return <Text>ng</Text>;
    };

    expect(() => render(<ProbeOutside />)).toThrow(
      "useGrowthRecords must be used within GrowthRecordsProvider"
    );
  });

  test("upsert skips and warns when user is missing", async () => {
    const warnSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    mockUseActiveUser.mockReturnValue(null);
    mockUseAppState.mockReturnValue(buildAppStateMock({ activeUserId: null }));

    renderProvider();
    await waitFor(() => expect(growCtx).not.toBeNull());

    await act(async () => {
      await growCtx!.upsert({ date: "2026-01-10", weightKg: 3.5 });
    });

    expect(warnSpy).toHaveBeenCalledWith("upsert skipped: active user not set");
  });

  test("upsert skips and warns when activeUserId is missing even if user is set", async () => {
    const warnSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    mockUseActiveUser.mockReturnValue({ id: "u1", name: "Baby" });
    mockUseAppState.mockReturnValue(buildAppStateMock({ activeUserId: null }));

    renderProvider();
    await waitFor(() => expect(growCtx).not.toBeNull());

    await act(async () => {
      await growCtx!.upsert({ date: "2026-01-10", weightKg: 3.5 });
    });

    expect(warnSpy).toHaveBeenCalledWith("upsert skipped: active user not set");
  });

  test("upsert errors and skips when date is not ISO format", async () => {
    const errorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const addGrowthRecord = jest.fn(async () => undefined);
    mockUseActiveUser.mockReturnValue({ id: "u1", name: "Baby" });
    mockUseAppState.mockReturnValue(buildAppStateMock({ addGrowthRecord }));

    renderProvider();
    await waitFor(() => expect(growCtx).not.toBeNull());

    await act(async () => {
      await growCtx!.upsert({ date: "2026/01/10", weightKg: 3.5 });
    });

    expect(errorSpy).toHaveBeenCalledWith(
      "Invalid date format in upsert: 2026/01/10"
    );
    expect(addGrowthRecord).not.toHaveBeenCalled();
  });

  test("upsert calls addGrowthRecord for a new record", async () => {
    const addGrowthRecord = jest.fn(async () => undefined);
    mockUseActiveUser.mockReturnValue({ id: "u1", name: "Baby" });
    mockUseAppState.mockReturnValue(buildAppStateMock({ addGrowthRecord }));

    renderProvider();
    await waitFor(() => expect(growCtx).not.toBeNull());

    await act(async () => {
      await growCtx!.upsert({ date: "2026-01-10", weightKg: 3.5 });
    });

    expect(addGrowthRecord).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({
        id: "rec-fixed-id",
        date: "2026-01-10",
        weightKg: 3.5,
      })
    );
  });

  test("upsert calls updateGrowthRecord and keeps original createdAt for an existing record", async () => {
    const updateGrowthRecord = jest.fn(async () => undefined);
    mockUseActiveUser.mockReturnValue({ id: "u1", name: "Baby" });
    mockUseAppState.mockReturnValue(
      buildAppStateMock({
        updateGrowthRecord,
        growthRecords: {
          u1: [
            {
              id: "rec-fixed-id",
              date: "2026-01-10",
              weightKg: 3.5,
              createdAt: "2026-01-10T00:00:00.000Z",
            },
          ],
        },
      })
    );

    renderProvider();
    await waitFor(() => expect(growCtx).not.toBeNull());

    await act(async () => {
      await growCtx!.upsert({
        id: "rec-fixed-id",
        date: "2026-01-10",
        weightKg: 4.2,
      });
    });

    expect(updateGrowthRecord).toHaveBeenCalledWith(
      "u1",
      "rec-fixed-id",
      expect.objectContaining({
        id: "rec-fixed-id",
        weightKg: 4.2,
        createdAt: "2026-01-10T00:00:00.000Z",
      })
    );
  });

  test("upsert sets loading true during save and false afterwards", async () => {
    let resolveSave: () => void = () => undefined;
    const addGrowthRecord = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        })
    );
    mockUseActiveUser.mockReturnValue({ id: "u1", name: "Baby" });
    mockUseAppState.mockReturnValue(buildAppStateMock({ addGrowthRecord }));

    renderProvider();
    await waitFor(() => expect(growCtx).not.toBeNull());

    expect(growCtx!.loading).toBe(false);

    let savePromise: Promise<void>;
    act(() => {
      savePromise = growCtx!.upsert({ date: "2026-01-10", weightKg: 3.5 });
    });

    await waitFor(() => expect(growCtx!.loading).toBe(true));

    await act(async () => {
      resolveSave();
      await savePromise;
    });

    expect(growCtx!.loading).toBe(false);
  });

  test("upsert throws and resets loading when persistence fails", async () => {
    const errorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const addGrowthRecord = jest.fn(async () => {
      throw new Error("save-fail");
    });
    mockUseActiveUser.mockReturnValue({ id: "u1", name: "Baby" });
    mockUseAppState.mockReturnValue(buildAppStateMock({ addGrowthRecord }));

    renderProvider();
    await waitFor(() => expect(growCtx).not.toBeNull());

    await expect(
      act(async () => {
        await growCtx!.upsert({ date: "2026-01-10", weightKg: 3.5 });
      })
    ).rejects.toThrow("save-fail");

    expect(errorSpy).toHaveBeenCalledWith("upsert failed:", expect.any(Error));
    expect(growCtx!.loading).toBe(false);
  });

  test("remove skips and warns when active user missing", async () => {
    const warnSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    mockUseActiveUser.mockReturnValue(null);
    mockUseAppState.mockReturnValue(buildAppStateMock({ activeUserId: null }));

    renderProvider();
    await waitFor(() => expect(growCtx).not.toBeNull());

    await act(async () => {
      await growCtx!.remove("id1");
    });

    expect(warnSpy).toHaveBeenCalledWith("remove skipped: active user not set");
  });

  test("remove calls deleteGrowthRecord on success", async () => {
    const deleteGrowthRecord = jest.fn(async () => undefined);
    mockUseActiveUser.mockReturnValue({ id: "u1", name: "Baby" });
    mockUseAppState.mockReturnValue(buildAppStateMock({ deleteGrowthRecord }));

    renderProvider();
    await waitFor(() => expect(growCtx).not.toBeNull());

    await act(async () => {
      await growCtx!.remove("rec-1");
    });

    expect(deleteGrowthRecord).toHaveBeenCalledWith("u1", "rec-1");
  });

  test("remove throws and resets loading when persistence fails", async () => {
    const errorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const deleteGrowthRecord = jest.fn(async () => {
      throw new Error("delete-fail");
    });
    mockUseActiveUser.mockReturnValue({ id: "u1", name: "Baby" });
    mockUseAppState.mockReturnValue(buildAppStateMock({ deleteGrowthRecord }));

    renderProvider();
    await waitFor(() => expect(growCtx).not.toBeNull());

    await expect(
      act(async () => {
        await growCtx!.remove("rec-1");
      })
    ).rejects.toThrow("delete-fail");

    expect(errorSpy).toHaveBeenCalledWith("remove failed:", expect.any(Error));
    expect(growCtx!.loading).toBe(false);
  });

  test("records are exposed sorted by date ascending", async () => {
    mockUseActiveUser.mockReturnValue({ id: "u1", name: "Baby" });
    mockUseAppState.mockReturnValue(
      buildAppStateMock({
        growthRecords: {
          u1: [
            { id: "b", date: "2026-02-01", weightKg: 5, createdAt: "t" },
            { id: "a", date: "2026-01-01", weightKg: 4, createdAt: "t" },
          ],
        },
      })
    );

    renderProvider();
    await waitFor(() => expect(growCtx).not.toBeNull());

    expect(growCtx!.records.map((r) => r.date)).toEqual([
      "2026-01-01",
      "2026-02-01",
    ]);
  });

  test("records is empty when activeUserId has no bucket", async () => {
    mockUseActiveUser.mockReturnValue({ id: "u1", name: "Baby" });
    mockUseAppState.mockReturnValue(buildAppStateMock({ growthRecords: {} }));

    renderProvider();
    await waitFor(() => expect(growCtx).not.toBeNull());

    expect(growCtx!.records).toEqual([]);
  });
});
