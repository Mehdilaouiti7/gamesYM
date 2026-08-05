window.GYMDigitPad = {
  render: function(containerId, opts){
    opts = opts || {};
    const maxLen = opts.maxLen || 4;
    const distinct = opts.distinct !== false;
    const showEnter = !!opts.showEnter;
    const enterLabel = opts.enterLabel || 'Valider';
    const onEnter = opts.onEnter || function(){};
    const el = document.getElementById(containerId);
    if(!el) return { getValue: function(){ return ''; }, setValue: function(){}, clear: function(){} };
    let value = '';

    function paint(){
      const boxes = [];
      for(let i=0;i<maxLen;i++){
        const filled = i < value.length;
        boxes.push('<div class="digit-box'+(filled?' filled':'')+'">'+(filled?value[i]:'')+'</div>');
      }
      const usedDigits = distinct ? value.split('') : [];
      const row1 = ['1','2','3','4','5'];
      const row2 = ['6','7','8','9','0'];
      function keyBtn(k){
        const disabled = value.length>=maxLen || usedDigits.indexOf(k)!==-1;
        return '<button type="button" class="dp-key" data-k="'+k+'"'+(disabled?' disabled':'')+'>'+k+'</button>';
      }
      const enterDisabled = value.length<maxLen || (typeof opts.enterDisabled==='function' && opts.enterDisabled());
      el.innerHTML =
        '<div class="digit-boxes">'+boxes.join('')+
          (showEnter ? '<button type="button" class="dp-enter" id="'+containerId+'-enter"'+(enterDisabled?' disabled':'')+'>'+enterLabel+'</button>' : '')+
        '</div>'+
        '<div class="dp-keys">'+row1.map(keyBtn).join('')+'<button type="button" class="dp-key dp-back" data-back="1">⌫</button></div>'+
        '<div class="dp-keys">'+row2.map(keyBtn).join('')+'<button type="button" class="dp-key dp-clear" data-clear="1">🗑</button></div>';

      const keyEls = el.querySelectorAll('.dp-key[data-k]');
      for(let i=0;i<keyEls.length;i++){
        keyEls[i].onclick = function(){
          const k = this.getAttribute('data-k');
          if(value.length < maxLen && !(distinct && value.indexOf(k)!==-1)){
            value += k;
            paint();
          }
        };
      }
      const backBtn = el.querySelector('.dp-back');
      if(backBtn) backBtn.onclick = function(){ value = value.slice(0,-1); paint(); };
      const clearBtn = el.querySelector('.dp-clear');
      if(clearBtn) clearBtn.onclick = function(){ value = ''; paint(); };
      if(showEnter){
        const enterBtn = el.querySelector('.dp-enter');
        if(enterBtn) enterBtn.onclick = function(){ if(value.length===maxLen) onEnter(value); };
      }
    }
    paint();
    return {
      getValue: function(){ return value; },
      setValue: function(v){ value = v || ''; paint(); },
      clear: function(){ value = ''; paint(); },
      refresh: function(){ paint(); }
    };
  }
};
