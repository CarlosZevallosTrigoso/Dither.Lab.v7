// ============================================================================
// ALGORITHM FUNCTIONS — DitherLab v8
// ============================================================================

// ============================================================================
// CLASES AUXILIARES
// ============================================================================

class BufferPool {
  constructor() { this.buffers = new Map(); this.lastUsed = new Map(); }
  get(width, height, p) {
    const key = `${width}x${height}`;
    this.lastUsed.set(key, Date.now());
    if (!this.buffers.has(key)) {
      const buffer = p.createGraphics(width, height);
      buffer.elt.getContext('2d', { willReadFrequently: true, alpha: false });
      buffer.pixelDensity(1);
      buffer.elt.style.imageRendering = 'pixelated';
      this.buffers.set(key, buffer);
    }
    return this.buffers.get(key);
  }
  cleanup(maxAge = 60000) {
    const now = Date.now();
    for (const [key, time] of this.lastUsed) {
      if (now - time > maxAge) { this.buffers.get(key)?.remove(); this.buffers.delete(key); this.lastUsed.delete(key); }
    }
  }
  clear() { this.buffers.forEach(b => b.remove()); this.buffers.clear(); this.lastUsed.clear(); }
}

class ColorCache {
  constructor(p) { this.p = p; this.cache = new Map(); }
  getColor(hex) { if (!this.cache.has(hex)) this.cache.set(hex, this.p.color(hex)); return this.cache.get(hex); }
  getColors(hexArray) { return hexArray.map(hex => this.getColor(hex)); }
  clear() { this.cache.clear(); }
}

class LumaLUT {
  constructor() { this.lut = null; this.cachedColors = null; }
  build(p5colors, p) {
    const count = p5colors.length; this.lut = new Uint8Array(256 * 3);
    for (let i = 0; i < 256; i++) {
      const index = count === 0 ? 0 : Math.min(Math.floor(i / 255 * count), count - 1);
      const color = p5colors[index] || p.color(i);
      this.lut[i*3] = p.red(color); this.lut[i*3+1] = p.green(color); this.lut[i*3+2] = p.blue(color);
    }
    this.cachedColors = p5colors;
  }
  map(luma) { const i = Math.min(Math.max(Math.floor(luma), 0), 255); return [this.lut[i*3], this.lut[i*3+1], this.lut[i*3+2]]; }
  needsRebuild(p5colors) { return !this.cachedColors || this.cachedColors.length !== p5colors.length; }
}

class BayerLUT {
  constructor() {
    const B = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
    this.matrix = new Float32Array(16);
    for (let i = 0; i < 16; i++) this.matrix[i] = B[Math.floor(i/4)][i%4] / 16.0 - 0.5;
  }
  get(x, y) { return this.matrix[(y%4)*4+(x%4)]; }
}

class BlueNoiseLUT {
  constructor() {
    this.noise = new Float32Array([0.53,0.18,0.71,0.41,0.94,0.24,0.82,0.47,0.12,0.65,0.29,0.88,0.06,0.59,0.35,0.76,0.76,0.35,0.94,0.18,0.71,0.12,0.88,0.24,0.24,0.82,0.47,0.65,0.29,0.94,0.41,0.59,0.88,0.06,0.71,0.35,0.82,0.18,0.65,0.12,0.41,0.59,0.12,0.76,0.24,0.47,0.94,0.29,0.65,0.29,0.88,0.06,0.59,0.71,0.35,0.82,0.18,0.94,0.24,0.53,0.12,0.76,0.47,0.41]);
  }
  get(x, y) { return this.noise[(y%8)*8+(x%8)] - 0.5; }
}

// ============================================================================
// LAB COLOR SPACE
// ============================================================================

const LAB_GAMMA = new Float32Array(256);
const LAB_INV = new Uint8Array(1001);
(function() {
  for (let i = 0; i < 256; i++) { const c = i/255; LAB_GAMMA[i] = c > 0.04045 ? Math.pow((c+0.055)/1.055,2.4) : c/12.92; }
  for (let i = 0; i <= 1000; i++) { const c = i/1000; LAB_INV[i] = Math.round(Math.max(0,Math.min(255,(c > 0.0031308 ? 1.055*Math.pow(c,1/2.4)-0.055 : 12.92*c)*255))); }
})();

