/* Application-owned compatibility layer. It runs only in opaque game sandboxes. */
(function bootstrap(seed) {
  "use strict";
  if (window.__orbitGameRuntime) return;
  window.__orbitGameRuntime = true;
  let initial = seed || {};
  if (!seed && location.hash.startsWith("#orbit-save=")) {
    try {
      initial = JSON.parse(decodeURIComponent(location.hash.slice(12)));
    } catch {}
  }
  const limit = 128 * 1024;
  // The pack includes Google Gadget wrappers. In a normal HTML document their
  // CDATA wrapper prevents the embedded game from parsing correctly.
  const nativeWrite = document.write.bind(document);
  document.write = (...parts) =>
    nativeWrite(
      ...parts.map((part) => {
        const html = String(part);
        const gadget =
          /<Content\b[^>]*>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/Content>/i.exec(
            html,
          );
        return gadget
          ? "<style>html,body{margin:0;width:100%;height:100%;overflow:hidden}object,embed{width:100%;height:100%}</style>" +
              gadget[1]
          : html;
      }),
    );
  function storage(values, persistent) {
    const data = Object.assign(Object.create(null), values);
    function changed() {
      if (persistent)
        parent.postMessage(
          { type: "orbit-game-storage", values: { ...data } },
          "*",
        );
    }
    const api = {
      getItem(key) {
        return Object.hasOwn(data, String(key)) ? data[String(key)] : null;
      },
      setItem(key, value) {
        const next = { ...data, [String(key)]: String(value) };
        if (JSON.stringify(next).length > limit)
          throw new DOMException("Save storage is full", "QuotaExceededError");
        data[String(key)] = String(value);
        changed();
      },
      removeItem(key) {
        delete data[String(key)];
        changed();
      },
      clear() {
        Object.keys(data).forEach((key) => delete data[key]);
        changed();
      },
      key(index) {
        return Object.keys(data)[index] ?? null;
      },
      get length() {
        return Object.keys(data).length;
      },
    };
    return new Proxy(api, {
      get(target, key) {
        return Reflect.has(target, key)
          ? Reflect.get(target, key)
          : (data[key] ?? undefined);
      },
      set(_target, key, value) {
        api.setItem(key, value);
        return true;
      },
      deleteProperty(_target, key) {
        api.removeItem(key);
        return true;
      },
      ownKeys() {
        return Object.keys(data);
      },
      getOwnPropertyDescriptor(_target, key) {
        return Object.hasOwn(data, key)
          ? {
              configurable: true,
              enumerable: true,
              writable: true,
              value: data[key],
            }
          : undefined;
      },
    });
  }
  const local = storage(initial, true);
  Object.defineProperty(window, "localStorage", {
    value: local,
    configurable: true,
  });
  Object.defineProperty(window, "sessionStorage", {
    value: storage({}, false),
    configurable: true,
  });
  // Several bundled games unpack their HTML into a Blob iframe. Carry the same
  // storage shim into those frames while retaining the inherited CSP sandbox.
  const NativeBlob = window.Blob;
  window.Blob = class extends NativeBlob {
    constructor(parts, options) {
      if (options?.type?.toLowerCase().startsWith("text/html")) {
        const values = {};
        for (let i = 0; i < local.length; i++) {
          const key = local.key(i);
          values[key] = local.getItem(key);
        }
        const source = `(${bootstrap.toString()})(${JSON.stringify(values).replace(/</g, "\\u003c")});`;
        parts = ["<script>" + source + "<" + "/script>", ...parts];
      }
      super(parts, options);
    }
  };
  window.addEventListener("message", (event) => {
    if (
      event.origin === "null" &&
      event.source !== window &&
      event.data?.type === "orbit-game-storage"
    ) {
      parent.postMessage(event.data, "*");
    }
  });
  parent.postMessage({ type: "orbit-game-ready" }, "*");
})();
