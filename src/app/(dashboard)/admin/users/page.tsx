import { getUsersList } from "@/lib/services/users";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UsersClient } from "./users-client";

export default async function AdminUsersPage() {
  const session = await auth();
  
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "HOSTEL_MANAGER")) {
    redirect("/login");
  }

  const { data: initialUsers, meta: initialMeta } = await getUsersList({ page: 1, perPage: 50, sortBy: "name" });

  return <UsersClient initialUsers={initialUsers as any} initialMeta={initialMeta} />;
}
