"use client";

import { useState } from "react";

type Props = {
  slug: string;
  loanId: string;
  principalRemaining: number;
};

export default function RepaymentForm({ slug, loanId, principalRemaining }: Props) {
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");

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

  return (
    <div className="rounded-xl border bg-slate-50 p-4">
      <h2 className="font-bold">新增實際還款</h2>
      <p className="mt-1 text-sm text-slate-600">目前剩餘本金 {principalRemaining.toLocaleString("zh-TW")}。系統會先抵利息，超過利息的部分扣本金。</p>
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
      <button className="mt-3 rounded-lg bg-blue-700 px-4 py-2 text-white" type="button" onClick={save}>儲存還款</button>
      {message ? <span className="ml-3 text-sm text-slate-600">{message}</span> : null}
    </div>
  );
}
