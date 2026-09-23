import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

import MonthHeader from "@/components/MonthHeader";

describe("MonthHeader", () => {
  test("monthLabelを表示する", () => {
    const { getByText } = render(
      <MonthHeader
        monthLabel="2026年9月"
        onPrev={jest.fn()}
        onNext={jest.fn()}
        onToday={jest.fn()}
        onPressMonthLabel={jest.fn()}
      />
    );
    expect(getByText("2026年9月")).toBeTruthy();
  });

  test("前月ボタンでonPrevが呼ばれる", () => {
    const onPrev = jest.fn();
    const { getByLabelText } = render(
      <MonthHeader
        monthLabel="2026年9月"
        onPrev={onPrev}
        onNext={jest.fn()}
        onToday={jest.fn()}
        onPressMonthLabel={jest.fn()}
      />
    );
    fireEvent.press(getByLabelText("前月へ"));
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  test("次月ボタンでonNextが呼ばれる", () => {
    const onNext = jest.fn();
    const { getByLabelText } = render(
      <MonthHeader
        monthLabel="2026年9月"
        onPrev={jest.fn()}
        onNext={onNext}
        onToday={jest.fn()}
        onPressMonthLabel={jest.fn()}
      />
    );
    fireEvent.press(getByLabelText("次月へ"));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  test("今日へボタンでonTodayが呼ばれる", () => {
    const onToday = jest.fn();
    const { getByText } = render(
      <MonthHeader
        monthLabel="2026年9月"
        onPrev={jest.fn()}
        onNext={jest.fn()}
        onToday={onToday}
        onPressMonthLabel={jest.fn()}
      />
    );
    fireEvent.press(getByText("今日へ"));
    expect(onToday).toHaveBeenCalledTimes(1);
  });

  test("月ラベルタップでonPressMonthLabelが呼ばれる", () => {
    const onPressMonthLabel = jest.fn();
    const { getByText } = render(
      <MonthHeader
        monthLabel="2026年9月"
        onPrev={jest.fn()}
        onNext={jest.fn()}
        onToday={jest.fn()}
        onPressMonthLabel={onPressMonthLabel}
      />
    );
    fireEvent.press(getByText("2026年9月"));
    expect(onPressMonthLabel).toHaveBeenCalledTimes(1);
  });
});
