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
});