function rgbToLab(r, g, b) {
  let lr = LAB_GAMMA[r], lg = LAB_GAMMA[g], lb = LAB_GAMMA[b];
  let x = (lr*0.4124564+lg*0.3575761+lb*0.1804375)/0.95047;
  let y = lr*0.2126729+lg*0.7151522+lb*0.0721750;
  let z = (lr*0.0193339+lg*0.1191920+lb*0.9503041)/1.08883;
  x = x > 0.008856 ? Math.cbrt(x) : 7.787*x+16/116;
  y = y > 0.008856 ? Math.cbrt(y) : 7.787*y+16/116;
  z = z > 0.008856 ? Math.cbrt(z) : 7.787*z+16/116;
  return [116*y-16, 500*(x-y), 200*(y-z)];
}

function labToRgb(L, a, b) {
  let y = (L+16)/116, x = a/500+y, z = y-b/200;
  x = x*x*x > 0.008856 ? x*x*x : (x-16/116)/7.787;
  y = y*y*y > 0.008856 ? y*y*y : (y-16/116)/7.787;
  z = z*z*z > 0.008856 ? z*z*z : (z-16/116)/7.787;
  x *= 0.95047; z *= 1.08883;
  let lr = x*3.2404542+y*-1.5371385+z*-0.4985314;
  let lg = x*-0.9692660+y*1.8760108+z*0.0415560;
  let lb = x*0.0556434+y*-0.2040259+z*1.0572252;
  return [LAB_INV[Math.round(Math.max(0,Math.min(1,lr))*1000)], LAB_INV[Math.round(Math.max(0,Math.min(1,lg))*1000)], LAB_INV[Math.round(Math.max(0,Math.min(1,lb))*1000)]];
}

// ============================================================================
// HILBERT CURVE (para Riemersma)
// ============================================================================

function nextPow2(n) { let v=1; while(v<n) v<<=1; return v; }

function hilbertD2XY(n, d) {
  let x=0, y=0, t=d;
  for (let s=1; s<n; s*=2) {
    const rx = 1&(Math.floor(t/2)), ry = 1&(t^rx);
    if (ry===0) { if(rx===1){x=s-1-x; y=s-1-y;} const tmp=x; x=y; y=tmp; }
    x += s*rx; y += s*ry; t = Math.floor(t/4);
  }
  return [x, y];
}

// ============================================================================
// AJUSTES DE IMAGEN
// ============================================================================

function applyImageAdjustments(pixels, config) {
  const br = config.brightness, co = config.contrast, sa = config.saturation, cu = config.curvesLUTs;
  const hasB = br!==0||co!==1.0||sa!==1.0;
  const hasC = cu&&(cu.rgb||cu.r||cu.g||cu.b);
  if (!hasB&&!hasC) return;
  const len = pixels.length;
  for (let i=0; i<len; i+=4) {
    let r=pixels[i], g=pixels[i+1], b=pixels[i+2];
    if (hasB) {
      r=(r-127.5)*co+127.5+br; g=(g-127.5)*co+127.5+br; b=(b-127.5)*co+127.5+br;
      if (sa!==1.0) { const l=r*0.299+g*0.587+b*0.114; r=l+(r-l)*sa; g=l+(g-l)*sa; b=l+(b-l)*sa; }
    }
    r=Math.max(0,Math.min(255,r)); g=Math.max(0,Math.min(255,g)); b=Math.max(0,Math.min(255,b));
    if (hasC) {
      if(cu.rgb){r=cu.rgb[Math.round(r)];g=cu.rgb[Math.round(g)];b=cu.rgb[Math.round(b)];}
      if(cu.r)r=cu.r[Math.round(r)]; if(cu.g)g=cu.g[Math.round(g)]; if(cu.b)b=cu.b[Math.round(b)];
    }
    pixels[i]=Math.max(0,Math.min(255,r)); pixels[i+1]=Math.max(0,Math.min(255,g)); pixels[i+2]=Math.max(0,Math.min(255,b));
  }
}

function prepareBuffer(p, buffer, src, w, h, cfg) {
  const s=cfg.ditherScale, pw=Math.floor(w/s), ph=Math.floor(h/s);
  buffer.image(src,0,0,pw,ph); buffer.loadPixels();
  applyImageAdjustments(buffer.pixels, cfg);
  return {pw, ph, pix: buffer.pixels};
}

// ============================================================================
// ALGORITMOS CLÁSICOS
// ============================================================================

