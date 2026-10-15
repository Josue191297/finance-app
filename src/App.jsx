import { Routes, Route, NavLink } from "react-router-dom"
import { useState, useEffect } from "react"
import {
  FiHome,
  FiBarChart2,
  FiSettings,
  FiPlus,
  FiDollarSign,
  FiCalendar,
  FiTarget,

} from "react-icons/fi"

import Dashboard from "./pages/Dashboard"
import AddExpense from "./pages/AddExpense"
import Settings from "./pages/Settings"
import SlideModal from "./components/SlideModal"
import Summary from "./pages/Summary"
import Auth from "./pages/Auth"
import FutureExpenseForm from "./pages/FutureExpenseForm"
import FutureExpenses from "./pages/FutureExpenses"
import History from "./pages/History"
import SavingsGoals from "./pages/SavingGoals"


import SyncIndicator from "./components/SyncIndicator"

import { auth, db } from "./firebase"
import { onAuthStateChanged } from "firebase/auth"
import {
  collection,
  onSnapshot,
  addDoc,
} from "firebase/firestore"
import { householdId } from "./household"

function App() {

  /* ---------------- THEME ---------------- */

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "light"
  })

  useEffect(() => {
    document.body.setAttribute("data-theme", theme)
    localStorage.setItem("theme", theme)
  }, [theme])

  /* ---------------- AUTH ---------------- */

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  /* ---------------- STATE ---------------- */

  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [fabOpen, setFabOpen] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showFutureExpenseModal, setShowFutureExpenseModal] = useState(false)

  /* ---------------- FIRESTORE SYNC ---------------- */

  useEffect(() => {
    if (!user) return

    const unsubExpenses = onSnapshot(
      collection(db, "households", householdId, "expenses"),
      snapshot => {
        setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      }
    )

    const unsubCategories = onSnapshot(
      collection(db, "households", householdId, "categories"),
      snapshot => {
        // Drag-and-drop order from Settings; categories never reordered keep creation order.
        setCategories(
          snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) =>
              (a.order ?? Infinity) - (b.order ?? Infinity) ||
              (a.createdAt || 0) - (b.createdAt || 0)
            )
        )
      }
    )

    return () => {
      unsubExpenses()
      unsubCategories()

    }
  }, [user])


  /* ---------------- ADD EXPENSE ---------------- */

  const addExpense = async (expense) => {
    await addDoc(collection(db, "households", householdId, "expenses"), {
      ...expense,
      createdAt: Date.now()
    })
  }

  /* ---------------- GUARDS ---------------- */

  if (loading) {
    return <div style={{ padding: 40 }}>Loading...</div>
  }

  if (!user) {
    return <Auth />
  }

  /* ---------------- UI ---------------- */

  return (
    <div style={appContainer}>
      <SyncIndicator />

      <Routes>
        <Route
          path="/"
          element={<Dashboard categories={categories} expenses={expenses} />}
        />

        <Route
          path="/summary"
          element={<Summary expenses={expenses} categories={categories} />}
        />

        <Route 
          path="/history"
          element={<History expenses={expenses} />}
        />

        <Route
          path="/goals"
          element={<SavingsGoals expenses={expenses} />}
        />

        <Route
          path="/settings"
          element={
            <Settings
              categories={categories}
              theme={theme}
              setTheme={setTheme}
            />
          }
        />

        <Route
          path="/future"
          element={<FutureExpenses categories={categories} />}
        />
      </Routes>

      {/* FAB */}

      <div style={fabWrapper}>
        {fabOpen && (
          <div style={miniFabContainer}>

            <button
              style={{ ...miniFab, marginTop: 10 }}
              title="Add transaction"
              aria-label="Add transaction"
              onClick={() => {setShowExpenseModal(true)
                setFabOpen(false)
              }}
            >
              <FiDollarSign size={20} />
            </button>

            <button
              style={{ ...miniFab, marginTop: 10 }}
              title="Add upcoming payment"
              aria-label="Add upcoming payment"
              onClick={() => {setShowFutureExpenseModal(true)
                setFabOpen(false)
              }}
            >
              <FiCalendar size={20} />
            </button>
          </div>
        )}

        <button
          style={mainFab}
          aria-label="Add"
          onClick={() => setFabOpen(prev => !prev)}
        >
          <FiPlus size={24} />
        </button>
      </div>

      {/* EXPENSE MODAL */}

      {showExpenseModal && (
        <div
          style={overlayStyle}
          onClick={() => setShowExpenseModal(false)}
        >
          <div
            style={floatingModalStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              style={closeButtonStyle}
              onClick={() => setShowExpenseModal(false)}
            >
              ×
            </button>

            <AddExpense
              onAdd={async (expense) => {
                await addExpense(expense)
                setShowExpenseModal(false)
                setFabOpen(false)
              }}
              onClose={() => {
                setShowExpenseModal(false)
                setFabOpen(false)
              }}
              categories={categories}
            />
          </div>
        </div>
      )}

      {/* FUTURE EXPENSE MODAL */}

      {showFutureExpenseModal && (
        <SlideModal onClose={() => setShowFutureExpenseModal(false)}>
          <FutureExpenseForm
            categories={categories}
            onClose={() => {
              setShowFutureExpenseModal(false)
              setFabOpen(false)
            }}
          />
        </SlideModal>
      )}

      {/* NAV */}

      <nav style={navStyle}>
        <NavItem to="/" icon={<FiHome />} label="Home" />
        <NavItem to="/summary" icon={<FiBarChart2 />} label="Summary" />
        <NavItem to="/future" icon={<FiCalendar />} label="Upcoming" />
        <NavItem to="/goals" icon={<FiTarget />} label="Goals" />
        <NavItem to="/settings" icon={<FiSettings />} label="Settings" />
      </nav>
    </div>
  )
}

