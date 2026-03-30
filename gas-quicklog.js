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
 *
 * [이메일 알림]
 * 오랑이가 기록하면 아래 주소로 알림 메일 발송
 *
 * [7일 자동 삭제]
 * cleanOldEmails()를 트리거(매일 1회)로 설정하면 7일 지난 알림 메일 자동 삭제
 */

var NOTIFY_EMAIL = 'OrangBoongSSem@gmail.com';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var props = PropertiesService.getScriptProperties();
    var logs = JSON.parse(props.getProperty('quickLogs') || '[]');

    if (data.action === 'save') {
      var newEntries = [];
      (data.entries || []).forEach(function(entry) {
        var idx = logs.findIndex(function(l) { return l.id === entry.id; });
        if (idx >= 0) {
          logs[idx] = entry;
        } else {
          logs.push(entry);
          newEntries.push(entry);
        }
      });
      // 새 기록에 대해 이메일 알림
      newEntries.forEach(function(entry) {
        sendNotification(entry);
      });
    } else if (data.action === 'markSynced') {
      (data.ids || []).forEach(function(id) {
        var entry = logs.find(function(l) { return l.id === id; });
        if (entry) entry.synced = true;
      });
    } else if (data.action === 'replaceAll') {
      var replaced = (data.entries || []).slice(-200);
      props.setProperty('quickLogs', JSON.stringify(replaced));
      return ContentService.createTextOutput(JSON.stringify({ ok: true, count: replaced.length }))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (data.action === 'delete') {
      var deleteIds = (data.ids || []).map(function(id) { return String(id); });
      var filtered = logs.filter(function(l) { return deleteIds.indexOf(String(l.id)) === -1; });
      props.setProperty('quickLogs', JSON.stringify(filtered));
      return ContentService.createTextOutput(JSON.stringify({ ok: true, count: filtered.length }))
        .setMimeType(ContentService.MimeType.JSON);
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
    var props = PropertiesService.getScriptProperties();
    var logs = JSON.parse(props.getProperty('quickLogs') || '[]');
    return ContentService.createTextOutput(JSON.stringify({ ok: true, entries: logs }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, entries: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 이메일 알림 발송
 */
function sendNotification(entry) {
  try {
    var dt = (entry.datetime || '').split('T');
    var date = dt[0] || '';
    var time = dt[1] || '';
    var nrs = entry.nrs >= 0 ? entry.nrs : '-';
    var sites = (entry.sites || []).join(', ');
    var painType = (entry.painType || []).join(', ');
    var symptoms = (entry.symptoms || []).join(', ');
    var meds = (entry.meds || []).join(', ');
    var treatments = (entry.treatments || []).join(', ');
    var memo = entry.memo || '';

    var subject = '🤕 오랑이 두통 NRS ' + nrs + ' · ' + date.slice(5) + ' ' + time;

    var lines = [];
    lines.push('📅 ' + date + ' ' + time);
    lines.push('😣 NRS: ' + nrs + '/10');
    if (sites) lines.push('📍 ' + sites);
    if (painType) lines.push('🔥 ' + painType);
    if (symptoms) lines.push('⚡ ' + symptoms);
    if (meds) lines.push('💊 ' + meds);
    if (treatments) lines.push('🩺 ' + treatments);
    if (memo) lines.push('📝 ' + memo);
    lines.push('');
    lines.push('— Orangi Health 자동 알림');

    MailApp.sendEmail(NOTIFY_EMAIL, subject, lines.join('\n'));
  } catch (err) {
    // 이메일 실패해도 기록 저장은 유지
    Logger.log('Email failed: ' + err.message);
  }
}

/**
 * 7일 지난 알림 메일 자동 삭제
 * [설정 방법]
 * 1. Apps Script 에디터 → 왼쪽 ⏰ "트리거" 메뉴
 * 2. "+ 트리거 추가" 클릭
 * 3. 함수: cleanOldEmails / 이벤트 소스: 시간 기반 / 유형: 일 단위 / 시간: 오전 4~5시
 * 4. 저장
 */
function cleanOldEmails() {
  try {
    var threads = GmailApp.search('from:me subject:오랑이 두통 older_than:7d');
    for (var i = 0; i < threads.length; i++) {
      threads[i].moveToTrash();
    }
    Logger.log('Cleaned ' + threads.length + ' old notification emails');
  } catch (err) {
    Logger.log('cleanOldEmails failed: ' + err.message);
  }
}
