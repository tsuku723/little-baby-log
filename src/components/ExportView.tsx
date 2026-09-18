import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";

import { Asset } from "expo-asset";
import * as MediaLibrary from "expo-media-library";
import ViewShot from "react-native-view-shot";

import { AgeInfo } from "@/models/dataModels";
import { resolvePhotoPath } from "@/utils/photo";
import { COLORS } from "@/constants/colors";

const EXPORT_BACKGROUND_IMAGE = require("../../assets/export/bg_base_green.png");
const EXPORT_DECORATION_IMAGE = require("../../assets/export/deco_overlay_green.png");

// エクスポート画像（1024×1536px）上の座標・サイズ
const EXPORT_CANVAS = { WIDTH: 1024, HEIGHT: 1536 } as const;
const EXPORT_PHOTO_FRAME = {
  LEFT: 114,
  TOP: 161,
  WIDTH: 796,
  HEIGHT: 796,
} as const;
const EXPORT_AGE_BLOCK_TOP = 980;
const EXPORT_RECORD_CARD = { LEFT: 114, RIGHT: 114, TOP: 1140 } as const;
const EXPORT_DATE_BLOCK_TOP = 50;

const EXPORT_IMAGE_READY_TIMEOUT_MS = 3000;
const EXPORT_IMAGE_READY_POLL_INTERVAL_MS = 50;

const waitUntil = async (
  condition: () => boolean,
  timeoutMs = EXPORT_IMAGE_READY_TIMEOUT_MS
) => {
  const startedAt = Date.now();
  while (!condition() && Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) =>
      setTimeout(resolve, EXPORT_IMAGE_READY_POLL_INTERVAL_MS)
    );
  }
};

export type ExportViewHandle = {
  saveToLibrary: () => Promise<void>;
};

type ExportViewProps = {
  ageInfo: AgeInfo | null;
  exportDisplayDate: string;
  exportRecordLines: string[];
  latestPhotoPath: string | null;
};

