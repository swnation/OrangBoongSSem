// js/session.js — 세션 관리 (Phase 3 모듈화)

// 누적지식 업데이트 헬퍼 (중복 방지)
function _updateAccumFromParsed(accum, parsed) {
  const map = {new_consensus:'established_consensus', new_discarded:'discarded_hypotheses', updated_issues:'unresolved_issues', new_protocols:'clinical_protocols'};
  Object.entries(map).forEach(([pKey,aKey])=>{
    if(Array.isArray(parsed[pKey])) parsed[pKey].forEach(x=>{if(x&&!accum[aKey].includes(x))accum[aKey].push(x);});
  });
}

// ═══════════════════════════════════════════════════════════════
// SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════
function startNewSession(prefillQuestion, mode) {
  _sessionFiles = [];
  _selectedTemplates=new Set();
  S.session = {
    id:Date.now(), date:kstToday(),
    question:prefillQuestion||'', rounds:[], currentRound:0, summary:null,
    new_consensus:[], new_discarded:[], updated_issues:[],
    mode: mode||'basic', // 'basic','normal','debate','quick','multi-grok'
    debateReversed: false,
    debateTeams: {gpt:'pro',gemini:'con',grok:'neutral',claude:'judge',perp:'fact'},
    grokAgentLevel: 4,
  };
  S._dirty = false;
  switchView('session');
  document.getElementById('session-round-badge').style.display='inline';
  document.getElementById('session-round-badge').textContent='R0';
}

function startSessionFromLogs() {
  const summary = getRecentLogSummary();
  if (!summary) { showToast('최근 7일 기록이 없습니다.'); return; }
  const dc=DC();
  const question=`${dc.label} 최근 기록 분석 요청:\n\n${summary}\n\n위 기록을 바탕으로 패턴 분석, 주요 변화, 주의 사항을 알려주세요.`;
  startNewSession(question);
}

// ── 기본 모드 (GPT||Perp → Claude) ──
function startLightMode() {
  // Legacy: redirect to basic mode session
  startNewSession('', 'basic');
}