function drawPosterize(p, buffer, src, w, h, cfg, lumaLUT) {
  const {pw,ph,pix} = prepareBuffer(p,buffer,src,w,h,cfg);
  const len=pix.length;
  if (cfg.useOriginalColor) {
    const lv=cfg.colorCount, st=255/(lv>1?lv-1:1);
    for(let i=0;i<len;i+=4){pix[i]=Math.round(pix[i]/st)*st;pix[i+1]=Math.round(pix[i+1]/st)*st;pix[i+2]=Math.round(pix[i+2]/st)*st;}
  } else {
    for(let i=0;i<len;i+=4){const l=pix[i]*0.299+pix[i+1]*0.587+pix[i+2]*0.114;const[r,g,b]=lumaLUT.map(l);pix[i]=r;pix[i+1]=g;pix[i+2]=b;}
  }
  buffer.updatePixels();
}

function drawDither(p, buffer, src, w, h, cfg, lumaLUT, bayerLUT) {
  const {pw,ph,pix} = prepareBuffer(p,buffer,src,w,h,cfg);
  const useLab = cfg.labMode && cfg.useOriginalColor;

  if (cfg.useOriginalColor) {
    const lv=cfg.colorCount, step=255/(lv>1?lv-1:1);
    const kernel=KERNELS[cfg.effect]; if(!kernel&&cfg.effect!=='bayer') return;
    for(let y=0;y<ph;y++){
      const rev=cfg.serpentineScan&&y%2===1;
      const xS=rev?pw-1:0, xE=rev?-1:pw, xD=rev?-1:1;
      for(let x=xS;x!==xE;x+=xD){
        const i=(y*pw+x)*4;
        const oR=pix[i],oG=pix[i+1],oB=pix[i+2];
        const nR=Math.round(oR/step)*step, nG=Math.round(oG/step)*step, nB=Math.round(oB/step)*step;
        pix[i]=nR;pix[i+1]=nG;pix[i+2]=nB;
        if(cfg.effect==='bayer') continue;
        let eR,eG,eB;
        if(useLab){
          const[oL,oA,oBl]=rgbToLab(Math.round(oR),Math.round(oG),Math.round(oB));
          const[nL,nA,nBl]=rgbToLab(Math.min(255,Math.max(0,nR)),Math.min(255,Math.max(0,nG)),Math.min(255,Math.max(0,nB)));
          const[dR,dG,dB]=labToRgb(oL-nL+50, oA-nA, oBl-nBl);
          eR=(dR-128)*cfg.diffusionStrength; eG=(dG-128)*cfg.diffusionStrength; eB=(dB-128)*cfg.diffusionStrength;
        } else {
          eR=(oR-nR)*cfg.diffusionStrength; eG=(oG-nG)*cfg.diffusionStrength; eB=(oB-nB)*cfg.diffusionStrength;
        }
        const pts=kernel.points, div=kernel.divisor;
        for(let j=0;j<pts.length;j++){
          const pt=pts[j], dx=rev?-pt.dx:pt.dx, nx=x+dx, ny=y+pt.dy;
          if(nx>=0&&nx<pw&&ny>=0&&ny<ph){
            const ni=(ny*pw+nx)*4, wt=pt.w/div;
            pix[ni]=Math.min(255,Math.max(0,pix[ni]+eR*wt));
            pix[ni+1]=Math.min(255,Math.max(0,pix[ni+1]+eG*wt));
            pix[ni+2]=Math.min(255,Math.max(0,pix[ni+2]+eB*wt));
          }
        }
      }
    }
  } else {
    if(cfg.effect==='bayer'){
      const lv=cfg.colorCount, ds=(255/lv)*cfg.patternStrength*2;
      for(let y=0;y<ph;y++) for(let x=0;x<pw;x++){
        const i=(y*pw+x)*4, l=pix[i]*0.299+pix[i+1]*0.587+pix[i+2]*0.114;
        const adj=Math.min(255,Math.max(0,l+bayerLUT.get(x,y)*ds));
        const[r,g,b]=lumaLUT.map(adj); pix[i]=r;pix[i+1]=g;pix[i+2]=b;
      }
    } else {
      const kernel=KERNELS[cfg.effect]; if(!kernel) return;
      const lv=cfg.colorCount, step=255/(lv>1?lv-1:1);
      for(let y=0;y<ph;y++){
        const rev=cfg.serpentineScan&&y%2===1;
        const xS=rev?pw-1:0, xE=rev?-1:pw, xD=rev?-1:1;
        for(let x=xS;x!==xE;x+=xD){
          const i=(y*pw+x)*4;
          const oL=pix[i]*0.299+pix[i+1]*0.587+pix[i+2]*0.114;
          const nL=Math.round(oL/step)*step;
          const[r,g,b]=lumaLUT.map(nL); pix[i]=r;pix[i+1]=g;pix[i+2]=b;
          const err=(oL-nL)*cfg.diffusionStrength;
          const pts=kernel.points, div=kernel.divisor;
          for(let j=0;j<pts.length;j++){
            const pt=pts[j], dx=rev?-pt.dx:pt.dx, nx=x+dx, ny=y+pt.dy;
            if(nx>=0&&nx<pw&&ny>=0&&ny<ph){
              const ni=(ny*pw+nx)*4, adj=err*pt.w/div;
              pix[ni]=Math.min(255,Math.max(0,pix[ni]+adj));
              pix[ni+1]=Math.min(255,Math.max(0,pix[ni+1]+adj));
              pix[ni+2]=Math.min(255,Math.max(0,pix[ni+2]+adj));
            }
          }
        }
      }
    }
  }
  buffer.updatePixels();
}

