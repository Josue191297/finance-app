import { useState, useMemo } from "react";

function Summary({ expenses }) {
  const today = new Date();

  const formatDate = (date) => date.toISOString().split("T")[0];

  // Default = current month
  const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const defaultEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [startDate, setStartDate] = useState(formatDate(defaultStart));
  const [endDate, setEndDate] = useState(formatDate(defaultEnd));
  const [activePreset, setActivePreset] = useState("currentMonth");

  // ---------- PRESET FUNCTIONS ----------

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

  // ---------- FILTER ----------
  const filtered = useMemo(() => {
    return expenses.filter((item) => {
      if (!item.date) return false;
      const date = new Date(item.date);
      return date >= new Date(startDate) && date <= new Date(endDate);
    });
  }, [expenses, startDate, endDate]);

  // ---------- CALCULATIONS ----------
  const totalIncome = filtered
    .filter((i) => i.type === "income")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const totalExpense = filtered
    .filter((i) => i.type === "expense")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const netBalance = totalIncome - totalExpense;

  const groupedByCategory = useMemo(() => {
    const map = {};
    filtered.forEach((item) => {
      if (item.type === "expense") {
        if (!map[item.category]) map[item.category] = 0;
        map[item.category] += Number(item.amount);
      }
    });

    return Object.keys(map).map((key) => ({
      name: key,
      value: map[key],
    }));
  }, [filtered]);

  // ---------- UI ----------
  return (
    <div style={containerStyle}>
      <h2 style={{ color: "var(--text)" }}>Summary</h2>

      {/* DATE RANGE */}
      <div style={{ marginTop: 20 }}>
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

        {/* PRESETS */}
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <PresetButton
            active={activePreset === "currentWeek"}
            onClick={setCurrentWeek}
          >
            Current Week
          </PresetButton>

          <PresetButton
            active={activePreset === "lastWeek"}
            onClick={setLastWeek}
          >
            Last Week
          </PresetButton>

          <PresetButton
            active={activePreset === "currentMonth"}
            onClick={setCurrentMonth}
          >
            Current Month
          </PresetButton>

          <PresetButton
            active={activePreset === "lastMonth"}
            onClick={setLastMonth}
          >
            Last Month
          </PresetButton>

          <PresetButton
            active={activePreset === "last3Months"}
            onClick={setLastThreeMonths}
          >
            Last 3 Months
          </PresetButton>
        </div>
      </div>

      {/* NET BALANCE */}
      <div style={cardStyle}>
        <h3 style={{ color: "var(--text)" }}>
          Net Balance: ${netBalance.toFixed(2)}
        </h3>
        <p style={{ color: "#0b910b" }}>
          Income: ${totalIncome.toFixed(2)}
        </p>
        <p style={{ color: "#ef4444" }}>
          Expenses: ${totalExpense.toFixed(2)}
        </p>
      </div>

      {/* CATEGORY TOTALS */}
      <div style={{ marginTop: 30 }}>
        <h3 style={{ color: "var(--text)" }}>Category Totals</h3>

        {groupedByCategory.length === 0 && (
          <p style={{ color: "var(--text-secondary)" }}>
            No expenses in selected range.
          </p>
        )}

        {groupedByCategory.map((cat, index) => (
          <div key={index} style={categoryRow}>
            <span>{cat.name}</span>
            <strong>${cat.value.toFixed(2)}</strong>
          </div>
        ))}
      </div>
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
        transition: "0.2s"
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

const categoryRow = {
  display: "flex",
  justifyContent: "space-between",
  padding: "8px 0",
  borderBottom: "1px solid var(--border)",
  color: "var(--text)"
};