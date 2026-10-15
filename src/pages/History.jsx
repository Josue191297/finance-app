import { useState } from "react"
import { parseLocalDate, expenseTotal as getTotal } from "../money"

function History({ expenses }) {
  const [search, setSearch] = useState("")

  const filteredExpenses = expenses
    .filter((expense) => {
      const text = `${expense.name || ""} ${expense.category || ""}`.toLowerCase()
      return text.includes(search.toLowerCase())
    })
    .sort((a, b) => {
      const dateA = parseLocalDate(a.date) || new Date(0)
      const dateB = parseLocalDate(b.date) || new Date(0)
      return dateB - dateA
    })

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>History</h2>

      <input
        placeholder="Search transactions"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={inputStyle}
      />

      <div style={{ marginTop: 20 }}>
        {filteredExpenses.length === 0 ? (
          <p style={{ color: "var(--text-secondary)" }}>
            No transactions found.
          </p>
        ) : (
          filteredExpenses.map((expense) => (
            <div key={expense.id} style={cardStyle}>
              <div>
                <strong>{expense.name}</strong>
                <div style={metaStyle}>
                  {expense.transactionMode === "detailed"
                    ? `Receipt • ${expense.items?.length || 0} items`
                    : expense.category || "No category"}

                  {" | "}

                  {expense.date || "No date"}
                </div>
              </div>

              <strong
                style={{
                  color:
                    expense.type === "income"
                      ? "#0b910b"
                      : "#ef4444",
                }}
              >
                ₡
                {getTotal(expense).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </strong>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default History

const containerStyle = {
  padding: 20,
  maxWidth: 700,
  margin: "0 auto",
}

const titleStyle = {
  color: "var(--text)",
  marginBottom: 20,
}

const inputStyle = {
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--card)",
  color: "var(--text)",
  fontSize: 14,
  width: "100%",
}

const cardStyle = {
  background: "var(--card)",
  padding: "16px 18px",
  borderRadius: 12,
  border: "1px solid var(--border)",
  marginBottom: 12,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  color: "var(--text)",
}

const metaStyle = {
  color: "var(--text-secondary)",
  fontSize: 13,
  marginTop: 4,
}