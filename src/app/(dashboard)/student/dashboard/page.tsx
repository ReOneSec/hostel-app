"use client";

import { useSession } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Home,
  Receipt,
  UtensilsCrossed,
  FileText,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileWarning,
  Download,
  Loader2,
  Building,
  BedDouble
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { generateInvoicePDF } from "@/lib/pdf-generator";

export default function StudentDashboardPage() {
  const { data: session } = useSession();
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (session?.user?.id) {
      fetch(`/api/users/me`)
        .then((res) => res.json())
        .then((json) => {
          setUserData(json.data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Failed to fetch user data", err);
          setIsLoading(false);
        });
    }
  }, [session?.user?.id]);

  const latestBill = userData?.bills?.[0];
  const documents = userData?.documents || [];
  const approvedDocs = documents.filter((d: any) => d.status === "APPROVED" || d.status === "VERIFIED").length;
  const totalDocs = documents.length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Welcome, {userData?.studentProfile?.fullName || session?.user?.username || "Student"} 👋
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Here is your complete hostel overview
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-slate-200 shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
          <p className="text-sm text-slate-400 font-medium">Loading your dashboard...</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-12">
          
          {/* Main Overview Card (Spans 8 columns on desktop) */}
          <div className="md:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-32 bg-blue-50/50 rounded-bl-full -z-0 transition-transform duration-700 group-hover:scale-110" />
            
            <div className="px-6 py-5 border-b border-slate-100 bg-white/50 backdrop-blur-sm relative z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Home className="w-4 h-4 text-blue-600" />
                  Your Accommodation
                </h3>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border uppercase tracking-wider ${
                  userData?.isProfileComplete 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                  {userData?.isProfileComplete ? "Profile Complete ✓" : "Profile Incomplete ⚠️"}
                </span>
              </div>
            </div>

            <div className="p-6 relative z-10">
              <div className="flex flex-col md:flex-row gap-6">
                
                {/* Left Side: Room & Docs */}
                <div className="flex-1 space-y-6">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Current Placement</p>
                    {userData?.hostelAssignments?.length > 0 ? (
                      <div className="bg-slate-50 rounded-lg border border-slate-100 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-slate-400" />
                          <p className="text-lg font-bold text-slate-900">
                            {userData.hostelAssignments[0].hostel.name}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm">
                            <Home className="w-3.5 h-3.5 text-slate-400" />
                            {userData.roomAssignments?.length > 0 
                              ? `Room ${userData.roomAssignments[0].room.roomNumber}` 
                              : 'No Room'}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm">
                            <BedDouble className="w-3.5 h-3.5 text-slate-400" />
                            {userData.bedAssignments?.length > 0 
                              ? `Bed ${userData.bedAssignments[0].bed.bedLabel}` 
                              : 'No Bed'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg bg-amber-50/80 border border-amber-200/50 flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-amber-900">Not assigned to a hostel yet.</p>
                          <p className="text-xs text-amber-700 mt-1">Please contact your manager for assignment.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Document Status</p>
                    <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                      <div className={`p-2 rounded-lg ${approvedDocs === totalDocs && totalDocs > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {approvedDocs === totalDocs && totalDocs > 0 ? <CheckCircle2 className="w-4 h-4" /> : <FileWarning className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{approvedDocs} of {totalDocs} Approved</p>
                        {totalDocs === 0 && <p className="text-xs text-slate-500 mt-0.5">No documents uploaded yet</p>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Billing Box */}
                <div className="flex-1 flex flex-col">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col overflow-hidden">
                    <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                        <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                        Current Bill
                      </h3>
                      {latestBill && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border uppercase tracking-wider ${
                          latestBill.status === "PAID" 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}>
                          {latestBill.status}
                        </span>
                      )}
                    </div>
                    
                    <div className="p-4 flex-1 flex flex-col justify-center bg-white">
                      {latestBill ? (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Room Rent</span>
                            <span className="font-medium text-slate-900">₹{parseFloat(latestBill.rentAmount).toFixed(0)}</span>
                          </div>
                          {Number(latestBill.messCharge) > 0 && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-500">Mess Charge</span>
                              <span className="font-medium text-slate-900">₹{parseFloat(latestBill.messCharge).toFixed(0)}</span>
                            </div>
                          )}
                          {Number(latestBill.lateFee) > 0 && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-red-500 font-medium">Late Fee</span>
                              <span className="text-red-600 font-bold">₹{parseFloat(latestBill.lateFee).toFixed(0)}</span>
                            </div>
                          )}
                          <div className="pt-3 border-t border-slate-100 mt-2 flex justify-between items-center">
                            <span className="text-sm font-bold text-slate-900">Total Due</span>
                            <span className="text-xl font-black text-slate-900 tracking-tight">₹{(Number(latestBill.totalAmount) - Number(latestBill.paidAmount)).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          </div>
                          <p className="text-sm font-semibold text-slate-800">You are all caught up!</p>
                          <p className="text-xs text-slate-500 mt-1">No pending bills generated.</p>
                        </div>
                      )}
                    </div>
                    
                    {latestBill && latestBill.status !== "PAID" && (
                      <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                        <Button 
                          className="flex-1 h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer shadow-sm"
                          onClick={() => router.push(`/student/payments/upload?billId=${latestBill.id}`)}
                        >
                          Upload Proof
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="h-9 w-9 text-slate-600 border-slate-200 hover:bg-slate-100 rounded-lg cursor-pointer shrink-0"
                          onClick={() => generateInvoicePDF(latestBill, userData?.studentProfile)}
                          title="Download Invoice"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Quick Actions (Spans 4 columns) */}
          <div className="md:col-span-4 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Quick Actions</h2>
            
            <Link href="/student/bills" className="block">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4 hover:shadow-md hover:border-blue-200 transition-all group cursor-pointer h-full">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                  <Receipt className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">Payment History</p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">View all past bills & receipts</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors shrink-0" />
              </div>
            </Link>

            <Link href="/student/mess" className="block">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4 hover:shadow-md hover:border-purple-200 transition-all group cursor-pointer h-full">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0 group-hover:bg-purple-100 transition-colors">
                  <UtensilsCrossed className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">Mess Status</p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">Check daily meals & costs</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 transition-colors shrink-0" />
              </div>
            </Link>
            
            <Link href="/student/profile" className="block">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4 hover:shadow-md hover:border-emerald-200 transition-all group cursor-pointer h-full">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
                  <FileText className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">Manage Documents</p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">Upload missing ID proofs</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors shrink-0" />
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Alerts */}
      {userData && (!userData.hostelAssignments?.length || !userData.isProfileComplete) && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 flex items-start gap-3 mt-8">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-900">
              Action Required
            </p>
            <p className="text-xs text-amber-700 mt-1 max-w-2xl">
              {!userData.isProfileComplete 
                ? "Please complete your profile and upload your documents to be eligible for hostel assignment."
                : "You have not been assigned to a hostel yet. The management will assign you shortly."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

