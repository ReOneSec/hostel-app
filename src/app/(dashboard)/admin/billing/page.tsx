import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getHostelsForUser, getBillingConfig, getBillingRegister } from "@/lib/services/billing";
import { AdminBillingClient } from "./billing-client";

export const dynamic = "force-dynamic";

export default async function AdminBillingPage() {
  const session = await auth();
  
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "HOSTEL_MANAGER")) {
    redirect("/login");
  }

  const hostels = await getHostelsForUser(session);
  const initialYear = new Date().getFullYear().toString();
  
  let configData = null;
  let registerData: any[] = [];

  if (hostels.length > 0) {
    const firstHostelId = hostels[0].id;
    try {
      const [config, register] = await Promise.all([
        getBillingConfig(firstHostelId),
        getBillingRegister(firstHostelId, parseInt(initialYear, 10)),
      ]);
      configData = config;
      registerData = register;
    } catch (error) {
      console.error("Error fetching initial billing data:", error);
    }
  }

  return (
    <AdminBillingClient 
      initialHostels={hostels}
      initialConfigData={configData}
      initialRegisterData={registerData}
      initialYear={initialYear}
    />
  );
}
