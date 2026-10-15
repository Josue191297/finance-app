import { test } from "node:test"
import assert from "node:assert/strict"
import { addMonth, toDateInput, totalsByCategory, expenseTotal, sumByType, savingsAmount } from "./money.js"

test("savingsAmount counts only the Savings lines of a receipt", () => {
  const receipt = {
    type: "expense",
    transactionMode: "detailed",
    items: [
      { name: "Transfer", amount: "50000", category: " savings " },
      { name: "Fee", amount: "500", category: "Bank" },
    ],
  }
  assert.equal(savingsAmount(receipt), 50000)
  assert.equal(savingsAmount({ type: "expense", transactionMode: "simple", amount: 7000 }), 7000)
})

test("addMonth keeps the day and caps it at month end", () => {
  assert.equal(addMonth("2026-01-15"), "2026-02-15")
  assert.equal(addMonth("2026-01-31"), "2026-02-28")
  assert.equal(addMonth("2028-01-31"), "2028-02-29")
  assert.equal(addMonth("2026-12-31"), "2027-01-31")
  assert.equal(addMonth(""), null)
})

test("toDateInput uses the local date, also late in the evening", () => {
  assert.equal(toDateInput(new Date(2026, 9, 11, 23, 30)), "2026-10-11")
})

test("receipt lines count toward their own categories", () => {
  const expenses = [
    { type: "expense", transactionMode: "simple", category: "Food", amount: 1000 },
    {
      type: "expense",
      transactionMode: "detailed",
      amount: 5000,
      items: [
        { name: "Rice", amount: "3000", category: "Food" },
        { name: "Soap", amount: "2000", category: "Cleaning" },
      ],
    },
    { type: "income", category: "Salary", amount: 9000 },
  ]
  assert.deepEqual(totalsByCategory(expenses), [
    { name: "Food", value: 4000 },
    { name: "Cleaning", value: 2000 },
  ])
  assert.equal(expenseTotal(expenses[1]), 5000)
  assert.equal(sumByType(expenses, "expense"), 6000)
  assert.equal(sumByType(expenses, "income"), 9000)
})
