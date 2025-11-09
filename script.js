// =====================
// 백수생존기 · script.js
// =====================
'use strict';

const formatMoney = n => '₩' + Math.floor(n).toLocaleString('ko-KR');
const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
const rand = (min,max)=>Math.floor(Math.random()*(max-min+1))+min;

const DEFAULT = {
  day: 1,
  hour: 8,
  energy: 70,
  mood: 70,
  money: 120,
  skills: { code: 0, design: 0, talk: 0 },
  place: 'home',
  rentDueDay: 7,
  rentAmount: 200,
  owned: [],
  achievements: [],
  gameOver: false,
};

let state = JSON.parse(localStorage.getItem('baeksu-v1')||'null') || structuredClone(DEFAULT);

const logEl = document.querySelector('#log-output');
const dayEl = document.querySelector('#st-day');
const timeEl = document.querySelector('#st-time');
const moneyEl = document.querySelector('#st-money');
const energyBar = document.querySelector('#bar-energy');
const moodBar = document.querySelector('#bar-mood');
const skillCode = document.querySelector('#sk-code');
const skillDesign = document.querySelector('#sk-design');
const skillTalk = document.querySelector('#sk-talk');
const achList = document.querySelector('#achievements');
const rentDayEl = document.querySelector('#rent-day');
const rentAmountEl = document.querySelector('#rent-amount');
const actionList = document.querySelector('#action-list');
const placeList = document.querySelector('#place-list');
const sceneTitle = document.querySelector('#scene-title');
const sceneActions = document.querySelector('#scene-actions');
const modal = document.querySelector('#modal');
const modalBody = document.querySelector('#modal-body');

// Accessibility helper: focus ring on keyboard nav
document.addEventListener('keydown', e=>{
  if(e.key==='Tab'){ document.body.classList.add('kb'); }
});

function save(){
  localStorage.setItem('baeksu-v1', JSON.stringify(state));
  toast('💾 저장했습니다.');
}
function load(){
  const data = localStorage.getItem('baeksu-v1');
  if(!data){ toast('저장된 데이터가 없습니다.'); return; }
  state = JSON.parse(data);
  renderAll();
  toast('불러왔습니다.');
}
function reset(){
  state = structuredClone(DEFAULT);
  renderAll();
  toast('새 게임 시작.');
}

document.querySelector('#btn-save').addEventListener('click', save);
document.querySelector('#btn-load').addEventListener('click', load);
document.querySelector('#btn-reset').addEventListener('click', reset);

// Help modal
document.querySelector('#btn-help').addEventListener('click', openHelp);
function openHelp(){
  modalBody.innerHTML = `
    <p><b>게임 목표</b>: 시간·에너지·기분을 관리하며 스킬을 키우고 돈을 벌어 <b>월세</b>를 제때 납부하세요.</p>
    <div class="q">
      <b>기본 조작</b>
      <ul>
        <li>왼쪽 패널: <b>행동</b>·<b>도시</b> 버튼</li>
        <li>가운데: 현재 장소와 추가 액션</li>
        <li>오른쪽: 업적과 고지서(월세 일정)</li>
        <li><b>저장/불러오기/새로 시작</b>은 상단 바</li>
        <li><b>단축키</b>: Ctrl/Cmd+S 저장</li>
      </ul>
    </div>
    <div class="q">
      <b>진행</b>
      <ul>
        <li>장소 이동은 <b>1시간</b>과 약간의 에너지 소모</li>
        <li>도서관/카페: 스킬 상승</li>
        <li>PC방/편의점: 수입 또는 휴식</li>
        <li>회사: <b>채용 공고 탐색 → 면접</b> 미니게임</li>
        <li><b>7일마다</b> 월세 자동 청구. 부족하면 게임 오버</li>
      </ul>
    </div>
    <div class="q">
      <b>팁</b>
      <ul>
        <li>에너지가 낮으면 효율↓. 원룸에서 잠/요리로 회복</li>
        <li>스킬이 오를수록 면접 합격 확률과 보상이 ↑</li>
        <li>랜덤 이벤트가 매일 발생할 수 있음</li>
      </ul>
    </div>`;
  document.querySelector('#modal-title').textContent = '게임 방법';
  if(typeof modal.showModal==='function') modal.showModal(); else alert('게임 방법 표시');
}

function toast(msg){
  log(`<b>${msg}</b>`);
}

function log(text){
  const time = `${state.day}일차 ${formatHour(state.hour)}`;
  const div = document.createElement('div');
  div.className = 'entry';
  div.innerHTML = `<small>${time}</small> ${text}`;
  logEl.prepend(div);
}
function formatHour(h){
  const hh = String(h).padStart(2,'0');
  return `${hh}:00`;
}

