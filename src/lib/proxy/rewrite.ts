import { load } from "cheerio";
import { validateURL } from "./security";
export function proxyURL(value: string, base: URL, token: string) {
  try {
    if (value.startsWith("#")) return value;
    const url = new URL(value, base);
    validateURL(url.href);
    return `/api/proxy?url=${encodeURIComponent(url.href)}&token=${encodeURIComponent(token)}`;
  } catch {
    return "about:blank";
  }
}
export function rewriteCSS(css: string, base: URL, token: string) {
  return css
    .replace(
      /url\(\s*(["']?)(.*?)\1\s*\)/gi,
      (_full, _quote, value: string) =>
        `url("${value.startsWith("data:") ? value : proxyURL(value, base, token)}")`,
    )
    .replace(
      /@import\s+(["'])(.*?)\1/gi,
      (_f, _q, value: string) => `@import "${proxyURL(value, base, token)}"`,
    );
}
export function rewriteHTML(
  html: string,
  base: URL,
  token: string,
  nonce: string,
) {
  const $ = load(html);
  $(
    "script,iframe,frame,frameset,object,embed,applet,base,meta[http-equiv],link[rel=preload],link[rel=modulepreload],link[rel=prefetch]",
  ).remove();
  $("*").each((_i, el) => {
    if (!("attribs" in el)) return;
    const node = $(el);
    for (const attr of Object.keys(el.attribs)) {
      if (
        attr.startsWith("on") ||
        ["integrity", "crossorigin", "srcdoc", "ping", "nonce"].includes(attr)
      )
        node.removeAttr(attr);
    }
    for (const attr of ["src", "href", "poster", "background"]) {
      const value = node.attr(attr);
      if (value) node.attr(attr, proxyURL(value, base, token));
    }
    const srcset = node.attr("srcset");
    if (srcset)
      node.attr(
        "srcset",
        srcset
          .split(",")
          .map((v) => {
            const [u, ...desc] = v.trim().split(/\s+/);
            return proxyURL(u, base, token) + " " + desc.join(" ");
          })
          .join(", "),
      );
    const style = node.attr("style");
    if (style) node.attr("style", rewriteCSS(style, base, token));
    node.removeAttr("target");
    node.removeAttr("download");
  });
  $("style").each((_i, el) => {
    $(el).text(rewriteCSS($(el).text(), base, token));
  });
  $("form").each((_i, el) => {
    $(el).removeAttr("action");
    $(el).find("input,button,textarea,select").attr("disabled", "disabled");
  });
  // Only this application-owned script runs; upstream JavaScript is intentionally removed.
  const script = `(()=>{const current=${JSON.stringify(base.href).replace(/</g, "\\u003c")};parent.postMessage({type:'orbit-ready',url:current},'*');document.addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;e.preventDefault();try{const u=new URL(a.href);const target=u.searchParams.get('url');if(target)parent.postMessage({type:'orbit-navigate',url:target},'*');else if(a.getAttribute('href').startsWith('#'))location.hash=a.getAttribute('href');}catch{}});})()`;
  $("body").prepend(
    '<div style="padding:10px;background:#18261d;color:#d8edcc;font:12px Arial">Read-only proxy · Site scripts and forms are disabled. Some pages require opening directly.</div>',
  );
  $("body").append($("<script>").attr("nonce", nonce).text(script));
  return $.html();
}
