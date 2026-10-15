import { useEffect, useState } from "react"
import {
  collection,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore"
import { db } from "../firebase"
import { householdId } from "../household"
import { FiCheck, FiX, FiEdit } from "react-icons/fi"
import FutureExpenseForm from "./FutureExpenseForm"
import { parseLocalDate, addMonth, today } from "../money"

function FutureExpenses({ categories = [] }) {
  const [expenses, setExpenses] = useState([])
  const [expenseToDelete, setExpenseToDelete] = useState(null)
  const [expenseToEdit, setExpenseToEdit] = useState(null)
  const [processingId, setProcessingId] = useState(null)

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "households", householdId, "futureExpenses"),
      (snapshot) => {
        setExpenses(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        )
      }
    )

    return () => unsub()
  }, [])

  const startOfToday = () => {
    const t = new Date()
    return new Date(t.getFullYear(), t.getMonth(), t.getDate())
  }

  const startOfNextMonth = () => {
    const t = new Date()
    return new Date(t.getFullYear(), t.getMonth() + 1, 1)
  }

  const getDaysLeft = (dateStr) => {
    if (!dateStr) return null
    const diff = parseLocalDate(dateStr) - startOfToday()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const isOverdue = (dateStr) => {
    if (!dateStr) return false
    return parseLocalDate(dateStr) < startOfToday()
  }

  const shouldShowExpense = (expense) => {
    const dueDate = parseLocalDate(expense.dueDate)
    if (!dueDate) return true

    return dueDate < startOfNextMonth()
  }

  const formatDaysLabel = (daysLeft) => {
    if (daysLeft === 0) return "Today"
    if (daysLeft === 1) return "Tomorrow"
    if (daysLeft < 0) return `${Math.abs(daysLeft)}d ago`
    return `${daysLeft}d`
  }

  const getTagStyle = (daysLeft) => {
    if (daysLeft <= 2) return { background: "var(--expense-soft)", color: "var(--expense)" }
    if (daysLeft <= 5) return { background: "rgba(234, 179, 8, 0.18)", color: "var(--text)" }
    return null
  }

  const visibleExpenses = expenses
    .filter(shouldShowExpense)
    .sort((a, b) => {
      const dateA = parseLocalDate(a.dueDate) || new Date(0)
      const dateB = parseLocalDate(b.dueDate) || new Date(0)
      return dateA - dateB
    })

  const isIncome = (expense) => expense.type === "income"

  const pendingTotal = (income) =>
    visibleExpenses
      .filter((expense) => isIncome(expense) === income)
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0)

  const formatMoney = (value) =>
    `₡${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`

  const markAsPaid = async (expense) => {
    if (processingId === expense.id) return
    setProcessingId(expense.id)

    // Fixed doc ids make a repeat tap (or a second phone) overwrite instead of duplicating.
    const batch = writeBatch(db)
    const futureExpenses = collection(db, "households", householdId, "futureExpenses")

    batch.set(doc(db, "households", householdId, "expenses", `paid-${expense.id}`), {
      transactionMode: "detailed",
      name: expense.name,
      amount: Number(expense.amount),
      category: null,
      items: [
        { name: expense.name, amount: Number(expense.amount), category: expense.category || "" },
      ],
      type: expense.type || "expense",
      date: today(),
      createdAt: Date.now(),
    })

    if (expense.recurring) {
      const recurringMode = expense.recurringMode || "forever"
      const isForever = recurringMode === "forever"
      const monthsRemaining = Number(expense.monthsRemaining || 0)
      const shouldCreateNext = isForever || monthsRemaining > 1
      const nextDate = addMonth(expense.dueDate)
      const seriesId = expense.seriesId || expense.id

      if (shouldCreateNext && nextDate) {
        batch.set(doc(futureExpenses, `${seriesId}-${nextDate}`), {
          type: expense.type || "expense",
          name: expense.name,
          amount: expense.amount,
          category: expense.category,
          dueDate: nextDate,
          recurring: true,
          frequency: "monthly",
          recurringMode,
          monthsRemaining: isForever ? null : monthsRemaining - 1,
          seriesId,
          createdAt: Date.now(),
        })
      }
    }

    batch.delete(doc(futureExpenses, expense.id))

    try {
      await batch.commit()
    } catch (error) {
      console.error("Error marking as paid:", error)
    } finally {
      setProcessingId(null)
    }
  }

  const confirmDelete = async () => {
    try {
      await deleteDoc(
        doc(db, "households", householdId, "futureExpenses", expenseToDelete.id)
      )
      setExpenseToDelete(null)
    } catch (error) {
      console.error("Delete error:", error)
    }
  }

  const handleSaveEdit = async (updatedExpense) => {
    try {
      await updateDoc(
        doc(db, "households", householdId, "futureExpenses", updatedExpense.id),
        {
          type: updatedExpense.type || "expense",
          name: updatedExpense.name,
          amount: updatedExpense.amount,
          category: updatedExpense.category,
          dueDate: updatedExpense.dueDate,
          recurring: updatedExpense.recurring,
          frequency: updatedExpense.recurring ? "monthly" : null,
          recurringMode: updatedExpense.recurring
            ? updatedExpense.recurringMode || "forever"
            : null,
          monthsRemaining:
            updatedExpense.recurring &&
            updatedExpense.recurringMode === "limited"
              ? Number(updatedExpense.monthsRemaining || 1)
              : null,
        }
      )

      setExpenseToEdit(null)
    } catch (error) {
      console.error("Edit error:", error)
    }
  }

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>Upcoming</h2>

      <div style={summaryGridStyle}>
        <div style={summaryBoxStyle}>
          <div style={summaryLabelStyle}>To pay this month</div>
          <div style={{ ...summaryAmountStyle, color: "var(--expense)" }}>
            {formatMoney(pendingTotal(false))}
          </div>
        </div>
        <div style={summaryBoxStyle}>
          <div style={summaryLabelStyle}>To receive this month</div>
          <div style={{ ...summaryAmountStyle, color: "var(--income)" }}>
            {formatMoney(pendingTotal(true))}
          </div>
        </div>
      </div>

      {visibleExpenses.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>
          Nothing pending this month.
        </p>
      ) : (
        <div>
          {visibleExpenses.map((expense) => {
            const daysLeft = getDaysLeft(expense.dueDate)
            const tagStyle = getTagStyle(daysLeft)
            const overdue = isOverdue(expense.dueDate)
            const income = isIncome(expense)

            return (
              <div
                key={expense.id}
                style={{
                  ...cardStyle,
                  ...(overdue && overdueCardStyle),
                }}
              >
                <div style={rowStyle}>
                  <strong style={nameStyle}>{expense.name}</strong>

                  <div style={iconRowStyle}>
                    <button
                      style={{ ...iconButtonStyle, color: "var(--income)" }}
                      disabled={processingId === expense.id}
                      onClick={() => markAsPaid(expense)}
                      title={income ? "Mark as received" : "Mark as paid"}
                      aria-label={income ? "Mark as received" : "Mark as paid"}
                    >
                      <FiCheck size={17} />
                    </button>

                    <button
                      style={iconButtonStyle}
                      onClick={() => setExpenseToEdit(expense)}
                      title="Edit"
                      aria-label="Edit"
                    >
                      <FiEdit size={16} />
                    </button>

                    <button
                      style={{ ...iconButtonStyle, color: "var(--expense)" }}
                      onClick={() => setExpenseToDelete(expense)}
                      title="Delete"
                      aria-label="Delete"
                    >
                      <FiX size={17} />
                    </button>
                  </div>
                </div>

                <div style={rowStyle}>
                  <div style={metaStyle}>
                    <span
                      style={{
                        ...typePillStyle,
                        color: income ? "var(--income)" : "var(--expense)",
                        background: income ? "var(--income-soft)" : "var(--expense-soft)",
                      }}
                    >
                      {income ? "Income" : "Expense"}
                    </span>
                    {expense.category || "No category"} ·{" "}
                    <span style={{ color: overdue ? "var(--expense)" : "inherit" }}>
                      {expense.dueDate
                        ? parseLocalDate(expense.dueDate).toLocaleDateString()
                        : "No date"}
                    </span>

                    {daysLeft !== null && daysLeft <= 5 && tagStyle && (
                      <span
                        style={{
                          marginLeft: 8,
                          padding: "2px 6px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          ...tagStyle,
                        }}
                      >
                        {formatDaysLabel(daysLeft)}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      ...amountStyle,
                      color: income ? "var(--income)" : "var(--expense)",
                    }}
                  >
                    {income ? "+" : "-"}
                    {formatMoney(expense.amount)}
                  </div>
                </div>

                {expense.recurring && (
                  <small style={{ color: "var(--text-secondary)" }}>
                    Repeats monthly{" "}
                    {(expense.recurringMode || "forever") === "limited"
                      ? `(${expense.monthsRemaining || 0} months left)`
                      : "(no end date)"}
                  </small>
                )}
              </div>
            )
          })}
        </div>
      )}

      {expenseToDelete && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <p style={{ marginTop: 0 }}>Delete "{expenseToDelete.name}"?</p>

            <div style={{ marginTop: 20, textAlign: "right" }}>
              <button onClick={() => setExpenseToDelete(null)}>
                Cancel
              </button>
              <button onClick={confirmDelete} style={deleteButtonStyle}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {expenseToEdit && (
        <div style={overlayStyle} onClick={() => setExpenseToEdit(null)}>
          <div
            style={{ ...modalStyle, width: "min(420px, 92vw)", padding: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <FutureExpenseForm
              categories={categories}
              editingExpense={expenseToEdit}
              onSave={handleSaveEdit}
              onClose={() => setExpenseToEdit(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default FutureExpenses

const containerStyle = {
  padding: "clamp(12px, 4vw, 24px)",
  maxWidth: 760,
  margin: "0 auto",
}

const titleStyle = {
  margin: "0 0 16px",
  fontSize: 24,
  color: "var(--text)",
}

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 12,
  marginBottom: 18,
}

const summaryBoxStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  boxShadow: "var(--shadow)",
  padding: "16px 18px",
}

const summaryLabelStyle = {
  color: "var(--text-secondary)",
  fontSize: 13,
  fontWeight: 500,
  marginBottom: 6,
}

const summaryAmountStyle = {
  fontSize: 22,
  fontWeight: 700,
  overflowWrap: "anywhere",
}

const cardStyle = {
  background: "var(--card)",
  padding: "16px 18px",
  borderRadius: 16,
  marginBottom: 12,
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
  display: "flex",
  flexDirection: "column",
  gap: 8,
}

const overdueCardStyle = {
  border: "1px solid var(--expense)",
  background: "var(--expense-soft)",
}

const rowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
}

const nameStyle = {
  color: "var(--text)",
  fontSize: 16,
  fontWeight: 600,
}

const iconRowStyle = {
  display: "flex",
  gap: 4,
}

const iconButtonStyle = {
  width: 36,
  height: 36,
  padding: 0,
  display: "grid",
  placeItems: "center",
  border: "none",
  borderRadius: 10,
  background: "transparent",
  color: "var(--text-secondary)",
}

const typePillStyle = {
  display: "inline-block",
  marginRight: 8,
  padding: "1px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
}

const metaStyle = {
  color: "var(--text-secondary)",
  fontSize: 13,
}

const amountStyle = {
  fontWeight: 700,
  fontSize: 16,
  whiteSpace: "nowrap",
}

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
}

const modalStyle = {
  background: "var(--card)",
  color: "var(--text)",
  padding: 24,
  borderRadius: 16,
  width: "min(320px, 92vw)",
  boxShadow: "0 12px 30px rgba(0,0,0,0.3)",
}

const deleteButtonStyle = {
  marginLeft: 10,
  background: "var(--expense)",
  color: "white",
  border: "none",
}
