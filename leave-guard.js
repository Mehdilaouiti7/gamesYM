window.GYMLeaveGuard = (function(){
  let active = false;
  function handler(e){
    e.preventDefault();
    e.returnValue = '';
    return '';
  }
  function enable(){
    if(active) return;
    active = true;
    window.addEventListener('beforeunload', handler);
  }
  function disable(){
    if(!active) return;
    active = false;
    window.removeEventListener('beforeunload', handler);
  }
  return { enable, disable };
})();
