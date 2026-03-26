/* ── State ── */
const frame = document.getElementById('frame');
let cols = 2, rows = 3, gap = 0, pad = 0;
let frameW = 1080, frameH = 1920;
let bgColor = '#ffffff';
let selectedSlot = null;
let fileInputTarget = null;
let SCALE = 0.28;

let slots = [
  { id:1, colStart:1, rowStart:1, colSpan:1, rowSpan:1, img:null, fit:'cover', posX:50, posY:50, zoom:100 },
  { id:2, colStart:2, rowStart:1, colSpan:1, rowSpan:1, img:null, fit:'cover', posX:50, posY:50, zoom:100 },
  { id:3, colStart:1, rowStart:2, colSpan:2, rowSpan:1, img:null, fit:'cover', posX:50, posY:50, zoom:100 },
  { id:4, colStart:1, rowStart:3, colSpan:1, rowSpan:1, img:null, fit:'cover', posX:50, posY:50, zoom:100 },
  { id:5, colStart:2, rowStart:3, colSpan:1, rowSpan:1, img:null, fit:'cover', posX:50, posY:50, zoom:100 },
];
let nextId = 6;

/* ── Placeholder color helpers ── */
function hexToHsl(hex) {
  let r = parseInt(hex.slice(1,3),16)/255;
  let g = parseInt(hex.slice(3,5),16)/255;
  let b = parseInt(hex.slice(5,7),16)/255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b);
  let h, s, l=(max+min)/2;
  if (max===min) { h=s=0; } else {
    const d=max-min;
    s=l>0.5?d/(2-max-min):d/(max+min);
    switch(max){
      case r:h=((g-b)/d+(g<b?6:0))/6;break;
      case g:h=((b-r)/d+2)/6;break;
      case b:h=((r-g)/d+4)/6;break;
    }
  }
  return [h*360, s*100, l*100];
}
function hslToHex(h,s,l) {
  h/=360; s/=100; l/=100;
  const hue2rgb=(p,q,t)=>{
    if(t<0)t+=1; if(t>1)t-=1;
    if(t<1/6)return p+(q-p)*6*t;
    if(t<1/2)return q;
    if(t<2/3)return p+(q-p)*(2/3-t)*6;
    return p;
  };
  let r,g,b;
  if(s===0){r=g=b=l;}else{
    const q=l<0.5?l*(1+s):l+s-l*s, p=2*l-q;
    r=hue2rgb(p,q,h+1/3); g=hue2rgb(p,q,h); b=hue2rgb(p,q,h-1/3);
  }
  return '#'+[r,g,b].map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join('');
}
function placeholderStyle(bg) {
  const [h,s,l] = hexToHsl(bg);
  const cellL = Math.min(100, l+20);
  const cellBg = hslToHex(h, s, cellL);
  const textColor = cellL > 55 ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)';
  return { cellBg, textColor };
}

/* ── Scale based on viewport ── */
function computeScale() {
  const canvasArea = document.getElementById('canvasArea');
  const maxW = canvasArea.clientWidth - 48;
  const maxH = canvasArea.clientHeight - 64;
  const scaleW = maxW / frameW;
  const scaleH = maxH / frameH;
  SCALE = Math.min(scaleW, scaleH, 0.35);
}

