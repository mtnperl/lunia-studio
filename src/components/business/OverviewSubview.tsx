"use client";
import DashboardView from "../DashboardView";
import ExecSummaryCard from "./ExecSummaryCard";

export default function OverviewSubview() {
  // Use today's date (UTC) as the cache key so the summary refreshes daily
  // without re-firing on every navigation tick.
  const todayKey = new Date().toISOString().slice(0, 10);
  return (
    <>
      <ExecSummaryCard cacheKey={todayKey} />
      <DashboardView skipGate />
    </>
  );
}
