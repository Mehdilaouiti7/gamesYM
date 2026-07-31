window.GYMConnection = (function(){
  let banner = null;
  let consecutiveFailures = 0;
  const FAILURE_THRESHOLD = 2;

  function ensureBanner(){
    if(banner) return banner;
    banner = document.createElement('div');
    banner.id = 'gym-connection-banner';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9998;text-align:center;'+
      'padding:calc(8px + env(safe-area-inset-top)) 12px 8px;font-family:Fredoka,system-ui,sans-serif;font-size:.82rem;font-weight:600;'+
      'color:#3a2c10;background:linear-gradient(160deg,#f6c667,#e9c46a);'+
      'transform:translateY(-100%);transition:transform .25s ease;box-shadow:0 4px 14px rgba(0,0,0,.25);';
    document.body.appendChild(banner);
    return banner;
  }
  function show(text){
    const b = ensureBanner();
    b.textContent = text;
    requestAnimationFrame(()=> { b.style.transform = 'translateY(0)'; });
  }
  function hide(){
    if(!banner) return;
    banner.style.transform = 'translateY(-100%)';
  }
  function update(){
    if(!navigator.onLine){ show('🔌 Hors ligne — en attente du réseau…'); return; }
    if(consecutiveFailures >= FAILURE_THRESHOLD){ show('⏳ Reconnexion en cours…'); return; }
    hide();
  }
  function reportSuccess(){ consecutiveFailures = 0; update(); }
  function reportFailure(){ consecutiveFailures++; update(); }

  window.addEventListener('online', update);
  window.addEventListener('offline', update);

  return { reportSuccess, reportFailure };
})();