/* ── Render frame ── */
function updateFrame() {
  computeScale();
  const w = Math.round(frameW * SCALE);
  const h = Math.round(frameH * SCALE);
  const g = Math.round(gap * SCALE);
  const p = Math.round(pad * SCALE);
  Object.assign(frame.style, {
    width: w + 'px', height: h + 'px',
    background: bgColor,
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, 1fr)`,
    gap: g + 'px',
    padding: p + 'px',
  });
}

/* ── Render cells ── */
function renderSlots() {
  frame.innerHTML = '';
  slots.forEach(s => {
    const cell = document.createElement('div');
    cell.className = 'cell' + (selectedSlot === s.id ? ' selected' : '');
    cell.style.gridColumn = `${s.colStart} / span ${s.colSpan}`;
    cell.style.gridRow = `${s.rowStart} / span ${s.rowSpan}`;

    if (s.img) {
      const img = document.createElement('img');
      img.src = s.img;
      if (s.fit === 'contain') {
        img.style.objectFit = 'contain';
      } else {
        const posX = s.posX ?? 50;
        const posY = s.posY ?? 50;
        img.style.objectFit = 'cover';
        img.style.objectPosition = `${posX}% ${posY}%`;
        img.style.transform = `scale(${(s.zoom ?? 100) / 100})`;
        img.style.transformOrigin = `${posX}% ${posY}%`;
      }
      cell.appendChild(img);
    } else {
      const { cellBg, textColor } = placeholderStyle(bgColor);
      cell.style.background = cellBg;
      const ph = document.createElement('div');
      ph.className = 'cell-placeholder';
      ph.style.color = textColor;
      ph.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="2" y="2" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1"/>
          <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
          <path d="M20 14l-5-5L5 20" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
        </svg>
        <span>tap to add</span>`;
      ph.addEventListener('click', e => { e.stopPropagation(); selectSlot(s.id); triggerUpload(s.id); });
      cell.appendChild(ph);
    }

    cell.addEventListener('click', e => { e.stopPropagation(); selectSlot(s.id); });
    frame.appendChild(cell);
  });
}

/* ── Render slot list ── */
function renderSlotList() {
  const list = document.getElementById('slotList');
  list.innerHTML = '';
  slots.forEach((s, i) => {
    const item = document.createElement('div');
    item.className = 'slot-item' + (selectedSlot === s.id ? ' active' : '');

    const thumb = document.createElement('div');
    thumb.className = 'slot-thumb';
    if (s.img) { const img = document.createElement('img'); img.src = s.img; thumb.appendChild(img); }

    const nameEl = document.createElement('span');
    nameEl.className = 'slot-name';
    nameEl.textContent = `Slot ${i + 1}`;

    const dims = document.createElement('span');
    dims.className = 'slot-dims';
    dims.textContent = `${s.colSpan}×${s.rowSpan}`;

    const del = document.createElement('div');
    del.className = 'del-btn';
    del.textContent = '×';
    del.title = 'Remove slot';
    del.addEventListener('click', e => { e.stopPropagation(); deleteSlot(s.id); });

    item.append(thumb, nameEl, dims, del);
    item.addEventListener('click', () => selectSlot(s.id));
    list.appendChild(item);
  });
}

/* ── Select slot ── */
function selectSlot(id) {
  selectedSlot = id;
  const s = slots.find(x => x.id === id);
  const sec = document.getElementById('selSection');
  if (s) {
    sec.style.display = 'block';
    document.getElementById('selLabel').textContent = 'Slot ' + (slots.indexOf(s) + 1);
    document.getElementById('csV').textContent = s.colSpan;
    document.getElementById('rsV').textContent = s.rowSpan;
    document.getElementById('cstV').textContent = s.colStart;
    document.getElementById('rstV').textContent = s.rowStart;
    // fit buttons
    const fitRow = document.getElementById('fitRow');
    fitRow.style.display = s.img ? 'flex' : 'none';
    document.getElementById('fitCover').classList.toggle('active', s.fit !== 'contain');
    document.getElementById('fitContain').classList.toggle('active', s.fit === 'contain');
    // crop/zoom sliders (cover only)
    const showCrop = s.img && s.fit !== 'contain';
    document.getElementById('cropXRow').style.display = showCrop ? 'flex' : 'none';
    document.getElementById('cropYRow').style.display = showCrop ? 'flex' : 'none';
    document.getElementById('zoomRow').style.display = showCrop ? 'flex' : 'none';
    document.getElementById('cropX').value = s.posX ?? 50;
    document.getElementById('cropY').value = s.posY ?? 50;
    document.getElementById('cropXVal').textContent = (s.posX ?? 50) + '%';
    document.getElementById('cropYVal').textContent = (s.posY ?? 50) + '%';
    document.getElementById('zoomSlider').value = s.zoom ?? 100;
    document.getElementById('zoomVal').textContent = ((s.zoom ?? 100) / 100).toFixed(1) + '×';
    // clear btn
    document.getElementById('clearImgBtn').style.display = s.img ? 'flex' : 'none';
  } else {
    sec.style.display = 'none';
  }
  renderSlots();
  renderSlotList();
}

