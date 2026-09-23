import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("@/content/licenses", () => ({
  MIT_LICENSE_TEXT: "MIT license full text",
  OFL_LICENSE_TEXT: "OFL license full text",
  LICENSES: [
    {
      name: "lib-mit",
      license: "MIT",
      copyright: "Copyright (c) MIT Author",
    },
    {
      name: "lib-unknown",
      license: "Apache-2.0",
      copyright: "Copyright (c) Apache Author",
    },
  ],
}));

import OpenSourceLicensesScreen from "../src/screens/OpenSourceLicensesScreen";

const mockNavigation = {
  goBack: jest.fn(),
};

describe("OpenSourceLicensesScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const findButtonByText = (root: any, text: string) => {
    const extractText = (node: any): string =>
      (node.children ?? [])
        .map((child: any) =>
          typeof child === "string" ? child : extractText(child)
        )
        .join("");
    return root.findAll(
      (node: any) =>
        node.props.accessibilityRole === "button" &&
        extractText(node).includes(text)
    )[0];
  };

  const renderScreen = async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <OpenSourceLicensesScreen
          navigation={mockNavigation as any}
          route={{} as any}
        />
      );
    });
    return tree;
  };

  test("タップで開閉が切り替わり、開くと著作権とライセンス全文が表示される（対応ライセンス）", async () => {
    const tree = await renderScreen();
    const json1 = JSON.stringify(tree.toJSON());
    expect(json1).not.toContain("Copyright (c) MIT Author");

    await act(async () => {
      findButtonByText(tree.root, "lib-mit").props.onPress();
    });

    const json2 = JSON.stringify(tree.toJSON());
    expect(json2).toContain("Copyright (c) MIT Author");
    expect(json2).toContain("MIT license full text");

    await act(async () => {
      findButtonByText(tree.root, "lib-mit").props.onPress();
    });
    const json3 = JSON.stringify(tree.toJSON());
    expect(json3).not.toContain("Copyright (c) MIT Author");
  });

  test("LICENSE_TEXTに対応が無いライセンス種別の場合、ライセンス全文欄が表示されない", async () => {
    const tree = await renderScreen();

    await act(async () => {
      findButtonByText(tree.root, "lib-unknown").props.onPress();
    });

    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("Copyright (c) Apache Author");
    expect(json).not.toContain("license full text");
  });

  test("戻るボタンでnavigation.goBackが呼ばれる", async () => {
    const tree = await renderScreen();
    const backButton = tree.root.findByProps({ accessibilityLabel: "戻る" });
    await act(async () => {
      backButton.props.onPress();
    });
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });
});
