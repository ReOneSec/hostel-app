import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { ProfileCompletionModal } from "@/components/profile-completion/profile-completion-modal";
import { GlobalSearch } from "@/components/global-search";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 lg:ml-0">
        <div className="p-4 lg:p-8 pt-16 lg:pt-8 max-w-7xl mx-auto">
          {children}
        </div>
        <ProfileCompletionModal />
        <GlobalSearch />
      </main>
    </div>
  );
}
