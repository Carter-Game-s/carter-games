(() => {
  const parentOrigin = window.CARTER_APP_ORIGIN;
  const status = document.getElementById("status");
  const send = (type, detail = {}) =>
    parent.postMessage(
      { type: "carter-browser:" + type, ...detail },
      parentOrigin,
    );
  let frame;
  let pending =
    new URLSearchParams(location.hash.slice(1)).get("url") ||
    "https://example.com";
  const valid = (raw) => {
    const url = new URL(raw);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw Error("Use a public HTTP or HTTPS website.");
    return url.href;
  };
  window.addEventListener("message", (event) => {
    if (
      event.source !== parent ||
      event.origin !== parentOrigin ||
      event.data?.type !== "carter-browser:command"
    )
      return;
    try {
      const { command, url } = event.data;
      if (command === "navigate") {
        pending = valid(url);
        if (frame) {
          status.hidden = false;
          status.textContent = "Loading page…";
          frame.go(pending);
        }
      } else if (!frame && command === "reload") location.reload();
      else if (frame && ["back", "forward", "reload"].includes(command))
        frame[command]();
    } catch (error) {
      send("error", { message: error.message });
    }
  });
  async function start() {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/browse/",
      updateViaCache: "none",
    });
    let worker =
      registration.active || registration.installing || registration.waiting;
    if (worker.state !== "activated")
      await new Promise((resolve, reject) => {
        worker.addEventListener("statechange", () => {
          if (worker.state === "activated") resolve();
          if (worker.state === "redundant")
            reject(Error("Browser worker failed."));
        });
      });
    const transport = new EpoxyTransport.default({
      wisp: `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/wisp/`,
      wisp_v2: true,
    });
    await transport.init();
    const controller = new $scramjetController.Controller({
      serviceworker: worker,
      transport,
      config: {
        prefix: "/browse/",
        scramjetPath: "/vendor/core.js",
        injectPath: "/vendor/inject.js",
        wasmPath: "/vendor/core.wasm",
        virtualWasmPath: "carter-wasm.js",
      },
    });
    await controller.wait();
    frame = controller.createFrame(undefined, {
      plugins: [
        new $scramjetUtils.EventHandlerPlugin(),
        new $scramjetUtils.LinkHandlerPlugin((url) => send("newtab", { url })),
        new $scramjetUtils.UrlWatcherPlugin((url) => send("url", { url })),
      ],
    });
    frame.element.title = "Interactive webpage";
    frame.element.setAttribute(
      "allow",
      "fullscreen; autoplay; clipboard-read; clipboard-write; encrypted-media; picture-in-picture",
    );
    frame.element.setAttribute(
      "sandbox",
      "allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals allow-pointer-lock",
    );
    document.getElementById("stage").append(frame.element);
    $scramjet.Tap.tap(frame.hooks.init.post, (context) => {
      if (!context.isTopLevel) return;
      status.hidden = true;
      send("ready");
      context.window.addEventListener("load", () => send("ready"), {
        once: true,
      });
    });
    $scramjet.Tap.tap(frame.hooks.error.request, ({ error, rawrequest }) => {
      if (rawrequest.rawUrl !== frame.element.src) return;
      status.hidden = false;
      status.textContent = "This page could not load. Use Refresh to retry.";
      send("error", { message: error?.message || "Page unavailable." });
    });
    frame.go(valid(pending));
  }
  start().catch((error) => {
    status.textContent = "Could not start the browser: " + error.message;
    send("error", { message: error.message });
  });
})();
