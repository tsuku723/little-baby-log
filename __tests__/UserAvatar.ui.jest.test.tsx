import React from "react";
import renderer, { act } from "react-test-renderer";

import UserAvatar from "../src/components/UserAvatar";

describe("UserAvatar UI (TS-UI-011)", () => {
  test("profilePhotoPath あり: Image が描画される", async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(UserAvatar, {
          name: "テストちゃん",
          profilePhotoPath: "/path/to/photo.jpg",
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
        })
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("?");
  });

  test("size prop: 指定サイズで描画される", async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(UserAvatar, {
          name: "テスト",
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

  test("非インタラクティブ表示: accessibilityRole=button を持たない", async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(UserAvatar, {
          name: "テストちゃん",
        })
      );
    });
    expect(() =>
      tree.root.findByProps({ accessibilityRole: "button" })
    ).toThrow();
  });
});
