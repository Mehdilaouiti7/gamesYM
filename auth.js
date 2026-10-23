/* Games Room — Google sign-in gate.
   Talks to Supabase Auth (GoTrue) over REST, no external library, so the login
   can't be broken by a CDN. Implicit flow: after Google, the session comes back
   in the URL hash; we store it and refresh it when it expires.

   The wall is OFF by default (ENFORCE = false): the login works and can be
   tested on the real site, but nobody is blocked. Set ENFORCE = true (one line)
   to require sign-in on every page that includes this script.
   You can preview the wall yourself by adding ?gate=1 to any page's URL. */
window.GYMAuth = (function(){
  var URL_ = 'https://mqfyuprpztiyfpleannt.supabase.co';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZnl1cHJwenRpeWZwbGVhbm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMjg3MjUsImV4cCI6MjA4OTkwNDcyNX0.4Fvc-fNlwhVp0HvOEL-Z92i9W4YvVSAgen0ihBzlGOk';
  var LS = 'gym-auth';
  var ENFORCE = false;   // ← flip to true to turn the wall on everywhere

  var session = null, user = null, listeners = [];
  function enforced(){
    try{ if(/[?&]gate=1/.test(location.search)) return true; if(localStorage.getItem('gym-gate') === 'on') return true; }catch(e){}
    return ENFORCE;
  }
  function load(){ try{ return JSON.parse(localStorage.getItem(LS) || 'null'); }catch(e){ return null; } }
  function store(s){ try{ s ? localStorage.setItem(LS, JSON.stringify(s)) : localStorage.removeItem(LS); }catch(e){} }

  // After Google, Supabase redirects back with #access_token=…&refresh_token=…
  function captureHash(){
    if(!location.hash || location.hash.indexOf('access_token=') < 0) return null;
    var h = {};
    location.hash.slice(1).split('&').forEach(function(kv){ var p = kv.split('='); h[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); });
    if(!h.access_token) return null;
    try{ history.replaceState(null, '', location.pathname + location.search); }catch(e){}
    return { access_token: h.access_token, refresh_token: h.refresh_token || '', expires_at: Date.now() + (parseInt(h.expires_in || '3600', 10) * 1000) };
  }
  function authErrorInHash(){
    return location.hash && location.hash.indexOf('error') >= 0 ? decodeURIComponent((location.hash.match(/error_description=([^&]*)/) || [])[1] || 'Connexion refusée') : null;
  }
  async function fetchUser(token){
    try{ var r = await fetch(URL_ + '/auth/v1/user', { headers: { apikey: KEY, Authorization: 'Bearer ' + token } }); return r.ok ? await r.json() : null; }catch(e){ return null; }
  }
  async function refresh(rt){
    if(!rt) return null;
    try{
      var r = await fetch(URL_ + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: rt }) });
      if(!r.ok) return null; var d = await r.json();
      return { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + ((d.expires_in || 3600) * 1000) };
    }catch(e){ return null; }
  }

  function signInGoogle(){
    var ret = location.origin + location.pathname + location.search;
    location.href = URL_ + '/auth/v1/authorize?provider=google&redirect_to=' + encodeURIComponent(ret);
  }
  function signOut(){ store(null); session = null; user = null; try{ localStorage.removeItem('gym-gate'); }catch(e){} location.href = 'index.html'; }

  // Pre-fill the profile from the Google name the first time.
  function prefillFromGoogle(u){
    try{
      if(!localStorage.getItem('gym-player-name')){
        var m = u.user_metadata || {};
        var n = (m.full_name || m.name || (u.email || '').split('@')[0] || '').split(' ')[0].trim();
        if(n) localStorage.setItem('gym-player-name', n);
      }
    }catch(e){}
  }

  /* ---------- the gate overlay ---------- */
  var el = null;
  function ensureEl(){
    if(el) return el;
    var css = document.createElement('style');
    css.textContent = ''
      + '#gym-gate{position:fixed;inset:0;z-index:2147483646;background:#14171a;color:#f3efe4;'
      + "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:28px;text-align:center;font-family:'Fredoka',system-ui,sans-serif}"
      + '#gym-gate img{width:120px;height:120px;border-radius:28px;box-shadow:0 12px 34px rgba(0,0,0,.5)}'
      + '#gym-gate h2{font-size:24px;font-weight:700}'
      + '#gym-gate p{font-size:14.5px;color:#9a9d9a;max-width:300px;line-height:1.5}'
      + '#gym-gate .gbtn{display:flex;align-items:center;gap:12px;background:#fff;color:#1f1f1f;border:none;border-radius:14px;'
      + "padding:13px 20px;font:600 16px 'Fredoka',sans-serif;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.3)}"
      + '#gym-gate .gbtn:active{transform:scale(.97)}'
      + '#gym-gate .spin{width:34px;height:34px;border-radius:50%;border:4px solid rgba(243,239,228,.2);border-top-color:#e9c46a;animation:gymspin .8s linear infinite}'
      + '@keyframes gymspin{to{transform:rotate(360deg)}}'
      + '#gym-gate small{font-size:12.5px;color:#6f7471}#gym-gate small a{color:#8e918f}'
      + '#gym-gate .err{color:#ff8a7a;font-size:13.5px;min-height:16px}';
    document.head && document.head.appendChild(css);
    el = document.createElement('div');
    el.id = 'gym-gate';
    (document.body || document.documentElement).appendChild(el);
    return el;
  }
  function showLoading(){
    ensureEl().innerHTML = '<div class="spin"></div>';
    el.style.display = 'flex';
  }
  function showLogin(err){
    var G = '<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M45 24c0-1.6-.1-3.1-.4-4.5H24v9h11.8c-.5 2.8-2 5.1-4.4 6.7v5.6h7.1C42.7 37 45 31 45 24z"/><path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.3l-7.1-5.6c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.2H4.3v5.8C7.9 40.9 15.4 46 24 46z"/><path fill="#FBBC05" d="M11.6 28c-.5-1.3-.7-2.7-.7-4s.3-2.7.7-4v-5.8H4.3C2.8 17.1 2 20.4 2 24s.8 6.9 2.3 9.8l7.3-5.8z"/><path fill="#EA4335" d="M24 10.8c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.1 30 2 24 2 15.4 2 7.9 7.1 4.3 14.2l7.3 5.8C13.3 14.7 18.2 10.8 24 10.8z"/></svg>';
    ensureEl().innerHTML =
      '<img src="icons/gr-180.png" alt="">' +
      '<h2>Games Room</h2>' +
      '<p>Connecte-toi pour jouer avec tes amis et retrouver ton profil partout.</p>' +
      '<button class="gbtn" id="gym-gbtn">' + G + 'Continuer avec Google</button>' +
      '<div class="err">' + (err ? err : '') + '</div>' +
      '<small>En continuant, tu acceptes notre <a href="confidentialite.html">politique de confidentialité</a>.</small>';
    el.style.display = 'flex';
    var b = document.getElementById('gym-gbtn'); if(b) b.onclick = signInGoogle;
  }
  function hide(){ if(el) el.style.display = 'none'; }

  /* ---------- boot ---------- */
  var hashErr = authErrorInHash();
  if(enforced() && !load() && !captureHashPeek()) showLoading(); // cover content early while we check
  function captureHashPeek(){ return location.hash && location.hash.indexOf('access_token=') >= 0; }

  async function init(){
    var s = captureHash() || load();
    if(s && s.expires_at && s.expires_at < Date.now() + 60000){ var ns = await refresh(s.refresh_token); s = ns || null; }
    if(s){
      var u = await fetchUser(s.access_token);
      if(u){ session = s; user = u; store(s); prefillFromGoogle(u); if(enforced()) hide(); listeners.forEach(function(f){ try{ f(u); }catch(e){} }); return true; }
    }
    session = null; user = null; store(null);
    if(enforced()) showLogin(hashErr); else if(el) hide();
    listeners.forEach(function(f){ try{ f(null); }catch(e){} });
    return false;
  }
  var ready = init();

  return {
    ready: ready,
    signInGoogle: signInGoogle,
    signOut: signOut,
    user: function(){ return user; },
    token: function(){ return session && session.access_token; },
    isLoggedIn: function(){ return !!user; },
    enforced: enforced,
    onChange: function(f){ listeners.push(f); }
  };
})();
