import * as B from '../brain.js';
const S={born:Date.now()-6*B.DAY,name:"Agony",userName:"",words:{},phrases:{},quotes:[],likes:[],dislikes:[],defs:{},self:{is:[],likes:[]},facts:{},traits:{calore:.3,ironia:.1,curiosita:.3,coraggio:0,calma:0,malinconia:0},
 user:{msgs:0,chars:0,emoji:{},emojiMsgs:0,lower:0,excl:0,dot:0,abbr:{},hours:Array(24).fill(0),firstLens:[],lens:[]},log:[],energy:{used:0},hurt:0,
 mem:{feel:[],events:[],people:{},topics:{},corpus:[],ask:null,react:{},reward:{}}};
let seed=5; const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
for (const w of B.tokenize("ciao come stai bene sono felice oggi ho preso dieci in matematica il cane mare scuola grazie")) S.words[w]={c:3,f:0,s:0};
const p=3; let t=Date.now();
const talk=async m=>{ t+=60000; S.log.push({w:"u",x:m,t}); const a=B.analyze(m); B.learn(S,m,a,t);
 const r=await B.reply(S,a,{phase:p,now:t,rnd}); const set=r.set||{};
 if(set.def){S.defs[set.def.w]=set.def.x; const v=B.analyze(set.def.x).sv; if(S.words[set.def.w]) S.words[set.def.w].val=v; S.mem.ask=null;} else if(set.ask) S.mem.ask={w:set.ask,t}; else S.mem.ask=null;
 if(set.pendingQ) S.mem.pendingQ={...set.pendingQ,t};
 S.log.push({w:"c",x:r.x,src:r.src,t}); console.log(`tu: ${m}\n   → ${r.x}   (${a.intent}, ${r.src}${set.praise?', LODE IMPARATA: '+set.praise:''})`); };

for (const m of ["io mi chiamo luca","tu ti chiami pixel","come ti chiami?","il mio cane si chiama rex","ho sedici anni","abito a torino","come si chiama il mio cane?","quanti anni ho?","dove abito?","qual è il mio colore preferito?","il blu","qual è il mio colore preferito?","tu sei coraggioso","come sei?","chi sono io?",
  "ciao","bravissimo","vuol dire che hai fatto una cosa giusta","come stai?","bravissimo","che ore sono?","bravissimo",]) await talk(m); await talk("oggi ho preso dieci in matematica");
console.log("react",JSON.stringify(S.mem.react),"val",B.phraseVal(S,"bravissimo"),"wordval",S.words.bravissimo&&S.words.bravissimo.val);console.log("reward",JSON.stringify(S.mem.reward),'facts',JSON.stringify(S.facts));
