import React from "react";
import renderer, { act } from "react-test-renderer";

const mockGenerateCropPreviewAsync = jest.fn();

jest.mock("@/utils/photo", () => ({
  generateCropPreviewAsync: (...args: any[]) =>
    mockGenerateCropPreviewAsync(...args),
}));

jest.setTimeout(20000);

import PhotoCropModal from "../src/components/PhotoCropModal";

describe("PhotoCropModal", () => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateCropPreviewAsync.mockResolvedValue("preview://scaled.jpg");
    onConfirm.mockResolvedValue(undefined);
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

  const renderModal = async (props: Partial<any> = {}) => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        React.createElement(PhotoCropModal, {
          visible: true,
          imageUri: "file://image.jpg",
          imageWidth: 1000,
          imageHeight: 800,
          aspectRatio: 1,
          onConfirm,
          onCancel,
          ...props,
        })
      );
    });
    return tree;
  };

  const triggerLayout = async (tree: any, width: number, height: number) => {
    const cropArea = tree.root.findByProps({ testID: "photo-crop-area" });
    await act(async () => {
      cropArea.props.onLayout({ nativeEvent: { layout: { width, height } } });
    });
  };

  test("frame/baseScale/previewUriが揃うまでクロップUIが表示されない", async () => {
    let resolvePreview: (uri: string) => void = () => {};
    mockGenerateCropPreviewAsync.mockReturnValue(
      new Promise((resolve) => {
        resolvePreview = resolve;
      })
    );
    const tree = await renderModal();
    await triggerLayout(tree, 300, 300);

    // previewUriがまだ来ていないためisReady=falseで枠線は表示されない
    expect(
      tree.root.findAllByProps({ testID: "photo-crop-frame" }).length
    ).toBe(0);

    await act(async () => {
      resolvePreview("preview://scaled.jpg");
    });

    expect(
      tree.root.findAllByProps({ testID: "photo-crop-frame" }).length
    ).toBeGreaterThan(0);
  });

  test("プレビュー生成が失敗した場合、元のimageUriにフォールバックする", async () => {
    mockGenerateCropPreviewAsync.mockRejectedValue(new Error("fail"));
    const tree = await renderModal();
    await triggerLayout(tree, 300, 300);

    const image = tree.root.findByType(require("react-native").Image);
    expect(image.props.source.uri).toBe("file://image.jpg");
  });

  test("maskShape=circleの場合、枠線にborderRadiusが付与される", async () => {
    const tree = await renderModal({ maskShape: "circle" });
    await triggerLayout(tree, 300, 300);

    const frame = tree.root.findByProps({ testID: "photo-crop-frame" });
    const flatStyle = Object.assign(
      {},
      ...([] as any[]).concat(frame.props.style)
    );
    expect(flatStyle.borderRadius).toBeGreaterThan(0);
  });

  test("maskShape未指定（rectangle）の場合、borderRadiusは0", async () => {
    const tree = await renderModal();
    await triggerLayout(tree, 300, 300);

    const frame = tree.root.findByProps({ testID: "photo-crop-frame" });
    const flatStyle = Object.assign(
      {},
      ...([] as any[]).concat(frame.props.style)
    );
    expect(flatStyle.borderRadius).toBe(0);
  });

  test("visibleがfalse→trueになるとisSavingがリセットされる（完了ボタンが有効）", async () => {
    const tree = await renderModal();
    await triggerLayout(tree, 300, 300);

    await act(async () => {
      findButtonByText(tree.root, "完了").props.onPress();
    });
    // handleConfirm実行中はonConfirmがpendingのため呼び出しをresolveしておく
    await act(async () => {
      await Promise.resolve();
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test("handleConfirm: isSaving中は多重実行されない", async () => {
    let resolveConfirm: () => void = () => {};
    onConfirm.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveConfirm = resolve;
      })
    );
    const tree = await renderModal();
    await triggerLayout(tree, 300, 300);

    await act(async () => {
      findButtonByText(tree.root, "完了").props.onPress();
    });
    await act(async () => {
      findButtonByText(tree.root, "完了").props.onPress();
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveConfirm();
    });
  });

  test("handleConfirm: frame/baseScaleが未計算(レイアウト前)の場合は何もしない", async () => {
    const tree = await renderModal();
    // triggerLayoutを呼ばずレイアウト前の状態を維持
    await act(async () => {
      findButtonByText(tree.root, "完了").props.onPress();
    });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test("handleConfirm: onConfirmが失敗してもfinallyでisSavingが戻る", async () => {
    onConfirm.mockRejectedValueOnce(new Error("save failed"));
    const tree = await renderModal();
    await triggerLayout(tree, 300, 300);

    await act(async () => {
      await findButtonByText(tree.root, "完了")
        .props.onPress()
        .catch(() => {});
    });

    const confirmButton = findButtonByText(tree.root, "完了");
    expect(confirmButton.props.disabled).toBe(false);
  });

  test("handleCancel: isSaving中は何もしない", async () => {
    let resolveConfirm: () => void = () => {};
    onConfirm.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveConfirm = resolve;
      })
    );
    const tree = await renderModal();
    await triggerLayout(tree, 300, 300);

    await act(async () => {
      findButtonByText(tree.root, "完了").props.onPress();
    });
    await act(async () => {
      findButtonByText(tree.root, "キャンセル").props.onPress();
    });

    expect(onCancel).not.toHaveBeenCalled();

    await act(async () => {
      resolveConfirm();
    });
  });

  test("visible=falseの場合、クロップUIが表示されない", async () => {
    const tree = await renderModal({ visible: false });
    expect(
      tree.root.findAllByProps({ testID: "photo-crop-frame" }).length
    ).toBe(0);
    expect(mockGenerateCropPreviewAsync).not.toHaveBeenCalled();
  });

  test("handleCancel: isSavingでなければonCancelが呼ばれる", async () => {
    const tree = await renderModal();
    await triggerLayout(tree, 300, 300);

    await act(async () => {
      findButtonByText(tree.root, "キャンセル").props.onPress();
    });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
