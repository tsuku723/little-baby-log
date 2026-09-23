import React from "react";
import renderer, { act } from "react-test-renderer";
import { Alert, Linking } from "react-native";

import ContactScreen from "../src/screens/ContactScreen";

const mockNavigation = {
  goBack: jest.fn(),
};

jest.setTimeout(20000);

describe("ContactScreen", () => {
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
        node.props.accessibilityRole === "button" && extractText(node) === text
    )[0];
  };

  const renderScreen = async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <ContactScreen navigation={mockNavigation as any} route={{} as any} />
      );
    });
    return tree;
  };

  test("メールを起動できる場合、Linking.openURLが呼ばれる", async () => {
    jest.spyOn(Linking, "canOpenURL").mockResolvedValue(true);
    const openURLSpy = jest
      .spyOn(Linking, "openURL")
      .mockResolvedValue(undefined as any);

    const tree = await renderScreen();
    await act(async () => {
      await findButtonByText(tree.root, "メールを起動する").props.onPress();
    });

    expect(openURLSpy).toHaveBeenCalledWith(expect.stringContaining("mailto:"));
  });

  test("メールを起動できない場合、エラーアラートが表示されopenURLは呼ばれない", async () => {
    jest.spyOn(Linking, "canOpenURL").mockResolvedValue(false);
    const openURLSpy = jest.spyOn(Linking, "openURL");
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const tree = await renderScreen();
    await act(async () => {
      await findButtonByText(tree.root, "メールを起動する").props.onPress();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      "メールを開けません",
      "メールアプリが利用できるか確認してください。"
    );
    expect(openURLSpy).not.toHaveBeenCalled();
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