export default App

/* STYLES */

const appContainer = {
  paddingBottom: 100,
  minHeight: "100vh",
  background: "var(--bg)"
}

const fabWrapper = {
  position: "fixed",
  bottom: 90,
  right: 20,
  display: "flex",
  flexDirection: "column",
  alignItems: "center"
}

const miniFabContainer = {
  marginBottom: 10,
  display: "flex",
  flexDirection: "column",
  alignItems: "center"
}

const miniFab = {
  width: 46,
  height: 46,
  padding: 0,
  display: "grid",
  placeItems: "center",
  borderRadius: "50%",
  border: "none",
  background: "var(--card)",
  color: "var(--primary)",
  boxShadow: "var(--shadow)",
  cursor: "pointer"
}

const mainFab = {
  width: 56,
  height: 56,
  padding: 0,
  display: "grid",
  placeItems: "center",
  borderRadius: "50%",
  border: "none",
  background: "var(--primary)",
  color: "white",
  boxShadow: "0 6px 18px rgba(37, 99, 235, 0.35)",
  cursor: "pointer"
}

const navStyle = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  height: 64,
  paddingBottom: "env(safe-area-inset-bottom)",
  background: "var(--card)",
  borderTop: "1px solid var(--border)",
  display: "flex",
  justifyContent: "space-around",
  alignItems: "center",
  zIndex: 100
}

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 2000,
  padding: 20
}

const floatingModalStyle = {
  background: "var(--card)",
  width: "100%",
  maxWidth: 550,
  maxHeight: "90vh",
  overflowY: "auto",
  borderRadius: 16,
  boxShadow: "0 12px 30px rgba(0,0,0,0.3)",
  position: "relative"
}

const closeButtonStyle = {
  position: "absolute",
  top: 12,
  right: 12,
  width: 32,
  height: 32,
  border: "none",
  borderRadius: "50%",
  background: "var(--border)",
  color: "var(--text)",
  cursor: "pointer",
  fontSize: 18,
  lineHeight: 1,
  zIndex: 10
}

function NavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      end
      style={({ isActive }) => ({
        color: isActive ? "var(--primary)" : "var(--text-secondary)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        minWidth: 56,
        fontSize: 11,
        fontWeight: isActive ? 600 : 500
      })}
    >
      <span style={{ fontSize: 21, lineHeight: 1 }}>{icon}</span>
      {label}
    </NavLink>
  )
}
