import { GROWTH_STANDARDS } from "../src/constants/growthStandards";
import {
  buildCalendarMonthView,
  toCorrectedDecimalMonthsForGrowth,
  toDecimalMonths,
} from "../src/utils/dateUtils";
import { getGrowthStandardAtMonth } from "../src/utils/growthStandards";

const settings = {
  ageFormat: "ymd" as const,
  showCorrectedUntilMonths: 24,
  showDaysSinceBirth: true,
  lastViewedMonth: null,
  notifyMilestoneEnabled: false,
};

describe("toDecimalMonths", () => {
  test("同日は0", () => {
    expect(toDecimalMonths("2024-01-01", "2024-01-01")).toBe(0);
  });

  test("平均月日数(30.4368日)で割った小数月齢を返す", () => {
    // 2024-01-01 → 2024-03-01 は60日
    expect(toDecimalMonths("2024-01-01", "2024-03-01")).toBeCloseTo(
      60 / 30.4368,
      6
    );
  });

  test("逆順（過去日付）は負の値を返す", () => {
    expect(toDecimalMonths("2024-03-01", "2024-01-01")).toBeLessThan(0);
  });

  test("不正な日付はNaN", () => {
    expect(Number.isNaN(toDecimalMonths("abc", "2024-01-01"))).toBe(true);
    expect(Number.isNaN(toDecimalMonths("2024-01-01", "2024-02-30"))).toBe(
      true
    );
  });
});

describe("toCorrectedDecimalMonthsForGrowth", () => {
  test("dueDate があれば予定日起点で計算する", () => {
    const result = toCorrectedDecimalMonthsForGrowth({
      targetDate: "2024-04-01",
      birthDate: "2024-01-01",
      dueDate: "2024-03-01",
    });
    expect(result).toBeCloseTo(toDecimalMonths("2024-03-01", "2024-04-01"), 10);
  });

  test("dueDate が null なら出生日起点で計算する", () => {
    const result = toCorrectedDecimalMonthsForGrowth({
      targetDate: "2024-04-01",
      birthDate: "2024-01-01",
      dueDate: null,
    });
    expect(result).toBeCloseTo(toDecimalMonths("2024-01-01", "2024-04-01"), 10);
  });

  test("正期産（在胎37週以上）は dueDate があっても出生日起点で計算する", () => {
    // 予定日の4日前に出生 → 在胎276日 ≥ 259日なので早産ではない
    const result = toCorrectedDecimalMonthsForGrowth({
      targetDate: "2024-06-01",
      birthDate: "2024-03-01",
      dueDate: "2024-03-05",
    });
    expect(result).toBeCloseTo(toDecimalMonths("2024-03-01", "2024-06-01"), 10);
  });

  test("予定日前の記録は負の修正月齢になる（クリップは描画側の責務）", () => {
    const result = toCorrectedDecimalMonthsForGrowth({
      targetDate: "2024-02-01",
      birthDate: "2024-01-01",
      dueDate: "2024-03-01",
    });
    expect(result).toBeLessThan(0);
  });
});

