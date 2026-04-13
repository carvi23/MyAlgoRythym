// 확장 프로그램 백그라운드 (추후 서버와 연동)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'COLLECT_DATA') {
    console.log('MyAlgoRythym 자동 수집 시작');
    // 실제로는 시청 데이터 수집 후 server로 전송
    sendResponse({ status: 'connected' });
  }
});