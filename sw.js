// sw.js
const CACHE_NAME = 'financas-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css', // ajuste para seus caminhos
  './js/main.js',
  './js/dashboard/ui.js',
  './js/dashboard/api.js',
  './js/shared/utils.js'
];

// Instalação: Salva arquivos essenciais
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// Estratégia: Tenta Rede, se falhar, usa Cache
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});