window.GYMRecent = (function(){
  const KEY = 'gym-recent-games';
  const MAX = 8;
  function load(){
    try{ return JSON.parse(localStorage.getItem(KEY)) || []; }catch(e){ return []; }
  }
  function save(list){
    try{ localStorage.setItem(KEY, JSON.stringify(list)); }catch(e){}
  }
  function record(game, code, label){
    if(!game || !code) return;
    let list = load().filter(e => !(e.game===game && e.code===code));
    list.unshift({ game, code, label, ts: Date.now() });
    if(list.length > MAX) list = list.slice(0, MAX);
    save(list);
  }
  function getAll(){ return load(); }
  return { record, getAll };
})();
