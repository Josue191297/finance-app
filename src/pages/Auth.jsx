import { useState } from "react"
import { signInWithPopup, signOut } from "firebase/auth"
import { FcGoogle } from "react-icons/fc"
import { auth, provider } from "../firebase"

// Google sign-in; only the accounts in PEOPLE (src/firebase.js) get in.
function Auth({ user }) {
  const [error, setError] = useState("")

  const signIn = () => {
    setError("")
    signInWithPopup(auth, provider).catch((e) => {
      if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request") {
        setError("Could not sign in. Please try again.")
      }
    })
  }

  return (
    <div style={container}>
      <div style={card}>
        <h1 style={title}>Finance</h1>

        {user ? (
          <>
            <p style={errorText}>{user.email} doesn't have access.</p>
            <button style={secondaryButton} onClick={() => signOut(auth)}>
              Use another account
            </button>
          </>
        ) : (
          <>
            <p style={subtitle}>Sign in to see your household finances.</p>
            <button style={googleButton} onClick={signIn}>
              <FcGoogle size={20} aria-hidden="true" />
              Sign in with Google
            </button>
            {error && <p style={errorText} role="alert">{error}</p>}
          </>
        )}
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
  padding: 16,
  background: "var(--bg)",
}

const card = {
  width: "100%",
  maxWidth: 380,
  padding: "36px 28px",
  borderRadius: 20,
  background: "var(--card)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 14,
  textAlign: "center",
}

const title = {
  margin: 0,
  fontSize: 28,
  color: "var(--text)",
}

const subtitle = {
  margin: 0,
  color: "var(--text-secondary)",
}

const googleButton = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  padding: "12px 16px",
  fontWeight: 600,
}

const secondaryButton = {
  width: "100%",
  padding: "12px 16px",
}

const errorText = {
  margin: 0,
  color: "var(--expense)",
  fontSize: 14,
}
