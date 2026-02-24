import { useState, useEffect } from "react";

function AddExpense({
  expenses,
  setExpenses,
  categories,
  editingExpense,
  onClose
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("expense");
  const [date, setDate] = useState("");

  useEffect(() => {
    if (editingExpense) {
      setName(editingExpense.name);
      setAmount(editingExpense.amount);
      setCategory(editingExpense.category);
      setType(editingExpense.type);
      setDate(editingExpense.date);
    }
  }, [editingExpense]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !amount) return;

    if (editingExpense) {
      setExpenses(prev =>
        prev.map(exp =>
          exp.id === editingExpense.id
            ? { ...exp, name, amount: Number(amount), category, type, date }
            : exp
        )
      );
    } else {
      const newExpense = {
        id: Date.now(),
        name,
        amount: Number(amount),
        category,
        type,
        date
      };

      setExpenses(prev => [newExpense, ...prev]);
    }

    setName("");
    setAmount("");
    setCategory("");
    setType("expense");
    setDate("");

    if (onClose) onClose();
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <h2 style={titleStyle}>
        {editingExpense ? "Edit Transaction" : "Add Transaction"}
      </h2>

      <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </select>

      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={e => setName(e.target.value)}
        style={inputStyle}
      />

      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        style={inputStyle}
      />

      {categories?.length > 0 ? (
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          style={inputStyle}
        >
          <option value="">Select Category</option>
          {categories.map((cat, index) => (
            <option key={index} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      ) : (
        <p style={{ opacity: 0.6 }}>
          No categories available. Create one in Settings.
        </p>
      )}

      <input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        style={inputStyle}
      />

      <button type="submit" style={buttonStyle}>
        {editingExpense ? "Update" : "Add"}
      </button>
    </form>
  );
}

export default AddExpense;


/* ---------- STYLES ---------- */

const formStyle = {
  background: "var(--card)",
  color: "var(--text)",
  padding: 24,
  borderRadius: 16,
  display: "flex",
  flexDirection: "column",
  gap: 18,
};

const titleStyle = {
  margin: 0,
  marginBottom: 8,
};

const inputStyle = {
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--background)",
  color: "var(--text)",
  fontSize: 14,
};

const buttonStyle = {
  padding: 14,
  borderRadius: 10,
  border: "none",
  background: "#1677ff",
  color: "white",
  cursor: "pointer",
  fontWeight: 500,
  marginTop: 10,
};