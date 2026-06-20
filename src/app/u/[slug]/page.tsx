import { notFound } from "next/navigation";
import CalculatorClient from "@/components/CalculatorClient";
import { defaultSettings, type CalculatorSettingsInput } from "@/lib/debt";
import { prisma } from "@/lib/prisma";

export default async function UserCalculatorPage({ params }: { params: { slug: string } }) {
  const owner = await prisma.owner.findUnique({
    where: { slug: params.slug },
    include: { settings: true }
  });

  if (!owner || !owner.isActive) notFound();

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

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <CalculatorClient mode="user" slug={owner.slug} ownerName={owner.displayName} settings={settings} />
    </main>
  );
}
