import { useState } from "react"
import AddExpense from "./AddExpense"
import { doc, deleteDoc, updateDoc } from "firebase/firestore"
import { db } from "../firebase"
import { householdId } from "../household"
import { FiCheck, FiEdit2, FiX } from "react-icons/fi"
import { parseLocalDate, expenseTotal as getExpenseTotal, transactionLabel } from "../money"
import ReviewTag from "../components/ReviewTag"

const RECENT_DAYS = 30

function Dashboard({ categories, expenses }) {
  const [editingExpense, setEditingExpense] = useState(null)
  const [expenseToDelete, setExpenseToDelete] = useState(null)

  const formatDate = (dateStr) => {
    const date = parseLocalDate(dateStr)
    return date ? date.toLocaleDateString() : "No date"
  }

  const isRecentTransaction = (expense) => {
    if (!expense.date) return true

    const expenseDate = parseLocalDate(expense.date)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - RECENT_DAYS)

    return expenseDate >= cutoff
  }

  const confirmDelete = async () => {
    try {
      await deleteDoc(
        doc(
          db,
          "households",
          householdId,
          "expenses",
          expenseToDelete.id
        )
      )

      setExpenseToDelete(null)
    } catch (error) {
      console.error("Delete error:", error)
    }
  }

  // Confirms an imported transaction as-is (category and amount already right).
  const confirmReview = async (expense) => {
    try {
      await updateDoc(doc(db, "households", householdId, "expenses", expense.id), {
        needsReview: false,
      })
    } catch (error) {
      console.error("Review error:", error)
    }
  }

  const reviewCount = expenses.filter((expense) => expense.needsReview).length

  const sortedExpenses = [...expenses].sort((a, b) => {
    const dateA = parseLocalDate(a.date) || new Date(0)
    const dateB = parseLocalDate(b.date) || new Date(0)
    return dateB - dateA
  })

  const recentExpenses = sortedExpenses.filter(isRecentTransaction)
  const hiddenCount = sortedExpenses.length - recentExpenses.length

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>Dashboard</h2>

      {reviewCount > 0 && (
        <p style={reviewBannerStyle}>
          {reviewCount} imported {reviewCount === 1 ? "transaction needs" : "transactions need"} a
          quick check. Tap ✓ if it looks right, or ✎ to change it.
        </p>
      )}

      {hiddenCount > 0 && (
        <p style={hintStyle}>
          Showing transactions from the last {RECENT_DAYS} days. Older
          transactions are available in Settings → History.
        </p>
      )}

      {recentExpenses.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>
          No recent transactions.
        </p>
      ) : (
        <div>
          {recentExpenses.map((expense) => (
            <div key={expense.id} style={cardStyle}>
              <div style={rowStyle}>
                <strong style={nameStyle}>
                  {expense.name}
                </strong>

                <div style={iconRowStyle}>
                  {/* USD imports have no colones amount yet, so they must go through the form. */}
                  {expense.needsReview && expense.currency !== "USD" && (
                    <button
                      style={{ ...iconButtonStyle, color: "var(--income)" }}
                      onClick={() => confirmReview(expense)}
                      title="Looks right"
                      aria-label={`Confirm ${expense.name}`}
                    >
                      <FiCheck size={17} />
                    </button>
                  )}

                  <button
                    style={iconButtonStyle}
                    onClick={() => setEditingExpense(expense)}
                    title="Edit"
                    aria-label={`Edit ${expense.name}`}
                  >
                    <FiEdit2 size={15} />
                  </button>

                  <button
                    style={{ ...iconButtonStyle, color: "var(--expense)" }}
                    onClick={() => setExpenseToDelete(expense)}
                    title="Delete"
                    aria-label={`Delete ${expense.name}`}
                  >
                    <FiX size={17} />
                  </button>
                </div>
              </div>

              <div style={rowStyle}>
                <div style={metaStyle}>
                  <ReviewTag expense={expense} />
                  {transactionLabel(expense)}

                  {" | "}

                  {formatDate(expense.date)}
                </div>

                <div
                  style={{
                    ...amountStyle,
                    color:
                      expense.type === "income"
                        ? "var(--income)"
                        : "var(--expense)",
                  }}
                >
                  ₡
                  {getExpenseTotal(expense).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>

              {expense.transactionMode === "detailed" &&
                expense.items?.length > 1 && (
                  <div style={itemsContainerStyle}>
                    {expense.items.map((item, index) => (
                      <div key={index} style={itemRowStyle}>
                        <span>{item.name}</span>
                        <span>{item.category}</span>
                        <span>
                          ₡{Number(item.amount).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          ))}
        </div>
      )}

      {editingExpense && (
        <div
          style={overlayStyle}
          onClick={() => setEditingExpense(null)}
        >
          <div
            style={editModalStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              style={closeButtonStyle}
              onClick={() => setEditingExpense(null)}
            >
              ×
            </button>

            <AddExpense
              categories={categories}
              editingExpense={editingExpense}
              onClose={() => setEditingExpense(null)}
            />
          </div>
        </div>
      )}

      {expenseToDelete && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <p>Are you sure you want to delete this transaction?</p>

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
    </div>
  )
}

export default Dashboard

const containerStyle = {
  padding: 20,
  maxWidth: 700,
  margin: "0 auto",
}

const titleStyle = {
  marginBottom: 10,
  color: "var(--text)",
}

const hintStyle = {
  marginBottom: 20,
  color: "var(--text-secondary)",
  fontSize: 13,
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

const reviewBannerStyle = {
  margin: "0 0 16px",
  padding: "10px 14px",
  borderRadius: 12,
  background: "rgba(234, 179, 8, 0.15)",
  color: "var(--text)",
  fontSize: 14,
}

const metaStyle = {
  color: "var(--text-secondary)",
  fontSize: 13,
}

const amountStyle = {
  fontWeight: "bold",
  fontSize: 16,
}

const itemsContainerStyle = {
  marginTop: 8,
  borderTop: "1px solid var(--border)",
  paddingTop: 10,
  display: "flex",
  flexDirection: "column",
  gap: 6,
}

const itemRowStyle = {
  display: "grid",
  gridTemplateColumns: "1fr auto auto",
  gap: 12,
  fontSize: 13,
  color: "var(--text-secondary)",
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
  padding: 20,
}

const editModalStyle = {
  background: "var(--card)",
  width: "100%",
  maxWidth: 550,
  maxHeight: "90vh",
  overflowY: "auto",
  borderRadius: 16,
  boxShadow: "0 12px 30px rgba(0,0,0,0.3)",
  position: "relative",
}

const closeButtonStyle = {
  position: "absolute",
  top: 12,
  right: 12,
  width: 32,
  height: 32,
  border: "none",
  borderRadius: "50%",
  background: "var(--border)",
  color: "var(--text)",
  cursor: "pointer",
  fontSize: 18,
  zIndex: 10,
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
  background: "var(--expense)",
  color: "white",
  border: "none",
  padding: "6px 12px",
  borderRadius: 6,
  cursor: "pointer",
}