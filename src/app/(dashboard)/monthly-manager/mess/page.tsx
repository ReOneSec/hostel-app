"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, BookOpen } from "lucide-react";
import { toast } from "sonner";

export default function MonthlyManagerMessDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchData();
    }
  }, [session]);

  async function fetchData() {
    setIsLoading(true);
    try {
      // Find the hostel ID for this student
      const resProfile = await fetch("/api/users/me");
      const profileData = await resProfile.json();
      
      const assignments = profileData.data?.hostelAssignments || [];
      const activeAssignment = assignments.find((a: any) => a.status === "ACTIVE");
      const myHostel = activeAssignment?.hostelId;

      if (!myHostel) {
        toast.error("You are not actively assigned to any hostel");
        return;
      }

      // Fetch sessions
      const resSessions = await fetch(`/api/mess/sessions?hostelId=${myHostel}`);
      const sessionsData = await resSessions.json();
      setSessions(sessionsData.data || []);

    } catch (e) {
      toast.error("Failed to load mess data");
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mess Management</h1>
          <p className="text-muted-foreground mt-1">Manage expenses and guest meals for your assigned month.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mess Sessions</CardTitle>
          <CardDescription>Select the current month's session to log expenses.</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No mess sessions found for your hostel.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month/Year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Meal Rate</TableHead>
                  <TableHead>Docs / Guests</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {new Date(s.year, s.month - 1).toLocaleString('default', { month: 'long' })} {s.year}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.status === "CLOSED" ? "secondary" : "default"}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {s.totalMessCharge1 ? `₹${s.totalMessCharge1}` : "-"}
                    </TableCell>
                    <TableCell>
                      {s.universalMealCharge ? `₹${s.universalMealCharge}` : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>{s._count.documents} docs</span>
                        <span>{s._count.guestMeals} guests</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => router.push(`/manager/mess/${s.id}`)}>
                        Manage <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
