/* AllFolio.pt — gerador de páginas do painel de publicação (usado por admin.html) */
(function (G) {
  const SITE = 'https://allfolio.pt/';
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = iso => { const [y, m, d] = String(iso).split('-').map(Number); return `${d} de ${MESES[m - 1]} de ${y}`; };
  const words = html => String(html || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  const readMin = html => Math.max(2, Math.round(words(html) / 200));
  const slugify = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70).replace(/-+$/, '');
  const TYPE_LABEL = { guia: 'Guias', semana: 'A semana do investidor' };
  const CSS = "\n  *{box-sizing:border-box}\n  html{scroll-padding-top:80px}\n  body{margin:0;font-family:Manrope,system-ui,-apple-system,\"Segoe UI\",Roboto,sans-serif;color:#0A2A66;background:#F4F7FC;-webkit-font-smoothing:antialiased}\n  a{color:#1D4ED8}a:hover{color:#0A2A66}\n  :focus-visible{outline:3px solid #5B8DEF;outline-offset:2px;border-radius:8px}\n  header{position:sticky;top:0;z-index:5;background:rgba(255,255,255,.97);border-bottom:1px solid #DCE7F8;padding-top:env(safe-area-inset-top,0px)}\n  .bar{max-width:820px;margin:0 auto;padding:12px 20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}\n  .brand{display:flex;align-items:center;gap:8px;text-decoration:none;color:#0A2A66;font-weight:800;font-size:19px;margin-right:auto}\n  .brand small{font-size:inherit;font-weight:600;color:#475569}\n  .nav a{font-weight:600;font-size:15px;text-decoration:none;color:#334155;margin-left:14px}\n  .btn{display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:0 20px;border-radius:14px;font-weight:700;text-decoration:none;background:#1D4ED8;color:#fff}\n  .btn:hover{background:#1A3FAE;color:#fff}\n  main{max-width:760px;margin:0 auto;padding:28px 20px 56px}\n  .crumbs{font-size:13px;color:#475569;margin:0 0 10px}.crumbs a{color:#475569}\n  h1{font-size:clamp(28px,6vw,40px);line-height:1.15;margin:0;letter-spacing:-.02em}\n  .meta{color:#475569;font-size:14px;margin:10px 0 0}\n  h2{font-size:23px;margin:34px 0 8px;letter-spacing:-.01em}\n  h3{font-size:18px;margin:22px 0 6px}\n  p,li{font-size:17px;line-height:1.75;color:#1E293B}\n  ul,ol{padding-left:22px}\n  .summary{background:#E6EEFC;border:1px solid #CFDDF8;border-radius:18px;padding:16px 20px;margin:22px 0 6px}\n  .summary p,.summary li{color:#0A2A66;margin:6px 0}\n  .note{background:#FFF7E6;border:1px solid #F5DDAE;border-radius:16px;padding:14px 18px;margin:18px 0}\n  .note p{margin:0;color:#5C3D04;font-size:16px}\n  .tbl{overflow-x:auto;border:1px solid #DCE7F8;border-radius:14px;background:#fff;margin:14px 0}\n  table{width:100%;border-collapse:collapse;font-size:15px}\n  .tw{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:18px 0;max-width:100%}.tw table{margin:0}\n  caption{text-align:left;padding:12px 14px 4px;font-weight:800}\n  th{background:#EEF3FB;color:#1A3FAE;padding:9px 12px;text-align:left;font-size:14px}\n  td{padding:10px 12px;border-top:1px solid #E6ECF5;text-align:left;font-variant-numeric:tabular-nums;overflow-wrap:break-word;hyphens:auto}\n  td:first-child{white-space:nowrap}\n  th:first-child,td:first-child{text-align:left}\n  .cta{background:#0A2A66;color:#fff;border-radius:22px;padding:24px;margin:36px 0 10px}\n  .cta h2{color:#fff;margin:0 0 6px;font-size:22px}.cta p{color:#DCE7F8;margin:0 0 16px}\n  .cta .btn{background:#fff;color:#0A2A66}\n  .cards{display:grid;gap:14px;margin-top:20px}\n  .card{display:block;background:#fff;border:1px solid #DCE7F8;border-radius:18px;padding:18px 20px;text-decoration:none}\n  .card h2{margin:0 0 6px;font-size:20px;color:#0A2A66}.card p{margin:0;font-size:16px;color:#334155}\n  .card span{display:inline-block;margin-top:10px;font-weight:700;color:#1D4ED8}\n  .cv{margin:22px 0 4px}.cv svg,.cv img{display:block;width:100%;height:auto;border-radius:18px}\n  figure{margin:20px 0}figure img,figure svg{display:block;max-width:100%;height:auto;border-radius:14px;margin:0 auto}figcaption{font-size:14px;color:#475569;margin-top:8px;text-align:center}\n  .card .th{margin:-18px -20px 12px;border-radius:18px 18px 0 0;overflow:hidden}.card .th svg,.card .th img{display:block;width:100%;height:auto}\n  .card .dt{display:block;font-size:13px;color:#475569;margin:0 0 4px;font-weight:600}\n  .ag-w{margin:18px 0 26px}.ag-l{font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#1D4ED8;margin:0 0 8px}\n  .ag{background:#fff;border:1px solid #DCE7F8;border-radius:18px;overflow:hidden}.ag-r{display:flex;gap:12px;align-items:flex-start;padding:11px 14px;border-top:1px solid #EEF3FB}.ag-r:first-child{border-top:none}\n  .ag-d{flex:none;width:54px;text-align:center;border-radius:12px;background:#EEF3FB;padding:5px 0;line-height:1.15}.ag-d b{display:block;font-size:18px}.ag-d span{font-size:11px;color:#64748B;text-transform:uppercase}\n  .ag-e b{display:block;font-weight:700}.ag-e small{display:block;font-size:14px;color:#64748B}.ag-e a{font-size:14px}.ag-r.past{opacity:.45}.ag-r.past b{text-decoration:line-through}\n  .ag-r.today .ag-d{background:#1D4ED8;color:#fff}.ag-r.today .ag-d span{color:#DCE7F8}.ag-hoje{font-size:11px;background:#E7F6EF;color:#0B5D41;border-radius:99px;padding:1px 8px;margin-left:6px;font-weight:700}\n  .ag-f{font-size:13px;color:#64748B;margin:8px 0 0}\n  .wl{background:linear-gradient(135deg,#0A2A66,#1D4ED8);color:#fff;border-radius:22px;padding:18px 18px 20px;margin:18px 0}\n  .wl h3{margin:0;font-size:20px;color:#fff;line-height:1.25}.wl p{margin:6px 0 0;color:#E6EEFC;font-size:15px}\n  .wl-form{display:grid;gap:8px;margin-top:12px;max-width:520px}.wl-form input[type=email],.wl-form select{width:100%;border:none;border-radius:12px;padding:12px;font:inherit;font-size:16px;color:#0A2A66;background:#fff}\n  .wl-c{display:flex;gap:8px;align-items:flex-start;font-size:13px;color:#E6EEFC;line-height:1.4}.wl-c input{margin-top:3px;width:18px;height:18px;flex:none}.wl-c a{color:#fff}\n  .wl-form button,.wl-go{border:none;border-radius:12px;padding:12px 16px;font:inherit;font-weight:800;font-size:16px;background:#fff;color:#0A2A66;cursor:pointer;text-decoration:none;display:inline-block;text-align:center}\n  .wl-msg{margin:2px 0 0;font-size:14px;min-height:1em}.wl-msg.ok{color:#A7F3D0}.wl-msg.err{color:#FECACA}.wl-more{color:#fff;font-weight:700;font-size:14px;display:inline-block;margin-top:10px}\n  [hidden]{display:none!important}\n  .author{margin:26px 0 8px;padding:14px 16px;border:1px solid #DCE7F8;border-radius:16px;background:#fff;font-size:15px;color:#334155}.author b{color:#0A2A66}\n  .disc{font-size:14px;color:#475569;border-top:1px solid #DCE7F8;margin-top:30px;padding-top:14px}\n  footer{border-top:1px solid #DCE7F8;background:#fff;padding-bottom:env(safe-area-inset-bottom,0px)}\n  .foot{max-width:820px;margin:0 auto;padding:20px;display:flex;flex-wrap:wrap;gap:10px 20px;font-size:14px}\n  .foot a{color:#475569}\n";
  const HEADER = "<header><div class=\"bar\">\n  <a class=\"brand\" href=\"./\"><img src=\"icon-192.png\" width=\"32\" height=\"32\" alt=\"\" style=\"border-radius:22%;flex-shrink:0;box-shadow:0 0 0 1px rgba(10,42,102,.10)\"><span>AllFolio<small>.pt</small></span></a>\n  <nav class=\"nav\" aria-label=\"Principal\"><a href=\"semana\">Semana</a><a href=\"guias\">Guias</a><a href=\"irs-xtb\" data-flag=\"irs\" hidden>IRS da XTB</a><a href=\"app\">Abrir a app</a></nav>\n</div></header>";
  const FOOT = `
</main>
<footer><div class="foot">
  <a href="./">Início</a><a href="semana">A semana do investidor</a><a href="guias">Guias</a><a href="https://ko-fi.com/allfolio" rel="noopener">Apoie o AllFolio</a><a href="privacidade.html">Política de privacidade</a><a href="termos.html">Termos de utilização</a><a href="como-ganhamos-dinheiro.html">Como ganhamos dinheiro</a><a href="sobre.html">Sobre</a><a href="contacto.html">Contacto</a>
</div></footer>
<script src="site-flags.js" defer></script>
<script src="track.js" defer></script>
</body>
</html>
`;
  const ld = (...o) => o.map(x => '<script type="application/ld+json">' + JSON.stringify(x).replace(/</g, '\\u003c') + '</script>').join('\n');
  const crumbsLD = items => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: SITE + u })) });
  function head({ title, desc, path, ogtype, jsonld, image }) {
    return `<!doctype html>
<html lang="pt-PT">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${path}">
<meta name="theme-color" content="#0A2A66">
<link rel="icon" type="image/png" href="icon-192.png">
<meta property="og:type" content="${ogtype}">
<meta property="og:locale" content="pt_PT">
<meta property="og:site_name" content="AllFolio.pt">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:image" content="${image ? SITE + image : SITE + 'icon-512.png'}">${image ? '\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="600">\n<meta name="twitter:card" content="summary_large_image">' : ''}
${jsonld}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>${CSS}</style>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2352895338707924" crossorigin="anonymous"></script>
</head>
<body>
${HEADER}
<main>
`;
  }
  const CTA = `<section class="cta" aria-labelledby="cta-t">
  <h2 id="cta-t">Faça as contas do IRS em poucos minutos</h2>
  <p>Importe o extrato da XTB, DEGIRO, Trading 212 ou Revolut e o AllFolio aplica o FIFO, converte o câmbio e prepara as tabelas dos Anexos G e J. Gratuito.</p>
  <a class="btn" href="app">Experimentar o AllFolio grátis</a>
</section>`;
  const DISC = {
    guia: d => `<p class="disc">Este guia é informação geral e foi atualizado em ${fmtDate(d)}. Não substitui o aconselhamento de um contabilista certificado nem as instruções oficiais da Autoridade Tributária, que podem mudar de ano para ano.</p>`,
    semana: d => `<p class="disc">Resumo publicado em ${fmtDate(d)}, com base em informação pública. É informação geral e não constitui aconselhamento financeiro, fiscal ou de investimento.</p>`
  };
  // Links externos abrem com noopener; links de parceria levam rel="sponsored nofollow", como o Google pede.
  const AFF = /shop\.ledger\.com|trezor\.io\/.*[?&](offer_id|aff|ref)=|partners?\.|amzn\.to|amazon\.[a-z.]+\/.*[?&]tag=|[?&](r|ref|aff|affiliate|tag)=/i;
  const relLinks = h => String(h || '').replace(/<a href="(https?:\/\/[^"]+)"[^>]*>/g, (m, u) => u.includes('allfolio.pt') ? m
    : `<a href="${u}" rel="${AFF.test(u) ? 'sponsored nofollow ' : ''}noopener" target="_blank">`);

  /* ---------- Ilustrações (SVG, desenhadas no estilo do AllFolio) ---------- */
  const MES3 = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  function themeOf(a) {
    if (a.type === 'semana') return 'semana';
    const t = ((a.tag || '') + ' ' + (a.title || '')).toLowerCase();
    if (/bitcoin|cripto|btc/.test(t)) return 'bitcoin';
    if (/\bcfds?\b/.test(t)) return 'cfd';
    if (/fifo|fraciona/.test(t)) return 'fifo';
    if (/dividend/.test(t)) return 'div';
    if (/irs|impost|anexo|declar|xtb|finan/.test(t)) return 'irs';
    return 'invest';
  }
  const SV = (bg, label, inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 180" width="360" height="180" role="img" aria-label="${esc(label)}"><rect width="360" height="180" fill="${bg}"/>${inner}</svg>`;
  const T = (x, y, s, w, f, txt, anchor = 'middle') => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${s}" font-weight="${w}" fill="${f}" font-family="Manrope, system-ui, sans-serif">${txt}</text>`;
  function coverSVG(a) {
    const th = themeOf(a);
    if (th === 'semana') {
      const [, m, d] = String(a.date || '2026-01-01').split('-').map(Number);
      return SV('#12357F', 'Ilustração: gráfico de mercado e calendário da semana', `<g stroke="rgba(255,255,255,.08)"><line x1="0" y1="50" x2="360" y2="50"/><line x1="0" y1="95" x2="360" y2="95"/><line x1="0" y1="140" x2="360" y2="140"/></g>
<path d="M0 142 L40 126 L72 134 L112 100 L144 110 L180 76 L210 90 L246 58 L276 72 L306 46 L360 38 L360 180 L0 180Z" fill="rgba(126,226,184,.16)"/>
<path d="M0 142 L40 126 L72 134 L112 100 L144 110 L180 76 L210 90 L246 58 L276 72 L306 46 L360 38" fill="none" stroke="#7EE2B8" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/>
<g transform="translate(28 30)"><rect width="84" height="92" rx="14" fill="#FFFFFF"/><path d="M0 14 a14 14 0 0 1 14 -14 h56 a14 14 0 0 1 14 14 v14 h-84z" fill="#E8352A"/>${T(42, 20, 12, 800, '#FFFFFF', MES3[m - 1] || '')}${T(42, 70, 34, 800, '#0A2A66', d || '')}</g>
<g transform="translate(196 130)"><rect width="148" height="30" rx="10" fill="rgba(255,255,255,.12)"/>${T(74, 19.5, 9, 700, '#FFFFFF', 'A SEMANA DO INVESTIDOR')}</g>`);
    }
    if (th === 'irs') return SV('#E6EEFC', 'Ilustração: declaração de IRS preenchida', `<g transform="translate(138 22)"><rect width="84" height="112" rx="10" fill="#FFFFFF" stroke="#BFD1F3" stroke-width="2"/><rect x="12" y="14" width="44" height="8" rx="3" fill="#1D4ED8"/>
<g fill="#DCE7F8"><rect x="12" y="34" width="60" height="6" rx="3"/><rect x="12" y="48" width="50" height="6" rx="3"/><rect x="12" y="62" width="56" height="6" rx="3"/><rect x="12" y="76" width="40" height="6" rx="3"/></g>
<circle cx="70" cy="98" r="18" fill="#0F9D6E"/><path d="M61 98 l6 6 l11 -12" stroke="#FFFFFF" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
<g transform="translate(240 40)"><rect width="70" height="26" rx="8" fill="#FFFFFF"/>${T(35, 17, 11, 800, '#1D4ED8', 'Anexo G')}</g><g transform="translate(52 108)"><rect width="70" height="26" rx="8" fill="#FFFFFF"/>${T(35, 17, 11, 800, '#0F9D6E', 'Anexo J')}</g>`);
    if (th === 'bitcoin') return SV('#FFF4E0', 'Ilustração: moeda de Bitcoin e carteira física', `<circle cx="150" cy="92" r="46" fill="#F7931A"/><circle cx="150" cy="92" r="38" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="3"/>${T(150, 108, 46, 800, '#FFFFFF', '₿')}
<g transform="translate(214 50)"><rect width="52" height="80" rx="14" fill="#0A2A66"/><rect x="10" y="12" width="32" height="24" rx="5" fill="#5B8DEF"/><circle cx="26" cy="58" r="9" fill="#FFFFFF"/></g>`);
    if (th === 'cfd') return SV('#FDECEC', 'Ilustração: balança entre ação e CFD', `<g stroke="#0A2A66" stroke-width="4" stroke-linecap="round"><line x1="180" y1="34" x2="180" y2="140"/><line x1="96" y1="48" x2="264" y2="48"/></g>
<path d="M96 48 l-26 48 h52z" fill="#0F9D6E"/><path d="M264 48 l-26 48 h52z" fill="#DC2626"/><rect x="150" y="138" width="60" height="10" rx="5" fill="#0A2A66"/>
${T(96, 120, 15, 800, '#0B5D41', 'Ação')}${T(264, 120, 15, 800, '#991B1B', 'CFD')}`);
    if (th === 'fifo') return SV('#E7F6EF', 'Ilustração: compras vendidas por ordem de chegada (FIFO)', `${[['#0F9D6E', '#FFFFFF', '1.º'], ['#4CC294', '#FFFFFF', '2.º'], ['#9FE0C4', '#0B5D41', '3.º']].map(([bg, fg, t], i) => `<rect x="${78 + i * 74}" y="50" width="56" height="56" rx="12" fill="${bg}"/>${T(106 + i * 74, 85, 16, 800, fg, t)}`).join('')}
<path d="M82 132 h196" stroke="#0A2A66" stroke-width="3.4" stroke-linecap="round"/><path d="M80 132 l12 -7 v14z" fill="#0A2A66"/>${T(180, 156, 11, 700, '#0B5D41', 'vende primeiro o que comprou primeiro')}`);
    if (th === 'div') return SV('#EAF7F0', 'Ilustração: moedas de dividendos a crescer', `${[0, 1, 2].map(i => `<g transform="translate(${110 + i * 56} ${110 - i * 22})">${Array.from({ length: i + 2 }, (_, k) => `<ellipse cx="22" cy="${30 - k * 10}" rx="22" ry="8" fill="${k % 2 ? '#F2C14E' : '#E5A92B'}"/>`).join('')}</g>`).join('')}${T(272, 60, 22, 800, '#0F9D6E', '+%')}`);
    return SV('#EEF3FB', 'Ilustração: investimento a crescer', `${[34, 54, 76, 100].map((h, i) => `<rect x="${100 + i * 44}" y="${140 - h}" width="30" height="${h}" rx="6" fill="${['#BFD1F3', '#7FA5F0', '#3B6FE0', '#1D4ED8'][i]}"/>`).join('')}
<path d="M92 112 L150 84 L196 92 L262 40" fill="none" stroke="#0F9D6E" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M248 38 l16 1 l-4 15" fill="none" stroke="#0F9D6E" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`);
  }
  const isImg = p => /^img\/[a-z0-9\/_.-]+\.(png|jpe?g|webp|svg)$/i.test(p || '');
  function coverHTML(a, cls, lazy = true) {
    if (a.cover === 'none') return '';
    if (isImg(a.cover)) return `<div class="${cls}"><img src="${esc(a.cover)}" alt="${esc(a.coverAlt || a.title)}" width="1200" height="600"${lazy ? ' loading="lazy"' : ''} decoding="async"></div>`;
    return `<div class="${cls}">${coverSVG(a)}</div>`;
  }
  const ogImage = a => a.ogimg && isImg(a.ogimg) ? a.ogimg : isImg(a.cover) && !/\.svg$/i.test(a.cover) ? a.cover : '';
  // Os 3 temas da "semana": títulos numerados das secções ("## 1. ...")
  function pointsOf(body) {
    const h = [...String(body || '').matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map(m => m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim());
    const num = h.filter(t => /^\d+[.)]\s*/.test(t)).map(t => t.replace(/^\d+[.)]\s*/, ''));
    return (num.length ? num : h.filter(t => !/números|vigiar|resumo/i.test(t))).slice(0, 3);
  }

  const wrapTables = h => String(h || '').replace(/<table>/g, '<div class="tw"><table>').replace(/<\/table>/g, '</table></div>');
  /* ---------- Agenda "O que vigiar esta semana" ---------- */
  const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  function agendaWeek(ag) {
    const ds = (ag.items || []).map(x => x.date).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d || '')).sort(); if (!ds.length) return '';
    const p = d => d.split('-').map(Number), [, m1, d1] = p(ds[0]), [, m2, d2] = p(ds[ds.length - 1]);
    return m1 === m2 ? (d1 === d2 ? `${d1} de ${MESES[m1 - 1]}` : `${d1} a ${d2} de ${MESES[m1 - 1]}`) : `${d1} de ${MESES[m1 - 1]} a ${d2} de ${MESES[m2 - 1]}`;
  }
  const safeUrl = u => /^https:\/\/[^\s"'<>]+$/i.test(u || '') ? u : '';
  function agendaBlock(ag) {
    const items = (ag && ag.items || []).filter(x => x.text);
    if (!items.length) return '';
    const sorted = [...items].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
    const row = x => {
      const ok = /^\d{4}-\d{2}-\d{2}$/.test(x.date || ''), dt = ok ? new Date(x.date + 'T12:00:00Z') : null, u = safeUrl(x.url);
      return `<div class="ag-r"${ok ? ` data-d="${x.date}"` : ''}><div class="ag-d"><span>${ok ? DIAS[dt.getUTCDay()] : 'toda'}</span><b>${ok ? dt.getUTCDate() : 'sem.'}</b></div>
          <div class="ag-e"><b>${esc(x.text)}</b>${x.note ? `<small>${esc(x.note)}</small>` : ''}${u ? `<a href="${esc(u)}" rel="noopener" target="_blank">${esc(x.linkText || 'Ver na página oficial')} →</a>` : ''}</div></div>`;
    };
    return `<div class="ag-w"><p class="ag-l">O que vigiar esta semana${agendaWeek(ag) ? ' · ' + esc(agendaWeek(ag)) : ''}</p>
        <div class="ag">${sorted.map(row).join('')}</div>
        ${ag.updated ? `<p class="ag-f">Atualizado a ${esc(fmtDate(ag.updated))}</p>` : ''}</div>
        <script>(function(){var t=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Lisbon'});document.querySelectorAll('.ag-r[data-d]').forEach(function(r){var d=r.getAttribute('data-d');if(d<t)r.classList.add('past');else if(d===t){r.classList.add('today');var b=r.querySelector('b+b,.ag-e b');if(b)b.insertAdjacentHTML('beforeend',' <span class="ag-hoje">hoje</span>');}});})();</script>`;
  }
  const IRS_CTA = `      <div class="wl" data-flag="waitlist" hidden>
        <h3>IRS dos seus investimentos, pronto para a contabilista</h3>
        <p>Carregue o relatório anual da corretora e receba o guia linha a linha para o Portal das Finanças, com as ações fracionadas explicadas. Abre antes da época do IRS.</p>
        <form class="wl-form" novalidate>
          <input type="email" name="email" placeholder="O seu email" autocomplete="email" aria-label="Email">
          <select name="broker" aria-label="Que corretora usa?"><option value="">Que corretora usa?</option><option>XTB</option><option>Trading 212</option><option>DEGIRO</option><option>Revolut</option><option>Interactive Brokers</option><option>Outra</option></select>
          <label class="wl-c"><input type="checkbox" name="consent"> <span>Aceito receber um email quando abrir. Posso sair a qualquer momento (<a href="privacidade.html#lista-de-espera">saber mais</a>).</span></label>
          <button type="submit">Avise-me quando abrir</button>
          <p class="wl-msg" role="status"></p>
        </form>
        <a class="wl-more" href="irs-xtb">Saber mais →</a>
      </div>
      <div class="wl" data-flag="tool" hidden>
        <h3>📄 Tem o relatório de IRS da XTB?</h3>
        <p>Carregue-o e receba o guia para preencher o Portal, linha a linha. O resumo é grátis.</p>
        <a class="wl-go" href="irs-xtb" style="margin-top:12px">Experimentar →</a>
      </div>
`;
  function articlePage(a) {
    const type = a.type === 'semana' ? 'semana' : 'guia', min = readMin(a.body), section = type === 'semana' ? 'A semana do investidor' : (a.tag || 'Guia');
    const art = { '@context': 'https://schema.org', '@type': type === 'semana' ? 'NewsArticle' : 'Article', headline: a.title, description: a.desc, inLanguage: 'pt-PT',
      datePublished: a.date, dateModified: a.updated || a.date, author: { '@type': 'Person', name: 'Leonardo Favero', url: SITE + 'sobre.html' }, publisher: { '@type': 'Organization', name: 'AllFolio.pt', url: SITE },
      publisher: { '@type': 'Organization', name: 'AllFolio.pt', logo: { '@type': 'ImageObject', url: SITE + 'icon-512.png' } }, mainEntityOfPage: SITE + a.slug };
    const sec = type === 'semana' ? ['A semana do investidor', 'semana'] : ['Guias', 'guias'], og = ogImage(a);
    if (og) art.image = SITE + og;
    return head({ title: a.title + ' – AllFolio.pt', desc: a.desc, path: a.slug, ogtype: 'article', image: og, jsonld: ld(art, crumbsLD([['Início', ''], sec, [type === 'semana' ? fmtDate(a.date) : section, a.slug]])) })
      + `<p class="crumbs"><a href="./">Início</a> › <a href="${sec[1]}">${sec[0]}</a>${type === 'semana' ? '' : ' › ' + esc(section)}</p>
<h1>${esc(a.title)}</h1>
<p class="meta">${a.updated && a.updated !== a.date ? 'Atualizado' : 'Publicado'} em ${fmtDate(a.updated || a.date)} · ${min} min de leitura</p>
${coverHTML(a, 'cv', false)}
${wrapTables(relLinks(a.body))}
${['irs', 'fifo'].includes(themeOf(a)) ? IRS_CTA : ''}
<div class="author"><b>Escrito por Leonardo Favero</b> · Lisboa<br>Investidor em Portugal e criador do AllFolio. ${a.updated && a.updated !== a.date ? 'Atualizado' : 'Publicado'} em ${fmtDate(a.updated || a.date)}. <a href="sobre.html">Sobre o AllFolio e como escrevemos</a> · <a href="contacto.html">Encontrou um erro?</a></div>
<!-- AdSense: anúncio no fim do artigo (a ativar) -->
${a.cta === false ? '' : CTA}
${DISC[type](a.updated || a.date)}` + FOOT;
  }
  const pubList = reg => (reg.items || []).filter(x => x.status === 'pub').sort((x, y) => (y.date + y.slug).localeCompare(x.date + x.slug));
  const tagLine = (a, isNew) => `${isNew ? 'Novo · ' : ''}${a.type === 'semana' ? 'A semana do investidor' : esc(a.tag || 'Guia')} · ${a.min || 5} min`;
  const daysAgo = (iso, now) => (Date.parse(now) - Date.parse(iso)) / 864e5;
  function semanaBlock(reg) {
    const a = pubList(reg).find(x => x.type === 'semana'); if (!a) return '';
    const pts = (a.points || []).slice(0, 3);
    return `<a class="wk" href="${esc(a.slug)}">${coverHTML(a, 'wk-cv')}
          <div class="wk-b"><span class="wk-l">A semana do investidor · ${esc(fmtDate(a.date))} · ${a.min || 4} min</span>
          <h3>${esc(a.title)}</h3>${pts.length ? `<ul>${pts.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : `<p>${esc(a.teaser || a.desc)}</p>`}
          <span class="wk-go">Ler a semana →</span></div></a>
        <a class="more" href="semana">Edições anteriores →</a>`;
  }
  function indexBlock(reg, now) {
    const list = pubList(reg).filter(x => (x.type || 'guia') !== 'semana'); if (!list.length) return '<p class="sub">Em breve.</p>';
    const feat = list.find(x => x.featured) || list[0], rest = list.filter(x => x !== feat).slice(0, 3);
    const card = (a, big) => `        <a class="gcard${big ? ' big' : ''}" href="${esc(a.slug)}">${coverHTML(a, 'gcv')}<span class="tag">${tagLine(a, big && daysAgo(a.date, now) <= 14)}</span>
          <h3>${esc(a.title)}</h3>
          <p>${esc(a.teaser || a.desc)}</p>
          <span class="go">Ler →</span></a>`;
    return `<div class="gwrap">\n${[card(feat, true), ...rest.map(a => card(a, false))].join('\n')}\n      </div>`;
  }
  function applyIndex(html, reg, now, agenda) {
    const put = (h, name, content, required) => {
      const a = `<!--CMS:${name}-->`, b = `<!--/CMS:${name}-->`, i = h.indexOf(a), j = h.indexOf(b);
      if (i < 0 || j < i) { if (required) throw new Error('A página inicial não tem os marcadores dos guias.'); return h; }
      return h.slice(0, i + a.length) + '\n' + content + '\n      ' + h.slice(j);
    };
    return put(put(put(html, 'GUIAS', indexBlock(reg, now), true), 'SEMANA', semanaBlock(reg), false), 'AGENDA', agendaBlock(agenda), false);
  }
  const listCard = (a, withDate) => `  <a class="card" href="${esc(a.slug)}">${coverHTML(a, 'th')}${withDate ? `<span class="dt">${esc(fmtDate(a.date))}</span>` : ''}<h2>${esc(a.title)}</h2><p>${esc(a.teaser || a.desc)}</p><span>Ler →</span></a>`;
  const CTA_LIST = `\n<section class="cta" aria-labelledby="cta-t">\n  <h2 id="cta-t">Faça isto em poucos minutos</h2>\n  <p>O AllFolio importa os extratos da sua corretora, aplica o FIFO e prepara as tabelas do IRS. Gratuito.</p>\n  <a class="btn" href="app">Experimentar o AllFolio grátis</a>\n</section>`;
  function guiasPage(reg) {
    const all = pubList(reg), list = all.filter(x => (x.type || 'guia') !== 'semana'), wk = all.find(x => x.type === 'semana');
    return head({ title: 'Guias de IRS e investimento para Portugal – AllFolio.pt', desc: 'Guias práticos para quem investe a partir de Portugal: IRS de ações, ETFs, dividendos e Bitcoin, com exemplos passo a passo.', path: 'guias', ogtype: 'website',
      jsonld: ld({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Guias de IRS e investimento', url: SITE + 'guias', inLanguage: 'pt-PT' }, crumbsLD([['Início', ''], ['Guias', 'guias']])) })
      + `<p class="crumbs"><a href="./">Início</a> › Guias</p>
<h1>Guias</h1>
<p class="meta">Explicações práticas, com exemplos, para investir e declarar os seus investimentos sem dores de cabeça.</p>
<div class="cards">
${list.map(a => listCard(a, false)).join('\n')}
</div>
${wk ? `<p style="margin-top:26px">Procura as notícias da semana? Veja <a href="semana">A semana do investidor</a>.</p>` : ''}${CTA_LIST}` + FOOT;
  }
  function semanaPage(reg, agenda) {
    const list = pubList(reg).filter(x => x.type === 'semana');
    return head({ title: 'A semana do investidor – AllFolio.pt', desc: 'Todas as sextas: o que aconteceu nos mercados, o que significa para quem investe a partir de Portugal e o que vigiar na semana seguinte.', path: 'semana', ogtype: 'website',
      jsonld: ld({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'A semana do investidor', url: SITE + 'semana', inLanguage: 'pt-PT' }, crumbsLD([['Início', ''], ['A semana do investidor', 'semana']])) })
      + `<p class="crumbs"><a href="./">Início</a> › A semana do investidor</p>
<h1>A semana do investidor</h1>
<p class="meta">Todas as sextas: o que aconteceu nos mercados, o que significa para quem investe a partir de Portugal e o que vigiar a seguir.</p>
${agendaBlock(agenda)}
<div class="cards">
${list.length ? list.map(a => listCard(a, true)).join('\n') : '<p>A primeira edição sai na próxima sexta-feira.</p>'}
</div>${CTA_LIST}` + FOOT;
  }
  function sitemap(reg, now) {
    const u = (loc, lm, cf, pr) => `  <url><loc>${SITE}${loc}</loc><lastmod>${lm}</lastmod><changefreq>${cf}</changefreq><priority>${pr}</priority></url>`;
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[u('', now, 'weekly', '1.0'), u('guias', now, 'weekly', '0.7'), u('semana', now, 'weekly', '0.7'), u('privacidade.html', '2026-10-26', 'yearly', '0.3'), u('termos.html', '2026-10-26', 'yearly', '0.3'), u('como-ganhamos-dinheiro.html', '2026-10-30', 'yearly', '0.3'), u('sobre.html', '2026-11-06', 'yearly', '0.4'), u('contacto.html', '2026-11-06', 'yearly', '0.3'),
  ...pubList(reg).map(a => u(a.slug, a.updated || a.date, a.type === 'semana' ? 'yearly' : 'monthly', a.type === 'semana' ? '0.6' : '0.8'))].join('\n')}
</urlset>
`;
  }
  G.CMS = { esc, fmtDate, readMin, slugify, articlePage, indexBlock, semanaBlock, applyIndex, guiasPage, semanaPage, agendaBlock, agendaWeek, sitemap, pubList, TYPE_LABEL, coverSVG, coverHTML, themeOf, pointsOf, ogImage };
})(typeof window !== 'undefined' ? window : globalThis);
