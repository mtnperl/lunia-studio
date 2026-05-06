"use client";
import { useState, useEffect } from "react";
import PasswordGate from "../dashboard/PasswordGate";
import OverviewSubview from "./OverviewSubview";
import PnLSubview from "./PnLSubview";
import UnitEconomicsSubview from "./UnitEconomicsSubview";
import CashExpensesSubview from "./CashExpensesSubview";
import AssumptionsSubview from "./AssumptionsSubview";
import ExistingCustomersSubview from "./ExistingCustomersSubview";

export type BusinessTab = "overview" | "pnl" | "unit-economics" | "cash" | "existing" | "assumptions";

type Props = { active: BusinessTab };

export default function BusinessView({ active }: Props) {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("lunia:analytics:unlocked");
    if (stored === "1") setUnlocked(true);
  }, []);

  if (!unlocked) {
    return (
      <PasswordGate
        title="Business"
        description="Enter password to view business performance data"
        buttonLabel="Unlock Business"
        verifyUrl="/api/analytics/verify"
        storageKey="lunia:analytics:unlocked"
        onUnlock={() => setUnlocked(true)}
      />
    );
  }

  return (
    <>
      {active === "overview" && <OverviewSubview />}
      {active === "pnl" && <PnLSubview />}
      {active === "unit-economics" && <UnitEconomicsSubview />}
      {active === "cash" && <CashExpensesSubview />}
      {active === "existing" && <ExistingCustomersSubview />}
      {active === "assumptions" && <AssumptionsSubview />}
    </>
  );
}