function advance(hours){
  state.hour += hours;
  while(state.hour>=24){
    state.hour -= 24;
    state.day += 1;
    dailyTick();
  }
  checkBills();
}

function dailyTick(){
  // Daily mood drift
  state.mood = clamp(state.mood + rand(-4, 3), 0, 100);
  // Random event daily
  if(Math.random()<0.35) randomEvent();
}

function pay(amount){
  state.money = Math.max(0, state.money - amount);
}

function earn(amount){
  state.money += amount;
}

function gainSkill(key, amt){
  state.skills[key] = Math.min(100, state.skills[key] + amt);
}

function useEnergy(amt){ state.energy = clamp(state.energy - amt, 0, 100); }
function gainEnergy(amt){ state.energy = clamp(state.energy + amt, 0, 100); }
function changeMood(amt){ state.mood = clamp(state.mood + amt, 0, 100); }

function checkBills(){
  if(state.day === state.rentDueDay){
    if(state.money >= state.rentAmount){
      pay(state.rentAmount);
      toast(`🏠 월세 ${formatMoney(state.rentAmount)} 지불 완료.`);
      state.rentDueDay += 7;
      maybeAchieve('성실한 납부자');
    }else{
      gameOver('월세를 내지 못했습니다. 주인에게 쫓겨났습니다.');
    }
  }
}

function gameOver(reason){
  state.gameOver = true;
  log(`💀 <b>게임 오버</b> — ${reason}`);
  alert('게임 오버: ' + reason);
}

function renderStats(){
  dayEl.textContent = `${state.day}일차`;
  timeEl.textContent = formatHour(state.hour);
  moneyEl.textContent = formatMoney(state.money);
  energyBar.value = state.energy;
  moodBar.value = state.mood;
  skillCode.textContent = state.skills.code;
  skillDesign.textContent = state.skills.design;
  skillTalk.textContent = state.skills.talk;
  rentDayEl.textContent = `${state.rentDueDay}일차`;
  rentAmountEl.textContent = formatMoney(state.rentAmount);
}

function renderActions(){
  const actions = getAvailableActions();
  actionList.innerHTML='';
  actions.forEach(a=>{
    const btn = document.createElement('button');
    btn.className='btn';
    btn.textContent = a.title;
    btn.title = a.desc;
    btn.addEventListener('click', ()=>a.run());
    actionList.appendChild(btn);
  });
}

function renderPlaces(){
  const places = [
    {id:'home', title:'원룸', emoji:'🛏️'},
    {id:'library', title:'도서관', emoji:'📚'},
    {id:'pc', title:'PC방', emoji:'🖥️'},
    {id:'convenience', title:'편의점', emoji:'🛒'},
    {id:'cafe', title:'카페', emoji:'☕'},
    {id:'company', title:'회사', emoji:'🏢'},
  ];
  placeList.innerHTML='';
  places.forEach(p=>{
    const btn = document.createElement('button');
    btn.className='btn';
    btn.textContent = `${p.emoji} ${p.title}`;
    btn.ariaLabel = `${p.title}로 이동`;
    btn.addEventListener('click', ()=>goPlace(p.id));
    placeList.appendChild(btn);
  });
}

function goPlace(id){
  if(state.gameOver) return;
  if(state.place===id){ toast('이미 그곳에 있음.'); return; }
  // moving cost/time
  advance(1);
  useEnergy(5);
  changeMood(rand(-2,1));
  state.place = id;
  log(`🚶 ${placeName(id)}(으)로 이동했다.`);
  renderScene();
  renderStats();
}

function placeName(id){
  switch(id){
    case 'home': return '원룸';
    case 'library': return '도서관';
    case 'pc': return 'PC방';
    case 'convenience': return '편의점';
    case 'cafe': return '카페';
    case 'company': return '회사';
    default: return id;
  }
}

