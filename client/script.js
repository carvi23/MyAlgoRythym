const isResultPage = window.location.pathname.includes("result.html");

if (!isResultPage) {
  setupMainPage();
} else {
  setupResultPage();
}

function setupMainPage() {
  const platformLinkInput = document.getElementById("platformLinkInput");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const loginBtn = document.getElementById("loginBtn");
  const statusBtn = document.getElementById("statusBtn");
  const autoAnalyzeBtn = document.getElementById("autoAnalyzeBtn");
  const toggleBtn = document.getElementById("toggleBtn");
  const historyContent = document.getElementById("historyContent");
  const recordFileInput = document.getElementById("recordFileInput");
  const extensionStatusText = document.getElementById("extensionStatusText");

  let collapsed = false;

  if (analyzeBtn) {
    analyzeBtn.addEventListener("click", async function () {
      const value = platformLinkInput.value.trim();

      if (!value) {
        saveResultToStorage(
          buildFallbackResult("링크 입력 필요", "지원 플랫폼 링크를 입력하세요.")
        );
        moveToResultPage();
        return;
      }

      try {
        const res = await fetch("/api/analyze-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: value })
        });

        const data = await res.json();

        if (data.error) {
          saveResultToStorage(buildFallbackResult("분석 실패", data.error));
          moveToResultPage();
          return;
        }

        saveResultToStorage(data.analysis || data);
        moveToResultPage();
      } catch (e) {
        saveResultToStorage(
          buildFallbackResult("분석 실패", "서버 연결을 확인하세요.")
        );
        moveToResultPage();
      }
    });
  }

  if (platformLinkInput) {
    platformLinkInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        analyzeBtn.click();
      }
    });
  }

  if (autoAnalyzeBtn) {
    autoAnalyzeBtn.addEventListener("click", async function () {
      try {
        const res = await fetch("/api/auto-analysis");
        const data = await res.json();

        saveResultToStorage(data);
        moveToResultPage();
      } catch (e) {
        saveResultToStorage(
          buildFallbackResult(
            "자동 분석 실패",
            "자동 수집 데이터 또는 서버 상태를 확인하세요."
          )
        );
        moveToResultPage();
      }
    });
  }

  if (statusBtn) {
    statusBtn.addEventListener("click", async function () {
      try {
        const res = await fetch("/api/extension-status");
        const data = await res.json();

        extensionStatusText.textContent = data.connected
          ? `현재 상태: 연결됨 / 마지막 수집 ${data.lastPing || "-"} / 누적 ${data.collectedCount}개`
          : "현재 상태: 미연결";
      } catch (e) {
        extensionStatusText.textContent = "현재 상태: 확인 실패";
      }
    });
  }

  if (recordFileInput) {
    recordFileInput.addEventListener("change", async function () {
      const file = recordFileInput.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("recordFile", file);

      try {
        const res = await fetch("/api/upload-record", {
          method: "POST",
          body: formData
        });

        const data = await res.json();

        if (!data.success) {
          saveResultToStorage(
            buildFallbackResult("업로드 실패", "파일 분석에 실패했습니다.")
          );
          moveToResultPage();
          return;
        }

        saveResultToStorage(data.analysis);
        moveToResultPage();
      } catch (e) {
        saveResultToStorage(
          buildFallbackResult("업로드 실패", "서버 연결을 확인하세요.")
        );
        moveToResultPage();
      }
    });
  }

  if (loginBtn) {
    loginBtn.addEventListener("click", function () {
      alert("추후 로그인 기능 연결 예정");
    });
  }

  if (toggleBtn && historyContent) {
    toggleBtn.addEventListener("click", function () {
      collapsed = !collapsed;
      historyContent.classList.toggle("hidden", collapsed);
      toggleBtn.textContent = collapsed ? "펼치기" : "접기";
    });
  }

  if (historyContent) {
    loadHistory(historyContent);
    setInterval(() => loadHistory(historyContent), 10000);
  }
}

