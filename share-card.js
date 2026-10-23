/* Games Room — shareable end-of-game card.
   Draws a branded square image of the result and hands it to the phone's share
   sheet (WhatsApp, Insta…). Falls back to downloading the image + opening WhatsApp
   with a text when the file-share API is missing.

   Usage from a game's renderEnd:
     GYMShare.set({
       game:'Skonopoly', emoji:'🎲', color:'#0a4f9c',
       winner:'Yasmine', sub:'remporte la partie',
       podium:[{name, avatar, score, me}],   // already sorted, winner first
       scoreLabel:'DT'                        // '' when there is no score
     });
   and a button: <button onclick="GYMShare.now()">Partager</button>
*/
window.GYMShare = (function(){
  const SITE = 'games-room.tn';
  let opts = null, logo = null;

  // Preload the app icon so it is ready when the player reaches the end screen.
  try{ logo = new Image(); logo.src = 'icons/gr-180.png'; }catch(e){ logo = null; }

  function set(o){ opts = o; }

  function roundRect(g, x, y, w, h, r){
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  // Shrink the font until the text fits the given width.
  function fit(g, text, weight, start, max){
    let s = start;
    do { g.font = weight + ' ' + s + "px 'Fredoka', system-ui, sans-serif"; s -= 4; }
    while(g.measureText(text).width > max && s > 24);
    return g.font;
  }

  function draw(o){
    const W = 1080, H = 1080, cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');

    // Background: the card-table green.
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#24382e'); bg.addColorStop(1, '#13201a');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);

    g.textAlign = 'center'; g.textBaseline = 'alphabetic';

    // Logo.
    if(logo && logo.complete && logo.naturalWidth){
      const s = 150; roundRect(g, (W - s) / 2, 56, s, s, 34); g.save(); g.clip();
      g.drawImage(logo, (W - s) / 2, 56, s, s); g.restore();
    }

    // Game chip.
    g.font = "600 40px 'Fredoka', system-ui, sans-serif";
    const label = (o.emoji ? o.emoji + '  ' : '') + o.game;
    const cw = g.measureText(label).width + 68, cx = (W - cw) / 2;
    g.fillStyle = o.color || '#0a4f9c'; roundRect(g, cx, 236, cw, 76, 38); g.fill();
    g.fillStyle = '#fff'; g.fillText(label, W / 2, 288);

    // Trophy + winner.
    g.font = '120px system-ui'; g.fillText('🏆', W / 2, 470);
    g.fillStyle = '#f3efe4';
    g.font = fit(g, o.winner || '', '700', 108, W - 160);
    g.fillText(o.winner || '', W / 2, 592);
    if(o.sub){
      g.fillStyle = '#e9c46a';
      g.font = "600 44px 'Fredoka', system-ui, sans-serif";
      g.fillText(o.sub, W / 2, 656);
    }

    // Podium (up to 3).
    const pod = (o.podium || []).slice(0, 3);
    const medal = ['🥇', '🥈', '🥉'];
    const rh = 78, gap = 14, rx = 150, rw = W - 300;
    let y = 702;
    pod.forEach((p, i) => {
      g.fillStyle = i === 0 ? 'rgba(233,196,106,.18)' : 'rgba(243,239,228,.08)';
      roundRect(g, rx, y, rw, rh, 26); g.fill();
      g.textAlign = 'left'; g.textBaseline = 'middle';
      g.font = '46px system-ui'; g.fillText(medal[i] || (i + 1), rx + 26, y + rh / 2 + 2);
      g.font = '44px system-ui'; g.fillText(p.avatar || '🙂', rx + 92, y + rh / 2 + 2);
      const hasScore = p.score != null && o.scoreLabel !== undefined;
      let scoreW = 0, scoreText = '';
      if(hasScore){
        scoreText = fmt(p.score) + (o.scoreLabel ? ' ' + o.scoreLabel : '');
        g.font = "700 40px 'Space Mono', monospace"; scoreW = g.measureText(scoreText).width;
      }
      // The name sits between the avatar and the (right-aligned) score, and is cut if too long.
      const nmx = rx + 156, maxN = rw - 156 - 26 - (hasScore ? scoreW + 34 : 20);
      const weight = p.me ? '700 ' : '500 ';
      let nm = (p.name || '') + (p.me ? ' (toi)' : ''), fs = 42;
      g.font = weight + "42px 'Fredoka', system-ui, sans-serif";
      while(g.measureText(nm).width > maxN && fs > 26){ fs -= 2; g.font = weight + fs + "px 'Fredoka', system-ui, sans-serif"; }
      while(nm.length > 1 && g.measureText(nm + '…').width > maxN){ nm = nm.slice(0, -1); }
      if(nm !== ((p.name || '') + (p.me ? ' (toi)' : ''))) nm += '…';
      g.fillStyle = '#f3efe4'; g.fillText(nm, nmx, y + rh / 2 + 2);
      if(hasScore){
        g.textAlign = 'right'; g.fillStyle = '#e9c46a';
        g.font = "700 40px 'Space Mono', monospace";
        g.fillText(scoreText, rx + rw - 26, y + rh / 2 + 2);
        g.textAlign = 'left';
      }
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      y += rh + gap;
    });

    // Footer.
    g.fillStyle = '#e9c46a';
    g.font = "600 40px 'Fredoka', system-ui, sans-serif";
    g.fillText('🎮  Joue avec nous sur ' + SITE, W / 2, H - 46);
    return cv;
  }
  function fmt(n){ return typeof n === 'number' ? String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : n; }

  function canvasBlob(cv){ return new Promise(r => cv.toBlob(r, 'image/png')); }

  async function now(){
    if(!opts) return;
    const o = opts;
    try{ if(document.fonts && document.fonts.ready) await document.fonts.ready; }catch(e){}
    const cv = draw(o);
    const text = (o.emoji ? o.emoji + ' ' : '') + o.game + ' — 🏆 ' + o.winner + ' ' + (o.sub || 'gagne') + ' !\nJoue avec nous sur https://' + SITE;
    let blob = null;
    try{ blob = await canvasBlob(cv); }catch(e){}
    if(blob && navigator.canShare){
      const file = new File([blob], 'games-room.png', { type: 'image/png' });
      if(navigator.canShare({ files: [file] })){
        try{ await navigator.share({ files: [file], text }); return; }
        catch(e){ if(e && e.name === 'AbortError') return; }
      }
    }
    // Fallback: hand the image to the viewer, then open WhatsApp with the text.
    if(blob){
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'games-room.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    }
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
  }

  return { set, now };
})();
