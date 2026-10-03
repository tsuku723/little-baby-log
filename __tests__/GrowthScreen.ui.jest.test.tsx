import React from "react";
import renderer, { act } from "react-test-renderer";
import { Text } from "react-native";

let mockUser: any = null;
let mockRecords: any[] = [];
let mockLoading = false;
const mockNavigate = jest.fn();
const mockGrowthChartProps = jest.fn();

jest.mock("@/state/AppStateContext", () => ({
  useActiveUser: () => mockUser,
}));

jest.mock("@/state/GrowthRecordsContext", () => ({
  useGrowthRecords: () => ({
    loading: mockLoading,
    records: mockRecords,
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
  settings: {
    ageFormat: "md",
    showCorrectedUntilMonths: null,
  },
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
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = baseUser();
    mockRecords = [];
    mockLoading = false;
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
    // カード本体（編集ボタンではない方）を探す
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

  describe("一覧カードの月齢表示", () => {
    test("通常: 暦月齢のみ表示される", async () => {
      mockUser = baseUser({ birthDate: "2025-01-01", dueDate: null });
      mockRecords = [record({ id: "r1", date: "2025-06-07", weightKg: 5 })];
      const tree = await renderScreen();
      expect(allTexts(tree)).toContain("5ヶ月6日");
    });

    test("修正対象期間内: 暦月齢と修正月齢が併記される", async () => {
      mockUser = baseUser({ birthDate: "2025-01-01", dueDate: "2025-03-01" });
      mockRecords = [record({ id: "r1", date: "2025-04-01", weightKg: 5 })];
      const tree = await renderScreen();
      const texts = allTexts(tree);
      expect(texts).toContain("3ヶ月0日");
      expect(texts).toContain("修正 1ヶ月0日");
    });

    test("出産予定日前: 暦月齢と在胎週数が併記される", async () => {
      mockUser = baseUser({ birthDate: "2025-01-01", dueDate: "2025-03-01" });
      mockRecords = [record({ id: "r1", date: "2025-01-15", weightKg: 5 })];
      const tree = await renderScreen();
      const texts = allTexts(tree);
      expect(texts).toContain("0ヶ月14日");
      expect(texts).toContain("在胎 33週4日");
    });

    test("対象外（正産期で出産予定日設定あり）: 暦月齢のみ表示される", async () => {
      mockUser = baseUser({ birthDate: "2025-01-01", dueDate: "2025-01-05" });
      mockRecords = [record({ id: "r1", date: "2025-06-07", weightKg: 5 })];
      const tree = await renderScreen();
      const texts = allTexts(tree);
      expect(texts).toContain("5ヶ月6日");
      expect(texts.some((t) => t.includes("在胎"))).toBe(false);
    });

    test("ユーザー・生年月日未設定時: 月齢は表示されない", async () => {
      mockUser = null;
      mockRecords = [record({ id: "r1", date: "2026-01-01", weightKg: 5 })];
      const tree = await renderScreen();
      const texts = allTexts(tree);
      expect(texts.some((t) => t.includes("ヶ月"))).toBe(false);
    });
  });

  describe("編集ボタン", () => {
    const findEditButton = (tree: any, label: string) =>
      tree.root
        .findAllByProps({ accessibilityLabel: label })
        .find((n: any) => typeof n.props.onPress === "function");

    test("右端の編集ボタンタップでGrowthRecordInputへrecordId付きで遷移する", async () => {
      mockRecords = [record({ id: "r1", date: "2026-01-01", weightKg: 3 })];
      const tree = await renderScreen();

      await act(async () => {
        findEditButton(tree, "体重の記録を編集").props.onPress();
      });

      expect(mockNavigate).toHaveBeenCalledWith("GrowthRecordInput", {
        recordId: "r1",
      });
    });

    test("項目タブに応じてアクセシビリティラベルが切り替わる", async () => {
      mockRecords = [
        record({ id: "r1", date: "2026-01-01", weightKg: 3, heightCm: 55 }),
      ];
      const tree = await renderScreen();

      await act(async () => {
        findTabByLabel(tree, "身長").props.onPress();
      });

      await act(async () => {
        findEditButton(tree, "身長の記録を編集").props.onPress();
      });

      expect(mockNavigate).toHaveBeenCalledWith("GrowthRecordInput", {
        recordId: "r1",
      });
    });
  });
});
