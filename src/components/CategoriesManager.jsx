import { useState } from "react"
import { FiEdit2, FiTrash2, FiPlus, FiMenu } from "react-icons/fi"
import { collection, addDoc, deleteDoc, doc, getDocs, writeBatch } from "firebase/firestore"
import { db } from "../firebase"
import { householdId } from "../household"
import ConfirmModal from "./ConfirmModal"

export default function CategoriesManager({ categories = [] }) {
  const [newCategory, setNewCategory] = useState("")
  const [editingId, setEditingId] = useState(null)
  const [editingValue, setEditingValue] = useState("")
  const [categoryToDelete, setCategoryToDelete] = useState(null)

  const expenseCategories = categories.filter(
    (cat) => (cat.type || "expense") === "expense"
  )

  const incomeCategories = categories.filter(
    (cat) => (cat.type || "expense") === "income"
  )

  const addCategory = async (type) => {
    if (!newCategory.trim()) return

    try {
      await addDoc(
        collection(db, "households", householdId, "categories"),
        {
          name: newCategory.trim(),
          type,
          createdAt: Date.now(),
        }
      )
      setNewCategory("")
    } catch (error) {
      console.error("Error adding category:", error)
    }
  }

  const startEdit = (cat) => {
    setEditingId(cat.id)
    setEditingValue(cat.name)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingValue("")
  }

  const saveEdit = async () => {
    const newName = editingValue.trim()
    const oldName = categories.find((cat) => cat.id === editingId)?.name
    if (!newName || !editingId) return

    try {
      // Expenses store the category by name, so rename it everywhere in one batch.
      // shortcut: one batch holds max 500 writes; split it if the household passes ~500 matching records.
      const batch = writeBatch(db)
      batch.update(doc(db, "households", householdId, "categories", editingId), { name: newName })

      for (const name of ["expenses", "futureExpenses"]) {
        const snapshot = await getDocs(collection(db, "households", householdId, name))
        snapshot.forEach((record) => {
          const data = record.data()
          const changes = {}
          if (data.category === oldName) changes.category = newName
          if (data.items?.some((item) => item.category === oldName)) {
            changes.items = data.items.map((item) =>
              item.category === oldName ? { ...item, category: newName } : item
            )
          }
          if (Object.keys(changes).length) batch.update(record.ref, changes)
        })
      }

      await batch.commit()
      cancelEdit()
    } catch (error) {
      console.error("Error editing category:", error)
    }
  }

  const confirmDelete = async () => {
    if (!categoryToDelete) return

    try {
      await deleteDoc(
        doc(db, "households", householdId, "categories", categoryToDelete.id)
      )
      setCategoryToDelete(null)
    } catch (error) {
      console.error("Error deleting category:", error)
    }
  }

  const renderCategoryList = (list, emptyMessage) => (
    <div style={listStyle}>
      {list.length === 0 ? (
        <p style={emptyStyle}>{emptyMessage}</p>
      ) : (
        list.map((cat) => (
          <div key={cat.id} style={rowStyle}>
            {editingId === cat.id ? (
              <>
                <input
                  autoFocus
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit()
                    if (e.key === "Escape") cancelEdit()
                  }}
                  style={inputStyle}
                />

                <div style={actionsStyle}>
                  <button onClick={saveEdit} style={textButtonStyle}>
                    Save
                  </button>
                  <button onClick={cancelEdit} style={textButtonStyle}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={categoryNameStyle}>
                  <FiMenu style={{ opacity: 0.5 }} />
                  <span>{cat.name}</span>
                </div>

                <div style={actionsStyle}>
                  <button
                    onClick={() => startEdit(cat)}
                    style={iconBtn}
                    aria-label={`Edit ${cat.name}`}
                    title="Edit"
                  >
                    <FiEdit2 />
                  </button>

                  <button
                    onClick={() => setCategoryToDelete(cat)}
                    style={{ ...iconBtn, color: "#ef4444" }}
                    aria-label={`Delete ${cat.name}`}
                    title="Delete"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </>
            )}
          </div>
        ))
      )}
    </div>
  )

  return (
    <div style={containerStyle}>
      <h2 style={{ marginTop: 0, marginBottom: 24 }}>Categories</h2>

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h3 style={sectionTitleStyle}>Expense Categories</h3>
            <p style={sectionDescriptionStyle}>Categories used when recording expenses.</p>
          </div>
        </div>

        <div style={addRowStyle}>
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="New expense category"
            style={inputStyle}
          />
          <button onClick={() => addCategory("expense")} style={addButtonStyle}>
            <FiPlus />
          </button>
        </div>

        {renderCategoryList(expenseCategories, "No expense categories yet.")}
      </section>

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h3 style={sectionTitleStyle}>Income Categories</h3>
            <p style={sectionDescriptionStyle}>Categories used when recording income.</p>
          </div>
        </div>

        <div style={addRowStyle}>
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="New income category"
            style={inputStyle}
          />
          <button onClick={() => addCategory("income")} style={incomeAddButtonStyle}>
            <FiPlus />
          </button>
        </div>

        {renderCategoryList(incomeCategories, "No income categories yet.")}
      </section>

      {categoryToDelete && (
        <ConfirmModal
          message={`Are you sure you want to delete "${categoryToDelete.name}"?`}
          onConfirm={confirmDelete}
          onCancel={() => setCategoryToDelete(null)}
        />
      )}
    </div>
  )
}

const containerStyle = { padding: 24, background: "var(--card)", color: "var(--text)", borderRadius: 16 }
const sectionStyle = { marginBottom: 24, padding: 18, border: "1px solid var(--border)", borderRadius: 14 }
const sectionHeaderStyle = { marginBottom: 14 }
const sectionTitleStyle = { margin: 0, fontSize: 18 }
const sectionDescriptionStyle = { margin: "5px 0 0", color: "var(--text-secondary)", fontSize: 13 }
const addRowStyle = { display: "flex", gap: 10, marginBottom: 16 }
const inputStyle = { padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", flex: 1, minWidth: 0 }
const addButtonStyle = { width: 42, height: 42, borderRadius: 10, border: "none", background: "#ef4444", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }
const incomeAddButtonStyle = { ...addButtonStyle, background: "#16a34a" }
const listStyle = { display: "flex", flexDirection: "column", gap: 8 }
const rowStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)" }
const categoryNameStyle = { display: "flex", alignItems: "center", gap: 10, minWidth: 0 }
const actionsStyle = { display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }
const iconBtn = { width: 32, height: 32, background: "transparent", border: "none", cursor: "pointer", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }
const textButtonStyle = { border: "1px solid var(--border)", background: "transparent", color: "var(--text)", borderRadius: 8, padding: "7px 10px", cursor: "pointer" }
const emptyStyle = { color: "var(--text-secondary)", fontSize: 14, margin: "6px 0" }
