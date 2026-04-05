const API_BASE = "https://myalgorythym.onrender.com";

function detectPlatform() {
  const host = location.hostname.toLowerCase();

  if (host.includes("youtube.com")) return "YouTube";
  if (host.includes("sooplive.co.kr") || host.includes("afreecatv.com")) return "SOOP / 아프리카TV";
  if (host.includes("twitch.tv")) return "Twitch";
  if (host.includes("instagram.com")) return "Instagram";
  if (host.includes("tiktok.com")) return "TikTok";

  return "Unknown";
}

setInterval(() => {
  const title = document.title || "Untitled";
  const url = location.href;
  const platform = detectPlatform();

  fetch(`${API_BASE}/api/collect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title,
      url,
      platform,
      time: new Date().toISOString()
    })
  }).catch(() => {});
}, 10000);