/* Games Room — shared mobile UI helpers (see gym-ui.css). */
window.GYMUI = (function(){
  function $(id){ return document.getElementById(id); }

  // Rules sheet: any [data-rules] element opens #rules-sheet; scrim / [data-rules-close] closes it.
  function openRules(){
    const s = $('rules-sheet'); if(!s) return;
    s.classList.add('open'); s.setAttribute('aria-hidden','false');
  }
  function closeRules(){
    const s = $('rules-sheet'); if(!s) return;
    s.classList.remove('open'); s.setAttribute('aria-hidden','true');
  }
  document.addEventListener('click', function(e){
    if(e.target.closest('[data-rules]')){ e.preventDefault(); openRules(); }
    else if(e.target.closest('[data-rules-close]')){ e.preventDefault(); closeRules(); }
  });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeRules(); });

  // Remember which screen is visible so CSS can theme the page (e.g. end screen background).
  function screen(name){
    if(document.body.getAttribute('data-screen')===name) return;
    document.body.setAttribute('data-screen', name);
    window.scrollTo(0,0);
  }

  function link(code){
    return window.GYMGameLink ? window.GYMGameLink.build(code) : location.href;
  }
  function copyLink(code, hintEl){
    const done = function(){
      if(hintEl){
        const prev = hintEl.getAttribute('data-default') || hintEl.textContent;
        hintEl.setAttribute('data-default', prev);
        hintEl.textContent = 'Lien copié ✓';
        setTimeout(function(){ hintEl.textContent = prev; }, 1600);
      }
      if(window.GYMFeedback) window.GYMFeedback.ok();
    };
    if(navigator.clipboard) navigator.clipboard.writeText(link(code)).then(done, function(){});
  }
  function share(code, gameName, hintEl){
    if(!navigator.share){ copyLink(code, hintEl); return; }
    navigator.share({
      title:'Games Room',
      text:'Rejoins ma partie de '+gameName+' sur Games Room ! Code : '+code,
      url: link(code)
    }).catch(function(){});
  }
  // Big letter tiles for the game code; tapping copies the invite link.
  function renderCode(el, code, hintEl){
    if(typeof el==='string') el = $(el);
    if(!el) return;
    // Redraw only when the code changes, so the letters' pop-in animation doesn't replay on every refresh.
    const txt = String(code||'····');
    if(el.dataset.code !== txt){
      el.dataset.code = txt;
      el.innerHTML = txt.split('').map(function(c){ return '<span>'+c+'</span>'; }).join('');
    }
    el.onclick = function(){ copyLink(code, hintEl); };
    el.setAttribute('aria-label', 'Code '+code+' — toucher pour copier le lien');
  }

  // Name remembered across games (shown on the home screen greeting too).
  function rememberName(n){ n = (n||'').trim(); if(n) try{ localStorage.setItem('gym-player-name', n); }catch(e){} }
  function savedName(){ try{ return localStorage.getItem('gym-player-name') || ''; }catch(e){ return ''; } }
  function prefillNames(ids){
    const n = savedName(); if(!n) return;
    ids.forEach(function(id){ const el = $(id); if(el && !el.value) el.value = n; });
  }

  return { openRules, closeRules, screen, copyLink, share, renderCode, rememberName, savedName, prefillNames };
})();
