"use client";

import { useMemo, useState } from "react";
import { calculateDebt, defaultSettings, type CalculatorSettingsInput, type CalculationResult, type ExtraDeductionInput, type LoanType } from "@/lib/debt";

type Props = {
  mode: "original" | "user";
  slug?: string;
  ownerName?: string;
  settings?: CalculatorSettingsInput;
};

type SaveState = "idle" | "saving" | "saved" | "error";
type PeriodOption = "6" | "12" | "24" | "36" | "custom";

const today = new Date().toISOString().slice(0, 10);
const presetPeriods: Array<{ label: string; value: PeriodOption }> = [
  { label: "6期", value: "6" },
  { label: "12期", value: "12" },
  { label: "24期", value: "24" },
  { label: "36期", value: "36" },
  { label: "+", value: "custom" }
];

export default function CalculatorClient({ mode, slug, ownerName, settings = defaultSettings }: Props) {
  const [loanType, setLoanType] = useState<LoanType>("normal");
  const [loanAmount, setLoanAmount] = useState("10000");
  const [periodOption, setPeriodOption] = useState<PeriodOption>("6");
  const [customPeriodCount, setCustomPeriodCount] = useState("6");
  const periodCount = periodOption === "custom" ? customPeriodCount : periodOption;
  const [startDate, setStartDate] = useState(today);
  const [preDeductPeriods, setPreDeductPeriods] = useState(String(settings.normalPreDeductPeriods));
  const [goldDeduction, setGoldDeduction] = useState("0");
  const [customerName, setCustomerName] = useState("");
  const [extraDeductions, setExtraDeductions] = useState<ExtraDeductionInput[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState("");

  const result = useMemo<CalculationResult | null>(() => {
    try {
      return calculateDebt({ loanType, loanAmount: Number(loanAmount), periodCount: Number(periodCount), startDate, preDeductPeriods: Number(preDeductPeriods), goldDeduction: Number(goldDeduction), extraDeductions }, settings);
    } catch {
      return null;
    }
  }, [loanType, loanAmount, periodCount, startDate, preDeductPeriods, goldDeduction, extraDeductions, settings]);

  function format(value: number) {
    return value.toLocaleString("zh-TW");
  }

  function addDeduction() {
    setExtraDeductions((items) => [...items, { name: "其他扣款", amount: 0 }]);
  }

  function updateDeduction(index: number, patch: Partial<ExtraDeductionInput>) {
    setExtraDeductions((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function removeDeduction(index: number) {
    setExtraDeductions((items) => items.filter((_, i) => i !== index));
  }

  async function saveCustomer() {
    if (!slug || !result) return;
    if (!customerName.trim()) {
      setSaveState("error");
      setSaveMessage("請先輸入姓名。");
      return;
    }

    setSaveState("saving");
    setSaveMessage("");

    const response = await fetch(`/api/u/${slug}/create-from-calculation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerName, input: { loanType, loanAmount: Number(loanAmount), periodCount: Number(periodCount), startDate, preDeductPeriods: Number(preDeductPeriods), goldDeduction: Number(goldDeduction), extraDeductions } })
    });

    const data = await response.json();
    if (!response.ok) {
      setSaveState("error");
      setSaveMessage(data.error ?? "建立失敗。");
      return;
    }

    setSaveState("saved");
    window.location.href = `/u/${slug}/customers/${data.customerId}`;
  }

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{mode === "original" ? "原始試算頁" : `${ownerName ?? slug} 還款試算`}</h1>
            <p className="mt-1 text-sm text-slate-600">每萬元 750 元為 30 天利息，一期 {settings.periodDays} 天。分期表會把完整期數利息平均放入每期總還款。</p>
          </div>
          {mode === "user" && slug ? <a className="text-sm text-blue-700" href={`/u/${slug}/customers`}>客戶列表</a> : null}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">類型
            <select className="mt-1 w-full rounded-lg border px-3 py-2" value={loanType} onChange={(e) => setLoanType(e.target.value as LoanType)}>
              <option value="normal">一般</option>
              <option value="vehicle">汽機車</option>
              <option value="gold">黃金</option>
            </select>
          </label>

          <label className="block text-sm font-medium">放款金額
            <input className="mt-1 w-full rounded-lg border px-3 py-2" type="number" value={loanAmount} disabled={loanType === "gold"} onChange={(e) => setLoanAmount(e.target.value)} />
          </label>

          <div className="block text-sm font-medium">
            <div>分幾期還完</div>
            <div className="mt-1 grid grid-cols-5 gap-2">
              {presetPeriods.map((option) => (
                <button className={`rounded-lg border px-3 py-2 ${periodOption === option.value ? "border-blue-700 bg-blue-700 text-white" : "bg-white"}`} key={option.value} type="button" onClick={() => setPeriodOption(option.value)}>{option.label}</button>
              ))}
            </div>
            {periodOption === "custom" ? <input className="mt-2 w-full rounded-lg border px-3 py-2" type="number" min="1" value={customPeriodCount} onChange={(e) => setCustomPeriodCount(e.target.value)} placeholder="輸入其他期數" /> : null}
          </div>

          <label className="block text-sm font-medium">起算日
            <input className="mt-1 w-full rounded-lg border px-3 py-2" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>

          <label className="block text-sm font-medium">前扣期數
            <input className="mt-1 w-full rounded-lg border px-3 py-2" type="number" min="0" value={preDeductPeriods} onChange={(e) => setPreDeductPeriods(e.target.value)} />
          </label>

          {loanType === "gold" ? (
            <label className="block text-sm font-medium">黃金扣款
              <input className="mt-1 w-full rounded-lg border px-3 py-2" type="number" value={goldDeduction} onChange={(e) => setGoldDeduction(e.target.value)} />
            </label>
          ) : null}
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">其他扣款</h2>
            <button className="rounded-lg border px-3 py-2 text-sm" type="button" onClick={addDeduction}>新增扣款</button>
          </div>
          {extraDeductions.map((item, index) => (
            <div className="grid gap-2 sm:grid-cols-[1fr_160px_80px]" key={index}>
              <input className="rounded-lg border px-3 py-2" value={item.name} onChange={(e) => updateDeduction(index, { name: e.target.value })} />
              <input className="rounded-lg border px-3 py-2" type="number" value={item.amount} onChange={(e) => updateDeduction(index, { amount: Number(e.target.value) })} />
              <button className="rounded-lg border px-3 py-2" type="button" onClick={() => removeDeduction(index)}>刪除</button>
            </div>
          ))}
        </div>
      </section>

      {result ? (
        <section className="card p-5">
          <h2 className="text-xl font-bold">試算結果</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <ResultCard label="放款金額" value={format(result.loanAmount)} />
            <ResultCard label="前扣利息" value={format(result.interestAmount)} />
            <ResultCard label="總扣款" value={format(result.totalDeductions)} />
            <ResultCard label="實拿金額" value={format(result.actualReceivedAmount)} />
            <ResultCard label="每期應還" value={format(result.fixedPaymentAmount)} />
            <ResultCard label="完整期數總還款" value={format(result.totalPayment)} />
          </div>

          {mode === "user" ? (
            <div className="mt-5 rounded-xl border bg-slate-50 p-4">
              <label className="block text-sm font-medium">客戶姓名
                <input className="mt-1 w-full rounded-lg border px-3 py-2" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="先輸入姓名即可建立" />
              </label>
              <button className="mt-3 rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-60" type="button" disabled={saveState === "saving"} onClick={saveCustomer}>{saveState === "saving" ? "建立中" : "加入客戶資料"}</button>
              {saveMessage ? <p className="mt-2 text-sm text-red-700">{saveMessage}</p> : null}
            </div>
          ) : null}

          <div className="table-wrap mt-5">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 text-left">
                  <th className="border px-3 py-2">期數</th>
                  <th className="border px-3 py-2">到期日</th>
                  <th className="border px-3 py-2">期初本金</th>
                  <th className="border px-3 py-2">均攤利息</th>
                  <th className="border px-3 py-2">總還款</th>
                  <th className="border px-3 py-2">回本</th>
                  <th className="border px-3 py-2">剩餘本金</th>
                </tr>
              </thead>
              <tbody>
                {result.planItems.map((item) => (
                  <tr key={item.periodIndex}>
                    <td className="border px-3 py-2">{item.periodIndex}</td>
                    <td className="border px-3 py-2">{item.dueDate}</td>
                    <td className="border px-3 py-2">{format(item.principalBefore)}</td>
                    <td className="border px-3 py-2">{format(item.interestDue)}</td>
                    <td className="border px-3 py-2">{format(item.paymentAmount)}</td>
                    <td className="border px-3 py-2">{format(item.principalPaid)}</td>
                    <td className="border px-3 py-2">{format(item.principalAfter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-slate-50 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}
