import { PrismaClient, Role, AccountStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Check if super admin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { role: Role.SUPER_ADMIN },
  });

  if (existingAdmin) {
    console.log("✅ Super Admin already exists. Skipping seed.");
    return;
  }

  // Create Super Admin
  const hashedPassword = await bcrypt.hash("admin@123", 12);

  const admin = await prisma.user.create({
    data: {
      username: "superadmin",
      email: "admin@mirrorhostels.com",
      passwordHash: hashedPassword,
      role: Role.SUPER_ADMIN,
      status: AccountStatus.ACTIVE,
      isProfileComplete: true,
      isFirstLogin: false,
    },
  });

  console.log(`✅ Super Admin created: ${admin.email}`);
  console.log(`   Username: superadmin`);
  console.log(`   Password: admin@123`);
  console.log(`   ⚠️  Change this password immediately in production!`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