async function runBasicMode() {
  if(S.generating) return;
  const q=document.getElementById('q-input')?.value?.trim();
  if(!q){showToast('❌ 질문을 입력해 주세요.');return;}

  // Check required AI keys
  const needed=['gpt','perp','claude'];
  const missing=needed.filter(id=>!S.keys[id]);
  if(missing.length){showToast('❌ API 키 없음: '+missing.map(id=>AI_DEFS[id].name).join(', '));return;}

  S.session.question=q;
  if(_sessionFiles.length) S.session._attachments=_sessionFiles.map(f=>({name:f.name,type:f.type,size:f.size,driveId:f.driveId,webLink:f.webLink}));

  saveSessionSnapshot();
  S.generating=true; S._dirty=true;
  S.session.currentRound=1;
  document.getElementById('session-round-badge').textContent='R1';
  const stopAllBar=document.getElementById('stop-all-bar');if(stopAllBar)stopAllBar.style.display='flex';
  if(!S.session.rounds[0]) S.session.rounds[0]={round:1,answers:{},errors:{}};
  _showProgress(0,3,'R1: GPT + Perplexity 분석 중...');

  // Hide non-basic AI cards
  Object.keys(AI_DEFS).forEach(id=>{
    const card=document.querySelector(`[data-ai="${id}"]`);
    if(card) card.style.display=['gpt','perp','claude'].includes(id)?'':'none';
  });

  // ── R1: GPT + Perplexity 병렬 ──
  const contextFull=getFullContext(q);
  const r1Prompt=`${contextFull}\n\n[오늘 세션 질문]\n${q}\n\n분석해 주세요. 서론/인사 없이 바로 핵심.`;

  setCardStatus('gpt','loading'); setCardStatus('perp','loading');
  setCardStatus('claude','waiting');
  startAITimer('gpt'); startAITimer('perp');

  const r1Results={};
  await Promise.all(['gpt','perp'].map(async aiId=>{
    const ac=new AbortController();
    if(!S._abortControllers) S._abortControllers={};
    S._abortControllers[aiId]=ac;
    updateStopBtn(aiId,true);
    try {
      const answer=await callAIStream(aiId,getRoleSystem(aiId),r1Prompt,(chunk)=>{
        const ta=document.getElementById('ans-'+aiId);
        if(ta){ta.value=chunk;ta.scrollTop=ta.scrollHeight;}
      },ac.signal,'session-r1');
      r1Results[aiId]=answer;
      S.session.rounds[0].answers[aiId]=answer;
      delete S.session.rounds[0].errors[aiId];
      const ta=document.getElementById('ans-'+aiId);
      if(ta){ta.value=answer;ta.classList.remove('gen');}
      updateAICardMD(aiId,answer);
      setCardStatus(aiId,'done');
    } catch(e) {
      if(e.name==='AbortError'){
        const ta=document.getElementById('ans-'+aiId);
        const partial=ta?.value||'';
        if(partial){r1Results[aiId]=partial;S.session.rounds[0].answers[aiId]=partial;delete S.session.rounds[0].errors[aiId];setCardStatus(aiId,'done');}
        else{S.session.rounds[0].errors[aiId]=true;setCardStatus(aiId,'error');}
      } else {
        const msg='⚠️ 오류: '+e.message;
        S.session.rounds[0].answers[aiId]=msg;
        S.session.rounds[0].errors[aiId]=true;
        setCardStatus(aiId,'error');
      }
    }
    delete S._abortControllers?.[aiId];
    updateStopBtn(aiId,false); stopAITimer(aiId);
  }));

  // ── R2: Claude 순차 (R1 결과를 context로) ──
  _showProgress(1,3,'R2: Claude 종합 분석 중...');
  S.session.currentRound=2;
  if(!S.session.rounds[1]) S.session.rounds[1]={round:2,answers:{},errors:{}};
  document.getElementById('session-round-badge').textContent='R2';

  const claudePrompt=`${contextFull}\n\n[오늘 세션 질문]\n${q}\n\n[GPT 데이터 분석]\n${r1Results.gpt||'(실패)'}\n\n[Perplexity 근거 검색]\n${r1Results.perp||'(실패)'}\n\n위 두 AI의 분석과 근거를 종합하여 최종 임상 판단과 액션 플랜을 도출하세요.`;

  setCardStatus('claude','loading');
  startAITimer('claude');
  const ac=new AbortController();
  if(!S._abortControllers) S._abortControllers={};
  S._abortControllers.claude=ac;
  updateStopBtn('claude',true);
  try {
    const answer=await callAIStream('claude',getRoleSystem('claude'),claudePrompt,(chunk)=>{
      const ta=document.getElementById('ans-claude');
      if(ta){ta.value=chunk;ta.scrollTop=ta.scrollHeight;}
    },ac.signal,'session-r1');
    S.session.rounds[1].answers.claude=answer;
    delete S.session.rounds[1].errors.claude;
    const ta=document.getElementById('ans-claude');
    if(ta){ta.value=answer;ta.classList.remove('gen');}
    updateAICardMD('claude',answer);
    setCardStatus('claude','done');
  } catch(e) {
    if(e.name==='AbortError'){
      const ta=document.getElementById('ans-claude');
      const partial=ta?.value||'';
      if(partial){S.session.rounds[1].answers.claude=partial;delete S.session.rounds[1].errors.claude;setCardStatus('claude','done');}
      else{S.session.rounds[1].errors.claude=true;setCardStatus('claude','error');}
    } else {
      S.session.rounds[1].answers.claude='⚠️ 오류: '+e.message;
      S.session.rounds[1].errors.claude=true;
      setCardStatus('claude','error');
    }
  }
  delete S._abortControllers?.claude;
  updateStopBtn('claude',false); stopAITimer('claude');

  _showProgress(3,3,'완료!');
  setTimeout(_hideProgress,1500);
  S.generating=false;
  const stopAllBar2=document.getElementById('stop-all-bar');if(stopAllBar2)stopAllBar2.style.display='none';
  try{await saveMaster();
    const bar=document.getElementById('autosave-bar');
    if(bar){bar.textContent=`✓ 기본 협진 자동저장 ${new Date().toLocaleTimeString('ko-KR')}`;bar.classList.add('autosave-pulse');setTimeout(()=>bar.classList.remove('autosave-pulse'),2000);}
  }catch(e){}
  const actionBar=document.getElementById('action-bar');
  if(actionBar) actionBar.innerHTML=renderActionBar(S.session.currentRound);
  updateSidebarCost();
}

// Session mode suggestion (keyword-based, no AI)
function suggestSessionMode(question) {
  if(!question||question.length<5) return null;
  const q=question.toLowerCase();
  const debateKw=['인가?','해도 되나','할까?','vs','찬반','맞나','괜찮은가','중단해도','시작해야','유지 vs','변경','해야 하나','괜찮을까','가능한가','안전한가'];
  const quickKw=['몇 번','몇 일','언제','용량','뭐였지','알려줘','얼마','몇 mg','몇 시'];
  if(debateKw.some(k=>q.includes(k))) return 'debate';
  if(quickKw.some(k=>q.includes(k))) return 'quick';
  return null;
}

// Quick question — single AI call
function selectQuickAI(aiId) {
  S.session._quickSelectedAI=aiId;
  // 선택된 AI 카드만 강조, 나머지 흐리게
  Object.keys(AI_DEFS).forEach(id=>{
    const card=document.querySelector(`[data-ai="${id}"]`);
    if(card) { card.classList.remove('quick-idle','quick-selected','quick-dimmed'); card.classList.add(id===aiId?'quick-selected':'quick-dimmed'); }
  });
  const actionBar=document.getElementById('action-bar');
  if(actionBar) actionBar.innerHTML=renderActionBar(S.session.currentRound);
}

