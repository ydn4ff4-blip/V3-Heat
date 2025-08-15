
/* Heat Pro — FINAL v3 */
const $ = (q)=>document.querySelector(q);
const state = {
  heat:0, dead:0, bb:0, deadStreak:0,
  spinNum:0, startTs:Date.now(),
  lastEnd: Date.now(),
  window: [],   // slide window entries {w,t,s,ts}
  history: [],  // full history
  cfg:{
    warm:4, hot:7, cold:12, bbMin:2, tBig:5, winLen:70, haptics:true, showBet:true
  },
  cur:{w:0,t:0,s:0}
};

const els = {
  kHeat: $("#kHeat"), kDead: $("#kDead"), kBB: $("#kBB"), kDeadStreak: $("#kDeadStreak"),
  heatLabel: $("#heatLabel"), betGuide: $("#betGuide"), statusBadge: $("#statusBadge"),
  sumWR: $("#sumWR"), sumAT: $("#sumAT"), sumSF: $("#sumSF"), logBody: $("#logTable tbody"),
  spinTimer: $("#spinTimer"), winLen: $("#winLen"),
  modal: $("#settingsModal"),
  setWarm: $("#setWarm"), setHot: $("#setHot"), setCold: $("#setCold"), setBB: $("#setBB"), setTB: $("#setTB"),
  setWinLen: $("#setWinLen"), setHaptics: $("#setHaptics"), setBetGuide: $("#setBetGuide"),
};

function beep(){ try{ if(!state.cfg.haptics) return; const ctx=new (window.AudioContext||window.webkitAudioContext)(); const o=ctx.createOscillator(); const g=ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type="sine"; o.frequency.value=880; o.start(); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+0.15); setTimeout(()=>{o.stop();ctx.close()},180);}catch(e){} }
function save(){ localStorage.setItem("heatpro_v3", JSON.stringify({state,cfg:state.cfg})); }
function load(){ const s=localStorage.getItem("heatpro_v3"); if(s){ try{ const d=JSON.parse(s); Object.assign(state,d.state||{}); Object.assign(state.cfg,d.cfg||{}); }catch(e){} } }
load();

function updateUI(){
  els.kHeat.textContent = state.heat;
  els.kDead.textContent = state.dead;
  els.kBB.textContent = state.bb;
  els.kDeadStreak.textContent = state.deadStreak;

  // label + bet guide
  let label="COLD", cls="cold", guide="Turun Bet ⬇️";
  if(state.heat>=state.cfg.hot) { label="HOT"; cls="hot"; guide="Naik Bet ⬆️"; }
  else if(state.heat>=state.cfg.warm) { label="WARM"; cls="warm"; guide="Tahan Bet ➖"; }
  els.heatLabel.textContent = label;
  els.heatLabel.className = "bigText "+cls;
  els.betGuide.textContent = state.cfg.showBet? guide : "";
  els.betGuide.style.display = state.cfg.showBet? "block":"none";

  // summary for sliding window
  const win = state.window.slice(-state.cfg.winLen);
  const wins = win.reduce((a,b)=>a+(b.w?1:0),0);
  const sumT = win.reduce((a,b)=>a+b.t,0);
  const scat = win.reduce((a,b)=>a+(b.s?1:0),0);
  const wr = win.length? Math.round((wins/win.length)*100):0;
  const at = win.length? (sumT/win.length).toFixed(1):"0.0";
  const sf = win.length? Math.round((scat/win.length)*100):0;
  els.sumWR.textContent = wr+"%"; els.sumAT.textContent = at; els.sumSF.textContent = sf+"%";
  els.winLen.textContent = state.cfg.winLen;

  // table
  els.logBody.innerHTML = "";
  state.history.slice(-200).reverse().forEach((it,i)=>{
    const tr=document.createElement("tr");
    tr.innerHTML = `<td>${it.i}</td><td>${it.w?1:0}</td><td>${it.t}</td><td>${it.s?1:0}</td><td>${new Date(it.ts).toLocaleTimeString()}</td>`;
    els.logBody.appendChild(tr);
  });

  save();
}
function resetSpinTemp(){ state.cur={w:0,t:0,s:0}; }
function ensureBB(isWin){ // Back-to-back tracker
  if(isWin){ state.bb++; state.deadStreak=0; } else { state.bb=0; state.deadStreak++; }
}
function addEntry(isEnd=false){
  const entry = { i: ++state.spinNum, w: !!state.cur.w, t: state.cur.t, s: !!state.cur.s, ts: Date.now() };
  state.window.push(entry); state.history.push(entry);
  state.lastEnd = Date.now();
  if(isEnd) resetSpinTemp();
}
function setStatus(ok){ els.statusBadge.textContent = ok? "OK":"PAUSED"; els.statusBadge.className="badge "+(ok?"ok":"cold"); }

