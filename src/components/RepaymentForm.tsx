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
    <div className="rounded-xl border bg-slate-50 p-4">
      <h2 className="font-bold">新增實際還款</h2>
      <p className="mt-1 text-sm text-slate-600">目前剩餘本金 {principalRemaining.toLocaleString("zh-TW")}。系統依實際天數計息，先抵利息，剩餘金額回本金。</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">還款日期
          <input className="mt-1 w-full rounded-lg border px-3 py-2" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
        </label>
        <label className="text-sm font-medium">還款金額
          <input className="mt-1 w-full rounded-lg border px-3 py-2" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="text-sm font-medium sm:col-span-2">備註
          <input className="mt-1 w-full rounded-lg border px-3 py-2" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <PreviewCard label="實際天數" value={`${daysElapsed} 天`} />
        <PreviewCard label="利息" value={preview.interestDue.toLocaleString("zh-TW")} />
        <PreviewCard label="回本金" value={preview.principalPaid.toLocaleString("zh-TW")} />
        <PreviewCard label="剩餘本金" value={preview.principalAfter.toLocaleString("zh-TW")} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className="rounded-lg bg-blue-700 px-4 py-2 text-white" type="button" onClick={save}>儲存還款</button>
        <button className="rounded-lg border px-4 py-2" type="button" onClick={fillSettlement}>帶入今日結清金額 {preview.settlementAmount.toLocaleString("zh-TW")}</button>
        {message ? <span className="text-sm text-slate-600">{message}</span> : null}
      </div>
    </div>
  );
}

function PreviewCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 font-bold">{value}</div>
    </div>
  );
}
