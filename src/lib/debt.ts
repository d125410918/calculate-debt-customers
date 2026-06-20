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

function createEqualInstallmentPlan(principal: number, periodCount: number, startDate: string, settings: CalculatorSettingsInput): { payment: number; totalInterest: number; totalPayment: number; items: PlanItem[] } {
  if (periodCount <= 0) throw new Error("期數必須大於 0");
  if (principal <= 0) throw new Error("本金必須大於 0");

  const periodInterest = calcPeriodInterest(principal, settings);
  const totalInterest = money(periodInterest * periodCount);
  const totalPayment = money(principal + totalInterest);
  const fixedPayment = Math.ceil(totalPayment / periodCount);
  const items: PlanItem[] = [];
  let principalRemaining = principal;
  let interestRemaining = totalInterest;
  let paymentRemaining = totalPayment;

  for (let index = 1; index <= periodCount; index += 1) {
    const isLast = index === periodCount;
    const principalBefore = principalRemaining;
    const paymentAmount = isLast ? paymentRemaining : fixedPayment;
    const interestDue = isLast ? interestRemaining : Math.min(periodInterest, interestRemaining);
    const interestPaid = Math.min(paymentAmount, interestDue);
    const principalPaid = isLast ? principalBefore : Math.min(Math.max(paymentAmount - interestPaid, 0), principalBefore);
    const principalAfter = Math.max(principalBefore - principalPaid, 0);

    items.push({
      periodIndex: index,
      dueDate: addDays(startDate, settings.periodDays * index),
      principalBefore,
      interestDue,
      paymentAmount,
      interestPaid,
      principalPaid,
      principalAfter
    });

    principalRemaining = principalAfter;
    interestRemaining = Math.max(interestRemaining - interestPaid, 0);
    paymentRemaining = Math.max(paymentRemaining - paymentAmount, 0);
  }

  return { payment: fixedPayment, totalInterest, totalPayment, items };
}

export function findFixedPayment(principal: number, periodCount: number, startDate: string, settings: CalculatorSettingsInput): { payment: number; items: PlanItem[] } {
  const plan = createEqualInstallmentPlan(principal, periodCount, startDate, settings);
  return { payment: plan.payment, items: plan.items };
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
  const plan = createEqualInstallmentPlan(loanAmount, periodCount, input.startDate, settings);

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
    totalInterest: plan.totalInterest,
    totalPayment: plan.totalPayment,
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