// Buttons
$("#bWin").onclick = ()=>{ state.cur.w=1; state.heat++; ensureBB(true); beep(); updateUI(); };
$("#bLose").onclick = ()=>{ state.cur.w=0; state.dead++; ensureBB(false); updateUI(); };
$("#bTumble").onclick = ()=>{ state.cur.t++; state.heat+=0.5; updateUI(); };
$("#bScatter").onclick = ()=>{ state.cur.s=1; state.heat+=2; updateUI(); };
$("#bMulti").onclick = ()=>{ state.heat+=1; updateUI(); };
$("#bFSProfit").onclick = ()=>{ state.heat+=3; updateUI(); };
$("#bFSLoss").onclick = ()=>{ state.dead+=2; updateUI(); };
$("#bEnd").onclick = ()=>{ addEntry(true); updateUI(); };

$("#bReset2").onclick = ()=>{ state.heat=0; state.dead=0; state.bb=0; state.deadStreak=0; state.spinNum=0; state.window=[]; state.history=[]; resetSpinTemp(); updateUI(); };
$("#bClear").onclick = ()=>{ state.window=[]; state.history=[]; updateUI(); };

$("#btnUndo").onclick = ()=>{
  const last = state.history.pop();
  if(last){
    // rough revert (best-effort)
    state.spinNum=Math.max(0,state.spinNum-1);
    state.window = state.window.slice(0,-1);
    // no exact reverse of heat/dead; user can adjust
    updateUI();
  }
};

$("#btnReset").onclick = ()=>$("#bReset2").click();

function dl(name, data, type="text/plain"){
  const blob=new Blob([data],{type}); const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=name; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),500);
}
$("#btnCSV").onclick = ()=>{
  const rows = [["#", "W","T","S","Time"]].concat(state.history.map(e=>[e.i,e.w?1:0,e.t,e.s?1:0,new Date(e.ts).toISOString()]));
  dl("heatpro_history.csv", rows.map(r=>r.join(",")).join("\n"), "text/csv");
};
$("#btnJSON").onclick = ()=>{ dl("heatpro_history.json", JSON.stringify(state,null,2), "application/json"); };

// Settings
$("#btnSettings").onclick = ()=>{ els.setWarm.value=state.cfg.warm; els.setHot.value=state.cfg.hot; els.setCold.value=state.cfg.cold; els.setBB.value=state.cfg.bbMin; els.setTB.value=state.cfg.tBig; els.setWinLen.value=state.cfg.winLen; els.setHaptics.checked=state.cfg.haptics; els.setBetGuide.checked=state.cfg.showBet; els.modal.style.display="flex"; };
$("#btnCloseSet").onclick = ()=> els.modal.style.display="none";
$("#btnSaveSet").onclick = ()=>{
  state.cfg.warm = +els.setWarm.value||state.cfg.warm;
  state.cfg.hot  = +els.setHot.value ||state.cfg.hot;
  state.cfg.cold = +els.setCold.value||state.cfg.cold;
  state.cfg.bbMin= +els.setBB.value  ||state.cfg.bbMin;
  state.cfg.tBig = +els.setTB.value  ||state.cfg.tBig;
  state.cfg.winLen=+els.setWinLen.value||state.cfg.winLen;
  state.cfg.haptics = !!els.setHaptics.checked;
  state.cfg.showBet = !!els.setBetGuide.checked;
  els.modal.style.display="none"; updateUI();
};

// Timer
setInterval(()=>{
  const secs = Math.floor((Date.now()-state.lastEnd)/1000);
  $("#spinTimer").textContent = `T:${secs}s`;
}, 1000);

// initial render
updateUI();

// PWA
if("serviceWorker" in navigator){ window.addEventListener("load", ()=>{ navigator.serviceWorker.register("./sw.js").catch(console.warn); }); }
