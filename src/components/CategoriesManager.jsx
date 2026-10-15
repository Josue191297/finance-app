import { useRef, useState } from "react"
import { FiEdit2, FiTrash2, FiPlus, FiMenu } from "react-icons/fi"
import { collection, addDoc, deleteDoc, doc, getDocs, writeBatch } from "firebase/firestore"
import { db } from "../firebase"
import { householdId } from "../household"
import ConfirmModal from "./ConfirmModal"

export default function CategoriesManager({ categories = [] }) {
  const [newCategory, setNewCategory] = useState({ expense: "", income: "" })
  const [editingId, setEditingId] = useState(null)
  const [editingValue, setEditingValue] = useState("")
  const [categoryToDelete, setCategoryToDelete] = useState(null)
  const [drag, setDrag] = useState(null) // { type, ids, activeId } while a row is dragged
  const rowRefs = useRef({})

  const expenseCategories = categories.filter(
    (cat) => (cat.type || "expense") === "expense"
  )

  const incomeCategories = categories.filter(
    (cat) => (cat.type || "expense") === "income"
  )

  const addCategory = async (type) => {
    const name = newCategory[type].trim()
    if (!name) return

    try {
      await addDoc(
        collection(db, "households", householdId, "categories"),
        {
          name,
          type,
          createdAt: Date.now(),
        }
      )
      setNewCategory((prev) => ({ ...prev, [type]: "" }))
    } catch (error) {
      console.error("Error adding category:", error)
    }
  }

  /* ---------- REORDER (pointer drag works with mouse and touch) ---------- */

  const saveOrder = async (ids) => {
    const batch = writeBatch(db)
    ids.forEach((id, index) =>
      batch.update(doc(db, "households", householdId, "categories", id), { order: index })
    )
    try {
      await batch.commit()
    } catch (error) {
      console.error("Error saving category order:", error)
    }
  }

  const startDrag = (e, type, list, id) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ type, ids: list.map((cat) => cat.id), activeId: id })
  }

  const moveDrag = (e) => {
    if (!drag) return
    const others = drag.ids.filter((id) => id !== drag.activeId)
    let index = others.findIndex((id) => {
      const rect = rowRefs.current[id]?.getBoundingClientRect()
      return rect && e.clientY < rect.top + rect.height / 2
    })
    if (index === -1) index = others.length
    const ids = [...others.slice(0, index), drag.activeId, ...others.slice(index)]
    if (ids.join() !== drag.ids.join()) setDrag({ ...drag, ids })
  }

  const endDrag = (list) => {
    if (!drag) return
    if (drag.ids.join() !== list.map((cat) => cat.id).join()) saveOrder(drag.ids)
    setDrag(null)
  }

  // Keyboard alternative: arrow keys on the handle move the category one step.
  const moveWithKeys = (e, list, index) => {
    const step = { ArrowUp: -1, ArrowDown: 1 }[e.key]
    const target = index + (step || 0)
    if (!step || target < 0 || target >= list.length) return
    e.preventDefault()
    const ids = list.map((cat) => cat.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    saveOrder(ids)
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

  const renderCategoryList = (list, type, emptyMessage) => {
    const shown =
      drag?.type === type
        ? drag.ids.map((id) => list.find((cat) => cat.id === id)).filter(Boolean)
        : list

    return (
    <div style={listStyle}>
      {shown.length === 0 ? (
        <p style={emptyStyle}>{emptyMessage}</p>
      ) : (
        shown.map((cat, index) => (
          <div
            key={cat.id}
            ref={(el) => {
              rowRefs.current[cat.id] = el
            }}
            style={drag?.activeId === cat.id ? { ...rowStyle, ...draggingRowStyle } : rowStyle}
          >
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
                  <button
                    type="button"
                    style={{ ...handleStyle, cursor: drag ? "grabbing" : "grab" }}
                    aria-label={`Reorder ${cat.name}. Drag, or use the up and down arrow keys.`}
                    title="Drag to reorder"
                    onPointerDown={(e) => startDrag(e, type, list, cat.id)}
                    onPointerMove={moveDrag}
                    onPointerUp={() => endDrag(list)}
                    onPointerCancel={() => setDrag(null)}
                    onKeyDown={(e) => moveWithKeys(e, list, index)}
                  >
                    <FiMenu />
                  </button>
                  <span style={categoryTextStyle}>{cat.name}</span>
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
                    style={{ ...iconBtn, color: "var(--expense)" }}
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
  }

  return (
    <div style={containerStyle}>
      <h2 style={{ marginTop: 0, marginBottom: 24 }}>Categories</h2>

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h3 style={sectionTitleStyle}>Expense Categories</h3>
            <p style={sectionDescriptionStyle}>Drag ☰ to change the order used in every list.</p>
          </div>
        </div>

        <div style={addRowStyle}>
          <input
            value={newCategory.expense}
            onChange={(e) => setNewCategory((prev) => ({ ...prev, expense: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && addCategory("expense")}
            placeholder="New expense category"
            aria-label="New expense category"
            style={inputStyle}
          />
          <button onClick={() => addCategory("expense")} style={addButtonStyle} aria-label="Add expense category">
            <FiPlus />
          </button>
        </div>

        {renderCategoryList(expenseCategories, "expense", "No expense categories yet.")}
      </section>

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h3 style={sectionTitleStyle}>Income Categories</h3>
            <p style={sectionDescriptionStyle}>Drag ☰ to change the order used in every list.</p>
          </div>
        </div>

        <div style={addRowStyle}>
          <input
            value={newCategory.income}
            onChange={(e) => setNewCategory((prev) => ({ ...prev, income: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && addCategory("income")}
            placeholder="New income category"
            aria-label="New income category"
            style={inputStyle}
          />
          <button onClick={() => addCategory("income")} style={incomeAddButtonStyle} aria-label="Add income category">
            <FiPlus />
          </button>
        </div>

        {renderCategoryList(incomeCategories, "income", "No income categories yet.")}
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
const addButtonStyle = { width: 42, height: 42, borderRadius: 10, border: "none", background: "var(--expense)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }
const incomeAddButtonStyle = { ...addButtonStyle, background: "var(--income)" }
const listStyle = { display: "flex", flexDirection: "column", gap: 8 }
const rowStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 10px 8px 4px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", transition: "box-shadow 0.15s ease, transform 0.15s ease", userSelect: "none" }
const draggingRowStyle = { position: "relative", zIndex: 1, borderColor: "var(--primary)", boxShadow: "0 8px 24px rgba(0,0,0,0.18)", transform: "scale(1.02)" }
const categoryNameStyle = { display: "flex", alignItems: "center", gap: 6, minWidth: 0 }
const categoryTextStyle = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }
const handleStyle = { width: 40, height: 40, padding: 0, flexShrink: 0, display: "grid", placeItems: "center", border: "none", background: "transparent", color: "var(--text-secondary)", touchAction: "none" }
const actionsStyle = { display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }
const iconBtn = { width: 32, height: 32, background: "transparent", border: "none", cursor: "pointer", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }
const textButtonStyle = { border: "1px solid var(--border)", background: "transparent", color: "var(--text)", borderRadius: 8, padding: "7px 10px", cursor: "pointer" }
const emptyStyle = { color: "var(--text-secondary)", fontSize: 14, margin: "6px 0" }