function drawBlueNoise(p, buffer, src, w, h, cfg, lumaLUT, blueNoiseLUT) {
  const {pw,ph,pix} = prepareBuffer(p,buffer,src,w,h,cfg);
  const ds=(255/cfg.colorCount)*cfg.patternStrength*2;
  for(let y=0;y<ph;y++) for(let x=0;x<pw;x++){
    const i=(y*pw+x)*4, l=pix[i]*0.299+pix[i+1]*0.587+pix[i+2]*0.114;
    const adj=Math.min(255,Math.max(0,l+blueNoiseLUT.get(x,y)*ds));
    const[r,g,b]=lumaLUT.map(adj); pix[i]=r;pix[i+1]=g;pix[i+2]=b;
  }
  buffer.updatePixels();
}

function drawVariableError(p, buffer, src, w, h, cfg, lumaLUT) {
  const {pw,ph,pix} = prepareBuffer(p,buffer,src,w,h,cfg);
  const kernel=KERNELS['floyd-steinberg'];
  const grads=new Float32Array(pw*ph);
  for(let y=1;y<ph-1;y++) for(let x=1;x<pw-1;x++){
    const i=(y*pw+x)*4, gx=Math.abs(pix[i+4]-pix[i-4]), gy=Math.abs(pix[i+pw*4]-pix[i-pw*4]);
    grads[y*pw+x]=Math.sqrt(gx*gx+gy*gy)/255;
  }
  const step=255/(cfg.colorCount>1?cfg.colorCount-1:1);
  for(let y=0;y<ph;y++) for(let x=0;x<pw;x++){
    const i=(y*pw+x)*4, str=cfg.diffusionStrength*(1-(grads[y*pw+x]||0)*0.5);
    const oL=pix[i]*0.299+pix[i+1]*0.587+pix[i+2]*0.114;
    const nL=Math.round(oL/step)*step;
    const[r,g,b]=lumaLUT.map(nL); pix[i]=r;pix[i+1]=g;pix[i+2]=b;
    const err=(oL-nL)*str;
    for(const pt of kernel.points){
      const nx=x+pt.dx, ny=y+pt.dy;
      if(nx>=0&&nx<pw&&ny>=0&&ny<ph){
        const ni=(ny*pw+nx)*4, adj=err*pt.w/kernel.divisor;
        pix[ni]=Math.min(255,Math.max(0,pix[ni]+adj));
        pix[ni+1]=Math.min(255,Math.max(0,pix[ni+1]+adj));
        pix[ni+2]=Math.min(255,Math.max(0,pix[ni+2]+adj));
      }
    }
  }
  buffer.updatePixels();
}

// ============================================================================
// NUEVO: THRESHOLD
// ============================================================================

