const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const config = window.TONRINGS_CONFIG ?? {};
const apiBase = typeof config.apiBase === 'string' ? config.apiBase.replace(/\/$/, '') : '';
const statusChip = $('#statusChip');
const statusText = $('#statusText');
const toast = $('#toast');
const ringStage = $('#ringStage');
const miniStage = $('#miniStage');
const previewName = $('#previewName');
const saveMessage = $('#saveMessage');
const mintButton = $('#mintRing');
const mintMessage = $('#mintMessage');

const labels = {
  material: { gold: 'Royal Gold', platinum: 'Platinum', obsidian: 'Obsidian' },
  gem: { diamond: 'Diamond', sapphire: 'Sapphire', emerald: 'Emerald' },
  aura: { royal: 'Royal', victory: 'Victory', eternal: 'Eternal' },
};

function apiUrl(path) {
  return `${apiBase}${path}`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2200);
}

async function checkStatus() {
  statusChip.classList.remove('ready', 'offline');

  if (!apiBase) {
    statusChip.classList.add('ready');
    statusText.textContent = 'Showcase online';
    return;
  }

  statusText.textContent = 'Checking system';
  try {
    const [health, ready] = await Promise.all([
      fetch(apiUrl('/health'), { cache: 'no-store' }),
      fetch(apiUrl('/ready'), { cache: 'no-store' }),
    ]);
    if (!health.ok) throw new Error('unhealthy');
    statusChip.classList.add(ready.ok ? 'ready' : 'offline');
    statusText.textContent = ready.ok ? 'System ready' : 'API setup pending';
  } catch {
    statusChip.classList.add('offline');
    statusText.textContent = 'Showcase online';
  }
}

statusChip?.addEventListener('click', checkStatus);

$('#watchDemo')?.addEventListener('click', () => {
  ringStage.classList.remove('enchanting');
  void ringStage.offsetWidth;
  ringStage.classList.add('enchanting');
  showToast('Diamond signal activated');
});

function updatePreview() {
  const material = miniStage.dataset.material;
  const gem = miniStage.dataset.gem;
  const aura = miniStage.dataset.aura;
  previewName.textContent = `${labels.material[material]} · ${labels.gem[gem]}`;
  saveMessage.textContent = `${labels.aura[aura]} aura selected`;
}

$$('[data-control]').forEach(group => {
  group.addEventListener('click', event => {
    const button = event.target.closest('.choice');
    if (!button) return;
    const key = group.dataset.control;
    $$('.choice', group).forEach(choice => choice.classList.toggle('active', choice === button));
    miniStage.dataset[key] = button.dataset.value;
    updatePreview();
  });
});

$('#randomize')?.addEventListener('click', () => {
  $$('[data-control]').forEach(group => {
    const choices = $$('.choice', group);
    const choice = choices[Math.floor(Math.random() * choices.length)];
    choices.forEach(item => item.classList.toggle('active', item === choice));
    miniStage.dataset[group.dataset.control] = choice.dataset.value;
  });
  updatePreview();
  showToast('A new combination appeared');
});

$('#saveLook')?.addEventListener('click', () => {
  const look = {
    material: labels.material[miniStage.dataset.material],
    gem: labels.gem[miniStage.dataset.gem],
    aura: labels.aura[miniStage.dataset.aura],
  };
  localStorage.setItem('tonrings-preview', JSON.stringify(look));
  saveMessage.textContent = 'Saved privately on this device';
  showToast('Look saved on this device');
});

function restoreLook() {
  try {
    const look = JSON.parse(localStorage.getItem('tonrings-preview'));
    if (!look) return;
    for (const [key, values] of Object.entries(labels)) {
      const value = Object.entries(values).find(([, label]) => label === look[key])?.[0];
      if (!value) continue;
      miniStage.dataset[key] = value;
      const group = $(`[data-control="${key}"]`);
      $$('.choice', group).forEach(choice => choice.classList.toggle('active', choice.dataset.value === value));
    }
    updatePreview();
  } catch {
    localStorage.removeItem('tonrings-preview');
  }
}

function initializeWallet() {
  if (!window.TON_CONNECT_UI?.TonConnectUI) {
    mintMessage.textContent = 'Wallet connector failed to load.';
    return;
  }

  const manifestUrl = new URL('tonconnect-manifest.json', window.location.href).toString();
  const tonConnectUi = new window.TON_CONNECT_UI.TonConnectUI({
    manifestUrl,
    buttonRootId: 'ton-connect',
  });

  tonConnectUi.onStatusChange(wallet => {
    mintButton.disabled = !wallet || !apiBase;
    if (!wallet) {
      mintButton.textContent = 'Connect wallet to mint';
      mintMessage.textContent = apiBase
        ? 'Connect the collection-owner wallet to prepare the next NFT.'
        : 'Backend deployment is required before minting.';
      return;
    }
    mintButton.textContent = apiBase ? 'Mint next ring' : 'Backend setup pending';
    mintMessage.textContent = apiBase
      ? 'The backend will verify the live collection index before wallet approval.'
      : 'Wallet connected. Configure TONRINGS_API_BASE to enable minting.';
  });

  mintButton?.addEventListener('click', async () => {
    const wallet = tonConnectUi.wallet;
    if (!wallet || !apiBase) return;

    mintButton.disabled = true;
    mintMessage.textContent = 'Checking live collection state…';
    try {
      const response = await fetch(apiUrl('/api/mint/prepare'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ recipientAddress: wallet.account.address }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || `Mint preparation failed (${response.status})`);

      mintMessage.textContent = `Review NFT #${body.itemIndex} in your wallet.`;
      const result = await tonConnectUi.sendTransaction(body.transaction);
      localStorage.setItem('tonrings-last-mint-boc', result.boc);
      mintMessage.textContent = `NFT #${body.itemIndex} submitted. Waiting for on-chain confirmation.`;
      showToast('Mint transaction submitted');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Mint transaction failed';
      mintMessage.textContent = message;
      showToast(message);
    } finally {
      mintButton.disabled = !tonConnectUi.wallet || !apiBase;
    }
  });
}

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
$$('.reveal').forEach(element => observer.observe(element));

const countObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const element = entry.target;
    const target = Number(element.dataset.count);
    const start = performance.now();
    const duration = 900;
    const tick = now => {
      const progress = Math.min((now - start) / duration, 1);
      element.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3))).toLocaleString();
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    countObserver.unobserve(element);
  });
}, { threshold: 0.6 });
$$('[data-count]').forEach(element => countObserver.observe(element));

restoreLook();
checkStatus();
initializeWallet();
