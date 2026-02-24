import { Routes, Route, NavLink, useLocation } from "react-router-dom"
import { useState, useEffect } from "react"
import { FiHome, FiCheckSquare, FiBarChart2, FiSettings, FiPlus, FiDollarSign } from "react-icons/fi"
import Dashboard from "./pages/Dashboard"
import AddExpense from "./pages/AddExpense"
import Tasks from "./pages/Tasks"
import TaskForm from "./components/TaskForm"
import Settings from "./pages/Settings"
import SlideModal from "./components/SlideModal"
import Summary from "./pages/Summary"

function App() {
  const location = useLocation()

  /* ---------------- THEME ---------------- */

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "light"
  })

  useEffect(() => {
    document.body.setAttribute("data-theme", theme)
    localStorage.setItem("theme", theme)
  }, [theme])

  /* ---------------- STATE ---------------- */

  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([
    "Food",
    "Transport",
    "Bills",
    "Entertainment",
    "Other"
  ])
  const [tasks, setTasks] = useState([])
  const [fabOpen, setFabOpen] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)

  /* ---------------- LOAD ---------------- */

  useEffect(() => {
    const savedExpenses = localStorage.getItem("expenses")
    if (savedExpenses) setExpenses(JSON.parse(savedExpenses))
  }, [])

  useEffect(() => {
    const savedCategories = localStorage.getItem("categories")
    if (savedCategories) setCategories(JSON.parse(savedCategories))
  }, [])

  useEffect(() => {
    const savedTasks = localStorage.getItem("tasks")
    if (savedTasks) setTasks(JSON.parse(savedTasks))
  }, [])

  /* ---------------- SAVE ---------------- */

  useEffect(() => {
    localStorage.setItem("expenses", JSON.stringify(expenses))
  }, [expenses])

  useEffect(() => {
    localStorage.setItem("categories", JSON.stringify(categories))
  }, [categories])

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks))
  }, [tasks])

  /* ---------------- FAB CONTROL ---------------- */

  const hideFabPages = ["/settings"]
  const hideFab = hideFabPages.includes(location.pathname)

  return (
    <div style={{ paddingBottom: 120, minHeight: "100vh", background: "var(--bg)", transition: "0.3s" }}>

      {/* ROUTES */}
      <Routes>
        <Route
          path="/"
          element={
            <Dashboard
              expenses={expenses}
              setExpenses={setExpenses}
              categories={categories}
            />
          }
        />

        <Route
          path="/tasks"
          element={<Tasks tasks={tasks} setTasks={setTasks} />}
        />

        <Route
          path="/summary"
          element={
            <Summary
              expenses={expenses}
              categories={categories}
            />
          }
        />

        <Route
          path="/settings"
          element={
            <Settings
              categories={categories}
              setCategories={setCategories}
              theme={theme}
              setTheme={setTheme}
            />
          }
        />
      </Routes>

      {/* ---------- FAB ---------- */}
      {!hideFab && (
        <div style={fabContainer}>

          <div
            style={{
              ...miniContainer,
              opacity: fabOpen ? 1 : 0,
              transform: fabOpen ? "translateY(0)" : "translateY(20px)",
              pointerEvents: fabOpen ? "auto" : "none"
            }}
          >
            <button style={miniFab} onClick={() => setShowTaskModal(true)}>
              <FiCheckSquare size={22} style={{display: "block"}}/>
            </button>

            <button
              style={{ ...miniFab, marginTop: 12 }}
              onClick={() => setShowExpenseModal(true)}>
              <FiDollarSign size={22} style={{display: "block"}}/>
            </button>
          </div>

          <button
            style={{
              ...mainFab,
              transform: fabOpen ? "rotate(45deg)" : "rotate(0deg)"
            }}
            onClick={() => setFabOpen(!fabOpen)}
          >
            <FiPlus size={24} style={{display: "block"}}/>
          </button>
        </div>
      )}

      {/* ---------- MODALS ---------- */}

      {showTaskModal && (
        <SlideModal onClose={() => setShowTaskModal(false)}>
          <TaskForm
            onAdd={(task) => {
              setTasks(prev => [task, ...prev])
              setShowTaskModal(false)
              setFabOpen(false)
            }}
          />
        </SlideModal>
      )}

      {showExpenseModal && (
        <SlideModal onClose={() => setShowExpenseModal(false)}>
          <AddExpense
            expenses={expenses}
            setExpenses={setExpenses}
            categories={categories}
          />
        </SlideModal>
      )}

      {/* ---------- BOTTOM NAV ---------- */}
      <nav style={navStyle}>
        <NavItem to="/" icon={<FiHome />} />
        <NavItem to="/tasks" icon={<FiCheckSquare />} />
        <NavItem to="/summary" icon={<FiBarChart2 />} />
        <NavItem to="/settings" icon={<FiSettings />} />
      </nav>

    </div>
  )
}

export default App

/* ---------- NAV ITEM ---------- */

function NavItem({ to, icon }) {
  return (
    <NavLink to={to} style={navLinkStyle}>
      {({ isActive }) => (
        <div style={navItem}>
          {isActive && <div style={activeIndicator} />}
          <div
            style={{
              color: isActive ? "var(--primary)" : "var(--text-secondary)",
              fontSize: 22,
              zIndex: 2
            }}
          >
            {icon}
          </div>
        </div>
      )}
    </NavLink>
  )
}

/* ---------- STYLES ---------- */

const navStyle = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  height: 70,
  background: "var(--card)",
  display: "flex",
  justifyContent: "space-around",
  alignItems: "center",
  borderTop: "1px solid var(--border)",
  boxShadow: "0 -2px 10px rgba(0,0,0,0.05)",
  zIndex: 1000,
  transition: "0.3s"
}

const navLinkStyle = {
  textDecoration: "none",
}

const navItem = {
  position: "relative",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  width: 60,
  height: 60,
}

const activeIndicator = {
  position: "absolute",
  width: 40,
  height: 40,
  background: "var(--primary-soft)",
  borderRadius: "50%",
  transition: "all 0.3s ease",
}

const fabContainer = {
  position: "fixed",
  bottom: 90,
  right: 20,
  zIndex: 1100,
  display: "flex",
  flexDirection: "column",
  alignItems: "center"
}

const mainFab = {
  width: 60,
  height: 60,
  borderRadius: "50%",
  border: "none",
  background: "var(--primary)",
  color: "white",
  cursor: "pointer",
  boxShadow: "0 5px 15px rgba(0,0,0,0.2)",
  transition: "all 0.3s ease",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  lineHeight: 0
}

const miniContainer = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  marginBottom: 10,
  transition: "all 0.3s ease"
}

const miniFab = {
  width: 45,
  height: 45,
  borderRadius: "50%",
  border: "1px solid var(--border)",
  background: "var(--card)",
  color: "var(--text)",
  cursor: "pointer",
  boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  lineHeight: 0
}