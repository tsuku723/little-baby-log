import React, { useEffect, useMemo, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
  onConfirm: (cropRect: CropRect) => void;
  onCancel: () => void;
};

const MIN_USER_SCALE = 1;
const MAX_USER_SCALE = 4;
const FRAME_MARGIN = 24;

const PhotoCropModal: React.FC<Props> = ({
  visible,
  imageUri,
  imageWidth,
  imageHeight,
  aspectRatio,
  onConfirm,
  onCancel,
}) => {
  const [cropAreaSize, setCropAreaSize] = useState({ width: 0, height: 0 });

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

  const handleConfirm = () => {
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
    onConfirm(cropRect);
  };

  return (
    <Modal
      animationType="fade"
      visible={visible}
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} accessibilityRole="button">
            <Text style={styles.headerText}>キャンセル</Text>
          </TouchableOpacity>
          <Text style={styles.title}>写真を調整</Text>
          <TouchableOpacity onPress={handleConfirm} accessibilityRole="button">
            <Text style={styles.headerText}>完了</Text>
          </TouchableOpacity>
        </View>
        <View
          style={styles.cropArea}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setCropAreaSize({ width, height });
          }}
        >
          {frame.width > 0 && baseScale > 0 ? (
            <View
              style={[
                styles.frame,
                { width: frame.width, height: frame.height },
              ]}
            >
              <GestureDetector gesture={composedGesture}>
                <Animated.View style={[styles.panLayer, translateStyle]}>
                  <Animated.Image
                    source={{ uri: imageUri }}
                    style={scaleStyle}
                  />
                </Animated.View>
              </GestureDetector>
            </View>
          ) : null}
        </View>
        <Text style={styles.helperText}>
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    position: "relative",
  },
  headerText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.surface,
  },
  title: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.surface,
  },
  cropArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  frame: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  panLayer: {},
  helperText: {
    textAlign: "center",
    color: COLORS.surface,
    fontSize: 13,
    paddingVertical: 16,
  },
});

export default PhotoCropModal;
