import { useState } from "react"
import { auth } from "../firebase"
import { signInWithEmailAndPassword } from "firebase/auth"

// Login only: household members are added in the Firebase console.
function Auth() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      setEmail("")
      setPassword("")
    } catch (err) {
      if (err.code === "auth/invalid-email") {
        setError("Invalid email format.")
      } else if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        setError("Incorrect email or password.")
      } else {
        setError("Something went wrong. Please try again.")
      }
    }

    setLoading(false)
  }

  return (
    <div style={container}>
      <div style={card}>
        <h2 style={title}>Welcome Back</h2>

        <form onSubmit={handleSubmit} style={form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={input}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={input}
          />

          {error && <p style={errorText}>{error}</p>}

          <button type="submit" style={button} disabled={loading}>
            {loading ? "Please wait..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Auth

/* ---------------- STYLES ---------------- */

const container = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--bg)",
  transition: "0.3s"
}

const card = {
  width: "90%",
  maxWidth: 400,
  padding: 30,
  borderRadius: 16,
  background: "var(--card)",
  boxShadow: "0 10px 25px rgba(0,0,0,0.1)"
}

const title = {
  marginBottom: 20,
  color: "var(--text)",
  textAlign: "center"
}

const form = {
  display: "flex",
  flexDirection: "column",
  gap: 15
}

const input = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--input-bg)",
  color: "var(--text)",
  fontSize: 14
}

const button = {
  padding: 12,
  borderRadius: 8,
  border: "none",
  background: "var(--primary)",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer"
}

const errorText = {
  color: "red",
  fontSize: 12
}
