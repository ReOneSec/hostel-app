import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    // Find all active hostel assignments
    const activeAssignments = await prisma.hostelAssignment.findMany({
      where: { status: "ACTIVE" },
      include: {
        user: {
          include: {
            rentConfigs: { where: { effectiveTo: null } },
            bedAssignments: { where: { status: "ACTIVE" }, include: { bed: true } },
            roomAssignments: { where: { status: "ACTIVE" } }
          }
        },
        hostel: {
          include: {
            establishmentFees: { where: { effectiveTo: null } },
            bedFees: { where: { effectiveTo: null } }
          }
        }
      }
    });

    let generatedCount = 0;

    for (const assignment of activeAssignments) {
      const student = assignment.user;
      const hostel = assignment.hostel;

      // Check if bill already exists
      const existingBill = await prisma.bill.findUnique({
        where: {
          userId_hostelId_month_year: {
            userId: student.id,
            hostelId: hostel.id,
            month,
            year
          }
        }
      });

      if (existingBill) continue; // Skip if already generated

      // Calculate Base Rent
      const currentRentConfig = student.rentConfigs.find(rc => rc.hostelId === hostel.id);
      const rentAmount = currentRentConfig ? currentRentConfig.amount.toNumber() : 0;

      // Calculate Establishment Fee
      const estFeeConfig = hostel.establishmentFees[0];
      const estFeeAmount = estFeeConfig ? estFeeConfig.amount.toNumber() : 0;

      // Calculate Bed Fee
      let bedFeeAmount = 0;
      const activeBed = student.bedAssignments[0]?.bed;
      const activeRoom = student.roomAssignments[0]?.roomId;

      if (hostel.bedFees.length > 0) {
        // Find most specific bed fee: bedId > roomId > hostelId
        const bedSpecificFee = activeBed ? hostel.bedFees.find(f => f.bedId === activeBed.id) : null;
        const roomSpecificFee = activeRoom ? hostel.bedFees.find(f => f.roomId === activeRoom) : null;
        const hostelSpecificFee = hostel.bedFees.find(f => !f.bedId && !f.roomId);

        const applicableBedFee = bedSpecificFee || roomSpecificFee || hostelSpecificFee;
        if (applicableBedFee) {
          bedFeeAmount = applicableBedFee.amount.toNumber();
        }
      }

      const totalAmount = rentAmount + estFeeAmount + bedFeeAmount;
      
      // Due Date: 7th of the current month
      const dueDate = new Date(year, month - 1, 7);

      await prisma.bill.create({
        data: {
          userId: student.id,
          hostelId: hostel.id,
          month,
          year,
          rentAmount,
          establishmentFee: estFeeAmount,
          bedFee: bedFeeAmount,
          messCharge: 0,
          lateFee: 0,
          totalAmount,
          dueDate,
          status: "GENERATED",
          generatedBy: user.id
        }
      });

      generatedCount++;
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "GENERATE_MONTHLY_BILLS",
        entity: "Bill",
        newValues: { month, year, generatedCount }
      }
    });

    return NextResponse.json({ 
      data: { 
        message: `Generated ${generatedCount} bills for ${month}/${year}` 
      } 
    });
  } catch (error: any) {
    console.error("Error generating bills:", error);
    return NextResponse.json(
      { error: "Failed to generate bills" },
      { status: 500 }
    );
  }
}
