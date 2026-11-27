import {Rete} from '../nucleo/rete.js';
const n=new Rete({D:6,H:5,seed:4}); const ids=n.ids(["oggi","sono","triste","ma","forte"]);
// pesi più grandi per avere gradienti misurabili
for(const k of ["Wz","Wr","Wn","Uz","Ur","Un"]) n.p[k].d.forEach((v,i,a)=>a[i]=v*3);
const ex={ids,lm:1,lab:[0,1,0,0,0,0,1,0],mask:[1,1,1,1,1,1,1,1]};
const zero=()=>{for(const q of Object.values(n.p)) q.g.fill(0)};
const L=()=>{const l=n.grad(ex); zero(); return l;};
for(const k of ["Wz","Wr","Wn","Uz","Ur","Un"]){
  const q=n.p[k]; zero(); n.grad(ex); const g=Array.from(q.g.subarray(0,q.size)); zero();
  const order=g.map((v,i)=>[Math.abs(v),i]).sort((a,b)=>b[0]-a[0]).slice(0,3);
  for(const [,i] of order){ const o=q.d[i],e=1e-2; q.d[i]=o+e; const l1=L(); q.d[i]=o-e; const l2=L(); q.d[i]=o; const num=(l1-l2)/(2*e);
    const rel=Math.abs(num-g[i])/(Math.abs(num)+Math.abs(g[i])); console.log(k,'num',num.toFixed(5),'bp',g[i].toFixed(5),rel<2e-2?'ok':'<<< ERRORE'); }
}
