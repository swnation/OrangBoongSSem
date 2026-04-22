// ═══════════════════════════════════════════════════════════════
// AI API CALLS
// ═══════════════════════════════════════════════════════════════

function getRoleSystem(aiId) {
  const dc = DC();
  const mode=S.session?.mode||'normal';

  if(mode==='basic') {
    const basicRoles={
      gpt: `당신은 환자 데이터 분석 전담자입니다.
【역할 제약】의료적 판단·약물 추천·진단명 제시 금지. 데이터 패턴만 도출.
【할 일】
1. 패턴 분석: 구체적 수치 필수 (예: "기압 저하 시 NRS +2.1점, n=8")
2. 상관관계: 확률/비율 포함 (예: "스트레스 있는 날 70% 두통")
3. 약물 반응도: 복용 후 NRS 변화, 반응시간
4. 추세: 월별/주별 변화율
【형식】## 📊 데이터 분석 (GPT) 헤딩 아래 각 항목 불릿. 데이터 5건 미만이면 "데이터 부족" 명시.`,

      perp: `당신은 의료 근거 검색 전담자입니다.
【역할 제약】의료적 판단·권고 금지. 객관적 근거(가이드라인·논문·통계)만 제공.
【할 일】
1. 최신 임상 가이드라인 (출처+년도 필수)
2. 관련 논문/메타분석 (최근 3년 우선)
3. 약물/치료 효과 통계 (효과율, 95% CI 등)
4. 임신 관련 안전성 정보 (해당 시)
【형식】## 📚 근거 검색 (Perplexity) 헤딩 아래 각 항목 불릿+출처. 불확실하면 "정보 부족" 명시.`,

      claude: `당신은 주치의(attending physician)입니다.
【역할】GPT의 환자 데이터 분석과 Perplexity의 외부 근거를 종합하여 최종 임상 판단과 액션 플랜을 도출하세요.
【주의】
- 데이터↔근거 충돌 시 명시적 언급 ("데이터는 A를 시사하지만, 가이드라인은 B를 권고")
- 환자 특수성(임신 준비, 만성 질환 등) 반드시 고려
- 모호함 피하고 구체적 액션으로 마무리
- 자기 역할·직책 재진술 금지. 환자 설명용 문장은 별도 최종 요약 단계에서만 생성되므로 여기선 금지.
【형식】
## 🏥 최종 판단 & 액션 플랜 (Claude)
**상황 요약** → **임상 판단** (근거 1~2문장) → **권장 액션** (1순위/2순위/금기) → **모니터링 포인트**`,
    };
    return `${dc.user} ${dc.label} 기본 협진 — ${AI_DEFS[aiId].name}\n${basicRoles[aiId]||basicRoles.claude}`;
  }

  if(mode==='debate') {
    const teams=S.session?.debateTeams||{};
    const roleDescs={
      pro: '찬성 측 — "맞다" 근거 수집·주장',
      con: '반대 측 — "아니다" 근거 수집·반박',
      neutral: '중도 측 — 양측 장단점 균형 평가, 제3의 시각·조건부 합의점 도출',
      judge: '심판 — 논거 강도 평가, 과단정 체크, 잠정 결론, SSOT 위반 여부',
      fact: '정보수집 — 인용 수치/문헌/가이드라인 검증, 출처 명시',
    };
    const role=teams[aiId]||'neutral';
    return `${dc.user} ${dc.label} 디베이트 (대상: ${dc.user}) — ${AI_DEFS[aiId].name} 역할: ${roleDescs[role]||'분석'}.
${_CONCISE} 근거 기반. 감정적 주장 금지.`;
  }

  const role = dc.aiRoles[aiId] || 'AI 분석';
  return `${dc.user} ${dc.label} 협진 AI (대상 환자: ${dc.user}) — ${AI_DEFS[aiId].name} 역할: ${role}.
${_CONCISE}`;
}

