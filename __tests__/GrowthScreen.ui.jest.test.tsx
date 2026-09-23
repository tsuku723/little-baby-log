import React from "react";
import renderer, { act } from "react-test-renderer";
import { Alert, Platform, Text } from "react-native";

if (typeof (global as any).window === "undefined") {
  (global as any).window = {};
}

let mockUser: any = null;
let mockRecords: any[] = [];
let mockLoading = false;
const mockUpsert = jest.fn(async () => undefined);
const mockRemove = jest.fn(async () => undefined);
const mockNavigate = jest.fn();
const mockGrowthChartProps = jest.fn();

jest.mock("@/state/AppStateContext", () => ({
  useActiveUser: () => mockUser,
}));

jest.mock("@/state/GrowthRecordsContext", () => ({
  useGrowthRecords: () => ({
    loading: mockLoading,
    records: mockRecords,
    upsert: mockUpsert,
    remove: mockRemove,
  }),
}));

jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock("@/components/GrowthChart", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: (props: any) => {
      mockGrowthChartProps(props);
      return null;
    },
    MEASUREMENT_FIELD: {
      weight: "weightKg",
      height: "heightCm",
      headCircumference: "headCircumferenceCm",
      chestCircumference: "chestCircumferenceCm",
    },
  };
});

import GrowthScreen from "../src/screens/GrowthScreen";

const monthsAgoIso = (months: number): string => {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString().slice(0, 10);
};

const baseUser = (overrides: Partial<any> = {}) => ({
  id: "u1",
  name: "テストちゃん",
  birthDate: monthsAgoIso(3),
  dueDate: null,
  gender: null,
  profilePhotoPath: undefined,
  ...overrides,
});

