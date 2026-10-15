// Dates are stored as "YYYY-MM-DD" strings in the user's local time zone.

export const parseLocalDate = (dateStr) => {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export const toDateInput = (date) => {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

export const today = () => toDateInput(new Date())

// Same day next month, capped at that month's last day (Jan 31 -> Feb 28).
export const addMonth = (dateStr) => {
  const d = parseLocalDate(dateStr)
  if (!d) return null
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 2, 0).getDate()
  return toDateInput(
    new Date(d.getFullYear(), d.getMonth() + 1, Math.min(d.getDate(), lastDay))
  )
}

const isDetailed = (expense) =>
  expense.transactionMode === "detailed" && Array.isArray(expense.items)

const categoryKey = (category) => category || "No category"

export const expenseTotal = (expense) =>
  isDetailed(expense)
    ? expense.items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    : Number(expense.amount || 0)

// Part of an expense that belongs to a category; receipt lines count toward their own category.
export const amountInCategory = (expense, category) => {
  if (expense.type !== "expense") return 0
  if (isDetailed(expense)) {
    return expense.items
      .filter((item) => categoryKey(item.category) === category)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)
  }
  return categoryKey(expense.category) === category ? Number(expense.amount || 0) : 0
}

export const totalsByCategory = (expenses) => {
  const names = new Set()
  for (const expense of expenses) {
    if (expense.type !== "expense") continue
    if (isDetailed(expense)) expense.items.forEach((item) => names.add(categoryKey(item.category)))
    else names.add(categoryKey(expense.category))
  }
  return [...names].map((name) => ({
    name,
    value: expenses.reduce((sum, expense) => sum + amountInCategory(expense, name), 0),
  }))
}

export const sumByType = (expenses, type) =>
  expenses
    .filter((expense) => expense.type === type)
    .reduce((sum, expense) => sum + expenseTotal(expense), 0)