async function runQuickQuestion(aiId) {
  if(S.generating) return;
  const q=document.getElementById('q-input')?.value?.trim();
  if(!q){showToast('❌ 질문을 입력해 주세요.');return;}
  if(!S.keys[aiId]){showToast(`❌ ${AI_DEFS[aiId].name} API 키 없음`);return;}
  S.session.question=q;
  S.generating=true; S._dirty=true;
  S.session.currentRound=1;
  if(!S.session.rounds[0]) S.session.rounds[0]={round:1,answers:{}};
  document.getElementById('session-round-badge').textContent='Q';
  setCardStatus(aiId,'loading');
  // Hide other AI cards
  Object.keys(AI_DEFS).forEach(id=>{
    const card=document.querySelector(`[data-ai="${id}"]`);
    if(card) card.style.display=id===aiId?'':'none';
  });
  try {
    const answer=await callAIStream(aiId,getRoleSystem(aiId),buildUserPrompt(aiId,1),(chunk)=>{
      const ta=document.getElementById('ans-'+aiId);
      if(ta){ta.value=chunk;ta.scrollTop=ta.scrollHeight;}
    },undefined,'session-r1');
    S.session.rounds[0].answers[aiId]=answer;
    const ta=document.getElementById('ans-'+aiId);
    if(ta){ta.value=answer;ta.classList.remove('gen');}
    updateAICardMD(aiId,answer);
    setCardStatus(aiId,'done');
  } catch(e) {
    S.session.rounds[0].answers[aiId]='⚠️ 오류: '+e.message;
    setCardStatus(aiId,'error');
  }
  S.generating=false;
  // Save as quick session
  S.session.currentRound=4; S._dirty=false;
  const m=DM();
  m.sessions.unshift({...S.session, _quickAI:aiId});
  await saveMaster();
  updateHistCount();updateSidebarCost();
  document.getElementById('session-round-badge').textContent='완료';
  const actionBar=document.getElementById('action-bar');
  if(actionBar) actionBar.innerHTML=`<div class="round-action-bar" style="border-color:#10b98155;background:#f0fdf4">
    <span style="color:var(--gr);font-size:.85rem;font-weight:600">✅ 빠른 질문 완료</span>
    <button class="btn-run-round green" onclick="startNewSession()" style="margin-left:auto">새 세션</button>
  </div>`;
  showToast('✅ 빠른 질문 완료 & 저장됨');
}