/* ── Delete slot ── */
function deleteSlot(id) {
  slots = slots.filter(s => s.id !== id);
  if (selectedSlot === id) {
    selectedSlot = null;
    document.getElementById('selSection').style.display = 'none';
  }
  renderAll();
}

/* ── Full render ── */
function renderAll() { updateFrame(); renderSlots(); renderSlotList(); }

/* ── Stepper helper ── */
function makeStepper(minusId, plusId, valId, get, set, min, max, after) {
  document.getElementById(minusId).addEventListener('click', () => {
    const v = Math.max(min, get() - 1); set(v);
    document.getElementById(valId).textContent = v; after(v);
  });
  document.getElementById(plusId).addEventListener('click', () => {
    const v = Math.min(max, get() + 1); set(v);
    document.getElementById(valId).textContent = v; after(v);
  });
}

/* ── Slot-level stepper helper ── */
function makeSlotStepper(minusId, plusId, valId, key, min, maxFn) {
  document.getElementById(minusId).addEventListener('click', () => {
    if (!selectedSlot) return;
    const s = slots.find(x => x.id === selectedSlot);
    s[key] = Math.max(min, s[key] - 1);
    document.getElementById(valId).textContent = s[key];
    renderAll();
  });
  document.getElementById(plusId).addEventListener('click', () => {
    if (!selectedSlot) return;
    const s = slots.find(x => x.id === selectedSlot);
    s[key] = Math.min(maxFn(), s[key] + 1);
    document.getElementById(valId).textContent = s[key];
    renderAll();
  });
}

/* ── Wire up grid steppers ── */
makeStepper('colMinus','colPlus','colCount', ()=>cols, v=>{cols=v;}, 1, 8, ()=>renderAll());
makeStepper('rowMinus','rowPlus','rowCount', ()=>rows, v=>{rows=v;}, 1, 12, ()=>renderAll());

/* ── Wire up slot steppers ── */
makeSlotStepper('csM','csP','csV','colSpan', 1, ()=>cols);
makeSlotStepper('rsM','rsP','rsV','rowSpan', 1, ()=>rows);
makeSlotStepper('cstM','cstP','cstV','colStart', 1, ()=>cols);
makeSlotStepper('rstM','rstP','rstV','rowStart', 1, ()=>rows);

/* ── Gap + Padding sliders ── */
document.getElementById('gapSlider').addEventListener('input', function() {
  gap = parseInt(this.value);
  document.getElementById('gapVal').textContent = gap + 'px';
  renderAll();
});
document.getElementById('padSlider').addEventListener('input', function() {
  pad = parseInt(this.value);
  document.getElementById('padVal').textContent = pad + 'px';
  renderAll();
});

/* ── Frame presets ── */
document.getElementById('presets').addEventListener('click', e => {
  const btn = e.target.closest('.preset-btn');
  if (!btn) return;
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  frameW = parseInt(btn.dataset.w);
  frameH = parseInt(btn.dataset.h);
  renderAll();
});

/* ── Background color ── */
document.getElementById('bgPicker').addEventListener('click', e => {
  const sw = e.target.closest('.bg-swatch');
  if (!sw || sw.classList.contains('bg-swatch--custom')) return;
  document.querySelectorAll('.bg-swatch').forEach(s => s.classList.remove('active'));
  sw.classList.add('active');
  bgColor = sw.dataset.color;
  frame.style.background = bgColor;
  renderSlots();
});

