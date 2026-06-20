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
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00`);
  const interestBaseDate = loan.lastInterestCalcDate ?? loan.startDate;
  const daysElapsed = Math.max(0, Math.ceil((today.getTime() - interestBaseDate.getTime()) / 86400000));
  const todayInterest = loan.status === "closed" ? 0 : calcInterestByDays(loan.principalRemaining, daysElapsed, { interestPer10000For30Days: loan.interestPer10000For30Days });
  const settlementAmount = loan.status === "closed" ? 0 : loan.principalRemaining + todayInterest;

  return (
    <main className="app-main app-stack">
      <section className="app-hero">
        <div className="app-hero-icon">案</div>
        <div><div className="app-hero-title">{loan.customer.name}</div><div className="app-hero-subtitle">借款案件｜{loan.status}</div></div>
      </section>
      <Link className="app-notice" href={`/u/${owner.slug}/customers/${loan.customerId}`}>回客戶頁</Link>

      <section className="app-card result-card">
        <h2 className="app-title">案件儀表板</h2>
        <div className="result-caption">今日結清金額</div>
        <div className="result-value">{settlementAmount.toLocaleString("zh-TW")} <small>元</small></div>
        <div className="metric-grid">
          <Info label="原始本金" value={loan.principalOriginal.toLocaleString("zh-TW")} />
          <Info label="實拿金額" value={loan.actualReceivedAmount.toLocaleString("zh-TW")} />
          <Info label="剩餘本金" value={loan.principalRemaining.toLocaleString("zh-TW")} green />
          <Info label="今日利息" value={todayInterest.toLocaleString("zh-TW")} />
          <Info label="計息基準日" value={interestBaseDate.toISOString().slice(0, 10)} />
          <Info label="下一到期日" value={(loan.nextDueDate ?? loan.startDate).toISOString().slice(0, 10)} />
        </div>
      </section>

      {loan.status !== "closed" ? <RepaymentForm slug={owner.slug} loanId={loan.id} principalRemaining={loan.principalRemaining} interestPer10000For30Days={loan.interestPer10000For30Days} lastInterestCalcDate={interestBaseDate.toISOString().slice(0, 10)} /> : null}

      {plan ? (
        <section className="app-card">
          <h2 className="app-title">原始分期試算表</h2>
          <div className="mobile-list desktop-hide">
            {plan.items.map((item) => (
              <div className="data-card" key={item.id}>
                <div className="data-title">第 {item.periodIndex} 期</div>
                <div className="data-meta">到期日 {item.dueDate.toISOString().slice(0, 10)}</div>
                <div className="metric-grid mt-3">
                  <Info label="期初本金" value={item.principalBefore.toLocaleString("zh-TW")} />
                  <Info label="利息" value={item.interestDue.toLocaleString("zh-TW")} />
                  <Info label="應還" value={item.paymentAmount.toLocaleString("zh-TW")} />
                  <Info label="回本金" value={item.principalPaid.toLocaleString("zh-TW")} />
                  <Info label="期末本金" value={item.principalAfter.toLocaleString("zh-TW")} green />
                </div>
              </div>
            ))}
          </div>
          <div className="mobile-table"><table className="w-full min-w-[760px] border-collapse text-sm"><thead><tr><th className="border">期數</th><th className="border">到期日</th><th className="border">期初本金</th><th className="border">利息</th><th className="border">應還</th><th className="border">回本金</th><th className="border">期末本金</th></tr></thead><tbody>{plan.items.map((item) => <tr key={item.id}><td className="border">{item.periodIndex}</td><td className="border">{item.dueDate.toISOString().slice(0, 10)}</td><td className="border">{item.principalBefore.toLocaleString("zh-TW")}</td><td className="border">{item.interestDue.toLocaleString("zh-TW")}</td><td className="border">{item.paymentAmount.toLocaleString("zh-TW")}</td><td className="border">{item.principalPaid.toLocaleString("zh-TW")}</td><td className="border">{item.principalAfter.toLocaleString("zh-TW")}</td></tr>)}</tbody></table></div>
        </section>
      ) : null}

      <section className="app-card">
        <h2 className="app-title">實際還款紀錄</h2>
        <div className="mobile-list">
          {loan.repayments.length === 0 ? <p className="app-subtitle">尚無還款紀錄。</p> : null}
          {loan.repayments.map((item) => <div className="data-card" key={item.id}><div className="data-title">{item.paymentDate.toISOString().slice(0, 10)}</div><div className="data-meta">{item.note ?? "還款"}</div><div className="metric-grid mt-3"><Info label="金額" value={item.amount.toLocaleString("zh-TW")} /><Info label="應收利息" value={item.interestDue.toLocaleString("zh-TW")} /><Info label="抵利息" value={item.interestPaid.toLocaleString("zh-TW")} /><Info label="回本金" value={item.principalPaid.toLocaleString("zh-TW")} /><Info label="還款後本金" value={item.principalAfter.toLocaleString("zh-TW")} green /></div></div>)}
        </div>
      </section>
    </main>
  );
}

function Info({ label, value, green = false }: { label: string; value: string; green?: boolean }) {
  return <div className="metric-card"><div className="metric-label">{label}</div><div className={`metric-value ${green ? "green" : ""}`}>{value}</div></div>;
}
