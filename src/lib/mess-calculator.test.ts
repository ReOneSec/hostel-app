import { calculateMessSettlements } from "./mess-calculator";
import { Decimal } from "decimal.js";

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
console.log(JSON.stringify(result, null, 2));

// Mathematical test: 
// Common Charge = 7500. Per student = 3750.
// Consumable = 11000. Guest Recovery = 650. Net Consumable = 10350.
// Total student meals = 100. Universal Meal Charge = 103.5.
// User A Liability = 60 * 103.5 + 3750 = 6210 + 3750 = 9960.
// User A Contribution = 1000 + 6000 + 1000 = 8000.
// User A Net Settlement = 9960 - 8000 = +1960 (owes 1960).

// User B Liability = 40 * 103.5 + 3750 = 4140 + 3750 = 7890.
// User B Contribution = 2000 + 4000 + 0 = 6000.
// User B Net Settlement = 7890 - 6000 = +1890 (owes 1890).

// Total collected from both = 1960 + 1890 = 3850.
// Initial contributions = 3000. Market spending = 10000. Water = 1000. Guest = 650.
// Total money in pool = Initial(3000) + Guest(650) + Collected(3850) = 7500.
// Which exactly pays the Cook, Cleaner, Dustbin (7500)! Perfect zero-sum.