// Non-streaming fallback (used by summary, price update, etc.)
async function callAI(aiId, system, user, source) {
  return await callAIStream(aiId, system, user, ()=>{}, undefined, source);
}

// Streaming AI call — onChunk(accumulatedText) called on each chunk
async function callAIStream(aiId, system, user, onChunk, signal, source) {
  const key=S.keys[aiId]; const model=S.models[aiId]||DEFAULT_MODELS[aiId];
  if(!key) throw new Error(`${AI_DEFS[aiId]?.name} API 키 미설정. 🔑 설정에서 입력하세요.`);

  if(aiId==='claude') {
    const r=await fetchWithRetry('https://api.anthropic.com/v1/messages',{method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model,max_tokens:6000,stream:true,system,messages:[{role:'user',content:user}]}),signal});
    if(!r.ok){const d=await r.json();throw new Error('Claude: '+(d.error?.message||r.status));}
    let text='',inT=0,outT=0;
    const reader=r.body.getReader();const dec=new TextDecoder();let buf='';
    while(true){
      const{done,value}=await reader.read();if(done)break;
      buf+=dec.decode(value,{stream:true});
      const lines=buf.split('\n');buf=lines.pop()||'';
      for(const line of lines){
        if(!line.startsWith('data: '))continue;
        try{const ev=JSON.parse(line.slice(6));
          if(ev.type==='content_block_delta'&&ev.delta?.text){text+=ev.delta.text;onChunk(text);}
          if(ev.type==='message_delta'&&ev.usage){outT=ev.usage.output_tokens||0;}
          if(ev.type==='message_start'&&ev.message?.usage){inT=ev.message.usage.input_tokens||0;}
        }catch(e){}
      }
    }
    recordUsage(aiId,model,inT,outT,source);
    return text;
  }

  if(aiId==='gpt') {
    const r=await fetchWithRetry('https://api.openai.com/v1/chat/completions',{method:'POST',
      headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},
      body:JSON.stringify({model,max_completion_tokens:4000,stream:true,stream_options:{include_usage:true},
        messages:[{role:'system',content:system},{role:'user',content:user}]}),signal});
    if(!r.ok){const d=await r.json();throw new Error('GPT: '+(d.error?.message||r.status));}
    let text='',inT=0,outT=0;
    const reader=r.body.getReader();const dec=new TextDecoder();let buf='';
    while(true){
      const{done,value}=await reader.read();if(done)break;
      buf+=dec.decode(value,{stream:true});
      const lines=buf.split('\n');buf=lines.pop()||'';
      for(const line of lines){
        if(!line.startsWith('data: ')||line==='data: [DONE]')continue;
        try{const ev=JSON.parse(line.slice(6));
          if(ev.choices?.[0]?.delta?.content){text+=ev.choices[0].delta.content;onChunk(text);}
          if(ev.usage){inT=ev.usage.prompt_tokens||0;outT=ev.usage.completion_tokens||0;}
        }catch(e){}
      }
    }
    // 남은 버퍼 처리
    if(buf.trim()){for(const line of buf.split('\n')){if(!line.startsWith('data: ')||line==='data: [DONE]')continue;try{const ev=JSON.parse(line.slice(6));if(ev.usage){inT=ev.usage.prompt_tokens||0;outT=ev.usage.completion_tokens||0;}}catch(e){}}}
    recordUsage(aiId,model,inT,outT,source);
    return text;
  }

  if(aiId==='gemini') {
    const r=await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`,
      {method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({system_instruction:{parts:[{text:system}]},contents:[{parts:[{text:user}]}],generationConfig:{maxOutputTokens:8192}}),signal});
    if(!r.ok){const d=await r.json();throw new Error('Gemini: '+(d.error?.message||r.status));}
    let text='',inT=0,outT=0;
    const reader=r.body.getReader();const dec=new TextDecoder();let buf='';
    while(true){
      const{done,value}=await reader.read();if(done)break;
      buf+=dec.decode(value,{stream:true});
      const lines=buf.split('\n');buf=lines.pop()||'';
      for(const line of lines){
        if(!line.startsWith('data: '))continue;
        try{const ev=JSON.parse(line.slice(6));
          const parts=ev.candidates?.[0]?.content?.parts||[];
          const chunk=parts.filter(p=>p.text&&!p.thought).map(p=>p.text).join('');
          if(chunk){text+=chunk;onChunk(text);}
          if(ev.usageMetadata){inT=ev.usageMetadata.promptTokenCount||0;outT=ev.usageMetadata.candidatesTokenCount||0;}
        }catch(e){}
      }
    }
    recordUsage(aiId,model,inT,outT,source);
    return text;
  }

  if(aiId==='perp') {
    const r=await fetchWithRetry('https://api.perplexity.ai/chat/completions',{method:'POST',
      headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},
      body:JSON.stringify({model,max_tokens:4000,stream:true,stream_options:{include_usage:true},
        messages:[{role:'system',content:system},{role:'user',content:user}]}),signal});
    if(!r.ok){const d=await r.json();throw new Error('Perplexity: '+(d.error?.message||r.status));}
    let text='',inT=0,outT=0;
    const reader=r.body.getReader();const dec=new TextDecoder();let buf='';
    while(true){
      const{done,value}=await reader.read();if(done)break;
      buf+=dec.decode(value,{stream:true});
      const lines=buf.split('\n');buf=lines.pop()||'';
      for(const line of lines){
        if(!line.startsWith('data: ')||line==='data: [DONE]')continue;
        try{const ev=JSON.parse(line.slice(6));
          if(ev.choices?.[0]?.delta?.content){text+=ev.choices[0].delta.content;onChunk(text);}
          if(ev.usage){inT=ev.usage.prompt_tokens||0;outT=ev.usage.completion_tokens||0;}
        }catch(e){}
      }
    }
    // 남은 버퍼 처리
    if(buf.trim()){for(const line of buf.split('\n')){if(!line.startsWith('data: ')||line==='data: [DONE]')continue;try{const ev=JSON.parse(line.slice(6));if(ev.usage){inT=ev.usage.prompt_tokens||0;outT=ev.usage.completion_tokens||0;}}catch(e){}}}
    recordUsage(aiId,model,inT,outT,source);
    return text;
  }
  // Grok (xAI — OpenAI 호환)
  if(aiId==='grok') {
    const r=await fetchWithRetry('https://api.x.ai/v1/chat/completions',{method:'POST',
      headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},
      body:JSON.stringify({model,max_tokens:4000,stream:true,stream_options:{include_usage:true},
        messages:[{role:'system',content:system},{role:'user',content:user}]}),signal});
    if(!r.ok){const d=await r.json();throw new Error('Grok: '+(d.error?.message||r.status));}
    let text='',inT=0,outT=0;
    const reader=r.body.getReader();const dec=new TextDecoder();let buf='';
    while(true){
      const{done,value}=await reader.read();if(done)break;
      buf+=dec.decode(value,{stream:true});
      const lines=buf.split('\n');buf=lines.pop()||'';
      for(const line of lines){
        if(!line.startsWith('data: ')||line==='data: [DONE]')continue;
        try{const ev=JSON.parse(line.slice(6));
          if(ev.choices?.[0]?.delta?.content){text+=ev.choices[0].delta.content;onChunk(text);}
          if(ev.usage){inT=ev.usage.prompt_tokens||0;outT=ev.usage.completion_tokens||0;}
          if(ev.x_groq?.usage){inT=ev.x_groq.usage.prompt_tokens||inT;outT=ev.x_groq.usage.completion_tokens||outT;}
        }catch(e){}
      }
    }
    // 스트림 종료 후 남은 버퍼 처리 (usage가 마지막 청크에 올 수 있음)
    if(buf.trim()){
      for(const line of buf.split('\n')){
        if(!line.startsWith('data: ')||line==='data: [DONE]')continue;
        try{const ev=JSON.parse(line.slice(6));
          if(ev.choices?.[0]?.delta?.content){text+=ev.choices[0].delta.content;onChunk(text);}
          if(ev.usage){inT=ev.usage.prompt_tokens||0;outT=ev.usage.completion_tokens||0;}
          if(ev.x_groq?.usage){inT=ev.x_groq.usage.prompt_tokens||inT;outT=ev.x_groq.usage.completion_tokens||outT;}
        }catch(e){}
      }
    }
    // Fallback: usage가 0이면 텍스트 길이로 추정 (Grok 4 등 usage 미반환 시)
    if(!inT&&!outT&&text.length>0){inT=Math.round((system.length+user.length)/4);outT=Math.round(text.length/4);}
    recordUsage(aiId,model,inT,outT,source);
    return text;
  }

  throw new Error('알 수 없는 AI: '+aiId);
}

// Continue session — allow follow-up questions in same session
function continueSession() {
  if(!S.session) return;
  S.session.currentRound=S.session.rounds.length;
  S.session.summary=null;
  S.session._continued=true;
  S._dirty=true;
  switchView('session');
  showToast('🔄 이어서 질문할 수 있습니다. 질문 수정 후 다음 라운드를 시작하세요.');
}

// Continue from history — start new session with previous context
function continueFromHistory(idx) {
  const sessions=DM()?.sessions||[];
  const prev=sessions[idx];
  if(!prev) return;
  S.viewingHistIdx=null;
  const prevCtx=`[이전 세션 맥락 — ${prev.date}]\n질문: ${prev.question}\n${prev.summary?'요약: '+prev.summary.session_summary+'\n권고: '+(prev.summary.final_recommendation||''):''}`;
  startNewSession(`${prevCtx}\n\n[후속 질문]\n`);
}

function getFullContext(question) {
  const m=DM(); const accum=m.accumulated;
  const q=(question||'').toLowerCase();
  const _selectRelevant=(arr,max=10)=>{
    if(arr.length<=max) return arr;
    const scored=arr.map((x,i)=>({x,score:(q&&x.toLowerCase().split(/\s+/).some(w=>w.length>1&&q.includes(w))?1000000:0)+i}));
    scored.sort((a,b)=>b.score-a.score);
    return scored.slice(0,max).map(s=>s.x);
  };
  const accumText=[
    accum.established_consensus.length?'■ 확립된 합의 ('+accum.established_consensus.length+'건 중 최근/관련)\n'+_selectRelevant(accum.established_consensus).map(x=>'- '+x).join('\n'):'',
    accum.discarded_hypotheses.length?'■ 폐기된 가설\n'+_selectRelevant(accum.discarded_hypotheses,5).map(x=>'- '+x).join('\n'):'',
    accum.unresolved_issues.length?'■ 미해결 쟁점\n'+_selectRelevant(accum.unresolved_issues).map(x=>'- '+x).join('\n'):'',
  ].filter(Boolean).join('\n\n');
  const condContext=getConditionsContext();
  const crossCtx=getCrossDomainContext();
  const fileCtx=getFileContext();
  // 나이 동적 치환 + 공유 프로필 포함
  let patientCtx=m.patient_context||'';
  patientCtx=_replaceDynamicAge(patientCtx);
  // 대상 환자 명시 헤더 (Perplexity 등이 대상 혼동하지 않도록)
  const dc=DC();
  const targetHeader=`[★ 대상 환자 / Target Patient]\n이번 세션의 대상은 오직 "${dc.user}" 뿐입니다. ${dc.label} 도메인 기준 분석을 작성하세요.\n다른 가족 구성원 정보는 상호작용/영향 참고용이며, 주 분석 대상이 아닙니다.\n`;
  const sharedProfile=typeof getSharedProfileText==='function'?`\n\n[가족 구성원 참고 (상호작용/영향 맥락 — 주 분석 대상 아님)]\n${getSharedProfileText()}`:'';
  // 최근 검진 결과 요약 자동 포함
  const checkupCtx=typeof _getRecentCheckupContext==='function'?_getRecentCheckupContext():'';
  const contextSection=`${targetHeader}\n[컨텍스트 / SSOT — ${dc.user} ${dc.label}]\n${patientCtx}${sharedProfile}${condContext}${crossCtx}${fileCtx}${checkupCtx}${accumText?'\n\n[누적 지식]\n'+accumText:''}`;
  const logSummary=getRecentLogSummary();
  return contextSection+(logSummary?'\n\n'+logSummary:'');
}

// 생년월일 기반 나이 동적 치환
const _USER_BIRTHDAYS={'오랑이':'1997-07-29','붕쌤':'1988-01-27'};
function _replaceDynamicAge(text) {
  const today=new Date(kstToday()+'T00:00:00');
  Object.entries(_USER_BIRTHDAYS).forEach(([name,bd])=>{
    const b=new Date(bd+'T00:00:00');
    let age=today.getFullYear()-b.getFullYear();
    if(today.getMonth()<b.getMonth()||(today.getMonth()===b.getMonth()&&today.getDate()<b.getDate())) age--;
    // "28세" → 실제 나이로, "여성 28세" → "여성 29세" 등
    text=text.replace(new RegExp('('+name+'[^\\n]{0,20}?)(\\d{2,3})세','g'),(match,prefix,oldAge)=>prefix+age+'세');
  });
  return text;
}

function buildUserPrompt(aiId, roundNum) {
  const sess = S.session;
  const contextFull = getFullContext(sess.question);
  const question = sess.question || '(질문 미입력)';
  const dc = DC();
  const targetLine = `[대상 환자] ${dc.user} · ${dc.label}`;

  if (roundNum === 1) {
    const mode=sess.mode||'normal';
    // 디베이트 R1 심판: 다른 AI 답변을 포함하여 판정 (심판 AI 동적 결정)
    const judgeId=getDebateJudgeId();
    if(mode==='debate'&&aiId===judgeId&&sess.rounds[0]?.answers) {
      const others=Object.entries(AI_DEFS)
        .filter(([id])=>id!==judgeId&&sess.rounds[0].answers[id])
        .map(([id,def])=>`▶ [${def.name} — ${getDebateRole(id,sess.debateReversed)}]\n${sess.rounds[0].answers[id]}`).join('\n\n---\n\n');
      return `${contextFull}\n\n${targetLine}\n\n[오늘 세션 질문]\n${question}\n\n[각 측 주장]\n${others}\n\n위 주장들을 심판으로서 평가하세요. 논거 강도, 근거 타당성, 과단정 여부를 체크하고 잠정 결론을 내려주세요. (대상 환자: ${dc.user})`;
    }
    return `${contextFull}\n\n${targetLine}\n\n[오늘 세션 질문]\n${question}\n\n${dc.user} 기준으로 분석해 주세요. 서론·인사·자기 역할 재진술 금지. 바로 핵심. 항목당 1문장. 최종 정리·환자 설명용 문장은 별도 요약 단계에서 하므로 여기선 분석 데이터만.`;
  }
  const prevRound = sess.rounds[roundNum-2];
  const myPrev = prevRound?.answers?.[aiId] || '';
  const others = Object.entries(AI_DEFS)
    .filter(([id])=>id!==aiId && prevRound?.answers?.[id])
    .map(([id,def])=>`▶ [${def.name}]\n${prevRound.answers[id]}`).join('\n\n---\n\n');

  return `${contextFull}\n\n${targetLine}\n\n[질문]\n${question}\n\n[내 R${roundNum-1} 답변]\n${myPrev}\n\n[다른 AI R${roundNum-1}]\n${others}\n\n서론·자기소개·환자 설명용 문장 금지. 대상 환자는 ${dc.user}. 바로 답변:\n1. [흡수] 타 AI의 맞는 점 한줄\n2. [반박] 틀린 점·보완 한줄씩\n3. [수정 분석] 핵심만\n4. [인사이트 한줄]`;
}
