import { useEffect, useMemo, useState } from "react"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore"
import { db } from "../firebase"
import { householdId } from "../household"
import { savingsAmount } from "../money"
import { FiEdit2, FiX } from "react-icons/fi"

function SavingsGoals({ expenses }) {
  const [goals, setGoals] = useState([])

  const [editingGoal, setEditingGoal] = useState(null)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [goalToDelete, setGoalToDelete] = useState(null)

  const [name, setName] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [dueDate, setDueDate] = useState("")

  /* REAL-TIME FIRESTORE LISTENERS */
  useEffect(() => {
    const unsubscribeGoals = onSnapshot(
      collection(db, "households", householdId, "savingGoals"),
      (snapshot) => {
        setGoals(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        )
      },
      (error) => {
        console.error("Savings goals snapshot error:", error)
      }
    )

    return () => unsubscribeGoals()
  }, [])

  /* RESET FORM */
  const resetForm = () => {
    setName("")
    setTargetAmount("")
    setDueDate("")
  }

  /* OPEN CREATE */
  const openCreateGoal = () => {
    resetForm()
    setEditingGoal(null)
    setShowGoalModal(true)
  }

  /* OPEN EDIT */
  const openEditGoal = (goal) => {
    setEditingGoal(goal)
    setName(goal.name || "")
    setTargetAmount(
      goal.targetAmount !== null &&
        goal.targetAmount !== undefined
        ? goal.targetAmount
        : ""
    )
    setDueDate(goal.dueDate || "")
    setShowGoalModal(true)
  }

  /* CLOSE EDIT/CREATE */
  const closeGoalModal = () => {
    setShowGoalModal(false)
    setEditingGoal(null)
    resetForm()
  }

  /* SAVE / UPDATE */
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!name.trim()) return

    const goalData = {
      name: name.trim(),
      targetAmount:
        targetAmount !== ""
          ? Number(targetAmount)
          : null,
      dueDate: dueDate || null,
    }

    try {
      if (editingGoal) {
        await updateDoc(
          doc(
            db,
            "households",
            householdId,
            "savingGoals",
            editingGoal.id
          ),
          goalData
        )
      } else {
        await addDoc(
          collection(
            db,
            "households",
            householdId,
            "savingGoals"
          ),
          {
            ...goalData,
            createdAt: Date.now(),
          }
        )
      }

      closeGoalModal()
    } catch (error) {
      console.error(
        "Error saving savings goal:",
        error
      )
    }
  }

  /* DELETE */
  const confirmDelete = async () => {
    if (!goalToDelete) return

    try {
      await deleteDoc(
        doc(
          db,
          "households",
          householdId,
          "savingGoals",
          goalToDelete.id
        )
      )

      setGoalToDelete(null)
    } catch (error) {
      console.error(
        "Error deleting savings goal:",
        error
      )
    }
  }

  /* CALCULATE PROGRESS */
  const goalsWithProgress = useMemo(() => {
    return goals.map((goal) => {
      const savedAmount = expenses
        .filter(
          (expense) =>
            expense.type === "expense" &&
            expense.savingGoalId === goal.id
        )
        .reduce(
          (sum, expense) => sum + savingsAmount(expense),
          0
        )

      const target = Number(
        goal.targetAmount || 0
      )

      return {
        ...goal,
        savedAmount,
        percent:
          target > 0
            ? Math.min(
                (savedAmount / target) * 100,
                100
              )
            : 0,
        remaining:
          target > 0
            ? Math.max(
                target - savedAmount,
                0
              )
            : null,
      }
    })
  }, [goals, expenses])

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>
          Savings Goals
        </h2>

        <button
          type="button"
          style={addTextButtonStyle}
          onClick={openCreateGoal}
        >
          + New Goal
        </button>
      </div>

      {goalsWithProgress.length === 0 ? (
        <p
          style={{
            color: "var(--text-secondary)",
          }}
        >
          No savings goals yet.
        </p>
      ) : (
        <div style={listStyle}>
          {goalsWithProgress.map((goal) => (
            <div
              key={goal.id}
              style={cardStyle}
            >
              {/* TOP ROW */}
              <div style={rowStyle}>
                <div style={{ minWidth: 0 }}>
                  <strong style={nameStyle}>
                    {goal.name}
                  </strong>

                  {goal.dueDate && (
                    <div style={metaStyle}>
                      Due{" "}
                      {new Date(
                        `${goal.dueDate}T00:00:00`
                      ).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* SAME ACTION STYLE AS TRANSACTIONS */}
                <div style={iconRowStyle}>
                  <FiEdit2
                    size={15}
                    style={iconStyle}
                    onClick={() =>
                      openEditGoal(goal)
                    }
                  />

                  <FiX
                    size={15}
                    style={deleteIconStyle}
                    onClick={() =>
                      setGoalToDelete(goal)
                    }
                  />
                </div>
              </div>

              {/* AMOUNTS */}
              <div style={amountRowStyle}>
                <span>
                  Saved: ₡
                  {goal.savedAmount.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}
                </span>

                {goal.targetAmount !==
                  null &&
                  goal.targetAmount !==
                    undefined && (
                    <span>
                      Goal: ₡
                      {Number(
                        goal.targetAmount
                      ).toLocaleString(
                        undefined,
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </span>
                  )}
              </div>

              {/* PROGRESS */}
              {goal.targetAmount !==
                null &&
                goal.targetAmount !==
                  undefined && (
                  <>
                    <div
                      style={
                        progressTrackStyle
                      }
                    >
                      <div
                        style={{
                          ...progressFillStyle,
                          width: `${goal.percent}%`,
                        }}
                      />
                    </div>

                    <div style={metaStyle}>
                      Remaining: ₡
                      {goal.remaining.toLocaleString(
                        undefined,
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </div>
                  </>
                )}
            </div>
          ))}
        </div>
      )}

      {/* EDIT / CREATE MODAL - SAME STYLE AS TRANSACTION EDIT */}
      {showGoalModal && (
        <div
          style={overlayStyle}
          onClick={closeGoalModal}
        >
          <div
            style={editModalStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              style={closeButtonStyle}
              onClick={closeGoalModal}
            >
              ✕
            </button>

            <form
              onSubmit={handleSubmit}
              style={formStyle}
            >
              <h2 style={modalTitleStyle}>
                {editingGoal
                  ? "Edit Savings Goal"
                  : "Add Savings Goal"}
              </h2>

              <input
                type="text"
                placeholder="Goal name"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                style={inputStyle}
              />

              <input
                type="number"
                min="0"
                placeholder="Target amount (optional)"
                value={targetAmount}
                onChange={(e) =>
                  setTargetAmount(e.target.value)
                }
                style={inputStyle}
              />

              <input
                type="date"
                value={dueDate}
                onChange={(e) =>
                  setDueDate(e.target.value)
                }
                style={inputStyle}
              />

              <div style={buttonRowStyle}>
                <button
                  type="button"
                  onClick={closeGoalModal}
                  style={cancelButtonStyle}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={buttonStyle}
                >
                  {editingGoal
                    ? "Update"
                    : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL - SAME STYLE AS TRANSACTION DELETE */}
      {goalToDelete && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <p>
              Are you sure you want to delete
              this savings goal?
            </p>

            <div
              style={{
                marginTop: 20,
                textAlign: "right",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setGoalToDelete(null)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                style={deleteButtonStyle}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/*
  Small modal component.

  It stays hidden when no goal is being edited and when the
  create form has not been opened. To support the create button
  cleanly, the parent uses the initial blank form state.
*/
export default SavingsGoals

/* ---------------- STYLES ---------------- */

const containerStyle = {
  padding: 20,
  maxWidth: 700,
  margin: "0 auto",
}

const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 20,
}

const titleStyle = {
  color: "var(--text)",
  margin: 0,
}

const modalTitleStyle = {
  margin: 0,
}

const addTextButtonStyle = {
  border: "none",
  background: "transparent",
  color: "var(--primary)",
  cursor: "pointer",
  fontSize: 15,
  fontWeight: 600,
  padding: "6px 0",
}

const listStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
}

const cardStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 18,
  color: "var(--text)",
}

const rowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
}

const nameStyle = {
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
  marginTop: 4,
}

const amountRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  marginTop: 14,
  fontSize: 14,
}

const progressTrackStyle = {
  height: 8,
  background: "var(--border)",
  borderRadius: 999,
  overflow: "hidden",
  marginTop: 12,
}

const progressFillStyle = {
  height: "100%",
  background: "var(--income)",
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

const formStyle = {
  color: "var(--text)",
  padding: 24,
  display: "flex",
  flexDirection: "column",
  gap: 18,
}

const inputStyle = {
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--card)",
  color: "var(--text)",
  fontSize: 14,
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
  background: "var(--primary)",
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

const editModalStyle = {
  background: "var(--card)",
  width: "100%",
  maxWidth: 550,
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
  fontSize: 16,
  zIndex: 10,
}
