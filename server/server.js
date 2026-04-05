const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "client")));

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });

let history = [];
let extensionConnected = false;
let lastExtensionPing = null;
let collectedRecords = [];

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "index.html"));
});

app.get("/result.html", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "result.html"));
});

app.get("/extension/download", (req, res) => {
  const zipPath = path.join(__dirname, "..", "extension.zip");

  if (!fs.existsSync(zipPath)) {
    return res.status(404).send("extension.zip 파일이 프로젝트 루트에 없습니다.");
  }

  res.download(zipPath, "myalgorythym-extension.zip");
});

app.get("/go/takeout", (req, res) => {
  res.redirect("https://takeout.google.com/");
});

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

app.post("/api/analyze-link", (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "링크가 없습니다." });
  }

  const platform = detectPlatformFromUrl(url);
  if (!platform) {
    return res.status(400).json({
      error: "지원 플랫폼 링크가 아닙니다. YouTube / SOOP / Twitch / Instagram / TikTok 링크를 사용하세요."
    });
  }

  const analysis = buildPlatformAnalysis(platform, "link");
  pushHistory("link-analysis", `${platform.name} 링크 분석`, url);

  res.json({ analysis });
});

app.post("/api/upload-record", upload.single("recordFile"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "파일이 없습니다." });
  }

  const filePath = req.file.path;
  const originalName = req.file.originalname;

  let textPreview = "";
  try {
    textPreview = fs.readFileSync(filePath, "utf8").slice(0, 5000);
  } catch (error) {
    textPreview = "";
  }

  const platform = detectPlatformFromContent(originalName, textPreview);
  const analysis = buildPlatformAnalysis(platform, "upload", originalName);

  pushHistory("record-upload", `${platform.name} 기록 업로드`, originalName);

  res.json({
    success: true,
    fileName: originalName,
    analysis
  });
});

app.get("/api/history", (req, res) => {
  res.json(history.slice(0, 50));
});

app.get("/api/auto-analysis", (req, res) => {
  const analysis = buildAutoCollectedAnalysis(collectedRecords);
  res.json(analysis);
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});

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
    const parsedUrl = new URL(url);
    const host = parsedUrl.hostname.toLowerCase();

    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      return { key: "youtube", name: "YouTube" };
    }
    if (host.includes("sooplive.co.kr") || host.includes("afreecatv.com")) {
      return { key: "soop", name: "SOOP / 아프리카TV" };
    }
    if (host.includes("twitch.tv")) {
      return { key: "twitch", name: "Twitch" };
    }
    if (host.includes("instagram.com")) {
      return { key: "instagram", name: "Instagram" };
    }
    if (host.includes("tiktok.com")) {
      return { key: "tiktok", name: "TikTok" };
    }
    return null;
  } catch {
    return null;
  }
}

function detectPlatformFromContent(fileName, text) {
  const lower = `${fileName}\n${text}`.toLowerCase();

  if (lower.includes("youtube") || lower.includes("watch?v=") || lower.includes("youtu.be")) {
    return { key: "youtube", name: "YouTube" };
  }
  if (lower.includes("soop") || lower.includes("afreecatv")) {
    return { key: "soop", name: "SOOP / 아프리카TV" };
  }
  if (lower.includes("twitch")) {
    return { key: "twitch", name: "Twitch" };
  }
  if (lower.includes("instagram")) {
    return { key: "instagram", name: "Instagram" };
  }
  if (lower.includes("tiktok")) {
    return { key: "tiktok", name: "TikTok" };
  }

  return { key: "generic", name: "일반 플랫폼" };
}

function buildPlatformAnalysis(platform, sourceType, sourceName = "") {
  const commonPrefix =
    sourceType === "link"
      ? "링크 기반 분석"
      : sourceType === "upload"
      ? `업로드 파일 기반 분석 (${sourceName})`
      : "자동 수집 기반 분석";

  return {
    mainTitle: `${platform.name} 알고리즘 분석 결과`,
    subText: `${commonPrefix} 결과입니다.`,
    summary: `플랫폼 자동감지 결과: ${platform.name}. 감지된 플랫폼의 추천 구조에 맞춰 같은 결과창 형식으로 분석합니다.`,
    accountSignals: [
      "최근 시청/이용 편향 반영 가능",
      "검색어/탐색 기록 영향 가능",
      "구독/팔로우 또는 반복 계정 소비 강화 가능",
      "좋아요/싫어요/반응 성향 반영 가능",
      "부정 피드백 사용 여부가 추천 조정에 중요할 수 있음"
    ],
    watchPatterns: [
      "짧은 형식 vs 일반 형식 비중 추정 가능",
      "반복 채널/계정 비중 추정 가능",
      "반복 주제 비중 추정 가능",
      "이용 지속 패턴 추정 가능",
      "빠른 이탈 형식 추정 가능"
    ],
    surfaceSignals: [
      "홈/메인 추천 영향도 추정",
      "다음 콘텐츠 추천 영향도 추정",
      "짧은 영상 피드 영향도 추정",
      "검색 노출 영향도 추정"
    ],
    interventionMethods: [
      "관심 없음/비추천 계열 사용 추천",
      "특정 채널/계정 추천 제외 추천",
      "기록 일부 삭제 추천",
      "시청 기록 일시중지 추천"
    ]
  };
}