async function runRound(roundNum, errorsOnly) {
  if(S.generating) return;
  const q = document.getElementById('q-input')?.value?.trim();
  if(!q) { showToast('❌ 질문을 입력해 주세요.'); return; }
  S.session.question = q;
  // Save file attachments to session
  if(roundNum===1 && _sessionFiles.length) {
    S.session._attachments = _sessionFiles.map(f=>({name:f.name,type:f.type,size:f.size,driveId:f.driveId,webLink:f.webLink}));
  }
  let enabledAIs = getEnabledAIs();
  // 디베이트: 자체 로직 사용 (multi-grok은 별도 함수 사용)
  // errorsOnly: only re-run AIs that had errors in this round
  if(errorsOnly && S.session.rounds[roundNum-1]) {
    const rd = S.session.rounds[roundNum-1];
    enabledAIs = enabledAIs.filter(id=>rd.errors?.[id]);
    if(!enabledAIs.length) { showToast('재실행할 오류 AI가 없습니다.'); return; }
  }
  const missingKeys = enabledAIs.filter(id=>!S.keys[id]);
  if(missingKeys.length) { showToast('❌ API 키 없음: '+missingKeys.map(id=>AI_DEFS[id].name).join(', ')); return; }
  if(!enabledAIs.length) { showToast('❌ 최소 1개 AI를 선택해주세요.'); return; }

  // #7 Undo: save session snapshot before running
  saveSessionSnapshot();

  S.generating = true; S._dirty = true;
  S.session.currentRound = roundNum;
  document.getElementById('session-round-badge').textContent = `R${roundNum}`;
  const stopAllBar=document.getElementById('stop-all-bar');if(stopAllBar)stopAllBar.style.display='flex';
  if(!S.session.rounds[roundNum-1]) S.session.rounds[roundNum-1]={round:roundNum,answers:{},errors:{}};
  enabledAIs.forEach(id=>setCardStatus(id,'loading'));
  // Hide disabled AI cards (only when running full round, not error-only retry)
  if(!errorsOnly) {
    Object.keys(AI_DEFS).forEach(id=>{
      const card=document.querySelector(`[data-ai="${id}"]`);
      if(card) card.style.display=enabledAIs.includes(id)?'':'none';
    });
  }
  const runBtn=document.getElementById('run-btn'); if(runBtn) runBtn.disabled=true;
  const _totalAIs=enabledAIs.length;
  let _doneAIs=0;
  _showProgress(0,_totalAIs,`R${roundNum}: ${_totalAIs}개 AI 분석 중...`);

  // AI 1개 실행 헬퍼
  const _runOneAI=async(aiId)=>{
    const ac=new AbortController();
    if(!S._abortControllers) S._abortControllers={};
    S._abortControllers[aiId]=ac;
    setCardStatus(aiId,'loading');
    updateStopBtn(aiId,true); startAITimer(aiId);
    try {
      const answer = await callAIStream(aiId, getRoleSystem(aiId), buildUserPrompt(aiId,roundNum), (chunk)=>{
        const ta=document.getElementById('ans-'+aiId);
        if(ta){ta.value=chunk;ta.scrollTop=ta.scrollHeight;}
      }, ac.signal, 'session-r'+roundNum);
      S.session.rounds[roundNum-1].answers[aiId]=answer;
      delete S.session.rounds[roundNum-1].errors[aiId];
      const ta=document.getElementById('ans-'+aiId);
      if(ta){ta.value=answer;ta.classList.remove('gen');}
      updateAICardMD(aiId, answer);
      setCardStatus(aiId,'done');
    } catch(e) {
      if(e.name==='AbortError') {
        const ta=document.getElementById('ans-'+aiId);
        const partial=ta?.value||'';
        if(partial) { S.session.rounds[roundNum-1].answers[aiId]=partial; delete S.session.rounds[roundNum-1].errors[aiId]; setCardStatus(aiId,'done'); showToast(`⏹ ${AI_DEFS[aiId].name} 중단됨`); }
        else { S.session.rounds[roundNum-1].errors[aiId]=true; setCardStatus(aiId,'error'); }
      } else {
        const msg='⚠️ 오류: '+e.message;
        S.session.rounds[roundNum-1].answers[aiId]=msg;
        S.session.rounds[roundNum-1].errors[aiId]=true;
        const ta=document.getElementById('ans-'+aiId);
        if(ta){ta.value=msg;ta.classList.remove('gen');}
        setCardStatus(aiId,'error');
      }
    }
    delete S._abortControllers?.[aiId];
    updateStopBtn(aiId,false); stopAITimer(aiId);
    _doneAIs++;
    _showProgress(_doneAIs,_totalAIs,`R${roundNum}: ${_doneAIs}/${_totalAIs} AI 완료`);
  };

  const mode=S.session?.mode||'normal';
  if(mode==='debate'&&roundNum===1) {
    // 디베이트 R1: Phase1(찬반+중도+팩트 병렬) → Phase2(심판 순차)
    const jId=getDebateJudgeId();
    const phase1=enabledAIs.filter(id=>id!==jId);
    const phase2=enabledAIs.filter(id=>id===jId);
    if(phase1.length) {
      phase2.forEach(id=>setCardStatus(id,'waiting'));
      await Promise.all(phase1.map(_runOneAI));
    }
    if(phase2.length) await Promise.all(phase2.map(_runOneAI));
  } else {
    await Promise.all(enabledAIs.map(_runOneAI));
  }

  _showProgress(_totalAIs,_totalAIs,'완료!');
  setTimeout(_hideProgress,1500);
  S.generating=false; if(runBtn) runBtn.disabled=false;
  const stopAllBar2=document.getElementById('stop-all-bar');if(stopAllBar2)stopAllBar2.style.display='none';
  try {
    await saveMaster();
    const bar=document.getElementById('autosave-bar');
    if(bar) { bar.textContent=`✓ R${roundNum} 자동저장 ${new Date().toLocaleTimeString('ko-KR')}`; bar.classList.add('autosave-pulse'); setTimeout(()=>bar.classList.remove('autosave-pulse'),2000); }
  } catch(e){}
  const actionBar=document.getElementById('action-bar');
  if(actionBar) actionBar.innerHTML=renderActionBar(roundNum);
  updateSidebarCost();
}

async function regenOne(aiId) {
  if(S.generating){showToast('다른 AI 생성 중입니다.');return;}
  const curRound=S.session?.currentRound;
  if(!curRound||curRound===4) return;
  if(!S.keys[aiId]){showToast(`❌ ${AI_DEFS[aiId].name} 키 없음`);return;}
  const btn=document.getElementById('regen-'+aiId);
  if(btn){btn.disabled=true;btn.textContent='생성중...';}
  setCardStatus(aiId,'loading');
  if(!S.session.rounds[curRound-1]) S.session.rounds[curRound-1]={round:curRound,answers:{},errors:{}};
  if(!S.session.rounds[curRound-1].errors) S.session.rounds[curRound-1].errors={};
  const ac=new AbortController();
  if(!S._abortControllers) S._abortControllers={};
  S._abortControllers[aiId]=ac;
  updateStopBtn(aiId,true); startAITimer(aiId);
  try {
    const answer=await callAIStream(aiId,getRoleSystem(aiId),buildUserPrompt(aiId,curRound),(chunk)=>{
      const ta=document.getElementById('ans-'+aiId);
      if(ta){ta.value=chunk;ta.scrollTop=ta.scrollHeight;}
    }, ac.signal, 'session-r'+curRound);
    S.session.rounds[curRound-1].answers[aiId]=answer;
    delete S.session.rounds[curRound-1].errors[aiId];
    const ta=document.getElementById('ans-'+aiId);
    if(ta){ta.value=answer;ta.classList.remove('gen');}
    updateAICardMD(aiId, answer);
    setCardStatus(aiId,'done');
    showToast(`✅ ${AI_DEFS[aiId].name} 재생성 완료`);
  } catch(e) {
    if(e.name==='AbortError') {
      const ta=document.getElementById('ans-'+aiId);
      const partial=ta?.value||'';
      if(partial) { S.session.rounds[curRound-1].answers[aiId]=partial; delete S.session.rounds[curRound-1].errors[aiId]; setCardStatus(aiId,'done'); }
      else { S.session.rounds[curRound-1].errors[aiId]=true; setCardStatus(aiId,'error'); }
      showToast(`⏹ ${AI_DEFS[aiId].name} 중단됨`);
    } else {
      const msg='⚠️ 오류: '+e.message;
      S.session.rounds[curRound-1].answers[aiId]=msg;
      S.session.rounds[curRound-1].errors[aiId]=true;
      const ta=document.getElementById('ans-'+aiId);
      if(ta){ta.value=msg;ta.classList.remove('gen');}
      setCardStatus(aiId,'error');
    }
  }
  delete S._abortControllers?.[aiId];
  updateStopBtn(aiId,false); stopAITimer(aiId);
  if(btn){btn.disabled=false;btn.textContent='↺ 재생성';}
  try { await saveMaster(); updateSidebarCost(); } catch(e) {}
}

