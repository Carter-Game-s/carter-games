importScripts("/vendor/worker.js");
self.addEventListener("fetch", (event) => {
  if (self.$scramjetController.shouldRoute(event))
    event.respondWith(self.$scramjetController.route(event));
});
