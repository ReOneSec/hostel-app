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
  ChevronRight,
  LayoutDashboard,
  Receipt,
  Wallet,
  ClipboardList,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import type { Role } from "@prisma/client";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: Role[];
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  // Admin
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: Users,
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "Profile Requests",
    href: "/admin/profile-requests",
    icon: Users, // Can use UserCog or UserCheck if imported, but Users is fine
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "Hostels",
    href: "/admin/hostels",
    icon: Building2,
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "Billing",
    href: "/admin/billing",
    icon: CreditCard,
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "Payments",
    href: "/admin/payments",
    icon: CreditCard,
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "Documents",
    href: "/admin/documents",
    icon: Shield,
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "Reports",
    href: "/admin/reports",
    icon: BarChart3,
    roles: ["SUPER_ADMIN"],
  },
  {
    label: "Audit Logs",
    href: "/admin/audit-logs",
    icon: Shield,
    roles: ["SUPER_ADMIN"],
  },

  // Manager
  {
    label: "Payments",
    href: "/manager/payments",
    icon: Wallet,
    roles: ["HOSTEL_MANAGER"],
  },
  {
    label: "Mess",
    href: "/manager/mess",
    icon: UtensilsCrossed,
    roles: ["HOSTEL_MANAGER", "SUPER_ADMIN"],
  },
  {
    label: "Documents",
    href: "/manager/documents",
    icon: FileText,
    roles: ["HOSTEL_MANAGER"],
  },

  // Monthly Manager
  {
    label: "Mess Management",
    href: "/monthly-manager/mess",
    icon: UtensilsCrossed,
    roles: ["MONTHLY_MANAGER"],
  },

  // Student
  {
    label: "Dashboard",
    href: "/student/dashboard",
    icon: Home,
    roles: ["STUDENT", "MONTHLY_MANAGER", "HOSTEL_MANAGER"],
  },
  {
    label: "My Profile",
    href: "/student/profile",
    icon: User,
    roles: ["STUDENT", "MONTHLY_MANAGER", "HOSTEL_MANAGER"],
  },
  {
    label: "My Bills",
    href: "/student/bills",
    icon: Receipt,
    roles: ["STUDENT", "MONTHLY_MANAGER", "HOSTEL_MANAGER"],
  },
  {
    label: "Payments",
    href: "/student/payments",
    icon: Wallet,
    roles: ["STUDENT", "MONTHLY_MANAGER", "HOSTEL_MANAGER"],
  },
  {
    label: "My Mess",
    href: "/student/mess",
    icon: UtensilsCrossed,
    roles: ["STUDENT", "MONTHLY_MANAGER", "HOSTEL_MANAGER"],
  },
  {
    label: "Documents",
    href: "/student/documents",
    icon: ClipboardList,
    roles: ["STUDENT", "MONTHLY_MANAGER", "HOSTEL_MANAGER"],
  },
];

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

function getRoleBadgeVariant(
  role: Role
): "default" | "secondary" | "destructive" | "outline" {
  switch (role) {
    case "SUPER_ADMIN":
      return "destructive";
    case "HOSTEL_MANAGER":
      return "default";
    case "MONTHLY_MANAGER":
      return "secondary";
    default:
      return "outline";
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

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sidebar-primary/20 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-sidebar-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-sidebar-foreground tracking-tight">
              Mirror Hostels
            </h2>
            <p className="text-[11px] text-sidebar-foreground/50">
              Management System
            </p>
          </div>
        </div>
      </div>

      <Separator className="bg-sidebar-border mx-4" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {filteredNav.map((item) => {
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
                  group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-150 ease-out
                  ${
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm shadow-sidebar-primary/20"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  }
                `}
              >
                <Icon
                  className={`w-4.5 h-4.5 shrink-0 ${
                    isActive
                      ? "text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"
                  }`}
                />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] h-5 px-1.5"
                  >
                    {item.badge}
                  </Badge>
                )}
                {isActive && (
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator className="bg-sidebar-border mx-4" />

      {/* User info + Logout */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-9 h-9 border-2 border-sidebar-border">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {session.user.username}
            </p>
            <Badge
              variant={getRoleBadgeVariant(userRole)}
              className="text-[10px] h-4 px-1.5 mt-0.5"
            >
              {getRoleLabel(userRole)}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent cursor-pointer"
          onClick={() => signOut()}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border shadow-sm"
      >
        {isMobileOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <Menu className="w-5 h-5" />
        )}
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-40 h-screen w-64 
          bg-sidebar border-r border-sidebar-border
          transition-transform duration-200 ease-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
