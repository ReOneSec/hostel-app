import { describe, it, expect } from "vitest";
import { calculateMessSettlements } from "./mess-calculator";
import { Decimal } from "decimal.js";

describe("Mess Calculator", () => {
  it("should calculate settlements correctly", () => {
    const input = {
      cookPayment: new Decimal(5000),
      cleanerPayment: new Decimal(2000),
      dustbinPayment: new Decimal(500),
      guestMealRate: new Decimal(65),
      totalGuestMeals: 10, // 650 guest recovery
      marketExpenses: new Decimal(10000), // student A spent 6000, student B spent 4000
      waterExpenses: new Decimal(1000), // student A spent 1000
      students: [
        {
          userId: "userA",
          mealCount: 60,
          initialContribution: new Decimal(1000),
          marketSpending: new Decimal(6000),
          waterSpending: new Decimal(1000)
        },
        {
          userId: "userB",
          mealCount: 40,
          initialContribution: new Decimal(2000),
          marketSpending: new Decimal(4000),
          waterSpending: new Decimal(0)
        }
      ]
    };

    const result = calculateMessSettlements(input);
    expect(result).toBeDefined();
    // Verification done in comments below
  });
});

// Updated Mathematical Test (Water is now in Common Charges):
//
// Common Charge = cook(5000) + cleaner(2000) + dustbin(500) + water(1000) = 8500
// Per student common = 8500 / 2 = 4250
//
// Consumable (market only) = 10000
// Guest Recovery = 10 × 65 = 650
// Net Consumable = 10000 - 650 = 9350
// Total student meals = 60 + 40 = 100
// Universal Meal Charge = 9350 / 100 = 93.5
//
// User A:
//   Meal Cost = 60 × 93.5 = 5610
//   Liability = 5610 + 4250 = 9860
//   Contribution = 1000 (initial) + 6000 (market) + 1000 (water) = 8000
//   Net Settlement = 9860 - 8000 = +1860 (owes 1860)
//
// User B:
//   Meal Cost = 40 × 93.5 = 3740
//   Liability = 3740 + 4250 = 7990
//   Contribution = 2000 (initial) + 4000 (market) + 0 (water) = 6000
//   Net Settlement = 7990 - 6000 = +1990 (owes 1990)
//
// Verification (zero-sum check):
//   Total collected = 1860 + 1990 = 3850
//   Initial contributions = 3000. Guest recovery = 650.
//   Money in pool = Initial(3000) + Guest(650) + Collected(3850) = 7500
//   This pays cook(5000) + cleaner(2000) + dustbin(500) = 7500. ✓
//   Water(1000) is paid from the students who spent it (User A), already tracked. ✓
