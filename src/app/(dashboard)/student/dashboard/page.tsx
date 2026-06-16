"use client";

import { useSession } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  const approvedDocs = documents.filter((d: any) => d.status === "VERIFIED").length;
  const totalDocs = documents.length;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome, {userData?.studentProfile?.fullName || session?.user?.username || "Student"} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Here is your complete hostel overview
        </p>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center border rounded-xl bg-muted/20">
          <p className="text-muted-foreground animate-pulse font-medium">Loading your dashboard...</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-12">
          
          {/* Main Overview Card (Spans 8 columns on desktop) */}
          <Card className="md:col-span-8 border-primary/20 shadow-md bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-bl-full -z-10" />
            
            <CardHeader className="border-b bg-muted/10 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Home className="w-5 h-5 text-primary" />
                  Your Accommodation
                </CardTitle>
                <Badge variant={userData?.isProfileComplete ? "outline" : "destructive"} className={userData?.isProfileComplete ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/5" : ""}>
                  {userData?.isProfileComplete ? "Profile Complete ✓" : "Profile Incomplete ⚠️"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-8">
                
                {/* Left Side: Room & Docs */}
                <div className="flex-1 space-y-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Current Placement</p>
                    {userData?.hostelAssignments?.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-2xl font-bold text-foreground">
                          {userData.hostelAssignments[0].hostel.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="px-3 py-1 text-sm font-medium">
                            {userData.roomAssignments?.length > 0 
                              ? `Room ${userData.roomAssignments[0].room.roomNumber}` 
                              : 'No Room'}
                          </Badge>
                          <Badge variant="secondary" className="px-3 py-1 text-sm font-medium">
                            {userData.bedAssignments?.length > 0 
                              ? `Bed ${userData.bedAssignments[0].bed.bedLabel}` 
                              : 'No Bed'}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                        <p className="font-semibold">Not assigned to a hostel yet.</p>
                        <p className="text-sm mt-1">Please contact your manager.</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Documents</p>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${approvedDocs === totalDocs && totalDocs > 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                        {approvedDocs === totalDocs && totalDocs > 0 ? <CheckCircle2 className="w-5 h-5" /> : <FileWarning className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-medium">{approvedDocs} of {totalDocs} Approved</p>
                        {totalDocs === 0 && <p className="text-xs text-muted-foreground">No documents uploaded</p>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Billing Box */}
                <div className="flex-1">
                  <div className="bg-card border rounded-xl overflow-hidden shadow-sm h-full flex flex-col">
                    <div className="bg-muted/30 p-4 border-b flex justify-between items-center">
                      <h3 className="font-semibold flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-primary" />
                        Current Bill
                      </h3>
                      {latestBill && (
                        <Badge variant={latestBill.status === "PAID" ? "outline" : "destructive"} className={latestBill.status === "PAID" ? "border-emerald-500/30 text-emerald-600" : ""}>
                          {latestBill.status}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="p-4 flex-1 flex flex-col justify-center">
                      {latestBill ? (
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Room Rent</span>
                            <span>₹{latestBill.rentAmount}</span>
                          </div>
                          {Number(latestBill.messCharge) > 0 && (
                            <div className="flex justify-between text-muted-foreground">
                              <span>Mess Charge</span>
                              <span>₹{latestBill.messCharge}</span>
                            </div>
                          )}
                          {Number(latestBill.lateFee) > 0 && (
                            <div className="flex justify-between text-destructive">
                              <span>Late Fee</span>
                              <span>₹{latestBill.lateFee}</span>
                            </div>
                          )}
                          <div className="pt-2 border-t mt-2 flex justify-between font-bold text-lg">
                            <span>Total Due</span>
                            <span>₹{Number(latestBill.totalAmount) - Number(latestBill.paidAmount)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground py-6">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
                          <p>You are all caught up!</p>
                          <p className="text-xs">No pending bills generated.</p>
                        </div>
                      )}
                    </div>
                    
                    {latestBill && latestBill.status !== "PAID" && (
                      <div className="p-4 bg-muted/10 border-t flex gap-2">
                         <Button 
                          className="flex-1 bg-primary hover:bg-primary/90" 
                          onClick={() => router.push(`/student/payments/upload?billId=${latestBill.id}`)}
                        >
                          Upload Proof
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
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
            </CardContent>
          </Card>

          {/* Quick Actions (Spans 4 columns) */}
          <div className="md:col-span-4 space-y-4">
            <h2 className="text-lg font-semibold mb-2">Quick Actions</h2>
            
            <Link href="/student/bills" className="block">
              <Card className="border-border/50 hover:border-primary/30 hover:shadow-md transition-all group h-full">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2.5 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                    <Receipt className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">Payment History</p>
                    <p className="text-xs text-muted-foreground">View all past bills & receipts</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-600 transition-colors" />
                </CardContent>
              </Card>
            </Link>

            <Link href="/student/mess" className="block">
              <Card className="border-border/50 hover:border-primary/30 hover:shadow-md transition-all group h-full">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2.5 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                    <UtensilsCrossed className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">Mess Status</p>
                    <p className="text-xs text-muted-foreground">Check daily meals & costs</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-600 transition-colors" />
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/student/profile" className="block">
              <Card className="border-border/50 hover:border-primary/30 hover:shadow-md transition-all group h-full">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                    <FileText className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">Manage Documents</p>
                    <p className="text-xs text-muted-foreground">Upload missing ID proofs</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      )}

      {/* Alerts */}
      {userData && (!userData.hostelAssignments?.length || !userData.isProfileComplete) && (
        <Card className="border-amber-500/20 bg-amber-500/5 mt-8">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                Action Required
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {!userData.isProfileComplete 
                  ? "Please complete your profile and upload your documents to be eligible for hostel assignment."
                  : "You have not been assigned to a hostel yet. The management will assign you shortly."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