function stopAI(aiId) {
  const ac=S._abortControllers?.[aiId];
  if(ac) ac.abort();
}

function stopAllAI() {
  if(!S._abortControllers) return;
  Object.keys(S._abortControllers).forEach(id=>stopAI(id));
  _hideProgress();
  showToast('⏹ 전체 AI 중단됨');
}

function resetAndNewSession() {
  stopAllAI();
  S.generating=false;
  startNewSession();
}

function updateStopBtn(aiId, running) {
  const el=document.getElementById('stop-'+aiId);
  if(!el) return;
  if(running) { el.style.display='inline-block'; }
  else { el.style.display='none'; }
}

// ── AI 생성 타이머 ──
const _aiTimers={};
const AI_SLOW_THRESHOLD=45; // 초 — 이 시간 지나면 재시도 권장

function startAITimer(aiId) {
  stopAITimer(aiId);
  const el=document.getElementById('timer-'+aiId);
  if(!el) return;
  const start=Date.now();
  const model=S.models[aiId]||DEFAULT_MODELS[aiId];
  const price=DEFAULT_PRICE_TABLE[model];
  const estInfo=price?` · ~$${((4000/1e6*price.in)+(2000/1e6*price.out)).toFixed(4)}/call`:'';
  el.textContent=`0s${estInfo}`;
  el.style.display='inline';
  el.style.color='var(--mu)';
  const warn=document.getElementById('slow-'+aiId);
  if(warn) warn.style.display='none';
  _aiTimers[aiId]=setInterval(()=>{
    const sec=Math.round((Date.now()-start)/1000);
    el.textContent=`${sec}s${estInfo}`;
    if(sec>=AI_SLOW_THRESHOLD) {
      el.style.color='#f59e0b';
      if(warn) { warn.style.display='inline'; warn.title=`${sec}초 경과 — 중단 후 재시도를 권장합니다`; }
    }
  },1000);
}

function stopAITimer(aiId) {
  if(_aiTimers[aiId]) { clearInterval(_aiTimers[aiId]); delete _aiTimers[aiId]; }
  const el=document.getElementById('timer-'+aiId);
  if(el) el.style.display='none';
  const warn=document.getElementById('slow-'+aiId);
  if(warn) warn.style.display='none';
}

// Partial DOM update: show markdown view after streaming (#9)
function updateAICardMD(aiId, text) {
  const body = document.querySelector(`[data-ai="${aiId}"] .ai-body`);
  if(!body || !text) return;
  // Add or update markdown view
  let mdDiv = body.querySelector('.ai-md');
  if(!mdDiv) {
    mdDiv = document.createElement('div');
    mdDiv.className = 'ai-md';
    mdDiv.style.display = 'none';
    body.appendChild(mdDiv);
  }
  mdDiv.innerHTML = renderMD(text);
  // Add toggle button if not exists
  let toggleBtn = body.querySelector('.ai-toggle-view');
  if(!toggleBtn) {
    toggleBtn = document.createElement('button');
    toggleBtn.className = 'ai-toggle-view';
    toggleBtn.textContent = 'MD';
    toggleBtn.onclick = () => {
      const ta = body.querySelector('textarea');
      const md = body.querySelector('.ai-md');
      if(!ta || !md) return;
      const showMD = md.style.display === 'none';
      ta.style.display = showMD ? 'none' : '';
      md.style.display = showMD ? 'block' : 'none';
      toggleBtn.textContent = showMD ? 'Raw' : 'MD';
    };
    body.insertBefore(toggleBtn, body.firstChild);
  }
}

