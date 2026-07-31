window.GYM_AVATARS = ['🦁','🐯','🐻','🐼','🦊','🐨','🐰','🐸','🐵','🦄','🐙','🐢','🦖','🌟','⚡','🔥','🍀','🎯'];
window.GYMAvatarPicker = {
  render: function(containerId){
    const el = document.getElementById(containerId);
    if(!el) return { get: function(){ return window.GYM_AVATARS[0]; } };
    let selected = window.GYM_AVATARS[Math.floor(Math.random()*window.GYM_AVATARS.length)];
    function paint(){
      el.innerHTML = window.GYM_AVATARS.map(a =>
        '<button type="button" class="avatar-opt'+(a===selected?' sel':'')+'" data-a="'+a+'">'+a+'</button>'
      ).join('');
      Array.prototype.forEach.call(el.querySelectorAll('.avatar-opt'), function(btn){
        btn.onclick = function(){ selected = btn.getAttribute('data-a'); paint(); };
      });
    }
    paint();
    return { get: function(){ return selected; } };
  }
};
