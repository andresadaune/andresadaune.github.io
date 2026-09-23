const scene=document.querySelector('.experience');
const canvas=document.querySelector('#flow');
const ctx=canvas.getContext('2d',{alpha:true});
const enter=document.querySelector('#enter');
const soundButton=document.querySelector('#sound');
const soundHint=document.querySelector('#sound-hint');
const embedded=new URLSearchParams(location.search).has('embedded');
let width=0,height=0,dpr=1,centerX=0,centerY=0,started=performance.now(),merging=false,anticipating=false,finished=false,beatStrength=0;
let raf=0,particles=[];

function resize(){
  width=innerWidth;height=innerHeight;dpr=Math.min(devicePixelRatio||1,width<700?1.4:1.8);
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  canvas.style.width=width+'px';canvas.style.height=height+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
  centerX=width*(width<780?.51:.67);centerY=height*(width<780?.53:.52);
  scene.style.setProperty('--core-x',`${centerX/width*100}%`);scene.style.setProperty('--core-y',`${centerY/height*100}%`);
  const count=width<780?62:140;
  particles=Array.from({length:count},(_,i)=>({side:i%2,u:Math.random(),speed:.075+Math.random()*.105,offset:(Math.random()-.5)*90,size:.8+Math.random()*1.8,alpha:.46+Math.random()*.45,seed:Math.random()*6.28}));
}
addEventListener('resize',resize,{passive:true});resize();
function bezier(a,b,c,d,t){const inv=1-t;return inv*inv*inv*a+3*inv*inv*t*b+3*inv*t*t*c+t*t*t*d}
function point(side,t,offset){
  const mobile=width<780;
  const startX=side?width*1.13:-width*.13;
  const y0=side?height*(mobile?.21:.14):height*(mobile?.81:.86);
  return {
    x:bezier(startX,side?width*.87:width*.20,side?centerX+width*.17:centerX-width*.20,centerX,t),
    y:bezier(y0,side?height*(mobile?.13:.04):height*(mobile?.77:.98),centerY+(side?-height*.25:height*.25),centerY,t)+offset*(1-t)
  };
}
function approachLimit(){
  const elapsed=(performance.now()-started)/1000;
  const t=Math.max(0,Math.min(1,(elapsed-1.4)/5.8));
  return .52+.48*t*t*(3-2*t);
}
function strokeStream(side,time,limit){
  for(let strand=0;strand<4;strand++){
    const offset=(strand-1)*33+Math.sin(time*.00035+strand+side)*12;
    ctx.beginPath();
    for(let i=0;i<=38;i++){const t=i/38*limit,p=point(side,t,offset*(1-t));if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y)}
    const g=ctx.createLinearGradient(side?width:0,0,centerX,centerY);
    g.addColorStop(0,'rgba(238,177,148,0)');g.addColorStop(.48,side?'rgba(188,213,181,.19)':'rgba(238,177,148,.22)');g.addColorStop(1,'rgba(245,225,207,.12)');
    if(strand===1){
      const bloom=ctx.createLinearGradient(side?width:0,0,centerX,centerY);
      bloom.addColorStop(0,'rgba(255,245,225,0)');bloom.addColorStop(.5,side?'rgba(170,225,195,.026)':'rgba(255,174,131,.036)');bloom.addColorStop(1,'rgba(255,235,215,.055)');
      ctx.strokeStyle=bloom;ctx.lineWidth=width<780?20:35;ctx.stroke();
    }
    ctx.strokeStyle=g;ctx.lineWidth=strand===1?1.6:.85;ctx.stroke();
  }
}
function frame(now){
  ctx.clearRect(0,0,width,height);
  const time=(now-started)/1000;
  beatStrength*=.9;
  ctx.globalCompositeOperation='screen';
  const auraRadius=Math.min(width,height)*(width<780?.39:.43);
  const aura=ctx.createRadialGradient(centerX,centerY,0,centerX,centerY,auraRadius);
  aura.addColorStop(0,`rgba(235,200,166,${.035+beatStrength*.045})`);aura.addColorStop(.5,'rgba(181,199,176,.017)');aura.addColorStop(1,'rgba(181,199,176,0)');
  ctx.fillStyle=aura;ctx.fillRect(centerX-auraRadius,centerY-auraRadius,auraRadius*2,auraRadius*2);
  const limit=approachLimit();
  strokeStream(0,now,limit);strokeStream(1,now,limit);
  for(const p of particles){
    if(!merging)p.u=(p.u+p.speed*(anticipating?1.8:1)/60)%1;
    else p.u=Math.min(1,p.u+.011);
    if(p.u>.985)continue;
    const streamU=p.u*limit;
    const q=point(p.side,streamU,p.offset+Math.sin(now*.0018+p.seed)*5*(1-streamU));
    const head=1-Math.abs(.5-p.u)*1.15;
    const alpha=p.alpha*Math.max(0,head)*(merging?1.5:1+beatStrength*.65);
    const color=p.side?'185,219,190':'247,185,148';
    const radius=p.size*(1+p.u*.5);
    const glow=ctx.createRadialGradient(q.x,q.y,0,q.x,q.y,radius*5.8);
    glow.addColorStop(0,`rgba(255,246,226,${alpha})`);
    glow.addColorStop(.18,`rgba(${color},${alpha*.68})`);
    glow.addColorStop(1,`rgba(${color},0)`);
    ctx.fillStyle=glow;ctx.beginPath();ctx.arc(q.x,q.y,radius*5.8,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=`rgba(255,249,239,${alpha*.86})`;ctx.beginPath();ctx.arc(q.x,q.y,Math.max(.5,radius*.42),0,Math.PI*2);ctx.fill();
    if(p.u>.2){const prev=point(p.side,Math.max(0,streamU-.05),p.offset);ctx.beginPath();ctx.moveTo(prev.x,prev.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle=`rgba(${color},${alpha*.4})`;ctx.lineWidth=radius*.56;ctx.stroke()}
  }
  ctx.globalCompositeOperation='source-over';
  if(!finished)raf=requestAnimationFrame(frame);
}
raf=requestAnimationFrame(frame);

let timers=[];
function later(fn,ms){timers.push(setTimeout(fn,ms))}
function cue(){
  scene.className='experience';merging=false;anticipating=false;finished=false;beatStrength=0;started=performance.now();resize();
  cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);
  later(()=>scene.classList.add('show-first'),800);
  later(()=>scene.classList.add('show-line-one'),1500);
  later(()=>scene.classList.add('show-line-two'),2600);
  later(()=>scene.classList.add('show-line-three'),3700);
  later(()=>scene.classList.add('show-core'),4100);
  later(()=>scene.classList.add('is-united'),7000);
  later(()=>{scene.classList.add('is-breathing');startHeartbeat()},7700);
  later(()=>scene.classList.add('show-second'),8900);
  later(()=>scene.classList.add('show-button'),11400);
}
cue();

/* The site's original heartbeat, low pad and rising chord, adapted for this draft. */
let audio=null,master=null,padGain=null,padFilter=null,pulseNoise=null,heartbeatId=0,secondPulseTimer=0,muted=false,audioStarted=false;
const streamVoices=[];
function startAudio(){
  if(!audio){
    const AudioCtor=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtor)return;
    audio=new AudioCtor();master=audio.createGain();master.gain.value=0;
    const limiter=audio.createDynamicsCompressor();limiter.threshold.value=-18;limiter.knee.value=18;limiter.ratio.value=3.5;limiter.attack.value=.008;limiter.release.value=.25;
    master.connect(limiter).connect(audio.destination);
    padFilter=audio.createBiquadFilter();padFilter.type='lowpass';padFilter.frequency.value=420;
    padGain=audio.createGain();padGain.gain.value=0;padFilter.connect(padGain).connect(master);
    [[110,.5],[165.4,.32],[220.6,.20]].forEach(([freq,vol])=>{const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.value=freq;gain.gain.value=vol*.05;osc.connect(gain).connect(padFilter);osc.start()});
    const lfo=audio.createOscillator(),lfoGain=audio.createGain();lfo.frequency.value=.07;lfoGain.gain.value=160;lfo.connect(lfoGain).connect(padFilter.frequency);lfo.start();
    [[196,-.65,'sine'],[293.66,.65,'triangle']].forEach(([freq,pan,wave],index)=>{
      const osc=audio.createOscillator(),gain=audio.createGain(),stereo=audio.createStereoPanner();
      osc.type=wave;osc.frequency.value=freq;gain.gain.value=index?.008:.012;stereo.pan.value=pan;
      osc.connect(gain).connect(stereo).connect(master);osc.start();streamVoices.push({gain,stereo,pan});
    });
    pulseNoise=audio.createBuffer(1,Math.ceil(audio.sampleRate*.11),audio.sampleRate);
    const samples=pulseNoise.getChannelData(0);
    for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*Math.pow(1-i/samples.length,2);
  }
  if(audio.state==='suspended')audio.resume().catch(()=>{});
  if(audioStarted)return;
  audioStarted=true;
  const t=audio.currentTime;
  master.gain.setTargetAtTime(muted?0:.9,t,.3);
  padGain.gain.cancelScheduledValues(t);padGain.gain.setValueAtTime(0,t);padGain.gain.linearRampToValueAtTime(1,t+4);
}
function thump(at,freq,vol,duration){
  if(!audio)return;
  [[1,1,'sine'],[2,.2,'triangle'],[3,.06,'sine']].forEach(([mult,amount,wave])=>{
    const osc=audio.createOscillator(),gain=audio.createGain();osc.type=wave;
    osc.frequency.setValueAtTime(freq*mult,at);osc.frequency.exponentialRampToValueAtTime(freq*mult*.55,at+duration);
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(vol*amount,at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    osc.connect(gain).connect(master);osc.start(at);osc.stop(at+duration+.05);
  });
  if(pulseNoise){
    const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();
    source.buffer=pulseNoise;filter.type='lowpass';filter.frequency.value=420;
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(vol*.085,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+.1);
    source.connect(filter).connect(gain).connect(master);source.start(at);source.stop(at+.11);
  }
}
function pulseVisual(which){
  beatStrength=which==='first'?1:.66;
  const ring=document.querySelector('.visual__pulse--'+which);
  ring.classList.remove('is-pulsing');void ring.offsetWidth;ring.classList.add('is-pulsing');
  scene.classList.remove('beat-first','beat-second');scene.classList.add('beat-'+which);
}
function heartbeat(){
  pulseVisual('first');
  if(audio?.state==='running'&&!muted){const t=audio.currentTime+.02;thump(t,58,.45,.24);thump(t+.30,46,.29,.30)}
  clearTimeout(secondPulseTimer);secondPulseTimer=setTimeout(()=>pulseVisual('second'),300);
}
function stopHeartbeat(){clearInterval(heartbeatId);heartbeatId=0;clearTimeout(secondPulseTimer);secondPulseTimer=0;scene.classList.remove('beat-first','beat-second')}
function startHeartbeat(){
  stopHeartbeat();heartbeat();heartbeatId=setInterval(heartbeat,1150);
}
function convergenceSound(){
  startAudio();if(!audio)return;
  stopHeartbeat();
  const t=audio.currentTime,len=Math.floor(audio.sampleRate*2.3),buffer=audio.createBuffer(1,len,audio.sampleRate),data=buffer.getChannelData(0);
  padFilter.frequency.cancelScheduledValues(t);padFilter.frequency.setValueAtTime(padFilter.frequency.value,t);padFilter.frequency.exponentialRampToValueAtTime(650,t+2.15);
  streamVoices.forEach(({gain,stereo})=>{stereo.pan.cancelScheduledValues(t);stereo.pan.linearRampToValueAtTime(0,t+2.1);gain.gain.setValueAtTime(gain.gain.value,t);gain.gain.linearRampToValueAtTime(.017,t+1.85);gain.gain.linearRampToValueAtTime(0,t+2.9)});
  for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*Math.pow(i/len,1.5);
  const noise=audio.createBufferSource(),filter=audio.createBiquadFilter(),rise=audio.createGain();
  noise.buffer=buffer;filter.type='lowpass';filter.Q.value=.35;filter.frequency.setValueAtTime(150,t);filter.frequency.exponentialRampToValueAtTime(750,t+2.05);
  rise.gain.setValueAtTime(.001,t);rise.gain.linearRampToValueAtTime(.28,t+1.95);rise.gain.linearRampToValueAtTime(.001,t+2.4);
  noise.connect(filter).connect(rise).connect(master);noise.start(t);
  const hit=t+2.2;
  thump(hit,52,.55,.65);
  [110,164.81,220,261.63,329.63].forEach((freq,i)=>{
    const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.value=freq;
    gain.gain.setValueAtTime(0,hit);gain.gain.linearRampToValueAtTime(.14-i*.022,hit+.12);gain.gain.exponentialRampToValueAtTime(.0001,hit+5.5);
    osc.connect(gain).connect(master);osc.start(hit);osc.stop(hit+5.6);
  });
  padGain.gain.cancelScheduledValues(hit);padGain.gain.setValueAtTime(padGain.gain.value,hit);padGain.gain.linearRampToValueAtTime(0,hit+9);
}
function setMuted(next){muted=next;soundButton.classList.toggle('is-muted',muted);soundButton.setAttribute('aria-pressed',String(!muted));soundButton.setAttribute('aria-label',muted?'Ton einschalten':'Ton ausschalten');if(master)master.gain.setTargetAtTime(muted?0:.9,audio.currentTime,.1)}
function updateSoundHint(){const blocked=audio?.state==='suspended'&&!muted;soundHint.classList.toggle('show',blocked);soundButton.setAttribute('aria-label',blocked||muted?'Ton einschalten':'Ton ausschalten');soundButton.setAttribute('aria-pressed',String(!blocked&&!muted))}
startAudio();
setTimeout(updateSoundHint,2500);
soundButton.addEventListener('click',()=>{if(audio?.state==='suspended'){audio.resume().then(updateSoundHint).catch(updateSoundHint);setMuted(false)}else{startAudio();setMuted(!muted);updateSoundHint()}});
addEventListener('pointerdown',e=>{if(e.target.closest('#sound'))return;if(audio?.state==='suspended'&&!muted)audio.resume().then(updateSoundHint).catch(updateSoundHint)},{passive:true});

function flyToLogo(){
  const dot=document.querySelector('.brand span');const light=document.querySelector('#flying-light');
  const to=dot.getBoundingClientRect();const from={x:centerX,y:centerY};
  light.style.opacity='1';
  const anim=light.animate([
    {transform:`translate(${from.x-9}px,${from.y-9}px) scale(1)`,opacity:1},
    {transform:`translate(${(from.x+to.left)/2-9}px,${Math.min(from.y,to.top)-110}px) scale(.7)`,opacity:1,offset:.6},
    {transform:`translate(${to.left+to.width/2-9}px,${to.top+to.height/2-9}px) scale(.35)`,opacity:1}
  ],{duration:1050,easing:'cubic-bezier(.22,.7,.18,1)',fill:'forwards'});
  anim.onfinish=()=>{scene.classList.add('is-lit');light.style.opacity='0';anim.cancel()};
}
enter.addEventListener('click',()=>{
  if(merging||anticipating)return;
  startAudio();anticipating=true;scene.classList.add('is-anticipating');
  const finalBeat=()=>{
    stopHeartbeat();heartbeat();
    later(()=>{
      convergenceSound();anticipating=false;merging=true;scene.classList.add('is-merging');
      later(()=>scene.classList.add('is-impact'),2200);
      later(flyToLogo,2330);
      later(()=>{
        finished=true;cancelAnimationFrame(raf);
        if(embedded)window.parent.postMessage({type:'morgen-intro-complete'},location.origin);
        else scene.classList.add('is-done');
      },3450);
    },760);
  };
  if(audio?.state==='suspended'){
    let fired=false;const proceed=()=>{if(fired)return;fired=true;updateSoundHint();finalBeat()};
    audio.resume().then(proceed).catch(proceed);later(proceed,500);
  }else finalBeat();
});
function replay(){timers.forEach(clearTimeout);timers=[];stopHeartbeat();setMuted(false);if(audio){const t=audio.currentTime;padGain.gain.cancelScheduledValues(t);padGain.gain.setValueAtTime(0,t);padGain.gain.linearRampToValueAtTime(1,t+3);padFilter.frequency.cancelScheduledValues(t);padFilter.frequency.setValueAtTime(420,t);streamVoices.forEach(({gain,stereo,pan},i)=>{gain.gain.cancelScheduledValues(t);gain.gain.setValueAtTime(i?.008:.012,t);stereo.pan.cancelScheduledValues(t);stereo.pan.setValueAtTime(pan,t)})}cue()}
document.querySelector('#replay').addEventListener('click',replay);
document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();replay()});
if(matchMedia('(prefers-reduced-motion:reduce)').matches){timers.forEach(clearTimeout);scene.classList.add('show-first','show-line-one','show-line-two','show-line-three','show-core','is-united','show-second','show-button')}