function setCardStatus(aiId,status) {
  const card=document.querySelector(`[data-ai="${aiId}"]`); if(!card) return;
  card.classList.remove('generating','done','error');
  if(status==='loading') card.classList.add('generating');
  if(status==='done') card.classList.add('done');
  if(status==='error') card.classList.add('error');
  const chip=document.getElementById('chip-'+aiId);
  if(chip){
    const labels={loading:'생성중...',done:'완료',error:'오류',waiting:'대기중',idle:''};
    const bg={loading:'#1a2535',done:'#0d2a1a',error:'#2a1010',waiting:'#1a1a2a',idle:'transparent'};
    const fg={loading:'#60a0c8',done:'#2d8a5a',error:'#c05050',waiting:'#8888aa',idle:'inherit'};
    chip.textContent=labels[status]||'';
    chip.style.cssText=`background:${bg[status]};color:${fg[status]};font-size:.62rem;font-family:var(--mono);padding:2px 6px;border-radius:3px;margin-left:auto`;
  }
}

// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// GROK MULTI-AGENT MODE
// ═══════════════════════════════════════════════════════════════
async function runGrokMultiAgent() {
  if(S.generating) return;
  const q=document.getElementById('q-input')?.value?.trim();
  if(!q){showToast('❌ 질문을 입력해 주세요.');return;}
  if(!S.keys.grok){showToast('❌ Grok API 키가 없습니다. 🔑 설정에서 입력하세요.');return;}
  S.session.question=q;
  const agentLevel=S.session.grokAgentLevel||4;
  S.generating=true; S._dirty=true;
  const btn=document.getElementById('run-btn');if(btn)btn.disabled=true;

  // Grok 카드 표시
  const area=document.getElementById('content');
  const summArea=document.getElementById('summary-area')||document.createElement('div');
  summArea.id='summary-area';
  summArea.innerHTML=`<div class="card" style="text-align:center;padding:24px"><div class="spin" style="display:block;margin:0 auto"></div><p style="margin-top:12px;font-size:.85rem;color:var(--mu)">🤖 Grok ${agentLevel} 에이전트 내부 토론 중...</p><span id="grok-timer" style="font-size:.75rem;color:var(--mu)">0s</span></div>`;
  if(!summArea.parentNode) area.appendChild(summArea);

  // 타이머
  const timerStart=Date.now();
  const timerInterval=setInterval(()=>{
    const el=document.getElementById('grok-timer');
    if(el) el.textContent=Math.round((Date.now()-timerStart)/1000)+'s';
  },1000);

  const contextFull=getFullContext(q);
  const dcG = DC();
  const system=`Grok ${agentLevel} Multi-Agent 모드. 내부 ${agentLevel}명(Captain, Researcher, Logician, Contrarian 등) 토론 후 요약.
[대상 환자] ${dcG.user} · ${dcG.label}
SSOT 원칙 준수. 중간 토론 과정은 출력하지 마세요. 자기 역할·에이전트 이름 재진술 금지.
**최종 출력은 반드시 아래 JSON만 출력. 다른 텍스트 절대 금지.**
{
  "session_summary":"3문장 요약 (≤200자)",
  "new_consensus":["합의 (각 ≤100자)"],
  "new_discarded":["폐기 (각 ≤100자)"],
  "updated_issues":["쟁점 (각 ≤100자)"],
  "new_protocols":[],
  "round_evolution":"에이전트 토론 발전과정 (≤150자)",
  "final_recommendation":"최종 권고 (≤200자)",
  "next_steps":["행동1","행동2"],
  "patient_friendly":"${dcG.user}에게 전달할 설명용 문장 2~4문장. 전문용어 최소화. '${dcG.user}님' 호칭 사용. 핵심 판단·권고·주의점 부드럽게 전달."
}`;

  const userPrompt=`${contextFull}\n\n[질문]\n${q}`;

  try {
    // Grok 4.20 Multi-Agent: /v1/responses 엔드포인트
    const maModel='grok-4.20-multi-agent';
    const r=await fetchWithRetry('https://api.x.ai/v1/responses',{method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+S.keys.grok},
      body:JSON.stringify({model:maModel,instructions:system,
        input:[{role:'user',content:userPrompt}]})});
    if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error('Grok: '+(d.error?.message||r.status));}
    const data=await r.json();
    // 응답 텍스트 추출
    const raw=(data.output||[]).filter(o=>o.type==='message').map(o=>(o.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join('')).join('\n')||data.output_text||JSON.stringify(data);
    // 토큰 비용 기록
    const mu=data.usage||{};
    recordUsage('grok',maModel,mu.input_tokens||0,mu.output_tokens||0,'summary');

    // JSON 추출 (기존 Claude runFinalSummary와 동일한 파싱)
    let parsed;
    let clean=raw.replace(/```json|```/g,'').trim();
    const jsonMatch=clean.match(/\{[\s\S]*\}/);
    if(jsonMatch) clean=jsonMatch[0];
    try { parsed=JSON.parse(clean); }
    catch(e) {
      parsed={session_summary:'JSON 파싱 실패',new_consensus:[],new_discarded:[],updated_issues:[],
        new_protocols:[],round_evolution:'',final_recommendation:raw.substring(0,500),next_steps:['원문 참조']};
      showToast('⚠️ 요약 파싱 실패 — 세션은 저장됩니다.',4000);
    }

    // 누적 저장 (기존 runFinalSummary와 동일)
    S.session.summary=parsed;
    S.session.currentRound=4;
    S.session.rounds=[{round:1,answers:{grok:raw},errors:{}}];
    const m=DM(); const accum=m.accumulated;
    _updateAccumFromParsed(accum, parsed);
    S.session.new_consensus=parsed.new_consensus||[];
    S.session.new_discarded=parsed.new_discarded||[];
    S.session.updated_issues=parsed.updated_issues||[];
    m.sessions.unshift({...S.session});
    if(!m.session_timeline) m.session_timeline=[];
    m.session_timeline.unshift({date:S.session.date,question:S.session.question,summary:parsed.session_summary,mode:'multi-grok',agentLevel});
    await saveMaster();

    summArea.innerHTML=renderSummaryResult(parsed);
    showToast(`✅ Grok ${agentLevel} 에이전트 요약 완료`);
  } catch(e) {
    summArea.innerHTML=`<div class="card" style="padding:16px;color:#ef4444">⚠️ Grok Multi-Agent 오류: ${esc(e.message)}</div>`;
  }
  clearInterval(timerInterval);
  S.generating=false;if(btn)btn.disabled=false;
  updateSidebarCost();
}

