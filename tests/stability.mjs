// Run: node --experimental-default-type=module tests/stability.mjs
import { DISHES, STEP, CHOP_SECONDS } from '../game/src/config.js';
import { createKitchen, dishForPlate } from '../game/src/kitchen.js';
import { createRandom } from '../game/src/random.js';
import { createChef } from '../game/src/chef.js';
import { createInput } from '../game/src/input.js';
function makeInput(window, ce={}) { globalThis.window=window; return createInput({addEventListener(n,f){ce[n]=f},getBoundingClientRect(){return {left:0,top:0,width:1280,height:720}}}); }

function assert(ok, name) { if (!ok) throw Error(name); }
function check() {
 const results = [];
 const run=(name, f)=>{try{f();results.push({name,pass:true})}catch(e){results.push({name,pass:false,error:e.message})}};
 const make=()=>[createKitchen(createRandom(7)),createChef()];
 run('completed plate cannot accept extra ingredient',()=>{const [k,c]=make();c.x=1000;c.y=550;for(const [ingredient,state] of [['tomato','chopped'],['lettuce','chopped'],['cheese','ready']]){c.carrying={type:'ingredient',ingredient,state};k.interact(c)}assert(k.state.plate.length===2 && k.state.plateDish.id==='salad' && c.carrying.ingredient==='cheese','completed plate altered')});
 run('invalid extra ingredient never creates stale recipe identity',()=>{const [k,c]=make();c.x=1000;c.y=550;for(const [ingredient,state] of [['tomato','chopped'],['lettuce','chopped'],['cheese','ready']]){c.carrying={type:'ingredient',ingredient,state};k.interact(c)}assert(k.state.plateDish===dishForPlate(k.state.plate),'plate identity disagrees with ingredients')});
 run('closing spawn requires time to prepare',()=>{const [k]=make();k.state.timeLeft=11;k.state.orderTimer=0;k.step(STEP);assert(k.state.orders.length===0,'late ticket spawned')});
 run('retry clears visual pings',()=>{const [k]=make();k.state.pings.push({life:1});k.startDay(1);assert(k.state.pings.length===0,'stale ping')});
 run('movement aliases independent',()=>{const events={};const window={addEventListener:(n,f)=>events[n]=f};const i=makeInput(window);const e=code=>({code,preventDefault(){}});events.keydown(e('KeyW'));events.keydown(e('ArrowUp'));events.keyup(e('KeyW'));assert(i.direction().y===-1,'other held key lost');events.keyup(e('ArrowUp'));assert(i.direction().y===0,'key stuck')});
 run('blur discards pending actions and clicks',()=>{const events={},ce={};const window={addEventListener:(n,f)=>events[n]=f};const i=makeInput(window,ce);events.keydown({code:'KeyE',preventDefault(){}});ce.pointerdown({clientX:10,clientY:10});events.blur();assert(i.takeActions()===0&&i.takeClick()===null,'stale input')});
 run('end stops other gameplay mutations in same tick',()=>{const [k]=make();k.state.hearts=1;k.state.orders=[{dish:DISHES[0],patience:0.001}];k.state.board={item:{ingredient:'tomato',state:'raw'},progress:CHOP_SECONDS-0.001};k.step(STEP);assert(k.state.dayOver&&k.state.board.item.state==='raw','cooked after end')});
 return results;
}

const results=check(); for(const result of results) console.log(result.pass?'PASS':'FAIL',result.name,result.error||''); if(results.some(r=>!r.pass)) process.exitCode=1;
