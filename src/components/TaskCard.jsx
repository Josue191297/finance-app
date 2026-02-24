import { useState } from "react";
import { FiCheckCircle, FiCircle, FiEdit, FiTrash2 } from "react-icons/fi";

export default function TaskCard({ task, onToggle, onDelete, onEdit }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(task);

  const priorityColor =
    task.priority === "High"
      ? "#ff4d4f"
      : task.priority === "Medium"
      ? "#faad14"
      : "#52c41a";

  const handleChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    onEdit(editData);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div style={cardStyle}>
        <input name="name" value={editData.name} onChange={handleChange} />
        <br /><br />

        <textarea
          name="description"
          value={editData.description}
          onChange={handleChange}
        />
        <br /><br />

        <select
            name="responsible"
            value={editData.responsible}
            onChange={handleChange}
            >
            <option value="">Responsible *</option>
            <option value="Mamocito">Mamocito</option>
            <option value="Memito">Memito</option>
        </select>
        <br /><br />

        <select
          name="priority"
          value={editData.priority}
          onChange={handleChange}
        >
          <option value="">Priority</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <br /><br />

        <input
          type="date"
          name="dueDate"
          value={editData.dueDate}
          onChange={handleChange}
        />
        <br /><br />

        <button onClick={handleSave}>Save</button>
        <button onClick={() => setIsEditing(false)} style={{ marginLeft: 10 }}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div style={{ ...cardStyle, opacity: task.completed ? 0.6 : 1, transform: task.completed ? "scale(0.98)" : "scale(1)", }}>
      <h3>
        {task.name}{" "}
        <span style={{ color: priorityColor }}>
          ({task.priority})
        </span>
      </h3>

      <p>{task.description}</p>
      <p><strong>Responsible:</strong> {task.responsible}</p>
      <p><strong>Due:</strong> {task.dueDate || "No due date"}</p>

      <div style={buttonRowStyle}>

        {/* Toggle Complete */}
        <button
            onClick={() => onToggle(task.id)}
            style={iconButtonStyle}
        >
            {task.completed ? (
                <FiCircle size={20} />
            ) : (
                <FiCheckCircle color="#52c41a" size={20} />
            )}
        </button>

        {/* Edit (Only Active Tasks) */}
        {!task.completed && (
        <button
            onClick={() => setIsEditing(true)}
            style={iconButtonStyle}
        >
            <FiEdit size={20} />
        </button>
        )}

        {/* Delete */}
        <button
            onClick={() => onDelete(task.id)}
            style={iconButtonStyle}
        >
            <FiTrash2 size={20} />
        </button>

</div>

    </div>
  );
}

const cardStyle = {
  background: "var(--card)",
  padding: 20,
  marginBottom: 15,
  borderRadius: 12,
  boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
  transition: "all 0.3s ease",
};

const buttonRowStyle = {
  display: "flex",
  gap: 12,
  marginTop: 15,
}

const iconButtonStyle = {
  background: "var(--card)",
  border: "none",
  cursor: "pointer",
  padding: 6,
  borderRadius: 8,
  transition: "all 0.2s ease",
}

