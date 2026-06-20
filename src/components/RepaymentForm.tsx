"use client";

import { useMemo, useState } from "react";
import { previewRepayment } from "@/lib/debt";

type Props = {
  slug: string;
  loanId: string;
  principalRemaining: number;
  interestPer10000For30Days: number;
  lastInterestCalcDate: string;
};

export default function RepaymentForm({ slug, loanId, principalRemaining, interestPer10000For30Days, lastInterestCalcDate }: Props) {
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");

  const daysElapsed = useMemo(() => {
    const from = new Date(`${lastInterestCalcDate}T00:00:00`);
    const to = new Date(`${paymentDate}T00:00:00`);
    return Math.max(0, Math.ceil((to.getTime() - from.getTime()) / 86400000));
  }, [lastInterestCalcDate, paymentDate]);

  const preview = useMemo(() => previewRepayment(principalRemaining, Number(amount) || 0, { interestPer10000For30Days }, daysElapsed), [amount, daysElapsed, interestPer10000For30Days, principalRemaining]);

  async function save() {
    setMessage("儲存中");
    const response = await fetch(`/api/u/${slug}/loans/${loanId}/repayments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount), paymentDate, note })
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "儲存失敗");
      return;
    }
    window.location.reload();
  }

  function fillSettlement() {
    setAmount(String(preview.settlementAmount));
    setNote("立即結清");
  }

  return (
    <section className="app-card">
      <h2 className="app-title">新增實際還款</h2>
      <p className="app-subtitle">目前剩餘本金 {principalRemaining.toLocaleString("zh-TW")}。依實際天數計息，先抵利息，剩餘金額回本金。</p>
      <div className="app-grid">
        <label className="app-label">還款日期<input className="app-input" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} /></label>
        <label className="app-label">還款金額<input className="app-input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        <label className="app-label">備註<input className="app-input" value={note} onChange={(e) => setNote(e.target.value)} /></label>
      </div>
      <div className="metric-grid mt-4">
        <Metric label="實際天數" value={`${daysElapsed} 天`} />
        <Metric label="利息" value={preview.interestDue.toLocaleString("zh-TW")} />
        <Metric label="回本金" value={preview.principalPaid.toLocaleString("zh-TW")} />
        <Metric label="剩餘本金" value={preview.principalAfter.toLocaleString("zh-TW")} green />
      </div>
      <div className="app-grid mt-4">
        <button className="app-button primary full" type="button" onClick={save}>儲存還款</button>
        <button className="app-button soft full" type="button" onClick={fillSettlement}>帶入今日結清金額 {preview.settlementAmount.toLocaleString("zh-TW")}</button>
        {message ? <p className="app-subtitle">{message}</p> : null}
      </div>
    </section>
  );
}

function Metric({ label, value, green = false }: { label: string; value: string; green?: boolean }) {
  return <div className="metric-card"><div className="metric-label">{label}</div><div className={`metric-value ${green ? "green" : ""}`}>{value}</div></div>;
}
