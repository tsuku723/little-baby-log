import { getDefaultRangeKey } from "../src/screens/GrowthScreen";

describe("getDefaultRangeKey", () => {
  test("12ヶ月以下は〜1歳", () => {
    expect(getDefaultRangeKey(0)).toBe("y1");
    expect(getDefaultRangeKey(10)).toBe("y1");
    expect(getDefaultRangeKey(12)).toBe("y1");
  });

  test("12ヶ月超24ヶ月以下は〜2歳", () => {
    expect(getDefaultRangeKey(12.0001)).toBe("y2");
    expect(getDefaultRangeKey(23)).toBe("y2");
    expect(getDefaultRangeKey(24)).toBe("y2");
  });

  test("24ヶ月超36ヶ月以下は〜3歳", () => {
    expect(getDefaultRangeKey(24.0001)).toBe("y3");
    expect(getDefaultRangeKey(30)).toBe("y3");
    expect(getDefaultRangeKey(36)).toBe("y3");
  });

  test("36ヶ月超72ヶ月以下は〜6歳", () => {
    expect(getDefaultRangeKey(36.0001)).toBe("y6");
    expect(getDefaultRangeKey(60)).toBe("y6");
    expect(getDefaultRangeKey(72)).toBe("y6");
  });

  test("72ヶ月超はすべて", () => {
    expect(getDefaultRangeKey(72.0001)).toBe("all");
    expect(getDefaultRangeKey(100)).toBe("all");
  });
});
