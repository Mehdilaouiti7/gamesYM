/* Games Room — lightweight consent / cookie notice.
   Today the app only uses local storage (names, preferences) and stores game
   data so people can play together — no ads, no third-party tracking yet.
   This banner informs the player once and records the acknowledgement.
   It is written so that, the day ads are added, personalised ads can be gated
   on `localStorage['gr-consent'] === 'all'`. */
(function(){
  var KEY = 'gr-consent';
  var choice = null;
  try{ choice = localStorage.getItem(KEY); }catch(e){}
  if(choice) return;

  function save(v){ try{ localStorage.setItem(KEY, v); }catch(e){} if(bar) bar.remove(); }

  var css = ''
    + '.gr-consent{position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;'
    + 'max-width:440px;margin:0 auto;background:#1d2024;color:#f3efe4;border:1px solid rgba(243,239,228,.14);'
    + 'border-radius:16px;padding:14px 16px;box-shadow:0 12px 34px rgba(0,0,0,.5);'
    + "font-family:'Fredoka',system-ui,sans-serif;font-size:13.5px;line-height:1.5}"
    + '.gr-consent p{margin:0 0 10px}'
    + '.gr-consent a{color:#e9c46a;text-decoration:none}'
    + '.gr-consent .row{display:flex;gap:8px}'
    + '.gr-consent button{flex:1;border:none;border-radius:999px;padding:10px;font:600 14px inherit;cursor:pointer}'
    + '.gr-consent .ok{background:#f3efe4;color:#14171a}'
    + '.gr-consent .min{background:#2c3136;color:#f3efe4}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var bar = document.createElement('div');
  bar.className = 'gr-consent';
  bar.setAttribute('role', 'dialog');
  bar.setAttribute('aria-label', 'Confidentialité');
  bar.innerHTML =
    '<p>On garde ton prénom et tes préférences sur ton téléphone, et on stocke les parties pour jouer ensemble. '
    + 'Pas de pub ni de pistage. <a href="confidentialite.html">En savoir plus</a>.</p>'
    + '<div class="row">'
    + '<button class="min" id="gr-c-min">Le minimum</button>'
    + '<button class="ok" id="gr-c-ok">OK, j’ai compris</button>'
    + '</div>';
  document.body.appendChild(bar);
  document.getElementById('gr-c-ok').onclick = function(){ save('all'); };
  document.getElementById('gr-c-min').onclick = function(){ save('min'); };
})();
