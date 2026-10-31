import { useEffect, useMemo, useState } from "react";

const MAX_ERRORS = 40;

function safeUrl(value) {
  try {
    const url = new URL(value, window.location.href);
    return url.origin + url.pathname;
  } catch {
    return String(value || "Unknown");
  }
}

function makeReport(errors) {
  const nav = performance.getEntriesByType?.("navigation")?.[0];
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const lines = [
    "TWOFOLD WEBSITE DIAGNOSTIC REPORT",
    "================================",
    `Time: ${new Date().toISOString()}`,
    `Page: ${safeUrl(window.location.href)}`,
    `Browser: ${navigator.userAgent}`,
    `Language: ${navigator.language || "Unknown"}`,
    `Online: ${navigator.onLine ? "Yes" : "No"}`,
    `Viewport: ${window.innerWidth} x ${window.innerHeight}`,
    `Screen: ${screen.width} x ${screen.height}`,
    `Pixel ratio: ${window.devicePixelRatio || 1}`,
    `Platform: ${navigator.platform || "Unknown"}`,
    `Connection: ${connection?.effectiveType || "Not available"}`,
    `Document state: ${document.readyState}`,
    `Page load: ${nav?.loadEventEnd ? Math.round(nav.loadEventEnd) + " ms" : "Not available"}`,
    `Errors captured: ${errors.length}`,
    "",
    "ERROR DETAILS",
    "-------------",
  ];

  if (!errors.length) lines.push("No errors captured yet. Use the test button only if you want to verify the panel.");
  errors.forEach((error, index) => {
    lines.push(
      "",
      `[${index + 1}] ${error.type}`,
      `Message: ${error.message}`,
      `Source: ${error.source || "Not available"}`,
      `Time: ${error.time}`,
      error.stack ? `Stack: ${error.stack}` : ""
    );
  });

  lines.push("", "Please diagnose the issue and suggest the exact files/code to fix.");
  return lines.filter(Boolean).join("\n");
}

export default function DiagnosticsPanel() {
  const [errors, setErrors] = useState(() => window.__TWF_DIAG_QUEUE__ || []);
  const [open, setOpen] = useState(false);
  const [copyState, setCopyState] = useState("");

  useEffect(() => {
    const record = (detail) => {
      const entry = {
        type: detail.type || "Runtime error",
        message: String(detail.message || "Unknown error"),
        source: detail.source ? safeUrl(detail.source) : "",
        stack: detail.stack ? String(detail.stack).slice(0, 5000) : "",
        time: new Date().toISOString(),
      };
      setErrors((current) => {
        const next = [...current, entry].slice(-MAX_ERRORS);
        window.__TWF_DIAG_QUEUE__ = next;
        return next;
      });
      setOpen(true);
    };

    const onWindowError = (event) => {
      if (event.target && event.target !== window) {
        const target = event.target;
        record({
          type: "Resource failed to load",
          message: `${target.tagName || "Resource"} failed to load`,
          source: target.src || target.href || "",
        });
        return;
      }
      record({
        type: "JavaScript error",
        message: event.message || "Unknown JavaScript error",
        source: event.filename || "",
        stack: event.error?.stack || "",
      });
    };

    const onRejection = (event) => {
      const reason = event.reason;
      record({
        type: "Unhandled promise rejection",
        message: reason?.message || String(reason || "Unknown rejection"),
        stack: reason?.stack || "",
      });
    };

    const onCustom = (event) => record(event.detail || {});
    const onOnline = () => record({ type: "Network status", message: "Browser reports that the connection is back online." });
    const onOffline = () => record({ type: "Network status", message: "Browser reports that the device is offline." });

    window.addEventListener("error", onWindowError, true);
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("twf:diagnostic", onCustom);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("error", onWindowError, true);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("twf:diagnostic", onCustom);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const report = useMemo(() => makeReport(errors), [errors]);

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(report);
      setCopyState("Copied!");
    } catch {
      const field = document.createElement("textarea");
      field.value = report;
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      const copied = document.execCommand("copy");
      field.remove();
      setCopyState(copied ? "Copied!" : "Select and copy the report below.");
    }
    window.setTimeout(() => setCopyState(""), 2200);
  }

  function clearErrors() {
    setErrors([]);
    window.__TWF_DIAG_QUEUE__ = [];
    setCopyState("");
  }

  return (
    <div style={{ position: "fixed", right: 14, bottom: 14, zIndex: 100000, fontFamily: "system-ui, sans-serif", color: "#e8edf5" }}>
      {!open ? (
        <button onClick={() => setOpen(true)} style={buttonStyle}>
          Diagnostics{errors.length > 0 ? ` · ${errors.length}` : ""}
        </button>
      ) : (
        <section style={{ width: "min( min(92vw, 430px), 430px)", maxHeight: "78vh", display: "flex", flexDirection: "column", background: "#111827", border: "1px solid #46546b", borderRadius: 12, boxShadow: "0 12px 40px #0009", overflow: "hidden" }}>
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", background: "#1d293b", borderBottom: "1px solid #344258" }}>
            <div>
              <strong style={{ display: "block", fontSize: 14 }}>Website diagnostics</strong>
              <span style={{ fontSize: 11, color: "#a9b7ca" }}>{errors.length} issue{errors.length === 1 ? "" : "s"} captured this session</span>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Minimize diagnostics" style={smallButtonStyle}>—</button>
          </header>
          <div style={{ padding: 14, overflowY: "auto" }}>
            {errors.length === 0 ? (
              <p style={{ fontSize: 13, color: "#b9c5d6", lineHeight: 1.5 }}>No errors detected yet. This panel will open automatically if a JavaScript error, failed resource, or network change is detected.</p>
            ) : (
              <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                {errors.slice().reverse().map((error, index) => (
                  <div key={error.time + index} style={{ padding: 9, borderRadius: 8, background: "#263449", border: "1px solid #3a4b63" }}>
                    <strong style={{ display: "block", fontSize: 12, color: "#ffcc8a" }}>{error.type}</strong>
                    <span style={{ display: "block", marginTop: 3, fontSize: 12, lineHeight: 1.4, overflowWrap: "anywhere" }}>{error.message}</span>
                    {error.source && <span style={{ display: "block", marginTop: 4, color: "#91a4bd", fontSize: 10, overflowWrap: "anywhere" }}>{error.source}</span>}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={copyReport} style={{ ...buttonStyle, flex: 1, background: "#2563eb" }}>Copy diagnostic report</button>
              <button onClick={clearErrors} style={smallButtonStyle}>Clear</button>
            </div>
            {copyState && <p role="status" style={{ marginTop: 8, color: "#9ed9b2", fontSize: 12 }}>{copyState}</p>}
            <details style={{ marginTop: 10 }}>
              <summary style={{ cursor: "pointer", color: "#a9b7ca", fontSize: 11 }}>View raw report</summary>
              <textarea readOnly value={report} style={{ width: "100%", height: 130, marginTop: 8, padding: 8, borderRadius: 6, background: "#0b1220", color: "#dce6f4", border: "1px solid #344258", fontSize: 10 }} />
            </details>
          </div>
        </section>
      )}
    </div>
  );
}

const buttonStyle = {
  border: "1px solid #52647d",
  borderRadius: 9,
  padding: "10px 13px",
  background: "#263449",
  color: "#fff",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 4px 18px #0006",
};

const smallButtonStyle = {
  ...buttonStyle,
  padding: "7px 10px",
  background: "#344258",
};
