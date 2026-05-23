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
    expect(json).not.toContain("テ");
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
});
