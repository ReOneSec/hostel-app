import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const user = session?.user;
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const hostelId = resolvedParams.id;

    // Fetch all students who have an active assignment to this hostel
    const students = await prisma.user.findMany({
      where: {
        hostelAssignments: {
          some: {
            hostelId,
            status: "ACTIVE"
          }
        }
      },
      select: {
        id: true,
        email: true,
        username: true,
        studentProfile: {
          select: {
            fullName: true,
            mobile: true
          }
        }
      },
      orderBy: [
        { studentProfile: { fullName: 'asc' } },
        { username: 'asc' }
      ]
    });

    // Flatten the studentProfile.fullName for easier consumption
    const formattedStudents = students.map(s => ({
      id: s.id,
      email: s.email,
      username: s.username,
      fullName: s.studentProfile?.fullName || s.username,
      phone: s.studentProfile?.mobile
    }));

    // Sort alphabetically by student name
    formattedStudents.sort((a, b) => {
      const nameA = a.fullName || a.username || a.email;
      const nameB = b.fullName || b.username || b.email;
      return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
    });

    return NextResponse.json({ data: formattedStudents });
  } catch (error: any) {
    console.error("Error fetching hostel students:", error);
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}
