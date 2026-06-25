"use client";

import { useSession, signOut } from "@/hooks/use-auth";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Users,
  Home,
  BedDouble,
  CreditCard,
  UtensilsCrossed,
  FileText,
  BarChart3,
  Shield,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Receipt,
  Wallet,
  ClipboardList,
  User,
  UserCog,
} from "lucide-react";
import { useState } from "react";
import type { Role } from "@prisma/client";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: Role[];
  badge?: string;
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  // Admin
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    roles: ["SUPER_ADMIN"],
    section: "Main",
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: Users,
    roles: ["SUPER_ADMIN", "HOSTEL_MANAGER"],
    section: "Main",
  },
  {
    label: "Profile Requests",
    href: "/admin/profile-requests",
    icon: UserCog,
    roles: ["SUPER_ADMIN"],
    section: "Main",
  },
  {
    label: "Hostels",
    href: "/admin/hostels",
    icon: Building2,
    roles: ["SUPER_ADMIN"],
    section: "Main",
  },
  {
    label: "Billing",
    href: "/admin/billing",
    icon: CreditCard,
    roles: ["SUPER_ADMIN"],
    section: "Finance",
  },
  {
    label: "Payments",
    href: "/admin/payments",
    icon: Wallet,
    roles: ["SUPER_ADMIN"],
    section: "Finance",
  },
  {
    label: "Documents",
    href: "/admin/documents",
    icon: Shield,
    roles: ["SUPER_ADMIN"],
    section: "Operations",
  },
  {
    label: "Reports",
    href: "/admin/reports",
    icon: BarChart3,
    roles: ["SUPER_ADMIN"],
    section: "Operations",
  },
  {
    label: "Audit Logs",
    href: "/admin/audit-logs",
    icon: Shield,
    roles: ["SUPER_ADMIN"],
    section: "Operations",
  },

  // Manager
  {
    label: "Payments",
    href: "/manager/payments",
    icon: Wallet,
    roles: ["HOSTEL_MANAGER"],
    section: "Manager",
  },
  {
    label: "Mess",
    href: "/manager/mess",
    icon: UtensilsCrossed,
    roles: ["HOSTEL_MANAGER", "SUPER_ADMIN"],
    section: "Manager",
  },
  {
    label: "Documents",
    href: "/manager/documents",
    icon: FileText,
    roles: ["HOSTEL_MANAGER"],
    section: "Manager",
  },

  // Monthly Manager
  {
    label: "Mess Management",
    href: "/monthly-manager/mess",
    icon: UtensilsCrossed,
    roles: ["MONTHLY_MANAGER"],
    section: "Mess",
  },

  // Student
  {
    label: "Dashboard",
    href: "/student/dashboard",
    icon: Home,
    roles: ["STUDENT", "MONTHLY_MANAGER", "HOSTEL_MANAGER"],
    section: "Student",
  },
  {
    label: "My Profile",
    href: "/student/profile",
    icon: User,
    roles: ["STUDENT", "MONTHLY_MANAGER", "HOSTEL_MANAGER"],
    section: "Student",
  },
  {
    label: "My Bills",
    href: "/student/bills",
    icon: Receipt,
    roles: ["STUDENT", "MONTHLY_MANAGER", "HOSTEL_MANAGER"],
    section: "Student",
  },
  {
    label: "Payments",
    href: "/student/payments",
    icon: Wallet,
    roles: ["STUDENT", "MONTHLY_MANAGER", "HOSTEL_MANAGER"],
    section: "Student",
  },
  {
    label: "My Mess",
    href: "/student/mess",
    icon: UtensilsCrossed,
    roles: ["STUDENT", "MONTHLY_MANAGER", "HOSTEL_MANAGER"],
    section: "Student",
  },
  {
    label: "Documents",
    href: "/student/documents",
    icon: ClipboardList,
    roles: ["STUDENT", "MONTHLY_MANAGER", "HOSTEL_MANAGER"],
    section: "Student",
  },
];

