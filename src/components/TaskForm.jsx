import { useState, useEffect } from "react";

export default function TaskForm({ onAdd, editingTask, onClose }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    responsible: "",
    priority: "",
    dueDate: "",
  });

  useEffect(() => {
    if (editingTask) {
      setForm(editingTask);
    }
  }, [editingTask]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.name || !form.responsible || !form.priority) {
      alert("Name, Responsible and Priority are required.");
      return;
    }

    if (editingTask) {
      onAdd({ ...editingTask, ...form });
    } else {
      onAdd({
        id: Date.now(),
        ...form,
        completed: false,
      });
    }

    setForm({
      name: "",
      description: "",
      responsible: "",
      priority: "",
      dueDate: "",
    });

    if (onClose) onClose();
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <h2 style={titleStyle}>
        {editingTask ? "Edit Task" : "Add Task"}
      </h2>

      <input
        name="name"
        placeholder="Task Name *"
        value={form.name}
        onChange={handleChange}
        style={inputStyle}
      />

      <textarea
        name="description"
        placeholder="Description"
        value={form.description}
        onChange={handleChange}
        style={{ ...inputStyle, minHeight: 80, resize: "none" }}
      />

      <select
        name="responsible"
        value={form.responsible}
        onChange={handleChange}
        style={inputStyle}
      >
        <option value="">Responsible *</option>
        <option value="Mamocito">Mamocito</option>
        <option value="Memito">Memito</option>
      </select>

      <select
        name="priority"
        value={form.priority}
        onChange={handleChange}
        style={inputStyle}
      >
        <option value="">Priority *</option>
        <option value="High">High</option>
        <option value="Medium">Medium</option>
        <option value="Low">Low</option>
      </select>

      <input
        type="date"
        name="dueDate"
        value={form.dueDate}
        onChange={handleChange}
        style={inputStyle}
      />

      <button type="submit" style={buttonStyle}>
        {editingTask ? "Update Task" : "Add Task"}
      </button>
    </form>
  );
}


/* ---------- SHARED STYLES ---------- */

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