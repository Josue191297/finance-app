import { useState } from "react";
import { FiEdit2, FiX } from "react-icons/fi";
import AddExpense from "./AddExpense";
import SlideModal from "../components/SlideModal";

function Dashboard({ expenses, setExpenses, categories }) {

  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);

  const confirmDelete = () => {
    setExpenses(prev =>
      prev.filter(exp => exp.id !== expenseToDelete.id)
    );
    setExpenseToDelete(null);
  };

  const sortedExpenses = [...expenses].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  return (
    <div style={containerStyle}>
      <h2 style={{ color: "var(--text)" }}>Dashboard</h2>

      <div style={listStyle}>
        {sortedExpenses.map((expense) => (
          <div key={expense.id} style={cardStyle}>

            {/* ICONS */}
            <div style={iconContainer}>
              <FiEdit2
                size={14}
                style={iconStyle}
                onClick={() => setEditingExpense(expense)}
              />

              <FiX
                size={14}
                style={iconStyle}
                onClick={() => setExpenseToDelete(expense)}
              />
            </div>

            <div>
              <strong style={{ color: "var(--text)" }}>
                {expense.name}
              </strong>
              <br />
              <small style={{ color: "var(--text-secondary)" }}>
                {expense.category} |{" "}
                {expense.date
                  ? new Date(expense.date).toLocaleDateString()
                  : "No date"}
              </small>
            </div>

            <div
              style={{
                color:
                  expense.type === "income"
                    ? "#0b910b"
                    : "#ef4444",
                fontWeight: "bold"
              }}
            >
              ${expense.amount.toFixed(2)}
            </div>

          </div>
        ))}
      </div>

      {/* DELETE MODAL */}
      {expenseToDelete && (
        <SlideModal onClose={() => setExpenseToDelete(null)}>
          <h3 style={{ color: "var(--text)" }}>
            Delete Transaction?
          </h3>

          <p style={{ color: "var(--text-secondary)" }}>
            This action cannot be undone.
          </p>

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={() => setExpenseToDelete(null)}>
              Cancel
            </button>

            <button
              onClick={confirmDelete}
              style={{
                background: "#ef4444",
                color: "white",
                border: "none"
              }}
            >
              Delete
            </button>
          </div>
        </SlideModal>
      )}

      {/* EDIT MODAL */}
      {editingExpense && (
        <SlideModal onClose={() => setEditingExpense(null)}>
          <AddExpense
            expenses={expenses}
            setExpenses={setExpenses}
            categories={categories}
            editingExpense={editingExpense}
            onClose={() => setEditingExpense(null)}
          />
        </SlideModal>
      )}

    </div>
  );
}

export default Dashboard;

/* ---------- STYLES ---------- */

const containerStyle = {
  padding: "clamp(12px, 4vw, 24px)",
  width: "100%",
  maxWidth: 1100,
  margin: "0 auto"
};

const listStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  marginTop: 20
};

const cardStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 12,
  borderRadius: 12,
  background: "var(--card)",
  border: "1px solid var(--border)",
  position: "relative",
  transition: "0.2s"
};

const iconContainer = {
  position: "absolute",
  top: 8,
  right: 8,
  display: "flex",
  gap: 8
};

const iconStyle = {
  cursor: "pointer",
  color: "var(--text-secondary)"
};