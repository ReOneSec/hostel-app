import { redirect } from "next/navigation";

export default function HomePage() {
  // Root always redirects — middleware handles role-based routing
  redirect("/login");
}
