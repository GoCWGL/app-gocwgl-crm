/*
 * GoCWGL embeds: forms, surveys and booking pages on any website.
 *
 *   <iframe src="https://<app>/form/<id>?embed=1" data-gocwgl-embed …></iframe>   inline (grows to fit)
 *   <button data-gocwgl-popup="https://<app>/survey/<id>">Take the survey</button>  opens in a popup
 *   <script src="https://<app>/embed.js" async></script>
 *
 * The pages report their height and "go to this thank-you page" redirects with postMessage; this
 * script only acts on messages from its own origin and from iframes it can find on the page.
 */
(function () {
  if (window.__gocwglEmbed) return;
  window.__gocwglEmbed = true;

  var script = document.currentScript || document.querySelector('script[src$="/embed.js"]');
  var ORIGIN = new URL(script ? script.src : location.href).origin;

  function frameFor(source) {
    var frames = document.getElementsByTagName("iframe");
    for (var i = 0; i < frames.length; i++) if (frames[i].contentWindow === source) return frames[i];
    return null;
  }

  window.addEventListener("message", function (e) {
    if (e.origin !== ORIGIN || !e.data || typeof e.data !== "object") return;
    var frame = frameFor(e.source);
    if (!frame) return;
    if (e.data.type === "gocwgl:height" && typeof e.data.height === "number" && !frame.hasAttribute("data-gocwgl-fixed")) {
      frame.style.height = Math.ceil(e.data.height) + "px";
    } else if (e.data.type === "gocwgl:redirect" && /^https?:\/\//i.test(String(e.data.url))) {
      window.location.href = e.data.url;
    }
  });

  // ----------------------------------------------------------------- Popup
  var overlay = null;

  function close() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    document.documentElement.style.overflow = "";
  }

  function open(url) {
    close();
    overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;" +
      "padding:16px;background:rgba(15,23,42,.55)";
    var box = document.createElement("div");
    box.style.cssText =
      "position:relative;width:100%;max-width:640px;max-height:calc(100vh - 32px);overflow:auto;" +
      "border-radius:18px;background:#fff;box-shadow:0 24px 64px rgba(0,0,0,.3)";
    var shut = document.createElement("button");
    shut.type = "button";
    shut.setAttribute("aria-label", "Close");
    shut.textContent = "×";
    shut.style.cssText =
      "position:absolute;top:8px;right:8px;z-index:1;width:36px;height:36px;border:0;border-radius:50%;" +
      "background:#f1f5f9;color:#0f172a;font:24px/1 sans-serif;cursor:pointer";
    shut.onclick = close;
    var frame = document.createElement("iframe");
    frame.src = url + (url.indexOf("?") < 0 ? "?" : "&") + "embed=1";
    frame.title = "Form";
    frame.style.cssText = "display:block;width:100%;height:480px;border:0";
    box.appendChild(shut);
    box.appendChild(frame);
    overlay.appendChild(box);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
    document.body.appendChild(overlay);
    document.documentElement.style.overflow = "hidden";
    shut.focus();
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
  });

  document.addEventListener("click", function (e) {
    var trigger = e.target && e.target.closest ? e.target.closest("[data-gocwgl-popup]") : null;
    if (!trigger) return;
    var url = trigger.getAttribute("data-gocwgl-popup") || "";
    // Only pages on this app open here, so a popup attribute can't load someone else's site.
    if (url.indexOf(ORIGIN + "/") !== 0) return;
    e.preventDefault();
    open(url);
  });
})();
