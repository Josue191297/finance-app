import { useState } from "react"
import { useNavigate } from "react-router-dom"
import AddExpense from "./AddExpense"
import { doc, deleteDoc, updateDoc } from "firebase/firestore"
import { db, saveInBackground } from "../firebase"
import { householdId } from "../household"
import { FiCheck, FiEdit2, FiX, FiChevronRight } from "react-icons/fi"
import { parseLocalDate, dayLabel, groupConsecutive } from "../money"
import TransactionRow from "../components/TransactionRow"
import ConfirmModal from "../components/ConfirmModal"

const RECENT_DAYS = 30

function Dashboard({ categories, expenses }) {
  const navigate = useNavigate()
  const [editingExpense, setEditingExpense] = useState(null)
  const [expenseToDelete, setExpenseToDelete] = useState(null)

  const expenseRef = (expense) =>
    doc(db, "households", householdId, "expenses", expense.id)

  const confirmDelete = () => {
    saveInBackground(deleteDoc(expenseRef(expenseToDelete)), "deletion")
    setExpenseToDelete(null)
  }

  // Confirms an imported transaction as-is (category and amount already right).
  const confirmReview = (expense) => {
    saveInBackground(updateDoc(expenseRef(expense), { needsReview: false }), "review")
  }

  const reviewCount = expenses.filter((expense) => expense.needsReview).length

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - RECENT_DAYS)

  const recentExpenses = expenses
    .filter((expense) => !expense.date || parseLocalDate(expense.date) >= cutoff)
    .sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || 0) - (a.createdAt || 0))

  const days = groupConsecutive(recentExpenses, (expense) => expense.date || "")
  const hasOlder = recentExpenses.length < expenses.length

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>Home</h2>

      {reviewCount > 0 && (
        <p style={reviewBannerStyle}>
          {reviewCount} imported {reviewCount === 1 ? "transaction needs" : "transactions need"} a
          quick check. Tap ✓ if it looks right, or ✎ to change it.
        </p>
      )}

      {days.length === 0 ? (
        <div style={emptyStyle}>
          <p style={{ margin: 0, fontWeight: 600 }}>No transactions in the last {RECENT_DAYS} days</p>
          <p style={{ margin: "4px 0 0" }}>Tap + to add one.</p>
        </div>
      ) : (
        days.map((day) => (
          <section key={day.key} style={{ marginBottom: 18 }}>
            <h3 style={dayTitleStyle}>{dayLabel(day.key)}</h3>
            <div style={groupCardStyle}>
              {day.items.map((expense, index) => (
                <div
                  key={expense.id}
                  style={index > 0 ? { borderTop: "1px solid var(--border)" } : undefined}
                >
                  <TransactionRow
                    expense={expense}
                    actions={
                      <>
                        {/* USD imports have no colones amount yet, so they must go through the form. */}
                        {expense.needsReview && expense.currency !== "USD" && (
                          <button
                            style={{ ...actionStyle, color: "var(--income)" }}
                            onClick={() => confirmReview(expense)}
                            title="Looks right"
                            aria-label={`Confirm ${expense.name}`}
                          >
                            <FiCheck size={17} />
                          </button>
                        )}
                        <button
                          style={actionStyle}
                          onClick={() => setEditingExpense(expense)}
                          title="Edit"
                          aria-label={`Edit ${expense.name}`}
                        >
                          <FiEdit2 size={15} />
                        </button>
                        <button
                          style={{ ...actionStyle, color: "var(--expense)" }}
                          onClick={() => setExpenseToDelete(expense)}
                          title="Delete"
                          aria-label={`Delete ${expense.name}`}
                        >
                          <FiX size={17} />
                        </button>
                      </>
                    }
                  />
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      {hasOlder && (
        <button style={historyLinkStyle} onClick={() => navigate("/history")}>
          See older transactions in History <FiChevronRight aria-hidden="true" />
        </button>
      )}

      {editingExpense && (
        <div style={overlayStyle} onClick={() => setEditingExpense(null)}>
          <div style={editModalStyle} onClick={(e) => e.stopPropagation()}>
            <button
              style={closeButtonStyle}
              onClick={() => setEditingExpense(null)}
              aria-label="Close"
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
        <ConfirmModal
          title="Delete transaction?"
          message={`"${expenseToDelete.name}" will be removed from your history and totals.`}
          onConfirm={confirmDelete}
          onCancel={() => setExpenseToDelete(null)}
        />
      )}
    </div>
  )
}

export default Dashboard

const containerStyle = {
  padding: "clamp(12px, 4vw, 24px)",
  maxWidth: 760,
  margin: "0 auto",
  color: "var(--text)",
}

const titleStyle = {
  margin: "0 0 16px",
  fontSize: 24,
}

const reviewBannerStyle = {
  margin: "0 0 16px",
  padding: "10px 14px",
  borderRadius: 12,
  background: "rgba(234, 179, 8, 0.15)",
  fontSize: 14,
}

const dayTitleStyle = {
  margin: "0 0 8px 4px",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text-secondary)",
}

const groupCardStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  boxShadow: "var(--shadow)",
  overflow: "hidden",
}

const actionStyle = {
  width: 32,
  height: 32,
  padding: 0,
  display: "grid",
  placeItems: "center",
  border: "none",
  borderRadius: 9,
  background: "transparent",
  color: "var(--text-secondary)",
}

const emptyStyle = {
  padding: "28px 16px",
  textAlign: "center",
  color: "var(--text-secondary)",
  background: "var(--card)",
  border: "1px dashed var(--border)",
  borderRadius: 16,
}

const historyLinkStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  width: "100%",
  marginTop: 4,
  border: "none",
  background: "transparent",
  color: "var(--primary)",
  fontWeight: 600,
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: 16,
}

const editModalStyle = {
  background: "var(--card)",
  width: "100%",
  maxWidth: 550,
  maxHeight: "90vh",
  overflowY: "auto",
  borderRadius: 18,
  boxShadow: "0 12px 30px rgba(0,0,0,0.3)",
  position: "relative",
}

const closeButtonStyle = {
  position: "absolute",
  top: 14,
  right: 14,
  width: 34,
  height: 34,
  padding: 0,
  border: "none",
  borderRadius: "50%",
  background: "var(--track)",
  color: "var(--text)",
  fontSize: 20,
  lineHeight: 1,
  zIndex: 10,
}
