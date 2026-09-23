import React from "react";
import renderer, { act } from "react-test-renderer";
import { View } from "react-native";
import { Circle, Polyline, Text as SvgText } from "react-native-svg";

import GrowthChart, { niceStep } from "../src/components/GrowthChart";
import { GrowthRecord } from "../src/state/AppStateContext";
import { gestationalWeeksAtChronologicalMonths } from "../src/utils/dateUtils";
import { GROWTH_STANDARDS } from "../src/constants/growthStandards";

const CHART_WIDTH = 360;

const record = (overrides: Partial<GrowthRecord>): GrowthRecord => ({
  id: overrides.id ?? `rec-${Math.random()}`,
  date: overrides.date ?? "2026-01-01",
  createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const renderChart = async (props: {
  records: GrowthRecord[];
  measurementType:
    | "weight"
    | "height"
    | "headCircumference"
    | "chestCircumference";
  gender: "male" | "female" | null;
  birthDate: string;
  dueDate: string | null;
  rangeMaxMonths: number | null;
}) => {
  let tree: any;
  await act(async () => {
    tree = renderer.create(<GrowthChart {...props} />);
  });
  await act(async () => {
    tree.root
      .findByType(View)
      .props.onLayout({ nativeEvent: { layout: { width: CHART_WIDTH } } });
  });
  return tree;
};

const textOf = (tree: any): string => JSON.stringify(tree.toJSON());

describe("GrowthChart niceStep", () => {
  test.each([
    [4, 1],
    [9, 2],
    [24, 5],
    [45, 10],
    [90, 20],
    [0, 1],
    [-5, 1],
  ])("range=%d -> step=%d", (range, expected) => {
    expect(niceStep(range)).toBe(expected);
  });
});

describe("GrowthChart rendering", () => {
  test("記録が0件・性別未設定: 案内テキストが両方表示される", async () => {
    const tree = await renderChart({
      records: [],
      measurementType: "weight",
      gender: null,
      birthDate: "2025-01-01",
      dueDate: null,
      rangeMaxMonths: null,
    });
    const json = textOf(tree);
    expect(json).toContain("まだ記録がありません");
    expect(json).toContain(
      "プロフィールで性別を設定すると基準線が表示されます"
    );
    expect(tree.root.findAllByType(Polyline)).toHaveLength(0);
  });

  test("数値が入っていないフィールドはデータ点から除外される", async () => {
    const tree = await renderChart({
      records: [
        record({ id: "a", date: "2026-01-01", weightKg: 3 }),
        record({ id: "b", date: "2026-02-01" }), // weightKg未設定
        record({ id: "c", date: "2026-03-01", weightKg: 4 }),
      ],
      measurementType: "weight",
      gender: null,
      birthDate: "2025-01-01",
      dueDate: null,
      rangeMaxMonths: null,
    });
    // マーカー（Circle）は数値ありの2件分のみ
    expect(tree.root.findAllByType(Circle)).toHaveLength(2);
  });

  test("記録1件: 折れ線は描画されずマーカーのみ", async () => {
    const tree = await renderChart({
      records: [record({ id: "a", date: "2026-01-01", weightKg: 3 })],
      measurementType: "weight",
      gender: null,
      birthDate: "2025-01-01",
      dueDate: null,
      rangeMaxMonths: null,
    });
    expect(tree.root.findAllByType(Circle)).toHaveLength(1);
    expect(tree.root.findAllByType(Polyline)).toHaveLength(0);
  });

  test("記録2件以上: 折れ線が描画される", async () => {
    const tree = await renderChart({
      records: [
        record({ id: "a", date: "2026-01-01", weightKg: 3 }),
        record({ id: "b", date: "2026-02-01", weightKg: 3.5 }),
      ],
      measurementType: "weight",
      gender: null,
      birthDate: "2025-01-01",
      dueDate: null,
      rangeMaxMonths: null,
    });
    expect(tree.root.findAllByType(Polyline)).toHaveLength(1);
  });

  test("gender=maleかつ基準データありの場合、基準線と体重の出典ラベルが表示される", async () => {
    const tree = await renderChart({
      records: [],
      measurementType: "weight",
      gender: "male",
      birthDate: "2025-01-01",
      dueDate: null,
      rangeMaxMonths: null,
    });
    const json = textOf(tree);
    expect(json).toContain("出典:");
    expect(json).toContain("こども家庭庁「令和5年乳幼児身体発育調査」");
    // 基準線: sd2Upper/sd1Upper/median/sd1Lower/sd2Lower/sd25Lower/sd30Lower = 7本
    expect(tree.root.findAllByType(Polyline)).toHaveLength(7);
  });

  test("胸囲は基準線ありの場合に出典元が異なるラベルになる", async () => {
    const tree = await renderChart({
      records: [],
      measurementType: "chestCircumference",
      gender: "female",
      birthDate: "2025-01-01",
      dueDate: null,
      rangeMaxMonths: null,
    });
    const json = textOf(tree);
    expect(json).toContain("出典:");
    expect(json).toContain("厚生労働省「平成22年乳幼児身体発育調査」");
  });

  test("gender設定済みだが基準データが空の場合、準備中メッセージが表示される", async () => {
    const original = GROWTH_STANDARDS.male.chestCircumference;
    (GROWTH_STANDARDS.male as any).chestCircumference = [];
    try {
      const tree = await renderChart({
        records: [],
        measurementType: "chestCircumference",
        gender: "male",
        birthDate: "2025-01-01",
        dueDate: null,
        rangeMaxMonths: null,
      });
      expect(textOf(tree)).toContain("基準線データは準備中です");
      expect(tree.root.findAllByType(Polyline)).toHaveLength(0);
    } finally {
      (GROWTH_STANDARDS.male as any).chestCircumference = original;
    }
  });

  test("正期産児: X軸目盛りに副ラベル（在胎週数・修正月齢）が付かない", async () => {
    const tree = await renderChart({
      records: [],
      measurementType: "weight",
      gender: null,
      birthDate: "2025-01-01",
      dueDate: null,
      rangeMaxMonths: 12,
    });
    const subLabels = tree.root
      .findAllByType(SvgText)
      .map((n: any) => n.props.children)
      .filter(
        (c: any) =>
          typeof c === "string" && (c.endsWith("w") || c.startsWith("修"))
      );
    expect(subLabels).toHaveLength(0);
  });

  test("早産児: 出産予定日より前は在胎週数、以降は修正月齢の副ラベルが付く", async () => {
    const birthDate = "2025-01-01";
    const dueDate = "2025-03-15"; // 早産（在胎259日未満相当）
    const tree = await renderChart({
      records: [],
      measurementType: "weight",
      gender: null,
      birthDate,
      dueDate,
      rangeMaxMonths: 12,
    });
    const json = textOf(tree);
    expect(json).toMatch(/\d+w/);
    expect(json).toContain("修");

    // 在胎週数の計算がdateUtilsの実装と一致することを確認（0ヶ月時点）
    const expectedAtZero = gestationalWeeksAtChronologicalMonths({
      chronologicalMonths: 0,
      birthDate,
      dueDate,
    });
    expect(expectedAtZero).not.toBeNull();
    expect(json).toContain(`${expectedAtZero!.weeks}w`);
  });

  test("rangeMaxMonths指定時: 範囲外の記録はマーカーから除外される（折れ線は伸びる）", async () => {
    const tree = await renderChart({
      records: [
        record({ id: "a", date: "2025-01-01", weightKg: 3 }), // 0ヶ月
        record({ id: "b", date: "2025-07-01", weightKg: 6 }), // 6ヶ月
        record({ id: "c", date: "2026-01-01", weightKg: 9 }), // 12ヶ月（範囲外）
      ],
      measurementType: "weight",
      gender: null,
      birthDate: "2025-01-01",
      dueDate: null,
      rangeMaxMonths: 6,
    });
    // マーカーは範囲内の2件のみ
    expect(tree.root.findAllByType(Circle)).toHaveLength(2);
    // 折れ線は範囲外の点も含めて描画される（3件分の線が1本）
    expect(tree.root.findAllByType(Polyline)).toHaveLength(1);
  });

  test("rangeMaxMonths=72（〜6歳）: 年単位のX軸ラベルになる", async () => {
    const tree = await renderChart({
      records: [],
      measurementType: "weight",
      gender: null,
      birthDate: "2020-01-01",
      dueDate: null,
      rangeMaxMonths: 72,
    });
    expect(textOf(tree)).toContain("実年齢（歳）");
  });

  test("rangeMaxMonths=null（すべて）: 年単位のX軸ラベルになる", async () => {
    const tree = await renderChart({
      records: [record({ id: "a", date: "2028-01-01", weightKg: 15 })],
      measurementType: "weight",
      gender: null,
      birthDate: "2020-01-01",
      dueDate: null,
      rangeMaxMonths: null,
    });
    expect(textOf(tree)).toContain("実年齢（歳）");
  });

  test("rangeMaxMonths指定（〜6歳未満）: 月単位のX軸ラベルになる", async () => {
    const tree = await renderChart({
      records: [],
      measurementType: "weight",
      gender: null,
      birthDate: "2025-01-01",
      dueDate: null,
      rangeMaxMonths: 12,
    });
    expect(textOf(tree)).toContain("実月齢（ヶ月）");
  });
});
