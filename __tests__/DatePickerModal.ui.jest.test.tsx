import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: ({ value, onChange }: any) =>
      React.createElement(View, {
        testID: "date-time-picker",
        value,
        onChange,
      }),
  };
});

import DatePickerModal from "../src/components/DatePickerModal";

describe("DatePickerModal", () => {
  const minimumDate = new Date(2024, 0, 1);
  const maximumDate = new Date(2024, 11, 31);
  const onConfirm = jest.fn();
  const onCancel = jest.fn();

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

  const getPicker = (tree: any) =>
    tree.root.findByProps({ testID: "date-time-picker" });

  const renderModal = async (props: Partial<any> = {}) => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <DatePickerModal
          visible
          title="日付を選択"
          value={new Date(2024, 5, 1)}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onConfirm={onConfirm}
          onCancel={onCancel}
          {...props}
        />
      );
    });
    return tree;
  };

  test("不正な日付が渡された場合、範囲内にクランプした今日の日付にフォールバックする", async () => {
    const realDate = Date;
    const fixedNow = new realDate(2024, 5, 15);
    const dateSpy = jest
      .spyOn(global, "Date")
      .mockImplementation((...args: any[]) =>
        args.length === 0 ? fixedNow : new (realDate as any)(...args)
      );
    (global.Date as any).now = () => fixedNow.getTime();

    const tree = await renderModal({ value: new Date(NaN) });
    expect(getPicker(tree).props.value.getTime()).toBe(fixedNow.getTime());

    dateSpy.mockRestore();
  });

  test("minimumDateより前の日付はminimumDateにクランプされる", async () => {
    const tree = await renderModal({ value: new Date(2023, 0, 1) });
    expect(getPicker(tree).props.value.getTime()).toBe(minimumDate.getTime());
  });

  test("maximumDateより後の日付はmaximumDateにクランプされる", async () => {
    const tree = await renderModal({ value: new Date(2025, 0, 1) });
    expect(getPicker(tree).props.value.getTime()).toBe(maximumDate.getTime());
  });

  test("visibleがtrueになるたびにvalueが再正規化される", async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <DatePickerModal
          visible={false}
          title="日付を選択"
          value={new Date(2024, 5, 1)}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
    });

    await act(async () => {
      tree.update(
        <DatePickerModal
          visible
          title="日付を選択"
          value={new Date(2025, 0, 1)}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
    });

    expect(getPicker(tree).props.value.getTime()).toBe(maximumDate.getTime());
  });

  test("handleDateChange: event.type=dismissedの場合は状態を更新しない", async () => {
    const tree = await renderModal({ value: new Date(2024, 5, 1) });
    const before = getPicker(tree).props.value.getTime();

    await act(async () => {
      getPicker(tree).props.onChange(
        { type: "dismissed" },
        new Date(2024, 6, 1)
      );
    });

    expect(getPicker(tree).props.value.getTime()).toBe(before);
  });

  test("handleDateChange: 選択日時が範囲外の場合は正規化されてtempDateにセットされる", async () => {
    const tree = await renderModal({ value: new Date(2024, 5, 1) });

    await act(async () => {
      getPicker(tree).props.onChange({ type: "set" }, new Date(2025, 0, 1));
    });

    expect(getPicker(tree).props.value.getTime()).toBe(maximumDate.getTime());
  });

  test("handleDateChange: 選択日時が範囲内の場合はそのままtempDateにセットされる", async () => {
    const tree = await renderModal({ value: new Date(2024, 5, 1) });
    const picked = new Date(2024, 6, 15);

    await act(async () => {
      getPicker(tree).props.onChange({ type: "set" }, picked);
    });

    expect(getPicker(tree).props.value.getTime()).toBe(picked.getTime());
  });

  test("handleDateChange: pickedDateが無い場合は状態を更新しない", async () => {
    const tree = await renderModal({ value: new Date(2024, 5, 1) });
    const before = getPicker(tree).props.value.getTime();

    await act(async () => {
      getPicker(tree).props.onChange({ type: "set" }, undefined);
    });

    expect(getPicker(tree).props.value.getTime()).toBe(before);
  });

  test("「完了」タップでtempDateがonConfirmに渡される", async () => {
    const tree = await renderModal({ value: new Date(2024, 5, 1) });
    const picked = new Date(2024, 6, 15);

    await act(async () => {
      getPicker(tree).props.onChange({ type: "set" }, picked);
    });
    await act(async () => {
      findButtonByText(tree.root, "完了").props.onPress();
    });

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ getTime: expect.any(Function) })
    );
    expect(onConfirm.mock.calls[0][0].getTime()).toBe(picked.getTime());
  });

  test("ヘッダーの「キャンセル」タップでonCancelが呼ばれる", async () => {
    const tree = await renderModal();
    await act(async () => {
      findButtonByText(tree.root, "キャンセル").props.onPress();
    });
    expect(onCancel).toHaveBeenCalled();
  });

  test("オーバーレイタップでonCancelが呼ばれる", async () => {
    const tree = await renderModal();
    // ヘッダーの「キャンセル」とオーバーレイの両方がaccessibilityRole="button"を持つため、
    // 最初に見つかる方（オーバーレイ）を対象にする
    const overlay = tree.root.findAll(
      (node: any) => node.props.accessibilityRole === "button"
    )[0];
    await act(async () => {
      overlay.props.onPress();
    });
    expect(onCancel).toHaveBeenCalled();
  });
});
