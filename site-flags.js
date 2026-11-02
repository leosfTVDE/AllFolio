/* AllFolio.pt – mostra ou esconde a lista de espera e a ferramenta do relatório, conforme os interruptores do painel (config.json). */
(function () {
  var P = 'taxfolio-cd926', K = 'AIzaSyDCrTwPrfyHwK9zp4UlXv_9Lf3wIesnmE0';
  function apply(c) {
    var wl = !!(c && c.waitlist) && !(c && c.tool), tool = !!(c && c.tool), any = wl || tool;
    document.querySelectorAll('[data-flag]').forEach(function (el) {
      var f = el.getAttribute('data-flag');
      var on = f === 'waitlist' ? wl : f === 'tool' ? tool : f === 'irs' ? any : f === 'none' ? !any : false;
      if (on) el.removeAttribute('hidden'); else el.setAttribute('hidden', '');
    });
    document.dispatchEvent(new CustomEvent('allfolio:flags', { detail: { waitlist: wl, tool: tool } }));
  }
  fetch('config.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }).then(apply);

  async function sha(s) { var b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [].map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  document.addEventListener('submit', async function (e) {
    var f = e.target; if (!f.classList || !f.classList.contains('wl-form')) return;
    e.preventDefault();
    var msg = f.querySelector('.wl-msg'), btn = f.querySelector('button'), email = (f.email.value || '').trim().toLowerCase(), broker = f.broker ? f.broker.value : '';
    var say = function (t, ok) { msg.textContent = t; msg.className = 'wl-msg ' + (ok ? 'ok' : 'err'); };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 120) return say('Escreva um email válido.');
    if (!f.consent.checked) return say('Para entrar na lista, aceite receber o email de aviso.');
    btn.disabled = true;
    try {
      var id = await sha(email);
      var r = await fetch('https://firestore.googleapis.com/v1/projects/' + P + '/databases/(default)/documents:commit?key=' + K, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ writes: [{ update: { name: 'projects/' + P + '/databases/(default)/documents/waitlist/' + id,
          fields: { email: { stringValue: email }, broker: { stringValue: String(broker).slice(0, 30) }, consent: { booleanValue: true }, src: { stringValue: location.pathname.slice(0, 60) } } },
          updateTransforms: [{ fieldPath: 'at', setToServerValue: 'REQUEST_TIME' }], currentDocument: { exists: false } }] })
      });
      if (r.ok) { f.reset(); say('✓ Está na lista! Avisamos por email quando abrir.', true); }
      else { var t = await r.text(); if (/FAILED_PRECONDITION|already exists|ALREADY_EXISTS/i.test(t)) say('✓ Este email já está na lista.', true); else say('Não foi possível inscrever agora. Tente mais tarde.'); }
    } catch (err) { say('Sem ligação. Tente outra vez.'); }
    btn.disabled = false;
  });
})();
