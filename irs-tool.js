/* AllFolio.pt – ferramenta do relatório anual da XTB (página /irs-xtb e área de testes do painel).
   Lê o PDF no próprio aparelho: o ficheiro nunca é enviado para nenhum servidor. Requer logic.js (TF). */
(function (G) {
  const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/';
  const LIBS = { pdf: CDN + 'pdf.js/3.11.174/pdf.min.js', worker: CDN + 'pdf.js/3.11.174/pdf.worker.min.js', jspdf: CDN + 'jspdf/2.5.1/jspdf.umd.min.js', autotable: CDN + 'jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js', xlsx: CDN + 'xlsx/0.18.5/xlsx.full.min.js' };
  const XTB_NIF = '980436613';
  const fmtEUR = n => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n || 0);
  const fmtN = (n, d = 2) => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n || 0);
  const fmtD = d => d ? d.split('-').reverse().join('/') : '';
  const plus = n => (n > 0.004 ? '+' : '') + fmtEUR(n);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cname = c => (TF.COUNTRIES && TF.COUNTRIES[c]) || ('País ' + TF.pad3(c));
  const cnameS = c => `${TF.pad3(c)} ${cname(c)}`;
  const plain = s => String(s).replace(/\u00a0/g, ' ');
  const loaded = {};
  const ready = { [LIBS.pdf]: () => G.pdfjsLib, [LIBS.jspdf]: () => G.jspdf, [LIBS.autotable]: () => G.jspdf && G.jspdf.jsPDF.API.autoTable, [LIBS.xlsx]: () => G.XLSX };
  const loadScript = src => (ready[src] && ready[src]()) ? Promise.resolve() : loaded[src] || (loaded[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => { delete loaded[src]; rej(new Error('Sem ligação à internet para carregar ' + src.split('/').pop())); }; document.head.appendChild(s); }));

  async function pdfText(file) {
    if (!G.pdfjsLib) { await loadScript(LIBS.pdf); G.pdfjsLib.GlobalWorkerOptions.workerSrc = LIBS.worker; }
    const pdf = await G.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise, lines = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const items = (await (await pdf.getPage(p)).getTextContent()).items.filter(it => it.str && it.str.trim()), rows = new Map();
      items.forEach(it => { const y = Math.round(it.transform[5] / 3); (rows.get(y) || rows.set(y, []).get(y)).push(it); });
      [...rows.entries()].sort((x, y) => y[0] - x[0]).forEach(([, its]) => lines.push(its.sort((x, y) => x.transform[4] - y.transform[4]).map(it => it.str.trim()).join(' ')));
    }
    return lines.join('\n');
  }
  async function shareFile(blob, name, type) {
    const file = new File([blob], name, { type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: name }); return true; } catch (e) { if (e.name === 'AbortError') return false; } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); return true;
  }

  function guideData(R) {
    const groups = TF.portalGroups(R, XTB_NIF);
    groups.forEach(g => { const v = R.portal && R.portal[g.key]; g.portalValues = v || []; g.match = v && v.length ? TF.matchPortal(v, g.lots) : null; });
    const sh = R.shares, sum = f => TF.r2(sh.reduce((s, x) => s + x[f], 0));
    const fracNet = TF.r2(R.frac.reduce((s, x) => s + x.net, 0)), cfdNet = TF.r2(R.cfd.reduce((s, x) => s + x.net, 0));
    const saldo = TF.r2(sum('real') - sum('aq') - sum('desp')), total = TF.r2(saldo + fracNet + cfdNet);
    return { R, groups, real: sum('real'), aq: sum('aq'), desp: sum('desp'), saldo, fracNet, cfdNet, total, tax: TF.r2(Math.max(0, total) * 0.28),
      ok: R.checks.every(c => c.ok !== false), long: sh.filter(s => s.days >= 730).length, dates: new Set(groups.map(g => g.sell)).size };
  }
  function lotRows(g) {
    if (g.match && g.match.ok) return g.match.assign.flatMap(a => a.parts.map((p, i, arr) => ({ portal: a.value, first: i === 0, real: p.real, aq: TF.r2(p.lot.aq * p.frac), desp: TF.r2(p.lot.desp * p.frac), lot: p.lot })));
    return g.lots.map((l, i) => ({ portal: null, first: i === 0, real: l.real, aq: l.aq, desp: l.desp, lot: l }));
  }
  function guideTable(D) {
    const head = ['Linha Portal', 'Titular', 'NIF entidade emitente', 'Código', 'Ano real.', 'Mês', 'Dia', 'Valor realização', 'Ano aquis.', 'Mês', 'Dia', 'Valor aquisição', 'Despesas e encargos', 'País contraparte', 'Valores mobiliários?', 'Resultado', 'País da fonte'];
    const blocks = D.groups.map(g => {
      const rows = lotRows(g), [sy, sm, sd] = g.sell.split('-').map(Number);
      const title = `Venda de ${fmtD(g.sell)} · NIF ${g.nif}${g.pt ? ' (empresa portuguesa)' : ''} · total no Portal ${plain(fmtEUR(g.real))} · `
        + (g.match && g.match.ok ? `preencher ${rows.length} linha(s) conforme a coluna "Linha Portal"` : g.lots.length === 1 ? 'completar a linha pré-preenchida' : `introduzir ${rows.length} linhas (substituem as pré-preenchidas desta data)`);
      return { title, rows: rows.map(r => { const [by, bm, bd] = r.lot.buy.split('-').map(Number);
        return [r.portal != null && r.first ? TF.r2(r.portal) : '', 'A', g.nif, r.lot.code, sy, sm, sd, TF.r2(r.real), by, bm, bd, TF.r2(r.aq), TF.r2(r.desp), '620', 'SIM', TF.r2(r.real - r.aq - r.desp), cnameS(r.lot.country) + (r.lot.days >= 730 ? ' · +2 anos' : '')]; }) };
    });
    return { head, blocks, money: [0, 7, 11, 12, 15] };
  }
  async function exportPDF(D) {
    await loadScript(LIBS.jspdf); await loadScript(LIBS.autotable);
    const R = D.R, T = guideTable(D), y = R.year, e = n => plain(fmtEUR(n));
    const doc = new G.jspdf.jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' }), W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
    doc.setFillColor(10, 42, 102); doc.rect(0, 0, W, 70, 'F'); doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(17);
    doc.text(`IRS ${y} - Guia para o Portal (mais-valias XTB)`, 32, 32); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text([R.holder, R.nif ? 'NIF ' + R.nif : ''].filter(Boolean).join(' - ') || 'Relatório anual de mais-valias da XTB', 32, 52);
    doc.text(`Gerado em ${fmtD(new Date().toISOString().slice(0, 10))} com AllFolio.pt`, W - 32, 52, { align: 'right' }); doc.setTextColor(10, 42, 102);
    doc.autoTable({ startY: 86, theme: 'plain', styles: { fontSize: 9.5, cellPadding: 3, textColor: [10, 42, 102] }, columnStyles: { 1: { halign: 'right', fontStyle: 'bold' }, 3: { halign: 'right', fontStyle: 'bold' } },
      body: [['Total de realização (ações e ETF)', e(D.real), 'Saldo de mais-valias (ações e ETF)', e(D.saldo)], ['Total de aquisição', e(D.aq), 'Ações fracionadas (resultado líquido)', e(D.fracNet)],
        ['Despesas e encargos', e(D.desp), 'Saldo total', e(D.total)], ['Linhas do relatório da XTB', String(R.shares.length), 'Imposto estimado (taxa autónoma de 28%)', e(D.tax)],
        ['Conferência com os totais da XTB', D.ok ? 'OK' : 'VERIFICAR', 'Datas de venda', String(D.dates)]], margin: { left: 32, right: 32 } });
    let yy = doc.lastAutoTable.finalY + 14; doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.text('Como preencher (Anexo G, quadro 9, pré-preenchido pelas Finanças)', 32, yy); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.8); yy += 13;
    const notes = ['As Finanças pré-preenchem o Anexo G, quadro 9, com as vendas comunicadas pela XTB: uma linha por venda, só com a data e o valor de realização, e com o NIF da XTB (980436613) como entidade emitente (as empresas portuguesas aparecem com o NIF da própria empresa).',
      'Para cada data de venda, as linhas pré-preenchidas com essa data somam o "total no Portal" indicado nas páginas seguintes.',
      'Venda com uma só compra: complete a linha pré-preenchida com o ano, mês, dia e valor de aquisição e as despesas.',
      'Venda com várias compras: quando a coluna "Linha Portal" está preenchida, cada linha pré-preenchida é dividida nas compras indicadas. Quando não está, apague as linhas pré-preenchidas dessa data e introduza as linhas indicadas: o total de realização fica exatamente igual.',
      'Em todas as linhas: titular A, país da contraparte 620 (Portugal) e "Respeita a valores mobiliários admitidos à negociação ou a partes de OIC abertos?" = SIM.',
      'Código: G01 para ações; a XTB indica G20 para ETF (unidades de participação em fundos). O Portal pode pré-preencher G01 em todas as linhas; a taxa é igual.',
      R.frac.length ? 'Ações fracionadas: não vêm pré-preenchidas. A XTB classifica-as como cessão de direitos (código G98), no Anexo J, quadro 9.2B, só com o resultado líquido por país (última página).' : 'Não houve vendas de ações fracionadas neste ano.',
      D.long ? `${D.long} linha(s) com mais de 2 anos de detenção podem beneficiar de redução da taxa.` : 'Todas as compras vendidas foram detidas menos de 2 anos: sem redução de taxa por detenção.',
      'Estimativa sem opção pelo englobamento. Ajuda ao preenchimento com base no relatório da XTB; não substitui a análise da contabilista.'];
    for (const n of notes) { const ls = doc.splitTextToSize('- ' + n, W - 64); if (yy + ls.length * 11 > H - 30) { doc.addPage(); yy = 40; } doc.text(ls, 32, yy); yy += ls.length * 11 + 2; }
    doc.addPage(); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Anexo G - Quadro 9: linhas a introduzir, por data de venda', 32, 36); doc.setFont('helvetica', 'normal');
    const body = [], cell = (v, i) => v === '' ? '' : T.money.includes(i) ? e(v) : String(v);
    T.blocks.forEach(b => { body.push([{ content: b.title, colSpan: T.head.length, styles: { halign: 'left', fontStyle: 'bold', fillColor: [230, 238, 252], textColor: [10, 42, 102] } }]); b.rows.forEach(r => body.push(r.map(cell))); });
    doc.autoTable({ startY: 46, head: [T.head], body, styles: { fontSize: 7, cellPadding: 2.6, textColor: [10, 42, 102], halign: 'right' }, headStyles: { fillColor: [29, 78, 216], textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 6.8 },
      margin: { left: 20, right: 20 }, columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 13: { halign: 'center' }, 14: { halign: 'center' }, 16: { halign: 'left' } } });
    if (R.frac.length || R.cfd.length) {
      doc.addPage(); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Ações fracionadas e CFD (não pré-preenchidos)', 32, 36); doc.setFont('helvetica', 'normal');
      doc.autoTable({ startY: 48, head: [['Anexo / quadro', 'Código', 'País da fonte', 'Rendimento líquido', 'Imposto pago no estrangeiro', 'País da contraparte']],
        body: [...R.frac.map(f => ['Anexo J - 9.2B', f.code, cnameS(f.country), e(f.net), e(f.tax), TF.pad3(f.cp)]), ...R.cfd.map(f => [f.code === 'G51' ? 'Anexo G - 13' : 'Anexo J - 9.2B', f.code, cnameS(f.country), e(f.net), e(f.tax), TF.pad3(f.cp)])],
        styles: { fontSize: 8.5, cellPadding: 3, textColor: [10, 42, 102] }, headStyles: { fillColor: [29, 78, 216], textColor: 255 }, margin: { left: 32, right: 32 } });
    }
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) { doc.setPage(p); doc.setFontSize(7); doc.setTextColor(120); doc.text(`Página ${p} de ${pages} - gerado com AllFolio.pt a partir do relatório anual da XTB; confirmar com o pré-preenchimento do Portal das Finanças.`, 32, H - 14); }
    return shareFile(doc.output('blob'), `IRS_${y}_guia_Portal_XTB.pdf`, 'application/pdf');
  }
  async function exportXLSX(D) {
    await loadScript(LIBS.xlsx);
    const X = G.XLSX, R = D.R, T = guideTable(D), y = R.year, wb = X.utils.book_new();
    const sheet = (rows, widths) => { const ws = X.utils.aoa_to_sheet(rows); ws['!cols'] = widths.map(w => ({ wch: w })); return ws; };
    X.utils.book_append_sheet(wb, sheet([[`IRS ${y} - Guia para o Portal (XTB)`], [R.holder || '', R.nif ? 'NIF ' + R.nif : ''], [], ['Total de realização', D.real], ['Total de aquisição', D.aq], ['Despesas e encargos', D.desp],
      ['Saldo ações e ETF', D.saldo], ['Ações fracionadas (líquido)', D.fracNet], ['Saldo total', D.total], ['Imposto estimado (28%)', D.tax], ['Conferência com a XTB', D.ok ? 'OK' : 'VERIFICAR']], [36, 18]), 'Resumo');
    const rows = [T.head]; T.blocks.forEach(b => { rows.push([b.title]); b.rows.forEach(r => rows.push(r)); });
    X.utils.book_append_sheet(wb, sheet(rows, T.head.map(h => Math.max(9, h.length + 2))), 'Anexo G Q9');
    if (R.frac.length || R.cfd.length) X.utils.book_append_sheet(wb, sheet([['Quadro', 'Código', 'País da fonte', 'Rendimento líquido', 'Imposto estrangeiro', 'País contraparte'],
      ...R.frac.map(f => ['Anexo J 9.2B', f.code, TF.pad3(f.country), f.net, f.tax, TF.pad3(f.cp)]), ...R.cfd.map(f => [f.code === 'G51' ? 'Anexo G 13' : 'Anexo J 9.2B', f.code, TF.pad3(f.country), f.net, f.tax, TF.pad3(f.cp)])], [14, 8, 14, 18, 18, 14]), 'Frações e CFD');
    X.utils.book_append_sheet(wb, sheet([['Linha XTB', 'Quadro XTB', 'País fonte', 'Código', 'Data venda', 'Valor realização', 'Data compra', 'Valor aquisição', 'Despesas', 'Resultado', 'Dias'],
      ...R.shares.map(s => [s.line, s.src === 'G' ? 'Anexo G Q9' : 'Anexo J 9.2A', TF.pad3(s.country), s.code, s.sell, s.real, s.buy, s.aq, s.desp, s.ganho, s.days])], [10, 14, 10, 8, 12, 16, 12, 16, 10, 10, 6]), 'Linhas XTB');
    return shareFile(new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `IRS_${y}_guia_Portal_XTB.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }

  const CSS = `.irst{color:#0A2A66;font-size:15px;line-height:1.5}.irst *{box-sizing:border-box}
.irst-drop{display:block;border:2px dashed #93B4F0;border-radius:18px;background:#fff;padding:22px 16px;text-align:center;cursor:pointer}
.irst-drop b{display:block;font-size:17px}.irst-drop small{display:block;color:#64748B;margin-top:4px}.irst-drop input{display:none}
.irst-msg{margin-top:12px;border-radius:14px;padding:10px 12px;background:#EEF3FB;font-size:14px}.irst-msg.err{background:#FDECEC;color:#991B1B}
.irst-sum{margin-top:14px;background:linear-gradient(135deg,#1D4ED8,#0A2A66);color:#fff;border-radius:20px;padding:16px}
.irst-kp{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px}.irst-kp div{background:rgba(255,255,255,.1);border-radius:12px;padding:8px 10px}
.irst-kp span{display:block;font-size:12px;opacity:.8}.irst-kp b{font-size:19px;font-variant-numeric:tabular-nums}
.irst-g{margin-top:10px;background:#fff;border:1px solid #DCE7F8;border-radius:16px}.irst-g summary{cursor:pointer;padding:12px;display:flex;justify-content:space-between;gap:8px;list-style:none}
.irst-g summary::-webkit-details-marker{display:none}.irst-g .in{padding:0 12px 12px}.irst-tw{overflow-x:auto}
.irst table{width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums}.irst th{background:#EEF3FB;color:#1A3FAE;text-align:left;padding:6px 8px;white-space:nowrap}.irst td{padding:6px 8px;border-top:1px solid #EEF3FB;white-space:nowrap}
.irst-cmp{margin-top:8px;background:#F4F7FC;border-radius:12px;padding:8px 10px;font-size:12px}.irst-cmp input{width:100%;border:1px solid #DCE7F8;border-radius:10px;padding:8px;font-size:15px;margin-top:4px}
.irst-btn{display:inline-flex;align-items:center;justify-content:center;border:none;border-radius:14px;font-weight:800;font-size:15px;padding:12px 16px;cursor:pointer;font-family:inherit}
.irst-p{background:#1D4ED8;color:#fff}.irst-s{background:#EEF3FB;color:#1D4ED8}.irst-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}
.irst-lock{margin-top:12px;border-radius:16px;background:#fff;border:1px solid #DCE7F8;padding:14px;text-align:center}.irst-note{font-size:12px;color:#64748B;margin-top:10px}
.irst-g .ok{color:#0F9D6E;font-weight:700}.irst-g .warn{color:#92400E}.irst-up{color:#0F9D6E}.irst-dn{color:#B91C1C}`;
  function mount(el, opts = {}) {
    const o = { full: true, exports: true, lockedText: 'O guia completo, com as linhas prontas para o Portal e o PDF/Excel para a contabilista, abre em breve.', ...opts };
    if (!document.getElementById('irst-css')) { const s = document.createElement('style'); s.id = 'irst-css'; s.textContent = CSS; document.head.appendChild(s); }
    let R = null, openKey = null;
    el.classList.add('irst');
    el.innerHTML = `<label class="irst-drop"><input type="file" accept="application/pdf,.pdf"><b>📄 Carregar o PDF "IRS – Capital Gains" da XTB</b><small>O ficheiro é lido neste aparelho e não é enviado para nenhum servidor.</small></label><div class="irst-out"></div>`;
    const out = el.querySelector('.irst-out');
    el.querySelector('input').onchange = async ev => {
      const f = ev.target.files[0]; ev.target.value = ''; if (!f) return;
      out.innerHTML = '<div class="irst-msg">A ler o relatório…</div>';
      try {
        const r = TF.parseXtbAnnual(await (o.readText || pdfText)(f));
        if (!r.ok || !r.year) { out.innerHTML = '<div class="irst-msg err">Não reconheci o relatório anual de mais-valias da XTB neste PDF. Confirme que é o documento "IRS – Capital Gains" que a XTB envia.</div>'; return; }
        R = { ...r, portal: {} }; draw(); if (o.onParsed) o.onParsed(R);
      } catch (e) { out.innerHTML = `<div class="irst-msg err">${esc(e.message || 'Não foi possível ler o PDF.')}</div>`; }
    };
    function draw() {
      const D = guideData(R);
      const grp = (g, gi) => {
        const rows = lotRows(g), head = g.match && g.match.ok ? `Linhas do Portal associadas às compras (${rows.length} linhas a preencher)` : g.lots.length === 1 ? 'Completar a linha pré-preenchida' : `As linhas desta data somam ${fmtEUR(g.real)}`;
        return `<details class="irst-g" ${(openKey ? g.key === openKey : gi === 0) ? 'open' : ''}><summary><span><b>${fmtD(g.sell)}</b> <small style="color:#64748B">· NIF ${esc(g.nif)}${g.pt ? ' (empresa portuguesa)' : ''}</small><small style="display:block;color:#64748B">${g.lots.length} compra(s) · ${esc(g.countries.map(cname).join(', '))}</small></span>
          <span style="text-align:right"><b>${fmtEUR(g.real)}</b><small style="display:block" class="${g.ganho >= 0 ? 'irst-up' : 'irst-dn'}">${plus(g.ganho)}</small></span></summary>
          <div class="in"><p style="font-size:12px;font-weight:700;color:#1D4ED8;margin:0 0 6px">${head}</p>
          <div class="irst-tw"><table><thead><tr>${g.match && g.match.ok ? '<th>Linha Portal</th>' : ''}<th>Data compra</th><th>Valor venda</th><th>Valor compra</th><th>Despesas</th><th>Código</th><th>País</th></tr></thead>
          <tbody>${rows.map(r => `<tr>${g.match && g.match.ok ? `<td>${r.first ? fmtEUR(r.portal) : ''}</td>` : ''}<td>${fmtD(r.lot.buy)}</td><td>${fmtEUR(r.real)}</td><td>${fmtEUR(r.aq)}</td><td>${fmtEUR(r.desp)}</td><td>${esc(r.lot.code)}</td><td>${esc(cname(r.lot.country))}${r.lot.days >= 730 ? ' · <b class="irst-up">+2 anos</b>' : ''}</td></tr>`).join('')}</tbody></table></div>
          <div class="irst-cmp"><label for="irpv${gi}">Valores pré-preenchidos no Portal com esta data (opcional)</label><div style="display:flex;gap:6px"><input id="irpv${gi}" inputmode="decimal" placeholder="ex.: 553,89 16,88" value="${esc(g.portalValues.map(v => fmtN(v, 2)).join('  '))}"><button class="irst-btn irst-p" data-pv="${gi}" style="padding:8px 12px;margin-top:4px">Comparar</button></div>
          ${g.match ? `<div class="${g.match.ok ? 'ok' : 'warn'}" style="margin-top:6px">${g.match.ok ? '✓ Cada linha do Portal foi associada às compras correspondentes.' : esc(g.match.msg)}</div>` : ''}</div></div></details>`;
      };
      out.innerHTML = `<div class="irst-sum"><div style="font-size:13px;opacity:.85">${esc(R.holder || 'Relatório anual da XTB')} · IRS ${esc(R.year)}</div>
        <div class="irst-kp"><div><span>Saldo de mais-valias</span><b>${plus(D.total)}</b></div><div><span>Imposto estimado (28%)</span><b>${fmtEUR(D.tax)}</b></div>
        <div><span>Linhas para o Portal</span><b>${R.shares.length}</b></div><div><span>Ações fracionadas</span><b>${R.frac.length ? R.frac.length + ' linha(s)' : 'nenhuma'}</b></div></div>
        <div style="font-size:12px;margin-top:10px;color:${D.ok ? '#A7F3D0' : '#FDE68A'}">${D.ok ? '✓ Os totais conferem com os da XTB' : '⚠ Os totais lidos não batem certo com os da XTB: confira o PDF.'}</div></div>
        ${R.frac.length ? `<div class="irst-msg">As <b>ações fracionadas</b> não vêm pré-preenchidas no Portal: a XTB classifica-as como direitos (código G98, Anexo J, quadro 9.2B), só com o resultado líquido por país. Têm de ser acrescentadas à mão.</div>` : ''}
        ${o.full ? `<h3 style="margin:18px 0 0;font-size:17px">Anexo G · Quadro 9, por data de venda</h3>${D.groups.map(grp).join('')}
          ${R.frac.length ? `<h3 style="margin:18px 0 6px;font-size:17px">Ações fracionadas · Anexo J, quadro 9.2B</h3><div class="irst-tw"><table><thead><tr><th>Código</th><th>País da fonte</th><th>Rendimento líquido</th><th>Imposto estrangeiro</th><th>Contraparte</th></tr></thead><tbody>${R.frac.map(f => `<tr><td>${f.code}</td><td>${esc(cnameS(f.country))}</td><td>${fmtEUR(f.net)}</td><td>${fmtEUR(f.tax)}</td><td>${TF.pad3(f.cp)}</td></tr>`).join('')}</tbody></table></div>` : ''}
          ${o.exports ? `<div class="irst-row"><button class="irst-btn irst-p" data-x="pdf">Descarregar PDF</button><button class="irst-btn irst-s" data-x="xlsx">Descarregar Excel</button></div>` : ''}`
        : `<div class="irst-lock"><b>🔒 Guia completo</b><p style="margin:6px 0 0;font-size:14px;color:#334155">${esc(o.lockedText)}</p></div>`}
        <p class="irst-note">Ajuda ao preenchimento com base no relatório da XTB. Não é aconselhamento fiscal: a contabilista decide o preenchimento final.</p>`;
      out.querySelectorAll('[data-pv]').forEach(b => b.onclick = () => { const g = D.groups[+b.dataset.pv], vals = out.querySelector('#irpv' + b.dataset.pv).value.split(/[\s;]+/).map(v => TF.num(v)).filter(v => v > 0); if (vals.length) R.portal[g.key] = vals; else delete R.portal[g.key]; openKey = g.key; draw(); });
      out.querySelectorAll('[data-x]').forEach(b => b.onclick = async () => { b.disabled = true; const t = b.textContent; b.textContent = 'A preparar…'; try { await (b.dataset.x === 'pdf' ? exportPDF(D) : exportXLSX(D)); } catch (e) { alert(e.message); } b.disabled = false; b.textContent = t; });
    }
    return { get report() { return R; } };
  }
  G.IRSTool = { mount, pdfText, guideData };
})(window);
