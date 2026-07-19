const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const statusChip = $('#statusChip');
const statusText = $('#statusText');
const toast = $('#toast');
const ringStage = $('#ringStage');
const miniStage = $('#miniStage');
const previewName = $('#previewName');
const saveMessage = $('#saveMessage');

const labels = {
  material: { gold: 'Royal Gold', platinum: 'Platinum', obsidian: 'Obsidian' },
  gem: { diamond: 'Diamond', sapphire: 'Sapphire', emerald: 'Emerald' },
  aura: { royal: 'Royal', victory: 'Victory', eternal: 'Eternal' },
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2200);
}

async function checkStatus() {
  statusChip.classList.remove('ready', 'offline');
  statusText.textContent = 'Checking system';
  try {
    const [health, ready] = await Promise.all([
      fetch('/health', { cache: 'no-store' }),
      fetch('/ready', { cache: 'no-store' }),
    ]);
    if (!health.ok) throw new Error('unhealthy');
    statusChip.classList.add(ready.ok ? 'ready' : 'offline');
    statusText.textContent = ready.ok ? 'System ready' : 'Preview mode';
  } catch {
    statusChip.classList.add('offline');
    statusText.textContent = 'Preview mode';
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

$('#saveLook')?.addEventListener('click', async () => {
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
