"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FeedLogRow } from "@/lib/types";
import { feedLogToMl, formatKoreanDate } from "@/lib/utils";

const DEFAULT_BREAST_ML_PER_MIN = 8;
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function formatDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateOnly(iso: string): string {
  const d = new Date(iso);
  return formatDay(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
}

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long"
  }).format(date);
}

function formatSelectedLabel(day: string): string {
  const date = new Date(`${day}T00:00:00`);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(date);
}

export function HistoryView() {
  const todayKey = formatDay(new Date());
  const [logs, setLogs] = useState<FeedLogRow[]>([]);
  const [breastMlPerMin, setBreastMlPerMin] = useState(DEFAULT_BREAST_ML_PER_MIN);
  const [monthCursor, setMonthCursor] = useState(monthStart(new Date()));
  const [selectedDay, setSelectedDay] = useState(todayKey);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);

    const [{ data: logData, error: logError }, { data: settingData, error: settingError }] =
      await Promise.all([
        supabase
          .from("feed_logs")
          .select("id, created_at, feed_type, left_minutes, right_minutes, formula_ml")
          .order("created_at", { ascending: false })
          .limit(3000),
        supabase
          .from("app_settings")
          .select("id, breast_ml_per_minute")
          .eq("id", 1)
          .maybeSingle()
      ]);

    if (logError) {
      setError(logError.message);
      setLoading(false);
      return;
    }

    if (settingError) {
      setError(settingError.message);
      setLoading(false);
      return;
    }

    setLogs((logData ?? []) as FeedLogRow[]);
    if (settingData?.breast_ml_per_minute != null) {
      setBreastMlPerMin(Number(settingData.breast_ml_per_minute));
    }

    setLoading(false);
  }

  const byDay = useMemo(() => {
    const map = new Map<string, FeedLogRow[]>();

    for (const log of logs) {
      const key = toDateOnly(log.created_at);
      const prev = map.get(key);
      if (prev) {
        prev.push(log);
      } else {
        map.set(key, [log]);
      }
    }

    return map;
  }, [logs]);

  const dailySummary = useMemo(() => {
    const map = new Map<string, { totalMl: number; count: number }>();

    for (const [day, dayLogs] of byDay.entries()) {
      const totalMl = dayLogs.reduce((sum, log) => sum + feedLogToMl(log, breastMlPerMin), 0);
      map.set(day, { totalMl, count: dayLogs.length });
    }

    return map;
  }, [byDay, breastMlPerMin]);

  const calendarCells = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();

    const firstDay = new Date(year, month, 1);
    const firstWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: { key: string; dayNum: number; inMonth: boolean }[] = [];

    for (let i = 0; i < firstWeekday; i += 1) {
      const d = new Date(year, month, i - firstWeekday + 1);
      cells.push({ key: formatDay(d), dayNum: d.getDate(), inMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d += 1) {
      const date = new Date(year, month, d);
      cells.push({ key: formatDay(date), dayNum: d, inMonth: true });
    }

    while (cells.length % 7 !== 0) {
      const offset = cells.length - (firstWeekday + daysInMonth) + 1;
      const d = new Date(year, month + 1, offset);
      cells.push({ key: formatDay(d), dayNum: d.getDate(), inMonth: false });
    }

    return cells;
  }, [monthCursor]);

  const selectedLogs = useMemo(() => {
    return (byDay.get(selectedDay) ?? []).slice().sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [byDay, selectedDay]);

  const selectedStats = useMemo(() => {
    let totalMl = 0;
    let breastMl = 0;
    let formulaMl = 0;

    for (const log of selectedLogs) {
      const ml = feedLogToMl(log, breastMlPerMin);
      totalMl += ml;
      if (log.feed_type === "breast") {
        breastMl += ml;
      } else {
        formulaMl += ml;
      }
    }

    return {
      totalMl,
      breastMl,
      formulaMl,
      sessions: selectedLogs.length
    };
  }, [selectedLogs, breastMlPerMin]);

  const maxMonthMl = useMemo(() => {
    let max = 0;
    for (const cell of calendarCells) {
      if (!cell.inMonth) {
        continue;
      }
      const ml = dailySummary.get(cell.key)?.totalMl ?? 0;
      if (ml > max) {
        max = ml;
      }
    }
    return max;
  }, [calendarCells, dailySummary]);

  return (
    <main style={{ position: "relative" }}>
      <Link href="/" className="link-button" style={{ position: "absolute", top: 24, right: 16 }}>
        수유 입력 화면
      </Link>
      <div className="stack" style={{ marginBottom: 12 }}>
        <div className="inline top-row">
          <h1>기록/통계 보기</h1>
        </div>
        <p className="muted">달력에서 날짜를 선택해 해당 날짜 기록과 통계를 확인하세요.</p>
      </div>

      <div className="stack">
        <section className="card stack">
          <div className="inline month-nav" style={{ justifyContent: "space-between" }}>
            <button type="button" className="link-button" onClick={() => setMonthCursor((prev) => addMonths(prev, -1))}>
              이전 달
            </button>
            <strong>{formatMonthLabel(monthCursor)}</strong>
            <button type="button" className="link-button" onClick={() => setMonthCursor((prev) => addMonths(prev, 1))}>
              다음 달
            </button>
          </div>

          <div className="calendar-weekdays">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="calendar-weekday">
                {label}
              </div>
            ))}
          </div>

          <div className="calendar-grid">
            {calendarCells.map((cell) => {
              const summary = dailySummary.get(cell.key);
              const isSelected = cell.key === selectedDay;
              const isToday = cell.key === todayKey;
              const totalMl = summary?.totalMl ?? 0;
              const ratio = maxMonthMl > 0 ? Math.min(totalMl / maxMonthMl, 1) : 0;
              const fillAlpha = cell.inMonth ? 0.08 + ratio * 0.62 : 0.04;
              const backgroundColor = `rgba(31, 157, 101, ${fillAlpha.toFixed(3)})`;
              const isStrong = ratio >= 0.6;

              return (
                <button
                  key={cell.key}
                  type="button"
                  className={`calendar-day ${cell.inMonth ? "" : "outside"} ${isSelected ? "selected" : ""} ${isStrong ? "strong-fill" : ""}`}
                  style={{ backgroundColor }}
                  onClick={() => {
                    setSelectedDay(cell.key);
                    setMonthCursor(monthStart(new Date(`${cell.key}T00:00:00`)));
                  }}
                >
                  <span className={`day-number ${isToday ? "today" : ""}`}>{cell.dayNum}</span>
                  <span className="day-meta">{summary ? `${summary.totalMl}ml` : "0ml"}</span>
                </button>
              );
            })}
          </div>
          {error ? <p className="error">오류: {error}</p> : null}
        </section>

        <section className="card stack">
          <div className="inline top-row" style={{ justifyContent: "space-between" }}>
            <h2>{formatSelectedLabel(selectedDay)}</h2>
            <button type="button" className="link-button" onClick={() => void fetchData()}>
              새로고침
            </button>
          </div>

          {loading ? (
            <p className="muted">불러오는 중...</p>
          ) : (
            <>
              <div className="total-box">
                <div className="total-item">
                  <p className="muted">총 섭취량</p>
                  <strong>{selectedStats.totalMl}ml</strong>
                </div>
                <div className="total-item">
                  <p className="muted">수유 횟수</p>
                  <strong>{selectedStats.sessions}회</strong>
                </div>
                <div className="total-item">
                  <p className="muted">모유 환산량</p>
                  <strong>{selectedStats.breastMl}ml</strong>
                </div>
                <div className="total-item">
                  <p className="muted">분유 총량</p>
                  <strong>{selectedStats.formulaMl}ml</strong>
                </div>
              </div>

              <div className="logs">
                {selectedLogs.length === 0 ? (
                  <p className="muted">선택한 날짜의 기록이 없습니다.</p>
                ) : (
                  selectedLogs.map((log) => (
                    <div className="log-item" key={log.id}>
                      <div>
                        <div className="log-type">{log.feed_type === "breast" ? "모유" : "분유"}</div>
                        <p className="muted">{formatKoreanDate(log.created_at)}</p>
                      </div>
                      <div className="log-right">
                        {log.feed_type === "breast" ? (
                          <>
                            <p className="muted">
                              L {log.left_minutes ?? 0}분 / R {log.right_minutes ?? 0}분
                            </p>
                            <strong>{feedLogToMl(log, breastMlPerMin)}ml</strong>
                          </>
                        ) : (
                          <strong>{log.formula_ml ?? 0}ml</strong>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
