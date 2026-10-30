/* AllFolio.pt – contagem de visitas sem cookies e sem dados pessoais: só soma totais por dia. */
(function () {
  try {
    if (localStorage.getItem('af_notrack') === '1') return;
    var P = 'taxfolio-cd926', K = 'AIzaSyDCrTwPrfyHwK9zp4UlXv_9Lf3wIesnmE0';
    var d = new Date(), z = function (n) { return (n < 10 ? '0' : '') + n; };
    var day = d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
    var slug = location.pathname.replace(/^\/+|\/+$/g, '').replace(/\.html$/, '').toLowerCase();
    if (!slug || slug === 'index') slug = 'inicio';
    slug = slug.replace(/[^a-z0-9-]/g, '_').slice(0, 80);
    if (/^(app|admin)$/.test(slug)) return;
    var ss = sessionStorage, tf = [];
    var inc = function (f) { tf.push({ fieldPath: f, increment: { integerValue: '1' } }); };
    var send = function (t) {
      try {
        fetch('https://firestore.googleapis.com/v1/projects/' + P + '/databases/(default)/documents:commit?key=' + K, {
          method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ writes: [{ transform: { document: 'projects/' + P + '/databases/(default)/documents/stats/' + day, fieldTransforms: t } }] })
        }).catch(function () {});
      } catch (e) {}
    };
    inc('pv'); inc('p.`' + slug + '`');
    if (!ss.getItem('af_v')) {
      ss.setItem('af_v', '1'); inc('v');
      var h = ''; try { h = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) {}
      var utm = (new URLSearchParams(location.search).get('utm_source') || '').toLowerCase();
      var src = /(^|\.)google\./.test(h) || utm === 'google' ? 'google'
        : /(bing|duckduckgo|ecosia|yahoo|brave|qwant|startpage)\./.test(h) ? 'pesquisa'
        : /(facebook|instagram|t\.co|twitter|x\.com|linkedin|reddit|whatsapp|telegram|tiktok|youtube|threads)/.test(h + ' ' + utm) ? 'social'
        : (!h || h === location.hostname) ? 'direto' : 'outros';
      inc('s.' + src);
      inc('d.' + (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop'));
      var lg = (navigator.language || '').slice(0, 2).toLowerCase(); inc('l.' + (/^(pt|en|es|fr|de)$/.test(lg) ? lg : 'outro'));
      var tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
      inc('c.' + (/^(Europe\/Lisbon|Atlantic\/(Azores|Madeira))$/.test(tz) ? 'PT' : /^America\/(Sao_Paulo|Fortaleza|Recife|Bahia|Belem|Manaus|Cuiaba|Campo_Grande|Porto_Velho|Boa_Vista|Rio_Branco|Araguaina|Maceio|Santarem|Noronha)$/.test(tz) ? 'BR' : /^Europe\//.test(tz) ? 'EU' : 'outro'));
    }
    var art = document.querySelector('meta[property="og:type"][content="article"]');
    if (art && !ss.getItem('af_g')) { ss.setItem('af_g', '1'); inc('f.guia'); }
    send(tf);
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null; if (!a) return;
      var href = a.getAttribute('href') || '';
      if (/^(\.\/|\/)?app(\.html)?([?#].*)?$/.test(href) || /allfolio\.pt\/app/.test(href)) {
        if (!ss.getItem('af_a')) { ss.setItem('af_a', '1'); send([{ fieldPath: 'f.app', increment: { integerValue: '1' } }]); }
      }
    }, true);
  } catch (e) {}
})();
