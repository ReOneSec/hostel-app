const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'sahabajalam@mirror.std' },
    include: {
      hostelAssignments: true,
      roomAssignments: true,
      bedAssignments: true,
      studentProfile: true
    }
  });
  console.log(JSON.stringify(user, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
