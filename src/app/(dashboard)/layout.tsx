import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { ProfileCompletionModal } from "@/components/profile-completion/profile-completion-modal";
import { GlobalSearch } from "@/components/global-search";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <DashboardSidebar />
      <main className="flex-1 min-w-0">
        <div className="px-4 sm:px-6 py-6 pt-20 lg:pt-6 pb-24 lg:pb-6 max-w-7xl mx-auto">
          {children}
        </div>
        <ProfileCompletionModal />
        <GlobalSearch />
      </main>
    </div>
  );
}
