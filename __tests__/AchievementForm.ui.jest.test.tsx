import React from "react";
import renderer, { act } from "react-test-renderer";
import { Button } from "react-native";

const mockUpsert = jest.fn().mockResolvedValue(undefined);
const mockRemove = jest.fn().mockResolvedValue(undefined);

jest.mock("@/state/AchievementsContext", () => ({
  useAchievements: () => ({
    upsert: mockUpsert,
    remove: mockRemove,
  }),
}));

import AchievementForm from "../src/components/AchievementForm";
import { Achievement } from "../src/models/dataModels";

describe("AchievementForm", () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpsert.mockResolvedValue(undefined);
    mockRemove.mockResolvedValue(undefined);
  });

  const draft: Achievement = {
    id: "a1",
    date: "2024-06-01",
    title: "はじめて笑った",
    memo: "たくさん練習した",
    createdAt: "2024-06-01T00:00:00.000Z",
    updatedAt: "2024-06-01T00:00:00.000Z",
  };

  const findButtonByTitle = (root: any, title: string) =>
    root.findAllByType(Button).find((b: any) => b.props.title === title);

  test("draftありの場合、タイトル/メモが初期値として反映される", async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <AchievementForm isoDay="2024-06-01" draft={draft} onClose={onClose} />
      );
    });

    const titleInput = tree.root.findByProps({
      accessibilityLabel: "タイトル",
    });
    expect(titleInput.props.value).toBe("はじめて笑った");
    const memoInput = tree.root.findByProps({ accessibilityLabel: "メモ" });
    expect(memoInput.props.value).toBe("たくさん練習した");
  });

  test("draftが変わるたびに再初期化される", async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <AchievementForm isoDay="2024-06-01" draft={draft} onClose={onClose} />
      );
    });

    const titleInput = tree.root.findByProps({
      accessibilityLabel: "タイトル",
    });
    await act(async () => {
      titleInput.props.onChangeText("編集中のタイトル");
    });
    expect(
      tree.root.findByProps({ accessibilityLabel: "タイトル" }).props.value
    ).toBe("編集中のタイトル");

    await act(async () => {
      tree.update(
        <AchievementForm isoDay="2024-06-01" draft={null} onClose={onClose} />
      );
    });

    expect(
      tree.root.findByProps({ accessibilityLabel: "タイトル" }).props.value
    ).toBe("");
  });

  test("メモはclampCommentで上限に丸められ、残り文字数が表示される", async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <AchievementForm isoDay="2024-06-01" draft={null} onClose={onClose} />
      );
    });

    const memoInput = tree.root.findByProps({ accessibilityLabel: "メモ" });
    const longText = "あ".repeat(510);
    await act(async () => {
      memoInput.props.onChangeText(longText);
    });

    const updatedMemoInput = tree.root.findByProps({
      accessibilityLabel: "メモ",
    });
    expect(updatedMemoInput.props.value.length).toBe(500);
    expect(JSON.stringify(tree.toJSON())).toContain('"残り ","0"," / 500"');
  });

  test("保存: タイトルはtrimされて送信され、成功時はonCloseが呼ばれる", async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <AchievementForm isoDay="2024-06-01" draft={null} onClose={onClose} />
      );
    });

    const titleInput = tree.root.findByProps({
      accessibilityLabel: "タイトル",
    });
    await act(async () => {
      titleInput.props.onChangeText("  初めて座った  ");
    });

    await act(async () => {
      findButtonByTitle(tree.root, "保存して閉じる").props.onPress();
    });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ title: "初めて座った", date: "2024-06-01" })
    );
    expect(onClose).toHaveBeenCalled();
  });

  test("保存失敗時はエラーがalertされ、onCloseは呼ばれない", async () => {
    mockUpsert.mockRejectedValueOnce(new Error("save failed"));
    const alertSpy = jest.fn();
    (global as any).alert = alertSpy;
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <AchievementForm isoDay="2024-06-01" draft={null} onClose={onClose} />
      );
    });

    await act(async () => {
      findButtonByTitle(tree.root, "保存して閉じる").props.onPress();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      "保存中にエラーが発生しました。もう一度お試しください。"
    );
    expect(onClose).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  test("draft.idがある場合のみ削除ボタンが表示される", async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <AchievementForm isoDay="2024-06-01" draft={draft} onClose={onClose} />
      );
    });
    expect(findButtonByTitle(tree.root, "この記録を削除")).toBeTruthy();

    await act(async () => {
      tree.update(
        <AchievementForm isoDay="2024-06-01" draft={null} onClose={onClose} />
      );
    });
    expect(findButtonByTitle(tree.root, "この記録を削除")).toBeFalsy();
  });

  test("削除ボタン押下でremoveが呼ばれ、onCloseされる", async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <AchievementForm isoDay="2024-06-01" draft={draft} onClose={onClose} />
      );
    });

    await act(async () => {
      findButtonByTitle(tree.root, "この記録を削除").props.onPress();
    });

    expect(mockRemove).toHaveBeenCalledWith("a1", "2024-06-01");
    expect(onClose).toHaveBeenCalled();
  });
});
