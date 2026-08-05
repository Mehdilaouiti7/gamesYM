window.GYMRecent = (function(){
  const KEY = 'gym-recent-games';
  const MAX = 8;
  const EXPIRY_MS = 2 * 60 * 60 * 1000; // 2h
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
  function remove(game, code){
    save(load().filter(e => !(e.game===game && e.code===code)));
  }
  function getAll(){
    const now = Date.now();
    const all = load();
    const fresh = all.filter(e => (now - e.ts) <= EXPIRY_MS);
    if(fresh.length !== all.length) save(fresh);
    return fresh;
  }
  return { record, remove, getAll };
})();
