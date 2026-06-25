"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuGroup
} from "@/components/ui/dropdown-menu";
import { Loader2, MoreHorizontal, Plus, Search, Shield, UserCog, User, Building2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export type UserData = {
  id: string;
  email: string;
  username: string;
  role: string;
  status: string;
  createdAt: Date | string;
  studentProfile: {
    fullName: string;
  } | null;
  hostelAssignments: Array<{
    hostel: { name: string };
  }>;
  roomAssignments: Array<{
    room: { roomNumber: string };
  }>;
  bedAssignments: Array<{
    bed: { bedLabel: string };
  }>;
};

// Role Badge component
function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { label: string; className: string; Icon: React.ElementType }> = {
    SUPER_ADMIN: {
      label: "Super Admin",
      className: "bg-rose-50 text-rose-700 border-rose-200",
      Icon: Shield,
    },
    HOSTEL_MANAGER: {
      label: "Manager",
      className: "bg-green-50 text-green-800 border-green-200",
      Icon: Building2,
    },
    MONTHLY_MANAGER: {
      label: "Monthly Mgr",
      className: "bg-amber-50 text-amber-800 border-amber-200",
      Icon: Calendar,
    },
    STUDENT: {
      label: "Student",
      className: "bg-blue-50 text-blue-700 border-blue-200",
      Icon: User,
    },
  };

  const c = config[role] || config.STUDENT;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.className}`}>
      <c.Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

// Status Badge with dot
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; dot: string; className: string }> = {
    ACTIVE: {
      label: "Active",
      dot: "bg-green-500",
      className: "bg-green-50 text-green-800 border-green-200",
    },
    INACTIVE: {
      label: "Inactive",
      dot: "bg-slate-400",
      className: "bg-slate-50 text-slate-500 border-slate-200",
    },
    SUSPENDED: {
      label: "Suspended",
      dot: "bg-rose-400",
      className: "bg-rose-50 text-rose-700 border-rose-200",
    },
  };

  const c = config[status] || { label: status, dot: "bg-slate-400", className: "bg-slate-50 text-slate-500 border-slate-200" };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

export function UsersClient({ initialUsers }: { initialUsers: UserData[] }) {
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  async function handleDeleteUser(userId: string) {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone and will delete all related records.")) return;
    
    setIsDeleting(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to delete user");
      
      toast.success("User deleted successfully");
      setUsers(users.filter(u => u.id !== userId));
    } catch (error: any) {
      toast.error(error.message || "Could not delete user.");
    } finally {
      setIsDeleting(null);
    }
  }

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.studentProfile?.fullName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Users</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage all system users, managers, and students.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => router.push("/admin/users/create")}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium px-4 h-9 gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add New User
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-4 bg-white border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-150"
          />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[2fr_1fr_1.5fr_1fr_1fr_80px] px-4 py-3 border-b border-slate-100 bg-slate-50">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">User Details</span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assignment</span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</span>
          <span></span>
        </div>

        {/* Table Rows */}
        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
              <User className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">No users found</h3>
            <p className="text-xs text-slate-400 max-w-xs mb-5">
              No users match your current search. Try adjusting your query or create a new user.
            </p>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              onClick={() => router.push("/admin/users/create")}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add New User
            </Button>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const displayName = user.studentProfile?.fullName || user.username;
            return (
              <div
                key={user.id}
                className="grid grid-cols-[2fr_1fr_1.5fr_1fr_1fr_80px] px-4 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors duration-100 items-center group"
              >
                {/* User Details */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {getInitials(displayName)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 leading-tight truncate">{displayName}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{user.email}</p>
                  </div>
                </div>

                {/* Role */}
                <div>
                  <RoleBadge role={user.role} />
                </div>

                {/* Assignment */}
                <div>
                  {user.hostelAssignments?.length > 0 ? (
                    <div>
                      <p className="text-sm font-medium text-slate-700">{user.hostelAssignments[0].hostel.name}</p>
                      <p className="text-xs text-slate-400">
                        {user.roomAssignments?.length > 0 ? `Room ${user.roomAssignments[0].room.roomNumber}` : "No Room"}
                        {" • "}
                        {user.bedAssignments?.length > 0 ? `Bed ${user.bedAssignments[0].bed.bedLabel}` : "No Bed"}
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Unassigned</span>
                  )}
                </div>

                {/* Status */}
                <div>
                  <StatusBadge status={user.status} />
                </div>

                {/* Joined */}
                <p className="text-sm text-slate-500">
                  {format(new Date(user.createdAt), "MMM d, yyyy")}
                </p>

                {/* Actions */}
                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer">
                      <MoreHorizontal className="w-4 h-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-lg border border-slate-200">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel className="text-xs text-slate-400">Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer text-sm" onClick={() => router.push(`/admin/users/${user.id}`)}>
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer text-sm"
                          onClick={() => {
                            navigator.clipboard.writeText(user.email);
                            toast.success("Email copied to clipboard");
                          }}
                        >
                          Copy Email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="cursor-pointer text-sm text-red-600 focus:text-red-600"
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={isDeleting === user.id}
                        >
                          {isDeleting === user.id ? "Deleting..." : "Delete User"}
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                <User className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 mb-1">No users found</h3>
              <p className="text-xs text-slate-400 max-w-xs mb-5">
                No users match your search. Try adjusting your query.
              </p>
            </div>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const displayName = user.studentProfile?.fullName || user.username;
            return (
              <div key={user.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                {/* Card Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {getInitials(displayName)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{displayName}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
                      <MoreHorizontal className="w-4 h-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-lg border border-slate-200">
                      <DropdownMenuItem className="cursor-pointer text-sm" onClick={() => router.push(`/admin/users/${user.id}`)}>
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer text-sm"
                        onClick={() => {
                          navigator.clipboard.writeText(user.email);
                          toast.success("Email copied to clipboard");
                        }}
                      >
                        Copy Email
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="cursor-pointer text-sm text-red-600 focus:text-red-600"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={isDeleting === user.id}
                      >
                        {isDeleting === user.id ? "Deleting..." : "Delete User"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Card Body — key-value rows */}
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Role</span>
                    <RoleBadge role={user.role} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Assignment</span>
                    <span className="text-xs font-medium text-slate-700">
                      {user.hostelAssignments?.length > 0
                        ? `${user.hostelAssignments[0].hostel.name} • ${user.roomAssignments?.[0]?.room.roomNumber || "N/A"}`
                        : "Unassigned"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Status</span>
                    <StatusBadge status={user.status} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Joined</span>
                    <span className="text-xs text-slate-500">{format(new Date(user.createdAt), "MMM d, yyyy")}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
