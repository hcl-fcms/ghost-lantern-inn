'use strict';
const $=id=>document.getElementById(id);
const dishes=[{name:'忘憂湯',icon:'♨',cost:4,price:14,seconds:3},{name:'月影糰子',icon:'◉',cost:7,price:22,seconds:4},{name:'彼岸花羹',icon:'❀',cost:10,price:30,seconds:5}];
const ghosts=[['紙傘客','#cdd7b7'],['夜行書生','#b0d1ce'],['赤面山鬼','#df997d'],['月下狐靈','#d5b8d0'],['渡河小鬼','#9dc5b1'],['迷途燈靈','#e1c88e']];
const key='lantern-inn-v1';let selected=-1,muted=true,ctx,last=performance.now(),dirty=0;
function fresh(){return {version:1,night:1,money:80,rep:60,served:0,stove:0,decor:0,time:75,phase:'ready',guests:Array(6).fill(null),spawn:0,nightEarned:0,nightServed:0,log:'老掌櫃留下一封信：「記住，鬼也會肚餓。」'};}
let s=fresh();try{const v=JSON.parse(localStorage.getItem(key));if(v&&v.version===1&&Number.isFinite(v.money)&&v.money>=0&&v.night>=1&&v.night<=7&&Array.isArray(v.guests)&&v.guests.length===6&&['ready','running','paused','ended'].includes(v.phase)&&Number.isFinite(v.rep)&&Number.isFinite(v.time)&&Number.isInteger(v.stove)&&v.stove>=0&&v.stove<=3&&Number.isInteger(v.decor)&&v.decor>=0&&v.decor<=3){s=v;if(s.phase==='running')s.phase='paused';}}catch{}
function save(){try{localStorage.setItem(key,JSON.stringify(s));$('save').textContent='本機自動存檔';}catch{$('save').textContent='此瀏覽器無法存檔';}}
function tone(){if(muted)return;try{ctx ||= new (window.AudioContext||window.webkitAudioContext)();ctx.resume();const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=523;o.type='sine';g.gain.setValueAtTime(.06,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.2);o.connect(g).connect(ctx.destination);o.start();o.stop(ctx.currentTime+.2);}catch{}}
function log(t){s.log=t;}
function modal(title,body){$('modal-title').textContent=title;$('modal-body').innerHTML=body;$('modal').showModal();}
function render(){
 renderInteraction();
 $('night').textContent=`${s.night} / 7`;$('money').textContent=s.money;$('rep').textContent=`${s.rep} / 100`;$('served').textContent=s.served;$('time').textContent=`${Math.ceil(s.time)} 秒`;
 $('status').textContent={ready:'準備開門',running:'燈火正盛',paused:'暫停營業',ended:'七夜落幕'}[s.phase];$('pause').disabled=!['running','paused'].includes(s.phase);$('pause').textContent=s.phase==='paused'?'繼續':'暫停';$('start').hidden=s.phase!=='ready';$('start').textContent=`點燈 · 開始第 ${s.night} 夜`;$('log').textContent=s.log;
 s.guests.forEach((g,i)=>{
 const b=$('tables').children[i];b.disabled=!g;b.className='table '+(selected===i?'selected':'');
 b.setAttribute('aria-label',g?`${ghosts[g.type][0]}，${g.ready?'可上菜':dishes[g.dish].name}`:`空桌 ${i+1}`);
 b.querySelector('.guest').hidden=!g;b.querySelector('.guest').style.setProperty('--ghost',g?ghosts[g.type][1]:'#fff');
 b.querySelector('.guest').dataset.type=g?g.type:0;
 b.querySelector('.guest-name').textContent=g?ghosts[g.type][0]:`第 ${i+1} 席`;
 b.querySelector('.order').textContent=g?(g.ready?'♨ 點選後上菜':g.cook?`灶火 ${Math.ceil(g.cook.left)} 秒`:dishes[g.dish].name):'虛位以待';
 b.querySelector('.patience i').style.width=g?`${Math.max(0,g.patience/g.max*100)}%`:'0%';
 b.classList.toggle('ready-dish',!!g?.ready);b.classList.toggle('urgent',!!g&&g.patience<8);
 });
 const guest=s.guests[selected];$('hint').textContent=s.phase==='ended'?'七夜已結算。可重開新局挑戰不同經營策略。':guest?`已選：${ghosts[guest.type][0]} · 想吃${dishes[guest.dish].name}${guest.cook?' · 灶火正旺，請稍候':''}`:'先點客堂的鬼客，再到灶房選對菜式。';
 [...$('recipes').children].forEach((b,i)=>{b.disabled=s.phase!=='running'||s.event!=null||!guest||!!guest.cook||!!guest.ready||s.money<dishes[i].cost;});
 for(const [id,label,base] of [['stove','升級灶火',45],['decor','添置幽燈',35]]){$(id).textContent=s[id]>=3?`${label} · 已滿級`:`${label} Lv.${s[id]+1} · ${base*(s[id]+1)} 冥錢` ;$(id).disabled=s[id]>=3||s.money<base*(s[id]+1)||s.phase==='ended';}
}
$('recipes').innerHTML=dishes.map((d,i)=>`<button class="recipe" data-dish="${i}"><span class="dish">${d.icon}</span><span><strong>${d.name}</strong><small>食材 ${d.cost} · 售價 ${d.price} · ${d.seconds+2} 秒</small></span></button>`).join('');
$('tables').innerHTML=Array.from({length:6},(_,i)=>`<button class="table" data-seat="${i}"><span class="guest" hidden></span><span class="guest-name"></span><span class="order"></span><span class="patience"><i></i></span></button>`).join('');
$('tables').onclick=e=>{const b=e.target.closest('[data-seat]');if(b){selected=Number(b.dataset.seat);tone();render();}};
$('recipes').onclick=e=>{const b=e.target.closest('[data-dish]');if(!b||b.disabled)return;const d=Number(b.dataset.dish),g=s.guests[selected];if(s.phase!=='running'||s.event!=null||!g||g.cook||g.ready||s.money<dishes[d].cost)return;s.money-=dishes[d].cost;g.cook={dish:d,left:Math.max(2.5,dishes[d].seconds+2-s.stove*.7)};g.cook.total=g.cook.left;g.heatUsed=false;g.perfect=false;feedback("灶火燃起 · 留意金色火候區");log(`灶房正為${ghosts[g.type][0]}準備${dishes[d].name}。`);save();render();};
for(const [id,base] of [['stove',45],['decor',35]]){$(id).onclick=()=>{const cost=base*(s[id]+1);if(s[id]>=3||s.money<cost||s.phase==='ended')return;s.money-=cost;s[id]++;log(id==='stove'?'灶火升級！每道菜烹調時間縮短。':'幽燈添置！新到鬼客多等候 5 秒。');save();render();};}
function spawn(){const i=s.guests.indexOf(null);if(i<0)return;const max=32+s.decor*5; s.guests[i]={type:Math.floor(Math.random()*ghosts.length),dish:Math.floor(Math.random()*dishes.length),patience:max,max,cook:null};}
$('start').onclick=()=>{if(s.phase!=='ready')return;s.phase='running';s.time=75;s.nightEarned=0;s.nightServed=0;s.spawn=6;s.event=null;s.eventDone=false;spawn();log(`第 ${s.night} 夜開門。今夜店租 ${12+s.night*3} 冥錢；終局目標：招待 35 位、口碑 70。`);save();render();};
function pause(){if(s.phase==='running')s.phase='paused';else if(s.phase==='paused')s.phase='running';save();render();}
$('pause').onclick=pause;
$('help').onclick=()=>{if(s.phase==='running')pause();modal('掌櫃手帖','<p>① 點「點燈」開門，每夜 75 秒，共七夜。</p><p>② 點選鬼客，再選他想吃的菜。可同時照顧不同桌，烹調時可按「掌火」：指針在金色區能獲額外小費。完成後選客，再按「親手上菜」收款。</p><p>聊兩句可延長該客一次耐心；每夜的渡口事件會暫停時間，選擇會影響冥錢或口碑。</p><p>③ 綠條是耐心。上錯菜會扣口碑、縮短耐心；等太久客人會離去。</p><p>④ 冥錢用來支付食材、店租及升級。灶火縮短烹調時間，幽燈延長新客耐心。</p><p>⑤ 七夜招待至少 35 位、口碑達 70 即成黃泉名店。沒錢時仍可開門，每夜保底補助至 20 冥錢。</p><p>空白鍵暫停；切換分頁自動暫停。進度儲存在本機瀏覽器，重開頁面後按「繼續」。</p>');};
$('close').onclick=()=>$('modal').close();$('sound').onclick=()=>{muted=!muted;$('sound').textContent=`音效：${muted?'關':'開'}`;$('sound').setAttribute('aria-pressed',String(!muted));tone();};
$('reset').onclick=()=>{if(confirm('確定清除本局進度，從第一夜開始？')){s=fresh();selected=-1;save();render();}};
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['BUTTON','INPUT'].includes(document.activeElement.tagName)&&!$('modal').open){e.preventDefault();pause();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&s.phase==='running')pause();});
function endNight(){const rent=12+s.night*3;s.money=Math.max(0,s.money-rent);const detail=`今夜招待 ${s.nightServed} 位，營業收入 ${s.nightEarned}，店租 ${rent} 冥錢。`;s.guests=Array(6).fill(null);s.event=null;selected=-1;
 if(s.night===7){s.phase='ended';const win=s.served>=35&&s.rep>=70;log(win?'七夜燈火不熄，幽燈客棧成為黃泉名店。':'七夜已過，客棧仍在等候下一位有緣掌櫃。');modal(win?'黃泉名店 · 百鬼皆歡':'七夜結算 · 燈火未盡',`<p>${detail}</p><p>總招待 ${s.served} 位 · 口碑 ${s.rep} · 結餘 ${s.money} 冥錢。</p><p>${win?'你用熱飯與耐心，贏得百鬼的信任。':'名店目標：招待 35 位、口碑 70。下次先升灶火，記得同時照顧幾桌。'}</p>`);}else{s.night++;s.phase='ready';s.money=Math.max(20,s.money);log(detail);modal('天將明 · 收燈歇業',`<p>${detail}</p><p>剩下的客人平安離席，不扣口碑。休息時可修繕客棧，準備第 ${s.night} 夜。</p><p>下一夜客人會更密集；資金不足時，渡口補助至 20 冥錢。</p>`);}save();render();}
