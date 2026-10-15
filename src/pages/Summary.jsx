import { useState, useMemo } from "react";
import {
  parseLocalDate,
  toDateInput as formatDate,
  amountInCategory,
  totalsByCategory,
  sumByType,
} from "../money";

function Summary({ expenses }) {
  const today = new Date();

  const [selectedCategory, setSelectedCategory] = useState(null);

  const formatCurrency = (value) =>
    Number(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const defaultEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [startDate, setStartDate] = useState(formatDate(defaultStart));
  const [endDate, setEndDate] = useState(formatDate(defaultEnd));
  const [activePreset, setActivePreset] = useState("currentMonth");

  /* ---------- PRESETS (unchanged) ---------- */

  const setCurrentWeek = () => {
    const now = new Date();
    const first = new Date(now);
    first.setDate(now.getDate() - now.getDay());
    const last = new Date(first);
    last.setDate(first.getDate() + 6);

    setStartDate(formatDate(first));
    setEndDate(formatDate(last));
    setActivePreset("currentWeek");
  };

  const setLastWeek = () => {
    const now = new Date();
    const first = new Date(now);
    first.setDate(now.getDate() - now.getDay() - 7);
    const last = new Date(first);
    last.setDate(first.getDate() + 6);

    setStartDate(formatDate(first));
    setEndDate(formatDate(last));
    setActivePreset("lastWeek");
  };

  const setCurrentMonth = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setStartDate(formatDate(first));
    setEndDate(formatDate(last));
    setActivePreset("currentMonth");
  };

  const setLastMonth = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);

    setStartDate(formatDate(first));
    setEndDate(formatDate(last));
    setActivePreset("lastMonth");
  };

  const setLastThreeMonths = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setStartDate(formatDate(first));
    setEndDate(formatDate(last));
    setActivePreset("last3Months");
  };

  /* ---------- FILTER ---------- */

  const filtered = useMemo(() => {
    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);

    return expenses.filter((item) => {
      if (!item.date) return false;

      const itemDate = parseLocalDate(item.date);
      if (!itemDate) return false;

      return itemDate >= start && itemDate <= end;
    });
  }, [expenses, startDate, endDate]);

  /* ---------- CATEGORY DETAIL ---------- */

  const categoryExpenses = useMemo(() => {
    if (!selectedCategory) return [];

    return filtered
      .map((i) => ({ ...i, categoryAmount: amountInCategory(i, selectedCategory) }))
      .filter((i) => i.categoryAmount > 0)
      .sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date));
  }, [filtered, selectedCategory]);

  /* ---------- ALL TIME ---------- */

  const currentBalance =
    sumByType(expenses, "income") - sumByType(expenses, "expense");

  /* ---------- FILTERED CALCS ---------- */

  const totalIncome = sumByType(filtered, "income");
  const totalExpense = sumByType(filtered, "expense");
  const netBalance = totalIncome - totalExpense;

  const groupedByCategory = useMemo(() => totalsByCategory(filtered), [filtered]);

  /* ---------- UI ---------- */

  return (
    <div style={containerStyle}>
      <h2 style={{ color: "var(--text)", marginBottom: 10 }}>Summary</h2>

      {/* HERO */}
      <div style={heroCard}>
        <p style={heroLabel}>Current Balance</p>
        <h1 style={heroAmount}>
          ¢{formatCurrency(currentBalance)}
        </h1>
      </div>

      {/* DATE */}
      <div style={{ marginTop: 25 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setActivePreset(null);
            }}
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setActivePreset(null);
            }}
          />
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <PresetButton active={activePreset === "currentWeek"} onClick={setCurrentWeek}>Current Week</PresetButton>
          <PresetButton active={activePreset === "lastWeek"} onClick={setLastWeek}>Last Week</PresetButton>
          <PresetButton active={activePreset === "currentMonth"} onClick={setCurrentMonth}>Current Month</PresetButton>
          <PresetButton active={activePreset === "lastMonth"} onClick={setLastMonth}>Last Month</PresetButton>
          <PresetButton active={activePreset === "last3Months"} onClick={setLastThreeMonths}>Last 3 Months</PresetButton>
        </div>
      </div>

      {/* DETAIL VIEW */}
      {selectedCategory ? (
        <div style={{ marginTop: 30 }}>
          <button
            onClick={() => setSelectedCategory(null)}
            style={backButton}
          >
            ← Back
          </button>

          <h3 style={{ color: "var(--text)", marginTop: 10 }}>
            {selectedCategory}
          </h3>

          {categoryExpenses.length === 0 ? (
            <p style={{ color: "var(--text-secondary)" }}>
              No expenses found.
            </p>
          ) : (
            categoryExpenses.map((exp) => (
              <div key={exp.id} style={expenseRow}>
                <div>
                  <strong>{exp.name}</strong>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {exp.date}
                  </div>
                </div>

                <div>
                  ¢{formatCurrency(exp.categoryAmount)}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          {/* BALANCE */}
          <div style={cardStyle}>
            <h3 style={{ color: "var(--text)", marginBottom: 10 }}>
              Net Balance: ¢{formatCurrency(netBalance)}
            </h3>
            <p style={{ color: "#0b910b", margin: 0 }}>
              Income: ¢{formatCurrency(totalIncome)}
            </p>
            <p style={{ color: "#ef4444", marginTop: 6 }}>
              Expenses: ¢{formatCurrency(totalExpense)}
            </p>
          </div>

          {/* CATEGORIES */}
          <div style={{ marginTop: 30 }}>
            <h3 style={{ color: "var(--text)" }}>Category Totals</h3>

            {groupedByCategory.length === 0 && (
              <p style={{ color: "var(--text-secondary)" }}>
                No expenses in selected range.
              </p>
            )}

            {groupedByCategory.map((cat, index) => (
              <div
                key={index}
                style={categoryRowClickable}
                onClick={() => setSelectedCategory(cat.name)}
              >
                <span>{cat.name}</span>
                <strong>¢{formatCurrency(cat.value)}</strong>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default Summary;

/* ---------- COMPONENTS ---------- */

function PresetButton({ children, onClick, active }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: 20,
        border: active
          ? "1px solid var(--primary)"
          : "1px solid var(--border)",
        background: active ? "var(--primary-soft)" : "var(--card)",
        color: "var(--text)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

/* ---------- STYLES ---------- */

const containerStyle = {
  padding: "clamp(12px, 4vw, 24px)",
  width: "100%",
  maxWidth: 1100,
  margin: "0 auto"
};

const cardStyle = {
  marginTop: 25,
  padding: 20,
  borderRadius: 12,
  background: "var(--card)",
  border: "1px solid var(--border)"
};

const categoryRowClickable = {
  display: "flex",
  justifyContent: "space-between",
  padding: "10px 0",
  borderBottom: "1px solid var(--border)",
  color: "var(--text)",
  cursor: "pointer"
};

const expenseRow = {
  display: "flex",
  justifyContent: "space-between",
  padding: "10px 0",
  borderBottom: "1px solid var(--border)",
  color: "var(--text)"
};

const backButton = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--card)",
  color: "var(--text)",
  cursor: "pointer"
};

const heroCard = {
  marginTop: 10,
  padding: "28px 20px",
  borderRadius: 16,
  background: "linear-gradient(135deg, var(--card), #1a1a1a)",
  border: "1px solid var(--border)",
  textAlign: "center",
};

const heroLabel = {
  margin: 0,
  fontSize: 13,
  color: "var(--text-secondary)",
};

const heroAmount = {
  margin: "8px 0 0 0",
  fontSize: "clamp(28px, 4vw, 36px)",
  fontWeight: 700,
  color: "var(--text)",
};