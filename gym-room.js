/* Games Room — shared room lifecycle for group games.
   Handles create / join / waiting room / live sync / leaving, and saves every
   action with optimistic locking (state.rev) so several phones can act at the
   same moment without overwriting each other.

   Page contract (ids): create-name, create-avatar-row, btn-create, create-err,
   join-code, join-name, join-avatar-row, btn-join, join-err,
   wait-code, wait-hint, wait-players, wait-count, btn-start, wait-note,
   and screens screen-create / screen-join / screen-wait / screen-game / screen-end.

   GYMRoom.init({
     key, table, title, page, min, max,
     newState(st)        add game fields to a fresh waiting state (host is players[0])
     canStart(st)        '' when the host may start, else the reason shown on the button
     start(st)           mutate st to begin the game (status is set to 'playing' for you)
     renderWait(st)      optional extra rendering in the waiting room
     render(st)          draw the game; called on every update while playing / finished
     onJoin(st, idx)     optional: set up a newly joined player (e.g. team)
   })
*/
window.GYMRoom = (function(){
  const SB_URL = "https://mqfyuprpztiyfpleannt.supabase.co";
  const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZnl1cHJwenRpeWZwbGVhbm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMjg3MjUsImV4cCI6MjA4OTkwNDcyNX0.4Fvc-fNlwhVp0HvOEL-Z92i9W4YvVSAgen0ihBzlGOk";
  const HEADERS = { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY, "Content-Type": "application/json" };
  const $ = id => document.getElementById(id);
  const conn = ok => { if(window.GYMConnection) (ok ? window.GYMConnection.reportSuccess() : window.GYMConnection.reportFailure()); };

  let G = null;               // game definition
  const R = { code:null, me:null, state:null, busy:false };
  let pollTimer = null, lastScreen = null;

  /* ---------- storage ---------- */
  async function load(c){
    try{
      const r = await fetch(SB_URL+"/rest/v1/"+G.table+"?code=eq."+encodeURIComponent(c)+"&select=state", {headers:HEADERS});
      conn(r.ok); if(!r.ok) return null;
      const rows = await r.json();
      return rows.length ? rows[0].state : null;
    }catch(e){ conn(false); return null; }
  }
  async function insert(st){
    try{
      const r = await fetch(SB_URL+"/rest/v1/"+G.table, {
        method:"POST", headers:{...HEADERS, "Prefer":"return=minimal"},
        body: JSON.stringify({code:st.code, state:st, updated_at:new Date().toISOString()})
      });
      conn(r.ok || r.status===409);
      return r.ok ? 'ok' : (r.status===409 ? 'taken' : 'error');
    }catch(e){ conn(false); return 'error'; }
  }
  async function saveIfUnchanged(st, rev){
    try{
      const r = await fetch(SB_URL+"/rest/v1/"+G.table+"?code=eq."+encodeURIComponent(st.code)+"&state->>rev=eq."+rev, {
        method:"PATCH", headers:{...HEADERS, "Prefer":"return=representation"},
        body: JSON.stringify({state:st, updated_at:new Date().toISOString()})
      });
      conn(r.ok); if(!r.ok) return 'error';
      return (await r.json()).length ? 'ok' : 'conflict';
    }catch(e){ conn(false); return 'error'; }
  }
  // Read the latest state, apply fn, save only if nobody saved in between; retry otherwise.
  // fn returns false to leave the state untouched. Resolves to {st, changed} or null.
  async function mutate(c, fn){
    for(let attempt=0; attempt<12; attempt++){
      const st = await load(c);
      if(!st) return null;
      const rev = st.rev || 0;
      if(fn(st) === false) return {st, changed:false};
      st.rev = rev + 1;
      const res = await saveIfUnchanged(st, rev);
      if(res === 'ok') return {st, changed:true};
      if(res === 'error') return null;
      await new Promise(r => setTimeout(r, 60 + Math.random()*260));
    }
    return null;
  }

  /* ---------- helpers ---------- */
  function genCode(){
    const letters = "ABCDEFGHJKMNPQRSTUVWXYZ"; let c = "";
    for(let i=0;i<4;i++) c += letters[Math.floor(Math.random()*letters.length)];
    return c;
  }
  const roleKey = c => G.key+'-role-'+c;
  function saveRole(c, idx){ try{ localStorage.setItem(roleKey(c), String(idx)); }catch(e){} }
  function loadRole(c){ try{ const v = localStorage.getItem(roleKey(c)); return v===null ? null : parseInt(v,10); }catch(e){ return null; } }
  function esc(s){ return String(s).split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split('"').join('&quot;'); }
  function av(p){ return p && p.avatar ? p.avatar : '🙂'; }
  function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; } return a; }

  const SCREENS = ['create','join','wait','game','end'];
  function show(name){
    if(name==='home') name = 'create';
    SCREENS.forEach(s => { const el = $('screen-'+s); if(el) el.classList.toggle('hidden', s!==name); });
    lastScreen = name;
    window.GYMUI.screen(name);
  }

  /* ---------- create / join ---------- */
  let createPicker, joinPicker;
  async function create(){
    const name = $('create-name').value.trim() || "Joueur 1";
    window.GYMUI.rememberName($('create-name').value);
    $('btn-create').disabled = true; $('create-err').textContent = '';
    let st = null, res = 'taken';
    for(let i=0; i<5 && res==='taken'; i++){
      st = { v:1, rev:0, code:genCode(), status:'waiting', players:[{name, avatar:createPicker.get()}] };
      if(G.newState) G.newState(st);
      res = await insert(st);
    }
    $('btn-create').disabled = false;
    if(res!=='ok'){ $('create-err').textContent = "Connexion impossible. Vérifie ton réseau et réessaie."; return; }
    R.code = st.code; R.me = 0; R.state = st;
    saveRole(st.code, 0);
    if(window.GYMRecent) window.GYMRecent.record(G.key, st.code, G.title);
    enter();
  }
  async function join(){
    const c = $('join-code').value.trim().toUpperCase();
    if(!/^[A-Z]{4}$/.test(c)){ $('join-err').textContent = "Le code fait 4 lettres."; return; }
    $('join-err').textContent = ''; $('btn-join').disabled = true;
    let st = await load(c);
    if(!st){ $('join-err').textContent = "Partie introuvable. Vérifie le code."; $('btn-join').disabled = false; return; }
    const existing = loadRole(c);
    if(existing!==null && st.players[existing]){
      R.code = c; R.me = existing; R.state = st; $('btn-join').disabled = false;
      if(window.GYMRecent) window.GYMRecent.record(G.key, c, G.title);
      enter(); return;
    }
    const name = $('join-name').value.trim() || "Joueur";
    window.GYMUI.rememberName($('join-name').value);
    let idx = -1, err = '';
    const res = await mutate(c, s => {
      if(s.status!=='waiting'){ err = "Cette partie a déjà commencé."; return false; }
      if(s.players.length >= G.max){ err = "Cette partie est complète."; return false; }
      idx = s.players.length;
      s.players.push({name, avatar:joinPicker.get()});
      if(G.onJoin) G.onJoin(s, idx);
    });
    $('btn-join').disabled = false;
    if(!res){ $('join-err').textContent = "Erreur d'enregistrement. Réessaie."; return; }
    if(!res.changed){ $('join-err').textContent = err; return; }
    R.code = c; R.me = idx; R.state = res.st;
    saveRole(c, idx);
    if(window.GYMRecent) window.GYMRecent.record(G.key, c, G.title);
    enter();
  }
  function enter(){
    if(pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(refresh, 2000);
    window.GYMRealtime.subscribe(SB_URL, SB_KEY, G.table, R.code, st => apply(st));
    apply(R.state, true);
  }
  async function refresh(){
    if(R.busy || !R.code) return;
    const st = await load(R.code);
    if(st) apply(st);
  }
  // Ignore stale states (older revision) that arrive after a newer one.
  function apply(st, force){
    if(!st || (R.busy && !force)) return;
    if(!force && R.state && (st.rev||0) < (R.state.rev||0)) return;
    R.state = st;
    if(st.status==='waiting'){ show('wait'); renderWait(); return; }
    if(st.status==='playing'){ window.GYMLeaveGuard.enable(); if(lastScreen!=='game') show('game'); }
    if(st.status==='finished'){
      window.GYMLeaveGuard.disable();
      if(window.GYMRecent) window.GYMRecent.remove(G.key, R.code);
      if(lastScreen!=='end') show('end');
    }
    G.render(st);
  }
  // Run one game action against the latest saved state, then redraw.
  // The move is first applied to a local copy and shown at once (unless it depends
  // on chance), then saved for real; a refused save puts the previous state back.
  async function act(fn){
    if(R.busy) return null;
    R.busy = true;
    const before = R.state;
    if(before){
      const draft = JSON.parse(JSON.stringify(before)), rnd = Math.random;
      let ok = true;
      Math.random = () => { throw new Error('chance'); };
      try{ if(fn(draft) === false) ok = false; }catch(e){ ok = false; }
      Math.random = rnd;
      if(ok) apply(draft, true);
    }
    const res = await mutate(R.code, fn);
    R.busy = false;
    if(res) apply(res.st, true);
    else if(before) apply(before, true);
    return res;
  }

  /* ---------- waiting room ---------- */
  function renderWait(){
    const st = R.state, isHost = R.me===0;
    window.GYMUI.renderCode('wait-code', R.code, $('wait-hint'));
    $('wait-count').textContent = st.players.length + ' / ' + G.max;
    $('wait-players').innerHTML = st.players.map((p, i) =>
      '<span class="'+(i===0?'host':'')+(i===R.me?' me':'')+'">'+av(p)+' '+esc(p.name)+(i===R.me?' (toi)':'')+(i===0?' · hôte':'')+'</span>'
    ).join('') + (st.players.length < G.max ? '<span class="more">+ qui d\'autre ?</span>' : '');
    if(G.renderWait) G.renderWait(st);
    const why = st.players.length < G.min ? 'Il faut au moins ' + G.min + ' joueurs' : (G.canStart ? G.canStart(st) : '');
    $('btn-start').classList.toggle('hidden', !isHost);
    $('btn-start').disabled = !!why;
    $('btn-start').textContent = why || (G.startLabel ? G.startLabel(st) : 'Lancer la partie · ' + st.players.length + ' joueurs');
    $('wait-note').classList.toggle('hidden', isHost);
    $('wait-note').textContent = 'En attente que ' + st.players[0].name + ' lance la partie…';
  }
  async function startGame(){
    if(R.me!==0) return;
    await act(st => {
      if(st.status!=='waiting' || st.players.length < G.min) return false;
      if(G.canStart && G.canStart(st)) return false;
      st.status = 'playing';
      G.start(st);
    });
  }
  function leave(confirmText){
    if(!confirm(confirmText || "Quitter la partie ? Tu ne pourras plus la reprendre.")) return;
    if(pollTimer){ clearInterval(pollTimer); pollTimer = null; }
    window.GYMRealtime.unsubscribe(SB_URL, SB_KEY);
    window.GYMLeaveGuard.disable();
    if(window.GYMRecent) window.GYMRecent.remove(G.key, R.code);
    location.href = G.page;
  }

  function init(def){
    G = def;
    createPicker = window.GYMAvatarPicker.render('create-avatar-row');
    joinPicker = window.GYMAvatarPicker.render('join-avatar-row');
    window.GYMUI.prefillNames(['create-name','join-name']);
    $('btn-create').onclick = create;
    $('btn-join').onclick = join;
    $('btn-start').onclick = startGame;
    $('join-code').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g,''); });
    document.addEventListener('keydown', e => {
      if(e.key!=='Enter') return;
      if(lastScreen==='create' && document.activeElement && document.activeElement.id==='create-name') create();
      if(lastScreen==='join' && document.activeElement && /join-/.test(document.activeElement.id)) join();
    });
    show('create');
    const q = (new URLSearchParams(location.search).get('code')||'').toUpperCase();
    if(/^[A-Z]{4}$/.test(q)){
      show('join'); $('join-code').value = q;
      if(loadRole(q)!==null) join();
    }
  }

  return {
    init, show, act, leave, esc, av, shuffle,
    copy: () => window.GYMUI.copyLink(R.code, $('wait-hint')),
    share: () => window.GYMUI.share(R.code, G.title, $('wait-hint')),
    get me(){ return R.me; }, get state(){ return R.state; }, get code(){ return R.code; }, get busy(){ return R.busy; }
  };
})();
