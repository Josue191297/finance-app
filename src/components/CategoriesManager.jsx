import { useState, useEffect } from "react"
import { FiEdit2, FiTrash2, FiPlus, FiMenu } from "react-icons/fi"

const STORAGE_KEY = "app_categories"

export default function CategoriesManager({ categories, setCategories }) {
  const [newCategory, setNewCategory] = useState("")
  const [editingIndex, setEditingIndex] = useState(null)
  const [editingValue, setEditingValue] = useState("")
  const [dragIndex, setDragIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  /* ---------------- PERSIST ORDER ---------------- */

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      setCategories(JSON.parse(saved))
    }
  }, [setCategories])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories))
  }, [categories])

  /* ---------------- ADD ---------------- */

  const addCategory = () => {
    if (!newCategory.trim()) return
    setCategories(prev => [...prev, newCategory.trim()])
    setNewCategory("")
  }

  /* ---------------- DELETE ---------------- */

  const deleteCategory = (index) => {
    setCategories(prev => prev.filter((_, i) => i !== index))
  }

  /* ---------------- EDIT ---------------- */

  const startEdit = (index) => {
    setEditingIndex(index)
    setEditingValue(categories[index])
  }

  const saveEdit = () => {
    setCategories(prev =>
      prev.map((cat, i) =>
        i === editingIndex ? editingValue : cat
      )
    )
    setEditingIndex(null)
    setEditingValue("")
  }

  /* ---------------- DRAG ---------------- */

  const handleDragStart = (index) => {
    setDragIndex(index)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDrop = (index) => {
    if (dragIndex === null || dragIndex === index) return

    const updated = [...categories]
    const draggedItem = updated[dragIndex]

    updated.splice(dragIndex, 1)
    updated.splice(index, 0, draggedItem)

    setCategories(updated)
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div style={containerStyle}>
      <h2 style={{ marginBottom: 20 }}>Categories Manager</h2>

      {/* Add Category */}
      <div style={addRowStyle}>
        <input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="New Category"
          style={inputStyle}
        />
        <button onClick={addCategory} style={addButtonStyle}>
          <FiPlus />
        </button>
      </div>

      {/* Category List */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {categories.map((cat, index) => (
          <div key={index}>
            
            {/* Drag Indicator Line */}
            {dragOverIndex === index && dragIndex !== index && (
              <div style={dragLineStyle} />
            )}

            <div
              style={{
                ...rowStyle,
                opacity: dragIndex === index ? 0.4 : 1,
              }}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
            >
              {editingIndex === index ? (
                <>
                  <input
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    style={inputStyle}
                  />
                  <button onClick={saveEdit} style={iconBtn}>
                    Save
                  </button>
                </>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <FiMenu style={{ opacity: 0.5, cursor: "grab" }} />
                    <span>{cat}</span>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => startEdit(index)}
                      style={iconBtn}
                    >
                      <FiEdit2 />
                    </button>

                    <button
                      onClick={() => deleteCategory(index)}
                      style={iconBtn}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


/* ---------------- STYLES ---------------- */

const containerStyle = {
  padding: 24,
  background: "var(--card)",
  color: "var(--text)",
  borderRadius: 16,
}

const addRowStyle = {
  display: "flex",
  gap: 10,
  marginBottom: 20,
}

const inputStyle = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--background)",
  color: "var(--text)",
  flex: 1,
}

const addButtonStyle = {
  padding: "0 14px",
  borderRadius: 10,
  border: "none",
  background: "#1677ff",
  color: "white",
  cursor: "pointer",
}

const rowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--background)",
  marginBottom: 8,
}

const iconBtn = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "var(--text)",
}

const dragLineStyle = {
  height: 3,
  background: "#1677ff",
  borderRadius: 2,
  margin: "4px 0",
}