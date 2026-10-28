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
  const CSS = "\n  *{box-sizing:border-box}\n  html{scroll-padding-top:80px}\n  body{margin:0;font-family:Manrope,system-ui,-apple-system,\"Segoe UI\",Roboto,sans-serif;color:#0A2A66;background:#F4F7FC;-webkit-font-smoothing:antialiased}\n  a{color:#1D4ED8}a:hover{color:#0A2A66}\n  :focus-visible{outline:3px solid #5B8DEF;outline-offset:2px;border-radius:8px}\n  header{position:sticky;top:0;z-index:5;background:rgba(255,255,255,.97);border-bottom:1px solid #DCE7F8;padding-top:env(safe-area-inset-top,0px)}\n  .bar{max-width:820px;margin:0 auto;padding:12px 20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}\n  .brand{display:flex;align-items:center;gap:8px;text-decoration:none;color:#0A2A66;font-weight:800;font-size:19px;margin-right:auto}\n  .brand small{font-size:inherit;font-weight:600;color:#475569}\n  .nav a{font-weight:600;font-size:15px;text-decoration:none;color:#334155;margin-left:14px}\n  .btn{display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:0 20px;border-radius:14px;font-weight:700;text-decoration:none;background:#1D4ED8;color:#fff}\n  .btn:hover{background:#1A3FAE;color:#fff}\n  main{max-width:760px;margin:0 auto;padding:28px 20px 56px}\n  .crumbs{font-size:13px;color:#475569;margin:0 0 10px}.crumbs a{color:#475569}\n  h1{font-size:clamp(28px,6vw,40px);line-height:1.15;margin:0;letter-spacing:-.02em}\n  .meta{color:#475569;font-size:14px;margin:10px 0 0}\n  h2{font-size:23px;margin:34px 0 8px;letter-spacing:-.01em}\n  h3{font-size:18px;margin:22px 0 6px}\n  p,li{font-size:17px;line-height:1.75;color:#1E293B}\n  ul,ol{padding-left:22px}\n  .summary{background:#E6EEFC;border:1px solid #CFDDF8;border-radius:18px;padding:16px 20px;margin:22px 0 6px}\n  .summary p,.summary li{color:#0A2A66;margin:6px 0}\n  .note{background:#FFF7E6;border:1px solid #F5DDAE;border-radius:16px;padding:14px 18px;margin:18px 0}\n  .note p{margin:0;color:#5C3D04;font-size:16px}\n  .tbl{overflow-x:auto;border:1px solid #DCE7F8;border-radius:14px;background:#fff;margin:14px 0}\n  table{width:100%;border-collapse:collapse;font-size:15px;min-width:520px}\n  caption{text-align:left;padding:12px 14px 4px;font-weight:800}\n  th{background:#EEF3FB;color:#1A3FAE;padding:9px 12px;text-align:right;font-size:14px}\n  td{padding:10px 12px;border-top:1px solid #E6ECF5;text-align:right;font-variant-numeric:tabular-nums}\n  th:first-child,td:first-child{text-align:left}\n  .cta{background:#0A2A66;color:#fff;border-radius:22px;padding:24px;margin:36px 0 10px}\n  .cta h2{color:#fff;margin:0 0 6px;font-size:22px}.cta p{color:#DCE7F8;margin:0 0 16px}\n  .cta .btn{background:#fff;color:#0A2A66}\n  .cards{display:grid;gap:14px;margin-top:20px}\n  .card{display:block;background:#fff;border:1px solid #DCE7F8;border-radius:18px;padding:18px 20px;text-decoration:none}\n  .card h2{margin:0 0 6px;font-size:20px;color:#0A2A66}.card p{margin:0;font-size:16px;color:#334155}\n  .card span{display:inline-block;margin-top:10px;font-weight:700;color:#1D4ED8}\n  .disc{font-size:14px;color:#475569;border-top:1px solid #DCE7F8;margin-top:30px;padding-top:14px}\n  footer{border-top:1px solid #DCE7F8;background:#fff;padding-bottom:env(safe-area-inset-bottom,0px)}\n  .foot{max-width:820px;margin:0 auto;padding:20px;display:flex;flex-wrap:wrap;gap:10px 20px;font-size:14px}\n  .foot a{color:#475569}\n";
  const HEADER = "<header><div class=\"bar\">\n  <a class=\"brand\" href=\"./\"><svg width=\"32\" height=\"32\" viewBox=\"0 0 48 48\" aria-hidden=\"true\"><rect x=\"8\" y=\"30\" width=\"8\" height=\"12\" rx=\"2\" fill=\"#0A2A66\"/><rect x=\"19\" y=\"24\" width=\"8\" height=\"18\" rx=\"2\" fill=\"#0A2A66\"/><rect x=\"30\" y=\"18\" width=\"8\" height=\"24\" rx=\"2\" fill=\"#0A2A66\"/><path d=\"M6 23 L42 7\" fill=\"none\" stroke=\"#5B8DEF\" stroke-width=\"3.4\" stroke-linecap=\"round\"/><path d=\"M34.3 4.8 L42 7 L38.5 14.2\" fill=\"none\" stroke=\"#5B8DEF\" stroke-width=\"3.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><text x=\"3\" y=\"15\" font-size=\"14\" font-weight=\"800\" fill=\"#0F9D6E\" font-family=\"system-ui, sans-serif\">$</text></svg><span>AllFolio<small>.pt</small></span></a>\n  <nav class=\"nav\" aria-label=\"Principal\"><a href=\"guias\">Guias</a><a href=\"app\">Abrir a app</a></nav>\n</div></header>";
  const FOOT = `
</main>
<footer><div class="foot">
  <a href="./">Início</a><a href="guias">Guias</a><a href="privacidade.html">Política de privacidade</a><a href="termos.html">Termos de utilização</a><a href="mailto:taxfolio.suporte@gmail.com">Contacto</a>
</div></footer>
</body>
</html>
`;
  const ld = (...o) => o.map(x => '<script type="application/ld+json">' + JSON.stringify(x).replace(/</g, '\\u003c') + '</script>').join('\n');
  const crumbsLD = items => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: SITE + u })) });
  function head({ title, desc, path, ogtype, jsonld }) {
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
<meta property="og:image" content="${SITE}icon-512.png">
${jsonld}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>${CSS}</style>
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
  function articlePage(a) {
    const type = a.type === 'semana' ? 'semana' : 'guia', min = readMin(a.body), section = type === 'semana' ? 'A semana do investidor' : (a.tag || 'Guia');
    const art = { '@context': 'https://schema.org', '@type': type === 'semana' ? 'NewsArticle' : 'Article', headline: a.title, description: a.desc, inLanguage: 'pt-PT',
      datePublished: a.date, dateModified: a.updated || a.date, author: { '@type': 'Organization', name: 'AllFolio.pt' },
      publisher: { '@type': 'Organization', name: 'AllFolio.pt', logo: { '@type': 'ImageObject', url: SITE + 'icon-512.png' } }, mainEntityOfPage: SITE + a.slug };
    return head({ title: a.title + ' – AllFolio.pt', desc: a.desc, path: a.slug, ogtype: 'article', jsonld: ld(art, crumbsLD([['Início', ''], ['Guias', 'guias'], [section, a.slug]])) })
      + `<p class="crumbs"><a href="./">Início</a> › <a href="guias">Guias</a> › ${esc(section)}</p>
<h1>${esc(a.title)}</h1>
<p class="meta">${a.updated && a.updated !== a.date ? 'Atualizado' : 'Publicado'} em ${fmtDate(a.updated || a.date)} · ${min} min de leitura</p>
${a.body}
<!-- AdSense: anúncio no fim do artigo (a ativar) -->
${a.cta === false ? '' : CTA}
${DISC[type](a.updated || a.date)}` + FOOT;
  }
  const pubList = reg => (reg.items || []).filter(x => x.status === 'pub').sort((x, y) => (y.date + y.slug).localeCompare(x.date + x.slug));
  const tagLine = (a, isNew) => `${isNew ? 'Novo · ' : ''}${a.type === 'semana' ? 'A semana do investidor' : esc(a.tag || 'Guia')} · ${a.min || 5} min`;
  const daysAgo = (iso, now) => (Date.parse(now) - Date.parse(iso)) / 864e5;
  function indexBlock(reg, now) {
    const list = pubList(reg); if (!list.length) return '<p class="sub">Em breve.</p>';
    const feat = list.find(x => x.featured) || list[0], rest = list.filter(x => x !== feat).slice(0, 3);
    const card = (a, big) => `        <a class="gcard${big ? ' big' : ''}" href="${esc(a.slug)}"><span class="tag">${tagLine(a, big && daysAgo(a.date, now) <= 14)}</span>
          <h3>${esc(a.title)}</h3>
          <p>${esc(a.teaser || a.desc)}</p>
          <span class="go">Ler →</span></a>`;
    return `<div class="gwrap">\n${[card(feat, true), ...rest.map(a => card(a, false))].join('\n')}\n      </div>`;
  }
  function applyIndex(html, reg, now) {
    const a = '<!--CMS:GUIAS-->', b = '<!--/CMS:GUIAS-->', i = html.indexOf(a), j = html.indexOf(b);
    if (i < 0 || j < i) throw new Error('A página inicial não tem os marcadores dos guias.');
    return html.slice(0, i + a.length) + '\n' + indexBlock(reg, now) + '\n      ' + html.slice(j);
  }
  function guiasPage(reg) {
    const list = pubList(reg), sec = (type, title) => { const l = list.filter(x => (x.type || 'guia') === type); if (!l.length) return '';
      return `<h2>${title}</h2>\n<div class="cards">\n${l.map(a => `  <a class="card" href="${esc(a.slug)}"><h2>${esc(a.title)}</h2><p>${esc(a.teaser || a.desc)}</p><span>Ler →</span></a>`).join('\n')}\n</div>\n`; };
    return head({ title: 'Guias de IRS e investimento para Portugal – AllFolio.pt', desc: 'Guias práticos e resumos semanais para quem investe a partir de Portugal: IRS de ações, ETFs, dividendos e Bitcoin, com exemplos passo a passo.', path: 'guias', ogtype: 'website',
      jsonld: ld({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Guias de IRS e investimento', url: SITE + 'guias', inLanguage: 'pt-PT' }, crumbsLD([['Início', ''], ['Guias', 'guias']])) })
      + `<p class="crumbs"><a href="./">Início</a> › Guias</p>
<h1>Guias e análises</h1>
<p class="meta">Explicações práticas, com exemplos, para investir e declarar os seus investimentos sem dores de cabeça.</p>
${sec('semana', 'A semana do investidor')}${sec('guia', 'Guias')}
<section class="cta" aria-labelledby="cta-t">
  <h2 id="cta-t">Faça isto em poucos minutos</h2>
  <p>O AllFolio importa os extratos da sua corretora, aplica o FIFO e prepara as tabelas do IRS. Gratuito.</p>
  <a class="btn" href="app">Experimentar o AllFolio grátis</a>
</section>` + FOOT;
  }
  function sitemap(reg, now) {
    const u = (loc, lm, cf, pr) => `  <url><loc>${SITE}${loc}</loc><lastmod>${lm}</lastmod><changefreq>${cf}</changefreq><priority>${pr}</priority></url>`;
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[u('', now, 'weekly', '1.0'), u('guias', now, 'weekly', '0.7'), u('privacidade.html', '2026-10-26', 'yearly', '0.3'), u('termos.html', '2026-10-26', 'yearly', '0.3'),
  ...pubList(reg).map(a => u(a.slug, a.updated || a.date, a.type === 'semana' ? 'yearly' : 'monthly', a.type === 'semana' ? '0.6' : '0.8'))].join('\n')}
</urlset>
`;
  }
  G.CMS = { esc, fmtDate, readMin, slugify, articlePage, indexBlock, applyIndex, guiasPage, sitemap, pubList, TYPE_LABEL };
})(typeof window !== 'undefined' ? window : globalThis);
