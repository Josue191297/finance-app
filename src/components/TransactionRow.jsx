import { FiArrowDownLeft, FiArrowUpRight } from "react-icons/fi"
import ReviewTag from "./ReviewTag"
import {
  expenseTotal,
  formatMoney,
  parseLocalDate,
  transactionLabel,
} from "../money"

// One transaction in a list (Home and History). `actions` are optional buttons under the amount.
export default function TransactionRow({ expense, showDate = false, actions }) {
  const income = expense.type === "income"
  const color = income ? "var(--income)" : "var(--expense)"
  const date = parseLocalDate(expense.date)
  const items = expense.transactionMode === "detailed" ? expense.items || [] : []

  return (
    <div style={rowStyle}>
      <span
        style={{
          ...iconStyle,
          color,
          background: income ? "var(--income-soft)" : "var(--expense-soft)",
        }}
        aria-hidden="true"
      >
        {income ? <FiArrowDownLeft /> : <FiArrowUpRight />}
      </span>

      <div style={{ minWidth: 0 }}>
        <div style={nameStyle}>{expense.name}</div>
        <div style={metaStyle}>
          <ReviewTag expense={expense} />
          {transactionLabel(expense)}
          {showDate && date && (
            <> · {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>
          )}
        </div>

        {items.length > 1 && (
          <div style={itemsStyle}>
            {items.map((item, index) => (
              <div key={index} style={itemRowStyle}>
                <span style={itemNameStyle}>
                  {item.name}
                  {item.category && <span style={{ opacity: 0.7 }}> · {item.category}</span>}
                </span>
                <span>{formatMoney(item.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={rightStyle}>
        <span style={{ ...amountStyle, color }}>
          {income ? "+" : "-"}
          {formatMoney(expenseTotal(expense))}
        </span>
        {actions && <div style={actionsStyle}>{actions}</div>}
      </div>
    </div>
  )
}

const rowStyle = {
  display: "grid",
  gridTemplateColumns: "38px 1fr auto",
  alignItems: "start",
  gap: 12,
  padding: "14px 16px",
}

const iconStyle = {
  width: 38,
  height: 38,
  borderRadius: 12,
  display: "grid",
  placeItems: "center",
  fontSize: 18,
}

const nameStyle = {
  fontWeight: 600,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}

const metaStyle = {
  marginTop: 2,
  fontSize: 13,
  color: "var(--text-secondary)",
}

const itemsStyle = {
  marginTop: 8,
  display: "flex",
  flexDirection: "column",
  gap: 3,
  fontSize: 12,
  color: "var(--text-secondary)",
}

const itemRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
}

const itemNameStyle = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}

const rightStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 4,
}

const amountStyle = {
  fontWeight: 700,
  whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums",
}

const actionsStyle = {
  display: "flex",
  gap: 2,
  marginRight: -6,
}
