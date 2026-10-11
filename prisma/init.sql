-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'HOSTEL_MANAGER', 'MONTHLY_MANAGER', 'STUDENT');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('AADHAAR', 'VOTER_CARD', 'PASSPORT', 'DRIVING_LICENCE');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MessSessionStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'CLOSED');

-- CreateEnum
CREATE TYPE "LifecycleEventType" AS ENUM ('JOINED', 'LEFT', 'REJOINED', 'TRANSFERRED_OUT', 'TRANSFERRED_IN');

-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('RECURRING', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('GENERATED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "isProfileComplete" BOOLEAN NOT NULL DEFAULT false,
    "isFirstLogin" BOOLEAN NOT NULL DEFAULT true,
    "needsSelfieUpdate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT,
    "fatherName" TEXT,
    "motherName" TEXT,
    "mobile" TEXT,
    "alternateMobile" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "permanentAddress" TEXT,
    "emergencyContact" TEXT,
    "bloodGroup" TEXT,
    "gender" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "currentHostelId" TEXT,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "selfies" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "deviceInfo" TEXT,
    "ipAddress" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "triggerType" TEXT NOT NULL,

    CONSTRAINT "selfies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hostels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "contactNumber" TEXT,
    "totalCapacity" INTEGER NOT NULL DEFAULT 0,
    "managerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "hostels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "roomType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beds" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "bedLabel" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hostel_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "leftAt" TIMESTAMP(3),
    "transferredAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "hostel_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "room_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bed_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bedId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "bed_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lifecycle_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" "LifecycleEventType" NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "hostelId" TEXT,
    "notes" TEXT,
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fromHostelId" TEXT,
    "toHostelId" TEXT,
    "transferReason" TEXT,
    "approvedBy" TEXT,
    "coolingPeriodStart" TIMESTAMP(3),
    "coolingPeriodEnd" TIMESTAMP(3),

    CONSTRAINT "lifecycle_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hostel_manager_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,

    CONSTRAINT "hostel_manager_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_manager_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "appointedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appointedBy" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "monthly_manager_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rent_configs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "setBy" TEXT NOT NULL,
    "setAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "rent_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "establishment_fees" (
    "id" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "feeType" "FeeType" NOT NULL DEFAULT 'RECURRING',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "setBy" TEXT NOT NULL,
    "setAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "establishment_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bed_fees" (
    "id" TEXT NOT NULL,
    "bedId" TEXT,
    "roomId" TEXT,
    "hostelId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "feeType" "FeeType" NOT NULL DEFAULT 'RECURRING',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "setBy" TEXT NOT NULL,
    "setAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bed_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bills" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "rentAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "establishmentFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bedFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "messCharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lateFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "BillStatus" NOT NULL DEFAULT 'GENERATED',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT,

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "proofFileUrl" TEXT,
    "transactionId" TEXT,
    "utrNumber" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "late_fee_records" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "daysLate" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "late_fee_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mess_configs" (
    "id" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "cookPayment" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cleanerPayment" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "dustbinPayment" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "guestMealRate" DECIMAL(10,2) NOT NULL DEFAULT 65,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "setBy" TEXT NOT NULL,
    "setAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mess_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mess_sessions" (
    "id" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "monthlyManagerSessionId" TEXT,
    "status" "MessSessionStatus" NOT NULL DEFAULT 'DRAFT',
    "totalMessCharge1" DECIMAL(10,2),
    "totalGuestRecovery" DECIMAL(10,2),
    "totalMessCharge2" DECIMAL(10,2),
    "totalStudentMeals" INTEGER,
    "universalMealCharge" DECIMAL(10,2),
    "cookPayment" DECIMAL(10,2),
    "cleanerPayment" DECIMAL(10,2),
    "dustbinPayment" DECIMAL(10,2),
    "guestMealRate" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,

    CONSTRAINT "mess_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mess_initial_contributions" (
    "id" TEXT NOT NULL,
    "messSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "contributionDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "enteredBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mess_initial_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mess_market_expenses" (
    "id" TEXT NOT NULL,
    "messSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "billFileUrl" TEXT,
    "enteredBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mess_market_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mess_water_expenses" (
    "id" TEXT NOT NULL,
    "messSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "billFileUrl" TEXT,
    "enteredBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mess_water_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mess_guest_meals" (
    "id" TEXT NOT NULL,
    "messSessionId" TEXT NOT NULL,
    "mealDate" TIMESTAMP(3) NOT NULL,
    "guestCount" INTEGER NOT NULL,
    "enteredBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mess_guest_meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mess_student_meal_counts" (
    "id" TEXT NOT NULL,
    "messSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mealCount" INTEGER NOT NULL,
    "enteredBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mess_student_meal_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mess_settlements" (
    "id" TEXT NOT NULL,
    "messSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mealCount" INTEGER NOT NULL,
    "mealCost" DECIMAL(10,2) NOT NULL,
    "universalCommonCharge" DECIMAL(10,2) NOT NULL,
    "initialContribution" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "marketSpending" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "waterSpending" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalContribution" DECIMAL(10,2) NOT NULL,
    "totalLiability" DECIMAL(10,2) NOT NULL,
    "netSettlement" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mess_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mess_documents" (
    "id" TEXT NOT NULL,
    "messSessionId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mess_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "emailSent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_userId_key" ON "student_profiles"("userId");

-- CreateIndex
CREATE INDEX "documents_userId_status_idx" ON "documents"("userId", "status");

-- CreateIndex
CREATE INDEX "documents_status_idx" ON "documents"("status");

-- CreateIndex
CREATE INDEX "selfies_userId_isCurrent_idx" ON "selfies"("userId", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_hostelId_roomNumber_key" ON "rooms"("hostelId", "roomNumber");

-- CreateIndex
CREATE UNIQUE INDEX "beds_roomId_bedLabel_key" ON "beds"("roomId", "bedLabel");

-- CreateIndex
CREATE INDEX "hostel_assignments_userId_status_idx" ON "hostel_assignments"("userId", "status");

-- CreateIndex
CREATE INDEX "hostel_assignments_hostelId_status_idx" ON "hostel_assignments"("hostelId", "status");

-- CreateIndex
CREATE INDEX "room_assignments_userId_status_idx" ON "room_assignments"("userId", "status");

-- CreateIndex
CREATE INDEX "bed_assignments_userId_status_idx" ON "bed_assignments"("userId", "status");

-- CreateIndex
CREATE INDEX "bed_assignments_bedId_status_idx" ON "bed_assignments"("bedId", "status");

-- CreateIndex
CREATE INDEX "lifecycle_events_userId_idx" ON "lifecycle_events"("userId");

-- CreateIndex
CREATE INDEX "hostel_manager_assignments_hostelId_isActive_idx" ON "hostel_manager_assignments"("hostelId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_manager_sessions_hostelId_month_year_key" ON "monthly_manager_sessions"("hostelId", "month", "year");

-- CreateIndex
CREATE INDEX "rent_configs_userId_hostelId_idx" ON "rent_configs"("userId", "hostelId");

-- CreateIndex
CREATE INDEX "establishment_fees_hostelId_idx" ON "establishment_fees"("hostelId");

-- CreateIndex
CREATE INDEX "bed_fees_hostelId_idx" ON "bed_fees"("hostelId");

-- CreateIndex
CREATE INDEX "bills_hostelId_month_year_idx" ON "bills"("hostelId", "month", "year");

-- CreateIndex
CREATE INDEX "bills_userId_status_idx" ON "bills"("userId", "status");

-- CreateIndex
CREATE INDEX "bills_status_idx" ON "bills"("status");

-- CreateIndex
CREATE UNIQUE INDEX "bills_userId_hostelId_month_year_key" ON "bills"("userId", "hostelId", "month", "year");

-- CreateIndex
CREATE INDEX "payments_billId_idx" ON "payments"("billId");

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "mess_configs_hostelId_idx" ON "mess_configs"("hostelId");

-- CreateIndex
CREATE UNIQUE INDEX "mess_sessions_monthlyManagerSessionId_key" ON "mess_sessions"("monthlyManagerSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "mess_sessions_hostelId_month_year_key" ON "mess_sessions"("hostelId", "month", "year");

-- CreateIndex
CREATE INDEX "mess_initial_contributions_messSessionId_idx" ON "mess_initial_contributions"("messSessionId");

-- CreateIndex
CREATE INDEX "mess_market_expenses_messSessionId_idx" ON "mess_market_expenses"("messSessionId");

-- CreateIndex
CREATE INDEX "mess_water_expenses_messSessionId_idx" ON "mess_water_expenses"("messSessionId");

-- CreateIndex
CREATE INDEX "mess_guest_meals_messSessionId_idx" ON "mess_guest_meals"("messSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "mess_student_meal_counts_messSessionId_userId_key" ON "mess_student_meal_counts"("messSessionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "mess_settlements_messSessionId_userId_key" ON "mess_settlements"("messSessionId", "userId");

-- CreateIndex
CREATE INDEX "mess_documents_messSessionId_idx" ON "mess_documents"("messSessionId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selfies" ADD CONSTRAINT "selfies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostels" ADD CONSTRAINT "hostels_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "hostels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "beds_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_assignments" ADD CONSTRAINT "hostel_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_assignments" ADD CONSTRAINT "hostel_assignments_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "hostels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_assignments" ADD CONSTRAINT "room_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_assignments" ADD CONSTRAINT "room_assignments_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_assignments" ADD CONSTRAINT "bed_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_assignments" ADD CONSTRAINT "bed_assignments_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifecycle_events" ADD CONSTRAINT "lifecycle_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifecycle_events" ADD CONSTRAINT "lifecycle_events_fromHostelId_fkey" FOREIGN KEY ("fromHostelId") REFERENCES "hostels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifecycle_events" ADD CONSTRAINT "lifecycle_events_toHostelId_fkey" FOREIGN KEY ("toHostelId") REFERENCES "hostels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_manager_assignments" ADD CONSTRAINT "hostel_manager_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_manager_assignments" ADD CONSTRAINT "hostel_manager_assignments_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "hostels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_manager_sessions" ADD CONSTRAINT "monthly_manager_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_manager_sessions" ADD CONSTRAINT "monthly_manager_sessions_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "hostels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rent_configs" ADD CONSTRAINT "rent_configs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rent_configs" ADD CONSTRAINT "rent_configs_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "hostels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "establishment_fees" ADD CONSTRAINT "establishment_fees_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "hostels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_fees" ADD CONSTRAINT "bed_fees_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "beds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_fees" ADD CONSTRAINT "bed_fees_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_fees" ADD CONSTRAINT "bed_fees_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "hostels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "hostels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "late_fee_records" ADD CONSTRAINT "late_fee_records_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mess_configs" ADD CONSTRAINT "mess_configs_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "hostels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mess_sessions" ADD CONSTRAINT "mess_sessions_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "hostels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mess_sessions" ADD CONSTRAINT "mess_sessions_monthlyManagerSessionId_fkey" FOREIGN KEY ("monthlyManagerSessionId") REFERENCES "monthly_manager_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mess_initial_contributions" ADD CONSTRAINT "mess_initial_contributions_messSessionId_fkey" FOREIGN KEY ("messSessionId") REFERENCES "mess_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mess_initial_contributions" ADD CONSTRAINT "mess_initial_contributions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mess_market_expenses" ADD CONSTRAINT "mess_market_expenses_messSessionId_fkey" FOREIGN KEY ("messSessionId") REFERENCES "mess_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mess_market_expenses" ADD CONSTRAINT "mess_market_expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mess_water_expenses" ADD CONSTRAINT "mess_water_expenses_messSessionId_fkey" FOREIGN KEY ("messSessionId") REFERENCES "mess_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mess_water_expenses" ADD CONSTRAINT "mess_water_expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mess_guest_meals" ADD CONSTRAINT "mess_guest_meals_messSessionId_fkey" FOREIGN KEY ("messSessionId") REFERENCES "mess_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mess_student_meal_counts" ADD CONSTRAINT "mess_student_meal_counts_messSessionId_fkey" FOREIGN KEY ("messSessionId") REFERENCES "mess_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mess_student_meal_counts" ADD CONSTRAINT "mess_student_meal_counts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mess_settlements" ADD CONSTRAINT "mess_settlements_messSessionId_fkey" FOREIGN KEY ("messSessionId") REFERENCES "mess_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mess_settlements" ADD CONSTRAINT "mess_settlements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mess_documents" ADD CONSTRAINT "mess_documents_messSessionId_fkey" FOREIGN KEY ("messSessionId") REFERENCES "mess_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