document.getElementById('bgCustomInput').addEventListener('input', function () {
  const color = this.value;
  document.getElementById('bgCustom').style.background = color;
  document.querySelectorAll('.bg-swatch').forEach(s => s.classList.remove('active'));
  document.getElementById('bgCustom').classList.add('active');
  bgColor = color;
  frame.style.background = bgColor;
  renderSlots();
});

/* ── Fit toggle ── */
document.getElementById('fitCover').addEventListener('click', () => {
  if (!selectedSlot) return;
  const s = slots.find(x => x.id === selectedSlot);
  s.fit = 'cover';
  document.getElementById('fitCover').classList.add('active');
  document.getElementById('fitContain').classList.remove('active');
  document.getElementById('cropXRow').style.display = 'flex';
  document.getElementById('cropYRow').style.display = 'flex';
  document.getElementById('zoomRow').style.display = 'flex';
  renderSlots();
});
document.getElementById('fitContain').addEventListener('click', () => {
  if (!selectedSlot) return;
  const s = slots.find(x => x.id === selectedSlot);
  s.fit = 'contain';
  document.getElementById('fitContain').classList.add('active');
  document.getElementById('fitCover').classList.remove('active');
  document.getElementById('cropXRow').style.display = 'none';
  document.getElementById('cropYRow').style.display = 'none';
  document.getElementById('zoomRow').style.display = 'none';
  renderSlots();
});

/* ── Crop position sliders ── */
document.getElementById('cropX').addEventListener('input', function() {
  if (!selectedSlot) return;
  const s = slots.find(x => x.id === selectedSlot);
  s.posX = parseInt(this.value);
  document.getElementById('cropXVal').textContent = s.posX + '%';
  renderSlots();
});
document.getElementById('cropY').addEventListener('input', function() {
  if (!selectedSlot) return;
  const s = slots.find(x => x.id === selectedSlot);
  s.posY = parseInt(this.value);
  document.getElementById('cropYVal').textContent = s.posY + '%';
  renderSlots();
});
document.getElementById('zoomSlider').addEventListener('input', function() {
  if (!selectedSlot) return;
  const s = slots.find(x => x.id === selectedSlot);
  s.zoom = parseInt(this.value);
  document.getElementById('zoomVal').textContent = (s.zoom / 100).toFixed(1) + '×';
  renderSlots();
});

/* ── Add slot ── */
document.getElementById('addSlotBtn').addEventListener('click', () => {
  slots.push({ id: nextId++, colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1, img: null, fit: 'cover', posX: 50, posY: 50, zoom: 100 });
  renderAll();
});

/* ── Upload image ── */
function triggerUpload(id) {
  fileInputTarget = id;
  document.getElementById('file-input').click();
}
document.getElementById('uploadImgBtn').addEventListener('click', () => {
  if (selectedSlot) triggerUpload(selectedSlot);
});
document.getElementById('clearImgBtn').addEventListener('click', () => {
  if (!selectedSlot) return;
  const s = slots.find(x => x.id === selectedSlot);
  s.img = null;
  selectSlot(selectedSlot);
  renderAll();
});

document.getElementById('file-input').addEventListener('change', function() {
  const file = this.files[0];
  if (!file || !fileInputTarget) return;
  const reader = new FileReader();
  reader.onload = e => {
    const s = slots.find(x => x.id === fileInputTarget);
    if (s) { s.img = e.target.result; selectSlot(fileInputTarget); renderAll(); }
  };
  reader.readAsDataURL(file);
  this.value = '';
});

/* ── Deselect on canvas background click ── */
function deselect() {
  selectedSlot = null;
  document.getElementById('selSection').style.display = 'none';
  renderSlots();
  renderSlotList();
}
document.getElementById('canvasArea').addEventListener('click', e => {
  if (e.target === e.currentTarget) deselect();
});
frame.addEventListener('click', e => { e.stopPropagation(); });