// Bottom nav items by role (max 5)
const BOTTOM_NAV: Record<string, { label: string; href: string; icon: React.ElementType }[]> = {
  SUPER_ADMIN: [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Billing", href: "/admin/billing", icon: CreditCard },
    { label: "Mess", href: "/manager/mess", icon: UtensilsCrossed },
    { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  ],
  HOSTEL_MANAGER: [
    { label: "Home", href: "/student/dashboard", icon: Home },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Payments", href: "/manager/payments", icon: Wallet },
    { label: "Mess", href: "/manager/mess", icon: UtensilsCrossed },
    { label: "Profile", href: "/student/profile", icon: User },
  ],
  MONTHLY_MANAGER: [
    { label: "Home", href: "/student/dashboard", icon: Home },
    { label: "Mess", href: "/monthly-manager/mess", icon: UtensilsCrossed },
    { label: "Bills", href: "/student/bills", icon: Receipt },
    { label: "Payments", href: "/student/payments", icon: Wallet },
    { label: "Profile", href: "/student/profile", icon: User },
  ],
  STUDENT: [
    { label: "Home", href: "/student/dashboard", icon: Home },
    { label: "Bills", href: "/student/bills", icon: Receipt },
    { label: "Payments", href: "/student/payments", icon: Wallet },
    { label: "Mess", href: "/student/mess", icon: UtensilsCrossed },
    { label: "Profile", href: "/student/profile", icon: User },
  ],
};

function getRoleLabel(role: Role): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super Admin";
    case "HOSTEL_MANAGER":
      return "Hostel Manager";
    case "MONTHLY_MANAGER":
      return "Monthly Manager";
    case "STUDENT":
      return "Student";
    default:
      return role;
  }
}

function getRoleColor(role: Role): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "text-rose-400";
    case "HOSTEL_MANAGER":
      return "text-green-400";
    case "MONTHLY_MANAGER":
      return "text-amber-400";
    case "STUDENT":
      return "text-blue-400";
    default:
      return "text-slate-400";
  }
}

export function DashboardSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  if (!session?.user) return null;

  const userRole = session.user.role as Role;
  const filteredNav = NAV_ITEMS.filter((item) =>
    item.roles.includes(userRole)
  );
  const initials = (session.user.username ?? session.user.email ?? "U")
    .substring(0, 2)
    .toUpperCase();

  // Group nav items by section
  const sections: Record<string, typeof filteredNav> = {};
  filteredNav.forEach((item) => {
    const section = item.section || "Other";
    if (!sections[section]) sections[section] = [];
    sections[section].push(item);
  });

  const bottomNavItems = BOTTOM_NAV[userRole] || BOTTOM_NAV.STUDENT;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo area */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">Mirror Hostels</p>
          <p className="text-[10px] text-slate-500 tracking-wide uppercase">Management</p>
        </div>
      </div>

      {/* Navigation sections */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {Object.entries(sections).map(([sectionName, items]) => (
          <div key={sectionName} className="mb-4">
            <div className="px-3 pt-3 pb-1.5">
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
                {sectionName}
              </p>
            </div>
            <nav className="space-y-0.5">
              {items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/admin" &&
                    item.href !== "/student/dashboard" &&
                    pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={`
                      relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                      transition-colors duration-150
                      ${
                        isActive
                          ? "bg-[#1E3A5F] text-white before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-full before:bg-blue-500"
                          : "text-slate-400 hover:text-slate-200 hover:bg-[#142038]"
                      }
                    `}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? "text-blue-400" : ""
                      }`}
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] h-5 px-1.5 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-medium">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Bottom user card */}
      <div className="mt-auto mx-3 mb-4 p-3 rounded-xl bg-white/5 border border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {session.user.username}
            </p>
            <p className={`text-[10px] ${getRoleColor(userRole)}`}>
              {getRoleLabel(userRole)}
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 bg-[#0B1628] border-b border-white/5 flex items-center px-4 gap-3">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          {isMobileOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
            <Building2 className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-semibold text-white">Mirror Hostels</span>
        </div>
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold cursor-pointer">
          {initials}
        </div>
      </header>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-60
          bg-[#0B1628]
          transition-transform duration-300 ease-in-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          lg:sticky lg:top-0 lg:z-30
          shadow-xl lg:shadow-none
        `}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 h-16 bg-[#0B1628] border-t border-white/[0.08] flex items-center justify-around px-2">
        {bottomNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" &&
              item.href !== "/student/dashboard" &&
              pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors
                ${isActive ? "text-blue-400 bg-blue-500/10" : "text-slate-500"}
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