function renderScene(){
  const id = state.place;
  sceneTitle.textContent = placeName(id);
  sceneActions.innerHTML='';

  const add = (label, fn, tip='')=>{
    const li=document.createElement('li');
    const b=document.createElement('button');
    b.className='btn';
    b.textContent=label;
    b.title=tip;
    b.addEventListener('click', fn);
    li.appendChild(b); sceneActions.appendChild(li);
  };

  if(id==='home'){
    add('자기(3h)',''.constructor.bind(null), ''); // placeholder to keep order
    sceneActions.lastChild.querySelector('button').addEventListener('click', ()=>{
      if(state.energy>=95){ toast('더 자도 무의미하다.'); return; }
      advance(3); gainEnergy(30); changeMood(5);
      log('🛏️ 푹 잤다. 에너지+30, 기분+5');
      renderStats();
      randomEvent();
      maybeAchieve('낮잠의 달인');
    });
    add('SNS 둘러보기(1h)', ()=>{
      advance(1); changeMood(rand(-3,3)); useEnergy(2);
      log('📱 SNS를 훑었다. 시간은 사라지고 감정은 요동쳤다.');
      renderStats();
    });
    add('간단요리(1h, ₩8)', ()=>{
      if(state.money<8){ toast('재료비가 부족하다.'); return; }
      advance(1); pay(8); gainEnergy(15); changeMood(3);
      log('🍳 계란밥을 해먹었다. 에너지+15, 기분+3, ₩8 지출.');
      renderStats();
      maybeAchieve('자취요리 1급');
    });
  }else if(id==='library'){
    add('코딩 공부(2h)', ()=>{
      advance(2); useEnergy(18); changeMood(-2); gainSkill('code', rand(3,6));
      log('🧑‍💻 코딩 공부를 했다. 코딩 스킬이 올랐다.');
      renderStats();
      maybeAchieve('키보드의 시인');
    });
    add('디자인 연구(2h)', ()=>{
      advance(2); useEnergy(18); changeMood(-1); gainSkill('design', rand(3,6));
      log('🎨 디자인 사례를 분석했다. 디자인 스킬이 올랐다.');
      renderStats();
    });
  }else if(id==='pc'){
    add('프리랜서 디버깅(3h, 수입)', ()=>{
      const skill = state.skills.code;
      advance(3); useEnergy(25); changeMood(-2);
      const pay = Math.max(18, Math.round(skill*0.9) + rand(5, 20));
      earn(pay);
      log(`🖥️ 버그 사냥 완료. 수입 ${formatMoney(pay)}.`);
      renderStats();
      randomEvent();
    });
    add('게임으로 휴식(1h, ₩5)', ()=>{
      if(state.money<5){ toast('돈이 부족하다.'); return; }
      advance(1); pay(5); changeMood(8); useEnergy(5);
      log('🎮 랭겜으로 스트레스를 풀었다. 기분+8.');
      renderStats();
    });
  }else if(id==='convenience'){
    add('알바(3h, 수입)', ()=>{
      advance(3); useEnergy(28); changeMood(-4);
      const base = 20 + Math.floor(state.skills.talk*0.6);
      const tip = Math.random()<0.25 ? rand(5,15) : 0;
      earn(base+tip);
      log(`🛒 시급을 받았다. 수입 ${formatMoney(base+tip)}.`);
      renderStats();
    });
    add('도시락 구매(₩6)', ()=>{
      if(state.money<6){ toast('돈이 부족하다.'); return; }
      pay(6); gainEnergy(12); changeMood(2);
      log('🍱 편도시락 섭취. 에너지+12, 기분+2.');
      renderStats();
    });
  }else if(id==='cafe'){
    add('카공(2h, ₩6)', ()=>{
      if(state.money<6){ toast('돈이 부족하다.'); return; }
      advance(2); pay(6); useEnergy(12);
      const focus = rand(0,1) ? 'code':'design';
      gainSkill(focus, rand(2,5));
      log('☕ 카페인과 함께 집중했다. 스킬이 약간 올랐다.');
      renderStats();
    });
    add('잡담으로 네트워킹(1h, ₩4)', ()=>{
      if(state.money<4){ toast('돈이 부족하다.'); return; }
      advance(1); pay(4); changeMood(6); gainSkill('talk', rand(2,4));
      log('🗣️ 사람들과 수다를 떨며 인맥을 넓혔다.');
      renderStats();
    });
  }else if(id==='company'){
    add('채용 공고 탐색(1h)', ()=>{
      advance(1); useEnergy(5);
      const job = pickJob();
      openInterview(job);
    });
  }
}

function getAvailableActions(){
  // Global quick actions
  return [
    { title:'시간 떼우기(1h)', desc:'아무것도 안 하기', run: ()=>{ advance(1); changeMood(-1); useEnergy(1); log('⏳ 시간을 보냈다.'); renderStats(); }},
    { title:'스트레칭(0h)', desc:'기분 소폭 상승', run: ()=>{ changeMood(2); log('🧘 가볍게 몸을 풀었다.'); renderStats(); }},
    { title:'라면(₩4)', desc:'에너지 회복', run: ()=>{ if(state.money<4){toast('돈이 부족하다.');return;} pay(4); gainEnergy(10); changeMood(1); log('🍜 라면으로 버티기.'); renderStats(); }},
    { title:'이력서 다듬기(1h)', desc:'커뮤니케이션 향상', run: ()=>{ advance(1); useEnergy(6); gainSkill('talk', rand(1,3)); log('📄 이력서를 조금 다듬었다.'); renderStats(); }},
  ];
}