function setupResultPage() {
  const resultMainTitle = document.getElementById("resultMainTitle");
  const resultSubText = document.getElementById("resultSubText");
  const platformSummary = document.getElementById("platformSummary");

  const circle1Value = document.getElementById("circle1Value");
  const circle1Title = document.getElementById("circle1Title");
  const circle1Desc = document.getElementById("circle1Desc");

  const circle2Value = document.getElementById("circle2Value");
  const circle2Title = document.getElementById("circle2Title");
  const circle2Desc = document.getElementById("circle2Desc");

  const circle3Value = document.getElementById("circle3Value");
  const circle3Title = document.getElementById("circle3Title");
  const circle3Desc = document.getElementById("circle3Desc");

  const keySummaryList = document.getElementById("keySummaryList");
  const actionList = document.getElementById("actionList");

  const saved = localStorage.getItem("myalgorythym_result");
  const data = saved
    ? JSON.parse(saved)
    : buildFallbackResult("분석 결과 없음", "메인 페이지에서 먼저 분석을 진행하세요.");

  if (resultMainTitle) resultMainTitle.textContent = data.mainTitle || "대표 분석 결과";
  if (resultSubText) resultSubText.textContent = data.subText || "";
  if (platformSummary) platformSummary.innerHTML = data.summary || "";

  const summarized = summarizeForCircles(data);

  if (circle1Title) circle1Title.textContent = summarized.circle1.title;
  if (circle1Value) circle1Value.textContent = summarized.circle1.value;
  if (circle1Desc) circle1Desc.textContent = summarized.circle1.desc;

  if (circle2Title) circle2Title.textContent = summarized.circle2.title;
  if (circle2Value) circle2Value.textContent = summarized.circle2.value;
  if (circle2Desc) circle2Desc.textContent = summarized.circle2.desc;

  if (circle3Title) circle3Title.textContent = summarized.circle3.title;
  if (circle3Value) circle3Value.textContent = summarized.circle3.value;
  if (circle3Desc) circle3Desc.textContent = summarized.circle3.desc;

  if (keySummaryList) setList(keySummaryList, summarized.keySummary);
  if (actionList) setList(actionList, summarized.actions);
}

function moveToResultPage() {
  window.location.href = "/result.html";
}

function saveResultToStorage(data) {
  localStorage.setItem("myalgorythym_result", JSON.stringify(data));
}

async function loadHistory(historyContent) {
  try {
    const res = await fetch("/api/history");
    const data = await res.json();

    historyContent.innerHTML = "";

    data.forEach((item) => {
      const div = document.createElement("div");
      div.className = "history-item";
      div.innerHTML = `
        <div class="history-title">${item.title}</div>
        <div class="history-sub">${item.sub}</div>
      `;
      historyContent.appendChild(div);
    });
  } catch (e) {
    historyContent.innerHTML = "";
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `
      <div class="history-title">기록 불러오기 실패</div>
      <div class="history-sub">서버 연결을 확인하세요.</div>
    `;
    historyContent.appendChild(div);
  }
}

