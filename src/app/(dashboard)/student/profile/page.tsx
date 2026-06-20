"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, AlertCircle, FileText, Camera, CheckCircle, XCircle, Clock, Download } from "lucide-react";
import { format } from "date-fns";
import { generateAdmissionFormPDF } from "@/lib/pdf-generator";

export default function StudentProfilePage() {
  const { data: session } = useSession();
  const [userData, setUserData] = useState<any>(null);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      fetchData();
    }
  }, [session?.user?.id]);

  async function fetchData() {
    try {
      const [userRes, requestRes] = await Promise.all([
        fetch(`/api/users/me`),
        fetch(`/api/profile/edit-request`)
      ]);
      
      const userJson = await userRes.json();
      const requestJson = await requestRes.json();

      setUserData(userJson.data);
      if (userJson.data?.studentProfile) {
        setFormData(userJson.data.studentProfile);
      }
      setPendingRequest(requestJson.data);
    } catch (err) {
      console.error("Failed to fetch data", err);
      toast.error("Failed to load profile data");
    } finally {
      setIsLoading(false);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/profile/edit-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit request");
      
      toast.success("Profile edit request submitted for approval");
      setPendingRequest(json.data);
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      await generateAdmissionFormPDF(userData);
    } catch (error) {
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const profile = userData?.studentProfile;

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground mt-1">View and request changes to your personal details.</p>
      </div>

      {pendingRequest && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-medium text-amber-800 dark:text-amber-500">Pending Approval</h3>
            <p className="text-sm text-amber-700/80 dark:text-amber-400/80 mt-1">
              You submitted a profile edit request on {new Date(pendingRequest.createdAt).toLocaleDateString()}. 
              An admin must approve your changes before they are applied.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Personal Details</CardTitle>
            <CardDescription>Your verified student information.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && !pendingRequest && (
              <Button onClick={() => setIsEditing(true)} variant="outline">Request Edit</Button>
            )}
            {userData?.isProfileComplete && (
              <Button onClick={handleDownloadPDF} disabled={isGeneratingPDF} variant="secondary">
                {isGeneratingPDF ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                <span className="hidden sm:inline">Admission Form</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input name="fullName" value={formData.fullName || ""} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input name="dateOfBirth" type="date" value={formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString().split('T')[0] : ""} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label>Mobile</Label>
                  <Input name="mobile" value={formData.mobile || ""} onChange={handleChange} required />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Personal Email</Label>
                  <Input name="personalEmail" type="email" value={formData.personalEmail || ""} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label>Father's Name</Label>
                  <Input name="fatherName" value={formData.fatherName || ""} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>Mother's Name</Label>
                  <Input name="motherName" value={formData.motherName || ""} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>Parent/Alt Mobile</Label>
                  <Input name="parentMobile" value={formData.parentMobile || ""} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label>Emergency Contact</Label>
                  <Input name="emergencyContact" value={formData.emergencyContact || ""} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label>Blood Group</Label>
                  <Input name="bloodGroup" value={formData.bloodGroup || ""} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>Permanent Address</Label>
                  <Input name="permanentAddress" value={formData.permanentAddress || ""} onChange={handleChange} required />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Chronic Illnesses (Optional)</Label>
                  <Input name="chronicIllnesses" value={formData.chronicIllnesses || ""} onChange={handleChange} placeholder="None" />
                </div>
                <div className="space-y-2">
                  <Label>Allergies (Optional)</Label>
                  <Input name="allergies" value={formData.allergies || ""} onChange={handleChange} placeholder="None" />
                </div>
                <div className="space-y-2">
                  <Label>Regular Medications (Optional)</Label>
                  <Input name="regularMedications" value={formData.regularMedications || ""} onChange={handleChange} placeholder="None" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => { setIsEditing(false); setFormData(profile); }}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Submit Request
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <Label className="text-muted-foreground">Full Name</Label>
                <p className="font-medium mt-1">{profile?.fullName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Date of Birth</Label>
                <p className="font-medium mt-1">{profile?.dateOfBirth ? format(new Date(profile.dateOfBirth), "MMM d, yyyy") : "N/A"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Mobile</Label>
                <p className="font-medium mt-1">{profile?.mobile}</p>
              </div>
              <div className="md:col-span-2">
                <Label className="text-muted-foreground">Personal Email</Label>
                <p className="font-medium mt-1">{profile?.personalEmail || "N/A"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Father's Name</Label>
                <p className="font-medium mt-1">{profile?.fatherName || "N/A"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Mother's Name</Label>
                <p className="font-medium mt-1">{profile?.motherName || "N/A"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Parent/Alt Mobile</Label>
                <p className="font-medium mt-1">{profile?.parentMobile || "N/A"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Emergency Contact</Label>
                <p className="font-medium mt-1">{profile?.emergencyContact || "N/A"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Blood Group</Label>
                <p className="font-medium mt-1">{profile?.bloodGroup || "N/A"}</p>
              </div>
              <div className="md:col-span-2">
                <Label className="text-muted-foreground">Permanent Address</Label>
                <p className="font-medium mt-1">{profile?.permanentAddress || "N/A"}</p>
              </div>
              <div className="md:col-span-2">
                <Label className="text-muted-foreground">Chronic Illnesses</Label>
                <p className="font-medium mt-1">{profile?.chronicIllnesses || "None"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Allergies</Label>
                <p className="font-medium mt-1">{profile?.allergies || "None"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Regular Medications</Label>
                <p className="font-medium mt-1">{profile?.regularMedications || "None"}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-muted-foreground" />
              Current Selfie
            </CardTitle>
            <CardDescription>Your verified profile photo</CardDescription>
          </CardHeader>
          <CardContent>
            {userData?.selfies?.length > 0 ? (
              <div className="aspect-square relative rounded-xl overflow-hidden border">
                <img 
                  src={userData.selfies[0].fileUrl} 
                  alt="Profile Selfie" 
                  className="object-cover w-full h-full"
                />
              </div>
            ) : (
              <div className="aspect-square flex items-center justify-center bg-muted rounded-xl border border-dashed">
                <p className="text-muted-foreground text-sm">No selfie uploaded</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-muted-foreground" />
              Uploaded Documents
            </CardTitle>
            <CardDescription>Your identification documents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {userData?.documents?.length > 0 ? (
              userData.documents.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 bg-primary/10 rounded-md shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.documentType.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground truncate">{doc.fileName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-2 shrink-0">
                    {doc.status === "VERIFIED" && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                    {doc.status === "PENDING" && <Clock className="w-4 h-4 text-amber-500" />}
                    {doc.status === "REJECTED" && <XCircle className="w-4 h-4 text-destructive" />}
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-muted rounded-md transition-colors">
                      <Download className="w-4 h-4 text-muted-foreground" />
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center border rounded-lg border-dashed text-muted-foreground">
                <p className="text-sm">No documents uploaded yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
