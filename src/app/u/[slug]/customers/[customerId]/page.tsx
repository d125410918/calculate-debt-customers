import Link from "next/link";
import { notFound } from "next/navigation";
import CustomerEditor from "@/components/CustomerEditor";
import { prisma } from "@/lib/prisma";

export default async function CustomerDetailPage({ params }: { params: { slug: string; customerId: string } }) {
  const owner = await prisma.owner.findUnique({ where: { slug: params.slug } });
  if (!owner || !owner.isActive) notFound();

  const customer = await prisma.customer.findFirst({
    where: { id: params.customerId, ownerId: owner.id },
    include: { loans: { include: { plans: true, repayments: true }, orderBy: { createdAt: "desc" } } }
  });
  if (!customer) notFound();

  return (
    <main className="app-main app-stack">
      <section className="app-hero">
        <div className="app-hero-icon">人</div>
        <div><div className="app-hero-title">{customer.name}</div><div className="app-hero-subtitle">客戶資料與借款案件</div></div>
      </section>
      <Link className="app-notice" href={`/u/${owner.slug}/customers`}>回客戶列表</Link>

      <section className="app-card">
        <h2 className="app-title">基本資料</h2>
        <CustomerEditor slug={owner.slug} customer={customer} />
      </section>

      <section className="app-card">
        <h2 className="app-title">借款案件</h2>
        <div className="mobile-list">
          {customer.loans.length === 0 ? <p className="app-subtitle">目前沒有案件。</p> : null}
          {customer.loans.map((loan) => (
            <Link className="data-card" href={`/u/${owner.slug}/loans/${loan.id}`} key={loan.id}>
              <div className="data-title">{loan.loanType}｜{loan.status}</div>
              <div className="data-meta">建立日期 {loan.createdAt.toISOString().slice(0, 10)}</div>
              <div className="metric-grid mt-3">
                <Metric label="原始本金" value={loan.principalOriginal.toLocaleString("zh-TW")} />
                <Metric label="剩餘本金" value={loan.principalRemaining.toLocaleString("zh-TW")} green />
                <Metric label="實拿金額" value={loan.actualReceivedAmount.toLocaleString("zh-TW")} />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value, green = false }: { label: string; value: string; green?: boolean }) {
  return <div className="metric-card"><div className="metric-label">{label}</div><div className={`metric-value ${green ? "green" : ""}`}>{value}</div></div>;
}
