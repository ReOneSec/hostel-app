const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    if (user.email !== user.email.toLowerCase()) {
      console.log(`Fixing email for user: ${user.email}`);
      await prisma.user.update({
        where: { id: user.id },
        data: { email: user.email.toLowerCase() }
      });
    }
  }
  console.log("Done fixing emails.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
