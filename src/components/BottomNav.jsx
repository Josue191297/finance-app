export default function BottomNav({ activeTab, setActiveTab }) {
  const tabs = [
    { key: "dashboard", label: "Dashboard" },
    { key: "tasks", label: "Tasks" },
    { key: "summary", label: "Summary" },
    { key: "settings", label: "Settings" },
  ];

  return (
    <nav style={navStyle}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          style={{
            ...buttonStyle,
            color: activeTab === tab.key ? "#1677ff" : "#888",
            fontWeight: activeTab === tab.key ? "600" : "400",
          }}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

const navStyle = {
  position: "fixed",
  bottom: 0,
  width: "100%",
  display: "flex",
  justifyContent: "space-around",
  padding: "12px 0",
  background: "var(--card)",
  borderTop: "1px solid #eee"
};

const buttonStyle = {
  background: "none",
  border: "none",
  fontSize: 14,
  cursor: "pointer",
};
