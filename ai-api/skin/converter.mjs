import sharp from 'sharp'

const SIZE = 64
const offset = (x, y) => (y * SIZE + x) * 4

function unwrap(ox, oy, w, h, d) {
  return { top:{x:ox+d,y:oy,w,h:d}, bottom:{x:ox+d+w,y:oy,w,h:d}, right:{x:ox,y:oy+d,w:d,h}, front:{x:ox+d,y:oy+d,w,h}, left:{x:ox+d+w,y:oy+d,w:d,h}, back:{x:ox+2*d+w,y:oy+d,w,h} }
}
function layout(slim) {
 const a=slim?3:4
 return {head:unwrap(0,0,8,8,8),body:unwrap(16,16,8,12,4),rightArm:unwrap(40,16,a,12,4),leftArm:unwrap(32,48,a,12,4),rightLeg:unwrap(0,16,4,12,4),leftLeg:unwrap(16,48,4,12,4)}
}

// Maps a generated side-by-side front/back character panel into the standard UV atlas.
export async function convertPanelToSkin(input, variant='classic') {
 const slim=variant==='slim', arm=slim?3:4, cw=8+2*arm
 const img=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 const {data,info}=img
 if(info.width<2||info.height<2) throw new Error('生成图像尺寸无效')
 const atlas=Buffer.alloc(SIZE*SIZE*4), P=layout(slim), half=Math.floor(info.width/2)
 const panel=(x0,x1)=>{
  let sr=0,sg=0,sb=0,samples=0
  const sxStep=Math.max(1,Math.floor((x1-x0)/48)),syStep=Math.max(1,Math.floor(info.height/48))
  for(let x=x0;x<x1;x+=sxStep)for(const y of [0,info.height-1]){const p=(y*info.width+x)*4;if(data[p+3]>127){sr+=data[p];sg+=data[p+1];sb+=data[p+2];samples++}}
  for(let y=0;y<info.height;y+=syStep)for(const x of [x0,x1-1]){const p=(y*info.width+x)*4;if(data[p+3]>127){sr+=data[p];sg+=data[p+1];sb+=data[p+2];samples++}}
  const bg=samples?[sr/samples,sg/samples,sb/samples]:[255,255,255]
  let minX=x1,minY=info.height,maxX=x0,maxY=0
  for(let y=0;y<info.height;y++)for(let x=x0;x<x1;x++){const p=(y*info.width+x)*4;const dist=Math.hypot(data[p]-bg[0],data[p+1]-bg[1],data[p+2]-bg[2]);if(data[p+3]>127&&dist>42){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}}
  if(maxX<minX) throw new Error('未检测到角色，请使用纯色背景的正面与背面双视图')
  const grid=Buffer.alloc(cw*32*4), bw=maxX-minX+1,bh=maxY-minY+1
  for(let y=0;y<32;y++)for(let x=0;x<cw;x++){const sx=Math.min(info.width-1,minX+Math.floor((x+.5)*bw/cw)),sy=Math.min(info.height-1,minY+Math.floor((y+.5)*bh/32)),a=(sy*info.width+sx)*4,b=(y*cw+x)*4;grid[b]=data[a];grid[b+1]=data[a+1];grid[b+2]=data[a+2];grid[b+3]=data[a+3]}
  return grid
 }
 const front=panel(0,half),back=panel(half,info.width)
 const place=(grid,side)=>{const specs=[['head',arm,0],['body',arm,8],['rightArm',0,8],['leftArm',arm+8,8],['rightLeg',arm,20],['leftLeg',arm+4,20]];for(const [name,dx,dy] of specs){const r=P[name][side];for(let y=0;y<r.h;y++)for(let x=0;x<r.w;x++){const a=((dy+y)*cw+dx+x)*4,b=offset(r.x+x,r.y+y);atlas[b]=grid[a];atlas[b+1]=grid[a+1];atlas[b+2]=grid[a+2];atlas[b+3]=255}}}
 place(front,'front');place(back,'back')
 const used=new Set(),base=new Set()
 for(const p of Object.values(P))for(const layer of [p,layout(slim).head]){for(const r of Object.values(layer))for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)used.add(x+','+y)}
 for(const p of Object.values(P))for(const r of Object.values(p))for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)base.add(x+','+y)
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const n=offset(x,y);if(!used.has(x+','+y))atlas.fill(0,n,n+4);else if(base.has(x+','+y))atlas[n+3]=255}
 return sharp(atlas,{raw:{width:SIZE,height:SIZE,channels:4}}).png().toBuffer()
}