describe("getGrowthStandardAtMonth", () => {
  const original = GROWTH_STANDARDS.male.weight;

  afterEach(() => {
    GROWTH_STANDARDS.male.weight = original;
  });

  test("データ点が無い場合は null", () => {
    GROWTH_STANDARDS.male.weight = [];
    expect(getGrowthStandardAtMonth("male", "weight", 1)).toBeNull();
  });

  test("範囲外の月齢は null", () => {
    GROWTH_STANDARDS.male.weight = [
      {
        months: 0,
        median: 3,
        sd1Upper: 3.5,
        sd1Lower: 2.5,
        sd2Upper: 4,
        sd2Lower: 2,
      },
      {
        months: 2,
        median: 5,
        sd1Upper: 5.5,
        sd1Lower: 4.5,
        sd2Upper: 6,
        sd2Lower: 4,
      },
    ];
    expect(getGrowthStandardAtMonth("male", "weight", -0.1)).toBeNull();
    expect(getGrowthStandardAtMonth("male", "weight", 2.1)).toBeNull();
  });

  test("2点間を線形補間し、-2.5SD/-3.0SD を正規分布近似で算出する", () => {
    GROWTH_STANDARDS.male.weight = [
      {
        months: 0,
        median: 3,
        sd1Upper: 3.5,
        sd1Lower: 2.5,
        sd2Upper: 4,
        sd2Lower: 2,
      },
      {
        months: 2,
        median: 5,
        sd1Upper: 5.5,
        sd1Lower: 4.5,
        sd2Upper: 6,
        sd2Lower: 4,
      },
    ];
    const result = getGrowthStandardAtMonth("male", "weight", 1);
    expect(result).not.toBeNull();
    expect(result!.median).toBeCloseTo(4);
    expect(result!.sd1Upper).toBeCloseTo(4.5);
    expect(result!.sd1Lower).toBeCloseTo(3.5);
    expect(result!.sd2Upper).toBeCloseTo(5);
    expect(result!.sd2Lower).toBeCloseTo(3);
    // sd = (4 - 3) / 2 = 0.5
    expect(result!.sd25Lower).toBeCloseTo(4 - 2.5 * 0.5);
    expect(result!.sd30Lower).toBeCloseTo(4 - 3.0 * 0.5);
  });

  test("端点ではその点の値をそのまま返す", () => {
    GROWTH_STANDARDS.male.weight = [
      {
        months: 0,
        median: 3,
        sd1Upper: 3.5,
        sd1Lower: 2.5,
        sd2Upper: 4,
        sd2Lower: 2,
      },
      {
        months: 2,
        median: 5,
        sd1Upper: 5.5,
        sd1Lower: 4.5,
        sd2Upper: 6,
        sd2Lower: 4,
      },
    ];
    expect(getGrowthStandardAtMonth("male", "weight", 0)!.median).toBe(3);
    expect(getGrowthStandardAtMonth("male", "weight", 2)!.median).toBe(5);
  });
});

describe("buildCalendarMonthView growthRecordDatesSet", () => {
  test("成長記録がある日は hasGrowthRecords が true", () => {
    const view = buildCalendarMonthView({
      anchorDate: new Date(Date.UTC(2024, 5, 1)),
      settings,
      birthDate: "2024-01-01",
      dueDate: null,
      growthRecordDatesSet: new Set(["2024-06-10"]),
    });
    const day10 = view.days.find((d) => d.date === "2024-06-10");
    const day11 = view.days.find((d) => d.date === "2024-06-11");
    expect(day10?.hasGrowthRecords).toBe(true);
    expect(day11?.hasGrowthRecords).toBe(false);
  });

  test("隣接月のセルには成長記録マークを付けない", () => {
    // 2024年6月のグリッドには 5/26〜5/31 と 7/1〜7/6 が隣接月セルとして含まれる
    const view = buildCalendarMonthView({
      anchorDate: new Date(Date.UTC(2024, 5, 1)),
      settings,
      birthDate: "2024-01-01",
      dueDate: null,
      growthRecordDatesSet: new Set(["2024-05-31", "2024-07-01"]),
    });
    const prev = view.days.find((d) => d.date === "2024-05-31");
    const next = view.days.find((d) => d.date === "2024-07-01");
    expect(prev?.isCurrentMonth).toBe(false);
    expect(prev?.hasGrowthRecords).toBe(false);
    expect(next?.isCurrentMonth).toBe(false);
    expect(next?.hasGrowthRecords).toBe(false);
  });

  test("growthRecordDatesSet 未指定なら全て false", () => {
    const view = buildCalendarMonthView({
      anchorDate: new Date(Date.UTC(2024, 5, 1)),
      settings,
      birthDate: "2024-01-01",
      dueDate: null,
    });
    expect(view.days.every((d) => d.hasGrowthRecords === false)).toBe(true);
  });
});
