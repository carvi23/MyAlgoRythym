const SERVER_URL = 'https://myalgorythym.onrender.com';

function detectPlatform(link) {
    if (!link) return 'youtube';
    const lower = link.toLowerCase();
    if (lower.includes('twitch.tv')) return 'twitch';
    if (lower.includes('instagram.com')) return 'instagram';
    if (lower.includes('tiktok.com')) return 'tiktok';
    return 'youtube';
}

async function callAnalysis(link, inputType = 'link') {
    return generateMockAnalysis(detectPlatform(link), link, inputType);
}

function generateMockAnalysis(platform, link, inputType) {
    const isLite = inputType === 'link';
    return {
        platform: platform,
        isLite: isLite,
        contentTendency: { score: isLite ? 65 : 78, label: isLite ? '공개 활동 기반 콘텐츠 중심' : '엔터테인먼트·테크 콘텐츠 중심' },
        interestBias: { score: isLite ? 55 : 64, label: isLite ? '공개 활동 기준 장르 편향' : '게임·AI·과학 장르 강한 편향' },
        recommendationInfluence: { score: isLite ? 82 : 91, label: isLite ? '추천 영향도 추정' : '시청 시간 기반 추천 매우 강함' },
        coreSummary: isLite ? '⚡ 공개 프로필 기반 빠른 건강도 체크 (Lite) 완료' : '전체 기록 기반 정확한 분석 완료',
        recommendedActions: isLite ? ['파일 업로드로 더 정확한 분석 추천', '관심 없음 버튼 적극 활용'] : ['“관심 없음” 버튼 적극 활용', '특정 채널 추천 안 함'],
        analysisSignals: { accountSignals: ['계정 신호'], viewingPattern: ['시청 패턴'], recommendationSurface: ['추천 표면'] }
    };
}

// 메인 화면 기능
async function analyzeLink() {
    const link = document.getElementById('link-input').value.trim();
    if (!link) return alert('링크를 입력해주세요!');
    const data = await callAnalysis(link, 'link');
    saveToHistory(data);
    window.location.href = 'result.html';
}

function handleFileUpload(e) {
    if (!e.target.files[0]) return;
    const data = { platform: 'youtube', isLite: false, coreSummary: '파일 업로드 분석 완료' };
    saveToHistory(data);
    window.location.href = 'result.html';
}

function connectExtension() {
    alert('✅ 확장 프로그램 연결 완료 (데모)');
    const data = { platform: 'youtube', isLite: false, coreSummary: '확장 프로그램 자동 수집 분석 완료' };
    saveToHistory(data);
    window.location.href = 'result.html';
}

function saveToHistory(data) {
    let history = JSON.parse(localStorage.getItem('analysisHistory') || '[]');
    data.date = new Date().toLocaleDateString('ko-KR');
    history.unshift(data);
    if (history.length > 8) history.pop();
    localStorage.setItem('analysisHistory', JSON.stringify(history));
}

function loadHistory() {
    const list = document.getElementById('history-list');
    const history = JSON.parse(localStorage.getItem('analysisHistory') || '[]');
    if (history.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#777;padding:40px;">아직 분석 기록이 없습니다.<br>지금 바로 분석을 시작해보세요!</p>';
        return;
    }
    list.innerHTML = history.map((item, i) => `
        <div class="history-item" onclick="loadOldResult(${i})">
            <span>${item.platform.toUpperCase()} ${item.isLite ? '(Lite)' : ''} • ${item.date}</span>
            <span style="color:#ddd">${item.coreSummary}</span>
        </div>
    `).join('');
}

function loadOldResult(i) {
    const history = JSON.parse(localStorage.getItem('analysisHistory') || '[]');
    localStorage.setItem('analysisResult', JSON.stringify(history[i]));
    window.location.href = 'result.html';
}

function switchTab(n) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-' + n).classList.add('active');
    document.getElementById('panel-' + n).classList.add('active');
}

function goToLogin() { alert('로그인 기능은 프리미엄에서 제공됩니다. (데모)'); }

window.onload = loadHistory;