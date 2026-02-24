function SlideModal({ children, onClose }) {
  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalContent} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

export default SlideModal

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "flex-end",
  zIndex: 2000,
}

const modalContent = {
  background: "var(--card)",
  color: "var(--text)",
  maxHeight: "90vh",
  width: "100%",
  maxWidth: 600,
  margin: "0 auto",
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  padding: 20,
  boxShadow: "0 -4px 20px rgba(0,0,0,0.2)"
}