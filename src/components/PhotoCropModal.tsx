import React, { useEffect, useMemo, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { COLORS } from "@/constants/colors";
import {
  CropRect,
  calculateBaseScale,
  calculateCropRect,
  calculateFrameSize,
  calculatePanBounds,
  clamp,
} from "@/utils/cropMath";

type Props = {
  visible: boolean;
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  aspectRatio: number;
  /** 保存後に円形マスクで表示される用途（アバター等）の場合、枠のガイドも円形にする */
  maskShape?: "rectangle" | "circle";
  onConfirm: (cropRect: CropRect) => void | Promise<void>;
  onCancel: () => void;
};

const MIN_USER_SCALE = 1;
const MAX_USER_SCALE = 4;
const FRAME_MARGIN = 24;
const DIM_OVERLAY_COLOR = "rgba(0, 0, 0, 0.6)";

const PhotoCropModal: React.FC<Props> = ({
  visible,
  imageUri,
  imageWidth,
  imageHeight,
  aspectRatio,
  maskShape = "rectangle",
  onConfirm,
  onCancel,
}) => {
  const insets = useSafeAreaInsets();
  const [cropAreaSize, setCropAreaSize] = useState({ width: 0, height: 0 });
  const [isSaving, setIsSaving] = useState(false);

  const userScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const pinchStartScale = useSharedValue(1);
  const panStart = useSharedValue({ x: 0, y: 0 });

  useEffect(() => {
    if (!visible) return;
    userScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    setIsSaving(false);
  }, [visible, userScale, translateX, translateY]);

  const frame = useMemo(
    () =>
      calculateFrameSize(
        cropAreaSize.width,
        cropAreaSize.height,
        aspectRatio,
        FRAME_MARGIN
      ),
    [cropAreaSize.width, cropAreaSize.height, aspectRatio]
  );

  const baseScale = useMemo(
    () =>
      frame.width > 0 && frame.height > 0
        ? calculateBaseScale(imageWidth, imageHeight, frame)
        : 0,
    [imageWidth, imageHeight, frame]
  );

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onStart(() => {
          pinchStartScale.value = userScale.value;
        })
        .onUpdate((e) => {
          "worklet";
          const nextScale = clamp(
            pinchStartScale.value * e.scale,
            MIN_USER_SCALE,
            MAX_USER_SCALE
          );
          userScale.value = nextScale;
          const bounds = calculatePanBounds(
            imageWidth,
            imageHeight,
            frame,
            baseScale,
            nextScale
          );
          translateX.value = clamp(translateX.value, -bounds.maxX, bounds.maxX);
          translateY.value = clamp(translateY.value, -bounds.maxY, bounds.maxY);
        }),
    [
      baseScale,
      frame,
      imageWidth,
      imageHeight,
      pinchStartScale,
      translateX,
      translateY,
      userScale,
    ]
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          panStart.value = { x: translateX.value, y: translateY.value };
        })
        .onUpdate((e) => {
          "worklet";
          const bounds = calculatePanBounds(
            imageWidth,
            imageHeight,
            frame,
            baseScale,
            userScale.value
          );
          translateX.value = clamp(
            panStart.value.x + e.translationX,
            -bounds.maxX,
            bounds.maxX
          );
          translateY.value = clamp(
            panStart.value.y + e.translationY,
            -bounds.maxY,
            bounds.maxY
          );
        }),
    [
      baseScale,
      frame,
      imageWidth,
      imageHeight,
      panStart,
      translateX,
      translateY,
      userScale,
    ]
  );

  const composedGesture = useMemo(
    () => Gesture.Simultaneous(pinchGesture, panGesture),
    [pinchGesture, panGesture]
  );

  const translateStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const scaleStyle = useAnimatedStyle(() => ({
    width: imageWidth * baseScale,
    height: imageHeight * baseScale,
    transform: [{ scale: userScale.value }],
  }));

  const handleConfirm = async () => {
    if (isSaving) return;
    if (frame.width <= 0 || frame.height <= 0 || baseScale <= 0) return;
    const cropRect = calculateCropRect(
      imageWidth,
      imageHeight,
      frame,
      baseScale,
      userScale.value,
      translateX.value,
      translateY.value
    );
    setIsSaving(true);
    try {
      await onConfirm(cropRect);
    } finally {
      // 確定成功時は通常このモーダル自体が閉じられるが、
      // 失敗時にも再操作できるようフラグを戻しておく
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isSaving) return;
    onCancel();
  };

  // 枠の外側を暗くするための帯（上下左右）。枠は常にcropArea中央に配置される前提で計算する。
  const marginX = Math.max(0, (cropAreaSize.width - frame.width) / 2);
  const marginY = Math.max(0, (cropAreaSize.height - frame.height) / 2);
  const isReady = frame.width > 0 && frame.height > 0 && baseScale > 0;

  return (
    <Modal
      animationType="fade"
      visible={visible}
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.headerSideButton}
            onPress={handleCancel}
            disabled={isSaving}
            accessibilityRole="button"
          >
            <Text
              style={[styles.headerText, isSaving && styles.headerTextDisabled]}
            >
              キャンセル
            </Text>
          </TouchableOpacity>
          <Text style={styles.title}>写真を調整</Text>
          <TouchableOpacity
            style={[styles.headerSideButton, styles.headerSideButtonRight]}
            onPress={handleConfirm}
            disabled={isSaving}
            accessibilityRole="button"
          >
            <Text
              style={[styles.headerText, isSaving && styles.headerTextDisabled]}
            >
              完了
            </Text>
          </TouchableOpacity>
        </View>
        <View
          style={styles.cropArea}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setCropAreaSize({ width, height });
          }}
        >
          {isReady ? (
            <>
              <View style={styles.imageBleedLayer}>
                <GestureDetector gesture={composedGesture}>
                  <Animated.View style={[styles.panLayer, translateStyle]}>
                    <Animated.Image
                      source={{ uri: imageUri }}
                      style={scaleStyle}
                    />
                  </Animated.View>
                </GestureDetector>
              </View>
              <View
                pointerEvents="none"
                style={[
                  styles.dimBand,
                  { top: 0, left: 0, right: 0, height: marginY },
                ]}
              />
              <View
                pointerEvents="none"
                style={[
                  styles.dimBand,
                  { bottom: 0, left: 0, right: 0, height: marginY },
                ]}
              />
              <View
                pointerEvents="none"
                style={[
                  styles.dimBand,
                  {
                    top: marginY,
                    left: 0,
                    width: marginX,
                    height: frame.height,
                  },
                ]}
              />
              <View
                pointerEvents="none"
                style={[
                  styles.dimBand,
                  {
                    top: marginY,
                    right: 0,
                    width: marginX,
                    height: frame.height,
                  },
                ]}
              />
              <View
                pointerEvents="none"
                style={[
                  styles.frameBorder,
                  {
                    top: marginY,
                    left: marginX,
                    width: frame.width,
                    height: frame.height,
                    borderRadius:
                      maskShape === "circle"
                        ? Math.min(frame.width, frame.height) / 2
                        : 0,
                  },
                ]}
              />
            </>
          ) : null}
        </View>
        <Text style={[styles.helperText, { paddingBottom: insets.bottom + 8 }]}>
          ピンチで拡大縮小、ドラッグで位置を調整できます
        </Text>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerSideButton: {
    minWidth: 64,
  },
  headerSideButtonRight: {
    alignItems: "flex-end",
  },
  headerText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.surface,
  },
  headerTextDisabled: {
    opacity: 0.4,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.surface,
  },
  cropArea: {
    flex: 1,
    overflow: "hidden",
  },
  imageBleedLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  panLayer: {},
  dimBand: {
    position: "absolute",
    backgroundColor: DIM_OVERLAY_COLOR,
  },
  frameBorder: {
    position: "absolute",
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  helperText: {
    textAlign: "center",
    color: COLORS.surface,
    fontSize: 13,
    paddingTop: 16,
  },
});

export default PhotoCropModal;
