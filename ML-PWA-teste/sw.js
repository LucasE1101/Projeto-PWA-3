const CACHE_NAME = "meu-pwa-v2";
const DYNAMIC_CACHE = "dynamic-v1";

// Arquivos essenciais (cache estático)
const arquivosParaCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

// Instalação e cache inicial
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(arquivosParaCache))
  );
});

// Ativação e limpeza de caches antigos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
            return caches.delete(key);
          }
        })
      )
    )
  );
});

// Função auxiliar: limitar tamanho do cache dinâmico
async function limitarCache(nome, maxItens) {
  const cache = await caches.open(nome);
  const keys = await cache.keys();
  if (keys.length > maxItens) {
    await cache.delete(keys[0]); // apaga o mais antigo
    limitarCache(nome, maxItens); // recursivo até ficar no limite
  }
}

// Intercepta requests
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cacheRes) => {
      return (
        cacheRes ||
        fetch(event.request)
          .then((fetchRes) => {
            return caches.open(DYNAMIC_CACHE).then((cache) => {
              // Só faz cache de imagens e requisições GET
              if (
                event.request.method === "GET" &&
                (event.request.destination === "image" || event.request.url.startsWith("http"))
              ) {
                cache.put(event.request.url, fetchRes.clone());
                limitarCache(DYNAMIC_CACHE, 50); // mantém até 50 itens
              }
              return fetchRes;
            });
          })
          .catch(() => {
            // Fallback opcional: se offline e sem cache
            if (event.request.destination === "document") {
              return caches.match("/index.html");
            }
          })
      );
    })
  );
});