// FINAL SUMMARY
// ═══════════════════════════════════════════════════════════════
async function runFinalSummary() {
  const finalBtn=document.getElementById('final-btn');
  const finalSp=document.getElementById('final-sp');
  if(finalBtn) finalBtn.disabled=true;
  if(finalSp) finalSp.style.display='block';

  // 진행률·타이머·프롬프트 구성 모두 try 안에서 → 어떤 단계에서 예외나도 finally가 안전 정리
  let _summaryTick = null;
  try {
    _showProgress(0, 1, '📝 최종 요약 생성 중... (AI 호출)');
    let _summaryEstPct = 0;
    _summaryTick = setInterval(()=>{
      _summaryEstPct = Math.min(95, _summaryEstPct + 4);
      _showProgress(_summaryEstPct, 100, '📝 최종 요약 생성 중... 환자 설명용 문장 포함');
    }, 800);

    const lastRound=S.session.rounds[S.session.rounds.length-1];
    const lastRoundText=lastRound
      ? Object.entries(lastRound.answers||{}).map(([id,ans])=>`[${AI_DEFS[id]?.name}]\n${(ans||'').substring(0,800)}`).join('\n\n---\n\n')
      : '';

    const dc = DC();
    const prompt = `${dc.user} ${dc.label} 협진 세션 마무리 요약을 JSON으로만 작성.
[대상 환자] ${dc.user} · ${dc.label}

질문: ${S.session.question}

최종 라운드 답변:
${lastRoundText}

JSON 형식 (각 문자열은 명시된 길이 이내):
{
  "session_summary": "3문장 요약 (≤200자)",
  "new_consensus": ["합의 (각 ≤100자)"],
  "new_discarded": ["폐기 (각 ≤100자)"],
  "updated_issues": ["쟁점 (각 ≤100자)"],
  "new_protocols": [],
  "round_evolution": "발전과정 (≤150자)",
  "final_recommendation": "최종 권고 (≤200자)",
  "next_steps": ["행동1", "행동2"],
  "patient_friendly": "${dc.user}에게 전달할 설명용 문장. 2~4문장. 전문용어 최소화. '${dc.user}님' 호칭 사용. 이번 세션의 핵심 판단·권고·주의점을 부드럽게 전달."
}`;

    const result = await callAI('claude',
      '당신은 협진 세션 요약 전문가. 유효한 JSON만 출력. 다른 텍스트 금지.',
      prompt, 'summary');

    let parsed;
    let clean = result.replace(/```json|```/g,'').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if(jsonMatch) clean=jsonMatch[0];
    try { parsed=JSON.parse(clean); }
    catch(e) {
      parsed={session_summary:'요약 파싱 실패',new_consensus:[],new_discarded:[],updated_issues:[],
        new_protocols:[],round_evolution:'',final_recommendation:'세션 기록에서 직접 확인',next_steps:['수동 확인']};
      showToast('⚠️ 요약 파싱 실패 — 세션은 저장됩니다.',4000);
    }

    S.session.summary=parsed;
    const m=DM(); const accum=m.accumulated;
    _updateAccumFromParsed(accum, parsed);

    S.session.new_consensus=parsed.new_consensus||[];
    S.session.new_discarded=parsed.new_discarded||[];
    S.session.updated_issues=parsed.updated_issues||[];
    m.sessions.unshift({...S.session});

    if(!m.session_timeline) m.session_timeline=[];
    m.session_timeline.unshift({
      date:S.session.date,
      summary_lines:[parsed.session_summary?.substring(0,100)||'',parsed.final_recommendation?.substring(0,100)||''],
      my_memo:'', session_idx:0
    });

    await saveMaster();
    S.session.currentRound=4;
    S._dirty=false;
    document.getElementById('session-round-badge').textContent='완료';
    updateHistCount();
    updateSidebarCost();

    const area=document.getElementById('summary-area');
    if(area){area.innerHTML=renderSummaryResult(parsed);area.scrollIntoView({behavior:'smooth'});}
    _showProgress(100, 100, '✅ 최종 요약 완료');
    showToast('✅ 세션 저장 & Drive 동기화 완료!');
    // Offer context auto-merge
    if(parsed.new_consensus?.length||parsed.updated_issues?.length||parsed.final_recommendation) {
      offerContextMerge(parsed);
    }
  } catch(e) {
    showToast('❌ 요약 실패: '+e.message,5000);
  } finally {
    clearInterval(_summaryTick);
    setTimeout(_hideProgress, 1200);
  }
  if(finalBtn) finalBtn.disabled=false;
  if(finalSp) finalSp.style.display='none';
}