function drawThreshold(p, buffer, src, w, h, cfg, lumaLUT) {
  const {pw,ph,pix} = prepareBuffer(p,buffer,src,w,h,cfg);
  const threshold = cfg.patternStrength * 255;
  const step = 255/(cfg.colorCount>1?cfg.colorCount-1:1);
  const len = pix.length;
  if (cfg.useOriginalColor) {
    for(let i=0;i<len;i+=4){
      pix[i]   = Math.min(255, (pix[i]   > threshold ? Math.ceil(pix[i]/step)   : Math.floor(pix[i]/step))   * step);
      pix[i+1] = Math.min(255, (pix[i+1] > threshold ? Math.ceil(pix[i+1]/step) : Math.floor(pix[i+1]/step)) * step);
      pix[i+2] = Math.min(255, (pix[i+2] > threshold ? Math.ceil(pix[i+2]/step) : Math.floor(pix[i+2]/step)) * step);
    }
  } else {
    for(let i=0;i<len;i+=4){
      const l = pix[i]*0.299+pix[i+1]*0.587+pix[i+2]*0.114;
      const q = Math.min(255, (l > threshold ? Math.ceil(l/step) : Math.floor(l/step)) * step);
      const[r,g,b]=lumaLUT.map(q); pix[i]=r;pix[i+1]=g;pix[i+2]=b;
    }
  }
  buffer.updatePixels();
}

// ============================================================================
// NUEVO: RANDOM DITHER
// ============================================================================

function drawRandom(p, buffer, src, w, h, cfg, lumaLUT) {
  const {pw,ph,pix} = prepareBuffer(p,buffer,src,w,h,cfg);
  const step=255/(cfg.colorCount>1?cfg.colorCount-1:1);
  const noiseAmt=(255/cfg.colorCount)*cfg.patternStrength*2;
  const len=pix.length;
  if (cfg.useOriginalColor) {
    for(let i=0;i<len;i+=4){
      const n=(Math.random()-0.5)*noiseAmt;
      pix[i]  =Math.min(255,Math.max(0,Math.round((pix[i]+n)/step)*step));
      pix[i+1]=Math.min(255,Math.max(0,Math.round((pix[i+1]+n)/step)*step));
      pix[i+2]=Math.min(255,Math.max(0,Math.round((pix[i+2]+n)/step)*step));
    }
  } else {
    for(let i=0;i<len;i+=4){
      const n=(Math.random()-0.5)*noiseAmt;
      const l=pix[i]*0.299+pix[i+1]*0.587+pix[i+2]*0.114;
      const adj=Math.min(255,Math.max(0,l+n));
      const[r,g,b]=lumaLUT.map(adj); pix[i]=r;pix[i+1]=g;pix[i+2]=b;
    }
  }
  buffer.updatePixels();
}

// ============================================================================
// NUEVO: RIEMERSMA (difusión de error sobre curva de Hilbert)
// ============================================================================

function drawRiemersma(p, buffer, src, w, h, cfg, lumaLUT) {
  const {pw,ph,pix} = prepareBuffer(p,buffer,src,w,h,cfg);
  const size = nextPow2(Math.max(pw, ph));
  const total = size * size;
  const qSize = 16;
  const errQ = new Float32Array(qSize);
  const wts = new Float32Array(qSize);
  const decay = 2.0/qSize;
  let wSum = 0;
  for(let i=0;i<qSize;i++){wts[i]=Math.exp(-decay*i)*cfg.diffusionStrength; wSum+=wts[i];}
  for(let i=0;i<qSize;i++) wts[i]/=wSum;
  let qH = 0;
  const step = 255/(cfg.colorCount>1?cfg.colorCount-1:1);
  
  for(let d=0;d<total;d++){
    const[x,y]=hilbertD2XY(size,d);
    if(x>=pw||y>=ph) continue;
    const i=(y*pw+x)*4;
    let ea=0;
    for(let q=0;q<qSize;q++) ea+=errQ[(qH+q)%qSize]*wts[q];
    
    if(cfg.useOriginalColor){
      const oR=Math.min(255,Math.max(0,pix[i]+ea));
      const oG=Math.min(255,Math.max(0,pix[i+1]+ea));
      const oB=Math.min(255,Math.max(0,pix[i+2]+ea));
      const nR=Math.min(255,Math.round(oR/step)*step);
      const nG=Math.min(255,Math.round(oG/step)*step);
      const nB=Math.min(255,Math.round(oB/step)*step);
      pix[i]=nR; pix[i+1]=nG; pix[i+2]=nB;
      errQ[qH]=((oR-nR)+(oG-nG)+(oB-nB))/3;
    } else {
      const oL=pix[i]*0.299+pix[i+1]*0.587+pix[i+2]*0.114+ea;
      const cL=Math.min(255,Math.max(0,oL));
      const nL=Math.round(cL/step)*step;
      const[r,g,b]=lumaLUT.map(nL); pix[i]=r;pix[i+1]=g;pix[i+2]=b;
      errQ[qH]=cL-nL;
    }
    qH=(qH+1)%qSize;
  }
  buffer.updatePixels();
}

