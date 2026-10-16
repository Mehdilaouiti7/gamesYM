window.GYMRealtime = (function(){
  // Start downloading the Supabase client as soon as the page loads, so live
  // updates are ready by the time a game starts (instead of on first subscribe).
  const libPromise = import('https://esm.sh/@supabase/supabase-js@2.45.4').catch(() => null);
  let clientPromise = null;
  let channel = null;
  let current = null;   // {url, key, table, code, onChange}

  function getClient(SB_URL, SB_KEY){
    if(!clientPromise){
      clientPromise = libPromise
        .then(mod => mod ? mod.createClient(SB_URL, SB_KEY, { realtime: { params: { eventsPerSecond: 20 } } }) : null)
        .catch(() => null);
    }
    return clientPromise;
  }

  // Fetch the latest row directly: used when the live channel (re)connects and
  // when the phone comes back from sleep, so no move is missed.
  async function resync(){
    const c = current; if(!c) return;
    try{
      const r = await fetch(c.url+"/rest/v1/"+c.table+"?code=eq."+encodeURIComponent(c.code)+"&select=state", {
        headers:{ "apikey": c.key, "Authorization": "Bearer " + c.key }
      });
      if(!r.ok) return;
      const rows = await r.json();
      if(rows.length && rows[0].state && current===c) c.onChange(rows[0].state);
    }catch(e){}
  }
  document.addEventListener('visibilitychange', () => { if(!document.hidden) resync(); });
  window.addEventListener('online', resync);
  window.addEventListener('focus', resync);

  async function subscribe(SB_URL, SB_KEY, table, code, onChange){
    if(!code) return;
    current = { url:SB_URL, key:SB_KEY, table, code, onChange };
    const client = await getClient(SB_URL, SB_KEY);
    if(!client) return;
    if(channel){ client.removeChannel(channel); channel = null; }
    channel = client
      .channel('gym-'+table+'-'+code)
      .on('postgres_changes', { event:'*', schema:'public', table:table, filter:'code=eq.'+code }, payload => {
        if(payload.new && payload.new.state) onChange(payload.new.state);
      })
      .subscribe(status => { if(status==='SUBSCRIBED') resync(); });
  }

  async function unsubscribe(SB_URL, SB_KEY){
    current = null;
    if(!channel) return;
    const client = await getClient(SB_URL, SB_KEY);
    if(client) client.removeChannel(channel);
    channel = null;
  }

  return { subscribe, unsubscribe, resync };
})();
