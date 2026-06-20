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
    <main className="mx-auto max-w-5xl px-4 py-8">
      <section className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <Link className="text-blue-700" href={`/u/${owner.slug}/customers`}>回客戶列表</Link>
        </div>

        <div className="mt-5">
          <CustomerEditor slug={owner.slug} customer={customer} />
        </div>

        <div className="mt-6">
          <h2 className="text-xl font-bold">借款案件</h2>
          <div className="mt-3 space-y-3">
            {customer.loans.map((loan) => (
              <Link className="block rounded-xl border p-4 hover:bg-slate-50" href={`/u/${owner.slug}/loans/${loan.id}`} key={loan.id}>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-bold">{loan.loanType}｜原始本金 {loan.principalOriginal.toLocaleString("zh-TW")}</div>
                    <div className="text-sm text-slate-500">建立日期 {loan.createdAt.toISOString().slice(0, 10)}</div>
                  </div>
                  <div className="text-sm">剩餘本金 {loan.principalRemaining.toLocaleString("zh-TW")}｜{loan.status}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