// ============================================================================
// NUEVO: HALFTONE (trama de impresión)
// ============================================================================

function drawHalftone(p, buffer, src, w, h, cfg, lumaLUT) {
  const scale=cfg.ditherScale, pw=Math.floor(w/scale), ph=Math.floor(h/scale);
  const readBuf=p.createGraphics(pw,ph);
  readBuf.pixelDensity(1);
  readBuf.image(src,0,0,pw,ph);
  readBuf.loadPixels();
  applyImageAdjustments(readBuf.pixels, cfg);
  
  const darkColor = cfg.colors[0]||'#000000';
  const lightColor = cfg.colors[cfg.colors.length-1]||'#ffffff';
  const cellSize = Math.max(3, Math.round(4 + cfg.patternStrength * 12));
  
  buffer.background(lightColor);
  buffer.fill(darkColor);
  buffer.noStroke();
  
  const rpix=readBuf.pixels;
  for(let cy=0;cy<ph;cy+=cellSize){
    for(let cx=0;cx<pw;cx+=cellSize){
      let tL=0, cnt=0;
      for(let dy=0;dy<cellSize&&cy+dy<ph;dy++){
        for(let dx=0;dx<cellSize&&cx+dx<pw;dx++){
          const i=((cy+dy)*pw+(cx+dx))*4;
          tL+=rpix[i]*0.299+rpix[i+1]*0.587+rpix[i+2]*0.114;
          cnt++;
        }
      }
      const darkness=1-(tL/cnt/255);
      const radius=darkness*cellSize*0.7;
      if(radius>0.3) buffer.circle(cx+cellSize/2, cy+cellSize/2, radius*2);
    }
  }
  readBuf.remove();
}

// ============================================================================
// NUEVO: CROSSHATCH (tramado artístico por líneas cruzadas)
// ============================================================================

function drawCrosshatch(p, buffer, src, w, h, cfg, lumaLUT) {
  const scale=cfg.ditherScale, pw=Math.floor(w/scale), ph=Math.floor(h/scale);
  const readBuf=p.createGraphics(pw,ph);
  readBuf.pixelDensity(1);
  readBuf.image(src,0,0,pw,ph);
  readBuf.loadPixels();
  applyImageAdjustments(readBuf.pixels, cfg);
  
  const cellSize=Math.max(3, Math.round(3+cfg.patternStrength*6));
  const cols=Math.ceil(pw/cellSize), rows=Math.ceil(ph/cellSize);
  const lumaMap=new Float32Array(cols*rows);
  const rpix=readBuf.pixels;
  
  for(let row=0;row<rows;row++){
    for(let col=0;col<cols;col++){
      let t=0, c=0;
      for(let dy=0;dy<cellSize;dy++) for(let dx=0;dx<cellSize;dx++){
        const x=col*cellSize+dx, y=row*cellSize+dy;
        if(x<pw&&y<ph){ const i=(y*pw+x)*4; t+=rpix[i]*0.299+rpix[i+1]*0.587+rpix[i+2]*0.114; c++; }
      }
      lumaMap[row*cols+col]=t/c/255;
    }
  }
  
  const darkColor=cfg.colors[0]||'#000000';
  const lightColor=cfg.colors[cfg.colors.length-1]||'#ffffff';
  buffer.background(lightColor);
  buffer.stroke(darkColor);
  buffer.strokeWeight(1);
  
  const layers=[
    {angle:45,  th:0.75},
    {angle:-45, th:0.55},
    {angle:0,   th:0.35},
    {angle:90,  th:0.15}
  ];
  
  for(const L of layers){
    const rad=L.angle*Math.PI/180;
    const dx=Math.cos(rad)*cellSize*0.6, dy=Math.sin(rad)*cellSize*0.6;
    for(let row=0;row<rows;row++){
      for(let col=0;col<cols;col++){
        if(lumaMap[row*cols+col]>L.th) continue;
        const cx=col*cellSize+cellSize/2, cy=row*cellSize+cellSize/2;
        buffer.line(cx-dx,cy-dy,cx+dx,cy+dy);
      }
    }
  }
  readBuf.remove();
}
