import {
  calculateMilestones,
  getBirthdayMilestoneBadge,
  getDayMilestoneBadge,
} from "../src/utils/milestones";

describe("calculateMilestones", () => {
  it("正期産児は日数マイルストーン・誕生日・暦月齢を含み、修正月齢を含まない", () => {
    const milestones = calculateMilestones({
      birthDate: "2024-01-01",
      dueDate: null,
    });

    const keys = milestones.map((m) => m.key);
    expect(keys).toContain("days-100");
    expect(keys).toContain("days-200");
    expect(keys).toContain("days-1000");
    expect(keys).toContain("birthday-1");
    expect(keys).toContain("birthday-2");
    expect(keys).toContain("birthday-100");
    expect(keys).toContain("chronological-1");
    expect(keys).toContain("chronological-24");
    expect(keys.some((k) => k.startsWith("corrected-"))).toBe(false);
  });

  it("日数マイルストーンの日付を正しく計算する", () => {
    const milestones = calculateMilestones({
      birthDate: "2024-01-01",
      dueDate: null,
    });
    const days100 = milestones.find((m) => m.key === "days-100");
    const birthday1 = milestones.find((m) => m.key === "birthday-1");

    expect(days100?.date).toBe("2024-04-10");
    expect(birthday1?.date).toBe("2025-01-01");
  });

  it("暦月齢マイルストーンの日付を正しく計算する", () => {
    const milestones = calculateMilestones({
      birthDate: "2024-01-31",
      dueDate: null,
    });
    const month1 = milestones.find((m) => m.key === "chronological-1");
    // 1月31日の1ヶ月後は2月末（29日）にクランプされる
    expect(month1?.date).toBe("2024-02-29");
  });

  it("早産児（在胎259日未満）は修正月齢マイルストーンを含む", () => {
    const milestones = calculateMilestones({
      birthDate: "2024-01-01",
      dueDate: "2024-03-01", // 出生が予定日より60日早い = 在胎220日で早産
    });

    const keys = milestones.map((m) => m.key);
    expect(keys).toContain("corrected-1");
    expect(keys).toContain("corrected-24");

    const corrected1 = milestones.find((m) => m.key === "corrected-1");
    expect(corrected1?.date).toBe("2024-04-01");
  });

  it("正期産（在胎259日以上）は修正月齢マイルストーンを含まない", () => {
    const milestones = calculateMilestones({
      birthDate: "2024-01-01",
      dueDate: "2024-01-05", // ほぼ予定日通り = 正期産
    });

    const keys = milestones.map((m) => m.key);
    expect(keys.some((k) => k.startsWith("corrected-"))).toBe(false);
  });

  it("birthDateが不正な場合は空配列を返す", () => {
    expect(
      calculateMilestones({ birthDate: "invalid", dueDate: null })
    ).toEqual([]);
  });
});

describe("getDayMilestoneBadge", () => {
  it("100/200/1000日目はそのまま日数ラベルを返す", () => {
    expect(getDayMilestoneBadge(100)).toBe("100日");
    expect(getDayMilestoneBadge(200)).toBe("200日");
    expect(getDayMilestoneBadge(1000)).toBe("1000日");
  });

  it("対象外の日数はnullを返す", () => {
    expect(getDayMilestoneBadge(99)).toBeNull();
    expect(getDayMilestoneBadge(0)).toBeNull();
    expect(getDayMilestoneBadge(365)).toBeNull();
  });
});

describe("getBirthdayMilestoneBadge", () => {
  it("ちょうどN歳(N>=1)の日は「誕生日」を返す", () => {
    expect(getBirthdayMilestoneBadge({ years: 1, months: 0, days: 0 })).toBe(
      "誕生日"
    );
    expect(getBirthdayMilestoneBadge({ years: 2, months: 0, days: 0 })).toBe(
      "誕生日"
    );
    expect(getBirthdayMilestoneBadge({ years: 10, months: 0, days: 0 })).toBe(
      "誕生日"
    );
  });

  it("誕生日以外の日はnullを返す", () => {
    expect(
      getBirthdayMilestoneBadge({ years: 0, months: 0, days: 0 })
    ).toBeNull();
    expect(
      getBirthdayMilestoneBadge({ years: 1, months: 1, days: 0 })
    ).toBeNull();
    expect(
      getBirthdayMilestoneBadge({ years: 1, months: 0, days: 1 })
    ).toBeNull();
  });
});
