// Run: node --experimental-default-type=module tests/screen-flow.mjs
import { readFileSync } from 'node:fs';
const clean=s=>s.replace(/import\s+[\s\S]*?\s+from\s+['"][^'"]+['"];\s*/g,"").replace(/\bexport\s+(?=const|function|let|class)/g,"");
const read=n=>readFileSync(new URL('../game/src/'+n+'.js',import.meta.url),'utf8');

function probe(main,kernel) {
 const events={},store={};let raf,now=0,sizzle=-1;
 const canvas={addEventListener(){},getBoundingClientRect(){return {left:0,top:0,width:1280,height:720}}};
 const window={location:{search:'?seed=1'},addEventListener(n,f){events[n]=f},localStorage:{getItem:k=>store[k],setItem:(k,v)=>store[k]=v}};
 const document={getElementById:id=>id==='game'?canvas:{},addEventListener(){}};
 const requestAnimationFrame=f=>{raf=f};const performance={now:()=>now};
 const createRenderer=()=>({draw(){}}),createParticles=()=>({burst(){},steam(){},coins(){},step(){}});
 const createAudio=()=>new Proxy({setSizzle:v=>{sizzle=v},isMuted:()=>false},{get:(o,k)=>o[k]||(()=>{})});
 const SCREEN_TITLE='title',SCREEN_PLAY='play',SCREEN_PAUSED='paused',SCREEN_DAY='day',SCREEN_OVER='over',DAY_BUTTONS={};
 const URLSearchParams=class{get(k){return k==='seed'?'1':null}};
 const tick=()=>{now+=20;raf(now)};const key=code=>{events.keydown({code,preventDefault(){}});tick()};
 new Function('window','document','requestAnimationFrame','performance','createRenderer','createParticles','createAudio','SCREEN_TITLE','SCREEN_PLAY','SCREEN_PAUSED','SCREEN_DAY','SCREEN_OVER','DAY_BUTTONS','URLSearchParams',kernel+'\n'+main)(window,document,requestAnimationFrame,performance,createRenderer,createParticles,createAudio,SCREEN_TITLE,SCREEN_PLAY,SCREEN_PAUSED,SCREEN_DAY,SCREEN_OVER,DAY_BUTTONS,URLSearchParams);
 key('Enter');const game=window.__game,s=game.kitchen.state;s.grill[0]={item:{ingredient:'corn',state:'raw'},progress:0,burnTimer:0};key('KeyP');const paused=sizzle===0;key('KeyP');game.kitchen.startDay(3);s.score=42;s.timeLeft=0.001;tick();const final=game.getScreen()==='day';key('KeyR');const retry=game.getScreen()==='play'&&s.day===3&&!s.gameOver&&s.total===0;return {paused,final,retry};
}
const result=probe(clean(read('main')),['config','kitchen','random','chef','input'].map(n=>clean(read(n))).join('\n'));
console.log(result); if(!result.paused||!result.final||!result.retry) process.exitCode=1;
