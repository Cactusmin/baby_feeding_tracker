"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FeedLogRow, FeedType } from "@/lib/types";
import {
  BREAST_STEP,
  FORMULA_STEP,
  feedLogToMl,
  formatKoreanDate,
  getLastNDaysTotals,
  isSameDay
} from "@/lib/utils";

const DEFAULT_BREAST_ML_PER_MIN = 8;

function clampNonNegative(value: number): number {
  return Math.max(0, value);
}

export function FeedingTracker() {
  const [type, setType] = useState<FeedType>("breast");
  const [leftMinutes, setLeftMinutes] = useState(10);
  const [rightMinutes, setRightMinutes] = useState(10);
  const [formulaMl, setFormulaMl] = useState(120);
  const [breastMlPerMin, setBreastMlPerMin] = useState(DEFAULT_BREAST_ML_PER_MIN);
  const [logs, setLogs] = useState<FeedLogRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([fetchLogs(), fetchSetting()]);
  }, []);

  async function fetchLogs() {
    const { data, error: logsError } = await supabase
      .from("feed_logs")
      .select("id, created_at, feed_type, left_minutes, right_minutes, formula_ml")
      .order("created_at", { ascending: false })
      .limit(100);

    if (logsError) {
      setError(logsError.message);
      return;
    }

    setLogs((data ?? []) as FeedLogRow[]);
  }

  async function fetchSetting() {
    const { data, error: settingError } = await supabase
      .from("app_settings")
      .select("id, breast_ml_per_minute, updated_at")
      .eq("id", 1)
      .maybeSingle();

    if (settingError) {
      setError(settingError.message);
      return;
    }

    if (data) {
      setBreastMlPerMin(data.breast_ml_per_minute);
    }
  }

  async function saveSetting(nextValue: number) {
    const payload = {
      id: 1,
      breast_ml_per_minute: nextValue
    };

    const { error: saveError } = await supabase.from("app_settings").upsert(payload);

    if (saveError) {
      setError(saveError.message);
    }
  }

  async function submitLog() {
    setSaving(true);
    setError(null);

    const payload =
      type === "breast"
        ? {
            feed_type: "breast",
            left_minutes: leftMinutes,
            right_minutes: rightMinutes,
            formula_ml: null
          }
        : {
            feed_type: "formula",
            left_minutes: null,
            right_minutes: null,
            formula_ml: formulaMl
          };

    const { error: insertError } = await supabase.from("feed_logs").insert(payload);

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    await fetchLogs();
    setSaving(false);
  }

  async function deleteLog(id: string) {
    const confirmed = window.confirm("이 기록을 삭제할까요?");
    if (!confirmed) {
      return;
    }

    setDeletingId(id);
    setError(null);

    const { data: deletedRows, error: deleteError } = await supabase
      .from("feed_logs")
      .delete()
      .eq("id", id)
      .select("id");

    if (deleteError) {
      setError(deleteError.message);
      setDeletingId(null);
      return;
    }

    if (!deletedRows || deletedRows.length === 0) {
      setError("삭제 권한이 없어 기록이 삭제되지 않았습니다. Supabase delete 정책을 확인해주세요.");
      setDeletingId(null);
      return;
    }

    await fetchLogs();
    setDeletingId(null);
  }

  const today = new Date();

  const todayTotals = useMemo(() => {
    const todayLogs = logs.filter((log) => isSameDay(log.created_at, today));
    const totalMl = todayLogs.reduce((sum, log) => sum + feedLogToMl(log, breastMlPerMin), 0);

    const count = todayLogs.length;
    return { totalMl, count };
  }, [logs, breastMlPerMin]);

  const recentDaily = useMemo(() => getLastNDaysTotals(logs, breastMlPerMin, 7), [logs, breastMlPerMin]);
  const recentDailyLatestFirst = useMemo(() => [...recentDaily].reverse(), [recentDaily]);

  const maxDaily = Math.max(...recentDailyLatestFirst.map((d) => d.totalMl), 1);

  return (
    <main>
      <div className="stack" style={{ marginBottom: 12 }}>
        <div className="inline top-row" style={{ justifyContent: "space-between" }}>
          <h1>아기 수유 트래커</h1>
          <Link href="/history" className="link-button">
            기록/통계 보기
          </Link>
        </div>
        <p className="muted">로그인 없이 모두가 같은 데이터를 입력/조회하는 MVP</p>
      </div>

      <div className="stack">
        <section className="card stack">
          <h2>빠른 입력</h2>

          <div className="inline">
            <button
              type="button"
              className={`tab-button ${type === "breast" ? "active" : ""}`}
              onClick={() => setType("breast")}
            >
              모유 수유
            </button>
            <button
              type="button"
              className={`tab-button ${type === "formula" ? "active" : ""}`}
              onClick={() => setType("formula")}
            >
              분유 수유
            </button>
          </div>

          {type === "breast" ? (
            <>
              <p className="muted">5분 단위로 입력</p>

              <div className="stack">
                <label>왼쪽</label>
                <div className="stepper">
                  <button
                    type="button"
                    onClick={() => setLeftMinutes((prev) => clampNonNegative(prev - BREAST_STEP))}
                  >
                    -
                  </button>
                  <div className="value">{leftMinutes}분</div>
                  <button type="button" onClick={() => setLeftMinutes((prev) => prev + BREAST_STEP)}>
                    +
                  </button>
                </div>
              </div>

              <div className="stack">
                <label>오른쪽</label>
                <div className="stepper">
                  <button
                    type="button"
                    onClick={() => setRightMinutes((prev) => clampNonNegative(prev - BREAST_STEP))}
                  >
                    -
                  </button>
                  <div className="value">{rightMinutes}분</div>
                  <button type="button" onClick={() => setRightMinutes((prev) => prev + BREAST_STEP)}>
                    +
                  </button>
                </div>
              </div>

              <p className="muted">
                예상 수유량: <strong>{(leftMinutes + rightMinutes) * breastMlPerMin}ml</strong>
              </p>
            </>
          ) : (
            <>
              <p className="muted">10ml 단위로 입력</p>
              <div className="stepper">
                <button
                  type="button"
                  onClick={() => setFormulaMl((prev) => clampNonNegative(prev - FORMULA_STEP))}
                >
                  -
                </button>
                <div className="value">{formulaMl}ml</div>
                <button type="button" onClick={() => setFormulaMl((prev) => prev + FORMULA_STEP)}>
                  +
                </button>
              </div>
            </>
          )}

          <button
            type="button"
            className={`save-button ${type === "formula" ? "formula" : ""}`}
            disabled={saving}
            onClick={() => void submitLog()}
          >
            {saving ? "저장 중..." : "기록 저장"}
          </button>

          {error ? <p className="error">오류: {error}</p> : null}
        </section>

        <section className="card stack">
          <h2>모유 1분당 ml 설정</h2>
          <p className="muted">계산 기준값이며 누구나 수정할 수 있습니다.</p>

          <div className="stepper">
            <button
              type="button"
              onClick={() => {
                const next = clampNonNegative(breastMlPerMin - 1);
                setBreastMlPerMin(next);
                void saveSetting(next);
              }}
            >
              -
            </button>
            <div className="value">{breastMlPerMin}ml</div>
            <button
              type="button"
              onClick={() => {
                const next = breastMlPerMin + 1;
                setBreastMlPerMin(next);
                void saveSetting(next);
              }}
            >
              +
            </button>
          </div>
        </section>

        <section className="card stack">
          <h2>오늘 요약</h2>
          <div className="total-box">
            <div className="total-item">
              <p className="muted">총 섭취량</p>
              <strong>{todayTotals.totalMl}ml</strong>
            </div>
            <div className="total-item">
              <p className="muted">수유 횟수</p>
              <strong>{todayTotals.count}회</strong>
            </div>
          </div>
        </section>

        <section className="card stack">
          <h2>최근 7일 총량</h2>
          <div className="chart" aria-label="최근 7일 총량 차트">
            {recentDailyLatestFirst.map((day) => {
              const height = (day.totalMl / maxDaily) * 100;
              return (
                <div className="bar-wrap" key={day.label}>
                  <span className="bar-value">{day.totalMl}ml</span>
                  <div className="bar-track">
                    <div className="bar" style={{ height: `${Math.max(height, 2)}%` }} />
                  </div>
                  <span className="bar-label">{day.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card stack">
          <h2>최근 기록</h2>
          <div className="logs">
            {logs.length === 0 ? (
              <p className="muted">아직 기록이 없습니다.</p>
            ) : (
              logs.map((log) => (
                <div className="log-item deletable" key={log.id}>
                  <button
                    type="button"
                    className="delete-icon-button"
                    disabled={deletingId === log.id}
                    aria-label="기록 삭제"
                    onClick={() => void deleteLog(log.id)}
                  >
                    {deletingId === log.id ? "…" : "×"}
                  </button>
                  <div>
                    <div className="log-type">{log.feed_type === "breast" ? "모유" : "분유"}</div>
                    <p className="muted">{formatKoreanDate(log.created_at)}</p>
                  </div>
                  <div className="log-right">
                    {log.feed_type === "breast" ? (
                      <>
                        <p className="muted">L {log.left_minutes ?? 0}분 / R {log.right_minutes ?? 0}분</p>
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
        </section>
      </div>
    </main>
  );
}
