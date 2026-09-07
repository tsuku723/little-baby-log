export type FrameSize = { width: number; height: number };

export type PanBounds = { maxX: number; maxY: number };

export type CropRect = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * クロップ可能領域(pt)とaspectRatio(width/height)から、
 * マージンを引いた範囲に収まる最大のクロップ枠サイズ(pt)を算出する。
 */
export const calculateFrameSize = (
  containerWidth: number,
  containerHeight: number,
  aspectRatio: number,
  margin: number
): FrameSize => {
  const maxWidth = Math.max(0, containerWidth - margin * 2);
  const maxHeight = Math.max(0, containerHeight - margin * 2);
  const width = Math.min(maxWidth, maxHeight * aspectRatio);
  const height = width / aspectRatio;
  return { width, height };
};

/**
 * 画像(px)がクロップ枠(pt)を隙間なく覆う最小スケール(pt/px)。
 * resizeMode="cover" と同じ考え方。
 */
export const calculateBaseScale = (
  imageWidth: number,
  imageHeight: number,
  frame: FrameSize
): number => Math.max(frame.width / imageWidth, frame.height / imageHeight);

/**
 * 現在の拡大率のもとで、画像が常に枠を覆うように許容されるパン移動量(pt)。
 */
export const calculatePanBounds = (
  imageWidth: number,
  imageHeight: number,
  frame: FrameSize,
  baseScale: number,
  userScale: number
): PanBounds => {
  const displayScale = baseScale * userScale;
  const displayWidth = imageWidth * displayScale;
  const displayHeight = imageHeight * displayScale;
  return {
    maxX: Math.max(0, (displayWidth - frame.width) / 2),
    maxY: Math.max(0, (displayHeight - frame.height) / 2),
  };
};

/**
 * 現在のtransform(拡大率・パン量)から、元画像のpx座標系におけるクロップ矩形を算出する。
 */
export const calculateCropRect = (
  imageWidth: number,
  imageHeight: number,
  frame: FrameSize,
  baseScale: number,
  userScale: number,
  translateX: number,
  translateY: number
): CropRect => {
  const displayScale = baseScale * userScale;
  const displayWidth = imageWidth * displayScale;
  const displayHeight = imageHeight * displayScale;

  const originXpt = (displayWidth - frame.width) / 2 - translateX;
  const originYpt = (displayHeight - frame.height) / 2 - translateY;

  const widthPx = Math.round(frame.width / displayScale);
  const heightPx = Math.round(frame.height / displayScale);

  const originX = clamp(
    Math.round(originXpt / displayScale),
    0,
    Math.max(0, imageWidth - widthPx)
  );
  const originY = clamp(
    Math.round(originYpt / displayScale),
    0,
    Math.max(0, imageHeight - heightPx)
  );

  return {
    originX,
    originY,
    width: Math.min(widthPx, imageWidth - originX),
    height: Math.min(heightPx, imageHeight - originY),
  };
};
