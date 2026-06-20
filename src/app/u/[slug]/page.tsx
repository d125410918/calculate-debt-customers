import { notFound } from "next/navigation";
import CalculatorClient from "@/components/CalculatorClient";
import { prisma } from "@/lib/prisma";

export default async function UserCalculatorPage({ params }: { params: { slug: string } }) {
  const owner = await prisma.owner.findUnique({
    where: { slug: params.slug },
    include: { settings: true }
  });

  if (!owner || !owner.isActive) notFound();

  const settings = owner.settings ?? {
    interestPer10000For30Days: 750,
    periodDays: 15,
    normalPreDeductPeriods: 2,
    specialPreDeductPeriods: 3,
    vehicleFee: 2000,
    goldFixedLoanAmount: 50000,
    roundingMode: "round" as const
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <CalculatorClient mode="user" slug={owner.slug} ownerName={owner.displayName} settings={settings} />
    </main>
  );
}
