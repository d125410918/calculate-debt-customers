"use client";

import { useMemo, useState } from "react";
import { calculateDebt, defaultSettings, getAutoPreDeductPeriods, type CalculatorSettingsInput, type CalculationResult, type ExtraDeductionInput, type LoanType } from "@/lib/debt";

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
  const [preDeductPeriods, setPreDeductPeriods] = useState(String(getAutoPreDeductPeriods(today)));
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

  function changeStartDate(value: string) {
    setStartDate(value);
    setPreDeductPeriods(String(getAutoPreDeductPeriods(value)));
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
    <div className="app-shell">
      <section className="card p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-bold">{mode === "original" ? "實拿金額計算器" : `${ownerName ?? slug} 實拿金額計算器`}</h1>
            <p className="sub mt-1">每萬元 750 元為 30 天利息，系統以一期 {settings.periodDays} 天自動換算。</p>
          </div>
          {mode === "user" && slug ? <a className="text-sm text-blue-700" href={`/u/${slug}/customers`}>客戶列表</a> : null}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold">放款日期
            <input className="mt-1" type="date" value={startDate} onChange={(e) => changeStartDate(e.target.value)} />
          </label>

          <label className="block text-sm font-bold">品項類型
            <select className="mt-1" value={loanType} onChange={(e) => setLoanType(e.target.value as LoanType)}>
              <option value="normal">一般</option>
              <option value="vehicle">汽機車</option>
              <option value="gold">黃金</option>
            </select>
          </label>

          <label className="block text-sm font-bold">放款金額
            <input className="mt-1" type="number" value={loanAmount} disabled={loanType === "gold"} onChange={(e) => setLoanAmount(e.target.value)} />
          </label>

          <label className="block text-sm font-bold">前扣期數
            <input className="mt-1" type="number" min="0" value={preDeductPeriods} onChange={(e) => setPreDeductPeriods(e.target.value)} />
            <span className="mt-1 block text-xs text-slate-500">29日到月底、1日到5日自動三期；6日到28日自動兩期，可手動覆蓋。</span>
          </label>

          <div className="block text-sm font-bold sm:col-span-2">
            <div>分幾期還完</div>
            <div className="mt-1 grid grid-cols-5 gap-2">
              {presetPeriods.map((option) => (
                <button className={`rounded-lg border ${periodOption === option.value ? "border-blue-700 bg-blue-700 text-white" : "bg-white"}`} key={option.value} type="button" onClick={() => setPeriodOption(option.value)}>{option.label}</button>
              ))}
            </div>
            {periodOption === "custom" ? <input className="mt-2" type="number" min="1" value={customPeriodCount} onChange={(e) => setCustomPeriodCount(e.target.value)} placeholder="輸入其他期數" /> : null}
          </div>

          {loanType === "gold" ? (
            <label className="block text-sm font-bold sm:col-span-2">黃金扣款
              <input className="mt-1" type="number" value={goldDeduction} onChange={(e) => setGoldDeduction(e.target.value)} />
            </label>
          ) : null}
        </div>

        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">其他扣款</h2>
            <button type="button" onClick={addDeduction}>新增</button>
          </div>
          <div className="mt-3 space-y-2">
            {extraDeductions.map((item, index) => (
              <div className="grid gap-2 sm:grid-cols-[1fr_160px_80px]" key={index}>
                <input value={item.name} onChange={(e) => updateDeduction(index, { name: e.target.value })} />
                <input type="number" value={item.amount} onChange={(e) => updateDeduction(index, { amount: Number(e.target.value) })} />
                <button type="button" onClick={() => removeDeduction(index)}>刪除</button>
              </div>
            ))}
          </div>
        </section>
      </section>

      {result ? (
        <section className="card p-6">
          <h2 className="font-bold">試算結果</h2>
          <div className="mt-4 space-y-0">
            <ResultLine label="放款金額" value={format(result.loanAmount)} />
            <ResultLine label="前扣利息" value={format(result.interestAmount)} />
            <ResultLine label="總扣款" value={format(result.totalDeductions)} />
            <ResultLine label="每期應還" value={format(result.fixedPaymentAmount)} />
            <ResultLine label="完整期數總還款" value={format(result.totalPayment)} />
            <ResultLine label="實拿金額" value={format(result.actualReceivedAmount)} total />
          </div>

          {mode === "user" ? (
            <div className="mt-5 rounded-xl border bg-slate-50 p-4">
              <label className="block text-sm font-bold">客戶姓名
                <input className="mt-1" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="先輸入姓名即可建立" />
              </label>
              <button className="primary-action" type="button" disabled={saveState === "saving"} onClick={saveCustomer}>{saveState === "saving" ? "建立中" : "加入客戶資料"}</button>
              {saveMessage ? <p className="mt-2 text-sm text-red-700">{saveMessage}</p> : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {result ? (
        <section className="card app-full p-6">
          <h2 className="font-bold">原始分期試算表</h2>
          <div className="table-wrap mt-5">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="text-left">
                  <th className="border">期數</th>
                  <th className="border">到期日</th>
                  <th className="border">期初本金</th>
                  <th className="border">利息</th>
                  <th className="border">還款額</th>
                  <th className="border">回本金</th>
                  <th className="border">剩餘本金</th>
                </tr>
              </thead>
              <tbody>
                {result.planItems.map((item) => (
                  <tr key={item.periodIndex}>
                    <td className="border">{item.periodIndex}</td>
                    <td className="border">{item.dueDate}</td>
                    <td className="border">{format(item.principalBefore)}</td>
                    <td className="border">{format(item.interestDue)}</td>
                    <td className="border">{format(item.paymentAmount)}</td>
                    <td className="border">{format(item.principalPaid)}</td>
                    <td className="border">{format(item.principalAfter)}</td>
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

function ResultLine({ label, value, total = false }: { label: string; value: string; total?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 border-b border-slate-100 py-2 ${total ? "mt-2 border-b-0 text-2xl font-extrabold" : ""}`}>
      <span className="text-slate-600">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
