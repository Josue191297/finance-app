export default function FloatingActions() {
  return (
    <div style={containerStyle}>
      <button style={fabStyle}>+ Task</button>

      <button style={{ ...fabStyle, marginTop: 15 }}>
        DDD
      </button>
    </div>
  );
}

const containerStyle = {
  position: "fixed",
  bottom: 85,
  right: 20,
  display: "flex",
  flexDirection: "column",
  gap: 15,
  zIndex: 1100,
};

const fabStyle = {
  width: 55,
  height: 55,
  borderRadius: "50%",
  border: "none",
  background: "var(--primary)",
  color: "white",
  cursor: "pointer",
  boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  lineHeight: 0,
};