window.GYM_AVATARS = ['🦁','🐯','🐻','🐼','🦊','🐨','🐰','🐸','🐵','🦄','🐙','🐢','🦖','🌟','⚡','🔥','🍀','🎯'];
window.GYMAvatarPicker = {
  render: function(containerId){
    const el = document.getElementById(containerId);
    if(!el) return { get: function(){ return window.GYM_AVATARS[0]; } };
    function savedA(){ try{ return localStorage.getItem('gym-player-avatar') || ''; }catch(e){ return ''; } }
    function rememberA(a){ try{ localStorage.setItem('gym-player-avatar', a); }catch(e){} }
    let selected = window.GYM_AVATARS.indexOf(savedA()) >= 0 ? savedA() : window.GYM_AVATARS[Math.floor(Math.random()*window.GYM_AVATARS.length)];
    function paint(){
      el.innerHTML = window.GYM_AVATARS.map(a =>
        '<button type="button" class="avatar-opt'+(a===selected?' sel':'')+'" data-a="'+a+'">'+a+'</button>'
      ).join('');
      Array.prototype.forEach.call(el.querySelectorAll('.avatar-opt'), function(btn){
        btn.onclick = function(){ selected = btn.getAttribute('data-a'); rememberA(selected); paint(); };
      });
    }
    paint();
    // Keep the (random) pre-selected avatar visible in the scrolling row.
    requestAnimationFrame(function(){
      const sel = el.querySelector('.avatar-opt.sel');
      if(sel && el.scrollWidth > el.clientWidth) el.scrollLeft = sel.offsetLeft - el.offsetLeft - 5;
    });
    return { get: function(){ return selected; } };
  }
};
