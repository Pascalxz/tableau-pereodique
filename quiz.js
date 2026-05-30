/* Module de quiz réutilisable (Base, Avancé, Pro).
   Usage :  Quiz.open(els, cats, options)
   - els  : tableau d'éléments (besoin de num, sym, nm, cat, desc)
   - cats : dictionnaire des catégories { clef: [nom, couleur] }
   - options : { recordKey, games:['mix',...], levels:[[label, maxZ], ...] }
   Le module s'occupe de son propre HTML/CSS et du bouton Retour (mobile). */
(function(){
  let built=false, overlay, ELS, CATS, opts, games, levels, recordKey;
  let score=0, streak=0, record=0, answered=false, gameType='mix', maxZ=36, correct='';

  function injectCSS(){
    const s=document.createElement('style');
    s.textContent=`
    .qz-ov{position:fixed;inset:0;background:rgba(6,9,15,.85);backdrop-filter:blur(7px);
      display:none;align-items:center;justify-content:center;padding:18px;z-index:80;
      font-family:'Space Grotesk',sans-serif}
    .qz-ov.show{display:flex;animation:qzf .2s}
    @keyframes qzf{from{opacity:0}to{opacity:1}}
    .qz-box{background:linear-gradient(180deg,#141b27,#1a2433);border:1px solid rgba(255,255,255,.09);
      border-radius:24px;padding:26px 24px;max-width:580px;width:100%;max-height:92vh;overflow-y:auto;
      position:relative;color:#f2f6ff;animation:qzr .28s}
    @keyframes qzr{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}
    .qz-x{position:absolute;top:14px;right:14px;background:rgba(255,255,255,.1);border:none;color:#f2f6ff;
      width:38px;height:38px;border-radius:50%;font-size:1.1rem;cursor:pointer}
    .qz-h{font-family:'Fraunces',serif;font-size:1.6rem;text-align:center;margin:4px 30px 4px}
    .qz-lead{text-align:center;color:#9fb0c9;margin-bottom:8px;line-height:1.5}
    .qz-row{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin:8px 0}
    .qz-field{display:flex;align-items:center;gap:8px;background:#1a2433;border:1px solid rgba(255,255,255,.09);
      border-radius:14px;padding:9px 14px;color:#9fb0c9;font-size:.9rem}
    .qz-field select{background:none;border:none;outline:none;color:#f2f6ff;font-family:inherit;font-size:.95rem;cursor:pointer}
    .qz-field select option{background:#141b27}
    .qz-start{display:block;margin:14px auto 0;font-family:inherit;font-size:1.05rem;font-weight:600;
      padding:15px 26px;border-radius:14px;border:none;cursor:pointer;
      background:linear-gradient(95deg,#ffd23f,#6ee87a);color:#0c1118}
    .qz-stat{display:flex;justify-content:space-between;align-items:center;margin:6px 0 18px;color:#9fb0c9;font-size:.92rem}
    .qz-stat b{color:#f2f6ff;font-size:1.15rem}
    .qz-prompt{text-align:center;margin:6px 0 18px}
    .qz-big{font-family:'Fraunces',serif;font-size:3rem;line-height:1;margin:6px auto;
      display:flex;width:92px;height:92px;align-items:center;justify-content:center;border-radius:18px;color:#0c1118;font-weight:700}
    .qz-q{font-size:1.16rem;font-weight:600;line-height:1.4}
    .qz-hintline{color:#9fb0c9;font-size:1.02rem;line-height:1.5;margin-top:8px}
    .qz-opts{display:grid;grid-template-columns:repeat(2,1fr);gap:11px}
    .qz-opt{font-family:inherit;font-size:1.05rem;font-weight:600;padding:16px 12px;border-radius:14px;
      border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.04);color:#f2f6ff;cursor:pointer;transition:.12s}
    .qz-opt:hover{border-color:rgba(255,255,255,.35);background:rgba(255,255,255,.08)}
    .qz-opt.good{background:#6ee87a;color:#0c1118;border-color:transparent}
    .qz-opt.bad{background:#ff6b6b;color:#0c1118;border-color:transparent}
    .qz-fb{text-align:center;margin-top:14px;font-weight:600;min-height:24px}
    .qz-next{margin-top:14px;width:100%;border:none;border-radius:14px;padding:15px;font-family:inherit;
      font-size:1.05rem;font-weight:600;background:#5ec8f2;color:#0c1118;cursor:pointer}
    .qz-quit{display:block;margin:14px auto 0;background:none;border:1px solid rgba(255,255,255,.09);
      color:#9fb0c9;border-radius:12px;padding:9px 16px;font-family:inherit;cursor:pointer}
    @media(max-width:430px){.qz-opts{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  const GAME_NAMES={mix:'🎲 Mélange',sym2nm:'Symbole → nom',nm2sym:'Nom → symbole',
    indice:'Devine par l\'indice',num:'Numéro atomique',cat:'Famille de l\'élément'};

  function build(){
    overlay=document.createElement('div');
    overlay.className='qz-ov';
    overlay.innerHTML=`
      <div class="qz-box">
        <button class="qz-x" id="qz-close" title="Fermer">✕</button>
        <div id="qz-setup">
          <h3 class="qz-h">🎮 Mode quiz</h3>
          <p class="qz-lead">Choisis ton défi, puis enchaîne les bonnes réponses !</p>
          <div class="qz-row">
            <div class="qz-field">Jeu <select id="qz-type"></select></div>
            <div class="qz-field">Difficulté <select id="qz-diff"></select></div>
          </div>
          <p class="qz-lead" id="qz-best"></p>
          <button class="qz-start" id="qz-startbtn">Commencer ▶</button>
        </div>
        <div id="qz-play" style="display:none">
          <div class="qz-stat">
            <span>Score : <b id="qz-score">0</b></span>
            <span>Série : <b id="qz-streak">0</b> 🔥</span>
            <span>Record : <b id="qz-record">0</b></span>
          </div>
          <div class="qz-prompt" id="qz-prompt"></div>
          <div class="qz-opts" id="qz-opts"></div>
          <div class="qz-fb" id="qz-fb"></div>
          <button class="qz-next" id="qz-nextbtn" style="display:none">Question suivante ▶</button>
          <button class="qz-quit" id="qz-quitbtn">Changer de jeu</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click',e=>{ if(e.target===overlay) close(); });
    overlay.querySelector('#qz-close').onclick=close;
    overlay.querySelector('#qz-startbtn').onclick=start;
    overlay.querySelector('#qz-nextbtn').onclick=nextQuestion;
    overlay.querySelector('#qz-quitbtn').onclick=showSetup;
    document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&overlay.classList.contains('show')) close(); });
    window.addEventListener('popstate',()=>{ if(overlay.classList.contains('show')) reallyClose(); });
  }

  function fillSelects(){
    const ts=overlay.querySelector('#qz-type');
    ts.innerHTML=games.map(g=>`<option value="${g}">${GAME_NAMES[g]||g}</option>`).join('');
    const ds=overlay.querySelector('#qz-diff');
    ds.innerHTML=levels.map((l,i)=>`<option value="${l[1]}">${l[0]}</option>`).join('');
  }

  function rnd(a){ return a[Math.floor(Math.random()*a.length)]; }
  function sample(pool,n,exclude){ const p=pool.filter(x=>x!==exclude); const r=[];
    while(r.length<n&&p.length){ r.push(p.splice(Math.floor(Math.random()*p.length),1)[0]); } return r; }

  function showSetup(){
    overlay.querySelector('#qz-setup').style.display='block';
    overlay.querySelector('#qz-play').style.display='none';
    overlay.querySelector('#qz-best').textContent=record?('🏆 Ton record de série : '+record):'';
  }
  function start(){
    maxZ=+overlay.querySelector('#qz-diff').value;
    gameType=overlay.querySelector('#qz-type').value;
    score=0; streak=0;
    overlay.querySelector('#qz-setup').style.display='none';
    overlay.querySelector('#qz-play').style.display='block';
    overlay.querySelector('#qz-record').textContent=record;
    nextQuestion();
  }
  function nextQuestion(){
    answered=false;
    overlay.querySelector('#qz-fb').textContent='';
    overlay.querySelector('#qz-nextbtn').style.display='none';
    const pool=ELS.filter(e=>e.num<=maxZ);
    const choose=gameType==='mix'?rnd(games.filter(g=>g!=='mix')):gameType;
    const e=rnd(pool); correct='';
    const prompt=overlay.querySelector('#qz-prompt'), opts=overlay.querySelector('#qz-opts');
    let list=[], render;
    if(choose==='sym2nm'){
      prompt.innerHTML=`<div class="qz-big" style="background:${CATS[e.cat][1]}">${e.sym}</div><div class="qz-q">Quel est cet élément ?</div>`;
      list=[e,...sample(pool,3,e)]; correct=e.nm; render=x=>x.nm;
    } else if(choose==='nm2sym'){
      prompt.innerHTML=`<div class="qz-q">Quel est le symbole de <b>${e.nm}</b> ?</div>`;
      list=[e,...sample(pool,3,e)]; correct=e.sym; render=x=>x.sym;
    } else if(choose==='indice'){
      prompt.innerHTML=`<div class="qz-q">Devine l'élément 🔎</div><div class="qz-hintline">${e.desc}</div>`;
      list=[e,...sample(pool,3,e)]; correct=e.nm; render=x=>x.nm;
    } else if(choose==='num'){
      prompt.innerHTML=`<div class="qz-q">Quel est le numéro atomique de <b>${e.nm}</b> ?</div>`;
      const nums=new Set([e.num]); while(nums.size<4) nums.add(rnd(pool).num);
      list=[...nums].map(n=>({num:n})); correct=String(e.num); render=x=>String(x.num);
    } else { // cat
      prompt.innerHTML=`<div class="qz-big" style="background:${CATS[e.cat][1]}">${e.sym}</div><div class="qz-q">À quelle famille appartient <b>${e.nm}</b> ?</div>`;
      const keys=Object.keys(CATS); const wrong=sample(keys.filter(c=>c!==e.cat),3);
      list=[e.cat,...wrong].map(c=>({cat:c})); correct=CATS[e.cat][0]; render=x=>CATS[x.cat][0];
    }
    for(let i=list.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [list[i],list[j]]=[list[j],list[i]]; }
    opts.innerHTML='';
    list.forEach(o=>{ const b=document.createElement('button'); b.className='qz-opt'; b.textContent=render(o);
      b.onclick=()=>answer(b,render(o)===correct,opts); opts.appendChild(b); });
  }
  function answer(btn,isRight,opts){
    if(answered)return; answered=true;
    Array.from(opts.children).forEach(b=>{ b.disabled=true; if(b.textContent===correct) b.classList.add('good'); });
    const fb=overlay.querySelector('#qz-fb');
    if(isRight){ score++; streak++; btn.classList.add('good');
      fb.style.color='#6ee87a'; fb.textContent=rnd(['Bravo ! 🎉','Exact ! ✅','Super ! 🌟','Parfait ! 👏']);
      if(streak>record){ record=streak; try{localStorage.setItem(recordKey,record);}catch(_){} }
    } else { streak=0; btn.classList.add('bad');
      fb.style.color='#ff6b6b'; fb.textContent='Oups ! La bonne réponse : '+correct; }
    overlay.querySelector('#qz-score').textContent=score;
    overlay.querySelector('#qz-streak').textContent=streak;
    overlay.querySelector('#qz-record').textContent=record;
    overlay.querySelector('#qz-nextbtn').style.display='block';
  }

  function reallyClose(){ overlay.classList.remove('show'); }
  function close(){ if(history.state&&history.state.qzModal) history.back(); else reallyClose(); }

  window.Quiz={
    open(els,cats,o){
      ELS=els; CATS=cats; opts=o||{};
      games=opts.games||['mix','sym2nm','nm2sym','indice','num','cat'];
      levels=opts.levels||[['Facile (1–36)',36],['Moyen (1–86)',86],['Tout (1–118)',118]];
      recordKey=opts.recordKey||'quiz_record';
      record=+(localStorage.getItem(recordKey)||0);
      if(!built){ injectCSS(); build(); built=true; }
      fillSelects(); showSetup();
      history.pushState({qzModal:true},'');
      overlay.classList.add('show');
    }
  };
})();
