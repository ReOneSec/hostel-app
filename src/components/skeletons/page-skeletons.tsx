import { Skeleton } from "@/components/ui/skeleton";

// ─── Admin Dashboard ───────────────────────────────────────────────────────────
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56 mt-2" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-20 mt-2" />
          </div>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid gap-5 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <div>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-36 mt-1" />
              </div>
            </div>
            <div className="p-5 space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Student Dashboard ─────────────────────────────────────────────────────────
export function StudentDashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div>
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-48 mt-2" />
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Main card */}
        <div className="md:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-6 w-32 rounded-md" />
          </div>
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-6">
                <div>
                  <Skeleton className="h-3 w-28 mb-3" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                </div>
                <div>
                  <Skeleton className="h-3 w-28 mb-3" />
                  <Skeleton className="h-14 w-full rounded-lg" />
                </div>
              </div>
              <div className="flex-1">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full">
                  <div className="px-4 py-3 border-b border-slate-100 flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-16 rounded" />
                  </div>
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                    <div className="pt-3 border-t border-slate-100 flex justify-between">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-7 w-24" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="md:col-span-4 space-y-4">
          <Skeleton className="h-4 w-28" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-36 mt-1.5" />
              </div>
              <Skeleton className="w-4 h-4 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Table Page (used by many admin pages) ──────────────────────────────────────
export function TablePageSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56 mt-2" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-10 w-full sm:w-64 rounded-lg" />
        <Skeleton className="h-10 w-full sm:w-40 rounded-lg" />
        <Skeleton className="h-10 w-full sm:w-40 rounded-lg" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="px-5 py-3 border-b border-slate-100 flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-5 py-4 border-b border-slate-50 flex items-center gap-4">
            {Array.from({ length: 5 }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Card Grid (hostels, rooms, beds) ───────────────────────────────────────────
export function CardGridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56 mt-2" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Search */}
      <Skeleton className="h-10 w-full sm:w-64 rounded-lg" />

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16 rounded-md" />
            </div>
            <div className="p-5 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Detail Page (hostel detail, user detail, mess session detail) ───────────────
export function DetailPageSkeleton() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
              <Skeleton className="w-7 h-7 rounded-lg" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="p-5">
              <Skeleton className="h-7 w-12" />
              <Skeleton className="h-3 w-28 mt-2" />
            </div>
          </div>
        ))}
      </div>

      {/* Content area */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <Skeleton className="h-5 w-36" />
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16 rounded-md" />
              </div>
              <div className="p-5 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Profile Page (student profile) ─────────────────────────────────────────────
export function ProfilePageSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-56 mt-2" />
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
        </div>
        <div className="p-6 space-y-6">
          {/* Section */}
          {Array.from({ length: 3 }).map((_, s) => (
            <div key={s}>
              <Skeleton className="h-4 w-28 mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Form Page (create user, upload payment, complete profile) ──────────────────
export function FormPageSkeleton() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56 mt-2" />
        </div>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}

// ─── Mess Sessions List ─────────────────────────────────────────────────────────
export function MessPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56 mt-2" />
      </div>

      {/* Session cards */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-24 mt-1.5" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-md" />
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="space-y-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Bills List (student bills) ─────────────────────────────────────────────────
export function BillsPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-56 mt-2" />
      </div>

      {/* Bill cards */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-24 mt-1.5" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-md" />
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
