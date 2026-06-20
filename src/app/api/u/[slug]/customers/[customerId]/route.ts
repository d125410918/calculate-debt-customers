import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: { slug: string; customerId: string } }) {
  const data = await request.json();
  const owner = await prisma.owner.findUnique({ where: { slug: params.slug } });
  if (!owner || !owner.isActive) return NextResponse.json({ error: "找不到頁面" }, { status: 404 });

  const existing = await prisma.customer.findFirst({ where: { id: params.customerId, ownerId: owner.id } });
  if (!existing) return NextResponse.json({ error: "找不到資料" }, { status: 404 });

  const updated = await prisma.customer.update({
    where: { id: existing.id },
    data: {
      name: String(data.name ?? existing.name).trim() || existing.name,
      phone: String(data.phone ?? "").trim() || null,
      address: String(data.address ?? "").trim() || null,
      note: String(data.note ?? "").trim() || null
    }
  });

  return NextResponse.json({ customer: updated });
}
