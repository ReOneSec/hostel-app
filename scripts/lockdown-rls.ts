import { prisma } from "../src/lib/prisma";
import fs from "fs";
import path from "path";

async function runLockdown() {
  try {
    const sqlPath = path.join(
      process.cwd(),
      "supabase",
      "migrations",
      "20261012_enable_rls_lockdown.sql"
    );
    const sql = fs.readFileSync(sqlPath, "utf-8");

    console.log("Applying RLS lockdown migration on all public schema tables...");
    await prisma.$executeRawUnsafe(sql);

    console.log("RLS lockdown successfully applied!");
    console.log("- Row Level Security enabled on all tables.");
    console.log("- Direct access revoked from anon and authenticated roles.");
  } catch (error) {
    console.error("Failed to apply RLS lockdown:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runLockdown().catch(console.error);
