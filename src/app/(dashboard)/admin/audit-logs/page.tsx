"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { 
  Activity, 
  Search, 
  Eye, 
  ShieldAlert, 
  Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface AuditLog {
  id: string;
  userId: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
  action: string;
  entity: string;
  entityId: string | null;
  oldValues: any;
  newValues: any;
  ipAddress: string | null;
  timestamp: string;
}

const COMMON_ACTIONS = [
  "ALL",
  "USER_CREATED",
  "USER_ACTIVATED",
  "USER_DEACTIVATED",
  "USER_TRANSFERRED",
  "HOSTEL_ASSIGNED",
  "RENT_CHANGED",
  "DOCUMENT_APPROVED",
  "DOCUMENT_REJECTED",
  "PAYMENT_APPROVED",
  "PAYMENT_REJECTED",
  "MESS_SESSION_CREATED",
  "MESS_SESSION_CLOSED",
  "BILL_GENERATED",
  "ACCOUNT_PASSWORD_RESET"
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/audit-logs");
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      const data = await res.json();
      setLogs(data.data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredLogs = logs.filter(log => {
    if (actionFilter !== "ALL" && log.action !== actionFilter) return false;
    
    if (search) {
      const s = search.toLowerCase();
      return (
        log.user?.username.toLowerCase().includes(s) ||
        log.entity.toLowerCase().includes(s) ||
        (log.entityId && log.entityId.toLowerCase().includes(s)) ||
        log.action.toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Audit Logs</h1>
          <p className="text-muted-foreground mt-1">
            Tamper-proof, append-only record of critical system actions.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Showing the latest 200 system events.</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search user, entity..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={actionFilter} onValueChange={(v) => setActionFilter(v || "ALL")}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter Action" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_ACTIONS.map(action => (
                    <SelectItem key={action} value={action}>
                      {action === "ALL" ? "All Actions" : action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No audit logs found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {format(new Date(log.timestamp), "MMM d, yyyy")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(log.timestamp), "h:mm a")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{log.user?.username || "System"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{log.entity}</span>
                          {log.entityId && (
                            <span className="text-xs text-muted-foreground font-mono">
                              ID: {log.entityId.substring(0, 8)}...
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary" />
              Audit Log Details
            </DialogTitle>
            <DialogDescription>
              A precise record of exactly what changed during this action.
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Actor</p>
                  <p className="font-medium">{selectedLog.user?.username} ({selectedLog.user?.email})</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Timestamp</p>
                  <p className="font-medium">{format(new Date(selectedLog.timestamp), "PPpp")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Action</p>
                  <Badge>{selectedLog.action}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">IP Address</p>
                  <p className="font-mono">{selectedLog.ipAddress || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Entity Type</p>
                  <p className="font-medium">{selectedLog.entity}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Entity ID</p>
                  <p className="font-mono">{selectedLog.entityId || "N/A"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedLog.oldValues && Object.keys(selectedLog.oldValues).length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">Previous Values</h3>
                    <div className="bg-destructive/10 text-destructive-foreground p-3 rounded-md overflow-x-auto text-xs font-mono">
                      <pre>{JSON.stringify(selectedLog.oldValues, null, 2)}</pre>
                    </div>
                  </div>
                )}
                
                {selectedLog.newValues && Object.keys(selectedLog.newValues).length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">New Values</h3>
                    <div className="bg-emerald-500/10 text-emerald-600 p-3 rounded-md overflow-x-auto text-xs font-mono">
                      <pre>{JSON.stringify(selectedLog.newValues, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
