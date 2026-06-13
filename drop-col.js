const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "Payment" DROP COLUMN "category";`);
  console.log("Dropped column");
}
run().catch(console.error).finally(() => prisma.$disconnect());
