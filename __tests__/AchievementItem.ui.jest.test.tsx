import React from "react";
import renderer, { act } from "react-test-renderer";

import AchievementItem from "../src/components/AchievementItem";
import { Achievement } from "../src/models/dataModels";

describe("AchievementItem", () => {
  const baseItem: Achievement = {
    id: "a1",
    date: "2024-06-01",
    title: "はじめて笑った",
    memo: "",
    createdAt: "2024-06-01T00:00:00.000Z",
    updatedAt: "2024-06-01T00:00:00.000Z",
  } as Achievement;

  test("本体タップでonEditが呼ばれる", async () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <AchievementItem item={baseItem} onEdit={onEdit} onDelete={onDelete} />
      );
    });

    // touchables[0] が本体、touchables[1] が削除ボタン
    const TouchableOpacity = require("react-native").TouchableOpacity;
    const touchables = tree.root.findAllByType(TouchableOpacity);
    await act(async () => {
      touchables[0].props.onPress();
    });

    expect(onEdit).toHaveBeenCalledWith(baseItem);
    expect(onDelete).not.toHaveBeenCalled();
  });

  test("削除ボタンタップでonDeleteが呼ばれ、onEditへの伝播はしない", async () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <AchievementItem item={baseItem} onEdit={onEdit} onDelete={onDelete} />
      );
    });

    const TouchableOpacity = require("react-native").TouchableOpacity;
    const touchables = tree.root.findAllByType(TouchableOpacity);
    await act(async () => {
      touchables[1].props.onPress();
    });

    expect(onDelete).toHaveBeenCalledWith(baseItem);
    expect(onEdit).not.toHaveBeenCalled();
  });

  test("memoがある場合はメモ欄が表示される", async () => {
    const item = { ...baseItem, memo: "たくさん練習した" };
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <AchievementItem item={item} onEdit={jest.fn()} onDelete={jest.fn()} />
      );
    });
    expect(JSON.stringify(tree.toJSON())).toContain("たくさん練習した");
  });

  test("memoが無い場合はメモ欄が表示されない", async () => {
    const item = { ...baseItem, memo: "" };
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <AchievementItem item={item} onEdit={jest.fn()} onDelete={jest.fn()} />
      );
    });
    // タイトルと削除ラベルの2つのTextのみ（メモ用Textが無い）
    const texts = tree.root.findAllByType(require("react-native").Text);
    expect(texts.length).toBe(2);
  });
});
