import Link from "next/link";
import { notFound } from "next/navigation";
import { calcInterestByDays } from "@/lib/debt";
import { prisma } from "@/lib/prisma";

type SearchParams = { q?: string; sort?: string };

export default async function CustomersPage({ params, searchParams }: { params: { slug: string }; searchParams?: SearchParams }) {
  const owner = await prisma.owner.findUnique({ where: { slug: params.slug } });
  if (!owner || !owner.isActive) notFound();

  const q = String(searchParams?.q ?? "").trim();
  const sort = String(searchParams?.sort ?? "createdAt");

  const customers = await prisma.customer.findMany({
    where: {
      ownerId: owner.id,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    },
    include: { loans: { include: { repayments: { orderBy: { paymentDate: "desc" }, take: 1 } } } },
    orderBy: { createdAt: "desc" }
  });

  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00`);
  const rows = customers.map((customer) => {
    const openLoans = customer.loans.filter((loan) => loan.status !== "closed");
    const remaining = openLoans.reduce((sum, loan) => sum + loan.principalRemaining, 0);
    const interest = openLoans.reduce((sum, loan) => {
      const base = loan.lastInterestCalcDate ?? loan.startDate;
      const days = Math.max(0, Math.ceil((today.getTime() - base.getTime()) / 86400000));
      return sum + calcInterestByDays(loan.principalRemaining, days, { interestPer10000For30Days: loan.interestPer10000For30Days });
    }, 0);
    const lastPaymentDate = customer.loans
      .flatMap((loan) => loan.repayments.map((repayment) => repayment.paymentDate))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    return { customer, remaining, interest, settlement: remaining + interest, lastPaymentDate };
  });

  rows.sort((a, b) => {
    if (sort === "remaining") return b.remaining - a.remaining;
    if (sort === "lastPayment") return (b.lastPaymentDate?.getTime() ?? 0) - (a.lastPaymentDate?.getTime() ?? 0);
    return b.customer.createdAt.getTime() - a.customer.createdAt.getTime();
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{owner.displayName} 客戶列表</h1>
            <p className="mt-1 text-sm text-slate-600">此頁只顯示 /u/{owner.slug} 建立的資料。</p>
          </div>
          <Link className="rounded-lg bg-blue-700 px-4 py-2 text-white" href={`/u/${owner.slug}`}>回試算</Link>
        </div>

        <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_180px_90px]">
          <input className="rounded-lg border px-3 py-2" name="q" defaultValue={q} placeholder="搜尋姓名或電話" />
          <select className="rounded-lg border px-3 py-2" name="sort" defaultValue={sort}>
            <option value="createdAt">建立日期</option>
            <option value="remaining">剩餘本金</option>
            <option value="lastPayment">最近還款日</option>
          </select>
          <button className="rounded-lg border px-3 py-2" type="submit">搜尋</button>
        </form>

        <div className="mt-5 space-y-3">
          {rows.length === 0 ? <p className="text-slate-600">目前沒有客戶資料。</p> : null}
          {rows.map(({ customer, remaining, interest, settlement, lastPaymentDate }) => (
            <Link className="block rounded-xl border p-4 hover:bg-slate-50" href={`/u/${owner.slug}/customers/${customer.id}`} key={customer.id}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="font-bold">{customer.name}</div>
                  <div className="text-sm text-slate-500">{customer.phone || "尚未補電話"}</div>
                </div>
                <div className="grid gap-2 text-sm sm:grid-cols-5 lg:min-w-[720px]">
                  <Metric label="案件數" value={`${customer.loans.length}`} />
                  <Metric label="剩餘本金" value={remaining.toLocaleString("zh-TW")} />
                  <Metric label="今日利息" value={interest.toLocaleString("zh-TW")} />
                  <Metric label="今日結清" value={settlement.toLocaleString("zh-TW")} />
                  <Metric label="最近還款" value={lastPaymentDate ? lastPaymentDate.toISOString().slice(0, 10) : "-"} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
