export type LoanType = "normal" | "vehicle" | "gold";

export type ExtraDeductionInput = {
  name: string;
  amount: number;
};

export type CalculatorSettingsInput = {
  interestPer10000For30Days: number;
  periodDays: number;
  normalPreDeductPeriods: number;
  specialPreDeductPeriods: number;
  vehicleFee: number;
  goldFixedLoanAmount: number;
  roundingMode: "round";
};

export type CalculateInput = {
  loanType: LoanType;
  loanAmount: number;
  periodCount: number;
  startDate: string;
  preDeductPeriods: number;
  goldDeduction?: number;
  extraDeductions: ExtraDeductionInput[];
  customerName?: string;
};

export type PlanItem = {
  periodIndex: number;
  dueDate: string;
  principalBefore: number;
  interestDue: number;
  paymentAmount: number;
  interestPaid: number;
  principalPaid: number;
  principalAfter: number;
};

export type CalculationResult = {
  loanAmount: number;
  periodCount: number;
  preDeductPeriods: number;
  interestAmount: number;
  vehicleFee: number;
  goldDeduction: number;
  otherDeductionsTotal: number;
  totalDeductions: number;
  actualReceivedAmount: number;
  fixedPaymentAmount: number;
  totalInterest: number;
  totalPayment: number;
  planItems: PlanItem[];
};

export const defaultSettings: CalculatorSettingsInput = {
  interestPer10000For30Days: 750,
  periodDays: 15,
  normalPreDeductPeriods: 2,
  specialPreDeductPeriods: 3,
  vehicleFee: 2000,
  goldFixedLoanAmount: 50000,
  roundingMode: "round"
};

export function money(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
}

export function addDays(dateText: string, days: number): string {
  const date = new Date(dateText + "T00:00:00");
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function calcPeriodInterest(principal: number, settings: CalculatorSettingsInput): number {
  const interest30Days = principal * settings.interestPer10000For30Days / 10000;
  return money(interest30Days * settings.periodDays / 30);
}

export function calcPreDeductInterest(principal: number, periods: number, settings: CalculatorSettingsInput): number {
  return money(calcPeriodInterest(principal, settings) * periods);
}

function simulatePlan(principal: number, periodCount: number, payment: number, startDate: string, settings: CalculatorSettingsInput): PlanItem[] {
  const items: PlanItem[] = [];
  let remaining = principal;

  for (let index = 1; index <= periodCount; index += 1) {
    const before = remaining;
    const interestDue = calcPeriodInterest(before, settings);
    const isLast = index === periodCount;
    const amount = isLast ? interestDue + before : payment;
    const interestPaid = Math.min(amount, interestDue);
    const principalPaid = Math.min(Math.max(amount - interestPaid, 0), before);
    remaining = Math.max(before - principalPaid, 0);

    items.push({
      periodIndex: index,
      dueDate: addDays(startDate, settings.periodDays * index),
      principalBefore: before,
      interestDue,
      paymentAmount: amount,
      interestPaid,
      principalPaid,
      principalAfter: remaining
    });
  }

  return items;
}

export function findFixedPayment(principal: number, periodCount: number, startDate: string, settings: CalculatorSettingsInput): { payment: number; items: PlanItem[] } {
  if (periodCount <= 0) throw new Error("期數必須大於 0");
  if (principal <= 0) throw new Error("本金必須大於 0");

  let low = 1;
  let high = principal + calcPeriodInterest(principal, settings) * periodCount;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const items = simulatePlan(principal, periodCount, mid, startDate, settings);
    const last = items[items.length - 1];
    if (last.principalAfter <= 0) high = mid;
    else low = mid + 1;
  }

  return { payment: low, items: simulatePlan(principal, periodCount, low, startDate, settings) };
}

export function calculateDebt(input: CalculateInput, settings: CalculatorSettingsInput = defaultSettings): CalculationResult {
  const loanAmount = input.loanType === "gold" ? settings.goldFixedLoanAmount : money(input.loanAmount);
  const periodCount = Math.max(1, Math.floor(input.periodCount));
  const preDeductPeriods = Math.max(0, Math.floor(input.preDeductPeriods));
  const interestAmount = calcPreDeductInterest(loanAmount, preDeductPeriods, settings);
  const vehicleFee = input.loanType === "vehicle" ? money(settings.vehicleFee) : 0;
  const goldDeduction = input.loanType === "gold" ? money(input.goldDeduction ?? 0) : 0;
  const otherDeductionsTotal = input.extraDeductions.reduce((sum, item) => sum + money(item.amount), 0);
  const totalDeductions = money(interestAmount + vehicleFee + goldDeduction + otherDeductionsTotal);
  const actualReceivedAmount = money(loanAmount - totalDeductions);
  const plan = findFixedPayment(loanAmount, periodCount, input.startDate, settings);
  const totalInterest = plan.items.reduce((sum, item) => sum + item.interestDue, 0);
  const totalPayment = plan.items.reduce((sum, item) => sum + item.paymentAmount, 0);

  return {
    loanAmount,
    periodCount,
    preDeductPeriods,
    interestAmount,
    vehicleFee,
    goldDeduction,
    otherDeductionsTotal,
    totalDeductions,
    actualReceivedAmount,
    fixedPaymentAmount: plan.payment,
    totalInterest,
    totalPayment,
    planItems: plan.items
  };
}

export function previewRepayment(principalRemaining: number, amount: number, settings: CalculatorSettingsInput) {
  const principalBefore = money(principalRemaining);
  const interestDue = calcPeriodInterest(principalBefore, settings);
  const paid = money(amount);
  const interestPaid = Math.min(paid, interestDue);
  const principalPaid = Math.min(Math.max(paid - interestPaid, 0), principalBefore);
  const principalAfter = Math.max(principalBefore - principalPaid, 0);

  return { principalBefore, interestDue, interestPaid, principalPaid, principalAfter };
}
