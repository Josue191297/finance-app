import { useState } from "react"
import { db } from "../firebase"
import { addDoc, collection } from "firebase/firestore"
import { householdId } from "../household"

function FutureExpenseForm({
  categories = [],
  onClose,
  editingExpense,
  onSave,
}) {
  // The form is mounted fresh for each edit, so state starts from editingExpense.
  const [name, setName] = useState(editingExpense?.name || "")
  const [amount, setAmount] = useState(editingExpense?.amount || "")
  const [category, setCategory] = useState(editingExpense?.category || "")
  const [dueDate, setDueDate] = useState(editingExpense?.dueDate || "")
  const [recurring, setRecurring] = useState(editingExpense?.recurring || false)
  const [recurringMode, setRecurringMode] = useState(
    editingExpense?.recurringMode || "forever"
  )
  const [monthsRemaining, setMonthsRemaining] = useState(
    editingExpense?.monthsRemaining || ""
  )

  const resetForm = () => {
    setName("")
    setAmount("")
    setCategory("")
    setDueDate("")
    setRecurring(false)
    setRecurringMode("forever")
    setMonthsRemaining("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!name.trim() || !amount || !dueDate) return

    if (
      recurring &&
      recurringMode === "limited" &&
      Number(monthsRemaining) < 1
    ) {
      return
    }

    const data = {
      name: name.trim(),
      amount: Number(amount),
      category,
      dueDate,
      recurring,
      frequency: recurring ? "monthly" : null,
      recurringMode: recurring ? recurringMode : null,
      monthsRemaining:
        recurring && recurringMode === "limited"
          ? Number(monthsRemaining)
          : null,
    }

    try {
      if (editingExpense && onSave) {
        await onSave({
          ...editingExpense,
          ...data,
        })
      } else {
        await addDoc(
          collection(db, "households", householdId, "futureExpenses"),
          {
            ...data,
            createdAt: Date.now(),
          }
        )
      }

      resetForm()
      if (onClose) onClose()
    } catch (error) {
      console.error("Error saving future expense:", error)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <h2 style={titleStyle}>
        {editingExpense ? "Edit Future Expense" : "Add Future Expense"}
      </h2>

      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={inputStyle}
      />

      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={inputStyle}
      />

      {categories.length > 0 ? (
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={selectStyle}
        >
          <option value="">Select Category</option>

          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>
      ) : (
        <p style={{ opacity: 0.6 }}>
          No categories available.
        </p>
      )}

      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        style={inputStyle}
      />

      <div
        style={checkboxContainer}
        onClick={() => setRecurring(!recurring)}
      >
        <input
          type="checkbox"
          checked={recurring}
          readOnly
        />
        <span>Recurring monthly</span>
      </div>

      {recurring && (
        <>
          <select
            value={recurringMode}
            onChange={(e) => setRecurringMode(e.target.value)}
            style={selectStyle}
          >
            <option value="forever">Forever</option>
            <option value="limited">Certain amount of months</option>
          </select>

          {recurringMode === "limited" && (
            <input
              type="number"
              min="1"
              placeholder="Number of months"
              value={monthsRemaining}
              onChange={(e) => setMonthsRemaining(e.target.value)}
              style={inputStyle}
            />
          )}
        </>
      )}

      <button type="submit" style={buttonStyle}>
        {editingExpense ? "Update" : "Add"}
      </button>
    </form>
  )
}

export default FutureExpenseForm

const formStyle = {
  background: "var(--card)",
  color: "var(--text)",
  padding: 24,
  borderRadius: 16,
  display: "flex",
  flexDirection: "column",
  gap: 18,
}

const titleStyle = {
  margin: 0,
}

const inputStyle = {
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--card)",
  color: "var(--text)",
  fontSize: 14,
}

const selectStyle = {
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--card)",
  color: "var(--text)",
  fontSize: 14,
  colorScheme: "dark light",
  cursor: "pointer",
}

const buttonStyle = {
  padding: 14,
  borderRadius: 10,
  border: "none",
  background: "#1677ff",
  color: "white",
  cursor: "pointer",
  fontWeight: 500,
  marginTop: 10,
}

const checkboxContainer = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "fit-content",
  cursor: "pointer",
}