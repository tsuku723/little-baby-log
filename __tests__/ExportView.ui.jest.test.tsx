import React from "react";
import renderer, { act } from "react-test-renderer";
import { Alert, Image } from "react-native";

import ExportView, { ExportViewHandle } from "../src/components/ExportView";

const mockCapture = jest.fn();

jest.mock("expo-media-library", () => ({
  requestPermissionsAsync: jest.fn(),
  saveToLibraryAsync: jest.fn(),
}));

jest.mock("expo-asset", () => ({
  Asset: { loadAsync: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock("react-native-view-shot", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({ capture: mockCapture }));
      return React.createElement(View, null, props.children);
    }),
  };
});

const MediaLibrary = require("expo-media-library");

const baseProps = {
  ageInfo: null,
  exportDisplayDate: "2024年6月1日",
  exportRecordLines: [],
  latestPhotoPath: null,
};

const renderExportView = () => {
  const ref = React.createRef<ExportViewHandle>();
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(<ExportView ref={ref} {...baseProps} />);
  });
  // 背景・装飾画像の読み込み完了を模擬し、saveToLibrary内のwaitUntilを即座に解決させる
  act(() => {
    tree.root.findAllByType(Image).forEach((instance) => {
      instance.props.onLoadEnd?.();
    });
  });
  return { ref, tree };
};

describe("ExportView saveToLibrary (Issue #320)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  test("権限が拒否された場合、確認を促すAlertを表示し以降の保存処理を実行しない", async () => {
    MediaLibrary.requestPermissionsAsync.mockResolvedValue({
      granted: false,
    });
    const { ref } = renderExportView();

    await act(async () => {
      await ref.current!.saveToLibrary();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      "権限を確認してください",
      "写真へのアクセスを許可すると画像を保存できます。"
    );
    expect(mockCapture).not.toHaveBeenCalled();
    expect(MediaLibrary.saveToLibraryAsync).not.toHaveBeenCalled();
  });

  test("キャプチャが失敗（undefined）した場合、エラーAlertを表示する", async () => {
    MediaLibrary.requestPermissionsAsync.mockResolvedValue({ granted: true });
    mockCapture.mockResolvedValue(undefined);
    const { ref } = renderExportView();

    await act(async () => {
      await ref.current!.saveToLibrary();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      "保存に失敗しました",
      "時間をおいて再度お試しください。"
    );
    expect(MediaLibrary.saveToLibraryAsync).not.toHaveBeenCalled();
  });

  test("saveToLibraryAsyncが例外を投げた場合、エラーAlertを表示する", async () => {
    MediaLibrary.requestPermissionsAsync.mockResolvedValue({ granted: true });
    mockCapture.mockResolvedValue("file:///tmp/export.png");
    MediaLibrary.saveToLibraryAsync.mockRejectedValue(new Error("failed"));
    const { ref } = renderExportView();

    await act(async () => {
      await ref.current!.saveToLibrary();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      "保存に失敗しました",
      "時間をおいて再度お試しください。"
    );
  });

  test("正常系: 権限あり・キャプチャ成功・保存成功時に成功Alertを表示する", async () => {
    MediaLibrary.requestPermissionsAsync.mockResolvedValue({ granted: true });
    mockCapture.mockResolvedValue("file:///tmp/export.png");
    MediaLibrary.saveToLibraryAsync.mockResolvedValue(undefined);
    const { ref } = renderExportView();

    await act(async () => {
      await ref.current!.saveToLibrary();
    });

    expect(MediaLibrary.saveToLibraryAsync).toHaveBeenCalledWith(
      "file:///tmp/export.png"
    );
    expect(Alert.alert).toHaveBeenCalledWith(
      "保存しました",
      "写真アプリに画像を保存しました。"
    );
  });
});
