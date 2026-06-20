import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const owner = await prisma.owner.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      slug: "demo",
      displayName: "Demo 使用者",
      settings: { create: {} }
    },
    include: { settings: true }
  });

  if (!owner.settings) {
    await prisma.calculatorSetting.create({ data: { ownerId: owner.id } });
  }

  console.log("Seed completed. Open /u/demo");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
