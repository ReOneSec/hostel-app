import { Decimal } from "decimal.js";

export interface StudentMessData {
  userId: string;
  mealCount: number;
  initialContribution: Decimal;
  marketSpending: Decimal;
  waterSpending: Decimal;
}

export interface MessCalculatorInput {
  cookPayment: Decimal;
  cleanerPayment: Decimal;
  dustbinPayment: Decimal;
  guestMealRate: Decimal;
  totalGuestMeals: number;
  marketExpenses: Decimal;
  waterExpenses: Decimal;
  students: StudentMessData[];
}

export interface StudentSettlementResult {
  userId: string;
  mealCount: number;
  mealCost: Decimal;
  universalCommonCharge: Decimal;
  initialContribution: Decimal;
  marketSpending: Decimal;
  waterSpending: Decimal;
  totalContribution: Decimal;
  totalLiability: Decimal;
  netSettlement: Decimal;
}

export interface MessCalculationResult {
  totalMessCharge1: Decimal;
  totalGuestRecovery: Decimal;
  totalMessCharge2: Decimal;
  totalStudentMeals: number;
  universalMealCharge: Decimal;
  perStudentCommonCharge: Decimal;
  settlements: StudentSettlementResult[];
}

/**
 * Implements the Mess Cooperative Accounting Logic
 * 
 * 1. commonCharge = cook + cleaner + dustbin + water (split equally)
 * 2. consumableExpenses = market only (split by meals eaten)
 * 3. netConsumableExpenses = consumableExpenses - guestRecovery (floor at 0)
 * 4. universalMealCharge = netConsumableExpenses / totalStudentMeals
 * 5. perStudentCommonCharge = commonCharge / numberOfStudents
 */
export function calculateMessSettlements(input: MessCalculatorInput): MessCalculationResult {
  // Common fixed charges (salaries + water)
  const commonCharge = input.cookPayment.plus(input.cleanerPayment).plus(input.dustbinPayment).plus(input.waterExpenses);
  
  // Consumable expenses (market only)
  const totalConsumableExpenses = input.marketExpenses;
  
  // Guest recovery
  const totalGuestRecovery = input.guestMealRate.times(input.totalGuestMeals);
  
  // Net consumable expenses that students need to pay for (floor at 0 to prevent negative meal charges)
  const netConsumableExpenses = Decimal.max(totalConsumableExpenses.minus(totalGuestRecovery), new Decimal(0));
  
  // Total student meals
  const totalStudentMeals = input.students.reduce((sum, s) => sum + s.mealCount, 0);
  
  // Universal Meal Charge (Cost per meal)
  const universalMealCharge = totalStudentMeals > 0 
    ? netConsumableExpenses.dividedBy(totalStudentMeals) 
    : new Decimal(0);
    
  // Fixed overhead per student
  const numberOfStudents = input.students.length;
  const perStudentCommonCharge = numberOfStudents > 0 
    ? commonCharge.dividedBy(numberOfStudents) 
    : new Decimal(0);

  const settlements: StudentSettlementResult[] = input.students.map((student) => {
    const mealCost = universalMealCharge.times(student.mealCount);
    const totalLiability = mealCost.plus(perStudentCommonCharge);
    
    const totalContribution = student.initialContribution
      .plus(student.marketSpending)
      .plus(student.waterSpending);
      
    const netSettlement = totalLiability.minus(totalContribution);
    
    return {
      userId: student.userId,
      mealCount: student.mealCount,
      mealCost: mealCost.toDecimalPlaces(2),
      universalCommonCharge: perStudentCommonCharge.toDecimalPlaces(2),
      initialContribution: student.initialContribution,
      marketSpending: student.marketSpending,
      waterSpending: student.waterSpending,
      totalContribution: totalContribution.toDecimalPlaces(2),
      totalLiability: totalLiability.toDecimalPlaces(2),
      netSettlement: netSettlement.toDecimalPlaces(2)
    };
  });

  // totalMessCharge1 = all expenses (market + common)
  // totalMessCharge2 = totalMessCharge1 - guest recovery
  const totalMessCharge1 = totalConsumableExpenses.plus(commonCharge);
  const totalMessCharge2 = totalMessCharge1.minus(totalGuestRecovery);

  return {
    totalMessCharge1: totalMessCharge1.toDecimalPlaces(2),
    totalGuestRecovery: totalGuestRecovery.toDecimalPlaces(2),
    totalMessCharge2: totalMessCharge2.toDecimalPlaces(2),
    totalStudentMeals,
    universalMealCharge: universalMealCharge.toDecimalPlaces(2),
    perStudentCommonCharge: perStudentCommonCharge.toDecimalPlaces(2),
    settlements
  };
}