let _pendingContextMerge='';
function offerContextMerge(parsed) {
  const additions=[];
  if(parsed.new_consensus?.length) additions.push('■ 새 합의: '+parsed.new_consensus.join('; '));
  if(parsed.updated_issues?.length) additions.push('■ 미해결 쟁점: '+parsed.updated_issues.join('; '));
  if(parsed.final_recommendation) additions.push('■ 권고: '+parsed.final_recommendation);
  _pendingContextMerge='\n\n['+kstToday()+' 세션 반영]\n'+additions.join('\n');

  showConfirmModal('📋 컨텍스트 자동 반영',
    `<p style="font-size:.82rem;margin-bottom:10px">이번 세션 결과를 환자 컨텍스트에 추가할까요?</p>
    <div style="background:var(--sf2);border:1.5px solid var(--bd);border-radius:8px;padding:10px;font-family:var(--mono);font-size:.72rem;line-height:1.6;max-height:200px;overflow-y:auto;white-space:pre-wrap;color:var(--gr)">${esc(_pendingContextMerge)}</div>`,
    [{label:'컨텍스트에 추가',action:applyContextMerge,primary:true}]
  );
}

async function applyContextMerge() {
  if(!_pendingContextMerge) return;
  const m=DM(); if(!m) return;
  m.patient_context=(m.patient_context||'')+_pendingContextMerge;
  _pendingContextMerge='';
  await saveMaster();
  closeConfirmModal();
  showToast('✅ 컨텍스트에 반영됨');
}



function renderSummaryResult(r) {
  const steps=(r.next_steps||[]).map((s,i)=>`<li><strong>Step ${i+1}.</strong> ${esc(s)}</li>`).join('');
  const newCon=(r.new_consensus||[]).map(x=>`<li>${esc(x)}</li>`).join('');
  const issues=(r.updated_issues||[]).map(x=>`<li>${esc(x)}</li>`).join('');
  const todayCost=getSidebarCostToday();
  const costBadge=todayCost>0?`<span style="font-size:.7rem;font-family:var(--mono);color:var(--mu);margin-left:auto">$${todayCost.toFixed(4)}</span>`:'';

  const patientFriendly = r.patient_friendly ? `<div class="final-card" style="border-left:4px solid var(--ac)"><h3>💬 환자 전달용 문장 <span class="badge badge-blue">${esc(DC().user)}에게</span><button class="btn-copy" onclick="copyCardText(this)">📋 복사</button></h3><div class="fcontent"><p style="line-height:1.7;white-space:pre-wrap">${esc(r.patient_friendly)}</p></div></div>` : '';
  return `
    <div class="final-card"><h3>📈 라운드 발전 <span class="badge badge-blue">Evolution</span><button class="btn-copy" onclick="copyCardText(this)">📋 복사</button></h3><div class="fcontent"><p>${esc(r.round_evolution||'')}</p></div></div>
    <div class="final-card"><h3>✅ 세션 요약 ${costBadge}<button class="btn-copy" onclick="copyCardText(this)">📋 복사</button></h3><div class="fcontent"><p>${esc(r.session_summary||'')}</p></div></div>
    ${newCon?`<div class="final-card"><h3>🆕 새 합의 <span class="badge badge-green">누적 저장</span><button class="btn-copy" onclick="copyCardText(this)">📋 복사</button></h3><div class="fcontent"><ul>${newCon}</ul></div></div>`:''}
    ${issues?`<div class="final-card"><h3>🔍 미해결 쟁점 <span class="badge badge-orange">추적 중</span><button class="btn-copy" onclick="copyCardText(this)">📋 복사</button></h3><div class="fcontent"><ul>${issues}</ul></div></div>`:''}
    <div class="final-card"><h3>🎯 최종 권고 <span class="badge badge-purple">Action</span><button class="btn-copy" onclick="copyCardText(this)">📋 복사</button></h3><div class="fcontent"><p>${esc(r.final_recommendation||'')}</p><div class="divider"></div><ul>${steps}</ul></div></div>
    ${patientFriendly}
    <p style="font-size:.7rem;color:var(--mu);text-align:center;padding:6px 0 16px">※ 의료적 결정은 반드시 전문의와 상담하세요.</p>
    <div style="text-align:center;padding-bottom:16px"><button class="btn-share" onclick="shareSession()">🔗 세션 공유</button></div>`;
}

