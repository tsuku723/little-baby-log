import { DEFAULT_SETTINGS } from "../src/types/models";
import {
  getAboutTextJa,
  LEGAL_META,
  PRIVACY_POLICY_TEXT_JA,
  TERMS_TEXT_JA,
} from "../src/content/legal/ja";

describe("types/models DEFAULT_SETTINGS", () => {
  it("既定の表示設定を保持する", () => {
    expect(DEFAULT_SETTINGS).toEqual({
      showCorrectedUntilMonths: 24,
      ageFormat: "ymd",
      showDaysSinceBirth: true,
      lastViewedMonth: null,
      notifyMilestoneEnabled: false,
    });
  });

  it("不正な上書きがないことを境界値で確認する", () => {
    expect(DEFAULT_SETTINGS.showCorrectedUntilMonths).not.toBeLessThan(0);
    expect(["md", "ymd"]).toContain(DEFAULT_SETTINGS.ageFormat);
  });
});

describe("content/legal/ja exports", () => {
  it("LEGAL_METAに公開情報を含む", () => {
    expect(LEGAL_META.appName).toBe("リトルベビーログ");
    expect(LEGAL_META.contactEmail).toContain("@");
  });

  it("ABOUT文面に主要セクションを含む", () => {
    const aboutText = getAboutTextJa("1.0.0");
    expect(aboutText).toContain("# このアプリについて");
    expect(aboutText).toContain("## 修正月齢・在胎週数の計算方法について");
    expect(aboutText).toContain(LEGAL_META.contactEmail);
    expect(aboutText).toContain("Version 1.0.0");
  });

  it("利用規約文面に施行日が含まれる", () => {
    expect(TERMS_TEXT_JA).toContain("# 利用規約");
    expect(TERMS_TEXT_JA).toContain("第1条（利用目的）");
    expect(TERMS_TEXT_JA).toContain("2026年3月15日");
  });

  it("プライバシーポリシー文面は空文字を返さない", () => {
    expect(PRIVACY_POLICY_TEXT_JA.trim().length).toBeGreaterThan(0);
    expect(PRIVACY_POLICY_TEXT_JA).toContain("# プライバシーポリシー");
    expect(PRIVACY_POLICY_TEXT_JA).toContain("お問い合わせ");
  });
});
