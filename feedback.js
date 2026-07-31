window.GYMFeedback = (function(){
  const COLORS = ['#e9c46a','#e76f51','#8ecae6','#7bb274','#b39ddb','#f3efe4'];
  let stylesInjected = false;
  function injectStyles(){
    if(stylesInjected) return;
    stylesInjected = true;
    const style = document.createElement('style');
    style.textContent = '@keyframes gymConfettiFall{'+
      '0%{ transform: translateY(0) rotate(0deg); opacity:.9; }'+
      '100%{ transform: translateY(110vh) rotate(540deg); opacity:0; }'+
    '}';
    document.head.appendChild(style);
  }
  function reducedMotion(){
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function confetti(count){
    if(reducedMotion()) return;
    injectStyles();
    count = count || 60;
    const root = document.createElement('div');
    root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;';
    for(let i=0;i<count;i++){
      const el = document.createElement('div');
      const color = COLORS[Math.floor(Math.random()*COLORS.length)];
      const left = Math.random()*100;
      const size = 6 + Math.random()*6;
      const duration = 1.8 + Math.random()*1.4;
      const delay = Math.random()*0.4;
      const rotate = Math.random()*360;
      el.style.cssText = 'position:absolute;top:-20px;left:'+left+'%;width:'+size+'px;height:'+(size*0.6)+'px;'+
        'background:'+color+';opacity:.9;border-radius:2px;transform:rotate('+rotate+'deg);'+
        'animation:gymConfettiFall '+duration+'s '+delay+'s cubic-bezier(.35,0,.65,1) forwards;';
      root.appendChild(el);
    }
    document.body.appendChild(root);
    setTimeout(()=>root.remove(), 3600);
  }
  function vibrate(pattern){
    if(navigator.vibrate){ try{ navigator.vibrate(pattern); }catch(e){} }
  }
  return {
    confetti,
    vibrate,
    win: function(){ confetti(); vibrate([100,50,100,50,200]); },
    ok: function(){ vibrate(30); },
    mistake: function(){ vibrate([25,60,25]); }
  };
})();
