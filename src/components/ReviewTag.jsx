import { FiAlertCircle } from "react-icons/fi"

// Shown on transactions imported from bank emails until someone checks them.
export default function ReviewTag({ expense }) {
  if (!expense.needsReview) return null

  const usd = expense.currency === "USD"
  const text = usd
    ? `USD ${Number(expense.originalAmount || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
      })} · check statement`
    : "To review"

  return (
    <span
      style={tagStyle}
      title={
        usd
          ? "Charged in dollars. Enter the colones amount from your bank statement."
          : "Imported from a bank email. Check the category, then confirm."
      }
    >
      <FiAlertCircle size={12} aria-hidden="true" />
      {text}
    </span>
  )
}

const tagStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  marginRight: 8,
  padding: "1px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
  background: "rgba(234, 179, 8, 0.2)",
  color: "var(--text)",
  verticalAlign: "middle",
}
