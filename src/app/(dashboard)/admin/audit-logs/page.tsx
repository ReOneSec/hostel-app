"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Activity,
  Search,
  Eye,
  ShieldAlert,
  Loader2,
  Clock,
  User,
  Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

function ActionBadge({ action }: { action: string }) {
  let className = "bg-slate-100 text-slate-700 border-slate-200";
  if (action.includes("CREATED") || action.includes("APPROVED") || action.includes("ACTIVATED")) {
    className = "bg-green-50 text-green-700 border-green-200";
  } else if (action.includes("REJECTED") || action.includes("DEACTIVATED")) {
    className = "bg-red-50 text-red-700 border-red-200";
  } else if (action.includes("CHANGED") || action.includes("RESET") || action.includes("TRANSFERRED")) {
    className = "bg-amber-50 text-amber-700 border-amber-200";
  } else if (action.includes("GENERATED")) {
    className = "bg-blue-50 text-blue-700 border-blue-200";
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium border uppercase tracking-wider ${className}`}>
      {action}
    </span>
  );
}

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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Audit Logs</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Tamper-proof, append-only record of critical system actions.
          </p>
        </div>
      </div>

      {/* Content Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
        {/* Card Header with Filters */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Recent Activity</h3>
              <p className="text-xs text-slate-400">Showing the latest system events</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search user, entity..."
                className="pl-9 h-9 border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={actionFilter} onValueChange={(v) => setActionFilter(v || "ALL")}>
              <SelectTrigger className="w-[180px] h-9 border-slate-200 rounded-lg bg-white text-sm">
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

        {/* Table/List View */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-xs text-slate-400 mt-3">Loading logs…</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
              <Activity className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">No logs found</h3>
            <p className="text-xs text-slate-400 max-w-xs">
              No audit logs match your current filters.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <div className="grid grid-cols-[1.2fr_1.5fr_2fr_1.5fr_auto] px-5 py-3 border-b border-slate-100 bg-slate-50">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Timestamp</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Actor</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Entity</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Details</span>
              </div>
              {filteredLogs.map((log) => (
                <div key={log.id} className="grid grid-cols-[1.2fr_1.5fr_2fr_1.5fr_auto] px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition-colors items-center">
                  {/* Timestamp */}
                  <div>
                    <p className="text-sm font-medium text-slate-800">{format(new Date(log.timestamp), "MMM d, yyyy")}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{format(new Date(log.timestamp), "h:mm a")}</p>
                  </div>

                  {/* Actor */}
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-700 truncate">{log.user?.username || "System"}</span>
                  </div>

                  {/* Action */}
                  <div>
                    <ActionBadge action={log.action} />
                  </div>

                  {/* Entity */}
                  <div>
                    <p className="text-sm font-medium text-slate-800">{log.entity}</p>
                    {log.entityId && (
                      <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[120px]" title={log.entityId}>
                        ID: {log.entityId}
                      </p>
                    )}
                  </div>

                  {/* Details Button */}
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> View
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden p-4 space-y-3">
              {filteredLogs.map((log) => (
                <div key={log.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/30">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <ActionBadge action={log.action} />
                      <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {format(new Date(log.timestamp), "MMM d, yyyy • h:mm a")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-1.5 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-700">Actor: <span className="font-medium">{log.user?.username || "System"}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-700">Entity: <span className="font-medium">{log.entity}</span></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="rounded-2xl border-slate-200 shadow-2xl max-w-2xl w-full p-0 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <ShieldAlert className="w-4 h-4 text-blue-600" />
              Audit Log Details
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              A precise record of exactly what changed during this action.
            </DialogDescription>
          </div>

          {selectedLog && (
            <div className="px-6 py-5 max-h-[60vh] overflow-y-auto space-y-6">
              {/* Meta Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1">Actor</p>
                  <p className="text-sm font-medium text-slate-800 truncate" title={selectedLog.user?.email}>
                    {selectedLog.user?.username}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1">Timestamp</p>
                  <p className="text-sm font-medium text-slate-800">{format(new Date(selectedLog.timestamp), "MMM d, yyyy h:mm a")}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1">Action</p>
                  <ActionBadge action={selectedLog.action} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1">IP Address</p>
                  <p className="text-sm font-mono text-slate-600">{selectedLog.ipAddress || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1">Entity Type</p>
                  <p className="text-sm font-medium text-slate-800">{selectedLog.entity}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1">Entity ID</p>
                  <p className="text-sm font-mono text-slate-500 truncate" title={selectedLog.entityId || ""}>{selectedLog.entityId || "N/A"}</p>
                </div>
              </div>

              {/* Data Diffs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedLog.oldValues && Object.keys(selectedLog.oldValues).length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      Previous Values
                    </h3>
                    <div className="bg-red-50 text-red-800 p-3 rounded-lg border border-red-100 overflow-x-auto text-xs font-mono leading-relaxed">
                      <pre>{JSON.stringify(selectedLog.oldValues, null, 2)}</pre>
                    </div>
                  </div>
                )}

                {selectedLog.newValues && Object.keys(selectedLog.newValues).length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      New Values
                    </h3>
                    <div className="bg-green-50 text-green-800 p-3 rounded-lg border border-green-100 overflow-x-auto text-xs font-mono leading-relaxed">
                      <pre>{JSON.stringify(selectedLog.newValues, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
            <Button
              variant="outline"
              onClick={() => setSelectedLog(null)}
              className="text-slate-600 border-slate-200 rounded-lg h-9 text-sm cursor-pointer w-full sm:w-auto"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

