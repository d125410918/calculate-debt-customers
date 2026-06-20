import { NextResponse } from "next/server";
import { addDays, calculateDebt, dateFromText, defaultSettings, type CalculateInput, type CalculatorSettingsInput } from "@/lib/debt";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  try {
    const body = await request.json();
    const customerName = String(body.customerName ?? "").trim();
    const input = body.input as CalculateInput;

    if (!customerName) {
      return NextResponse.json({ error: "請輸入客戶姓名。" }, { status: 400 });
    }

    const owner = await prisma.owner.findUnique({ where: { slug: params.slug }, include: { settings: true } });
    if (!owner || !owner.isActive) {
      return NextResponse.json({ error: "找不到使用者頁面。" }, { status: 404 });
    }

    const settings: CalculatorSettingsInput = owner.settings
      ? {
          interestPer10000For30Days: owner.settings.interestPer10000For30Days,
          periodDays: owner.settings.periodDays,
          normalPreDeductPeriods: owner.settings.normalPreDeductPeriods,
          specialPreDeductPeriods: owner.settings.specialPreDeductPeriods,
          vehicleFee: owner.settings.vehicleFee,
          goldFixedLoanAmount: owner.settings.goldFixedLoanAmount,
          roundingMode: "round"
        }
      : defaultSettings;

    const result = calculateDebt({ ...input, customerName }, settings);
    const startDate = dateFromText(input.startDate);
    const nextDueDate = dateFromText(addDays(input.startDate, settings.periodDays));

    const saved = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          ownerId: owner.id,
          name: customerName
        }
      });

      const loan = await tx.loan.create({
        data: {
          ownerId: owner.id,
          customerId: customer.id,
          loanType: input.loanType,
          principalOriginal: result.loanAmount,
          principalRemaining: result.loanAmount,
          actualReceivedAmount: result.actualReceivedAmount,
          interestPer10000For30Days: settings.interestPer10000For30Days,
          periodDays: settings.periodDays,
          periodCount: result.periodCount,
          startDate,
          lastInterestCalcDate: startDate,
          nextDueDate,
          currentAccruedInterest: 0,
          status: "active"
        }
      });

      const record = await tx.calculationRecord.create({
        data: {
          ownerId: owner.id,
          sourcePage: "user_page",
          customerName,
          loanType: input.loanType,
          loanAmount: result.loanAmount,
          periodCount: result.periodCount,
          startDate,
          preDeductPeriods: result.preDeductPeriods,
          interestAmount: result.interestAmount,
          vehicleFee: result.vehicleFee,
          goldDeduction: result.goldDeduction,
          otherDeductionsTotal: result.otherDeductionsTotal,
          totalDeductions: result.totalDeductions,
          actualReceivedAmount: result.actualReceivedAmount,
          createdCustomerId: customer.id,
          createdLoanId: loan.id,
          extraDeductions: {
            create: input.extraDeductions.map((item) => ({ name: item.name || "其他扣款", amount: Math.round(Number(item.amount) || 0) }))
          }
        }
      });

      await tx.customer.update({ where: { id: customer.id }, data: { sourceCalculationId: record.id } });
      await tx.loan.update({ where: { id: loan.id }, data: { sourceCalculationId: record.id } });

      const plan = await tx.loanPlan.create({
        data: {
          ownerId: owner.id,
          loanId: loan.id,
          periodCount: result.periodCount,
          fixedPaymentAmount: result.fixedPaymentAmount,
          totalInterest: result.totalInterest,
          totalPayment: result.totalPayment,
          roundingMode: "round",
          items: {
            create: result.planItems.map((item) => ({
              ownerId: owner.id,
              periodIndex: item.periodIndex,
              dueDate: dateFromText(item.dueDate),
              principalBefore: item.principalBefore,
              interestDue: item.interestDue,
              paymentAmount: item.paymentAmount,
              interestPaid: item.interestPaid,
              principalPaid: item.principalPaid,
              principalAfter: item.principalAfter
            }))
          }
        }
      });

      return { customer, loan, record, plan };
    });

    return NextResponse.json({ customerId: saved.customer.id, loanId: saved.loan.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "建立客戶資料失敗。" }, { status: 500 });
  }
}
