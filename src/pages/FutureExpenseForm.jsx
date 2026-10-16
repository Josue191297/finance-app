import { useState } from "react"
import { db, saveInBackground } from "../firebase"
import { addDoc, collection } from "firebase/firestore"
import { householdId } from "../household"

function FutureExpenseForm({
  categories = [],
  onClose,
  editingExpense,
  onSave,
}) {
  // The form is mounted fresh for each edit, so state starts from editingExpense.
  const [type, setType] = useState(editingExpense?.type || "expense")
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

  const typeCategories = categories.filter(
    (cat) => (cat.type || "expense") === type
  )

  const changeType = (newType) => {
    if (newType === type) return
    setType(newType)
    setCategory("")
  }

  const handleSubmit = (e) => {
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
      type,
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

    if (editingExpense && onSave) {
      onSave({ ...editingExpense, ...data })
    } else {
      saveInBackground(
        addDoc(collection(db, "households", householdId, "futureExpenses"), {
          ...data,
          createdAt: Date.now(),
        }),
        "upcoming payment"
      )
    }

    if (onClose) onClose()
  }

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <h2 style={titleStyle}>
        {editingExpense ? "Edit upcoming payment" : "Add upcoming payment"}
      </h2>

      <div style={typeRowStyle} role="group" aria-label="Payment type">
        {[
          ["expense", "Expense", "var(--expense)"],
          ["income", "Income", "var(--income)"],
        ].map(([value, label, color]) => (
          <button
            key={value}
            type="button"
            aria-pressed={type === value}
            onClick={() => changeType(value)}
            style={{
              ...typeButtonStyle,
              background: type === value ? color : "transparent",
              color: type === value ? "white" : "var(--text)",
              borderColor: type === value ? color : "var(--border)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

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

      {typeCategories.length > 0 ? (
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={selectStyle}
        >
          <option value="">Select Category</option>

          {typeCategories.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>
      ) : (
        <p style={{ margin: 0, color: "var(--text-secondary)" }}>
          No {type} categories yet. Add them in Settings.
        </p>
      )}

      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        style={inputStyle}
      />

      <label style={checkboxContainer}>
        <input
          type="checkbox"
          checked={recurring}
          onChange={(e) => setRecurring(e.target.checked)}
        />
        <span>Repeats every month</span>
      </label>

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
  background: "var(--primary)",
  color: "white",
  cursor: "pointer",
  fontWeight: 500,
  marginTop: 10,
}

const typeRowStyle = {
  display: "flex",
  gap: 10,
}

const typeButtonStyle = {
  flex: 1,
  padding: 12,
  borderRadius: 10,
  border: "1px solid var(--border)",
  fontWeight: 600,
}

const checkboxContainer = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "fit-content",
  cursor: "pointer",
}