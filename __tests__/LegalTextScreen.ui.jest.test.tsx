import React from "react";
import renderer, { act } from "react-test-renderer";
import { Text } from "react-native";

import LegalTextScreen from "../src/screens/LegalTextScreen";

describe("LegalTextScreen", () => {
  const renderScreen = async (text: string, onBack = jest.fn()) => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <LegalTextScreen text={text} title="規約" onBack={onBack} />
      );
    });
    return tree;
  };

  test("**太字**記法が分割されスタイル適用される", async () => {
    const tree = await renderScreen("これは**重要**な項目です");
    const texts = tree.root.findAllByType(Text);
    const boldText = texts.find(
      (t: any) => t.props.style?.fontFamily === "ZenMaruGothic-Medium"
    );
    expect(boldText).toBeTruthy();
    expect(boldText.props.children).toBe("重要");
    // 太字部分は分割され、前後の平文とは別のTextノードになっている
    expect(JSON.stringify(tree.toJSON())).toContain("重要");
  });

  test("太字記法が無い場合、そのまま文字列が表示される", async () => {
    const tree = await renderScreen("通常の段落です");
    expect(JSON.stringify(tree.toJSON())).toContain("通常の段落です");
  });

  test("空行はspaceスタイルのViewとして表示される", async () => {
    const tree = await renderScreen("段落1\n\n段落2");
    const json = tree.toJSON();
    expect(JSON.stringify(json)).toContain("段落1");
    expect(JSON.stringify(json)).toContain("段落2");
  });

  test("---は区切り線として表示される", async () => {
    const tree = await renderScreen("段落1\n---\n段落2");
    const dividers = tree.root.findAll(
      (node: any) =>
        node.type === "View" &&
        Array.isArray(node.props.style) === false &&
        node.props.style?.height === 1
    );
    expect(dividers.length).toBeGreaterThan(0);
  });

  test("# 見出しはsectionTitleスタイルで表示される", async () => {
    const tree = await renderScreen("# 大見出し");
    expect(JSON.stringify(tree.toJSON())).toContain("大見出し");
    expect(JSON.stringify(tree.toJSON())).not.toContain("# 大見出し");
  });

  test("## 見出しはheadingスタイルで表示される", async () => {
    const tree = await renderScreen("## 中見出し");
    expect(JSON.stringify(tree.toJSON())).toContain("中見出し");
  });

  test("### 見出しはsubHeadingスタイルで表示される", async () => {
    const tree = await renderScreen("### 小見出し");
    expect(JSON.stringify(tree.toJSON())).toContain("小見出し");
  });

  test("通常段落はbodyスタイルで表示される", async () => {
    const tree = await renderScreen("通常の本文段落");
    expect(JSON.stringify(tree.toJSON())).toContain("通常の本文段落");
  });

  test("戻るボタンでonBackが呼ばれる", async () => {
    const onBack = jest.fn();
    const tree = await renderScreen("本文", onBack);
    const backButton = tree.root.findByProps({ accessibilityLabel: "戻る" });
    await act(async () => {
      backButton.props.onPress();
    });
    expect(onBack).toHaveBeenCalled();
  });
});
