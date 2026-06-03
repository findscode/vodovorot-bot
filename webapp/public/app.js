(function () {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
  }

  const statusEl = document.getElementById('status');
  const spreadsCard = document.getElementById('spreads-card');
  const spreadList = document.getElementById('spread-list');
  const tierCard = document.getElementById('tier-card');
  const pushCard = document.getElementById('push-card');
  const helpCard = document.getElementById('help-card');
  const tierLine = document.getElementById('tier-line');
  const premiumLine = document.getElementById('premium-line');
  const pushEnabled = document.getElementById('push-enabled');
  const pushTz = document.getElementById('push-tz');
  const presetButtons = document.getElementById('preset-buttons');
  const helpList = document.getElementById('help-list');
  const disclaimer = document.getElementById('disclaimer');
  const privacyLink = document.getElementById('privacy-link');

  let current = null;
  let saving = false;

  function authHeaders() {
    const initData = tg?.initData || '';
    return {
      Authorization: `tma ${initData}`,
      'Content-Type': 'application/json',
    };
  }

  async function api(path, opts) {
    const res = await fetch(path, {
      ...opts,
      headers: { ...authHeaders(), ...(opts?.headers || {}) },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  function setStatus(text, isError) {
    statusEl.textContent = text;
    statusEl.className = isError ? 'status error' : 'status';
  }

  function settingsErrorMessage(code) {
    if (code === 'push_paused') {
      return 'Рассылка сейчас недоступна на сервере. Карту дня можно взять кнопкой расклада в Меню.';
    }
    if (code === 'push_disabled') return 'Сначала включи «Присылать каждый день».';
    if (code === 'invalid_hhmm') return 'Это время недоступно.';
    return code || 'Не удалось сохранить';
  }

  async function launchSpread(action) {
    if (saving) return;
    setStatus('Открываю в чате…');
    try {
      await api('/api/webapp/launch', {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      if (tg?.close) tg.close();
    } catch (e) {
      setStatus(e.message || 'Не удалось запустить расклад', true);
    }
  }

  function renderSpreads(spreads) {
    spreadList.innerHTML = '';
    for (const item of spreads) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'spread-btn' + (item.enabled ? '' : ' disabled');
      btn.disabled = !item.enabled || saving;

      const label = document.createElement('span');
      label.className = 'spread-label';
      label.textContent = `${item.tierPrefix}${item.label}`;
      btn.appendChild(label);

      if (item.hint) {
        const hint = document.createElement('span');
        hint.className = 'spread-hint';
        hint.textContent = item.hint;
        btn.appendChild(hint);
      }

      if (item.enabled) {
        btn.addEventListener('click', () => launchSpread(item.action));
      }

      spreadList.appendChild(btn);
    }
  }

  function renderPresets(data) {
    presetButtons.innerHTML = '';
    const selected = data.dayPush.hhmm;
    for (const hhmm of data.pushPresets) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'preset' + (selected === hhmm ? ' selected' : '');
      btn.textContent = hhmm;
      btn.disabled = !data.dayPush.enabled || saving;
      btn.addEventListener('click', () => patchSettings({ dayPushHhmm: hhmm }));
      presetButtons.appendChild(btn);
    }
  }

  function render(data) {
    current = data;
    spreadsCard.hidden = false;
    tierCard.hidden = false;
    pushCard.hidden = false;
    helpCard.hidden = false;

    renderSpreads(data.spreads || []);

    tierLine.textContent = `${data.tierEmoji} ${data.helpSummary[0] || data.tier}`;
    premiumLine.textContent = data.premiumUntil ? `Premium до ${data.premiumUntil}` : '';
    premiumLine.hidden = !data.premiumUntil;

    pushEnabled.checked = data.dayPush.enabled;
    const pushAvailable = data.dayPush.available !== false;
    pushTz.textContent = pushAvailable
      ? `Часовой пояс: ${data.dayPush.timezone}`
      : 'Рассылка «На день» сейчас недоступна на сервере.';
    pushEnabled.disabled = saving || !pushAvailable;

    helpList.innerHTML = '';
    for (const line of data.helpSummary) {
      const li = document.createElement('li');
      li.textContent = line;
      helpList.appendChild(li);
    }

    disclaimer.textContent = data.disclaimer;
    privacyLink.href = data.privacyUrl;
    renderPresets(data);
    setStatus('');
  }

  async function patchSettings(patch) {
    if (saving) return;
    saving = true;
    setStatus('Сохраняю…');
    try {
      const data = await api('/api/webapp/settings', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      render(data);
      if (tg?.showAlert) tg.showAlert('Сохранено');
    } catch (e) {
      const msg = settingsErrorMessage(e.message);
      setStatus(msg, true);
      if (tg?.showAlert) tg.showAlert(msg);
      if (current) render(current);
    } finally {
      saving = false;
      if (current) {
        renderPresets(current);
        renderSpreads(current.spreads || []);
      }
    }
  }

  pushEnabled.addEventListener('change', () => {
    patchSettings({ dayPushEnabled: pushEnabled.checked });
  });

  async function load() {
    try {
      const data = await api('/api/webapp/settings');
      render(data);
    } catch (e) {
      setStatus('Открой меню из Telegram-бота.', true);
    }
  }

  load();
})();
