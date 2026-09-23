import React from "react";
import { render } from "@testing-library/react-native";
import { Image } from "react-native";

import CalendarDecorations from "@/components/CalendarDecorations";

describe("CalendarDecorations", () => {
  test("バルーンとクローバーの2画像を描画する", () => {
    const { UNSAFE_getAllByType } = render(<CalendarDecorations />);
    expect(UNSAFE_getAllByType(Image)).toHaveLength(2);
  });

  test("topOffset未指定時はデフォルト値(0)を反映する", () => {
    const { UNSAFE_getAllByType } = render(<CalendarDecorations />);
    const [balloon, clover] = UNSAFE_getAllByType(Image);
    const balloonStyle = [balloon.props.style].flat();
    const cloverStyle = [clover.props.style].flat();
    expect(balloonStyle).toEqual(
      expect.arrayContaining([expect.objectContaining({ top: 4 })])
    );
    expect(cloverStyle).toEqual(
      expect.arrayContaining([expect.objectContaining({ top: 6 })])
    );
  });

  test("topOffset指定時はオフセットを加算する", () => {
    const { UNSAFE_getAllByType } = render(
      <CalendarDecorations topOffset={100} />
    );
    const [balloon, clover] = UNSAFE_getAllByType(Image);
    const balloonStyle = [balloon.props.style].flat();
    const cloverStyle = [clover.props.style].flat();
    expect(balloonStyle).toEqual(
      expect.arrayContaining([expect.objectContaining({ top: 104 })])
    );
    expect(cloverStyle).toEqual(
      expect.arrayContaining([expect.objectContaining({ top: 106 })])
    );
  });
});
