import {
  LICENSES,
  MIT_LICENSE_TEXT,
  OFL_LICENSE_TEXT,
} from "../src/content/licenses";

describe("licenses content data", () => {
  test("LICENSESは1件以上あり、各項目が必須フィールドを持つ", () => {
    expect(LICENSES.length).toBeGreaterThan(0);
    for (const item of LICENSES) {
      expect(item.name.length).toBeGreaterThan(0);
      expect(item.license.length).toBeGreaterThan(0);
      expect(item.copyright.length).toBeGreaterThan(0);
    }
  });

  test("nameに重複がない", () => {
    const names = LICENSES.map((item) => item.name);
    expect(new Set(names).size).toBe(names.length);
  });

  test("MIT/OFL-1.1ライセンスの項目には対応する全文が用意されている", () => {
    const licenseTypes = new Set(LICENSES.map((item) => item.license));
    if (licenseTypes.has("MIT")) {
      expect(MIT_LICENSE_TEXT.length).toBeGreaterThan(0);
    }
    if (licenseTypes.has("OFL-1.1")) {
      expect(OFL_LICENSE_TEXT.length).toBeGreaterThan(0);
    }
  });

  test("repositoryが設定されている場合はhttpsのURL形式である", () => {
    for (const item of LICENSES) {
      if (item.repository) {
        expect(item.repository).toMatch(/^https:\/\//);
      }
    }
  });
});
