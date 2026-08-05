window.GYMDigitPad = {
  render: function(containerId, opts){
    opts = opts || {};
    const maxLen = opts.maxLen || 4;
    const distinct = opts.distinct !== false;
    const showEnter = !!opts.showEnter;
    const enterLabel = opts.enterLabel || 'Valider';
    const onEnter = opts.onEnter || function(){};
    const el = document.getElementById(containerId);
    if(!el) return { getValue: function(){ return ''; }, setValue: function(){}, clear: function(){}, refresh: function(){} };
    let slots = new Array(maxLen).fill('');
    let cursor = 0;

    function paint(){
      const boxes = slots.map((d, i) => {
        const filled = d !== '';
        const active = i === cursor;
        return '<div class="digit-box'+(filled?' filled':'')+(active?' active':'')+'" data-i="'+i+'">'+(filled?d:'')+'</div>';
      }).join('');
      const usedElsewhere = distinct ? slots.filter((d, i) => i !== cursor && d !== '') : [];
      const row1 = ['1','2','3','4','5'];
      const row2 = ['6','7','8','9','0'];
      function keyBtn(k){
        const disabled = usedElsewhere.indexOf(k)!==-1;
        return '<button type="button" class="dp-key" data-k="'+k+'"'+(disabled?' disabled':'')+'>'+k+'</button>';
      }
      const filledCount = slots.filter(d => d !== '').length;
      const enterDisabled = filledCount<maxLen || (typeof opts.enterDisabled==='function' && opts.enterDisabled());
      el.innerHTML =
        '<div class="digit-boxes">'+boxes+
          (showEnter ? '<button type="button" class="dp-enter" id="'+containerId+'-enter"'+(enterDisabled?' disabled':'')+'>'+enterLabel+'</button>' : '')+
        '</div>'+
        '<div class="dp-keys">'+row1.map(keyBtn).join('')+'<button type="button" class="dp-key dp-back" data-back="1">⌫</button></div>'+
        '<div class="dp-keys">'+row2.map(keyBtn).join('')+'<button type="button" class="dp-key dp-clear" data-clear="1">🗑</button></div>';

      const boxEls = el.querySelectorAll('.digit-box');
      for(let i=0;i<boxEls.length;i++){
        boxEls[i].onclick = function(){
          cursor = parseInt(this.getAttribute('data-i'), 10);
          paint();
        };
      }
      const keyEls = el.querySelectorAll('.dp-key[data-k]');
      for(let i=0;i<keyEls.length;i++){
        keyEls[i].onclick = function(){
          const k = this.getAttribute('data-k');
          if(distinct && usedElsewhere.indexOf(k)!==-1) return;
          slots[cursor] = k;
          cursor = Math.min(cursor + 1, maxLen - 1);
          paint();
        };
      }
      const backBtn = el.querySelector('.dp-back');
      if(backBtn) backBtn.onclick = function(){
        if(slots[cursor] !== ''){
          slots[cursor] = '';
        } else if(cursor > 0){
          cursor -= 1;
          slots[cursor] = '';
        }
        paint();
      };
      const clearBtn = el.querySelector('.dp-clear');
      if(clearBtn) clearBtn.onclick = function(){ slots = new Array(maxLen).fill(''); cursor = 0; paint(); };
      if(showEnter){
        const enterBtn = el.querySelector('.dp-enter');
        if(enterBtn) enterBtn.onclick = function(){ if(filledCount===maxLen) onEnter(slots.join('')); };
      }
    }
    paint();
    return {
      getValue: function(){ return slots.join(''); },
      setValue: function(v){ v = v || ''; slots = new Array(maxLen).fill(''); for(let i=0;i<Math.min(v.length,maxLen);i++) slots[i]=v[i]; cursor = Math.min(v.length, maxLen-1); paint(); },
      clear: function(){ slots = new Array(maxLen).fill(''); cursor = 0; paint(); },
      refresh: function(){ paint(); }
    };
  }
};
