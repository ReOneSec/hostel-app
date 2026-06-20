"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { Loader2, MoreHorizontal, Plus, Search, Shield, UserCog, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type UserData = {
  id: string;
  email: string;
  username: string;
  role: string;
  status: string;
  createdAt: string;
  profile: {
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

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const response = await res.json();
      const usersData = response.data?.data || response.data || [];
      setUsers(usersData);
    } catch (error) {
      toast.error("Could not load users.");
    } finally {
      setIsLoading(false);
    }
  }

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
    u.profile?.fullName?.toLowerCase().includes(search.toLowerCase())
  );

  function getRoleBadge(role: string) {
    switch (role) {
      case "SUPER_ADMIN":
        return <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"><Shield className="w-3 h-3 mr-1" /> Super Admin</Badge>;
      case "HOSTEL_MANAGER":
        return <Badge variant="default" className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"><UserCog className="w-3 h-3 mr-1" /> Manager</Badge>;
      case "MONTHLY_MANAGER":
        return <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 hover:bg-purple-500/20">Monthly Manager</Badge>;
      default:
        return <Badge variant="outline" className="bg-slate-500/10 text-slate-600 hover:bg-slate-500/20"><User className="w-3 h-3 mr-1" /> Student</Badge>;
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/5">Active</Badge>;
      case "INACTIVE":
        return <Badge variant="outline" className="border-slate-500/30 text-slate-600 bg-slate-500/5">Inactive</Badge>;
      case "SUSPENDED":
        return <Badge variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-500/5">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-1">
            Manage all system users, managers, and students.
          </p>
        </div>
        <Button onClick={() => router.push("/admin/users/create")} className="cursor-pointer shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" />
          Add New User
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background/50"
          />
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>User Details</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Current Assignment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex items-center justify-center text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Loading users...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/30 transition-colors group">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.profile?.fullName || user.username}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>
                    {user.hostelAssignments?.length > 0 ? (
                      <div className="text-sm">
                        <span className="font-medium">{user.hostelAssignments[0].hostel.name}</span>
                        {(user.roomAssignments?.length > 0 || user.bedAssignments?.length > 0) && (
                          <span className="text-xs text-muted-foreground block">
                            {user.roomAssignments?.length > 0 ? `Room ${user.roomAssignments[0].room.roomNumber}` : 'No Room'} 
                            {' • '} 
                            {user.bedAssignments?.length > 0 ? `Bed ${user.bedAssignments[0].bed.bedLabel}` : 'No Bed'}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(user.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={
                        <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      } />
                      <DropdownMenuContent align="end" className="w-[160px]">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer" onClick={() => router.push(`/admin/users/${user.id}`)}>
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="cursor-pointer"
                          onClick={() => {
                            navigator.clipboard.writeText(user.email);
                            toast.success("Email copied to clipboard");
                          }}
                        >
                          Copy Email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="cursor-pointer text-destructive focus:text-destructive"
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={isDeleting === user.id}
                        >
                          {isDeleting === user.id ? "Deleting..." : "Delete User"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