/* ── Reset ── */
document.getElementById('resetBtn').addEventListener('click', () => {
  if (!confirm('Reset all slots and settings?')) return;
  cols = 2; rows = 3; gap = 0; pad = 0;
  frameW = 1080; frameH = 1920; bgColor = '#ffffff';
  selectedSlot = null;
  slots = [
    { id:1, colStart:1, rowStart:1, colSpan:1, rowSpan:1, img:null, fit:'cover', posX:50, posY:50, zoom:100 },
    { id:2, colStart:2, rowStart:1, colSpan:1, rowSpan:1, img:null, fit:'cover', posX:50, posY:50, zoom:100 },
    { id:3, colStart:1, rowStart:2, colSpan:2, rowSpan:1, img:null, fit:'cover', posX:50, posY:50, zoom:100 },
    { id:4, colStart:1, rowStart:3, colSpan:1, rowSpan:1, img:null, fit:'cover', posX:50, posY:50, zoom:100 },
    { id:5, colStart:2, rowStart:3, colSpan:1, rowSpan:1, img:null, fit:'cover', posX:50, posY:50, zoom:100 },
  ];
  nextId = 6;
  document.getElementById('gapSlider').value = 0;
  document.getElementById('padSlider').value = 0;
  document.getElementById('gapVal').textContent = '0px';
  document.getElementById('padVal').textContent = '0px';
  document.getElementById('colCount').textContent = 2;
  document.getElementById('rowCount').textContent = 3;
  document.getElementById('selSection').style.display = 'none';
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.toggle('active', b.dataset.w === '1080' && b.dataset.h === '1920'));
  document.querySelectorAll('.bg-swatch').forEach((s,i) => s.classList.toggle('active', i===0));
  document.getElementById('bgCustom').style.background = '';
  renderAll();
});

/* ── Export JPG ── */
function getCellRect(s) {
  const trackW = (frameW - 2 * pad - Math.max(0, cols - 1) * gap) / cols;
  const trackH = (frameH - 2 * pad - Math.max(0, rows - 1) * gap) / rows;
  return {
    x: pad + (s.colStart - 1) * (trackW + gap),
    y: pad + (s.rowStart - 1) * (trackH + gap),
    w: s.colSpan * trackW + (s.colSpan - 1) * gap,
    h: s.rowSpan * trackH + (s.rowSpan - 1) * gap,
  };
}

document.getElementById('exportBtn').addEventListener('click', async function() {
  this.disabled = true;
  this.textContent = 'Exporting…';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = frameW;
    canvas.height = frameH;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, frameW, frameH);

    for (const s of slots) {
      const { x, y, w, h } = getCellRect(s);
      ctx.fillStyle = '#d8d4cc';
      ctx.fillRect(x, y, w, h);

      if (s.img) {
        const img = new Image();
        img.src = s.img;
        await new Promise(res => { img.complete ? res() : (img.onload = res); });

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();

        const iw = img.naturalWidth, ih = img.naturalHeight;
        if (s.fit === 'contain') {
          const scale = Math.min(w / iw, h / ih);
          const dw = iw * scale, dh = ih * scale;
          ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
        } else {
          const scale = Math.max(w / iw, h / ih) * ((s.zoom ?? 100) / 100);
          const dw = iw * scale, dh = ih * scale;
          const px = (s.posX ?? 50) / 100, py = (s.posY ?? 50) / 100;
          ctx.drawImage(img, x + (w - dw) * px, y + (h - dh) * py, dw, dh);
        }
        ctx.restore();
      }
    }

    const link = document.createElement('a');
    link.download = `gridy-${Date.now()}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.93);
    link.click();
  } catch (err) {
    alert('Export failed: ' + err.message);
    console.error(err);
  }
  this.disabled = false;
  this.textContent = 'Export JPG';
});

/* ── Fullscreen preview ── */
document.getElementById('fullscreenBtn').addEventListener('click', () => {
  document.body.classList.toggle('preview-fullscreen');
  renderAll();
});

/* ── Resize ── */
window.addEventListener('resize', () => renderAll());

/* ── Init ── */
renderAll();
