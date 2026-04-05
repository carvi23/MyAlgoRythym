const API_BASE = "https://myalgorythym.onrender.com";

chrome.runtime.onInstalled.addListener(() => {
  fetch(`${API_BASE}/api/extension-heartbeat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ installed: true })
  }).catch(() => {});
});