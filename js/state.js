// js/state.js — 전역 상태 S 객체 + 도메인 헬퍼 (Phase 1 모듈화)

let S = {
  token: null,
  currentDomain: localStorage.getItem('om_domain') || 'orangi-migraine',
  // Per-domain state: { folderId, masterFileId, master, logFileId, logData, logMonth }
  domainState: {},
  keys:   {}, // 암호화 저장 — _loadKeys()로 복호화 후 설정
  models: JSON.parse(localStorage.getItem('om_models') || JSON.stringify(DEFAULT_MODELS)),
  currentView: 'drive-connect',
  session: null,
  generating: false,
  viewingHistIdx: null,
  logView: 'form',
  _dirty: false, // unsaved session data
  logEditMode: false,
};

// Shortcuts for current domain state
function D()  { return S.domainState[S.currentDomain] || {}; }
function DM() { return D().master; }
function DC() { return DOMAINS[S.currentDomain]; }

function getDefaultMaster() {
  const dc = DC();
  return {
    version:7, domain:S.currentDomain,
    patient_context: dc.defaultContext,
    accumulated: {established_consensus:[],discarded_hypotheses:[],unresolved_issues:[],clinical_protocols:[],last_updated:null},
    sessions:[], conditions:[], templates: dc.templates ? [...dc.templates] : [],
    last_backup:null, session_timeline:[], pending_qa:[], usage_data:{},
    monthly_summaries:{}, price_table:null, price_updated:null,
  };
}
