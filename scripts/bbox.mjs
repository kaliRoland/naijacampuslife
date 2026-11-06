import { NodeIO } from '@gltf-transform/core';
import { getBounds } from '@gltf-transform/functions';
const X='C:/xampp/htdocs/naijacampuslife/art-source/x/';
const io=new NodeIO();
const files=process.argv.slice(2);
for(const f of files){
  try{
    const doc=await io.read(X+f); const sc=doc.getRoot().getDefaultScene()||doc.getRoot().listScenes()[0];
    const b=getBounds(sc); const s=b.max.map((v,i)=>+(v-b.min[i]).toFixed(2));
    let tris=0; for(const m of doc.getRoot().listMeshes()) for(const p of m.listPrimitives()){const i=p.getIndices(); tris+=(i?i.getCount():p.getAttribute('POSITION').getCount())/3;}
    console.log(f.split('/').pop().padEnd(34),'size',s.join(' x '),'min',b.min.map(v=>+v.toFixed(2)).join(','),'tris',tris);
  }catch(e){console.log(f,'ERR',String(e).slice(0,100));}
}
