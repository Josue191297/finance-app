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
    if (daysLeft < 0) return { background: "#fee2e2", color: "#b91c1c" }
    if (daysLeft <= 2) return { background: "#fee2e2", color: "#b91c1c" }
    if (daysLeft <= 5) return { background: "#fef9c3", color: "#92400e" }
    return null
  }

  const visibleExpenses = expenses
    .filter(shouldShowExpense)
    .sort((a, b) => {
      const dateA = parseLocalDate(a.dueDate) || new Date(0)
      const dateB = parseLocalDate(b.dueDate) || new Date(0)
      return dateA - dateB
    })

  const pendingTotal = visibleExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  )

  const markAsPaid = async (expense) => {
    if (processingId === expense.id) return
    setProcessingId(expense.id)

    // Fixed doc ids make a repeat tap (or a second phone) overwrite instead of duplicating.
    const batch = writeBatch(db)
    const futureExpenses = collection(db, "households", householdId, "futureExpenses")

    batch.set(doc(db, "households", householdId, "expenses", `paid-${expense.id}`), {
      name: expense.name,
      amount: expense.amount,
      category: expense.category,
      type: "expense",
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
      <h2 style={titleStyle}>Future Expenses</h2>

      <div style={summaryBoxStyle}>
        <div style={summaryLabelStyle}>Pending This Month</div>
        <div style={summaryAmountStyle}>
          ₡
          {pendingTotal.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </div>

      {visibleExpenses.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>
          No pending expenses for this month.
        </p>
      ) : (
        <div>
          {visibleExpenses.map((expense) => {
            const daysLeft = getDaysLeft(expense.dueDate)
            const tagStyle = getTagStyle(daysLeft)
            const overdue = isOverdue(expense.dueDate)

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
                    <FiCheck
                      size={15}
                      style={{
                        ...iconStyle,
                        color: "#0b910b",
                        opacity: processingId === expense.id ? 0.4 : 1,
                        pointerEvents:
                          processingId === expense.id ? "none" : "auto",
                      }}
                      onClick={() => markAsPaid(expense)}
                    />

                    <FiEdit
                      size={15}
                      style={iconStyle}
                      onClick={() => setExpenseToEdit(expense)}
                    />

                    <FiX
                      size={15}
                      style={deleteIconStyle}
                      onClick={() => setExpenseToDelete(expense)}
                    />
                  </div>
                </div>

                <div style={rowStyle}>
                  <div style={metaStyle}>
                    {expense.category || "No category"} |{" "}
                    <span style={{ color: overdue ? "#ef4444" : "inherit" }}>
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

                  <div style={amountStyle}>
                    ₡
                    {Number(expense.amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>

                {expense.recurring && (
                  <small style={{ opacity: 0.7 }}>
                    Monthly recurring{" "}
                    {(expense.recurringMode || "forever") === "limited"
                      ? `(${expense.monthsRemaining || 0} months left)`
                      : "(forever)"}
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
            <p>Are you sure you want to delete this expense?</p>

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
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, width: 400 }}>
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
  padding: 20,
  maxWidth: 700,
  margin: "0 auto",
}

const titleStyle = {
  marginBottom: 20,
  color: "var(--text)",
}

const summaryBoxStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: "18px 20px",
  marginBottom: 18,
}

const summaryLabelStyle = {
  color: "var(--text-secondary)",
  fontSize: 13,
  marginBottom: 6,
}

const summaryAmountStyle = {
  color: "var(--text)",
  fontSize: 26,
  fontWeight: 700,
}

const cardStyle = {
  background: "var(--card)",
  padding: "18px 20px",
  borderRadius: 14,
  marginBottom: 16,
  border: "1px solid var(--border)",
  display: "flex",
  flexDirection: "column",
  gap: 10,
}

const overdueCardStyle = {
  border: "1px solid #ef4444",
  background: "rgba(239,68,68,0.08)",
}

const rowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
}

const nameStyle = {
  color: "var(--text)",
  fontSize: 16,
  fontWeight: 600,
}

const iconRowStyle = {
  display: "flex",
  gap: 12,
}

const iconStyle = {
  cursor: "pointer",
  opacity: 0.7,
  transition: "0.2s",
}

const deleteIconStyle = {
  cursor: "pointer",
  opacity: 0.7,
  transition: "0.2s",
}

const metaStyle = {
  color: "var(--text-secondary)",
  fontSize: 13,
}

const amountStyle = {
  fontWeight: "bold",
  fontSize: 16,
}

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
}

const modalStyle = {
  background: "var(--card)",
  color: "var(--text)",
  padding: 30,
  borderRadius: 12,
  width: 300,
  boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
}

const deleteButtonStyle = {
  marginLeft: 10,
  background: "#ff4d4f",
  color: "white",
  border: "none",
  padding: "6px 12px",
  borderRadius: 6,
}