const ExportView = forwardRef<ExportViewHandle, ExportViewProps>(
  ({ ageInfo, exportDisplayDate, exportRecordLines, latestPhotoPath }, ref) => {
    const viewShotRef = useRef<ViewShot | null>(null);
    const exportBackgroundLoadedRef = useRef(false);
    const exportDecorationLoadedRef = useRef(false);

    useImperativeHandle(ref, () => ({
      saveToLibrary: async () => {
        try {
          const permission = await MediaLibrary.requestPermissionsAsync();
          if (!permission.granted) {
            Alert.alert(
              "権限を確認してください",
              "写真へのアクセスを許可すると画像を保存できます。"
            );
            return;
          }

          // Expo Go等の開発環境ではrequire()画像がMetro経由で遅延取得されるため、
          // キャプチャ前に読み込み完了を保証する。Asset.loadAsyncはファイルの
          // ダウンロードのみ保証するため、<Image>側の描画完了(onLoadEnd)も待つ
          await Asset.loadAsync([
            EXPORT_BACKGROUND_IMAGE,
            EXPORT_DECORATION_IMAGE,
          ]);
          await waitUntil(
            () =>
              exportBackgroundLoadedRef.current &&
              exportDecorationLoadedRef.current
          );

          const uri = await viewShotRef.current?.capture?.();
          if (!uri) {
            throw new Error("capture failed");
          }

          await MediaLibrary.saveToLibraryAsync(uri);
          Alert.alert("保存しました", "写真アプリに画像を保存しました。");
        } catch (error) {
          console.error("Failed to save day image", error);
          Alert.alert("保存に失敗しました", "時間をおいて再度お試しください。");
        }
      },
    }));

    return (
      // 保存用の描画領域（画面には表示しない）
      <View style={styles.hiddenRenderer} pointerEvents="none">
        <ViewShot
          ref={viewShotRef}
          options={{ format: "png", quality: 1 }}
          style={styles.exportContainer}
        >
          <View style={styles.exportContent} collapsable={false}>
            <View style={styles.exportBackground}>
              <Image
                source={EXPORT_BACKGROUND_IMAGE}
                style={styles.exportBackgroundImage}
                resizeMode="contain"
                onLoadEnd={() => {
                  exportBackgroundLoadedRef.current = true;
                }}
              />
              <View style={styles.exportPhotoFrame}>
                {latestPhotoPath ? (
                  <Image
                    source={{ uri: resolvePhotoPath(latestPhotoPath) }}
                    style={styles.exportPhoto}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.exportPhotoPlaceholder} />
                )}
              </View>
              <View style={styles.exportDecorationOverlay} pointerEvents="none">
                <Image
                  source={EXPORT_DECORATION_IMAGE}
                  style={styles.exportDecorationImage}
                  resizeMode="contain"
                  onLoadEnd={() => {
                    exportDecorationLoadedRef.current = true;
                  }}
                />
              </View>
              <View style={styles.exportDateBlock}>
                <Text
                  style={styles.exportDateText}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  {exportDisplayDate}
                </Text>
              </View>

              <View style={styles.exportAgeBlock}>
                {ageInfo?.flags.showMode === "gestational" &&
                ageInfo.gestational.formatted ? (
                  <>
                    <Text style={styles.exportChronologicalAge}>
                      {ageInfo.chronological.formatted}
                    </Text>
                    <Text style={styles.exportCorrectedAge}>
                      （在胎 {ageInfo.gestational.formatted}）
                    </Text>
                  </>
                ) : ageInfo?.corrected.visible &&
                  ageInfo.corrected.formatted ? (
                  <>
                    <Text style={styles.exportChronologicalAge}>
                      {ageInfo.chronological.formatted}
                    </Text>
                    <Text style={styles.exportCorrectedAge}>
                      （修正 {ageInfo.corrected.formatted}）
                    </Text>
                  </>
                ) : (
                  <Text style={styles.exportChronologicalAge}>
                    {ageInfo?.chronological.formatted ?? "-"}
                  </Text>
                )}
              </View>

              <View style={styles.exportRecordCard}>
                {exportRecordLines.map((line, index) => (
                  <Text
                    key={`${line}-${index}`}
                    style={styles.exportRecordText}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {line}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        </ViewShot>
      </View>
    );
  }
);

ExportView.displayName = "ExportView";

const styles = StyleSheet.create({
  hiddenRenderer: {
    position: "absolute",
    top: 0,
    left: 0,
    opacity: 0,
  },
  exportContainer: {
    width: EXPORT_CANVAS.WIDTH,
    height: EXPORT_CANVAS.HEIGHT,
  },
  exportContent: {
    width: EXPORT_CANVAS.WIDTH,
    height: EXPORT_CANVAS.HEIGHT,
  },
  exportBackground: {
    width: "100%",
    height: "100%",
  },
  exportBackgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  exportPhotoFrame: {
    position: "absolute",
    left: EXPORT_PHOTO_FRAME.LEFT,
    top: EXPORT_PHOTO_FRAME.TOP,
    width: EXPORT_PHOTO_FRAME.WIDTH,
    height: EXPORT_PHOTO_FRAME.HEIGHT,
    borderRadius: 34,
    padding: 17,
    backgroundColor: "rgba(255,255,255,0.55)",
    overflow: "hidden",
  },
  exportPhoto: {
    width: "100%",
    height: "100%",
    borderRadius: 23,
    backgroundColor: COLORS.cellDimmed,
  },
  exportPhotoPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  exportAgeBlock: {
    position: "absolute",
    top: EXPORT_AGE_BLOCK_TOP,
    width: "100%",
    alignItems: "center",
    gap: 6,
    zIndex: 2,
  },
  exportChronologicalAge: {
    fontSize: 68,
    fontWeight: "800",
    color: "#3F5F55",
  },
  exportCorrectedAge: {
    fontSize: 32,
    fontWeight: "600",
    color: "#7F9C93",
  },
  exportRecordCard: {
    position: "absolute",
    left: EXPORT_RECORD_CARD.LEFT,
    right: EXPORT_RECORD_CARD.RIGHT,
    top: EXPORT_RECORD_CARD.TOP,
    borderRadius: 25,
    paddingVertical: 19,
    paddingHorizontal: 25,
    backgroundColor: "rgba(255,255,255,0.6)",
    zIndex: 2,
  },
  exportRecordText: {
    fontSize: 32,
    lineHeight: 43,
    color: "#2F4F4F",
  },
  exportDecorationOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  exportDecorationImage: {
    ...StyleSheet.absoluteFillObject,
  },
  exportDateBlock: {
    position: "absolute",
    top: EXPORT_DATE_BLOCK_TOP,
    width: "100%",
    alignItems: "center",
    zIndex: 2,
  },
  exportDateText: {
    fontSize: 44,
    fontWeight: "700",
    color: "#4E6F66",
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 23,
    paddingVertical: 11,
    paddingHorizontal: 21,
  },
});

export default ExportView;
