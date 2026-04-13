const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client'))); // client 정적 파일 제공

// 파일 업로드를 위한 multer 설정
const upload = multer({ dest: path.join(__dirname, '../uploads/') });

// ====================== 핵심 분석 엔진 ======================
function analyzeEngine(input) {
    // client/script.js의 generateMockAnalysis와 완전히 동일한 로직 유지
    // → 실제 서비스에서는 여기서 link 파싱, 파일 파싱, 확장 데이터 처리 로직 확장
    const platform = input.platform || 'youtube';
    return {
        platform: platform,
        contentTendency: { score: platform === 'youtube' ? 78 : platform === 'twitch' ? 85 : 92, label: '엔터테인먼트·테크 콘텐츠 중심' },
        interestBias: { score: platform === 'youtube' ? 64 : platform === 'instagram' ? 82 : 77, label: '게임·AI·과학 장르 강한 편향' },
        recommendationInfluence: { score: platform === 'tiktok' ? 95 : 91, label: '시청 시간 기반 추천 매우 강함' },
        coreSummary: input.inputType === 'upload' 
            ? '업로드된 기록 파일을 기반으로 분석 완료' 
            : '최근 데이터 기반 알고리즘 상태 분석 완료',
        recommendedActions: [
            '“관심 없음” 버튼 적극 활용',
            '특정 채널/계정 추천 안 함',
            '기록 일부 삭제 추천',
            '시청 기록 일시중지 추천'
        ],
        analysisSignals: {
            accountSignals: ['최근 시청 편향', '검색어 편향', '구독/팔로우 편향'],
            viewingPattern: ['Shorts/Reels 비중', '반복 콘텐츠 비중'],
            recommendationSurface: ['홈/피드 영향도', 'Up Next/FYP 영향도']
        }
    };
}

// ====================== API 엔드포인트 ======================
app.post('/analyze', (req, res) => {
    const { link, platform, inputType, fileData } = req.body;
    console.log(`[분석 요청] ${platform} / ${inputType} / ${link}`);
    
    const result = analyzeEngine({ platform, inputType, fileData });
    res.json(result);
});

// 파일 업로드 처리
app.post('/upload', upload.single('recordFile'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: '파일 없음' });
    // 실제로는 파일 파싱 후 analyzeEngine 호출
    const result = analyzeEngine({ platform: 'youtube', inputType: 'upload' });
    res.json(result);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.get('/result.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/result.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 MyAlgoRythym 서버 실행 중 → http://localhost:${PORT}`);
    console.log(`배포 주소: https://myalgorythym.onrender.com`);
});