function buildAutoCollectedAnalysis(records) {
  if (!records.length) {
    return {
      mainTitle: "내 데이터 자동 분석 결과",
      subText: "아직 자동 수집된 기록이 없습니다.",
      summary: "확장 프로그램 설치 후 지원 플랫폼에 접속하면 기록이 누적되고 분석할 수 있습니다.",
      accountSignals: [
        "최근 시청 편향: 데이터 없음",
        "검색어 편향: 데이터 없음",
        "구독/팔로우 편향: 데이터 없음",
        "반응 성향: 데이터 없음",
        "부정 피드백 사용 여부: 데이터 없음"
      ],
      watchPatterns: [
        "콘텐츠 형식 비중: 데이터 없음",
        "반복 채널/계정 비중: 데이터 없음",
        "반복 주제 비중: 데이터 없음",
        "이용 지속 패턴: 데이터 없음",
        "빠른 이탈 형식 추정: 데이터 없음"
      ],
      surfaceSignals: [
        "홈/메인 추천 영향도: 데이터 없음",
        "다음 추천 영향도: 데이터 없음",
        "짧은 영상 피드 영향도: 데이터 없음",
        "검색 노출 영향도: 데이터 없음"
      ],
      interventionMethods: [
        "지원 플랫폼 방문 후 다시 분석",
        "더 많은 기록 누적 권장",
        "기록 파일 업로드 병행 권장",
        "플랫폼 링크 분석도 병행 가능"
      ]
    };
  }

  const platformCounts = {};
  const titleCounts = {};
  let shortFormCount = 0;

  for (const r of records) {
    platformCounts[r.platform] = (platformCounts[r.platform] || 0) + 1;

    const key = simplifyTitle(r.title);
    if (key) titleCounts[key] = (titleCounts[key] || 0) + 1;

    if (isShortFormRecord(r)) shortFormCount += 1;
  }

  const total = records.length;
  const dominantPlatform = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0];
  const dominantName = dominantPlatform ? dominantPlatform[0] : "Unknown";
  const dominantRatio = dominantPlatform ? Math.round((dominantPlatform[1] / total) * 100) : 0;
  const maxRepeat = Math.max(...Object.values(titleCounts), 1);
  const repeatRatio = Math.round((maxRepeat / total) * 100);
  const shortRatio = Math.round((shortFormCount / total) * 100);
  const longRatio = 100 - shortRatio;

  return {
    mainTitle: "내 데이터 자동 분석 결과",
    subText: `자동 수집 기록 ${total}개 기준 분석입니다.`,
    summary: `가장 많이 감지된 플랫폼은 ${dominantName} (${dominantRatio}%) 입니다. 짧은 형식 비중은 ${shortRatio}%, 일반 형식 비중은 ${longRatio}%로 추정됩니다.`,
    accountSignals: [
      `최근 시청 편향: ${dominantName} 중심 (${dominantRatio}%)`,
      "검색어 편향: 자동 수집만으로는 제한적",
      `반복 계정/제목 비중 추정: ${repeatRatio}%`,
      "반응 성향: 자동 수집만으로는 직접 확인 어려움",
      "부정 피드백 사용 여부: 자동 수집만으로는 직접 확인 어려움"
    ],
    watchPatterns: [
      `짧은 형식 비중 추정: ${shortRatio}%`,
      `일반 형식 비중 추정: ${longRatio}%`,
      `반복 콘텐츠 비중 추정: ${repeatRatio}%`,
      `누적 기록 수: ${total}개`,
      shortRatio >= 50 ? "짧은 콘텐츠 소비 성향이 더 강함" : "일반/롱폼 소비 성향이 더 강함"
    ],
    surfaceSignals: [
      `${dominantName} 메인 추천 영향도: 높음`,
      `${dominantName} 다음 콘텐츠 영향도: 중간~높음`,
      `짧은 영상 피드 영향도: ${shortRatio >= 50 ? "높음" : "중간"}`,
      "검색 노출 영향도: 자동 수집만으로는 중간 추정"
    ],
    interventionMethods: [
      shortRatio >= 50 ? "짧은 영상 편향 완화를 원하면 일반 콘텐츠 소비를 늘리기" : "롱폼 편향 완화를 원하면 짧은 형식 소비를 늘리기",
      repeatRatio >= 40 ? "반복 채널/콘텐츠 편향이 높아 다양한 탐색 권장" : "현재 반복 편향은 과하지 않은 편",
      "원치 않는 주제는 관심 없음/비추천 계열 사용 권장",
      "기록 업로드 분석과 함께 사용하면 정확도 향상"
    ]
  };
}

function simplifyTitle(title) {
  if (!title) return "";
  return String(title).trim().toLowerCase().slice(0, 40);
}

function isShortFormRecord(record) {
  const url = String(record.url || "").toLowerCase();
  const title = String(record.title || "").toLowerCase();

  return (
    url.includes("/shorts/") ||
    url.includes("tiktok.com") ||
    title.includes("shorts") ||
    title.includes("reels")
  );
}