window.GYMRealtime = (function(){
  let clientPromise = null;
  let channel = null;

  function getClient(SB_URL, SB_KEY){
    if(!clientPromise){
      clientPromise = import('https://esm.sh/@supabase/supabase-js@2')
        .then(mod => mod.createClient(SB_URL, SB_KEY))
        .catch(() => null);
    }
    return clientPromise;
  }

  async function subscribe(SB_URL, SB_KEY, table, code, onChange){
    const client = await getClient(SB_URL, SB_KEY);
    if(!client || !code) return;
    if(channel){ client.removeChannel(channel); channel = null; }
    channel = client
      .channel('gym-'+table+'-'+code)
      .on('postgres_changes', { event:'*', schema:'public', table:table, filter:'code=eq.'+code }, payload => {
        if(payload.new && payload.new.state) onChange(payload.new.state);
      })
      .subscribe();
  }

  async function unsubscribe(SB_URL, SB_KEY){
    if(!channel) return;
    const client = await getClient(SB_URL, SB_KEY);
    if(client) client.removeChannel(channel);
    channel = null;
  }

  return { subscribe, unsubscribe };
})();
