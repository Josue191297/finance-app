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

export const formatMoney = (value) => {
  const number = Number(value || 0)
  return `${number < 0 ? "-" : ""}₡${Math.abs(number).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })}`
}

// "Today", "Yesterday", or "Mon, Oct 12" (with the year when it is not this year).
export const dayLabel = (dateStr, now = new Date()) => {
  const date = parseLocalDate(dateStr)
  if (!date) return "No date"
  const todayStr = toDateInput(now)
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  if (dateStr === todayStr) return "Today"
  if (dateStr === toDateInput(yesterday)) return "Yesterday"
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== now.getFullYear() && { year: "numeric" }),
  })
}

// Splits an already-sorted list into runs that share the same key: [{ key, items }].
export const groupConsecutive = (list, keyOf) => {
  const groups = []
  for (const entry of list) {
    const key = keyOf(entry)
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.items.push(entry)
    else groups.push({ key, items: [entry] })
  }
  return groups
}

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

// Short description for lists: the category for one item, otherwise the item count.
export const transactionLabel = (expense) => {
  if (!isDetailed(expense)) return expense.category || "No category"
  if (expense.items.length === 1) return expense.items[0].category || "No category"
  return `${expense.items.length} items`
}

export const isSavingsCategory =(category) =>
  category?.trim().toLowerCase() === "savings"

// How much of an expense goes to its linked savings goal: only the receipt lines in "Savings".
export const savingsAmount = (expense) =>
  isDetailed(expense)
    ? expense.items
        .filter((item) => isSavingsCategory(item.category))
        .reduce((sum, item) => sum + Number(item.amount || 0), 0)
    : Number(expense.amount || 0)

// How many transactions of this type use the category (on any receipt line).
export const categoryUseCount = (expenses, name, type) =>
  expenses.filter(
    (expense) =>
      (expense.type || "expense") === type &&
      (isDetailed(expense)
        ? expense.items.some((item) => item.category === name)
        : expense.category === name)
  ).length

export const sumByType = (expenses, type) =>
  expenses
    .filter((expense) => expense.type === type)
    .reduce((sum, expense) => sum + expenseTotal(expense), 0)
