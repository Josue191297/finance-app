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
import { today } from "../money"

function AddExpense({
  categories = [],
  editingExpense,
  onClose,
  onAdd,
}) {
  // The form is mounted fresh for each edit, so state starts from editingExpense.
  const editingDetailed =
    editingExpense?.transactionMode === "detailed" &&
    editingExpense.items?.length > 0

  const [name, setName] = useState(editingExpense?.name || "")
  const [amount, setAmount] = useState(editingExpense?.amount || "")
  const [category, setCategory] = useState(editingExpense?.category || "")
  const [type, setType] = useState(editingExpense?.type || "expense")
  const [date, setDate] = useState(editingExpense?.date || today())
  const [transactionMode, setTransactionMode] = useState(
    editingDetailed ? "detailed" : "simple"
  )
  const [savingGoals, setSavingGoals] = useState([])
  const [savingGoalId, setSavingGoalId] = useState(
    editingExpense?.savingGoalId || ""
  )

  const [items, setItems] = useState(
    editingDetailed
      ? editingExpense.items
      : [{ name: "", amount: "", category: "" }]
  )

  const [newCategory, setNewCategory] = useState("")
  const [showAddCategory, setShowAddCategory] = useState(false)

  const getItemsTotal = (itemsToTotal = items) =>
    itemsToTotal.reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const isSavingsCategory = (value) =>
    value?.trim().toLowerCase() === "savings"

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

  const filteredCategories = categories.filter(
    (cat) => (cat.type || "expense") === type
  )

  const handleTypeChange = (newType) => {
    if (newType === type) return

    setType(newType)
    setCategory("")
    setSavingGoalId("")
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        category: "",
      }))
    )
    setShowAddCategory(false)
  }

  const handleCategoryChange = (value) => {
    setCategory(value)

    if (!isSavingsCategory(value)) {
      setSavingGoalId("")
    }
  }

  const handleTransactionModeChange = (newMode) => {
    if (newMode === transactionMode) return

    if (newMode === "detailed") {
      const quickAmount = Number(amount || 0)

      setItems([
        {
          name: name || "",
          amount: quickAmount > 0 ? String(quickAmount) : "",
          category,
        },
      ])
    } else {
      const total = getItemsTotal()
      const usedCategories = [
        ...new Set(items.map((item) => item.category).filter(Boolean)),
      ]
      const nextCategory =
        usedCategories.length === 1 ? usedCategories[0] : category

      setAmount(total > 0 ? String(total) : "")
      setCategory(nextCategory)

      if (!isSavingsCategory(nextCategory)) {
        setSavingGoalId("")
      }
    }

    setTransactionMode(newMode)
    setShowAddCategory(false)
  }

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { name: "", amount: "", category: "" },
    ])
  }

  const updateItem = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, [field]: value }
          : item
      )
    )
  }

  const removeItem = (index) => {
    setItems((prev) =>
      prev.filter((_, i) => i !== index)
    )
  }

  const createCategory = async () => {
    const categoryName = newCategory.trim()
    if (!categoryName) return

    try {
      await addDoc(
        collection(
          db,
          "households",
          householdId,
          "categories"
        ),
        {
          name: categoryName,
          type,
          createdAt: Date.now(),
        }
      )

      setCategory(categoryName)

      if (!isSavingsCategory(categoryName)) {
        setSavingGoalId("")
      }

      setItems((prev) =>
        prev.map((item) =>
          item.category
            ? item
            : { ...item, category: categoryName }
        )
      )

      setNewCategory("")
      setShowAddCategory(false)
    } catch (error) {
      console.error("Error creating category:", error)
    }
  }

  const selectedSavingGoal = savingGoals.find(
    (goal) => goal.id === savingGoalId
  )

  const buildSavingGoalFields = () => {
    const shouldLinkSavingGoal =
      type === "expense" &&
      transactionMode === "simple" &&
      isSavingsCategory(category)

    return {
      savingGoalId: shouldLinkSavingGoal ? savingGoalId || null : null,
      savingGoalName: shouldLinkSavingGoal
        ? selectedSavingGoal?.name || ""
        : null,
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!name.trim()) return

    let expenseData

    if (transactionMode === "simple") {
      if (!amount) return

      expenseData = {
        transactionMode: "simple",
        name,
        amount: Number(amount),
        category,
        type,
        date,
        items: null,
        ...buildSavingGoalFields(),
      }
    } else {
      const cleanedItems = items.filter(
        (item) =>
          item.name.trim() &&
          Number(item.amount) > 0
      )

      if (cleanedItems.length === 0) return

      expenseData = {
        transactionMode: "detailed",
        name,
        category: null,
        type,
        date,
        items: cleanedItems,
        amount: getItemsTotal(cleanedItems),
        savingGoalId: null,
        savingGoalName: null,
      }
    }

    try {
      if (editingExpense) {
        await updateDoc(
          doc(
            db,
            "households",
            householdId,
            "expenses",
            editingExpense.id
          ),
          expenseData
        )
      } else if (onAdd) {
        await onAdd(expenseData)
      } else {
        await addDoc(
          collection(
            db,
            "households",
            householdId,
            "expenses"
          ),
          expenseData
        )
      }

      setName("")
      setAmount("")
      setCategory("")
      setSavingGoalId("")
      setType("expense")
      setDate(today())
      setTransactionMode("simple")
      setItems([{ name: "", amount: "", category: "" }])
      setShowAddCategory(false)

      if (onClose) onClose()
    } catch (error) {
      console.error("Error saving transaction:", error)
    }
  }

  const detailedTotal = getItemsTotal()

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <h2 style={titleStyle}>
        {editingExpense ? "Edit Transaction" : "Add Transaction"}
      </h2>

      <div style={modeRowStyle}>
        <button
          type="button"
          style={{
            ...modeButtonStyle,
            background:
              transactionMode === "simple"
                ? "#1677ff"
                : "var(--card)",
            color:
              transactionMode === "simple"
                ? "white"
                : "var(--text)",
          }}
          onClick={() =>
            handleTransactionModeChange("simple")
          }
        >
          Quick
        </button>

        <button
          type="button"
          style={{
            ...modeButtonStyle,
            background:
              transactionMode === "detailed"
                ? "#1677ff"
                : "var(--card)",
            color:
              transactionMode === "detailed"
                ? "white"
                : "var(--text)",
          }}
          onClick={() =>
            handleTransactionModeChange("detailed")
          }
        >
          Detailed Receipt
        </button>
      </div>

      <div style={modeRowStyle}>
        <button
          type="button"
          style={{
            ...modeButtonStyle,
            background:
              type === "expense"
                ? "#ef4444"
                : "var(--card)",
            color:
              type === "expense"
                ? "white"
                : "var(--text)",
            border:
              type === "expense"
                ? "none"
                : "1px solid var(--border)",
          }}
          onClick={() =>
            handleTypeChange("expense")
          }
        >
          Expense
        </button>

        <button
          type="button"
          style={{
            ...modeButtonStyle,
            background:
              type === "income"
                ? "#16a34a"
                : "var(--card)",
            color:
              type === "income"
                ? "white"
                : "var(--text)",
            border:
              type === "income"
                ? "none"
                : "1px solid var(--border)",
          }}
          onClick={() =>
            handleTypeChange("income")
          }
        >
          Income
        </button>
      </div>

      <input
        type="text"
        placeholder={
          transactionMode === "simple"
            ? "Name"
            : "Store Name"
        }
        value={name}
        onChange={(e) =>
          setName(e.target.value)
        }
        style={inputStyle}
      />

      {transactionMode === "simple" && (
        <>
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value)
            }
            style={inputStyle}
          />

          <div style={categoryRowStyle}>
            <select
              value={category}
              onChange={(e) =>
                handleCategoryChange(e.target.value)
              }
              style={selectStyle}
            >
              <option value="">
                Select Category
              </option>

              {filteredCategories.map((cat) => (
                <option
                  key={cat.id}
                  value={cat.name}
                >
                  {cat.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              style={quickAddButtonStyle}
              onClick={() =>
                setShowAddCategory(!showAddCategory)
              }
              title="New category"
            >
              +
            </button>
          </div>

          {type === "expense" && isSavingsCategory(category) && (
            <select
              value={savingGoalId}
              onChange={(e) =>
                setSavingGoalId(e.target.value)
              }
              style={selectStyle}
            >
              <option value="">
                Select saving goal
              </option>

              {savingGoals.map((goal) => (
                <option
                  key={goal.id}
                  value={goal.id}
                >
                  {goal.name}
                </option>
              ))}
            </select>
          )}
        </>
      )}

      {showAddCategory && (
        <div style={quickAddRowStyle}>
          <input
            type="text"
            placeholder={`New ${type} category`}
            value={newCategory}
            onChange={(e) =>
              setNewCategory(e.target.value)
            }
            style={inputStyle}
          />

          <button
            type="button"
            style={buttonStyle}
            onClick={createCategory}
          >
            Add
          </button>
        </div>
      )}

      {transactionMode === "detailed" && (
        <>
          {items.map((item, index) => (
            <div
              key={index}
              style={itemCardStyle}
            >
              <div style={detailItemRowStyle}>
                <input
                  style={detailNameInputStyle}
                  placeholder="Item name"
                  value={item.name}
                  onChange={(e) =>
                    updateItem(
                      index,
                      "name",
                      e.target.value
                    )
                  }
                />

                <input
                  style={detailAmountInputStyle}
                  type="number"
                  placeholder="Amount"
                  value={item.amount}
                  onChange={(e) =>
                    updateItem(
                      index,
                      "amount",
                      e.target.value
                    )
                  }
                />

                <select
                  style={detailCategorySelectStyle}
                  value={item.category}
                  onChange={(e) =>
                    updateItem(
                      index,
                      "category",
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    Category
                  </option>

                  {filteredCategories.map((cat) => (
                    <option
                      key={cat.id}
                      value={cat.name}
                    >
                      {cat.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  style={detailQuickAddButtonStyle}
                  onClick={() =>
                    setShowAddCategory(!showAddCategory)
                  }
                  title="New category"
                >
                  +
                </button>

                {items.length > 1 && (
                  <button
                    type="button"
                    style={detailRemoveButtonStyle}
                    onClick={() => removeItem(index)}
                    title="Remove item"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}

          <button
            type="button"
            style={buttonStyle}
            onClick={addItem}
          >
            Add Item
          </button>

          <div style={totalStyle}>
            Total: ₡{detailedTotal.toLocaleString()}
          </div>
        </>
      )}

      <input
        type="date"
        required
        value={date}
        onChange={(e) =>
          setDate(e.target.value)
        }
        style={inputStyle}
      />

      <div style={buttonRowStyle}>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={cancelButtonStyle}
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          style={buttonStyle}
        >
          {editingExpense ? "Update" : "Add"}
        </button>
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
}

const buttonRowStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
}

const buttonStyle = {
  padding: "12px 20px",
  borderRadius: 10,
  border: "none",
  background: "#1677ff",
  color: "white",
  cursor: "pointer",
  fontWeight: 600,
}

const cancelButtonStyle = {
  padding: "12px 20px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text)",
  cursor: "pointer",
}

const modeRowStyle = {
  display: "flex",
  gap: 10,
}

const modeButtonStyle = {
  flex: 1,
  padding: 12,
  borderRadius: 10,
  border: "1px solid var(--border)",
  cursor: "pointer",
}

const categoryRowStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 48px",
  gap: 10,
}

const quickAddRowStyle = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 10,
}

const quickAddButtonStyle = {
  height: 46,
  borderRadius: 10,
  border: "none",
  background: "#1677ff",
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
}

const itemCardStyle = {
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 10,
  display: "flex",
  flexDirection: "column",
  gap: 10,
}

const detailItemRowStyle = {
  display: "grid",
  gridTemplateColumns:
    "minmax(120px, 1.4fr) minmax(80px, 0.8fr) minmax(110px, 1fr) 42px 42px",
  gap: 8,
  alignItems: "center",
}

const detailNameInputStyle = {
  ...inputStyle,
  minWidth: 0,
}

const detailAmountInputStyle = {
  ...inputStyle,
  minWidth: 0,
}

const detailCategorySelectStyle = {
  ...selectStyle,
  minWidth: 0,
}

const detailQuickAddButtonStyle = {
  height: 42,
  width: 42,
  padding: 0,
  borderRadius: 8,
  border: "none",
  background: "#1677ff",
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
}

const detailRemoveButtonStyle = {
  height: 42,
  width: 42,
  padding: 0,
  borderRadius: 8,
  border: "none",
  background: "#ef4444",
  color: "white",
  cursor: "pointer",
  fontSize: 18,
  lineHeight: 1,
}

const totalStyle = {
  fontWeight: "bold",
  fontSize: 18,
}