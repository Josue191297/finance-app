import { useState, useEffect } from "react";
import TaskForm from "../components/TaskForm";
import TaskCard from "../components/TaskCard";
import ConfirmModal from "../components/ConfirmModal";

export default function Tasks({ tasks, setTasks }) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("tasks");
    if (stored) setTasks(JSON.parse(stored));
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  const addTask = (task) => {
    setTasks((prevTasks) => [task, ...prevTasks]);
  };

  const toggleComplete = (id) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === id
          ? { ...task, completed: !task.completed }
          : task
      )
    );
  };

  const updateTask = (updatedTask) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === updatedTask.id ? updatedTask : task
      )
    );
  };

  const confirmDelete = (id) => {
    setTaskToDelete(id);
  };

  const handleDeleteConfirmed = () => {
    setTasks((prevTasks) =>
      prevTasks.filter((task) => task.id !== taskToDelete)
    );
    setTaskToDelete(null);
  };

  const priorityOrder = {
    High: 1,
    Medium: 2,
    Low: 3,
  };

  const activeTasks = tasks
    .filter((task) => !task.completed)
    .sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }

      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate) - new Date(b.dueDate);
      }

      if (a.dueDate) return -1;
      if (b.dueDate) return 1;

      return b.id - a.id;
    });

  const completedTasks = tasks
    .filter((task) => task.completed)
    .sort((a, b) => b.id - a.id);

  return (
    <div style={containerStyle}>
      <h1 style={{ color: "var(--text)" }}>Tasks</h1>

      <div style={{ marginTop: 30 }}>

        {/* Active Tasks */}
        <h2 style={{ color: "var(--text)" }}>
          Active Tasks ({activeTasks.length})
        </h2>

        {activeTasks.length === 0 && (
          <p style={{ color: "var(--text-secondary)" }}>
            No active tasks.
          </p>
        )}

        {activeTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onToggle={toggleComplete}
            onDelete={confirmDelete}
            onEdit={updateTask}
          />
        ))}

        {/* Completed Section Header */}
        <div
          onClick={() => setShowCompleted(!showCompleted)}
          style={completedHeaderStyle}
        >
          <h2 style={{ margin: 0, color: "var(--text)" }}>
            {showCompleted ? "▼" : "▶"} Completed Tasks ({completedTasks.length})
          </h2>
        </div>

        {/* Collapsible Content */}
        {showCompleted && (
          <div style={{ marginTop: 15 }}>
            {completedTasks.length === 0 && (
              <p style={{ color: "var(--text-secondary)" }}>
                No completed tasks yet.
              </p>
            )}

            {completedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={toggleComplete}
                onDelete={confirmDelete}
                onEdit={updateTask}
              />
            ))}
          </div>
        )}

        {taskToDelete !== null && (
          <ConfirmModal
            message="Are you sure you want to delete this task?"
            onConfirm={handleDeleteConfirmed}
            onCancel={() => setTaskToDelete(null)}
          />
        )}

      </div>
    </div>
  );
}

/* ---------- STYLES ---------- */

const containerStyle = {
  padding: "clamp(12px, 4vw, 24px)",
  width: "100%",
  maxWidth: 1100,
  margin: "0 auto",
  minHeight: "100vh"
};

const completedHeaderStyle = {
  marginTop: 40,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: "var(--card)",
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid var(--border)",
  transition: "0.2s"
};