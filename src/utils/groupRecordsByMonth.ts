import { Achievement } from "@/models/dataModels";

export type RecordSection = {
  monthKey: string;
  monthLabel: string;
  featuredId: string | null;
  records: Achievement[];
};

export function groupRecordsByMonth(records: Achievement[]): RecordSection[] {
  const sectionMap = new Map<string, Achievement[]>();

  for (const record of records) {
    const monthKey = record.date.slice(0, 7); // "YYYY-MM"
    const existing = sectionMap.get(monthKey);
    if (existing) {
      existing.push(record);
    } else {
      sectionMap.set(monthKey, [record]);
    }
  }

  return Array.from(sectionMap.entries()).map(([monthKey, monthRecords]) => {
    const year = parseInt(monthKey.slice(0, 4), 10);
    const month = parseInt(monthKey.slice(5), 10);
    const monthLabel = `${year}年${month}月`;
    const featured = monthRecords.find((r) => r.photoPath) ?? null;
    return {
      monthKey,
      monthLabel,
      featuredId: featured?.id ?? null,
      records: monthRecords,
    };
  });
}
