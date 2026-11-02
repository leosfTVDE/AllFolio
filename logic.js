'use strict';
/* ================= TaxFolio — núcleo de cálculo (sem DOM) ================= */
const TF = (() => {
  const COUNTRIES = {620:'Portugal',840:'Estados Unidos',372:'Irlanda',276:'Alemanha',528:'Países Baixos',250:'França',442:'Luxemburgo',826:'Reino Unido',724:'Espanha',380:'Itália',756:'Suíça',124:'Canadá',56:'Bélgica',40:'Áustria',208:'Dinamarca',752:'Suécia',578:'Noruega',246:'Finlândia',616:'Polónia',196:'Chipre',440:'Lituânia',392:'Japão',156:'China',344:'Hong Kong',36:'Austrália',76:'Brasil',136:'Ilhas Caimão',832:'Jersey',60:'Bermudas',158:'Taiwan',410:'Coreia do Sul',356:'Índia',484:'México'};
  const ISO2 = {PT:620,US:840,IE:372,DE:276,NL:528,FR:250,LU:442,GB:826,ES:724,IT:380,CH:756,CA:124,BE:56,AT:40,DK:208,SE:752,NO:578,FI:246,PL:616,CY:196,LT:440,JP:392,CN:156,HK:344,AU:36,BR:76,KY:136,JE:832,BM:60,TW:158,KR:410,IN:356,MX:484};
  const SUFFIX = {US:840,DE:276,F:276,XETRA:276,NL:528,AS:528,FR:250,PA:250,ES:724,MC:724,PT:620,LS:620,IT:380,MI:380,UK:826,L:826,LN:826,BE:56,CH:756,SW:756,DK:208,CO:208,SE:752,ST:752,FI:246,HE:246,NO:578,OL:578,PL:616,WA:616,IE:372};
  // Taxa máxima de retenção prevista na convenção (referência — confirmar)
  const CDT = {840:15,276:15,250:15,528:10,724:15,380:15,756:15,124:15,56:15,40:15,208:15,752:15,578:15,246:15,616:15,826:10,372:15,442:15,76:15,392:10};
  const ANEXO_G_DEFAULT = {XTB:true};
  const NIF_DEFAULT = {XTB:'980436613'};
  const BROKERS = {XTB:{name:'XTB',cp:620},DEGIRO:{name:'DEGIRO',cp:276},T212:{name:'Trading 212',cp:196},REVOLUT:{name:'Revolut',cp:440},OUTRA:{name:'Outra',cp:''}};
  const ETF_HINT = /\b(ETF|UCITS|ISHARES|VANGUARD|XTRACKERS|AMUNDI|SPDR|LYXOR|INVESCO|WISDOMTREE|VANECK)\b/i;
  const US_ETF = new Set(['SPY','VOO','VTI','IVV','QQQ','SCHD','VYM','VT','SMH','DIA','VUG','VEA','VWO','BND','GLD']);
  const ETF_TICKERS = new Set(['VWCE','VWRL','VWRA','IWDA','SWDA','EUNL','CSPX','SXR8','VUSA','VUAA','SPYL','SPPW','EQQQ','CNDX','IS3N','EIMI','XDWD','XDEW','EXSA','MEUD','IUSQ','ISAC','SSAC','VHVE','VEVE','VFEM','XMME','AGGH','IBGS','ZPRV','ZPRX','QDVE','IUIT','SXRV','INRG','VGWL','VGWD','TDIV','VHYL','FWRA','FWIA','WEBN','XNAS','DFNS',...US_ETF]);
  const EPS = 1e-9;

  const r2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const r8 = n => Math.round(Number(n) * 1e8) / 1e8;
  const pad3 = c => (c === '' || c == null) ? '' : String(c).padStart(3, '0');
  const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const T = t => String(t || '').trim().toUpperCase();
  const root = t => T(t).split(/[.\s:]/)[0];
  const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

  // Aceita "1.234,56", "1,234.56", "0,25", "USD 12.30", "-3,5"
  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    if (v == null) return 0;
    let s = String(v).trim().replace(/[^\d,.\-]/g, '');
    if (!s || s === '-') return 0;
    const lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
    if (lc > -1 && ld > -1) s = lc > ld ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    else if (lc > -1) s = (s.match(/,/g).length > 1) ? s.replace(/,/g, '') : s.replace(',', '.');
    else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  // Datas europeias (dd.mm.aaaa / dd/mm/aaaa), ISO e número de série do Excel
  function parseDate(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') {
      if (v < 20000 || v > 80000) return null;
      return new Date(Math.round((v - 25569) * 864e5)).toISOString().slice(0, 10);
    }
    if (v instanceof Date) return isNaN(v) ? null : v.toISOString().slice(0, 10);
    const s = String(v).trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    if (/^\d{5}(\.\d+)?$/.test(s)) return parseDate(Number(s));
    return null;
  }

  function guessKind(ticker, name) { return (ETF_TICKERS.has(root(ticker)) || ETF_HINT.test(name || '')) ? 'etf' : 'acao'; }
  function guessCountry(ticker, isin, kind) {
    if (isin && /^[A-Z]{2}/i.test(isin)) { const c = ISO2[isin.slice(0, 2).toUpperCase()]; if (c) return c; }
    if (kind === 'etf') return US_ETF.has(root(ticker)) || /\.US$/i.test(ticker) ? 840 : 372;
    const m = T(ticker).match(/\.([A-Z]{1,5})$/);
    if (m && SUFFIX[m[1]]) return SUFFIX[m[1]];
    return 840;
  }
  const defaultCode = kind => kind === 'etf' ? 'G20' : 'G01';

  function ensureAsset(state, { ticker, name, isin, kind, country }) {
    const k = T(ticker); if (!k) return null;
    let a = state.assets[k];
    if (!a) {
      const kd = kind || guessKind(k, name);
      a = state.assets[k] = { name: name || k, isin: isin || '', kind: kd, country: country || guessCountry(k, isin, kd), code: defaultCode(kd), price: null };
    } else {
      if (name && (!a.name || a.name === k)) a.name = name;
      if (isin && !a.isin) { a.isin = isin; const c = ISO2[isin.slice(0, 2).toUpperCase()]; if (c) a.country = c; }
    }
    return a;
  }

  /* ---------- FIFO: casa cada fração vendida com as frações compradas mais antigas ---------- */
  function fifo(txs) {
    const order = [...txs].sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 :
      a.type === b.type ? (a.created || 0) - (b.created || 0) : (a.type === 'buy' ? -1 : 1));
    const lots = {}, realized = [], issues = [];
    for (const t of order) {
      const k = t.ticker, kk = t.port ? t.port + '\u0001' + k : k; (lots[kk] ||= []);
      const q = r8(t.qty); if (!(q > 0)) continue;
      if (t.type === 'buy') {
        lots[kk].push({ txId: t.id, date: t.date, qty: q, qty0: q, unit: t.price, feeUnit: (t.fees || 0) / q, broker: t.broker, port: t.port });
      } else {
        let rem = q; const su = t.price, sf = (t.fees || 0) / q;
        while (rem > EPS && lots[kk].length) {
          const lot = lots[kk][0], m = Math.min(lot.qty, rem);
          realized.push({ saleId: t.id, buyId: lot.txId, ticker: k, sellDate: t.date, buyDate: lot.date, qty: r8(m),
            realizacao: m * su, aquisicao: m * lot.unit, despesas: m * (lot.feeUnit + sf),
            broker: t.broker || lot.broker, days: daysBetween(lot.date, t.date), port: t.port });
          lot.qty = r8(lot.qty - m); rem = r8(rem - m);
          if (lot.qty <= EPS) lots[kk].shift();
        }
        if (rem > EPS) issues.push({ ticker: k, date: t.date, qty: rem, saleId: t.id });
      }
    }
    realized.forEach(r => r.ganho = r.realizacao - r.aquisicao - r.despesas);
    // Com várias carteiras, o FIFO corre dentro de cada uma; as posições juntam-se por ativo
    const out = {};
    for (const [kk, ls] of Object.entries(lots)) { const k = kk.includes('\u0001') ? kk.split('\u0001')[1] : kk; (out[k] ||= []).push(...ls); }
    Object.values(out).forEach(ls => ls.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return { lots: out, realized, issues };
  }

  function positions(lots, assets) {
    return Object.entries(lots).map(([k, ls]) => {
      const qty = r8(ls.reduce((s, l) => s + l.qty, 0));
      const cost = ls.reduce((s, l) => s + l.qty * (l.unit + l.feeUnit), 0);
      const a = assets[k] || {};
      return { ticker: k, name: a.name || k, kind: a.kind, country: a.country, qty, cost, avg: qty > 0 ? cost / qty : 0,
        value: a.price ? qty * a.price : null, lots: ls };
    }).filter(p => p.qty > EPS).sort((a, b) => b.cost - a.cost);
  }

  /* ---------- Relatório anual ---------- */
  function yearReport(state, year) {
    const y = String(year), st = state.settings || {};
    const { realized, issues } = fifo(state.tx);
    const map = new Map();
    for (const r of realized.filter(r => r.sellDate.startsWith(y))) {
      const key = r.saleId + '|' + r.buyDate;
      const m = map.get(key);
      if (m) { m.qty = r8(m.qty + r.qty); m.realizacao += r.realizacao; m.aquisicao += r.aquisicao; m.despesas += r.despesas; m.ganho += r.ganho; }
      else map.set(key, { ...r });
    }
    const lines = [...map.values()]
      .sort((a, b) => a.sellDate.localeCompare(b.sellDate) || a.buyDate.localeCompare(b.buyDate) || a.ticker.localeCompare(b.ticker))
      .map(r => {
        const a = state.assets[r.ticker] || {}, country = Number(a.country) || 840;
        const cpMap = st.brokerCp || {}, gMap = { ...ANEXO_G_DEFAULT, ...(st.anexoG || {}) }, nifMap = { ...NIF_DEFAULT, ...(st.nif || {}) };
        const viaG = !!gMap[r.broker];
        return { ...r, name: a.name || r.ticker, country, code: a.code || defaultCode(a.kind), anexo: (country === 620 || viaG) ? 'G' : 'J',
          nif: viaG ? (nifMap[r.broker] || '') : '',
          cp: cpMap[r.broker] != null && cpMap[r.broker] !== '' ? Number(cpMap[r.broker]) : (BROKERS[r.broker]?.cp ?? '') };
      });
    const J = lines.filter(l => l.anexo === 'J'), G = lines.filter(l => l.anexo === 'G');
    const sum = (arr, f) => arr.reduce((s, x) => s + (x[f] || 0), 0);

    const dmap = new Map();
    for (const d of state.div.filter(d => d.date.startsWith(y))) {
      const a = state.assets[d.ticker] || {}, c = Number(d.country || a.country) || 840;
      const m = dmap.get(c) || { country: c, code: 'E11', gross: 0, taxForeign: 0, taxPT: 0, n: 0 };
      m.gross += d.gross || 0; m.taxForeign += d.taxForeign || 0; m.taxPT += d.taxPT || 0; m.n++;
      dmap.set(c, m);
    }
    const cdt = { ...CDT, ...(st.cdt || {}) };
    const D = [...dmap.values()].sort((a, b) => b.gross - a.gross).map(d => {
      const rate = (cdt[d.country] ?? 15);
      const credit = d.country === 620 ? 0 : Math.min(d.taxForeign, d.gross * rate / 100, d.gross * 0.28);
      return { ...d, rate, credit, excess: Math.max(0, d.taxForeign - credit), irs: Math.max(0, d.gross * 0.28 - credit - d.taxPT) };
    });
    const DJ = D.filter(d => d.country !== 620), DPT = D.filter(d => d.country === 620);

    const ganhos = sum(lines.filter(l => l.ganho > 0), 'ganho'), perdas = sum(lines.filter(l => l.ganho < 0), 'ganho');
    const saldo = ganhos + perdas;
    const saldoCurto = sum(lines.filter(l => l.days < 365), 'ganho');
    const mvTax = Math.max(0, saldo) * 0.28, divTax = sum(DJ, 'irs');
    return { year: y, J, G, D: DJ, DPT,
      totals: { ganhos, perdas, saldo, saldoCurto, mvTax, divGross: sum(DJ, 'gross'), divForeign: sum(DJ, 'taxForeign'), divCredit: sum(DJ, 'credit'),
        divPT: sum(DJ, 'taxPT'), divTax, total: mvTax + divTax,
        realJ: sum(J, 'realizacao'), aqJ: sum(J, 'aquisicao'), despJ: sum(J, 'despesas'), realG: sum(G, 'realizacao'), aqG: sum(G, 'aquisicao'), despG: sum(G, 'despesas') },
      issues: issues.filter(i => i.date <= y + '-12-31') };
  }

  function years(state) {
    const s = new Set([String(new Date().getFullYear())]);
    state.tx.forEach(t => t.type === 'sell' && s.add(t.date.slice(0, 4)));
    state.div.forEach(d => s.add(d.date.slice(0, 4)));
    return [...s].sort().reverse();
  }

  /* ================= Importação ================= */
  function parseCSV(text) {
    text = String(text).replace(/^\uFEFF/, '');
    const first = text.split(/\r?\n/).find(l => l.trim()) || '';
    const d = [';', '\t', ','].map(c => [c, first.split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
    const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === d) { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
      else f += c;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    return rows.filter(r => r.some(x => String(x).trim() !== ''));
  }

  const has = (h, ...alts) => alts.some(a => h.some(x => x === a || x.startsWith(a)));
  function idx(h, ...alts) {
    for (const a of alts) { const i = h.findIndex(x => x === a); if (i > -1) return i; }
    for (const a of alts) { const i = h.findIndex(x => x.startsWith(a)); if (i > -1) return i; }
    return -1;
  }
  const cell = (row, i) => i > -1 ? row[i] : '';

  const DETECT = {
    XTB: h => has(h, 'comment', 'comentario') && has(h, 'symbol', 'simbolo') && has(h, 'type', 'tipo'),
    T212: h => has(h, 'action') && has(h, 'no. of shares'),
    REVOLUT: h => has(h, 'price per share') && has(h, 'ticker'),
    DEGIRO: h => has(h, 'isin') && has(h, 'quantidade', 'quantity', 'aantal', 'anzahl') && has(h, 'produto', 'product', 'produkt'),
    GENERIC: h => has(h, 'ticker', 'simbolo', 'symbol') && has(h, 'tipo', 'type', 'operacao') && (has(h, 'quantidade', 'quantity', 'qty', 'qtd') || has(h, 'valor bruto', 'bruto', 'gross'))
  };

  const XTB_RE = /(OPEN|CLOSE)\s+BUY\s+([\d.,]+)(?:\s*\/\s*([\d.,]+))?\s*@\s*([\d.,]+)/i;

  function parseXTB(rows, hi) {
    const h = rows[hi].map(norm), out = [], warn = [], divs = new Map(), whts = [];
    const iT = idx(h, 'type', 'tipo'), iD = idx(h, 'time', 'hora', 'data', 'date'), iS = idx(h, 'symbol', 'simbolo'),
      iC = idx(h, 'comment', 'comentario'), iA = idx(h, 'amount', 'montante', 'quantia', 'valor');
    for (let r = hi + 1; r < rows.length; r++) {
      const row = rows[r], type = norm(cell(row, iT)); if (!type) continue;
      const date = parseDate(cell(row, iD)), sym = T(cell(row, iS)), com = String(cell(row, iC) || ''), amt = num(cell(row, iA));
      if (!date) continue;
      const m = com.match(XTB_RE);
      if (m && sym) {
        const qty = num(m[2]); if (!(qty > 0)) continue;
        const isBuy = m[1].toUpperCase() === 'OPEN';
        let price = Math.abs(amt) / qty, note = '';
        if (!amt) { price = num(m[4]); note = 'Preço na moeda do ativo — confirme em EUR'; }
        out.push({ kind: isBuy ? 'buy' : 'sell', date, ticker: sym, qty: r8(qty), price, fees: 0, broker: 'XTB', note });
      } else if (/divid/.test(type) && sym) {
        const k = sym + '|' + date, d = divs.get(k) || { kind: 'div', date, ticker: sym, gross: 0, taxForeign: 0, taxPT: 0, broker: 'XTB' };
        d.gross += Math.abs(amt); divs.set(k, d);
      } else if (/withholding|retenc|imposto|tax/.test(type) && sym) {
        whts.push({ sym, date, amt: Math.abs(amt) });
      }
    }
    for (const w of whts) {
      let d = divs.get(w.sym + '|' + w.date);
      if (!d) d = [...divs.values()].filter(x => x.ticker === w.sym && Math.abs(daysBetween(x.date, w.date)) <= 10)
        .sort((a, b) => Math.abs(daysBetween(a.date, w.date)) - Math.abs(daysBetween(b.date, w.date)))[0];
      if (d) d.taxForeign += w.amt; else warn.push(`Retenção de ${w.sym} em ${w.date} sem dividendo correspondente`);
    }
    divs.forEach(d => { d.gross = r2(d.gross); d.taxForeign = r2(d.taxForeign); out.push(d); });
    return { out, warn };
  }

  function parseT212(rows, hi) {
    const h = rows[hi].map(norm), out = [], warn = [];
    const iA = idx(h, 'action'), iD = idx(h, 'time'), iTk = idx(h, 'ticker'), iN = idx(h, 'name'), iI = idx(h, 'isin'),
      iQ = idx(h, 'no. of shares'), iP = idx(h, 'price / share'), iPC = idx(h, 'currency (price / share)'),
      iX = idx(h, 'exchange rate'), iTot = idx(h, 'total'), iTotC = idx(h, 'currency (total)'),
      iW = idx(h, 'withholding tax'), iWC = idx(h, 'currency (withholding tax)');
    for (let r = hi + 1; r < rows.length; r++) {
      const row = rows[r], act = norm(cell(row, iA)), date = parseDate(cell(row, iD));
      const ticker = T(cell(row, iTk)); if (!date || !ticker) continue;
      const qty = num(cell(row, iQ)), price = num(cell(row, iP)), cur = T(cell(row, iPC)) || 'EUR', fx = num(cell(row, iX)) || 1;
      const total = num(cell(row, iTot)), totCur = T(cell(row, iTotC)) || 'EUR';
      const base = { date, ticker, name: cell(row, iN), isin: T(cell(row, iI)), broker: 'T212' };
      if (/buy|sell/.test(act) && qty > 0) {
        const isBuy = /buy/.test(act);
        let pe = cur === 'EUR' ? price : price / fx, fees = 0, note = '';
        if (totCur === 'EUR' && total > 0) {
          fees = isBuy ? total - qty * pe : qty * pe - total;
          if (fees < 0 || fees > total * 0.05) { pe = total / qty; fees = 0; note = 'Preço calculado a partir do total em EUR'; }
        }
        out.push({ ...base, kind: isBuy ? 'buy' : 'sell', qty: r8(qty), price: pe, fees: r2(Math.max(0, fees)), note });
      } else if (/dividend/.test(act)) {
        const w = num(cell(row, iW)), wc = T(cell(row, iWC)) || cur;
        const taxForeign = Math.abs(wc === 'EUR' ? w : w / fx);
        const gross = (totCur === 'EUR' && total) ? total + taxForeign : (cur === 'EUR' ? qty * price : qty * price / fx);
        out.push({ ...base, kind: 'div', gross: r2(gross), taxForeign: r2(taxForeign), taxPT: 0 });
      }
    }
    return { out, warn };
  }

  function parseRevolut(rows, hi) {
    const h = rows[hi].map(norm), out = [], warn = [];
    const iD = idx(h, 'date'), iTk = idx(h, 'ticker'), iT = idx(h, 'type'), iQ = idx(h, 'quantity'), iP = idx(h, 'price per share'),
      iTot = idx(h, 'total amount'), iC = idx(h, 'currency'), iX = idx(h, 'fx rate');
    let fxUsed = false;
    for (let r = hi + 1; r < rows.length; r++) {
      const row = rows[r], type = norm(cell(row, iT)), date = parseDate(cell(row, iD)), ticker = T(cell(row, iTk));
      if (!date || !ticker) continue;
      const cur = T(cell(row, iC)) || 'EUR', fx = num(cell(row, iX)) || 1;
      const toEUR = v => cur === 'EUR' ? v : v / fx; if (cur !== 'EUR') fxUsed = true;
      const qty = num(cell(row, iQ)), total = Math.abs(num(cell(row, iTot))), price = num(cell(row, iP));
      const note = cur !== 'EUR' ? `Convertido de ${cur} com o câmbio do extrato — confirme` : '';
      if (/buy|sell/.test(type) && qty > 0) {
        const pe = toEUR(total ? total / qty : price);
        out.push({ kind: /buy/.test(type) ? 'buy' : 'sell', date, ticker, qty: r8(qty), price: pe, fees: 0, broker: 'REVOLUT', note });
      } else if (/dividend/.test(type)) {
        out.push({ kind: 'div', date, ticker, gross: r2(toEUR(total)), taxForeign: 0, taxPT: 0, broker: 'REVOLUT', note: 'A Revolut mostra o valor líquido: acrescente o imposto retido' });
      }
    }
    if (fxUsed) warn.push('Revolut: valores em moeda estrangeira foram convertidos com a coluna FX Rate. Verifique os preços em EUR antes de importar.');
    return { out, warn };
  }

  function parseDEGIRO(rows, hi) {
    const h = rows[hi].map(norm), out = [], warn = [];
    const iD = idx(h, 'data', 'date', 'datum'), iP = idx(h, 'produto', 'product', 'produkt'), iI = idx(h, 'isin'),
      iQ = idx(h, 'quantidade', 'quantity', 'aantal', 'anzahl'), iPr = idx(h, 'precos', 'preco', 'price', 'koers', 'kurs'),
      iV = h.findIndex(x => ['valor', 'value', 'waarde', 'wert'].includes(x)),
      iCost = idx(h, 'custos', 'transaction', 'transactiekosten', 'transaktionskosten', 'comiss'), iFx = idx(h, 'custo autofx', 'autofx');
    for (let r = hi + 1; r < rows.length; r++) {
      const row = rows[r], date = parseDate(cell(row, iD)), q = num(cell(row, iQ));
      if (!date || !q) continue;
      const isin = T(cell(row, iI)), name = String(cell(row, iP) || '').trim();
      const ticker = T(name.split(/\s+/).slice(0, 3).join(' ')).replace(/[^A-Z0-9 .&-]/g, '').slice(0, 18) || isin;
      const v = Math.abs(num(cell(row, iV))), qty = Math.abs(q);
      const pe = v ? v / qty : num(cell(row, iPr));
      const fees = Math.abs(num(cell(row, iCost))) + Math.abs(num(cell(row, iFx)));
      out.push({ kind: q > 0 ? 'buy' : 'sell', date, ticker, name, isin, qty: r8(qty), price: pe, fees: r2(fees), broker: 'DEGIRO',
        note: v ? '' : 'Sem valor em EUR — confirme o preço' });
    }
    warn.push('DEGIRO: o ticker foi criado a partir do nome do produto. Pode renomeá-lo depois na Carteira.');
    return { out, warn };
  }

  function parseGeneric(rows, hi) {
    const h = rows[hi].map(norm), out = [], warn = [];
    const iD = idx(h, 'data', 'date'), iT = idx(h, 'tipo', 'type', 'operacao'), iTk = idx(h, 'ticker', 'simbolo', 'symbol'),
      iN = idx(h, 'nome', 'name', 'produto'), iQ = idx(h, 'quantidade', 'quantity', 'qty', 'qtd'), iP = idx(h, 'preco', 'price'),
      iF = idx(h, 'taxas', 'comissao', 'fees', 'custos', 'despesas'), iC = idx(h, 'moeda', 'currency'), iX = idx(h, 'cambio', 'fx', 'exchange'),
      iI = idx(h, 'isin'), iG = idx(h, 'valor bruto', 'bruto', 'gross'), iWF = idx(h, 'imposto estrangeiro', 'imposto_estrangeiro', 'retencao estrangeiro', 'withholding'),
      iWP = idx(h, 'imposto pt', 'imposto_pt', 'imposto portugal', 'retencao pt', 'retencao portugal'), iB = idx(h, 'corretora', 'broker');
    for (let r = hi + 1; r < rows.length; r++) {
      const row = rows[r], type = norm(cell(row, iT)), date = parseDate(cell(row, iD)), ticker = T(cell(row, iTk));
      if (!date || !ticker) continue;
      const cur = T(cell(row, iC)) || 'EUR', fx = num(cell(row, iX)) || 1, toEUR = v => cur === 'EUR' ? v : v / fx;
      const bk = T(cell(row, iB)).replace(/\s/g, ''); const broker = bk.startsWith('TRADING') ? 'T212' : (BROKERS[bk] ? bk : 'OUTRA');
      const base = { date, ticker, name: cell(row, iN), isin: T(cell(row, iI)), broker };
      if (/^div/.test(type)) {
        const g = num(cell(row, iG)) || num(cell(row, iP));
        out.push({ ...base, kind: 'div', gross: r2(toEUR(g)), taxForeign: r2(toEUR(num(cell(row, iWF)))), taxPT: r2(num(cell(row, iWP))) });
      } else if (/^(compra|buy|c$)/.test(type) || /^(venda|sell|v$)/.test(type)) {
        const qty = num(cell(row, iQ)); if (!(qty > 0)) continue;
        out.push({ ...base, kind: /^(compra|buy|c$)/.test(type) ? 'buy' : 'sell', qty: r8(qty), price: toEUR(num(cell(row, iP))), fees: r2(num(cell(row, iF))) });
      }
    }
    return { out, warn };
  }

  // Texto colado de um extrato XTB (ex.: copiado de PDF)
  function parseXTBText(text) {
    const out = [];
    for (const line of String(text).split(/\r?\n/)) {
      const m = line.match(XTB_RE); if (!m) continue;
      const dm = line.match(/(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4}|\d{4}-\d{2}-\d{2})/); const date = dm && parseDate(dm[1]);
      const sm = line.match(/\b([A-Z0-9]{1,8}\.[A-Z]{2,3})\b/); if (!date || !sm) continue;
      const qty = num(m[2]); if (!(qty > 0)) continue;
      const after = line.slice(line.indexOf(m[0]) + m[0].length);
      const nums = after.match(/-?\d[\d.,]*/g) || [];
      const amt = nums.length ? Math.abs(num(nums[nums.length - 1])) : 0;
      out.push({ kind: m[1].toUpperCase() === 'OPEN' ? 'buy' : 'sell', date, ticker: sm[1], qty: r8(qty),
        price: amt ? amt / qty : num(m[4]), fees: 0, broker: 'XTB', note: amt ? '' : 'Preço na moeda do ativo — confirme em EUR' });
    }
    return out;
  }

  // Confirmação diária de ordens da XTB (PDF "Confirmação das ordens executadas"), em texto
  function parseXTBDaily(text) {
    const t = String(text || '').replace(/\s+/g, ' ');
    const re = /(\d{8,12})\s+([A-Z0-9][A-Z0-9\-]{0,9}\.[A-Z]{2,4})\s+(.*?)\s(Buy|Sell|Compra|Venda)\s+(-?[\d.,]+)\s+(\d{2}[\/.]\d{2}[\/.]\d{4})(?:\s+(\d{2}:\d{2}(?::\d{2})?))?\s+(?:[^\s]+\s+){0,2}?(?:market|limit|stop|mercado|limite)\s+([\d.,]+)\s+([\d.,]+)\s+(\S+)\s+([A-Z]{3})\s+([\d.,]+)\s+(-?[\d.,]+)\s+(-?[\d.,]+)\s+(-?[\d.,]+)/gi;
    const out = []; let m; const hits = [];
    while ((m = re.exec(t))) hits.push({ m, end: re.lastIndex, start: m.index });
    hits.forEach((h, i) => {
      const m = h.m, qty = Math.abs(num(m[5])); if (!(qty > 0)) return;
      const after = t.slice(h.end, i + 1 < hits.length ? hits[i + 1].start : h.end + 80);
      const time = m[7] || (after.match(/\b(\d{2}:\d{2}:\d{2})\b/) || [])[1] || '';
      const price = num(m[8]), cur = m[11].toUpperCase(), conv = Math.abs(num(m[13])), comm = Math.abs(num(m[14])), tot = Math.abs(num(m[15]));
      const isBuy = /buy|compra/i.test(m[4]);
      const pol = /\bDIST\b/i.test(m[3] + ' ' + after) ? 'dist' : /\bACC\b/i.test(m[3] + ' ' + after) ? 'acc' : '';
      out.push({ kind: isBuy ? 'buy' : 'sell', date: parseDate(m[6]), time, ticker: T(m[2]), name: '',
        qty: r8(qty), price, priceOrig: price, currency: cur, xtbFx: num(m[12]), fees: r2(tot || conv + comm), broker: 'XTB', orderId: m[1], policy: pol });
    });
    return out.filter(r => r.date);
  }

  const PARSERS = { XTB: parseXTB, T212: parseT212, REVOLUT: parseRevolut, DEGIRO: parseDEGIRO, GENERIC: parseGeneric };

  function parseSheets(sheets, hint = 'AUTO', rawText = '') {
    const all = [], warn = []; let broker = null;
    const order = hint && hint !== 'AUTO' ? [hint, ...Object.keys(DETECT).filter(k => k !== hint)] : Object.keys(DETECT);
    for (const rows of sheets) {
      if (!rows || !rows.length) continue;
      let done = false;
      for (const key of order) {
        let hi = -1;
        for (let i = 0; i < Math.min(rows.length, 40); i++) if (DETECT[key](rows[i].map(norm))) { hi = i; break; }
        if (hi < 0) continue;
        const res = PARSERS[key](rows, hi);
        if (res.out.length) { all.push(...res.out); warn.push(...res.warn); broker = broker || key; done = true; break; }
      }
      if (done) continue;
    }
    if (!all.length && rawText) { const x = parseXTBText(rawText); if (x.length) { all.push(...x); broker = 'XTB'; } }
    if (!all.length && rawText) { const x = parseXTBDaily(rawText); if (x.length) { all.push(...x); broker = 'XTB'; } }
    all.sort((a, b) => a.date.localeCompare(b.date));
    return { rows: all, warn, broker };
  }

  function fingerprint(c) {
    return c.kind === 'div'
      ? ['div', c.date, T(c.ticker), r2(c.gross)].join('|')
      : [c.kind, c.date, T(c.ticker), r8(c.qty), r2(c.qty * c.price)].join('|');
  }


  /* ---------- Relatório anual de mais-valias da XTB (PDF "IRS AAAA - Capital Gains") ---------- */
  const XN = '(-?\\d{1,3}(?: \\d{3})*\\.\\d{2})';
  const xnum = s => Number(String(s).replace(/ /g, ''));
  const xdate = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  function parseXtbAnnual(text) {
    const T = String(text || '').replace(/\u00a0/g, ' ');
    const D = '(\\d{4})\\s+(\\d{1,2})\\s+(\\d{1,2})\\s+';
    const reG = new RegExp(`\\b(9\\d{3})\\s+([A-Z])\\s+(\\d{9})\\s+(G\\d{2})\\s+${D}${XN}\\s+${D}${XN}\\s+${XN}\\s+(\\d{3})`, 'g');
    const reJ = new RegExp(`\\b(9[5-8]\\d|\\d{4})\\s+(\\d{3})\\s+(G\\d{2})\\s+${D}${XN}\\s+${D}${XN}\\s+${XN}\\s+${XN}\\s+(\\d{3})`, 'g');
    const reB = new RegExp(`\\b(99\\d)\\s+(G\\d{2})\\s+(\\d{3})\\s+${XN}\\s+${XN}\\s+(\\d{3})`, 'g');
    const reQ13 = new RegExp(`\\b(G51)\\s+([A-Z])\\s+${XN}\\s+(\\d{3})`, 'g');
    const shares = [], frac = [], cfd = [], seen = new Set();
    for (const m of T.matchAll(reG)) {
      const k = 'G' + m[1]; if (seen.has(k)) continue; seen.add(k);
      shares.push({ src: 'G', line: Number(m[1]), titular: m[2], nifEmit: m[3], country: 620, code: m[4], sell: xdate(m[5], m[6], m[7]), real: xnum(m[8]),
        buy: xdate(m[9], m[10], m[11]), aq: xnum(m[12]), desp: xnum(m[13]), tax: 0, cp: Number(m[14]) });
    }
    for (const m of T.matchAll(reJ)) {
      const k = 'J' + m[1]; if (seen.has(k)) continue; seen.add(k);
      shares.push({ src: 'J', line: Number(m[1]), titular: 'A', nifEmit: '', country: Number(m[2]), code: m[3], sell: xdate(m[4], m[5], m[6]), real: xnum(m[7]),
        buy: xdate(m[8], m[9], m[10]), aq: xnum(m[11]), desp: xnum(m[12]), tax: xnum(m[13]), cp: Number(m[14]) });
    }
    for (const m of T.matchAll(reB)) {
      const row = { line: Number(m[1]), code: m[2], country: Number(m[3]), net: xnum(m[4]), tax: xnum(m[5]), cp: Number(m[6]) };
      (m[2] === 'G98' ? frac : cfd).push(row);
    }
    for (const m of T.matchAll(reQ13)) cfd.push({ line: 0, code: 'G51', country: 620, net: xnum(m[3]), tax: 0, cp: Number(m[4]) });
    shares.forEach(s => { s.ganho = r2(s.real - s.aq - s.desp); s.days = daysBetween(s.buy, s.sell); });
    const sums = [...T.matchAll(new RegExp(`Soma\\s+${XN}\\s+${XN}\\s+${XN}`, 'g'))].map(m => [xnum(m[1]), xnum(m[2]), xnum(m[3])]);
    const yr = (T.match(/\((?:Ano|FY)\s+(\d{4})\)/) || [])[1] || (shares[0]?.sell || '').slice(0, 4) || '';
    const holder = ((T.match(/Dear Sir\(Madam\)\s*\n\s*([^\n]+)/) || [])[1] || '').trim();
    const nif = ((T.match(/\n\s*(\d{9})\s*\n[\s\S]{0,400}?Assunto/) || [])[1] || '');
    const tot = arr => arr.reduce((s, x) => [s[0] + x.real, s[1] + x.aq, s[2] + x.desp], [0, 0, 0]).map(r2);
    const tG = tot(shares.filter(s => s.src === 'G')), tJ = tot(shares.filter(s => s.src === 'J'));
    const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 0.015);
    const checks = [], hasG = shares.some(s => s.src === 'G'), hasJ = shares.some(s => s.src === 'J');
    let si = 0;
    if (hasG) { checks.push({ what: 'Anexo G (ações de empresas portuguesas)', ok: sums[si] ? near(tG, sums[si]) : null, ours: tG, theirs: sums[si] || null }); si++; }
    if (hasJ) { checks.push({ what: 'Anexo J 9.2A (ações e ETF estrangeiros)', ok: sums[si] ? near(tJ, sums[si]) : null, ours: tJ, theirs: sums[si] || null }); si++; }
    shares.sort((x, y) => x.sell.localeCompare(y.sell) || (x.src === y.src ? 0 : x.src === 'G' ? -1 : 1) || x.line - y.line);
    return { year: yr, holder, nif, shares, frac, cfd, checks, ok: shares.length > 0 || frac.length > 0 || cfd.length > 0 };
  }
  // Agrupa as linhas como o Portal as mostra no Anexo G, quadro 9: por data de venda e NIF (XTB para ações estrangeiras, a empresa para as portuguesas)
  function portalGroups(rep, xtbNif = '980436613') {
    const map = new Map();
    for (const s of rep.shares) {
      const nif = s.src === 'G' ? s.nifEmit : xtbNif, key = s.sell + '|' + nif;
      const g = map.get(key) || map.set(key, { key, sell: s.sell, nif, pt: s.src === 'G', lots: [] }).get(key);
      g.lots.push(s);
    }
    return [...map.values()].map(g => {
      g.lots.sort((x, y) => (x.country - y.country) || x.buy.localeCompare(y.buy) || x.line - y.line);
      return { ...g, countries: [...new Set(g.lots.map(l => l.country))], real: r2(g.lots.reduce((t, l) => t + l.real, 0)), aq: r2(g.lots.reduce((t, l) => t + l.aq, 0)),
        desp: r2(g.lots.reduce((t, l) => t + l.desp, 0)), ganho: r2(g.lots.reduce((t, l) => t + l.ganho, 0)) };
    }).sort((x, y) => x.sell.localeCompare(y.sell) || (x.pt ? -1 : 1));
  }
  // Reparte as linhas da XTB pelos valores que aparecem no Portal (em cêntimos). Aceita uma linha da XTB partida em duas no Portal.
  function matchPortal(values, lots) {
    const P = values.map(v => Math.round(v * 100)).filter(v => v > 0), L0 = lots.map((l, i) => ({ i, c: Math.round(l.real * 100), frac: 1 }));
    const tol = 2, sumP = P.reduce((s, v) => s + v, 0), sumL = L0.reduce((s, v) => s + v.c, 0);
    if (!P.length) return { ok: false, msg: 'Indique pelo menos um valor.' };
    if (Math.abs(sumP - sumL) > tol * Math.max(P.length, L0.length)) return { ok: false, msg: `Os valores indicados somam ${(sumP / 100).toFixed(2).replace('.', ',')} €, mas as linhas da XTB desta venda somam ${(sumL / 100).toFixed(2).replace('.', ',')} €.` };
    let steps = 0;
    const partition = (pv, items) => {
      if (!pv.length) return items.length ? null : [];
      const [target, ...rest] = pv, its = [...items].sort((a, b) => b.c - a.c), pick = [];
      const dfs = (k, sum) => {
        if (++steps > 300000) return null;
        if (Math.abs(sum - target) <= tol && pick.length) { const left = its.filter(x => !pick.includes(x)), sub = partition(rest, left); if (sub) return [{ value: target, parts: [...pick] }, ...sub]; }
        for (let j = k; j < its.length; j++) { if (sum + its[j].c > target + tol) continue; pick.push(its[j]); const r = dfs(j + 1, sum + its[j].c); if (r) return r; pick.pop(); }
        return null;
      };
      return dfs(0, 0);
    };
    let res = partition([...P].sort((a, b) => b - a), L0);
    if (!res) {
      outer: for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) for (const l of L0) {
        if (Math.abs(P[a] + P[b] - l.c) > tol) continue;
        const items = L0.filter(x => x !== l).concat([{ i: l.i, c: P[a], frac: P[a] / l.c }, { i: l.i, c: l.c - P[a], frac: 1 - P[a] / l.c }]);
        res = partition([...P].sort((x, y) => y - x), items); if (res) break outer;
      }
    }
    if (!res) return { ok: false, replace: true, msg: 'Os valores do Portal desta data não correspondem a combinações exatas das linhas da XTB: a XTB reparte o valor de venda por cada compra de forma ligeiramente diferente. Solução: apague as linhas pré-preenchidas desta data e introduza as linhas abaixo. O total de realização fica exatamente igual.' };
    return { ok: true, assign: res.map(r => ({ value: r.value / 100, parts: r.parts.map(p => ({ lot: lots[p.i], frac: p.frac, real: p.c / 100 })) })) };
  }

  return { COUNTRIES, ISO2, CDT, BROKERS, ANEXO_G_DEFAULT, NIF_DEFAULT, EPS, r2, r8, pad3, num, parseDate, norm, daysBetween, guessKind, guessCountry, defaultCode,
    ensureAsset, fifo, positions, yearReport, years, parseCSV, parseSheets, parseXTBText, parseXTBDaily, fingerprint, parseXtbAnnual, portalGroups, matchPortal };
})();
if (typeof module !== 'undefined') module.exports = TF;
