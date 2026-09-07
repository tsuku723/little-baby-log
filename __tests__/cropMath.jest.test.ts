import {
  calculateBaseScale,
  calculateCropRect,
  calculateFrameSize,
  calculatePanBounds,
  clamp,
} from "../src/utils/cropMath";

describe("cropMath", () => {
  test("clamp restricts value to [min, max]", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  test("calculateFrameSize fits the aspect ratio within the container minus margin", () => {
    // container 400x400, margin 20 -> available 360x360, aspectRatio 3:2
    const frame = calculateFrameSize(400, 400, 3 / 2, 20);
    expect(frame.width).toBeCloseTo(360);
    expect(frame.height).toBeCloseTo(240);
  });

  test("calculateFrameSize clamps to container height when aspect ratio is tall", () => {
    // container 200x400, margin 0, aspectRatio 1:1 -> limited by width
    const frame = calculateFrameSize(200, 400, 1, 0);
    expect(frame.width).toBeCloseTo(200);
    expect(frame.height).toBeCloseTo(200);
  });

  test("calculateBaseScale returns the cover scale (larger of width/height ratios)", () => {
    // image 1000x2000 (portrait), frame 300x200 (landscape)
    // width ratio: 300/1000 = 0.3, height ratio: 200/2000 = 0.1 -> cover uses 0.3
    const scale = calculateBaseScale(1000, 2000, { width: 300, height: 200 });
    expect(scale).toBeCloseTo(0.3);
  });

  test("calculatePanBounds is zero when image exactly covers the frame", () => {
    const frame = { width: 300, height: 200 };
    const bounds = calculatePanBounds(1000, 2000, frame, 0.3, 1);
    // displayWidth = 300, displayHeight = 600 -> maxX 0, maxY (600-200)/2=200
    expect(bounds.maxX).toBeCloseTo(0);
    expect(bounds.maxY).toBeCloseTo(200);
  });

  test("calculatePanBounds grows with user scale", () => {
    const frame = { width: 300, height: 200 };
    const bounds = calculatePanBounds(1000, 2000, frame, 0.3, 2);
    // displayWidth = 600, displayHeight = 1200
    expect(bounds.maxX).toBeCloseTo((600 - 300) / 2);
    expect(bounds.maxY).toBeCloseTo((1200 - 200) / 2);
  });

  test("calculateCropRect returns the centered origin when translate is zero and scale is base", () => {
    // image 1000x1000, frame 300x200 (baseScale = max(0.3,0.2)=0.3)
    const frame = { width: 300, height: 200 };
    const baseScale = calculateBaseScale(1000, 1000, frame);
    const rect = calculateCropRect(1000, 1000, frame, baseScale, 1, 0, 0);
    // displayWidth=displayHeight=300, crop width = 300/0.3=1000, height=200/0.3=666
    expect(rect.width).toBe(1000);
    expect(rect.height).toBe(667);
    expect(rect.originX).toBe(0);
    // vertical center: (1000-667)/2 ~= 166 or 167
    expect(rect.originY).toBeGreaterThanOrEqual(165);
    expect(rect.originY).toBeLessThanOrEqual(167);
  });

  test("calculateCropRect clamps origin within image bounds at pan limits", () => {
    const frame = { width: 300, height: 200 };
    const baseScale = calculateBaseScale(1000, 2000, frame); // 0.3
    const bounds = calculatePanBounds(1000, 2000, frame, baseScale, 1);

    const rectTop = calculateCropRect(
      1000,
      2000,
      frame,
      baseScale,
      1,
      0,
      bounds.maxY
    );
    expect(rectTop.originY).toBe(0);

    const rectBottom = calculateCropRect(
      1000,
      2000,
      frame,
      baseScale,
      1,
      0,
      -bounds.maxY
    );
    expect(rectBottom.originY).toBe(2000 - rectBottom.height);
  });

  test("calculateCropRect shrinks crop size as user scale increases", () => {
    const frame = { width: 300, height: 200 };
    const baseScale = calculateBaseScale(1000, 1000, frame);
    const rectBase = calculateCropRect(1000, 1000, frame, baseScale, 1, 0, 0);
    const rectZoomed = calculateCropRect(1000, 1000, frame, baseScale, 2, 0, 0);
    expect(rectZoomed.width).toBeLessThan(rectBase.width);
    expect(rectZoomed.height).toBeLessThan(rectBase.height);
  });
});
