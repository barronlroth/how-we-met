import * as T from 'three';

// Derive the contact outline from the actual exported lower hull. Matching its
// narrow waterline avoids the detached foam produced by using the upper beam.
export function makeHullContactGeometry(boat){
  boat.updateMatrixWorld(true);
  const inverse=boat.matrixWorld.clone().invert(),p=new T.Vector3(),points=[];
  boat.userData.hull.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const matrix=new T.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld),positions=mesh.geometry.attributes.position;
    for(let i=0;i<positions.count;i++){
      p.fromBufferAttribute(positions,i).applyMatrix4(matrix);
      if(p.y<=.12)points.push([p.x,p.z]);
    }
  });
  points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const unique=points.filter((p,i)=>!i||Math.hypot(p[0]-points[i-1][0],p[1]-points[i-1][1])>1e-6);
  if(unique.length<3)throw new Error('The hero hull has no waterline for contact foam.');
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const chain=vertices=>{
    const result=[];
    for(const point of vertices){while(result.length>1&&cross(result.at(-2),result.at(-1),point)<=1e-7)result.pop();result.push(point)}
    return result.slice(0,-1);
  };
  const outline=[...chain(unique),...chain([...unique].reverse())],n=outline.length;
  const positions=[],uv=[],indices=[];let along=0;
  for(let i=0;i<=n;i++){
    const previous=outline[(i+n-1)%n],current=outline[i%n],next=outline[(i+1)%n];
    if(i)along+=Math.hypot(current[0]-previous[0],current[1]-previous[1]);
    const tx=next[0]-previous[0],tz=next[1]-previous[1],length=Math.hypot(tx,tz),nx=tz/length,nz=-tx/length;
    const width=.16+.055*Math.sin(along*2.7+.4)**2;
    for(const offset of [-.015,width])positions.push(current[0]+nx*offset,.06,current[1]+nz*offset);
    uv.push(.12,along/.73,.95,along/.73);
    if(i<n)indices.push(i*2,(i+1)*2,(i+1)*2+1,i*2,(i+1)*2+1,i*2+1);
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}

export function makeHullContactFoam(boat,texture,water){
  const map=texture.clone();map.wrapT=T.RepeatWrapping;map.needsUpdate=true;
  const material=new T.MeshBasicMaterial({map,color:0xf3fffa,transparent:true,opacity:.8,depthWrite:false,side:T.DoubleSide});
  water.bindFoam(material);
  const mesh=new T.Mesh(makeHullContactGeometry(boat),material);
  mesh.name='Wave-fitted hull contact foam';mesh.frustumCulled=false;boat.add(mesh);
  return{mesh,update(r,time,staged){
    mesh.visible=staged||(r.status==='racing'&&r.y<.6);
    material.opacity=staged?.78:Math.min(.88,r.speed/35)*.75;
    map.offset.y=time*.05;
  }};
}
