const rawCounterId = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID;
const counterId = process.env.NODE_ENV === 'production'
  && rawCounterId
  && /^\d+$/.test(rawCounterId)
  ? Number(rawCounterId)
  : null;

export default function YandexMetricaBootstrap() {
  if (!counterId) return null;

  const bootstrapScript = `
    (function () {
      var hostname = window.location.hostname.toLowerCase().replace(/\\.$/, "");
      var isLocalhost = hostname === "localhost"
        || hostname.endsWith(".localhost")
        || hostname === "127.0.0.1"
        || hostname === "::1"
        || hostname === "[::1]";

      if (isLocalhost || window.__photogenMetrikaInitialized) return;
      window.__photogenMetrikaInitialized = true;

      window.ym = window.ym || function () {
        (window.ym.a = window.ym.a || []).push(arguments);
      };
      window.ym.l = 1 * new Date();

      var currentPageUrl = window.location.pathname + window.location.search;
      window.__photogenMetrikaPageUrl = currentPageUrl;
      window.ym(${counterId}, "init", { defer: true });
      window.ym(${counterId}, "hit", currentPageUrl);

      function loadMetrikaTag() {
        if (document.querySelector("script[data-yandex-metrika-tag]")) return;

        var tag = document.createElement("script");
        tag.async = true;
        tag.src = "https://mc.yandex.ru/metrika/tag.js";
        tag.dataset.yandexMetrikaTag = "true";
        document.head.appendChild(tag);
      }

      if (document.readyState === "complete") {
        loadMetrikaTag();
      } else {
        window.addEventListener("load", loadMetrikaTag, { once: true });
      }
    })();
  `;

  return (
    <script
      id="yandex-metrika"
      dangerouslySetInnerHTML={{ __html: bootstrapScript }}
    />
  );
}
