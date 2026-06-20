const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const req = await prisma.profileEditRequest.findUnique({
    where: { id: "cmqljwgty0001i6y96jvx3oan" }
  });
  console.log(JSON.stringify(req, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
