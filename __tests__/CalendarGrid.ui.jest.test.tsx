import React from "react";
import { render } from "@testing-library/react-native";

import CalendarGrid from "../src/components/CalendarGrid";
import { buildCalendarMonthView } from "../src/utils/dateUtils";

const baseSettings = {
  showCorrectedUntilMonths: null,
  ageFormat: "md" as const,
  showDaysSinceBirth: true,
  lastViewedMonth: null,
};

describe("CalendarGrid week age bar", () => {
  test("誕生日を含む月では暦月齢の帯が表示される", () => {
    const monthView = buildCalendarMonthView({
      anchorDate: new Date(2026, 7, 1),
      settings: baseSettings,
      birthDate: "2026-08-01",
      dueDate: null,
    });

    const { queryAllByText } = render(
      <CalendarGrid
        days={monthView.days}
        onPressDay={jest.fn()}
        ageFormat="md"
        birthDate="2026-08-01"
      />
    );

    expect(queryAllByText(/ヶ月/).length).toBeGreaterThan(0);
  });

  test("誕生日より前の月では帯が表示されない（0ヶ月クランプの誤表示を防ぐ）", () => {
    const monthView = buildCalendarMonthView({
      anchorDate: new Date(2026, 7, 1),
      settings: baseSettings,
      birthDate: "2026-09-15",
      dueDate: null,
    });

    const { queryAllByText } = render(
      <CalendarGrid
        days={monthView.days}
        onPressDay={jest.fn()}
        ageFormat="md"
        birthDate="2026-09-15"
      />
    );

    expect(queryAllByText(/ヶ月/).length).toBe(0);
  });

  test("birthDateが未設定なら帯が表示されない", () => {
    const monthView = buildCalendarMonthView({
      anchorDate: new Date(2026, 7, 1),
      settings: baseSettings,
      birthDate: null,
      dueDate: null,
    });

    const { queryAllByText } = render(
      <CalendarGrid
        days={monthView.days}
        onPressDay={jest.fn()}
        ageFormat="md"
        birthDate={null}
      />
    );

    expect(queryAllByText(/ヶ月/).length).toBe(0);
  });

  test("早産児・出産予定日前の月では在胎週数の帯が表示される", () => {
    const birthDate = "2026-01-01";
    const dueDate = "2026-03-01"; // 早産（在胎221日 < 259日）
    const monthView = buildCalendarMonthView({
      anchorDate: new Date(2026, 0, 1),
      settings: baseSettings,
      birthDate,
      dueDate,
    });

    const { queryAllByText } = render(
      <CalendarGrid
        days={monthView.days}
        onPressDay={jest.fn()}
        ageFormat="md"
        birthDate={birthDate}
      />
    );

    expect(queryAllByText(/在胎 \d+週/).length).toBeGreaterThan(0);
  });

  test("早産児・出産予定日以降の月では修正月齢の帯が表示され、暦月齢は使われない", () => {
    const birthDate = "2026-01-01";
    const dueDate = "2026-03-01"; // 早産（在胎221日 < 259日）
    const monthView = buildCalendarMonthView({
      anchorDate: new Date(2026, 5, 1), // 2026-06
      settings: baseSettings,
      birthDate,
      dueDate,
    });

    const { queryAllByText } = render(
      <CalendarGrid
        days={monthView.days}
        onPressDay={jest.fn()}
        ageFormat="md"
        birthDate={birthDate}
      />
    );

    expect(queryAllByText(/^修正 /).length).toBeGreaterThan(0);
    expect(queryAllByText(/^暦 /).length).toBe(0);
  });
});
