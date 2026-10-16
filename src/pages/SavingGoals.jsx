import { useEffect, useMemo, useState } from "react"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore"
import { db, saveInBackground } from "../firebase"
import { householdId } from "../household"
import { savingsAmount, formatMoney, parseLocalDate } from "../money"
import { FiEdit2, FiX, FiPlus, FiCheckCircle } from "react-icons/fi"
import ConfirmModal from "../components/ConfirmModal"

const goalsCollection = () => collection(db, "households", householdId, "savingGoals")

function SavingsGoals({ expenses }) {
  const [goals, setGoals] = useState([])
  const [formGoal, setFormGoal] = useState(null) // {} for a new goal, the goal when editing
  const [goalToDelete, setGoalToDelete] = useState(null)

  useEffect(() => {
    const unsubscribe = onSnapshot(
      goalsCollection(),
      (snapshot) => {
        setGoals(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
      },
      (error) => console.error("Savings goals snapshot error:", error)
    )
    return () => unsubscribe()
  }, [])

  const goalsWithProgress = useMemo(
    () =>
      goals.map((goal) => {
        const savedAmount = expenses
          .filter((expense) => expense.type === "expense" && expense.savingGoalId === goal.id)
          .reduce((sum, expense) => sum + savingsAmount(expense), 0)
        const target = Number(goal.targetAmount || 0)

        return {
          ...goal,
          savedAmount,
          target,
          percent: target > 0 ? Math.min((savedAmount / target) * 100, 100) : 0,
          remaining: target > 0 ? Math.max(target - savedAmount, 0) : null,
        }
      }),
    [goals, expenses]
  )

  const totalSaved = goalsWithProgress.reduce((sum, goal) => sum + goal.savedAmount, 0)

  const confirmDelete = () => {
    saveInBackground(deleteDoc(doc(goalsCollection(), goalToDelete.id)), "goal deletion")
    setGoalToDelete(null)
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>Goals</h2>
        <button style={newGoalButtonStyle} onClick={() => setFormGoal({})}>
          <FiPlus aria-hidden="true" /> New goal
        </button>
      </div>

      {goalsWithProgress.length > 0 && (
        <div style={totalCardStyle}>
          <div style={totalLabelStyle}>Saved across all goals</div>
          <div style={totalAmountStyle}>{formatMoney(totalSaved)}</div>
        </div>
      )}

      <p style={hintStyle}>
        To add money to a goal, record an expense with an item in the “Savings” category and pick
        the goal.
      </p>

      {goalsWithProgress.length === 0 ? (
        <div style={emptyStyle}>
          <p style={{ margin: 0, fontWeight: 600 }}>No savings goals yet</p>
          <p style={{ margin: "4px 0 0" }}>Create one for a trip, an emergency fund, or anything else.</p>
        </div>
      ) : (
        goalsWithProgress.map((goal) => {
          const reached = goal.target > 0 && goal.remaining === 0
          const due = parseLocalDate(goal.dueDate)

          return (
            <div key={goal.id} style={cardStyle}>
              <div style={cardTopStyle}>
                <div style={{ minWidth: 0 }}>
                  <div style={goalNameStyle}>{goal.name}</div>
                  {due && (
                    <div style={metaStyle}>
                      Due {due.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 2 }}>
                  <button
                    style={actionStyle}
                    onClick={() => setFormGoal(goal)}
                    title="Edit"
                    aria-label={`Edit ${goal.name}`}
                  >
                    <FiEdit2 size={15} />
                  </button>
                  <button
                    style={{ ...actionStyle, color: "var(--expense)" }}
                    onClick={() => setGoalToDelete(goal)}
                    title="Delete"
                    aria-label={`Delete ${goal.name}`}
                  >
                    <FiX size={17} />
                  </button>
                </div>
              </div>

              <div style={amountLineStyle}>
                <span style={savedAmountStyle}>{formatMoney(goal.savedAmount)}</span>
                {goal.target > 0 && <span style={metaStyle}>of {formatMoney(goal.target)}</span>}
              </div>

              {goal.target > 0 && (
                <>
                  <div
                    style={trackStyle}
                    role="progressbar"
                    aria-label={`${goal.name} progress`}
                    aria-valuenow={Math.round(goal.percent)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      style={{
                        ...fillStyle,
                        width: `${Math.max(goal.percent, 2)}%`,
                        background: reached ? "var(--income)" : "var(--primary)",
                      }}
                    />
                  </div>
                  <div style={progressTextStyle}>
                    {reached ? (
                      <span style={{ color: "var(--income)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <FiCheckCircle aria-hidden="true" /> Goal reached
                      </span>
                    ) : (
                      <>
                        <span>{Math.round(goal.percent)}%</span>
                        <span>{formatMoney(goal.remaining)} to go</span>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })
      )}

      {formGoal && <GoalForm goal={formGoal} onClose={() => setFormGoal(null)} />}

      {goalToDelete && (
        <ConfirmModal
          title="Delete goal?"
          message={`"${goalToDelete.name}" will be removed. Transactions linked to it are kept.`}
          onConfirm={confirmDelete}
          onCancel={() => setGoalToDelete(null)}
        />
      )}
    </div>
  )
}

export default SavingsGoals

// Create or edit form; mounted fresh each time, so state starts from the goal.
function GoalForm({ goal, onClose }) {
  const editing = Boolean(goal.id)
  const [name, setName] = useState(goal.name || "")
  const [targetAmount, setTargetAmount] = useState(goal.targetAmount ?? "")
  const [dueDate, setDueDate] = useState(goal.dueDate || "")
  const [error, setError] = useState("")

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError("Give the goal a name.")
      return
    }

    const goalData = {
      name: name.trim(),
      targetAmount: targetAmount !== "" ? Number(targetAmount) : null,
      dueDate: dueDate || null,
    }

    saveInBackground(
      editing
        ? updateDoc(doc(goalsCollection(), goal.id), goalData)
        : addDoc(goalsCollection(), { ...goalData, createdAt: Date.now() }),
      "goal"
    )
    onClose()
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <form
        style={formStyle}
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        noValidate
      >
        <h2 style={{ margin: 0, fontSize: 22 }}>{editing ? "Edit goal" : "New goal"}</h2>

        <label style={fieldStyle}>
          <span style={labelStyle}>Name</span>
          <input
            type="text"
            placeholder="e.g. Trip to Japan"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>

        <div style={fieldGridStyle}>
          <label style={fieldStyle}>
            <span style={labelStyle}>Target (optional)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              placeholder="₡0"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
            />
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>Due date (optional)</span>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
        </div>

        {error && (
          <p style={errorStyle} role="alert">
            {error}
          </p>
        )}

        <div style={formButtonsStyle}>
          <button type="button" onClick={onClose} style={{ background: "transparent" }}>
            Cancel
          </button>
          <button type="submit" style={saveButtonStyle}>
            {editing ? "Save" : "Create"}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ---------- STYLES ---------- */

const containerStyle = {
  padding: "clamp(12px, 4vw, 24px)",
  maxWidth: 760,
  margin: "0 auto",
  color: "var(--text)",
}

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 16,
}

const titleStyle = {
  margin: 0,
  fontSize: 24,
}

const newGoalButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  border: "none",
  borderRadius: 999,
  background: "var(--primary)",
  color: "white",
  fontWeight: 600,
}

const totalCardStyle = {
  padding: "18px 20px",
  borderRadius: 18,
  background: "var(--hero-bg)",
  color: "white",
  boxShadow: "var(--shadow)",
}

const totalLabelStyle = {
  fontSize: 13,
  opacity: 0.85,
}

const totalAmountStyle = {
  marginTop: 2,
  fontSize: 28,
  fontWeight: 700,
  letterSpacing: "-0.02em",
}

const hintStyle = {
  margin: "12px 4px 16px",
  fontSize: 13,
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

const cardStyle = {
  padding: "16px 18px",
  marginBottom: 12,
  borderRadius: 16,
  background: "var(--card)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
}

const cardTopStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
}

const goalNameStyle = {
  fontSize: 16,
  fontWeight: 600,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}

const metaStyle = {
  fontSize: 13,
  color: "var(--text-secondary)",
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

const amountLineStyle = {
  display: "flex",
  alignItems: "baseline",
  gap: 6,
  marginTop: 10,
}

const savedAmountStyle = {
  fontSize: 22,
  fontWeight: 700,
}

const trackStyle = {
  height: 10,
  marginTop: 10,
  borderRadius: 5,
  background: "var(--track)",
  overflow: "hidden",
}

const fillStyle = {
  height: "100%",
  borderRadius: 5,
  transition: "width 0.3s ease",
}

const progressTextStyle = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: 6,
  fontSize: 13,
  color: "var(--text-secondary)",
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 1000,
}

const formStyle = {
  width: "min(460px, 100%)",
  padding: 24,
  borderRadius: 18,
  background: "var(--card)",
  color: "var(--text)",
  boxShadow: "0 12px 30px rgba(0,0,0,0.3)",
  display: "flex",
  flexDirection: "column",
  gap: 16,
}

const fieldGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
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

const errorStyle = {
  margin: 0,
  padding: "10px 12px",
  borderRadius: 10,
  background: "var(--expense-soft)",
  color: "var(--expense)",
  fontSize: 14,
}

const formButtonsStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
}

const saveButtonStyle = {
  border: "none",
  background: "var(--primary)",
  color: "white",
  fontWeight: 600,
  padding: "0.6em 1.6em",
}
