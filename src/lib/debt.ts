export type LoanType = "normal" | "vehicle" | "gold";
export type InstallmentUnit = "period" | "month";
export type ExtraDeductionInput = { name: string; amount: number };
export type LoanStatus = "created" | "active" | "partial_payment" | "settlement" | "closed";
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
  installmentUnit?: InstallmentUnit;
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
  requestedPeriodCount: number;
  installmentUnit: InstallmentUnit;
  installmentDays: number;
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
export type RepaymentPreview = {
  principalBefore: number;
  interestDue: number;
  interestPaid: number;
  principalPaid: number;
  principalAfter: number;
  settlementAmount: number;
};

export const defaultSettings = {
  interestPer10000For30Days: 750,
  periodDays: 15,
  normalPreDeductPeriods: 2,
  specialPreDeductPeriods: 3,
  vehicleFee: 2000,
  goldFixedLoanAmount: 50000,
  roundingMode: "round"
} as const;

export const money = (value: number) => (Number.isFinite(value) ? Math.round(value) : 0);
export const roundToHundred = (value: number) => (Number.isFinite(value) ? Math.round(value / 100) * 100 : 0);

export function getInstallmentDays(_unit: InstallmentUnit | undefined, settings: Pick<CalculatorSettingsInput, "periodDays">) {
  return settings.periodDays;
}

export function getActualPeriodCount(requestedCount: number, unit: InstallmentUnit) {
  const safeRequestedCount = Math.max(1, Math.floor(requestedCount));
  return unit === "month" ? safeRequestedCount * 2 : safeRequestedCount;
}

export function toDateOnly(value: Date | string) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export function dateFromText(value: string) {
  return new Date(`${value}T00:00:00`);
}

export function daysBetween(from: Date | string, to: Date | string) {
  const a = typeof from === "string" ? dateFromText(from) : from;
  const b = typeof to === "string" ? dateFromText(to) : to;
  return Math.max(0, Math.ceil((b.getTime() - a.getTime()) / 86400000));
}

export function getAutoPreDeductPeriods(dateText: string) {
  const day = dateFromText(dateText).getDate();
  return day >= 29 || day <= 5 ? 3 : 2;
}

export function addDays(dateText: string, days: number) {
  const value = dateFromText(dateText);
  value.setDate(value.getDate() + days);
  return toDateOnly(value);
}

export function calcInterestByDays(principal: number, days: number, settings: Pick<CalculatorSettingsInput, "interestPer10000For30Days">) {
  return money(money(principal) * (settings.interestPer10000For30Days / 10000) * (Math.max(0, days) / 30));
}

export function calcPeriodInterest(principal: number, settings: CalculatorSettingsInput) {
  return calcInterestByDays(principal, settings.periodDays, settings);
}

export function calcPreDeductInterest(principal: number, periods: number, settings: CalculatorSettingsInput) {
  return money(calcPeriodInterest(principal, settings) * periods);
}

function buildAmortization(principal: number, actualPeriodCount: number, startDate: string, settings: CalculatorSettingsInput, installmentUnit: InstallmentUnit) {
  const safePeriodCount = Math.max(1, Math.floor(actualPeriodCount));
  const installmentDays = getInstallmentDays(installmentUnit, settings);
  const rate = (settings.interestPer10000For30Days / 10000) * (installmentDays / 30);
  const exactPayment = rate === 0 ? principal / safePeriodCount : (principal * rate * Math.pow(1 + rate, safePeriodCount)) / (Math.pow(1 + rate, safePeriodCount) - 1);
  const regularPayment = Math.max(roundToHundred(exactPayment), 100);
  const items: PlanItem[] = [];
  let remaining = money(principal);
  let totalInterest = 0;
  let totalPayment = 0;

  for (let index = 1; index <= safePeriodCount; index++) {
    const principalBefore = remaining;
    const interest = money(principalBefore * rate);
    const isFinal = index === safePeriodCount;
    const minimumNonFinalPayment = money(interest + 1);
    const paymentAmount = isFinal ? money(principalBefore + interest) : Math.max(regularPayment, minimumNonFinalPayment);
    const principalPaid = isFinal ? principalBefore : Math.min(principalBefore, Math.max(paymentAmount - interest, 0));
    const principalAfter = isFinal ? 0 : Math.max(principalBefore - principalPaid, 0);

    items.push({
      periodIndex: index,
      dueDate: addDays(startDate, installmentDays * index),
      principalBefore,
      interestDue: interest,
      paymentAmount,
      interestPaid: interest,
      principalPaid,
      principalAfter
    });

    totalInterest += interest;
    totalPayment += paymentAmount;
    remaining = principalAfter;
  }

  return { payment: regularPayment, totalInterest: money(totalInterest), totalPayment: money(totalPayment), items, installmentDays };
}

export function calculateDebt(input: CalculateInput, settings: CalculatorSettingsInput = defaultSettings) {
  const installmentUnit: InstallmentUnit = input.installmentUnit === "month" ? "month" : "period";
  const requestedPeriodCount = Math.max(1, Math.floor(input.periodCount));
  const periodCount = getActualPeriodCount(requestedPeriodCount, installmentUnit);
  const loanAmount = input.loanType === "gold" ? settings.goldFixedLoanAmount : money(input.loanAmount);
  const preDeductPeriods = input.preDeductPeriods > 0 ? input.preDeductPeriods : getAutoPreDeductPeriods(input.startDate);
  const interestAmount = calcPreDeductInterest(loanAmount, preDeductPeriods, settings);
  const vehicleFee = input.loanType === "vehicle" ? money(settings.vehicleFee) : 0;
  const goldDeduction = input.loanType === "gold" ? money(input.goldDeduction ?? 0) : 0;
  const otherDeductionsTotal = input.extraDeductions.reduce((sum, item) => sum + money(item.amount), 0);
  const totalDeductions = money(interestAmount + vehicleFee + goldDeduction + otherDeductionsTotal);
  const actualReceivedAmount = money(loanAmount - totalDeductions);
  const plan = buildAmortization(loanAmount, periodCount, input.startDate, settings, installmentUnit);

  return {
    loanAmount,
    periodCount,
    requestedPeriodCount,
    installmentUnit,
    installmentDays: plan.installmentDays,
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

export function previewRepayment(principalRemaining: number, amount: number, settings: Pick<CalculatorSettingsInput, "interestPer10000For30Days">, daysElapsed: number): RepaymentPreview {
  const principalBefore = money(principalRemaining);
  const interestDue = calcInterestByDays(principalBefore, daysElapsed, settings);
  const paid = money(amount);
  const interestPaid = Math.min(paid, interestDue);
  const principalPaid = Math.min(Math.max(paid - interestPaid, 0), principalBefore);
  const principalAfter = Math.max(principalBefore - principalPaid, 0);
  return { principalBefore, interestDue, interestPaid, principalPaid, principalAfter, settlementAmount: money(principalBefore + interestDue) };
}

export function getNextLoanStatus(principalAfter: number, principalPaid: number): LoanStatus {
  if (principalAfter <= 0) return "closed";
  if (principalPaid > 0) return "partial_payment";
  return "active";
}
