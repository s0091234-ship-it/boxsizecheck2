(() => {
  const $ = (id) => document.getElementById(id);
  const inW = $('inW'), inD = $('inD'), inH = $('inH'), inName = $('inName');
  const norm = (s) => String(s).toLowerCase().replace(/\s+/g, '');
  const grid = $('grid'), empty = $('empty'), count = $('count');
  const catFilter = $('catFilter'), sortSel = $('sortSel');
  let tol = 30;

  // 카테고리 필터 채우기
  const cats = [...new Set(BOXES.map((b) => b.cat))];
  catFilter.innerHTML = '<option value="">전체 카테고리</option>' +
    cats.map((c) => `<option>${c}</option>`).join('');

  const num = (el) => { const v = parseFloat(el.value); return v > 0 ? v : null; };

  // 박스 하나에 대해 입력값과의 매칭 계산. 범위 밖이면 null
  function match(box, q, rotate) {
    const orients = rotate
      ? [[box.w, box.d, 'w', 'd'], [box.d, box.w, 'd', 'w']]
      : [[box.w, box.d, 'w', 'd']];
    let best = null;
    for (const [a, b, ka, kb] of orients) {
      const pairs = [[q.w, a, ka], [q.d, b, kb], [q.h, box.h, 'h']].filter((p) => p[0] != null);
      if (pairs.some(([qv, bv]) => Math.abs(qv - bv) > tol)) continue;
      const score = pairs.reduce((s, [qv, bv]) => s + Math.abs(qv - bv), 0);
      if (!best || score < best.score) best = { score, keys: pairs.map((p) => p[2]) };
    }
    return best;
  }

  function boxSvg(b) {
    // 간단한 아이소메트릭 박스 (비율 반영)
    const max = Math.max(b.w, b.d, b.h);
    const s = 70 / max;
    const w = b.w * s, d = b.d * s * 0.5, h = b.h * s;
    const cx = 80, by = 110;
    const p = (x, y) => `${x.toFixed(1)},${y.toFixed(1)}`;
    const A = [cx - w / 2, by], B = [cx + w / 2, by];
    const front = [A, B, [B[0], by - h], [A[0], by - h]];
    const top = [[A[0], by - h], [B[0], by - h], [B[0] + d, by - h - d], [A[0] + d, by - h - d]];
    const side = [B, [B[0] + d, by - d], [B[0] + d, by - h - d], [B[0], by - h]];
    const poly = (pts, fill) => `<polygon points="${pts.map((q) => p(...q)).join(' ')}" fill="${fill}" stroke="rgba(0,0,0,.08)"/>`;
    return `<svg width="170" height="120" viewBox="0 0 170 120">${poly(side, '#b98146')}${poly(top, '#e2b67c')}${poly(front, '#d3a066')}</svg>`;
  }

  function render() {
    const q = { w: num(inW), d: num(inD), h: num(inH) };
    const hasQuery = q.w || q.d || q.h;
    const rotate = $('rotate').checked;
    const cat = catFilter.value;
    const nameRaw = inName.value.trim();
    const terms = nameRaw.split(/\s+/).filter(Boolean).map(norm);

    let list = BOXES.filter((b) => !cat || b.cat === cat)
      .filter((b) => {
        if (!terms.length) return true;
        const hay = norm([b.code, b.cat, b.type, b.flute, b.proc, `${b.w}x${b.d}x${b.h}`].join(' '));
        return terms.every((t) => hay.includes(t));
      }).map((b) => ({ b, m: hasQuery ? match(b, q, rotate) : { score: 0, keys: [] } }))
      .filter((x) => x.m);

    const vol = (b) => b.w * b.d * b.h;
    const sorters = {
      match: (x, y) => x.m.score - y.m.score || vol(x.b) - vol(y.b),
      'vol-asc': (x, y) => vol(x.b) - vol(y.b),
      'vol-desc': (x, y) => vol(y.b) - vol(x.b),
      'w-asc': (x, y) => x.b.w - y.b.w || x.b.d - y.b.d,
    };
    if (hasQuery || sortSel.value !== 'match') list.sort(sorters[sortSel.value]);

    const label = [q.w && `가로 ${q.w}`, q.d && `세로 ${q.d}`, q.h && `높이 ${q.h}`].filter(Boolean).join(' · ');
    const titleParts = [nameRaw && `“${nameRaw}”`, hasQuery && `${label} mm`].filter(Boolean);
    $('resultTitle').textContent = titleParts.length ? `${titleParts.join(' · ')} 검색 결과` : '전체 상품';
    count.innerHTML = `총 <b>${list.length}</b>개의 박스${hasQuery ? ` (오차 ±${tol}mm)` : ''}`;
    empty.hidden = list.length > 0;

    grid.innerHTML = list.map(({ b, m }, i) => {
      const hl = (k) => (m.keys.includes(k) ? 'hl' : '');
      const badge = hasQuery
        ? (m.score === 0 ? '<span class="badge exact">정확히 일치</span>' : `<span class="badge">오차 합계 ${m.score}mm</span>`)
        : '';
      return `<article class="card" style="animation-delay:${Math.min(i, 20) * 25}ms">
        <div class="card-viz">${boxSvg(b)}</div>
        ${badge}
        <p class="card-cat">${b.cat}</p>
        <h3 class="card-code">${b.code}</h3>
        <p class="dims"><span class="${hl('w')}">${b.w}</span> × <span class="${hl('d')}">${b.d}</span> × <span class="${hl('h')}">${b.h}</span> <small>mm</small></p>
        <div class="meta"><span>${b.type}</span><span>${b.flute}</span><span>${b.unit}장 단위</span><span>${b.proc}</span></div>
      </article>`;
    }).join('');
  }

  let t;
  const debounced = () => { clearTimeout(t); t = setTimeout(render, 150); };
  inName.addEventListener('keydown', (e) => { if (e.key === 'Enter') { render(); $('results').scrollIntoView(); } });
  [inW, inD, inH, inName].forEach((el) => el.addEventListener('input', debounced));
  $('rotate').addEventListener('change', render);
  catFilter.addEventListener('change', render);
  sortSel.addEventListener('change', render);

  $('tolChips').addEventListener('click', (e) => {
    const c = e.target.closest('.chip'); if (!c) return;
    document.querySelectorAll('#tolChips .chip').forEach((x) => x.classList.toggle('active', x === c));
    tol = +c.dataset.tol; render();
  });

  $('searchForm').addEventListener('submit', (e) => { e.preventDefault(); render(); $('results').scrollIntoView(); });
  $('btnSearch').addEventListener('click', () => { render(); $('results').scrollIntoView(); });
  $('btnReset').addEventListener('click', () => {
    inW.value = inD.value = inH.value = inName.value = ''; catFilter.value = ''; sortSel.value = 'match'; render();
  });

  render();
})();
