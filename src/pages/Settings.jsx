import { useState } from "react";
import CategoriesManager from "../components/CategoriesManager";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function Settings({ categories, expenses, theme, setTheme }) {

  const [activeSection, setActiveSection] = useState(null);
  const navigate = useNavigate();

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

  return (
    <div
      style={{
        padding: "clamp(12px, 4vw, 24px)",
        width: "100%",
        maxWidth: 1100,
        margin: "0 auto"
      }}
    >
      {/* MAIN MENU */}
      {!activeSection && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          <button
            onClick={() => setActiveSection("categories")}
            style={cardButton}
          >
            Manage Categories
          </button>

          <button
            onClick={() => navigate("/history")}
            style={cardButton}
          >
            History
          </button>

          <button
            onClick={() => setActiveSection("theme")}
            style={cardButton}
          >
            Theme
          </button>
          
          <button
            onClick={() => setActiveSection("logout")}
            style={cardButton}
          >
            Logout
          </button>

        </div>
      )}

      {/* CATEGORIES SECTION */}
      {activeSection === "categories" && (
        <>
          <button
            onClick={() => setActiveSection(null)}
            style={backButton}
          >
            ← Back
          </button>

          <CategoriesManager
            categories={categories}
            expenses={expenses}
          />
        </>
      )}

      {/* LOGOUT SECTION */}
      {activeSection === "logout" && (
        <>
          <button
            onClick={() => setActiveSection(null)}
            style={backButton}
          >
            ← Back
          </button>

          <button
            onClick={() => signOut(auth)}
          >
            Logout
          </button>
        </>
      )}

      {/* THEME SECTION */}
      {activeSection === "theme" && (
        <>
          <button
            onClick={() => setActiveSection(null)}
            style={backButton}
          >
            ← Back
          </button>

          <div
            style={{
              background: "var(--card)",
              padding: 20,
              borderRadius: 12,
              border: "1px solid var(--border)"
            }}
          >
            <h2 style={{ marginTop: 0 }}>Theme</h2>

            <button onClick={toggleTheme}>
              Switch to {theme === "light" ? "Dark" : "Light"} Mode
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- STYLES ---------- */

const cardButton = {
  width: "100%",
  padding: 16,
  borderRadius: 12,
  background: "var(--card)",
  border: "1px solid var(--border)",
  textAlign: "left",
  fontSize: 16,
  cursor: "pointer"
};

const backButton = {
  marginBottom: 16,
  background: "none",
  border: "none",
  color: "var(--primary)",
  cursor: "pointer",
  fontSize: 16
};