function randomEvent(){
  const events = [
    { text:'이웃이 남는 김치를 나눠줬다. 에너지+8', fn:()=>gainEnergy(8) },
    { text:'노트북 팬이 비명을 질렀다. 기분-6, 수리비 ₩10', fn:()=>{ changeMood(-6); pay(10);} },
    { text:'귀여운 고양이 영상을 봤다. 기분+6', fn:()=>changeMood(6) },
    { text:'버스 놓침. 기분-3', fn:()=>changeMood(-3) },
    { text:'알 수 없는 영감이 스쳤다. 코딩+3', fn:()=>gainSkill('code',3) },
  ];
  const e = events[rand(0,events.length-1)];
  e.fn(); log('🎲 ' + e.text); renderStats();
}

function pickJob(){
  // Jobs scale with skills threshold
  const jobs = [
    { id:'jnr-dev', title:'주니어 프론트엔드', pay:[120,180], req:{code:20, design:10, talk:10} },
    { id:'ux-assist', title:'UX 보조', pay:[90,150], req:{code:8, design:20, talk:18} },
    { id:'qa', title:'QA 테스터', pay:[80,130], req:{code:10, design:0, talk:8} },
    { id:'support', title:'고객지원', pay:[70,120], req:{code:0, design:0, talk:25} },
    { id:'freelance', title:'프리랜서 계약', pay:[150,260], req:{code:35, design:20, talk:22} },
  ];
  // Offer one random entry the player roughly qualifies for
  const pool = jobs.filter(j=> state.skills.code>=j.req.code*0.6 || state.skills.design>=j.req.design*0.6 || state.skills.talk>=j.req.talk*0.6 );
  const job = (pool.length? pool : jobs)[rand(0, (pool.length? pool : jobs).length-1)];
  return job;
}

function openInterview(job){
  // Build simple 3Q interview mini-game
  const qs = [
    {q:'마감과 완성도 중 하나만 고르라면?', a:[{t:'마감', v:+1},{t:'완성도', v:0}]},
    {q:'버그를 찾았다. 팀원이 만든 코드다. 어떻게 할까?', a:[{t:'정중히 PR로 제안', v:+1},{t:'일단 고쳐서 올림', v:0}]},
    {q:'의견 충돌이 생겼다.', a:[{t:'데이터로 설득', v:+1},{t:'감으로 간다', v:0}]},
  ];

  modalBody.innerHTML = `<p><b>${job.title}</b> 면접을 보러 갔다.</p>`;
  let score = 0;
  qs.forEach((item,i)=>{
    const box = document.createElement('div');
    box.className='q';
    box.innerHTML = `<b>Q${i+1}.</b> ${item.q}`;
    const row = document.createElement('div'); row.className='opts';
    item.a.forEach(opt=>{
      const b=document.createElement('button'); b.className='btn'; b.textContent=opt.t;
      b.addEventListener('click',()=>{ score+=opt.v; b.disabled=true; b.classList.add('disabled'); });
      row.appendChild(b);
    });
    box.appendChild(row);
    modalBody.appendChild(box);
  });

  const submit = document.createElement('button');
  submit.className='btn';
  submit.textContent='제출';
  submit.addEventListener('click', ()=>{
    modal.close();
    advance(2); useEnergy(12);
    const skillScore = Math.floor((state.skills.code+state.skills.design+state.skills.talk)/12);
    const total = score + skillScore + rand(-2,2);
    const need = Math.floor((job.req.code+job.req.design+job.req.talk)/15) + 2;
    if(total >= need){
      const pay = rand(job.pay[0], job.pay[1]);
      earn(pay);
      changeMood(6);
      log(`✅ ${job.title} 면접 합격! 축하 보너스 ${formatMoney(pay)}.`);
      maybeAchieve('첫 합격');
    }else{
      changeMood(-6);
      log(`❌ ${job.title} 면접 탈락. 더 갈고 닦자.`);
    }
    renderStats();
  });
  modalBody.appendChild(submit);

  if(typeof modal.showModal==='function') modal.showModal();
  else alert('면접 UI를 표시합니다.');
}

function maybeAchieve(name){
  if(!state.achievements.includes(name)){
    state.achievements.push(name);
    renderAch();
    log(`🏅 업적 달성: <b>${name}</b>`);
  }
}
function renderAch(){
  achList.innerHTML='';
  state.achievements.forEach(n=>{
    const li=document.createElement('li');
    li.innerHTML = `<span class="medal">🏅</span> ${n}`;
    achList.appendChild(li);
  });
}

// Boot
function renderAll(){
  renderStats();
  renderActions();
  renderPlaces();
  renderScene();
  renderAch();
}
renderAll();

// Simple keyboard shortcuts
document.addEventListener('keydown', e=>{
  if(e.key.toLowerCase()==='s' && (e.ctrlKey || e.metaKey)){ e.preventDefault(); save(); }
});
