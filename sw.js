/* FerApp — Service Worker
   Estratégia: Cache First para assets estáticos, Network First para o HTML.
   Atualiza o cache automaticamente quando online.
*/

const CACHE_NAME = 'ferapp-v2';
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
  self.skipWaiting(); // ativa imediatamente sem esperar fechar as abas
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
  self.clients.claim(); // assume controle das abas abertas imediatamente
});

// Intercepta requests: tenta rede primeiro, cai no cache se offline
self.addEventListener('fetch', e => {
  // Ignora requests que não sejam GET ou que sejam de APIs externas
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (!url.protocol.startsWith('http')) return;

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Se recebeu resposta válida, atualiza o cache
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Sem internet — serve do cache
        return caches.match(e.request);
      })
  );
});
