/* FerApp — Service Worker v10
   Estratégia: Network First para o HTML (sempre busca a versão mais recente),
   cache como fallback para quando estiver offline.
   IMPORTANTE: só intercepta requests da mesma origem (arquivos do app).
   Requests para APIs externas (Google Apps Script, OpenAI) passam direto.
   v7: fallback de navegação offline → garante abertura do app sem internet.
   v9: painel de diagnóstico DEBUG adicionado ao FerApp.html.
   v10: BUG FIX crítico — syncingIds/toastT/bannerT movidos para o topo do
        script para evitar TDZ quando init() chama renderHistory com registros
        carregados (causa do histórico vazio na segunda abertura).
*/

const CACHE_NAME = 'ferapp-v10';
const ASSETS = [
  './FerApp.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Instala e faz cache dos arquivos essenciais
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Remove caches antigos de versões anteriores
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Intercepta requests
self.addEventListener('fetch', e => {
  // Só intercepta GET
  if (e.request.method !== 'GET') return;

  // Só intercepta requests da MESMA ORIGEM (arquivos do app)
  // APIs externas (Google Apps Script, OpenAI, etc.) passam direto sem interferência
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Recebeu resposta da rede — atualiza o cache
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Sem internet — serve do cache
        return caches.match(e.request).then(cached => {
          if (cached) return cached;
          // Fallback: qualquer navegação sem cache volta para o app principal
          if (e.request.mode === 'navigate') return caches.match('./FerApp.html');
        });
      })
  );
});
