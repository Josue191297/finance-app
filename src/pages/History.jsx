import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { FiChevronLeft, FiSearch } from "react-icons/fi"
import { parseLocalDate, groupConsecutive, sumByType, formatMoney } from "../money"
import TransactionRow from "../components/TransactionRow"

const monthLabel = (dateStr) => {
  const date = parseLocalDate(dateStr)
  return date
    ? date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "No date"
}

function History({ expenses }) {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")

  const term = search.trim().toLowerCase()
  const filteredExpenses = expenses
    .filter((expense) => {
      const itemText = (expense.items || [])
        .map((item) => `${item.name || ""} ${item.category || ""}`)
        .join(" ")
      const text = `${expense.name || ""} ${expense.category || ""} ${itemText}`.toLowerCase()
      return text.includes(term)
    })
    .sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || 0) - (a.createdAt || 0))

  const months = groupConsecutive(filteredExpenses, (expense) => (expense.date || "").slice(0, 7))

  return (
    <div style={containerStyle}>
      <button style={backButtonStyle} onClick={() => navigate("/settings")}>
        <FiChevronLeft aria-hidden="true" /> Settings
      </button>

      <h2 style={titleStyle}>History</h2>

      <label style={searchStyle}>
        <FiSearch style={searchIconStyle} aria-hidden="true" />
        <input
          type="search"
          placeholder="Search store, item or category"
          aria-label="Search transactions"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: 38 }}
        />
      </label>

      {months.length === 0 ? (
        <p style={emptyStyle}>
          {term ? `No transactions match "${search.trim()}".` : "No transactions yet."}
        </p>
      ) : (
        months.map((month) => (
          <section key={month.key} style={{ marginBottom: 20 }}>
            <div style={monthHeaderStyle}>
              <h3 style={monthTitleStyle}>{monthLabel(month.items[0].date)}</h3>
              <span style={monthTotalStyle}>
                Spent {formatMoney(sumByType(month.items, "expense"))}
              </span>
            </div>
            <div style={groupCardStyle}>
              {month.items.map((expense, index) => (
                <div
                  key={expense.id}
                  style={index > 0 ? { borderTop: "1px solid var(--border)" } : undefined}
                >
                  <TransactionRow expense={expense} showDate />
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}

export default History

const containerStyle = {
  padding: "clamp(12px, 4vw, 24px)",
  maxWidth: 760,
  margin: "0 auto",
  color: "var(--text)",
}

const backButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
  padding: "4px 8px 4px 0",
  marginBottom: 8,
  border: "none",
  background: "transparent",
  color: "var(--primary)",
  fontWeight: 600,
}

const titleStyle = {
  margin: "0 0 16px",
  fontSize: 24,
}

const searchStyle = {
  position: "relative",
  display: "block",
  marginBottom: 20,
}

const searchIconStyle = {
  position: "absolute",
  left: 13,
  top: "50%",
  transform: "translateY(-50%)",
  color: "var(--text-secondary)",
  pointerEvents: "none",
}

const emptyStyle = {
  color: "var(--text-secondary)",
  textAlign: "center",
  marginTop: 32,
}

const monthHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 12,
  margin: "0 4px 8px",
}

const monthTitleStyle = {
  margin: 0,
  fontSize: 15,
}

const monthTotalStyle = {
  fontSize: 13,
  color: "var(--text-secondary)",
  whiteSpace: "nowrap",
}

const groupCardStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  boxShadow: "var(--shadow)",
  overflow: "hidden",
}
