export default function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <p>{message}</p>

        <div style={{ marginTop: 20, textAlign: "right" }}>
          <button onClick={onCancel}>Cancel</button>
          <button
            onClick={onConfirm}
            style={{ marginLeft: 10, background: "#ff4d4f", color: "white" }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalStyle = {
  background: "var(--card)",
  color: "var(--text)",
  padding: 30,
  borderRadius: 12,
  width: 300,
  boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
};
