import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function CustomersPage({ params }: { params: { slug: string } }) {
  const owner = await prisma.owner.findUnique({ where: { slug: params.slug } });
  if (!owner || !owner.isActive) notFound();

  const customers = await prisma.customer.findMany({
    where: { ownerId: owner.id },
    include: { loans: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <section className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{owner.displayName} 客戶列表</h1>
            <p className="mt-1 text-sm text-slate-600">此頁只顯示 /u/{owner.slug} 建立的資料。</p>
          </div>
          <Link className="rounded-lg bg-blue-700 px-4 py-2 text-white" href={`/u/${owner.slug}`}>回試算</Link>
        </div>

        <div className="mt-5 space-y-3">
          {customers.length === 0 ? <p className="text-slate-600">目前沒有客戶資料。</p> : null}
          {customers.map((customer) => {
            const activeLoans = customer.loans.filter((loan) => loan.status === "active");
            const remaining = activeLoans.reduce((sum, loan) => sum + loan.principalRemaining, 0);
            return (
              <Link className="block rounded-xl border p-4 hover:bg-slate-50" href={`/u/${owner.slug}/customers/${customer.id}`} key={customer.id}>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-bold">{customer.name}</div>
                    <div className="text-sm text-slate-500">{customer.phone || "尚未補電話"}</div>
                  </div>
                  <div className="text-sm text-slate-700">案件 {customer.loans.length} 筆，剩餘本金 {remaining.toLocaleString("zh-TW")}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
