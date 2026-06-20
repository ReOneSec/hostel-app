import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getHostelsForUser, getBillingConfig, getBillingRegister } from "@/lib/services/billing";
import { AdminBillingClient } from "./billing-client";

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
      configData = await getBillingConfig(firstHostelId);
      registerData = await getBillingRegister(firstHostelId, parseInt(initialYear));
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
