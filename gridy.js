/* ── State ── */
const frame = document.getElementById('frame');
let cols = 2, rows = 3, gap = 6, pad = 0;
let frameW = 1080, frameH = 1920;
let bgColor = '#ffffff';
let selectedSlot = null;
let fileInputTarget = null;
let SCALE = 0.28;

let slots = [
  { id:1, colStart:1, rowStart:1, colSpan:1, rowSpan:1, img:null, fit:'cover' },
  { id:2, colStart:2, rowStart:1, colSpan:1, rowSpan:1, img:null, fit:'cover' },
  { id:3, colStart:1, rowStart:2, colSpan:2, rowSpan:1, img:null, fit:'cover' },
  { id:4, colStart:1, rowStart:3, colSpan:1, rowSpan:1, img:null, fit:'cover' },
  { id:5, colStart:2, rowStart:3, colSpan:1, rowSpan:1, img:null, fit:'cover' },
];
let nextId = 6;

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
      img.style.objectFit = s.fit || 'cover';
      cell.appendChild(img);
    } else {
      const ph = document.createElement('div');
      ph.className = 'cell-placeholder';
      ph.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="2" y="2" width="18" height="18" rx="2" stroke="#888" stroke-width="1"/>
          <circle cx="8" cy="8" r="1.5" fill="#888"/>
          <path d="M20 14l-5-5L5 20" stroke="#888" stroke-width="1" stroke-linecap="round"/>
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
  if (!sw) return;
  document.querySelectorAll('.bg-swatch').forEach(s => s.classList.remove('active'));
  sw.classList.add('active');
  bgColor = sw.dataset.color;
  frame.style.background = bgColor;
});

/* ── Fit toggle ── */
document.getElementById('fitCover').addEventListener('click', () => {
  if (!selectedSlot) return;
  const s = slots.find(x => x.id === selectedSlot);
  s.fit = 'cover';
  document.getElementById('fitCover').classList.add('active');
  document.getElementById('fitContain').classList.remove('active');
  renderSlots();
});
document.getElementById('fitContain').addEventListener('click', () => {
  if (!selectedSlot) return;
  const s = slots.find(x => x.id === selectedSlot);
  s.fit = 'contain';
  document.getElementById('fitContain').classList.add('active');
  document.getElementById('fitCover').classList.remove('active');
  renderSlots();
});

/* ── Add slot ── */
document.getElementById('addSlotBtn').addEventListener('click', () => {
  slots.push({ id: nextId++, colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1, img: null, fit: 'cover' });
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
  cols = 2; rows = 3; gap = 6; pad = 0;
  frameW = 1080; frameH = 1920; bgColor = '#ffffff';
  selectedSlot = null;
  slots = [
    { id:1, colStart:1, rowStart:1, colSpan:1, rowSpan:1, img:null, fit:'cover' },
    { id:2, colStart:2, rowStart:1, colSpan:1, rowSpan:1, img:null, fit:'cover' },
    { id:3, colStart:1, rowStart:2, colSpan:2, rowSpan:1, img:null, fit:'cover' },
    { id:4, colStart:1, rowStart:3, colSpan:1, rowSpan:1, img:null, fit:'cover' },
    { id:5, colStart:2, rowStart:3, colSpan:1, rowSpan:1, img:null, fit:'cover' },
  ];
  nextId = 6;
  document.getElementById('gapSlider').value = 6;
  document.getElementById('padSlider').value = 0;
  document.getElementById('gapVal').textContent = '6px';
  document.getElementById('padVal').textContent = '0px';
  document.getElementById('colCount').textContent = 2;
  document.getElementById('rowCount').textContent = 3;
  document.getElementById('selSection').style.display = 'none';
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.toggle('active', b.dataset.w === '1080' && b.dataset.h === '1920'));
  document.querySelectorAll('.bg-swatch').forEach((s,i) => s.classList.toggle('active', i===0));
  renderAll();
});

/* ── Export JPG ── */
document.getElementById('exportBtn').addEventListener('click', async function() {
  this.disabled = true;
  this.textContent = 'Exporting…';
  try {
    const exportFrame = document.createElement('div');
    exportFrame.style.cssText = [
      `width:${frameW}px`,
      `height:${frameH}px`,
      `background:${bgColor}`,
      `display:grid`,
      `grid-template-columns:repeat(${cols},1fr)`,
      `grid-template-rows:repeat(${rows},1fr)`,
      `gap:${gap}px`,
      `padding:${pad}px`,
      `overflow:hidden`,
      `position:fixed`,
      `left:-99999px`,
      `top:0`,
    ].join(';') + ';';

    for (const s of slots) {
      const cell = document.createElement('div');
      cell.style.cssText = [
        `grid-column:${s.colStart}/span ${s.colSpan}`,
        `grid-row:${s.rowStart}/span ${s.rowSpan}`,
        `overflow:hidden`,
        `background:#d8d4cc`,
      ].join(';') + ';';
      if (s.img) {
        const img = document.createElement('img');
        img.src = s.img;
        img.style.cssText = `width:100%;height:100%;object-fit:${s.fit || 'cover'};display:block;`;
        cell.appendChild(img);
      }
      exportFrame.appendChild(cell);
    }

    document.body.appendChild(exportFrame);
    await new Promise(r => setTimeout(r, 300));

    const canvas = await html2canvas(exportFrame, {
      width: frameW, height: frameH,
      scale: 1, useCORS: true, logging: false,
      backgroundColor: bgColor,
    });

    document.body.removeChild(exportFrame);

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
