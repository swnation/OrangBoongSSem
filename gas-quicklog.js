/**
 * 오랑이 두통 빠른 기록 — Google Apps Script 중계 서버
 *
 * [배포 방법]
 * 1. https://script.google.com 접속 → "새 프로젝트"
 * 2. 이 코드 전체를 복사하여 붙여넣기
 * 3. 상단 메뉴 "배포" → "새 배포"
 * 4. 유형: "웹 앱"
 * 5. 실행 주체: "나" / 액세스 권한: "모든 사용자"
 * 6. "배포" 클릭 → URL 복사
 * 7. quick.html과 메인 앱에 이 URL을 설정
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const props = PropertiesService.getScriptProperties();
    const logs = JSON.parse(props.getProperty('quickLogs') || '[]');

    if (data.action === 'save') {
      (data.entries || []).forEach(function(entry) {
        const idx = logs.findIndex(function(l) { return l.id === entry.id; });
        if (idx >= 0) logs[idx] = entry;
        else logs.push(entry);
      });
    } else if (data.action === 'markSynced') {
      (data.ids || []).forEach(function(id) {
        const entry = logs.find(function(l) { return l.id === id; });
        if (entry) entry.synced = true;
      });
    }

    // 최근 200건만 유지
    var trimmed = logs.slice(-200);
    props.setProperty('quickLogs', JSON.stringify(trimmed));

    return ContentService.createTextOutput(JSON.stringify({ ok: true, count: trimmed.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const props = PropertiesService.getScriptProperties();
    const logs = JSON.parse(props.getProperty('quickLogs') || '[]');
    return ContentService.createTextOutput(JSON.stringify({ ok: true, entries: logs }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, entries: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
