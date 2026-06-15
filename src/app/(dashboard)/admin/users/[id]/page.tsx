"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Clock, FileText, Image as ImageIcon, Loader2, MapPin, Phone, Shield, User, KeyRound, Building2, Mail } from "lucide-react";
import { toast } from "sonner";

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchUser();
  }, []);

  async function fetchUser() {
    try {
      const res = await fetch(`/api/users/${resolvedParams.id}`);
      if (!res.ok) throw new Error("Failed to fetch user");
      const { data } = await res.json();
      setUser(data);
    } catch (error) {
      toast.error("Could not load user details.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!confirm("Are you sure you want to reset this user's password? An email will be sent immediately.")) return;
    
    setIsResetting(true);
    try {
      const res = await fetch(`/api/users/${user.id}/reset-password`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Password reset successfully. Email sent.");
    } catch (error: any) {
      toast.error(error.message || "Failed to reset password");
    } finally {
      setIsResetting(false);
    }
  }

  async function handleToggleStatus() {
    const newStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (!confirm(`Are you sure you want to mark this user as ${newStatus}?`)) return;

    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/users/${user.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`User status updated to ${newStatus}`);
      fetchUser();
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">User Not Found</h2>
        <Button variant="link" onClick={() => router.push("/admin/users")} className="mt-4">Return to User List</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin/users")} className="rounded-full shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {user.studentProfile?.fullName || user.username}
              </h1>
              {user.status === "ACTIVE" ? (
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/5">Active</Badge>
              ) : (
                <Badge variant="outline" className="border-slate-500/30 text-slate-600 bg-slate-500/5">{user.status}</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-muted-foreground flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" />
                {user.email}
              </p>
              <span className="text-muted-foreground">•</span>
              <Badge variant="secondary" className="text-xs">
                {user.role.replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleToggleStatus}
            disabled={isUpdatingStatus}
          >
            {isUpdatingStatus ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {user.status === "ACTIVE" ? "Deactivate" : "Activate"}
          </Button>
          <Button 
            variant="destructive"
            onClick={handleResetPassword}
            disabled={isResetting}
          >
            {isResetting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <KeyRound className="w-4 h-4 mr-2" />
            )}
            Reset Password
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Core Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground font-medium mb-1">Role</p>
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="font-medium">{user.role}</span>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium mb-1">Profile Complete</p>
                  <span className="font-medium">{user.isProfileComplete ? "Yes" : "No"}</span>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium mb-1">Created At</p>
                  <span className="font-medium">{format(new Date(user.createdAt), "MMM d, yyyy")}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {user.hostelAssignments?.length > 0 ? (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg flex items-center gap-2 text-primary">
                  <Building2 className="w-5 h-5" />
                  Current Hostel
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => router.push(`/admin/users/${user.id}/assign`)}>
                  Transfer
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="text-xl font-bold">{user.hostelAssignments[0].hostel.name}</p>
                  <p className="text-muted-foreground">
                    Room {user.roomAssignments?.[0]?.room.roomNumber || "N/A"} • Bed {user.bedAssignments?.[0]?.bed.bedLabel || "N/A"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-muted-foreground">
                  <Building2 className="w-5 h-5" />
                  No Active Assignment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => router.push(`/admin/users/${user.id}/assign`)}>
                  Assign to Hostel
                </Button>
              </CardContent>
            </Card>
          )}

          {user.selfies?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Current Selfie</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-square w-full rounded-lg overflow-hidden border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={user.selfies[0].fileUrl} 
                    alt="User selfie" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Captured: {format(new Date(user.selfies[0].capturedAt), "MMM d, yyyy HH:mm")}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Details Tabs */}
        <div className="md:col-span-2">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">Personal Details</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="timeline">Lifecycle</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Details collected during profile setup.</CardDescription>
                </CardHeader>
                <CardContent>
                  {user.studentProfile ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><User className="w-3 h-3" /> Full Name</p>
                          <p className="font-medium">{user.studentProfile.fullName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><User className="w-3 h-3" /> Father&apos;s Name</p>
                          <p className="font-medium">{user.studentProfile.fatherName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><User className="w-3 h-3" /> Mother&apos;s Name</p>
                          <p className="font-medium">{user.studentProfile.motherName}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Gender</p>
                            <p className="font-medium capitalize">{user.studentProfile.gender?.toLowerCase()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Blood Group</p>
                            <p className="font-medium">{user.studentProfile.bloodGroup}</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><Phone className="w-3 h-3" /> Mobile</p>
                          <p className="font-medium">{user.studentProfile.mobile}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><Phone className="w-3 h-3" /> Alt Mobile</p>
                          <p className="font-medium">{user.studentProfile.parentMobile || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><Phone className="w-3 h-3" /> Emergency Contact</p>
                          <p className="font-medium">{user.studentProfile.emergencyContact}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><MapPin className="w-3 h-3" /> Address</p>
                          <p className="font-medium text-sm leading-relaxed">{user.studentProfile.permanentAddress}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>Profile has not been completed yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Uploaded Documents</CardTitle>
                  <CardDescription>KYC and verification documents.</CardDescription>
                </CardHeader>
                <CardContent>
                  {user.documents?.length > 0 ? (
                    <div className="space-y-4">
                      {user.documents.map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                              <FileText className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{doc.documentType}</p>
                              <p className="text-xs text-muted-foreground">Uploaded {format(new Date(doc.uploadedAt), "MMM d, yyyy")}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant="outline" className={
                              doc.status === "APPROVED" ? "border-emerald-500 text-emerald-600" :
                              doc.status === "REJECTED" ? "border-destructive text-destructive" :
                              "border-amber-500 text-amber-600"
                            }>
                              {doc.status}
                            </Badge>
                            <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3">
                              View
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>No documents uploaded yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Lifecycle Timeline</CardTitle>
                  <CardDescription>Recent events and changes for this user.</CardDescription>
                </CardHeader>
                <CardContent>
                  {user.lifecycleEvents?.length > 0 ? (
                    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                      {user.lifecycleEvents.map((event: any, i: number) => (
                        <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full border border-background bg-muted shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border bg-card shadow-sm">
                            <div className="flex items-center justify-between space-x-2 mb-1">
                              <div className="font-semibold text-sm capitalize">{event.eventType.replace(/_/g, " ").toLowerCase()}</div>
                              <time className="text-xs font-medium text-muted-foreground">{format(new Date(event.createdAt), "MMM d, yyyy")}</time>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {event.eventType === "TRANSFERRED_IN" ? `Transferred into ${event.toHostel?.name}` :
                               event.eventType === "TRANSFERRED_OUT" ? `Transferred out of ${event.fromHostel?.name}` :
                               "System recorded an event for this user."}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>No lifecycle events recorded yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
