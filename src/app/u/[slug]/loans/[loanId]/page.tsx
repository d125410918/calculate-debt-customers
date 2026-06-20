import Link from "next/link";
import { notFound } from "next/navigation";
import RepaymentForm from "@/components/RepaymentForm";
import { calcInterestByDays } from "@/lib/debt";
import { prisma } from "@/lib/prisma";

export default async function LoanDetailPage({ params }: { params: { slug: string; loanId: string } }) {
  const owner = await prisma.owner.findUnique({ where: { slug: params.slug } });
  if (!owner || !owner.isActive) notFound();

  const loan = await prisma.loan.findFirst({
    where: { id: params.loanId, ownerId: owner.id },
    include: {
      customer: true,
      repayments: { orderBy: { paymentDate: "desc" } },
      plans: { include: { items: { orderBy: { periodIndex: "asc" } } }, orderBy: { createdAt: "desc" }, take: 1 }
    }
  });
  if (!loan) notFound();

  const plan = loan.plans[0];
  const todayText = new Date().toISOString().slice(0, 10);
  const today = new Date(`${todayText}T00:00:00`);
  const interestBaseDate = loan.lastInterestCalcDate ?? loan.startDate;
  const daysElapsed = Math.max(0, Math.ceil((today.getTime() - interestBaseDate.getTime()) / 86400000));
  const todayInterest = loan.status === "closed" ? 0 : calcInterestByDays(loan.principalRemaining, daysElapsed, { interestPer10000For30Days: loan.interestPer10000For30Days });
  const settlementAmount = loan.status === "closed" ? 0 : loan.principalRemaining + todayInterest;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{loan.customer.name} 借款案件</h1>
            <p className="mt-1 text-sm text-slate-600">此案件屬於 /u/{owner.slug}</p>
          </div>
          <Link className="text-blue-700" href={`/u/${owner.slug}/customers/${loan.customerId}`}>回客戶頁</Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Info label="原始本金" value={loan.principalOriginal.toLocaleString("zh-TW")} />
          <Info label="實拿金額" value={loan.actualReceivedAmount.toLocaleString("zh-TW")} />
          <Info label="剩餘本金" value={loan.principalRemaining.toLocaleString("zh-TW")} />
          <Info label="今日應收利息" value={todayInterest.toLocaleString("zh-TW")} />
          <Info label="今日結清金額" value={settlementAmount.toLocaleString("zh-TW")} />
          <Info label="狀態" value={loan.status} />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Info label="計息基準日" value={interestBaseDate.toISOString().slice(0, 10)} />
          <Info label="下一到期日" value={(loan.nextDueDate ?? loan.startDate).toISOString().slice(0, 10)} />
          <Info label="利率" value={`每萬元 ${loan.interestPer10000For30Days} / 30天`} />
        </div>

        {loan.status !== "closed" ? (
          <div className="mt-5">
            <RepaymentForm
              slug={owner.slug}
              loanId={loan.id}
              principalRemaining={loan.principalRemaining}
              interestPer10000For30Days={loan.interestPer10000For30Days}
              lastInterestCalcDate={interestBaseDate.toISOString().slice(0, 10)}
            />
          </div>
        ) : null}

        {plan ? (
          <div className="mt-6">
            <h2 className="text-xl font-bold">原始分期試算表</h2>
            <div className="table-wrap mt-3">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 text-left">
                    <th className="border px-3 py-2">期數</th>
                    <th className="border px-3 py-2">到期日</th>
                    <th className="border px-3 py-2">期初本金</th>
                    <th className="border px-3 py-2">利息</th>
                    <th className="border px-3 py-2">應還</th>
                    <th className="border px-3 py-2">回本金</th>
                    <th className="border px-3 py-2">期末本金</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.items.map((item) => (
                    <tr key={item.id}>
                      <td className="border px-3 py-2">{item.periodIndex}</td>
                      <td className="border px-3 py-2">{item.dueDate.toISOString().slice(0, 10)}</td>
                      <td className="border px-3 py-2">{item.principalBefore.toLocaleString("zh-TW")}</td>
                      <td className="border px-3 py-2">{item.interestDue.toLocaleString("zh-TW")}</td>
                      <td className="border px-3 py-2">{item.paymentAmount.toLocaleString("zh-TW")}</td>
                      <td className="border px-3 py-2">{item.principalPaid.toLocaleString("zh-TW")}</td>
                      <td className="border px-3 py-2">{item.principalAfter.toLocaleString("zh-TW")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="mt-6">
          <h2 className="text-xl font-bold">實際還款紀錄</h2>
          <div className="table-wrap mt-3">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 text-left">
                  <th className="border px-3 py-2">日期</th>
                  <th className="border px-3 py-2">金額</th>
                  <th className="border px-3 py-2">應收利息</th>
                  <th className="border px-3 py-2">抵利息</th>
                  <th className="border px-3 py-2">回本金</th>
                  <th className="border px-3 py-2">還款後本金</th>
                  <th className="border px-3 py-2">備註</th>
                </tr>
              </thead>
              <tbody>
                {loan.repayments.map((item) => (
                  <tr key={item.id}>
                    <td className="border px-3 py-2">{item.paymentDate.toISOString().slice(0, 10)}</td>
                    <td className="border px-3 py-2">{item.amount.toLocaleString("zh-TW")}</td>
                    <td className="border px-3 py-2">{item.interestDue.toLocaleString("zh-TW")}</td>
                    <td className="border px-3 py-2">{item.interestPaid.toLocaleString("zh-TW")}</td>
                    <td className="border px-3 py-2">{item.principalPaid.toLocaleString("zh-TW")}</td>
                    <td className="border px-3 py-2">{item.principalAfter.toLocaleString("zh-TW")}</td>
                    <td className="border px-3 py-2">{item.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-slate-50 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 font-bold">{value}</div>
    </div>
  );
}
