import { useState, useMemo } from "react";
import {
  FiArrowDownLeft,
  FiArrowUpRight,
  FiActivity,
  FiCalendar,
  FiChevronLeft,
} from "react-icons/fi";
import {
  parseLocalDate,
  toDateInput,
  amountInCategory,
  totalsByCategory,
  sumByType,
  formatMoney,
} from "../money";

const week = (now, offset) => {
  const first = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 7 * offset);
  return [first, new Date(first.getFullYear(), first.getMonth(), first.getDate() + 6)];
};

const months = (now, from, to) => [
  new Date(now.getFullYear(), now.getMonth() + from, 1),
  new Date(now.getFullYear(), now.getMonth() + to + 1, 0),
];

const PRESETS = [
  { key: "currentWeek", label: "This week", range: (now) => week(now, 0) },
  { key: "lastWeek", label: "Last week", range: (now) => week(now, -1) },
  { key: "currentMonth", label: "This month", range: (now) => months(now, 0, 0) },
  { key: "lastMonth", label: "Last month", range: (now) => months(now, -1, -1) },
];

const formatRange = (startStr, endStr) => {
  const start = parseLocalDate(startStr);
  const end = parseLocalDate(endStr);
  if (!start || !end) return "Pick a start and end date";
  const short = { month: "short", day: "numeric" };
  if (start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString("en-US", short)} – ${end.toLocaleDateString("en-US", short)}, ${end.getFullYear()}`;
  }
  const long = { ...short, year: "numeric" };
  return `${start.toLocaleDateString("en-US", long)} – ${end.toLocaleDateString("en-US", long)}`;
};

function Summary({ expenses }) {
  const [initialStart, initialEnd] = months(new Date(), 0, 0);

  const [startDate, setStartDate] = useState(toDateInput(initialStart));
  const [endDate, setEndDate] = useState(toDateInput(initialEnd));
  const [activePreset, setActivePreset] = useState("currentMonth");
  const [selectedCategory, setSelectedCategory] = useState(null);

  const applyPreset = (preset) => {
    const [first, last] = preset.range(new Date());
    setStartDate(toDateInput(first));
    setEndDate(toDateInput(last));
    setActivePreset(preset.key);
  };

  /* ---------- FILTER ---------- */

  const filtered = useMemo(() => {
    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    if (!start || !end) return [];

    return expenses.filter((item) => {
      const itemDate = parseLocalDate(item.date);
      return itemDate && itemDate >= start && itemDate <= end;
    });
  }, [expenses, startDate, endDate]);

  /* ---------- TOTALS ---------- */

  const currentBalance = sumByType(expenses, "income") - sumByType(expenses, "expense");
  const totalIncome = sumByType(filtered, "income");
  const totalExpense = sumByType(filtered, "expense");
  const netBalance = totalIncome - totalExpense;

  const categoryRows = useMemo(
    () =>
      totalsByCategory(filtered)
        .map((cat) => ({
          ...cat,
          count: filtered.filter((e) => amountInCategory(e, cat.name) > 0).length,
        }))
        .sort((a, b) => b.value - a.value),
    [filtered]
  );
  const largestCategory = categoryRows[0]?.value || 0;

  const categoryExpenses = useMemo(() => {
    if (!selectedCategory) return [];

    return filtered
      .map((i) => ({ ...i, categoryAmount: amountInCategory(i, selectedCategory) }))
      .filter((i) => i.categoryAmount > 0)
      .sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date));
  }, [filtered, selectedCategory]);

  const selectedTotal = categoryExpenses.reduce((sum, e) => sum + e.categoryAmount, 0);

  /* ---------- UI ---------- */

  return (
    <div style={containerStyle}>
      <h2 style={pageTitle}>Summary</h2>

      {/* BALANCE: sticky so it stays visible while scrolling */}
      <div style={stickyWrap}>
        <div style={heroCard}>
          <p style={heroLabel}>Current balance</p>
          <p style={heroAmount}>{formatMoney(currentBalance)}</p>
          <p style={heroHint}>All income minus all expenses</p>
        </div>
      </div>

      {/* PERIOD */}
      <section style={cardStyle} aria-label="Period">
        <div style={chipRow} role="group" aria-label="Date range presets">
          {PRESETS.map((preset) => (
            <Chip
              key={preset.key}
              active={activePreset === preset.key}
              onClick={() => applyPreset(preset)}
            >
              {preset.label}
            </Chip>
          ))}
          <Chip
            active={activePreset === "custom"}
            onClick={() => setActivePreset("custom")}
          >
            Custom
          </Chip>
        </div>

        <div style={rangeLabel}>
          <FiCalendar aria-hidden="true" />
          <span>{formatRange(startDate, endDate)}</span>
        </div>

        {activePreset === "custom" && (
          <div style={customRange}>
            <label style={fieldLabel}>
              From
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label style={fieldLabel}>
              To
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>
        )}
      </section>

      {selectedCategory ? (
        /* ---------- CATEGORY DETAIL ---------- */
        <section style={cardStyle}>
          <button onClick={() => setSelectedCategory(null)} style={backButton}>
            <FiChevronLeft aria-hidden="true" /> All categories
          </button>

          <div style={sectionHeader}>
            <h3 style={sectionTitle}>{selectedCategory}</h3>
            <strong>{formatMoney(selectedTotal)}</strong>
          </div>

          {categoryExpenses.length === 0 ? (
            <p style={emptyText}>No expenses in this period.</p>
          ) : (
            categoryExpenses.map((exp) => (
              <div key={exp.id} style={listRow}>
                <div style={{ minWidth: 0 }}>
                  <div style={listName}>{exp.name}</div>
                  <div style={listMeta}>
                    {parseLocalDate(exp.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
                <strong style={{ whiteSpace: "nowrap" }}>
                  {formatMoney(exp.categoryAmount)}
                </strong>
              </div>
            ))
          )}
        </section>
      ) : (
        <>
          {/* ---------- PERIOD TOTALS ---------- */}
          <div style={tileGrid}>
            <StatTile
              icon={<FiArrowDownLeft />}
              label="Income"
              value={formatMoney(totalIncome)}
              color="var(--income)"
              soft="var(--income-soft)"
            />
            <StatTile
              icon={<FiArrowUpRight />}
              label="Expenses"
              value={formatMoney(totalExpense)}
              color="var(--expense)"
              soft="var(--expense-soft)"
            />
            <StatTile
              icon={<FiActivity />}
              label="Net"
              value={formatMoney(netBalance)}
              color="var(--primary)"
              soft="var(--primary-soft)"
            />
          </div>

          {/* ---------- SPENDING BY CATEGORY (bar chart) ---------- */}
          <section style={cardStyle} aria-label="Spending by category">
            <div style={sectionHeader}>
              <h3 style={sectionTitle}>Spending by category</h3>
            </div>
            <p style={sectionHint}>Tap a category to see its transactions.</p>

            {categoryRows.length === 0 ? (
              <p style={emptyText}>No expenses in this period.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {categoryRows.map((cat) => {
                  const share = totalExpense > 0 ? (cat.value / totalExpense) * 100 : 0;
                  const detail = `${formatMoney(cat.value)} · ${share.toFixed(0)}% of spending · ${cat.count} transaction${cat.count === 1 ? "" : "s"}`;

                  return (
                    <button
                      key={cat.name}
                      className="bar-row"
                      style={barRow}
                      onClick={() => setSelectedCategory(cat.name)}
                      title={detail}
                      aria-label={`${cat.name}: ${detail}`}
                    >
                      <div style={barTopLine}>
                        <span style={barName}>{cat.name}</span>
                        <span style={barValue}>{formatMoney(cat.value)}</span>
                      </div>
                      <div style={barBottomLine}>
                        <div style={barTrack}>
                          <div
                            style={{
                              ...barFill,
                              width: `${Math.max((cat.value / largestCategory) * 100, 2)}%`,
                            }}
                          />
                        </div>
                        <span style={barShare}>{share.toFixed(0)}%</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default Summary;

/* ---------- COMPONENTS ---------- */

function Chip({ children, onClick, active }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        flexShrink: 0,
        padding: "7px 14px",
        borderRadius: 999,
        fontSize: 14,
        border: active ? "1px solid var(--primary)" : "1px solid var(--border)",
        background: active ? "var(--primary)" : "var(--card)",
        color: active ? "white" : "var(--text)",
        fontWeight: active ? 600 : 500,
      }}
    >
      {children}
    </button>
  );
}

function StatTile({ icon, label, value, color, soft }) {
  return (
    <div style={tileStyle}>
      <div style={tileLabel}>
        <span style={{ ...tileIcon, color, background: soft }} aria-hidden="true">
          {icon}
        </span>
        {label}
      </div>
      <div style={{ ...tileValue, color }}>{value}</div>
    </div>
  );
}

/* ---------- STYLES ---------- */

const containerStyle = {
  padding: "clamp(12px, 4vw, 24px)",
  width: "100%",
  maxWidth: 760,
  margin: "0 auto",
  color: "var(--text)",
};

const pageTitle = {
  margin: "0 0 12px",
  fontSize: 24,
};

const stickyWrap = {
  position: "sticky",
  top: 0,
  zIndex: 10,
  paddingTop: 8,
  paddingBottom: 8,
  background: "var(--bg)",
};

const heroCard = {
  padding: "20px 22px",
  borderRadius: 18,
  background: "var(--hero-bg)",
  color: "white",
  boxShadow: "var(--shadow)",
};

const heroLabel = {
  margin: 0,
  fontSize: 13,
  fontWeight: 500,
  opacity: 0.85,
};

const heroAmount = {
  margin: "4px 0 2px",
  fontSize: "clamp(30px, 8vw, 40px)",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  lineHeight: 1.15,
};

const heroHint = {
  margin: 0,
  fontSize: 12,
  opacity: 0.7,
};

const cardStyle = {
  marginTop: 12,
  padding: 18,
  borderRadius: 16,
  background: "var(--card)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
};

const chipRow = {
  display: "flex",
  gap: 8,
  overflowX: "auto",
  paddingBottom: 2,
  scrollbarWidth: "none",
};

const rangeLabel = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 14,
  fontSize: 15,
  fontWeight: 600,
};

const customRange = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginTop: 12,
};

const fieldLabel = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 12,
  fontWeight: 500,
  color: "var(--text-secondary)",
};

const tileGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 12,
  marginTop: 12,
};

const tileStyle = {
  padding: 16,
  borderRadius: 16,
  background: "var(--card)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
  minWidth: 0,
};

const tileLabel = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  fontWeight: 500,
  color: "var(--text-secondary)",
};

const tileIcon = {
  display: "grid",
  placeItems: "center",
  width: 26,
  height: 26,
  borderRadius: 8,
  fontSize: 15,
};

const tileValue = {
  marginTop: 10,
  fontSize: 20,
  fontWeight: 700,
  overflowWrap: "anywhere",
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 12,
};

const sectionTitle = {
  margin: 0,
  fontSize: 17,
};

const sectionHint = {
  margin: "2px 0 14px",
  fontSize: 13,
  color: "var(--text-secondary)",
};

const emptyText = {
  margin: "12px 0 4px",
  color: "var(--text-secondary)",
};

const barRow = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  width: "100%",
  padding: "10px 8px",
  margin: "0 -8px",
  boxSizing: "content-box",
  border: "none",
  borderRadius: 10,
  background: "transparent",
  textAlign: "left",
  color: "var(--text)",
};

const barTopLine = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  fontSize: 14,
};

const barName = {
  fontWeight: 500,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const barValue = {
  fontWeight: 600,
  whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums",
};

const barBottomLine = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const barTrack = {
  flex: 1,
  height: 8,
  borderRadius: 4,
  background: "var(--track)",
  overflow: "hidden",
};

const barFill = {
  height: "100%",
  borderRadius: 4,
  background: "var(--primary)",
  transition: "width 0.3s ease",
};

const barShare = {
  width: 36,
  textAlign: "right",
  fontSize: 12,
  color: "var(--text-secondary)",
  fontVariantNumeric: "tabular-nums",
};

const backButton = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "6px 10px 6px 6px",
  marginBottom: 12,
  fontSize: 14,
};

const listRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "12px 0",
  borderBottom: "1px solid var(--border)",
};

const listName = {
  fontWeight: 500,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const listMeta = {
  fontSize: 12,
  color: "var(--text-secondary)",
};
