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
  const [loanAmount, setLoanAmount] = useState("100000");
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
    setExtraDeductions((items) => [...items, { name: "", amount: 0 }]);
  }

  function updateDeduction(index: number, patch: Partial<ExtraDeductionInput>) {
    setExtraDeductions((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function removeDeduction(index: number) {
    setExtraDeductions((items) => items.filter((_, i) => i !== index));
  }

  function resetForm() {
    setLoanType("normal");
    setLoanAmount("100000");
    setPeriodOption("6");
    setCustomPeriodCount("6");
    setStartDate(today);
    setPreDeductPeriods(String(getAutoPreDeductPeriods(today)));
    setGoldDeduction("0");
    setExtraDeductions([]);
    setSaveMessage("");
    setSaveState("idle");
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
      <section className="mobile-hero">
        <div className="mobile-hero-icon">算</div>
        <div>
          <div className="mobile-hero-title">自動計算出金額度</div>
          <div className="mobile-hero-subtitle">貸款可實拿金額試算工具</div>
        </div>
      </section>

      {mode === "user" && slug ? <a className="notice-card block no-underline" href={`/u/${slug}/customers`}>客戶列表：查看已建立案件與還款紀錄</a> : null}

      <section className="notice-card">先選擇典當品，再選計算方式。黃金固定 50,000 元，只計算實拿金額。</section>

      <section className="card step-card">
        <h2 className="step-title">1 選擇典當品</h2>
        <div className="segment-stack">
          <button className={`segment-button ${loanType === "normal" ? "is-active" : ""}`} type="button" onClick={() => setLoanType("normal")}>一般</button>
          <button className={`segment-button ${loanType === "vehicle" ? "is-active" : ""}`} type="button" onClick={() => setLoanType("vehicle")}>汽機車</button>
          <button className={`segment-button ${loanType === "gold" ? "is-active" : ""}`} type="button" onClick={() => setLoanType("gold")}>黃金</button>
        </div>
        <div className="info-pill">
          <span>前扣利息（{preDeductPeriods || 0}期）</span>
          <span>每萬元 750 元，利率 7.5%</span>
        </div>
      </section>

      <section className="card step-card">
        <h2 className="step-title">2 計算模式</h2>
        <div className="segment-stack">
          <button className="segment-button is-active" type="button">借款金額 → 實拿</button>
          <button className="segment-button" type="button">目標實拿 → 建議額度</button>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block text-xl font-black">借款金額
            <input className="mt-2" type="number" value={loanAmount} disabled={loanType === "gold"} onChange={(e) => setLoanAmount(e.target.value)} />
          </label>

          <label className="block text-xl font-black">放款日期
            <input className="mt-2" type="date" value={startDate} onChange={(e) => changeStartDate(e.target.value)} />
          </label>

          <label className="block text-xl font-black">前扣期數
            <input className="mt-2" type="number" min="0" value={preDeductPeriods} onChange={(e) => setPreDeductPeriods(e.target.value)} />
          </label>

          <div className="block text-xl font-black">
            <div>期數</div>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {presetPeriods.map((option) => (
                <button className={`segment-button min-h-0 py-3 text-base ${periodOption === option.value ? "is-active" : ""}`} key={option.value} type="button" onClick={() => setPeriodOption(option.value)}>{option.label}</button>
              ))}
            </div>
            {periodOption === "custom" ? <input className="mt-3" type="number" min="1" value={customPeriodCount} onChange={(e) => setCustomPeriodCount(e.target.value)} placeholder="輸入其他期數" /> : null}
          </div>

          {loanType === "gold" ? (
            <label className="block text-xl font-black">黃金扣款
              <input className="mt-2" type="number" value={goldDeduction} onChange={(e) => setGoldDeduction(e.target.value)} />
            </label>
          ) : null}
        </div>
      </section>

      <section className="card step-card">
        <h2 className="step-title">3 其他扣款</h2>
        <div className="space-y-4">
          {extraDeductions.map((item, index) => (
            <div className="space-y-3" key={index}>
              <input value={item.name} onChange={(e) => updateDeduction(index, { name: e.target.value })} placeholder="項目" />
              <input type="number" value={item.amount || ""} onChange={(e) => updateDeduction(index, { amount: Number(e.target.value) })} placeholder="金額" />
              <button className="danger-button" type="button" onClick={() => removeDeduction(index)}>刪除</button>
            </div>
          ))}
          <button className="soft-add-button" type="button" onClick={addDeduction}>＋ 新增其他扣款</button>
        </div>
      </section>

      {result ? (
        <section className="card mobile-result-card">
          <div className="result-top-line"><button className="clear-button" type="button" onClick={resetForm}>清除重算</button></div>
          <h2 className="font-black">試算結果</h2>
          <div className="mt-7 result-caption">客人可實拿</div>
          <div className="result-main-value">{format(result.actualReceivedAmount)} <small>元</small></div>
          <ResultLine label="借款金額" value={`${format(result.loanAmount)} 元`} />
          <ResultLine label={`前扣利息（${result.preDeductPeriods}期）`} value={`- ${format(result.interestAmount)} 元`} />
          <ResultLine label="其他扣款" value={`- ${format(result.otherDeductionsTotal + result.vehicleFee + result.goldDeduction)} 元`} />
          <ResultLine label="總扣款" value={`- ${format(result.totalDeductions)} 元`} negative />
          <ResultLine label="客人實拿" value={`${format(result.actualReceivedAmount)} 元`} positive />

          {mode === "user" ? (
            <div className="mt-6 rounded-3xl border bg-slate-50 p-4">
              <label className="block text-xl font-black">客戶姓名
                <input className="mt-2" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="先輸入姓名即可建立" />
              </label>
              <button className="primary-action" type="button" disabled={saveState === "saving"} onClick={saveCustomer}>{saveState === "saving" ? "建立中" : "加入客戶資料"}</button>
              {saveMessage ? <p className="mt-2 text-sm text-red-700">{saveMessage}</p> : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {result ? (
        <section className="card app-full step-card">
          <h2 className="step-title">原始分期試算表</h2>
          <div className="table-wrap">
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

function ResultLine({ label, value, negative = false, positive = false }: { label: string; value: string; negative?: boolean; positive?: boolean }) {
  return (
    <div className={`result-line ${negative ? "is-negative" : ""} ${positive ? "is-positive" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
