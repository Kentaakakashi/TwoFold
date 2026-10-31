import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import DiagnosticsPanel from "./components/DiagnosticsPanel.jsx";

// Keep a small in-memory queue so errors caught during startup are not lost.
window.__TWF_DIAG_QUEUE__ = window.__TWF_DIAG_QUEUE__ || [];
window.__TWF_DIAG_RECORD__ = (detail) => {
  const item = {
    ...detail,
    time: new Date().toISOString(),
  };
  window.__TWF_DIAG_QUEUE__ = [...window.__TWF_DIAG_QUEUE__, item].slice(-40);
  window.dispatchEvent(new CustomEvent("twf:diagnostic", { detail: item }));
};

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    window.__TWF_DIAG_RECORD__?.({
      type: "React rendering error",
      message: error?.message || "The page could not render correctly.",
      stack: [error?.stack, info?.componentStack].filter(Boolean).join("\n"),
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#0f0f1a", color: "#fff", textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
          <div style={{ maxWidth: 440 }}>
            <h1 style={{ fontSize: 22, marginBottom: 10 }}>Something went wrong</h1>
            <p style={{ color: "#aab4c5", lineHeight: 1.6, marginBottom: 18 }}>
              TwoFold hit a rendering error. Open the Diagnostics panel in the corner and copy the report so the problem can be investigated.
            </p>
            <button onClick={() => window.location.reload()} style={{ border: 0, borderRadius: 8, padding: "11px 16px", background: "#2563eb", color: "#fff", fontWeight: 700 }}>
              Reload TwoFold
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
      <DiagnosticsPanel />
    </>
  </React.StrictMode>
);
