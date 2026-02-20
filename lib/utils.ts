import { FeedLogRow } from "@/lib/types";

export const BREAST_STEP = 5;
export const FORMULA_STEP = 10;

export function feedLogToMl(log: FeedLogRow, breastMlPerMinute: number): number {
  if (log.feed_type === "formula") {
    return log.formula_ml ?? 0;
  }

  const left = log.left_minutes ?? 0;
  const right = log.right_minutes ?? 0;
  return (left + right) * breastMlPerMinute;
}

export function isSameDay(isoDate: string, target: Date): boolean {
  const date = new Date(isoDate);
  return (
    date.getFullYear() === target.getFullYear() &&
    date.getMonth() === target.getMonth() &&
    date.getDate() === target.getDate()
  );
}

export function formatKoreanDate(isoDate: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(isoDate));
}

export function getLastNDaysTotals(logs: FeedLogRow[], breastMlPerMinute: number, n = 7) {
  const days = Array.from({ length: n }, (_, idx) => {
    const date = new Date();
    date.setDate(date.getDate() - (n - 1 - idx));

    const label = new Intl.DateTimeFormat("ko-KR", {
      month: "numeric",
      day: "numeric"
    }).format(date);

    const totalMl = logs
      .filter((log) => isSameDay(log.created_at, date))
      .reduce((sum, log) => sum + feedLogToMl(log, breastMlPerMinute), 0);

    return { label, totalMl };
  });

  return days;
}
