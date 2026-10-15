import useSyncStatus from "../hooks/useSyncStatus"

export default function SyncIndicator() {
  const { status } = useSyncStatus()

  const getColor = () => {
    if (status === "saving") return "#facc15" // yellow
    if (status === "offline") return "#ef4444" // red
    return "#22c55e" // green
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        width: 12,
        height: 12,
        borderRadius: "50%",
        backgroundColor: getColor(),
        boxShadow: "0 0 6px rgba(0,0,0,0.3)",
        zIndex: 9999,
        transition: "background-color 0.3s ease",
      }}
      title={
        status === "saving"
          ? "Saving..."
          : status === "offline"
          ? "Offline"
          : "Synced"
      }
    />
  )
}