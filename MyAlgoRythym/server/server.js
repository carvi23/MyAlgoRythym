const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const app = express();

app.use(cors());
app.use(express.json());


// 🔥 핵심: client 폴더 (루트 기준)
app.use(express.static(path.join(__dirname, "..", "client")));


// 🔥 uploads 폴더 (루트 기준)
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });

let history = [];
let extensionConnected = false;
let lastExtensionPing = null;
let collectedRecords = [];


// =======================
// 📄 페이지 라우팅
// =======================

app.get("/", (req, res) => {
 res.sendFile(path.join(__dirname, "..", "client", "index.html"));
});

app.get("/result.html", (req, res) => {
 res.sendFile(path.join(__dirname, "..", "client", "result.html"));
});


// =======================
// 📦 확장 프로그램 다운로드
// =======================

app.get("/extension/download", (req, res) => {
  const zipPath = path.join(__dirname, "..", "extension.zip");

  if (!fs.existsSync(zipPath)) {
    return res.status(404).send("extension.zip 파일이 없습니다.");
  }

  res.download(zipPath, "myalgorythym-extension.zip");
});


// =======================
// 🔗 외부 이동
// =======================

app.get("/go/takeout", (req, res) => {
  res.redirect("https://takeout.google.com/");
});


// =======================
// 🔌 확장 상태 체크
// =======================

app.get("/api/extension-status", (req, res) => {
  res.json({
    connected: extensionConnected,
    lastPing: lastExtensionPing,
    collectedCount: collectedRecords.length
  });
});

app.post("/api/extension-heartbeat", (req, res) => {
  extensionConnected = true;
  lastExtensionPing = new Date().toISOString();

  pushHistory("extension", "확장 프로그램 연결됨", `마지막 연결: ${lastExtensionPing}`);
  res.json({ success: true });
});


// =======================
// 📥 데이터 수집
// =======================

app.post("/api/collect", (req, res) => {
  const { title, url, platform, time } = req.body;

  extensionConnected = true;
  lastExtensionPing = new Date().toISOString();

  const detectedPlatform =
    normalizePlatformName(platform) ||
    detectPlatformFromUrl(url)?.name ||
    "Unknown";

  const record = {
    id: Date.now() + Math.random(),
    title: title || "Untitled",
    url: url || "",
    platform: detectedPlatform,
    time: time || new Date().toISOString()
  };

  collectedRecords.unshift(record);
  collectedRecords = collectedRecords.slice(0, 500);

  pushHistory(
    "extension-data",
    record.title,
    `${record.platform} / ${record.url}`
  );

  res.json({ success: true });
});


// =======================
// 🔗 링크 분석
// =======================

app.post("/api/analyze-link", (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "링크가 없습니다." });
  }

  const platform = detectPlatformFromUrl(url);
  if (!platform) {
    return res.status(400).json({
      error: "지원 플랫폼 링크가 아닙니다."
    });
  }

  const analysis = buildPlatformAnalysis(platform, "link");
  pushHistory("link-analysis", `${platform.name} 링크 분석`, url);

  res.json({ analysis });
});


// =======================
// 📂 파일 업로드 분석
// =======================

app.post("/api/upload-record", upload.single("recordFile"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "파일이 없습니다." });
  }

  const filePath = req.file.path;
  const originalName = req.file.originalname;

  let textPreview = "";
  try {
    textPreview = fs.readFileSync(filePath, "utf8").slice(0, 5000);
  } catch {}

  const platform = detectPlatformFromContent(originalName, textPreview);
  const analysis = buildPlatformAnalysis(platform, "upload", originalName);

  pushHistory("record-upload", `${platform.name} 기록 업로드`, originalName);

  res.json({
    success: true,
    fileName: originalName,
    analysis
  });
});


// =======================
// 📊 분석 결과
// =======================

app.get("/api/history", (req, res) => {
  res.json(history.slice(0, 50));
});

app.get("/api/auto-analysis", (req, res) => {
  const analysis = buildAutoCollectedAnalysis(collectedRecords);
  res.json(analysis);
});


// =======================
// 🚀 서버 실행
// =======================

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});


// =======================
// 🧠 내부 함수들
// =======================

function pushHistory(type, title, sub) {
  history.unshift({ type, title, sub });
  history = history.slice(0, 100);
}

function normalizePlatformName(platform) {
  if (!platform) return null;
  const p = String(platform).toLowerCase();

  if (p.includes("youtube")) return "YouTube";
  if (p.includes("soop") || p.includes("afreecatv")) return "SOOP / 아프리카TV";
  if (p.includes("twitch")) return "Twitch";
  if (p.includes("instagram")) return "Instagram";
  if (p.includes("tiktok")) return "TikTok";

  return platform;
}

function detectPlatformFromUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();

    if (host.includes("youtube") || host.includes("youtu.be"))
      return { key: "youtube", name: "YouTube" };

    if (host.includes("soop") || host.includes("afreecatv"))
      return { key: "soop", name: "SOOP / 아프리카TV" };

    if (host.includes("twitch"))
      return { key: "twitch", name: "Twitch" };

    if (host.includes("instagram"))
      return { key: "instagram", name: "Instagram" };

    if (host.includes("tiktok"))
      return { key: "tiktok", name: "TikTok" };

    return null;
  } catch {
    return null;
  }
}

function detectPlatformFromContent(fileName, text) {
  const lower = (fileName + text).toLowerCase();

  if (lower.includes("youtube")) return { key: "youtube", name: "YouTube" };
  if (lower.includes("soop") || lower.includes("afreecatv")) return { key: "soop", name: "SOOP / 아프리카TV" };
  if (lower.includes("twitch")) return { key: "twitch", name: "Twitch" };
  if (lower.includes("instagram")) return { key: "instagram", name: "Instagram" };
  if (lower.includes("tiktok")) return { key: "tiktok", name: "TikTok" };

  return { key: "generic", name: "일반 플랫폼" };
}

function buildPlatformAnalysis(platform, sourceType) {
  return {
    mainTitle: `${platform.name} 알고리즘 분석 결과`,
    subText: sourceType,
    summary: `${platform.name} 기반 분석`,
    accountSignals: ["최근 시청 영향"],
    watchPatterns: ["패턴 분석"],
    surfaceSignals: ["추천 영향"],
    interventionMethods: ["개선 방법"]
  };
}

function buildAutoCollectedAnalysis(records) {
  return {
    mainTitle: "자동 분석 결과",
    subText: `${records.length}개 데이터`,
    summary: "자동 분석 완료",
    accountSignals: [],
    watchPatterns: [],
    surfaceSignals: [],
    interventionMethods: []
  };
}