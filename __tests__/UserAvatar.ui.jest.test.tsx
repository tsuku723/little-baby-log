import React from "react";
import renderer, { act } from "react-test-renderer";

import UserAvatar from "../src/components/UserAvatar";

const mockOnPress = jest.fn();

describe("UserAvatar UI (TS-UI-011)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("profilePhotoPath あり: Image が描画される", async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(UserAvatar, {
          name: "テストちゃん",
          profilePhotoPath: "/path/to/photo.jpg",
          onPress: mockOnPress,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("/path/to/photo.jpg");
    // プレースホルダーの頭文字テキストが children として存在しないことを確認
    const instance = tree.root;
    const { Image: RNImage } = require("react-native");
    expect(instance.findAllByType(RNImage)).toHaveLength(1);
  });

  test("profilePhotoPath なし: 名前の頭文字が表示される", async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(UserAvatar, {
          name: "テストちゃん",
          onPress: mockOnPress,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("テ");
  });

  test("名前が空: ? が表示される", async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(UserAvatar, {
          name: "",
          onPress: mockOnPress,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("?");
  });

  test("タップ: onPress が呼ばれる", async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(UserAvatar, {
          name: "テストちゃん",
          onPress: mockOnPress,
        })
      );
    });
    const instance = tree.root;
    const touchable = instance.findByProps({ accessibilityRole: "button" });
    await act(async () => {
      touchable.props.onPress();
    });
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  test("size prop: 指定サイズで描画される", async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(UserAvatar, {
          name: "テスト",
          onPress: mockOnPress,
          size: 60,
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("60");
  });

  test("Image の onError: ファイルが存在しない場合に頭文字フォールバックへ切り替わる", async () => {
    const { Image: RNImage } = require("react-native");
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(UserAvatar, {
          name: "テストちゃん",
          profilePhotoPath: "/missing/photo.jpg",
          onPress: mockOnPress,
        })
      );
    });
    // 初期状態: Image が描画されている
    expect(tree.root.findAllByType(RNImage)).toHaveLength(1);

    // onError を発火させる
    const image = tree.root.findAllByType(RNImage)[0];
    await act(async () => {
      image.props.onError();
    });

    // フォールバック: Image が消えて頭文字が表示される
    expect(tree.root.findAllByType(RNImage)).toHaveLength(0);
    expect(JSON.stringify(tree.toJSON())).toContain("テ");
  });

  test("accessibilityLabel: 名前ありの場合「${name}のプロフィールを編集」になる", async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(UserAvatar, {
          name: "テストちゃん",
          onPress: mockOnPress,
        })
      );
    });
    const touchable = tree.root.findByProps({ accessibilityRole: "button" });
    expect(touchable.props.accessibilityLabel).toBe(
      "テストちゃんのプロフィールを編集"
    );
  });

  test("accessibilityLabel: 名前なしの場合「プロフィールを編集」になる", async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(UserAvatar, {
          name: "",
          onPress: mockOnPress,
        })
      );
    });
    const touchable = tree.root.findByProps({ accessibilityRole: "button" });
    expect(touchable.props.accessibilityLabel).toBe("プロフィールを編集");
  });
});
