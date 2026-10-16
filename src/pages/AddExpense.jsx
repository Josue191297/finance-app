import { useState, useEffect } from "react"
import { db } from "../firebase"
import {
  addDoc,
  updateDoc,
  doc,
  collection,
  onSnapshot,
} from "firebase/firestore"
import { householdId } from "../household"
import { today, isSavingsCategory } from "../money"
import {
  FiArrowUpRight,
  FiArrowDownLeft,
  FiPlus,
  FiTrash2,
  FiTag,
} from "react-icons/fi"

const emptyItem = () => ({ name: "", amount: "", category: "" })

// Older "quick" transactions open as a receipt with one item.
const initialItems = (expense) => {
  if (!expense) return [emptyItem()]
  if (expense.items?.length) {
    // An empty box (not "0") for imported USD charges waiting for their colones amount.
    return expense.items.map((item) => ({ ...item, amount: item.amount ? String(item.amount) : "" }))
  }
  return [
    {
      name: expense.name || "",
      amount: String(expense.amount ?? ""),
      category: expense.category || "",
    },
  ]
}

const formatMoney = (value) =>
  `₡${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`

function AddExpense({
  categories = [],
  editingExpense,
  onClose,
  onAdd,
}) {
  // The form is mounted fresh for each edit, so state starts from editingExpense.
  const [type, setType] = useState(editingExpense?.type || "expense")
  const [name, setName] = useState(editingExpense?.name || "")
  const [date, setDate] = useState(editingExpense?.date || today())
  const [items, setItems] = useState(() => initialItems(editingExpense))
  const [savingGoals, setSavingGoals] = useState([])
  const [savingGoalId, setSavingGoalId] = useState(
    editingExpense?.savingGoalId || ""
  )
  const [newCategory, setNewCategory] = useState("")
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "households", householdId, "savingGoals"),
      (snapshot) => {
        setSavingGoals(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        )
      }
    )

    return () => unsubscribe()
  }, [])

  const isIncome = type === "income"
  const accent = isIncome ? "var(--income)" : "var(--expense)"
  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const typeCategories = categories.filter(
    (cat) => (cat.type || "expense") === type
  )
  const hasSavingsItem =
    !isIncome && items.some((item) => isSavingsCategory(item.category))

  const handleTypeChange = (newType) => {
    if (newType === type) return
    setType(newType)
    setSavingGoalId("")
    setItems((prev) => prev.map((item) => ({ ...item, category: "" })))
    setShowAddCategory(false)
  }

  const updateItem = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const createCategory = async () => {
    const categoryName = newCategory.trim()
    if (!categoryName) return

    try {
      await addDoc(collection(db, "households", householdId, "categories"), {
        name: categoryName,
        type,
        createdAt: Date.now(),
      })

      // Give the new category to every item that has none yet.
      setItems((prev) =>
        prev.map((item) =>
          item.category ? item : { ...item, category: categoryName }
        )
      )
      setNewCategory("")
      setShowAddCategory(false)
    } catch (err) {
      console.error("Error creating category:", err)
      setError("Could not create the category. Try again.")
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    const storeName = name.trim()
    if (!storeName) {
      setError(isIncome ? "Add where the money comes from." : "Add the store name.")
      return
    }

    const cleanedItems = items
      .filter((item) => Number(item.amount) > 0)
      .map((item) => ({
        name: item.name.trim() || storeName,
        amount: Number(item.amount),
        category: item.category,
      }))

    if (cleanedItems.length === 0) {
      setError("Add at least one item with an amount above 0.")
      return
    }

    const selectedGoal = savingGoals.find((goal) => goal.id === savingGoalId)

    const expenseData = {
      transactionMode: "detailed",
      name: storeName,
      type,
      date,
      items: cleanedItems,
      amount: cleanedItems.reduce((sum, item) => sum + item.amount, 0),
      category: null,
      savingGoalId: hasSavingsItem ? savingGoalId || null : null,
      savingGoalName: hasSavingsItem ? selectedGoal?.name || "" : null,
      // Saving the form counts as reviewing an imported bank transaction.
      needsReview: false,
    }

    setSaving(true)
    try {
      if (editingExpense) {
        await updateDoc(
          doc(db, "households", householdId, "expenses", editingExpense.id),
          expenseData
        )
      } else if (onAdd) {
        await onAdd(expenseData)
      } else {
        await addDoc(
          collection(db, "households", householdId, "expenses"),
          { ...expenseData, createdAt: Date.now() }
        )
      }

      if (onClose) onClose()
    } catch (err) {
      console.error("Error saving transaction:", err)
      setError("Could not save. Check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={formStyle} noValidate>
      <h2 style={titleStyle}>
        {editingExpense ? "Edit transaction" : "New transaction"}
      </h2>

      {editingExpense?.needsReview && editingExpense.currency === "USD" && (
        <p style={noticeStyle}>
          Your bank charged USD{" "}
          {Number(editingExpense.originalAmount || 0).toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}
          . Enter the colones amount from your bank statement.
        </p>
      )}

      {/* TYPE */}
      <div style={segmentStyle} role="group" aria-label="Transaction type">
        {[
          ["expense", "Expense", <FiArrowUpRight key="i" />, "var(--expense)"],
          ["income", "Income", <FiArrowDownLeft key="i" />, "var(--income)"],
        ].map(([value, label, icon, color]) => {
          const active = type === value
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => handleTypeChange(value)}
              style={{
                ...segmentButtonStyle,
                background: active ? "var(--card)" : "transparent",
                color: active ? color : "var(--text-secondary)",
                boxShadow: active ? "var(--shadow)" : "none",
              }}
            >
              {icon}
              {label}
            </button>
          )
        })}
      </div>

      {/* STORE + DATE */}
      <div style={fieldGridStyle}>
        <label style={fieldStyle}>
          <span style={labelStyle}>{isIncome ? "From" : "Store"}</span>
          <input
            type="text"
            placeholder={isIncome ? "e.g. Salary, client" : "e.g. Walmart, Uber"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus={!editingExpense}
          />
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>Date</span>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>

      {/* ITEMS */}
      <div style={fieldStyle}>
        <div style={itemsHeaderStyle}>
          <span style={labelStyle}>Items</span>
          <span style={hintStyle}>
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </div>

        {items.map((item, index) => (
          <div key={index} style={itemCardStyle}>
            <div style={itemTopRowStyle}>
              <input
                placeholder={index === 0 ? "What was it? (optional)" : "Item (optional)"}
                aria-label={`Item ${index + 1} name`}
                value={item.name}
                onChange={(e) => updateItem(index, "name", e.target.value)}
                style={{ minWidth: 0 }}
              />
              <div style={amountWrapStyle}>
                <span style={currencyStyle} aria-hidden="true">₡</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  placeholder="0"
                  aria-label={`Item ${index + 1} amount`}
                  value={item.amount}
                  onChange={(e) => updateItem(index, "amount", e.target.value)}
                  style={amountInputStyle}
                />
              </div>
            </div>

            <div style={itemBottomRowStyle}>
              <div style={selectWrapStyle}>
                <FiTag style={selectIconStyle} aria-hidden="true" />
                <select
                  aria-label={`Item ${index + 1} category`}
                  value={item.category}
                  onChange={(e) => updateItem(index, "category", e.target.value)}
                  style={selectStyle}
                >
                  <option value="">No category</option>
                  {typeCategories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {items.length > 1 && (
                <button
                  type="button"
                  style={removeButtonStyle}
                  onClick={() => removeItem(index)}
                  title="Remove item"
                  aria-label={`Remove item ${index + 1}`}
                >
                  <FiTrash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}

        <div style={itemActionsStyle}>
          <button
            type="button"
            style={dashedButtonStyle}
            onClick={() => setItems((prev) => [...prev, emptyItem()])}
          >
            <FiPlus /> Add item
          </button>
          <button
            type="button"
            style={linkButtonStyle}
            onClick={() => setShowAddCategory((open) => !open)}
            aria-expanded={showAddCategory}
          >
            <FiTag /> New category
          </button>
        </div>

        {showAddCategory && (
          <div style={newCategoryRowStyle}>
            <input
              type="text"
              placeholder={`New ${type} category`}
              aria-label={`New ${type} category`}
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  createCategory()
                }
              }}
              autoFocus
            />
            <button type="button" style={smallPrimaryButtonStyle} onClick={createCategory}>
              Add
            </button>
          </div>
        )}
      </div>

      {/* SAVINGS GOAL */}
      {hasSavingsItem && (
        <label style={fieldStyle}>
          <span style={labelStyle}>Savings goal</span>
          <select
            value={savingGoalId}
            onChange={(e) => setSavingGoalId(e.target.value)}
          >
            <option value="">No goal</option>
            {savingGoals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {error && (
        <p style={errorStyle} role="alert">
          {error}
        </p>
      )}

      {/* FOOTER */}
      <div style={footerStyle}>
        <div>
          <div style={hintStyle}>Total</div>
          <div style={{ ...totalStyle, color: accent }}>
            {isIncome ? "+" : "-"}
            {formatMoney(total)}
          </div>
        </div>

        <div style={footerButtonsStyle}>
          {onClose && (
            <button type="button" onClick={onClose} style={cancelButtonStyle}>
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            style={{ ...saveButtonStyle, opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Saving..." : editingExpense ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </form>
  )
}

export default AddExpense

const formStyle = {
  color: "var(--text)",
  padding: 24,
  display: "flex",
  flexDirection: "column",
  gap: 18,
}

const titleStyle = {
  margin: 0,
  paddingRight: 40,
  fontSize: 22,
}

const segmentStyle = {
  display: "flex",
  gap: 4,
  padding: 4,
  borderRadius: 12,
  background: "var(--track)",
}

const segmentButtonStyle = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "10px 12px",
  border: "none",
  borderRadius: 9,
  fontWeight: 600,
}

const fieldGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 12,
}

const fieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  minWidth: 0,
}

const labelStyle = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text-secondary)",
}

const hintStyle = {
  fontSize: 12,
  color: "var(--text-secondary)",
}

const itemsHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
}

const itemCardStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 12,
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "var(--bg)",
}

const itemTopRowStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 130px",
  gap: 8,
}

const itemBottomRowStyle = {
  display: "flex",
  gap: 8,
  alignItems: "center",
}

const amountWrapStyle = {
  position: "relative",
}

const currencyStyle = {
  position: "absolute",
  left: 12,
  top: "50%",
  transform: "translateY(-50%)",
  color: "var(--text-secondary)",
  pointerEvents: "none",
}

const amountInputStyle = {
  paddingLeft: 26,
  fontWeight: 600,
  textAlign: "right",
}

const selectWrapStyle = {
  position: "relative",
  flex: 1,
  minWidth: 0,
}

const selectIconStyle = {
  position: "absolute",
  left: 12,
  top: "50%",
  transform: "translateY(-50%)",
  color: "var(--text-secondary)",
  pointerEvents: "none",
}

const selectStyle = {
  paddingLeft: 34,
  cursor: "pointer",
}

const removeButtonStyle = {
  width: 42,
  height: 42,
  flexShrink: 0,
  padding: 0,
  display: "grid",
  placeItems: "center",
  border: "none",
  borderRadius: 10,
  background: "var(--expense-soft)",
  color: "var(--expense)",
}

const itemActionsStyle = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
}

const dashedButtonStyle = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: 11,
  border: "1.5px dashed var(--border)",
  background: "transparent",
  color: "var(--primary)",
  fontWeight: 600,
}

const linkButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "11px 12px",
  border: "none",
  background: "transparent",
  color: "var(--text-secondary)",
  fontWeight: 500,
}

const newCategoryRowStyle = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 8,
}

const smallPrimaryButtonStyle = {
  border: "none",
  background: "var(--primary)",
  color: "white",
  fontWeight: 600,
}

const noticeStyle = {
  margin: 0,
  padding: "10px 12px",
  borderRadius: 10,
  background: "rgba(234, 179, 8, 0.15)",
  fontSize: 14,
}

const errorStyle = {
  margin: 0,
  padding: "10px 12px",
  borderRadius: 10,
  background: "var(--expense-soft)",
  color: "var(--expense)",
  fontSize: 14,
  fontWeight: 500,
}

const footerStyle = {
  position: "sticky",
  bottom: 0,
  margin: "0 -24px -24px",
  padding: "14px 24px 18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  background: "var(--card)",
  borderTop: "1px solid var(--border)",
}

const totalStyle = {
  fontSize: 22,
  fontWeight: 700,
  lineHeight: 1.2,
}

const footerButtonsStyle = {
  display: "flex",
  gap: 8,
}

const cancelButtonStyle = {
  background: "transparent",
}

const saveButtonStyle = {
  border: "none",
  background: "var(--primary)",
  color: "white",
  fontWeight: 600,
  padding: "0.6em 1.6em",
}
