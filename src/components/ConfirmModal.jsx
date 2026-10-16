// Confirmation dialog. Without onConfirm it is a plain message with a single OK button.
export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}) {
  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div
        style={modalStyle}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h3 style={titleStyle}>{title}</h3>}
        <p style={messageStyle}>{message}</p>

        <div style={buttonRowStyle}>
          {onConfirm ? (
            <>
              <button onClick={onCancel}>Cancel</button>
              <button onClick={onConfirm} style={dangerButtonStyle} autoFocus>
                {confirmLabel}
              </button>
            </>
          ) : (
            <button onClick={onCancel} style={primaryButtonStyle} autoFocus>
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 2000,
}

const modalStyle = {
  background: "var(--card)",
  color: "var(--text)",
  padding: 22,
  borderRadius: 18,
  width: "min(360px, 100%)",
  boxShadow: "0 12px 30px rgba(0,0,0,0.3)",
}

const titleStyle = {
  margin: "0 0 6px",
  fontSize: 18,
}

const messageStyle = {
  margin: 0,
  color: "var(--text-secondary)",
  lineHeight: 1.5,
}

const buttonRowStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  marginTop: 20,
}

const dangerButtonStyle = {
  border: "none",
  background: "var(--expense)",
  color: "white",
  fontWeight: 600,
}

const primaryButtonStyle = {
  border: "none",
  background: "var(--primary)",
  color: "white",
  fontWeight: 600,
}