const record = (overrides: Partial<any>) => ({
  id: overrides.id ?? "r1",
  date: overrides.date ?? "2026-01-01",
  createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const renderScreen = async () => {
  let tree: any;
  await act(async () => {
    tree = renderer.create(React.createElement(GrowthScreen, {} as any));
  });
  return tree;
};

const findTabByLabel = (tree: any, label: string) =>
  tree.root
    .findAllByProps({ accessibilityRole: "button" })
    .find(
      (node: any) =>
        typeof node.props.onPress === "function" &&
        node.findAllByType(Text).some((t: any) => t.props.children === label)
    );

// FlatList内のテキストはJSON.stringify(tree.toJSON())では循環参照エラーになるため
// react-test-rendererのインスタンスAPIから直接テキストを収集する
const allTexts = (tree: any): string[] =>
  tree.root
    .findAllByType(Text)
    .flatMap((t: any) =>
      Array.isArray(t.props.children) ? t.props.children : [t.props.children]
    )
    .filter((c: any) => typeof c === "string" || typeof c === "number")
    .map(String);

// FlatListの再レンダリングを伴うテストはCI環境で既定の5000msを超えることがあるため延長
jest.setTimeout(20000);

describe("GrowthScreen UI", () => {
  const originalPlatformOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = baseUser();
    mockRecords = [];
    mockLoading = false;
    Platform.OS = originalPlatformOS;
  });

  afterAll(() => {
    Platform.OS = originalPlatformOS;
  });

  test("項目タブ切り替え: 選択項目を持つ記録のみが日付降順で表示される", async () => {
    mockRecords = [
      record({ id: "a", date: "2026-01-01", weightKg: 3 }),
      record({ id: "b", date: "2026-03-01", heightCm: 55 }),
      record({ id: "c", date: "2026-02-01", weightKg: 4 }),
    ];
    const tree = await renderScreen();

    // デフォルトは体重タブ: a, c のみ（bはweightKg未設定のため除外）、日付降順
    const texts = allTexts(tree);
    expect(texts).toContain("2026/02/01");
    expect(texts).toContain("2026/01/01");
    expect(texts).not.toContain("2026/03/01");
    expect(texts.indexOf("2026/02/01")).toBeLessThan(
      texts.indexOf("2026/01/01")
    );

    await act(async () => {
      findTabByLabel(tree, "身長").props.onPress();
    });

    const textsAfter = allTexts(tree);
    expect(textsAfter).toContain("2026/03/01");
    expect(textsAfter).not.toContain("2026/01/01");
    expect(textsAfter).not.toContain("2026/02/01");
  });

  test("同日の記録はcreatedAt降順で並ぶ", async () => {
    mockRecords = [
      record({
        id: "old",
        date: "2026-01-01",
        weightKg: 3,
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
      record({
        id: "new",
        date: "2026-01-01",
        weightKg: 4,
        createdAt: "2026-01-01T12:00:00.000Z",
      }),
    ];
    const tree = await renderScreen();
    const texts = allTexts(tree);
    // 新しい方（4.0kg）が先に来る
    expect(texts.indexOf("4.0")).toBeGreaterThanOrEqual(0);
    expect(texts.indexOf("4.0")).toBeLessThan(texts.indexOf("3.0"));
  });

  test("ユーザー未設定時: グラフの代わりに案内テキストが表示される", async () => {
    mockUser = null;
    const tree = await renderScreen();
    expect(allTexts(tree)).toContain(
      "グラフはプロフィール設定後に表示されます"
    );
    expect(mockGrowthChartProps).not.toHaveBeenCalled();
  });

  test("記録0件・loading=true: 読み込み中と表示される", async () => {
    mockLoading = true;
    mockRecords = [];
    const tree = await renderScreen();
    expect(allTexts(tree)).toContain("読み込み中...");
  });

  test("記録0件・loading=false: ◯◯の記録がありませんと表示される", async () => {
    mockLoading = false;
    mockRecords = [];
    const tree = await renderScreen();
    expect(allTexts(tree)).toContain("体重の記録がありません");
  });

  test("対象の子ども切り替え時: 範囲タブが自動リセットされる（項目タブ切替では維持される）", async () => {
    mockUser = baseUser({ id: "u1", birthDate: monthsAgoIso(3) }); // 〜1歳
    const tree = await renderScreen();
    expect(mockGrowthChartProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ rangeMaxMonths: 12 })
    );

    mockUser = baseUser({ id: "u2", birthDate: monthsAgoIso(30) }); // 〜3歳
    await act(async () => {
      tree.update(React.createElement(GrowthScreen, {} as any));
    });
    expect(mockGrowthChartProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ rangeMaxMonths: 36 })
    );

    await act(async () => {
      findTabByLabel(tree, "身長").props.onPress();
    });
    expect(mockGrowthChartProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ rangeMaxMonths: 36, measurementType: "height" })
    );
  });

  test("範囲タブを手動でタップすると選択範囲が変わる", async () => {
    const tree = await renderScreen();
    await act(async () => {
      findTabByLabel(tree, "〜2歳").props.onPress();
    });
    expect(mockGrowthChartProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ rangeMaxMonths: 24 })
    );
  });

  test("記録カードタップでGrowthRecordInputへrecordId付きで遷移する", async () => {
    mockRecords = [record({ id: "r1", date: "2026-01-01", weightKg: 3 })];
    const tree = await renderScreen();
    // カード本体（削除ボタンではない方）を探す
    const cardMain = tree.root
      .findAllByProps({ accessibilityRole: "button" })
      .find(
        (n: any) =>
          n.props.accessibilityLabel === undefined &&
          n
            .findAllByType(Text)
            .some((t: any) => t.props.children === "2026/01/01")
      );
    await act(async () => {
      cardMain.props.onPress();
    });
    expect(mockNavigate).toHaveBeenCalledWith("GrowthRecordInput", {
      recordId: "r1",
    });
  });

  test("FABタップでGrowthRecordInputへ今日の日付付きで遷移する", async () => {
    const tree = await renderScreen();
    const fab = tree.root
      .findAllByProps({ accessibilityRole: "button" })
      .find((n: any) =>
        n.findAllByType(Text).some((t: any) => t.props.children === "＋記録")
      );
    await act(async () => {
      fab.props.onPress();
    });
    expect(mockNavigate).toHaveBeenCalledWith(
      "GrowthRecordInput",
      expect.objectContaining({ isoDate: expect.any(String) })
    );
  });

  describe("削除処理", () => {
    const findDeleteButton = (tree: any) =>
      tree.root
        .findAllByProps({ accessibilityLabel: "体重の記録を削除" })
        .find((n: any) => typeof n.props.onPress === "function");

    test("他項目も持つ記録: 削除対象フィールドのみundefinedにしてupsertされる（レコードは残る）", async () => {
      mockRecords = [
        record({ id: "r1", date: "2026-01-01", weightKg: 3, heightCm: 55 }),
      ];
      Platform.OS = "web";
      (window as any).confirm = jest.fn().mockReturnValue(true);
      const tree = await renderScreen();

      await act(async () => {
        await findDeleteButton(tree).props.onPress();
      });

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "r1",
          date: "2026-01-01",
          weightKg: undefined,
          heightCm: 55,
        })
      );
      expect(mockRemove).not.toHaveBeenCalled();
    });

    test("身長タブで削除: heightCmのみundefinedにし他フィールドは保持される", async () => {
      mockRecords = [
        record({
          id: "r1",
          date: "2026-01-01",
          weightKg: 3,
          heightCm: 55,
          headCircumferenceCm: 35,
          chestCircumferenceCm: 33,
        }),
      ];
      Platform.OS = "web";
      (window as any).confirm = jest.fn().mockReturnValue(true);
      const tree = await renderScreen();

      await act(async () => {
        findTabByLabel(tree, "身長").props.onPress();
      });

      const deleteButton = tree.root
        .findAllByProps({ accessibilityLabel: "身長の記録を削除" })
        .find((n: any) => typeof n.props.onPress === "function");
      await act(async () => {
        await deleteButton.props.onPress();
      });

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "r1",
          date: "2026-01-01",
          weightKg: 3,
          heightCm: undefined,
          headCircumferenceCm: 35,
          chestCircumferenceCm: 33,
        })
      );
      expect(mockRemove).not.toHaveBeenCalled();
    });

    test("胸囲タブで削除: chestCircumferenceCmのみundefinedにし他フィールドは保持される", async () => {
      mockRecords = [
        record({
          id: "r1",
          date: "2026-01-01",
          weightKg: 3,
          heightCm: 55,
          headCircumferenceCm: 35,
          chestCircumferenceCm: 33,
        }),
      ];
      Platform.OS = "web";
      (window as any).confirm = jest.fn().mockReturnValue(true);
      const tree = await renderScreen();

      await act(async () => {
        findTabByLabel(tree, "胸囲").props.onPress();
      });

      const deleteButton = tree.root
        .findAllByProps({ accessibilityLabel: "胸囲の記録を削除" })
        .find((n: any) => typeof n.props.onPress === "function");
      await act(async () => {
        await deleteButton.props.onPress();
      });

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "r1",
          date: "2026-01-01",
          weightKg: 3,
          heightCm: 55,
          headCircumferenceCm: 35,
          chestCircumferenceCm: undefined,
        })
      );
      expect(mockRemove).not.toHaveBeenCalled();
    });

    test("頭囲タブで削除: headCircumferenceCmのみundefinedにし他フィールドは保持される", async () => {
      mockRecords = [
        record({
          id: "r1",
          date: "2026-01-01",
          weightKg: 3,
          heightCm: 55,
          headCircumferenceCm: 35,
          chestCircumferenceCm: 33,
        }),
      ];
      Platform.OS = "web";
      (window as any).confirm = jest.fn().mockReturnValue(true);
      const tree = await renderScreen();

      await act(async () => {
        findTabByLabel(tree, "頭囲").props.onPress();
      });

      const deleteButton = tree.root
        .findAllByProps({ accessibilityLabel: "頭囲の記録を削除" })
        .find((n: any) => typeof n.props.onPress === "function");
      await act(async () => {
        await deleteButton.props.onPress();
      });

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "r1",
          date: "2026-01-01",
          weightKg: 3,
          heightCm: 55,
          headCircumferenceCm: undefined,
          chestCircumferenceCm: 33,
        })
      );
      expect(mockRemove).not.toHaveBeenCalled();
    });

    test("選択項目のみの記録: removeが呼ばれレコードごと削除される", async () => {
      mockRecords = [record({ id: "r1", date: "2026-01-01", weightKg: 3 })];
      Platform.OS = "web";
      (window as any).confirm = jest.fn().mockReturnValue(true);
      const tree = await renderScreen();

      await act(async () => {
        await findDeleteButton(tree).props.onPress();
      });

      expect(mockRemove).toHaveBeenCalledWith("r1");
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    test("Web: window.confirmでキャンセルした場合は削除処理が呼ばれない", async () => {
      mockRecords = [record({ id: "r1", date: "2026-01-01", weightKg: 3 })];
      Platform.OS = "web";
      (window as any).confirm = jest.fn().mockReturnValue(false);
      const tree = await renderScreen();

      await act(async () => {
        await findDeleteButton(tree).props.onPress();
      });

      expect(mockRemove).not.toHaveBeenCalled();
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    test("ネイティブ: Alert.alertで確認ダイアログが出て「削除」選択時に削除される", async () => {
      mockRecords = [record({ id: "r1", date: "2026-01-01", weightKg: 3 })];
      Platform.OS = "ios";
      const alertSpy = jest
        .spyOn(Alert, "alert")
        .mockImplementation((_title, _msg, buttons) => {
          const deleteButton = buttons?.find((b) => b.text === "削除");
          deleteButton?.onPress?.();
        });
      const tree = await renderScreen();

      await act(async () => {
        await findDeleteButton(tree).props.onPress();
      });

      expect(alertSpy).toHaveBeenCalled();
      expect(mockRemove).toHaveBeenCalledWith("r1");
    });

    test("ネイティブ: キャンセル選択時は削除処理が呼ばれない", async () => {
      mockRecords = [record({ id: "r1", date: "2026-01-01", weightKg: 3 })];
      Platform.OS = "ios";
      jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
      const tree = await renderScreen();

      await act(async () => {
        await findDeleteButton(tree).props.onPress();
      });

      expect(mockRemove).not.toHaveBeenCalled();
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    test("削除処理が失敗した場合、Webでエラーアラートが表示される", async () => {
      mockRecords = [record({ id: "r1", date: "2026-01-01", weightKg: 3 })];
      mockRemove.mockRejectedValueOnce(new Error("fail"));
      Platform.OS = "web";
      (window as any).confirm = jest.fn().mockReturnValue(true);
      const alertSpy = jest.fn();
      (window as any).alert = alertSpy;
      const errorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      const tree = await renderScreen();

      await act(async () => {
        await findDeleteButton(tree).props.onPress();
      });

      expect(alertSpy).toHaveBeenCalledWith(
        "削除に失敗しました。時間をおいて再度お試しください。"
      );
      expect(errorSpy).toHaveBeenCalled();
    });

    test("削除処理が失敗した場合、ネイティブでエラーアラートが表示される", async () => {
      mockRecords = [record({ id: "r1", date: "2026-01-01", weightKg: 3 })];
      mockRemove.mockRejectedValueOnce(new Error("fail"));
      Platform.OS = "ios";
      const alertSpy = jest
        .spyOn(Alert, "alert")
        .mockImplementation((_title, _msg, buttons) => {
          const deleteButton = buttons?.find((b) => b.text === "削除");
          deleteButton?.onPress?.();
        });
      const errorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      const tree = await renderScreen();

      await act(async () => {
        await findDeleteButton(tree).props.onPress();
      });

      expect(alertSpy).toHaveBeenCalledWith(
        "削除しますか？",
        expect.any(String),
        expect.any(Array)
      );
      expect(alertSpy).toHaveBeenCalledWith(
        "削除に失敗しました",
        "時間をおいて再度お試しください。"
      );
      expect(errorSpy).toHaveBeenCalled();
    });
  });
});