function summarizeForCircles(data) {
  const allText = [
    ...(data.watchPatterns || []),
    ...(data.accountSignals || []),
    ...(data.surfaceSignals || []),
    ...(data.interventionMethods || [])
  ].join(" ").toLowerCase();

  let contentTypeValue = "혼합";
  let contentTypeDesc = "여러 형식을 섞어서 소비하는 패턴";

  if (
    allText.includes("쇼츠") ||
    allText.includes("짧은") ||
    allText.includes("short") ||
    allText.includes("릴스")
  ) {
    contentTypeValue = "짧음";
    contentTypeDesc = "짧은 영상/빠른 소비 성향이 감지됨";
  }

  if (
    allText.includes("일반") ||
    allText.includes("롱폼") ||
    allText.includes("라이브") ||
    allText.includes("장시간")
  ) {
    contentTypeValue = "길음";
    contentTypeDesc = "일반 영상/라이브 중심 소비 성향이 감지됨";
  }

  if (allText.includes("데이터 없음") || allText.includes("확인 불가")) {
    contentTypeValue = "없음";
    contentTypeDesc = "아직 분석할 데이터가 충분하지 않음";
  }

  let biasValue = "중간";
  let biasDesc = "관심사 편향이 적당한 수준으로 추정됨";

  if (
    allText.includes("반복") ||
    allText.includes("편향") ||
    allText.includes("특정") ||
    allText.includes("쏠림")
  ) {
    biasValue = "높음";
    biasDesc = "특정 채널/주제/플랫폼 쏠림 가능성이 큼";
  }

  if (
    allText.includes("다양화") ||
    allText.includes("과하지") ||
    allText.includes("낮음")
  ) {
    biasValue = "낮음";
    biasDesc = "현재 편향이 아주 강하진 않은 편";
  }

  if (allText.includes("데이터 없음") || allText.includes("확인 불가")) {
    biasValue = "없음";
    biasDesc = "아직 편향을 계산할 데이터가 부족함";
  }

  let influenceValue = "중간";
  let influenceDesc = "추천 시스템에 일정 수준 반영될 가능성";

  if (
    allText.includes("높음") ||
    allText.includes("매우") ||
    allText.includes("강하게")
  ) {
    influenceValue = "높음";
    influenceDesc = "현재 기록이 추천에 강하게 작용할 가능성";
  }

  if (
    allText.includes("낮음") ||
    allText.includes("없음") ||
    allText.includes("데이터 없음") ||
    allText.includes("확인 불가")
  ) {
    influenceValue = "낮음";
    influenceDesc = "아직 충분한 데이터가 없어 영향도가 낮음";
  }

  const keySummary = [
    stripHtml(data.summary || "분석 요약이 없습니다."),
    ...(data.accountSignals || []).slice(0, 2),
    ...(data.watchPatterns || []).slice(0, 2)
  ];

  const actions = [...(data.interventionMethods || [])].slice(0, 4);

  return {
    circle1: {
      title: "콘텐츠 성향",
      value: contentTypeValue,
      desc: contentTypeDesc
    },
    circle2: {
      title: "관심사 편향",
      value: biasValue,
      desc: biasDesc
    },
    circle3: {
      title: "추천 영향도",
      value: influenceValue,
      desc: influenceDesc
    },
    keySummary,
    actions
  };
}

function setList(target, items) {
  target.innerHTML = "";
  items.forEach(function (item) {
    const li = document.createElement("li");
    li.textContent = item;
    target.appendChild(li);
  });
}

function buildFallbackResult(title, message) {
  return {
    mainTitle: title,
    subText: message,
    summary: message,
    accountSignals: [
      "최근 시청 편향: 확인 불가",
      "검색어 편향: 확인 불가",
      "구독/팔로우 편향: 확인 불가",
      "반응 성향: 확인 불가",
      "부정 피드백 사용 여부: 확인 불가"
    ],
    watchPatterns: [
      "콘텐츠 형식 비중: 확인 불가",
      "반복 채널/계정 비중: 확인 불가",
      "반복 주제 비중: 확인 불가",
      "이용 지속 패턴: 확인 불가",
      "빠른 이탈 형식 추정: 확인 불가"
    ],
    surfaceSignals: [
      "홈/메인 추천 영향도: 확인 불가",
      "다음 추천 영향도: 확인 불가",
      "짧은 영상 피드 영향도: 확인 불가",
      "검색 노출 영향도: 확인 불가"
    ],
    interventionMethods: [
      "입력 데이터 확인",
      "서버 상태 확인",
      "확장 프로그램 연결 확인",
      "기록 파일 업로드 재시도"
    ]
  };
}

function stripHtml(text) {
  const div = document.createElement("div");
  div.innerHTML = text;
  return div.textContent || div.innerText || "";
}