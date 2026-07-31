(function(){
  function isIos(){
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
  }
  function isStandalone(){
    return window.navigator.standalone===true || window.matchMedia('(display-mode: standalone)').matches;
  }

  const style = document.createElement('style');
  style.textContent = `
    .itut-overlay{
      position:fixed;inset:0;z-index:9999;
      background:rgba(8,14,11,.6);
      backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
      display:flex;align-items:flex-end;justify-content:center;
      opacity:0;pointer-events:none;transition:opacity .25s ease;
      padding:0 14px;
    }
    .itut-overlay.open{opacity:1;pointer-events:auto}
    .itut-panel{
      width:100%;max-width:420px;margin-bottom:0;
      background:rgba(36,56,46,.72);
      backdrop-filter:blur(22px) saturate(160%);-webkit-backdrop-filter:blur(22px) saturate(160%);
      border:1px solid rgba(243,239,228,.14);
      border-bottom:none;
      border-radius:22px 22px 0 0;
      padding:22px 20px calc(22px + env(safe-area-inset-bottom));
      color:#f3efe4;
      font-family:'Fredoka',system-ui,sans-serif;
      transform:translateY(16px);transition:transform .28s cubic-bezier(.22,1,.36,1);
      box-shadow:0 -12px 40px rgba(0,0,0,.35);
    }
    .itut-overlay.open .itut-panel{transform:translateY(0)}
    .itut-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
    .itut-title{font-size:1.08rem;font-weight:700}
    .itut-close{
      width:30px;height:30px;border-radius:999px;border:none;
      background:rgba(255,255,255,.1);color:#f3efe4;font-size:1rem;
      cursor:pointer;display:flex;align-items:center;justify-content:center;
    }
    .itut-step{display:flex;gap:12px;align-items:flex-start;margin-bottom:14px}
    .itut-badge{
      flex-shrink:0;width:34px;height:34px;border-radius:10px;
      background:rgba(233,196,106,.14);border:1px solid rgba(233,196,106,.3);
      display:flex;align-items:center;justify-content:center;
    }
    .itut-step p{font-size:.9rem;line-height:1.45;color:#e5e1d4;padding-top:5px}
    .itut-step b{color:#f3efe4}
    .itut-footer-note{font-size:.78rem;color:#b7c2ba;margin:6px 0 16px;line-height:1.5}
    .itut-btn{
      width:100%;border:none;border-radius:14px;padding:13px 16px;
      background:#e9c46a;color:#3a2c10;font-family:'Fredoka',system-ui,sans-serif;
      font-weight:600;font-size:1rem;cursor:pointer;
    }
    .itut-btn:active{transform:scale(.98)}
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.className = 'itut-overlay';
  overlay.innerHTML = `
    <div class="itut-panel" role="dialog" aria-label="Installer Games Room">
      <div class="itut-head">
        <div class="itut-title">📲 Ajouter à l'écran d'accueil</div>
        <button class="itut-close" aria-label="Fermer">✕</button>
      </div>
      <div class="itut-step">
        <div class="itut-badge">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#e9c46a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><rect x="4" y="14" width="16" height="7" rx="2"/>
          </svg>
        </div>
        <p>Dans Safari, appuie sur le bouton <b>Partager</b> (en bas de l'écran, ou en haut sur iPad).</p>
      </div>
      <div class="itut-step">
        <div class="itut-badge">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#e9c46a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/>
          </svg>
        </div>
        <p>Fais défiler la liste et choisis <b>« Sur l'écran d'accueil »</b>.</p>
      </div>
      <div class="itut-step">
        <div class="itut-badge">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#e9c46a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        </div>
        <p>Appuie sur <b>« Ajouter »</b> en haut à droite. L'icône Games Room apparaît sur ton écran d'accueil !</p>
      </div>
      <p class="itut-footer-note">Tu retrouveras ce tuto à tout moment depuis le menu ☰ de l'accueil.</p>
      <button class="itut-btn">J'ai compris</button>
    </div>
  `;
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(overlay));
  if(document.body) document.body.appendChild(overlay);

  function hide(){
    overlay.classList.remove('open');
    try{ localStorage.setItem('gym-install-tut-seen','1'); }catch(e){}
  }
  overlay.addEventListener('click', e => { if(e.target===overlay) hide(); });
  overlay.querySelector('.itut-close').addEventListener('click', hide);
  overlay.querySelector('.itut-btn').addEventListener('click', hide);

  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    deferredPrompt = e;
  });

  window.showInstallTutorial = function(){
    if(deferredPrompt){
      const promptEvent = deferredPrompt;
      deferredPrompt = null;
      promptEvent.prompt();
      return;
    }
    overlay.classList.add('open');
  };

  if(isIos() && !isStandalone()){
    let seen = false;
    try{ seen = localStorage.getItem('gym-install-tut-seen')==='1'; }catch(e){}
    if(!seen){
      setTimeout(()=>{ window.showInstallTutorial(); }, 1000);
    }
  }
})();
