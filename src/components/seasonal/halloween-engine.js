/** V11 effects: persistent interaction state, independent timers and audio per switch.
 * @param {HTMLElement} host
 * @param {string} seenKey
 * @param {() => void} onConsumed
 */
export function mountHalloween(host, seenKey, onConsumed) {
  let disposed = false, userActivated = false, suspended = false;
  let requested = { storm: false, ambience: false, autoScreamer: false };
  let autoTimer = null, screamDeadline = null, remaining = null, showing = false, screamMedia = null;
  const contexts = { storm: null, screamer: null };
  const get = id => host.querySelector('#hw-' + id);
  function scope() {
    const timers = new Set();
    return {
      enabled: false, generation: 0,
      start() { this.enabled = true; this.generation++; },
      stop() { this.enabled = false; this.generation++; timers.forEach(id => clearTimeout(id)); timers.clear(); },
      later(callback, delay = 0) {
        if (!this.enabled || disposed) return null;
        const generation = this.generation;
        const id = window.setTimeout(() => {
          timers.delete(id);
          if (!disposed && this.enabled && generation === this.generation) callback();
        }, delay);
        timers.add(id); return id;
      },
      cancel(id) { clearTimeout(id); timers.delete(id); },
    };
  }
  const storm = scope(), ambience = scope(), screamer = scope();
  const cardSpiders = new Map();
  function teaseProduct(event) {
    if (!ambience.enabled || disposed || unsafe() || !(event.target instanceof Element)) return;
    const card = event.target.closest('[data-seasonal-product]');
    if (!card) return;
    if (event.type === 'pointerover' && event.relatedTarget instanceof Element
        && event.relatedTarget.closest('[data-seasonal-product]') === card) return;
    const previous = cardSpiders.get(card);
    if (previous) { ambience.cancel(previous.timer); previous.node.remove(); }
    const bounds = card.getBoundingClientRect();
    const node = document.createElement('span');
    node.className = 'hw-card-spider'; node.setAttribute('aria-hidden', 'true');
    node.style.left = Math.max(24, Math.min(bounds.width - 24, event.clientX - bounds.left + 12)) + 'px';
    node.style.top = Math.max(52, Math.min(bounds.height - 8, event.clientY - bounds.top)) + 'px';
    card.appendChild(node);
    const timer = ambience.later(() => { node.remove(); cardSpiders.delete(card); }, 1400);
    cardSpiders.set(card, { node, timer });
    // Passive decoration only: never cancel the event, capture the pointer or delay a purchase action.
  }
  function armAudio(kind) {
    if (!userActivated) return null;
    try {
      const ctx = contexts[kind] ||= new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
      return ctx;
    } catch { return null; }
  }
  function closeAudio(kind) {
    const ctx = contexts[kind]; contexts[kind] = null;
    if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => {});
  }
  function seen() { try { return !!localStorage.getItem(seenKey); } catch { return true; } }
  function unsafe() {
    return document.visibilityState !== 'visible'
      || !!document.querySelector('[data-seasonal-suspend], [role="dialog"], [aria-modal="true"], dialog[open]')
      || !!document.activeElement?.matches('input,textarea,select,[contenteditable="true"]')
      || !!document.activeElement?.closest('form')
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function makeBolt(){
    const w=Math.max(innerWidth,320), h=Math.max(innerHeight,540);
    const fromLeft=Math.random()<.5;
    let x=fromLeft ? w*(.08+Math.random()*.40) : w*(.52+Math.random()*.40), y=-18;
    const endY=h*(.58+Math.random()*.38);
    const pts=[[x,y]];
    while(y<endY){
      y+=28+Math.random()*55;
      x+=(Math.random()-.5)*(52+Math.random()*58)+(fromLeft?5:-5);
      x=Math.max(-30,Math.min(w+30,x));
      pts.push([x,y]);
    }
    const poly=pts.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ');
    const branches=[];
    for(let i=2;i<pts.length-2;i+=2+Math.floor(Math.random()*2)){
      if(Math.random()>.72)continue;
      const [bx,by]=pts[i]; let xx=bx, yy=by; const bpts=[[xx,yy]], dir=Math.random()<.5?-1:1;
      const steps=2+Math.floor(Math.random()*3);
      for(let j=0;j<steps;j++){xx+=dir*(16+Math.random()*34)+(Math.random()-.5)*14;yy+=14+Math.random()*32;bpts.push([xx,yy])}
      branches.push(`<polyline class="bolt-branch" points="${bpts.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ')}"/>`);
    }
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline class="bolt-main" points="${poly}"/>${branches.join('')}</svg>`;
  }
  function playLightningThunder(intensity=1){
    if(!userActivated)return;
    const ctx = armAudio('storm');
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    // Bus principal : tout est transitoire. Aucun son ne boucle en arrière-plan.
    const master=ctx.createGain(), comp=ctx.createDynamicsCompressor();
    master.gain.setValueAtTime(.0001,now);
    master.gain.exponentialRampToValueAtTime(.62*intensity,now+.004);
    master.gain.exponentialRampToValueAtTime(.24*intensity,now+.16);
    master.gain.exponentialRampToValueAtTime(.0001,now+3.55);
    comp.threshold.value=-20;comp.knee.value=10;comp.ratio.value=9;comp.attack.value=.001;comp.release.value=.16;
    master.connect(comp);comp.connect(ctx.destination);
    storm.later(() => { master.disconnect(); comp.disconnect(); }, 4000);

    // 1) ARC ELECTRIQUE : attaque brillante et nerveuse, originale, façon "attaque électrique" de jeu vidéo.
    //    Plusieurs balayages très courts donnent le KZZZT/CRACK sans reprendre un son de jeu existant.
    const zapBus=ctx.createGain();
    zapBus.gain.setValueAtTime(.0001,now);
    zapBus.gain.exponentialRampToValueAtTime(.78*intensity,now+.002);
    zapBus.gain.exponentialRampToValueAtTime(.0001,now+.31);
    const zapBP=ctx.createBiquadFilter();zapBP.type='bandpass';zapBP.frequency.value=2600;zapBP.Q.value=.75;
    zapBus.connect(zapBP);zapBP.connect(master);

    [0,.028,.061,.104,.151].forEach((off,i)=>{
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.type=i%2?'square':'sawtooth';
      const hi=1900+Math.random()*2500, lo=150+Math.random()*420;
      o.frequency.setValueAtTime(hi,now+off);
      o.frequency.exponentialRampToValueAtTime(lo,now+off+.055+Math.random()*.045);
      g.gain.setValueAtTime(.0001,now+off);
      g.gain.exponentialRampToValueAtTime((.19+Math.random()*.15)*intensity,now+off+.002);
      g.gain.exponentialRampToValueAtTime(.0001,now+off+.075+Math.random()*.035);
      o.connect(g);g.connect(zapBus);o.start(now+off);o.stop(now+off+.12);
    });

    // Crépitement haute fréquence : petites micro-décharges imprévisibles.
    const zLen=Math.floor(ctx.sampleRate*.24),zBuf=ctx.createBuffer(1,zLen,ctx.sampleRate),zd=zBuf.getChannelData(0);
    for(let i=0;i<zLen;i++){
      const t=i/ctx.sampleRate;
      const gate=(Math.sin(t*2*Math.PI*83)>0.62||Math.sin(t*2*Math.PI*137)>0.78)?1:.08;
      zd[i]=(Math.random()*2-1)*gate*Math.pow(1-i/zLen,.8);
    }
    const zSrc=ctx.createBufferSource(),zHP=ctx.createBiquadFilter(),zG=ctx.createGain();
    zSrc.buffer=zBuf;zHP.type='highpass';zHP.frequency.value=1450;
    zG.gain.setValueAtTime(.52*intensity,now);zG.gain.exponentialRampToValueAtTime(.0001,now+.24);
    zSrc.connect(zHP);zHP.connect(zG);zG.connect(master);zSrc.start(now);

    // 2) CLAQUEMENT : impact très court, plus naturel qu'un bruit blanc uniforme.
    const cLen=Math.floor(ctx.sampleRate*.095),cBuf=ctx.createBuffer(1,cLen,ctx.sampleRate),cd=cBuf.getChannelData(0);
    let prev=0;for(let i=0;i<cLen;i++){const t=i/cLen;const w=Math.random()*2-1;prev=prev*.28+w*.72;cd[i]=prev*Math.pow(1-t,3.6)}
    const cSrc=ctx.createBufferSource(),cBP=ctx.createBiquadFilter(),cG=ctx.createGain();
    cSrc.buffer=cBuf;cBP.type='bandpass';cBP.frequency.value=1150+Math.random()*500;cBP.Q.value=.55;
    cG.gain.setValueAtTime(.62*intensity,now+.018);cG.gain.exponentialRampToValueAtTime(.0001,now+.115);
    cSrc.connect(cBP);cBP.connect(cG);cG.connect(master);cSrc.start(now+.018);

    // 3) GRONDEMENT D'ORAGE : une vague courte et irrégulière, jamais en boucle.
    //    On privilégie le bas-médium (audible sur téléphone) plutôt qu'un sub continu type moteur.
    const delay=.08+Math.random()*.18;
    const dur=2.15+Math.random()*1.35;
    const len=Math.floor(ctx.sampleRate*dur),buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);
    let slow=0,slow2=0;
    for(let i=0;i<len;i++){
      const t=i/ctx.sampleRate, n=i/len, w=Math.random()*2-1;
      slow=slow*.975+w*.025; slow2=slow2*.993+w*.007;
      const swell=.48+.28*Math.sin(2*Math.PI*(.55*t+Math.sin(t*.7)*.11))+.18*Math.sin(2*Math.PI*1.7*t);
      const env=Math.sin(Math.min(1,n*4.5)*Math.PI/2)*Math.pow(1-n,.72);
      d[i]=(slow*.72+slow2*.62)*Math.max(.08,swell)*env;
    }
    const rSrc=ctx.createBufferSource(),rLP=ctx.createBiquadFilter(),rHP=ctx.createBiquadFilter(),rG=ctx.createGain();
    rSrc.buffer=buf;rLP.type='lowpass';rLP.frequency.setValueAtTime(720,now+delay);rLP.frequency.exponentialRampToValueAtTime(210,now+delay+dur);
    rHP.type='highpass';rHP.frequency.value=48;
    rG.gain.setValueAtTime(.0001,now+delay);rG.gain.exponentialRampToValueAtTime(.72*intensity,now+delay+.08);rG.gain.exponentialRampToValueAtTime(.0001,now+delay+dur);
    rSrc.connect(rLP);rLP.connect(rHP);rHP.connect(rG);rG.connect(master);rSrc.start(now+delay);

    // Petit corps tonal très bref autour de 130 Hz pour que le grondement existe sur les HP de téléphone,
    // mais il disparaît vite afin de ne jamais ressembler à un moteur.
    const body=ctx.createOscillator(),bodyG=ctx.createGain();
    body.type='sine';body.frequency.setValueAtTime(148+Math.random()*28,now+delay);body.frequency.exponentialRampToValueAtTime(84+Math.random()*18,now+delay+.72);
    bodyG.gain.setValueAtTime(.0001,now+delay);bodyG.gain.exponentialRampToValueAtTime(.17*intensity,now+delay+.045);bodyG.gain.exponentialRampToValueAtTime(.0001,now+delay+.9);
    body.connect(bodyG);bodyG.connect(master);body.start(now+delay);body.stop(now+delay+.95);
  }

  function lightning(intensity=1){
    if(!storm.enabled||disposed||unsafe())return;
    const l=get('lightning'),sky=get('stormSky'),glow=get('stormGlow');
    sky.innerHTML=makeBolt();
    sky.classList.remove('strike');void sky.offsetWidth;sky.classList.add('strike');
    const sx=12+Math.random()*76, sy=2+Math.random()*20;glow.style.setProperty('--sx',sx+'%');glow.style.setProperty('--sy',sy+'%');glow.classList.remove('hit');void glow.offsetWidth;glow.classList.add('hit');
    l.classList.remove('flash');void l.offsetWidth;l.classList.add('flash');


    playLightningThunder(intensity);

    // Éclair secondaire fréquent : petit rappel lumineux + grondement plus léger.
    if(Math.random()<.48)storm.later(()=>{
      if(!storm.enabled||disposed||unsafe())return;
      sky.innerHTML=makeBolt();sky.classList.remove('strike');void sky.offsetWidth;sky.classList.add('strike');
      l.classList.remove('flash');void l.offsetWidth;l.classList.add('flash');
      playLightningThunder(.58);
    },120+Math.random()*230);
  }

  function scheduleStorm(){
    // Orage beaucoup plus présent : un impact toutes les ~3,2 à 7,4 s.
    // De temps en temps, un mini-front orageux produit 2 à 4 éclairs rapprochés.
    storm.later(()=>{
      lightning(.88+Math.random()*.18);
      if(Math.random()<.18){
        const extra=1+Math.floor(Math.random()*3);
        for(let i=0;i<extra;i++)storm.later(()=>lightning(.58+Math.random()*.25),520+i*(430+Math.random()*420));
      }
      scheduleStorm();
    },3200+Math.random()*4200);
  }


  function releaseBatSwarm(){
    if(!ambience.enabled||disposed||unsafe())return;
    const host=get('batSwarm'),count=4+Math.floor(Math.random()*6);
    for(let i=0;i<count;i++){
      const b=document.createElement('span');b.className='bat-sil';
      b.style.setProperty('--s',(0.45+Math.random()*.95).toFixed(2));b.style.setProperty('--dur',(2.8+Math.random()*2.8).toFixed(2)+'s');
      b.style.setProperty('--y0',(5+Math.random()*55)+'vh');b.style.setProperty('--y1',(2+Math.random()*48)+'vh');b.style.setProperty('--y2',(8+Math.random()*60)+'vh');
      b.style.animationDelay=(i*.08+Math.random()*.25)+'s';host.appendChild(b);ambience.later(()=>b.classList.add('fly'),16);ambience.later(()=>b.remove(),6500);
    }
  }
  function dropEmbers(){
    if(!ambience.enabled||disposed||unsafe())return;
    const host=get('embers');
    for(let i=0;i<10;i++){const e=document.createElement('i');e.className='ember';e.style.left=(4+Math.random()*92)+'%';e.style.setProperty('--dur',(5+Math.random()*7)+'s');e.style.setProperty('--drift',(-45+Math.random()*90)+'px');e.style.animationDelay=(Math.random()*2)+'s';host.appendChild(e);ambience.later(()=>e.remove(),14000)}
  }
  function lurkerPeek(){if(!ambience.enabled||disposed||unsafe())return;const e=get('lurker');e.style.top=(22+Math.random()*48)+'%';e.classList.remove('peek');void e.offsetWidth;e.classList.add('peek')}
  function shadowCross(){if(!ambience.enabled||disposed||unsafe())return;const e=get('shadowPass');e.style.top=(8+Math.random()*45)+'vh';e.classList.remove('run');void e.offsetWidth;e.classList.add('run')}
  function hauntCard(){if(!ambience.enabled||disposed||unsafe())return;const cards=[...document.querySelectorAll('[data-seasonal-product]')];if(!cards.length)return;const c=cards[Math.floor(Math.random()*cards.length)];c.classList.remove('hw-haunt');void c.offsetWidth;c.classList.add('hw-haunt')}
  function ghostBetweenCards() {
    if (!ambience.enabled || disposed || unsafe() || host.querySelector('.hw-grid-ghost')) return;
    const images = [...document.querySelectorAll('[data-seasonal-product-image]')]
      .map(image => image.getBoundingClientRect())
      .filter(rect => rect.width > 0 && rect.top > 0 && rect.bottom < innerHeight && rect.right > 0 && rect.left < innerWidth);
    const first = images.find(rect => images.some(other => other !== rect
      && Math.abs(other.top - rect.top) < 20 && other.left > rect.left));
    if (!first) return;
    const second = images.find(rect => rect !== first && Math.abs(rect.top - first.top) < 20 && rect.left > first.left);
    if (!second) return;
    const ghost = document.createElement('span');
    ghost.className = 'hw-grid-ghost'; ghost.setAttribute('aria-hidden', 'true');
    ghost.style.left = (first.right - 32) + 'px';
    ghost.style.top = (first.top + first.height * .35) + 'px';
    ghost.style.setProperty('--ghost-travel', Math.min(150, second.left - first.right + 52) + 'px');
    host.appendChild(ghost);
    ambience.later(() => ghost.remove(), 4400);
  }
  function ghostLoop() {
    ambience.later(() => { ghostBetweenCards(); ghostLoop(); }, 12000 + Math.random() * 7000);
  }
  function ambienceLoop(){
    ambience.later(()=>{const r=Math.random();if(r<.34)releaseBatSwarm();else if(r<.56)lurkerPeek();else if(r<.72)shadowCross();else hauntCard();if(Math.random()<.55)dropEmbers();ambienceLoop()},6500+Math.random()*9000)
  }


  function playScarySound(){
    const ctx = armAudio('screamer');

    // Vraie voix féminine CC0, légèrement accélérée pour la rendre plus stridente.
    const real=get('realScream');
    if(real){
      try{
        real.pause();
        real.currentTime=0;
        real.volume=.92;
        real.playbackRate=1.08;
        try{real.preservesPitch=false}catch { /* Browser audio is optional. */ }
        real.play().catch(()=>{});
        screamer.cancel(real._stopTimer);
        real._stopTimer=screamer.later(()=>{try{real.pause();real.currentTime=0}catch { /* Browser audio is optional. */ }},2600);
      }catch { /* Browser audio is optional. */ }
    }

    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    // Bus master compressé : impact fort mais sans saturation numérique agressive.
    const master=ctx.createGain();
    master.gain.setValueAtTime(.0001,now);
    master.gain.exponentialRampToValueAtTime(.48,now+.008);
    master.gain.exponentialRampToValueAtTime(.16,now+.20);
    master.gain.exponentialRampToValueAtTime(.0001,now+2.55);
    const comp=ctx.createDynamicsCompressor();
    comp.threshold.value=-18;comp.knee.value=15;comp.ratio.value=8;comp.attack.value=.002;comp.release.value=.18;
    master.connect(comp);comp.connect(ctx.destination);
    screamer.later(() => { master.disconnect(); comp.disconnect(); }, 4000);

    // 1) CLAQUEMENT DE TONNERRE : bruit blanc très court et très brillant.
    const crackLen=Math.floor(ctx.sampleRate*.16), crackBuf=ctx.createBuffer(1,crackLen,ctx.sampleRate), crackData=crackBuf.getChannelData(0);
    for(let i=0;i<crackLen;i++){const t=i/crackLen;crackData[i]=(Math.random()*2-1)*Math.pow(1-t,2.7)}
    const crack=ctx.createBufferSource(), crackHP=ctx.createBiquadFilter(), crackGain=ctx.createGain();
    crack.buffer=crackBuf;crackHP.type='highpass';crackHP.frequency.value=900;crackGain.gain.setValueAtTime(.95,now);crackGain.gain.exponentialRampToValueAtTime(.0001,now+.14);
    crack.connect(crackHP);crackHP.connect(crackGain);crackGain.connect(master);crack.start(now);

    // 2) COUP DE FOUDRE / IMPACT SUB : descente brutale 74 -> 29 Hz.
    const boom=ctx.createOscillator(), boomGain=ctx.createGain();
    boom.type='sine';boom.frequency.setValueAtTime(74,now);boom.frequency.exponentialRampToValueAtTime(29,now+.72);
    boomGain.gain.setValueAtTime(.78,now);boomGain.gain.exponentialRampToValueAtTime(.0001,now+1.05);
    boom.connect(boomGain);boomGain.connect(master);boom.start(now);boom.stop(now+1.1);

    // 3) ROULEMENT D'ORAGE : bruit grave filtré, irrégulier, qui survit au flash.
    const rumbleLen=Math.floor(ctx.sampleRate*2.45), rumbleBuf=ctx.createBuffer(1,rumbleLen,ctx.sampleRate), rumbleData=rumbleBuf.getChannelData(0);
    let last=0;
    for(let i=0;i<rumbleLen;i++){
      const t=i/rumbleLen;
      const white=Math.random()*2-1;
      last=last*.94+white*.06;
      const pulse=.72+.28*Math.sin(i/ctx.sampleRate*2*Math.PI*7.3);
      rumbleData[i]=last*pulse*Math.pow(1-t,.72);
    }
    const rumble=ctx.createBufferSource(), rumbleLP=ctx.createBiquadFilter(), rumbleGain=ctx.createGain();
    rumble.buffer=rumbleBuf;rumbleLP.type='lowpass';rumbleLP.frequency.setValueAtTime(480,now);rumbleLP.frequency.exponentialRampToValueAtTime(115,now+2.2);
    rumbleGain.gain.setValueAtTime(.62,now+.02);rumbleGain.gain.exponentialRampToValueAtTime(.0001,now+2.4);
    rumble.connect(rumbleLP);rumbleLP.connect(rumbleGain);rumbleGain.connect(master);rumble.start(now);

    // 4) Petit sifflement aigu sur l'attaque pour prolonger le côté strident de la voix.
    [1180,1670,2380].forEach((f,i)=>{
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.type='sawtooth';o.frequency.setValueAtTime(f,now);o.frequency.exponentialRampToValueAtTime(f*1.42,now+.42);
      g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.045/(i+1),now+.015);g.gain.exponentialRampToValueAtTime(.0001,now+.72);
      o.connect(g);g.connect(master);o.start(now);o.stop(now+.75);
    });
  }


  function stopStorm() {
    storm.stop(); closeAudio('storm');
    ['lightning', 'stormSky', 'stormGlow'].forEach(id => get(id)?.classList.remove('flash', 'strike', 'hit'));
    get('stormSky')?.replaceChildren();
  }
  function stopAmbience() {
    ambience.stop();
    document.removeEventListener('pointerover', teaseProduct);
    document.removeEventListener('pointerdown', teaseProduct);
    cardSpiders.forEach(({ node }) => node.remove()); cardSpiders.clear();
    host.querySelectorAll('.bat-sil,.ember,.hw-grid-ghost').forEach(node => node.remove());
    get('lurker')?.classList.remove('peek'); get('shadowPass')?.classList.remove('run');
    document.querySelectorAll('[data-seasonal-product].hw-haunt').forEach(card => card.classList.remove('hw-haunt'));
  }
  function stopScreamer(pause) {
    const consumed = showing && seen();
    if (pause && screamDeadline !== null && !showing) remaining = Math.max(0, screamDeadline - Date.now());
    if (!pause) remaining = null;
    screamer.stop(); autoTimer = null; screamDeadline = null; showing = false;
    const real = screamMedia || get('realScream');
    screamMedia = null;
    if (real) {
      try { real.pause(); real.currentTime = 0; real.removeAttribute('src'); real.load(); }
      catch { /* Cleanup of an unsupported media element must not keep synthesis alive. */ }
    }
    get('screamer')?.classList.remove('on', 'fade');
    host.removeAttribute('data-screaming'); closeAudio('screamer');
    if (consumed && !disposed) onConsumed();
  }
  function showScreamer() {
    if (disposed || !screamer.enabled || suspended || !userActivated || seen()) return;
    if (unsafe()) { remaining = 0; return; }
    const s = get('screamer');
    if (!s) return;
    try {
      if (localStorage.getItem(seenKey)) return;
      localStorage.setItem(seenKey, String(Date.now()));
    } catch { return; }
    showing = true; host.setAttribute('data-screaming', '');
    const real = get('realScream');
    if (real) { screamMedia = real; real.src = real.dataset.src; }
    s.classList.add('on'); playScarySound();
    screamer.later(() => s.classList.add('fade'), 1420);
    screamer.later(() => { s.classList.remove('on', 'fade'); host.removeAttribute('data-screaming'); }, 1610);
    screamer.later(() => { showing = false; onConsumed(); }, 4000);
  }
  function scream() {
    autoTimer = null; screamDeadline = null;
    const generation = screamer.generation;
    const show = () => { if (generation === screamer.generation) showScreamer(); };
    if (navigator.locks) void navigator.locks.request(seenKey, show).catch(() => {});
    else show();
  }
  function scheduleScreamer() {
    if (!screamer.enabled || !userActivated || seen() || autoTimer !== null || showing) return;
    const delay = remaining ?? (25000 + Math.random() * 25000);
    remaining = null; screamDeadline = Date.now() + delay;
    autoTimer = screamer.later(scream, delay);
  }
  function activate(event) {
    if (!event.isTrusted || suspended || unsafe()) return;
    userActivated = true;
    // Retry audio unlock on later real gestures if the browser refused a resume.
    if (storm.enabled) armAudio('storm');
    if (screamer.enabled) { armAudio('screamer'); scheduleScreamer(); }
  }
  const events = ['pointerdown', 'keydown'];
  events.forEach(event => window.addEventListener(event, activate, { passive: true }));
  return {
    /** Updating one flag never restarts another active subsystem.
     * @param {{storm:boolean,ambience:boolean,autoScreamer:boolean}} next
     * @param {boolean} nextSuspended
     */
    update(next, nextSuspended = false) {
      const previous = requested;
      requested = next; suspended = nextSuspended;
      if (!next.autoScreamer && previous.autoScreamer) remaining = null;
      const wantStorm = next.storm && !suspended;
      const wantAmbience = next.ambience && !suspended;
      const wantScreamer = next.autoScreamer && !suspended;
      if (wantStorm !== storm.enabled) {
        if (wantStorm) { storm.start(); scheduleStorm(); }
        else stopStorm();
      }
      if (wantAmbience !== ambience.enabled) {
        if (wantAmbience) {
          ambience.start();
          document.addEventListener('pointerover', teaseProduct, { passive: true });
          document.addEventListener('pointerdown', teaseProduct, { passive: true });
          ambience.later(() => { releaseBatSwarm(); dropEmbers(); ambienceLoop(); }, 1800);
          ambience.later(() => { ghostBetweenCards(); ghostLoop(); }, 3800);
        } else stopAmbience();
      }
      if (wantScreamer !== screamer.enabled) {
        if (wantScreamer) { screamer.start(); scheduleScreamer(); }
        else stopScreamer(next.autoScreamer && suspended);
      }
    },
    dispose() {
      disposed = true; stopStorm(); stopAmbience(); stopScreamer(false);
      events.forEach(event => window.removeEventListener(event, activate));
    },
  };
}
