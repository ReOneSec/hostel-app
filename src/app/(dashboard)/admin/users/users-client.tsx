"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Loader2, 
  MoreHorizontal, 
  Plus, 
  Search, 
  Shield, 
  Building2, 
  Calendar, 
  User, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  X,
  Users,
  Mail,
  Pencil,
  ArrowUpDown,
  ArrowDownAZ
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
    fullName: string | null;
    mobile?: string | null;
  } | null;
  hostelAssignments: Array<{
    hostel: { name: string };
  }>;
  managedHostels?: Array<{
    hostel: { name: string };
  }>;
  roomAssignments: Array<{
    room: { roomNumber: string };
  }>;
  bedAssignments: Array<{
    bed: { bedLabel: string };
  }>;
};

export type UsersMeta = {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
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
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .substring(0, 2) || "U";
}

function getPageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
}

interface UsersClientProps {
  initialUsers: UserData[];
  initialMeta?: UsersMeta;
}

export function UsersClient({ initialUsers, initialMeta }: UsersClientProps) {
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>(initialUsers);
  const [meta, setMeta] = useState<UsersMeta>(
    initialMeta || {
      total: initialUsers.length,
      page: 1,
      perPage: 50,
      totalPages: Math.max(1, Math.ceil(initialUsers.length / 50)),
    }
  );

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [perPage, setPerPage] = useState<number>(initialMeta?.perPage || 50);
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [emailEditUser, setEmailEditUser] = useState<UserData | null>(null);
  const [newEmailInput, setNewEmailInput] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "createdAt">("name");

  const isFirstRender = useRef(true);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch users from API when filters, search, page or perPage change
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("perPage", String(perPage));
      params.set("sortBy", sortBy);

      const res = await fetch(`/api/users?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to fetch users");
      }

      setUsers(json.data.data);
      setMeta(json.data.meta);
    } catch (error: any) {
      toast.error(error.message || "Could not fetch users");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, roleFilter, statusFilter, page, perPage]);

  // Trigger fetch on changes, skipping first render because data was preloaded
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fetchUsers();
  }, [fetchUsers]);

  // Reset to page 1 whenever search, role or status changes
  const handleRoleChange = (newRole: string | null) => {
    const nextRole = newRole || "ALL";
    setRoleFilter(nextRole);
    if (nextRole === "STUDENT") {
      setSortBy("name");
    }
    setPage(1);
  };

  const handleStatusChange = (newStatus: string | null) => {
    setStatusFilter(newStatus || "ALL");
    setPage(1);
  };

  const handlePerPageChange = (newPerPage: string | null) => {
    setPerPage(Number(newPerPage) || 50);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setRoleFilter("ALL");
    setStatusFilter("ALL");
    setPage(1);
  };

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
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Could not delete user.");
    } finally {
      setIsDeleting(null);
    }
  }

  async function handleUpdateUserEmail(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!emailEditUser) return;
    const trimmed = newEmailInput.trim().toLowerCase();
    if (!trimmed) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (trimmed === emailEditUser.email.toLowerCase()) {
      toast.error("New email is identical to current email");
      return;
    }

    setIsUpdatingEmail(true);
    try {
      const res = await fetch(`/api/users/${emailEditUser.id}/email`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update email");

      toast.success("Email address updated successfully");
      setEmailEditUser(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to update email");
    } finally {
      setIsUpdatingEmail(false);
    }
  }

  const hasActiveFilters = search.trim() !== "" || roleFilter !== "ALL" || statusFilter !== "ALL";
  const startItem = meta.total === 0 ? 0 : (meta.page - 1) * meta.perPage + 1;
  const endItem = Math.min(meta.page * meta.perPage, meta.total);

  // When sorting by name or displaying students, sort alphabetically
  const displayUsers = (sortBy === "name" || roleFilter === "STUDENT")
    ? [...users].sort((a, b) => {
        const nameA = a.studentProfile?.fullName?.trim() || a.username;
        const nameB = b.studentProfile?.fullName?.trim() || b.username;
        return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
      })
    : users;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Users</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {meta.total} {meta.total === 1 ? "User" : "Total Users"}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage all system users, administrators, managers, and students.
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

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row flex-1 items-stretch sm:items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name, email, or username..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 pl-9 pr-8 bg-slate-50/60 border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-150"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Role Filter */}
          <div className="w-full sm:w-[160px] shrink-0">
            <Select value={roleFilter} onValueChange={handleRoleChange}>
              <SelectTrigger className="w-full h-9 border-slate-200 rounded-lg bg-slate-50/60 text-sm">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Roles</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                <SelectItem value="HOSTEL_MANAGER">Hostel Manager</SelectItem>
                <SelectItem value="MONTHLY_MANAGER">Monthly Manager</SelectItem>
                <SelectItem value="STUDENT">Student</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-[150px] shrink-0">
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full h-9 border-slate-200 rounded-lg bg-slate-50/60 text-sm">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-9 px-2.5 text-xs text-slate-500 hover:text-slate-900 gap-1.5 shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </Button>
          )}
        </div>

        {/* Per-Page Selector */}
        <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
          <span className="text-xs text-slate-500 whitespace-nowrap">Show:</span>
          <Select value={String(perPage)} onValueChange={handlePerPageChange}>
            <SelectTrigger className="w-[110px] h-9 border-slate-200 rounded-lg bg-slate-50/60 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20 / page</SelectItem>
              <SelectItem value="50">50 / page</SelectItem>
              <SelectItem value="100">100 / page</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden relative">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-md border border-slate-200">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              <span className="text-xs font-medium text-slate-700">Loading users...</span>
            </div>
          </div>
        )}

        {/* Table Header */}
        <div className="grid grid-cols-[2fr_1fr_1.5fr_1fr_1fr_80px] px-4 py-3 border-b border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={() => setSortBy((prev) => (prev === "name" ? "createdAt" : "name"))}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 uppercase tracking-wider cursor-pointer text-left transition-colors"
            title="Click to toggle alphabetical / newest sorting"
          >
            User Details
            {sortBy === "name" ? (
              <ArrowDownAZ className="w-3.5 h-3.5 text-blue-600" />
            ) : (
              <ArrowUpDown className="w-3 h-3 text-slate-400" />
            )}
          </button>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assignment</span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</span>
          <span></span>
        </div>

        {/* Table Rows */}
        {displayUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">No users found</h3>
            <p className="text-xs text-slate-400 max-w-xs mb-5">
              {hasActiveFilters
                ? "No users match your current search or filters. Try adjusting your query or resetting filters."
                : "There are currently no users in the system."}
            </p>
            {hasActiveFilters ? (
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg text-xs"
                onClick={handleClearFilters}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Reset Filters
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                onClick={() => router.push("/admin/users/create")}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add New User
              </Button>
            )}
          </div>
        ) : (
          displayUsers.map((user) => {
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
                  ) : user.managedHostels && user.managedHostels.length > 0 ? (
                    <div>
                      <p className="text-sm font-medium text-slate-700">{user.managedHostels[0].hostel.name}</p>
                      <p className="text-xs text-slate-400">Hostel Manager</p>
                    </div>
                  ) : user.role === "SUPER_ADMIN" ? (
                    <div>
                      <p className="text-sm font-medium text-slate-700">All Hostels</p>
                      <p className="text-xs text-slate-400">System Admin</p>
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
                        <DropdownMenuItem
                          className="cursor-pointer text-sm"
                          onClick={() => {
                            setEmailEditUser(user);
                            setNewEmailInput(user.email);
                          }}
                        >
                          Change Email
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

        {/* Pagination Footer */}
        {meta.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-slate-100 bg-slate-50/60">
            <div className="text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-800">{startItem}</span> to{" "}
              <span className="font-semibold text-slate-800">{endItem}</span> of{" "}
              <span className="font-semibold text-slate-800">{meta.total}</span> users
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs bg-white text-slate-700 border-slate-200 cursor-pointer hover:bg-slate-50"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {getPageNumbers(page, meta.totalPages).map((p, idx) =>
                  typeof p === "number" ? (
                    <Button
                      key={p}
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      className={`h-8 w-8 p-0 text-xs cursor-pointer ${
                        p === page
                          ? "bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                      disabled={isLoading}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  ) : (
                    <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 text-xs">
                      ...
                    </span>
                  )
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs bg-white text-slate-700 border-slate-200 cursor-pointer hover:bg-slate-50"
                disabled={page >= meta.totalPages || isLoading}
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {displayUsers.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 mb-1">No users found</h3>
              <p className="text-xs text-slate-400 max-w-xs mb-5">
                {hasActiveFilters
                  ? "No users match your search. Try resetting filters."
                  : "No users exist in the system."}
              </p>
              {hasActiveFilters && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg text-xs"
                  onClick={handleClearFilters}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Reset Filters
                </Button>
              )}
            </div>
          </div>
        ) : (
          displayUsers.map((user) => {
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
                      <DropdownMenuItem
                        className="cursor-pointer text-sm"
                        onClick={() => {
                          setEmailEditUser(user);
                          setNewEmailInput(user.email);
                        }}
                      >
                        Change Email
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

                {/* Card Body */}
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Role</span>
                    <RoleBadge role={user.role} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Assignment</span>
                    <span className="text-xs font-medium text-slate-700">
                      {user.hostelAssignments?.length > 0
                        ? `${user.hostelAssignments[0].hostel.name} • ${user.roomAssignments?.[0]?.room.roomNumber || "No Room"}`
                        : user.managedHostels && user.managedHostels.length > 0
                        ? `${user.managedHostels[0].hostel.name} (Manager)`
                        : user.role === "SUPER_ADMIN"
                        ? "All Hostels (Admin)"
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

        {/* Mobile Pagination */}
        {meta.total > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 space-y-3">
            <div className="text-center text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-800">{startItem}</span> to{" "}
              <span className="font-semibold text-slate-800">{endItem}</span> of{" "}
              <span className="font-semibold text-slate-800">{meta.total}</span> users
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs bg-white text-slate-700 border-slate-200"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Previous
              </Button>
              <span className="text-xs font-medium text-slate-600 px-2">
                Page {page} of {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs bg-white text-slate-700 border-slate-200"
                disabled={page >= meta.totalPages || isLoading}
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Change Email Dialog */}
      <Dialog open={!!emailEditUser} onOpenChange={(open) => !open && setEmailEditUser(null)}>
        <DialogContent className="rounded-2xl border-slate-200 shadow-2xl max-w-md w-full p-0 overflow-hidden">
          {emailEditUser && (
            <form onSubmit={handleUpdateUserEmail}>
              <div className="px-6 py-5 border-b border-slate-100">
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  Change Email Address
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-1">
                  Update the login and notification email for {emailEditUser.studentProfile?.fullName || emailEditUser.username}.
                </DialogDescription>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-500 mb-1.5 block">Current Email</Label>
                  <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-600">
                    {emailEditUser.email}
                  </div>
                </div>
                <div>
                  <Label htmlFor="newEmailUserClient" className="text-xs font-semibold text-slate-700 mb-1.5 block">
                    New Email Address
                  </Label>
                  <Input
                    id="newEmailUserClient"
                    type="email"
                    placeholder="e.g. anowar@mirror.std"
                    value={newEmailInput}
                    onChange={(e) => setNewEmailInput(e.target.value)}
                    className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    autoFocus
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    This updates both authentication credentials and profile records immediately.
                  </p>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEmailEditUser(null)}
                  disabled={isUpdatingEmail}
                  className="text-slate-600 rounded-lg h-9 text-sm cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isUpdatingEmail ||
                    !newEmailInput.trim() ||
                    newEmailInput.trim().toLowerCase() === emailEditUser.email.toLowerCase()
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-sm cursor-pointer"
                >
                  {isUpdatingEmail && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                  Save Email
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
