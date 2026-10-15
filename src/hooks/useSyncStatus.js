import { useEffect, useState } from "react"

export default function useSyncStatus() {
  const [status, setStatus] = useState(navigator.onLine ? "synced" : "offline")

  useEffect(() => {
    const handleOffline = () => setStatus("offline")
    const handleOnline = () => setStatus("synced")

    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)

    return () => {
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("online", handleOnline)
    }
  }, [])

  return { status }
}