function tick(dt){if(s.phase!=='running'||s.event!=null)return;s.time=Math.max(0,s.time-dt);s.spawn-=dt;if(s.spawn<=0){spawn();s.spawn=Math.max(4,8-s.night*.4);}s.guests.forEach((g,i)=>{if(!g)return;g.patience-=dt;if(g.cook){g.cook.left-=dt;if(g.cook.left<=0){g.ready=g.cook.dish+1;g.cook=null;feedback('熱菜做好了 · 點客人，再親手上菜');tone();}}if(g.patience<=0){s.guests[i]=null;if(selected===i)selected=-1;s.rep=Math.max(0,s.rep-5);log('一位客人等不及，悄然離去。口碑 -5。');}});if(s.time<=0){endNight();return;}if(s.time<45&&!s.eventDone){s.eventDone=true;s.event=(s.night-1)%3;feedback('有訪客敲門 · 時間暫停，請作選擇');}
 dirty+=dt;if(dirty>=1){save();dirty=0;}render();}
$('quick-seats').innerHTML=Array.from({length:6},(_,i)=>`<button data-seat="${i}">${i+1}席</button>`).join('');
$('quick-seats').onclick=$('tables').onclick;
const voices=[['這把紙傘，等了她三十年。','你說雨會停？那我再等一碗湯。'],['趕考的路忘了，家裏那盞燈卻記得。','謝謝掌櫃。今夜總算有人聽我說話。'],['山裏風大，給我來點熱的！','哈哈！你這掌櫃倒是爽快。'],['別看我的尾巴，看着我的眼睛說話。','你倒不怕我。這份人情，我記下了。'],['我找不到回家的渡船了……','這裏好暖，我可以多坐一會嗎？'],['我的燈快熄了，你還肯讓我進來？','原來不發光，也有人願意收留我。']];
const events=[['橋下的迷路小鬼','他沒有冥錢，卻緊握一張回家的船票。',['送他熱湯 · 花 12，口碑 +8',-12,8],['指引渡口 · 口碑 +2',0,2]],['擺渡人的急單','渡船即將出發，他願意買走你的備料。',['接下急單 · 收 20，口碑 -4',20,-4],['留給堂客 · 口碑 +3',0,3]],['雨夜修燈人','他能修好門前幽燈，讓在座客人願意多等一會。',['請他修燈 · 花 15，耐心 +10 秒',-15,0],['借他避雨 · 口碑 +2',0,2]]];
function feedback(text){$('feedback').textContent=text;$('feedback').classList.remove('pop');void $('feedback').offsetWidth;$('feedback').classList.add('pop');}
function renderInteraction(){
 [...$('quick-seats').children].forEach((b,i)=>{const guest=s.guests[i];b.disabled=!guest;b.textContent=`${i+1}席${guest?.ready?' ♨':''}`;b.classList.toggle('selected',selected===i);});
 const g=s.guests[selected],active=s.phase==='running'&&s.event==null;
 $('chat').disabled=!active||!g||g.talked;$('serve').disabled=!active||!g||!g.ready;$('heat').disabled=!active||!g?.cook||g.heatUsed;
 $('dialogue').textContent=g?`${ghosts[g.type][0]}：「${voices[g.type][g.talked?1:0]}」`:'選一位鬼客，聽聽他的來意。';
 const progress=g?.cook?1-g.cook.left/(g.cook.total||5):0;
 $('heat-marker').style.left=`${Math.min(100,Math.max(0,progress*100))}%`;
 $('heat-label').textContent=g?.ready?'菜已備妥！按「親手上菜」。':g?.heatUsed?(g.perfect?'火候正好！上對菜額外 +6 冥錢。':'火候偏了，正常完成便可上菜。'):'指針進入金色區（40–75%）時，按「掌火」。';
 const e=s.event!=null?events[s.event]:null;
 $('event-title').textContent=e?e[0]:'渡口傳聞 · 下一段緣分正在路上';$('event-copy').textContent=e?e[1]+'（營業計時暫停）':'每夜一個選擇，留一碗飯，或賺一筆盤纏。';
 ['event-a','event-b'].forEach((id,i)=>{$(id).hidden=!e;$(id).textContent=e?e[i+2][0]:'';$(id).disabled=!e||s.phase!=='running'||s.money+e[i+2][1]<0;});
}
$('chat').onclick=()=>{const g=s.guests[selected];if(!g||g.talked||s.phase!=='running'||s.event!=null)return;g.talked=true;g.patience=Math.min(g.max,g.patience+10);feedback('一席暖話 · 耐心恢復');tone();save();render();};
$('heat').onclick=()=>{const g=s.guests[selected];if(!g?.cook||g.heatUsed||s.phase!=='running'||s.event!=null)return;const progress=1-g.cook.left/(g.cook.total||5);g.heatUsed=true;g.perfect=progress>=.4&&progress<=.75;feedback(g.perfect?'恰到好處！香氣滿堂':'火候稍偏 · 下次再試');tone();save();render();};
$('serve').onclick=()=>{const g=s.guests[selected];if(!g?.ready||s.phase!=='running'||s.event!=null)return;const d=dishes[g.ready-1];if(g.ready-1!==g.dish){g.ready=null;g.patience-=5;s.rep=Math.max(0,s.rep-3);feedback('上錯菜了！客人搖搖頭 · 口碑 -3');}else{const tip=(g.patience>g.max*.5?3:0)+(g.perfect?6:0);s.money+=d.price+tip;s.nightEarned+=d.price+tip;s.served++;s.nightServed++;s.rep=Math.min(100,s.rep+2);log(`${ghosts[g.type][0]}：「${g.talked?'這碗飯和你的話，我都記住了。':'好暖的一餐，下回再來。'}」收到 ${d.price+tip} 冥錢。`);feedback(`客人滿意離席 · +${d.price+tip} 冥錢`);s.guests[selected]=null;selected=-1;tone();}save();render();};
['event-a','event-b'].forEach((id,i)=>{$(id).onclick=()=>{if(s.event==null||s.phase!=='running')return;const choice=events[s.event][i+2];if(s.money+choice[1]<0)return;s.money+=choice[1];s.rep=Math.max(0,Math.min(100,s.rep+choice[2]));if(s.event===2&&i===0)s.guests.forEach(g=>{if(g){g.max+=10;g.patience+=10;}});log(choice[0]+'。渡口的人記住了你的選擇。');s.event=null;feedback('選擇已記下 · 營業繼續');save();render();};});
setInterval(()=>{const now=performance.now(),dt=Math.min((now-last)/1000,.5);last=now;tick(dt);},200);window.addEventListener('pagehide',save);render();
