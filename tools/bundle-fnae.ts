import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
const revision = "c9c8b513a27155bf37c4ab3dee74e99b12b895ba";
const [source, output] = process.argv.slice(2);
if (!source || !output)
  throw new Error(
    "Usage: bun tools/bundle-fnae.ts <pinned-source-repository> <output.html>",
  );
const read = (file: string) =>
  execFileSync("git", ["-C", source, "show", `${revision}:${file}`], {
    maxBuffer: 50 * 1024 * 1024,
  });
const cacheCall =
  "n=m.companyName&&m.productName?m.cachedFetch:m.fetchWithProgress";
const loaderSource = read("Build/fnae.loader.js").toString("utf8");
if (!loaderSource.includes(cacheCall))
  throw new Error("Pinned Unity loader cache adapter changed");
const entries: [string, Buffer][] = [
  [
    "data",
    Buffer.concat(
      [1, 2, 3].map((index) => read(`Build/fnae.data.part${index}`)),
    ),
  ],
  [
    "wasm",
    Buffer.concat(
      [1, 2, 3].map((index) => read(`Build/fnae.wasm.part${index}`)),
    ),
  ],
  [
    "video",
    Buffer.concat(
      [1, 2, 3].map((index) =>
        read(`StreamingAssets/202512191935.webm.part${index}`),
      ),
    ),
  ],
  ["framework", read("Build/fnae.framework.js")],
  [
    "loader",
    Buffer.from(loaderSource.replace(cacheCall, "n=m.fetchWithProgress")),
  ],
  ["services", read("StreamingAssets/UnityServicesProjectConfiguration.json")],
];
const payloads = entries
  .map(([name, body]) => {
    const zipped = gzipSync(body, { level: 9 });
    console.log(
      `${name}: ${body.length} bytes → ${zipped.length} compressed bytes`,
    );
    return `<script type="application/octet-stream" id="asset-${name}">${zipped.toString("base64")}</script>`;
  })
  .join("\n");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Five Nights at Epstein's</title><style>html,body{margin:0;width:100%;height:100%;background:#100e15;color:#f0eafa;font-family:system-ui,sans-serif;overflow:hidden}#unity-canvas{display:block;width:100%;height:100%;object-fit:contain}#loader{position:absolute;inset:0;display:grid;place-content:center;text-align:center;padding:20px;background:radial-gradient(ellipse at top,#362849,#100e15)}h1{font-size:clamp(22px,4vw,38px)}p{color:#c7bada}button{border:0;border-radius:12px;background:#bd98f0;color:#1a1026;font-size:18px;font-weight:700;padding:14px 26px;cursor:pointer}button:disabled{opacity:.45;cursor:wait}progress{width:min(360px,80vw);height:12px;accent-color:#bd98f0;margin:12px auto}#error{color:#ffb3bc;max-width:700px;overflow-wrap:anywhere}</style></head><body><canvas id="unity-canvas" width="960" height="600" tabindex="0"></canvas><div id="loader"><h1>Five Nights at Epstein's</h1><p id="loading-status">Preparing bundled game assets…</p><progress id="progress" max="1" value="0"></progress><button id="start" disabled>Play</button><p id="error" role="alert"></p></div>${payloads}<script>
const label=document.getElementById('loading-status'),bar=document.getElementById('progress'),button=document.getElementById('start');
function fail(error){document.getElementById('error').textContent=String(error&&error.message||error);parent.postMessage({type:'orbit-game-error'},'*');console.error(error)}
async function asset(name,type){const element=document.getElementById('asset-'+name);let encoded=element.textContent;let offset=0;element.remove();const stream=new ReadableStream({pull(controller){if(offset>=encoded.length){encoded='';controller.close();return}const binary=atob(encoded.slice(offset,offset+1048576));offset+=1048576;const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);controller.enqueue(bytes)}});const blob=await new Response(stream.pipeThrough(new DecompressionStream('gzip'))).blob();return URL.createObjectURL(new Blob([blob],{type}))}
(async()=>{const resources={};const definitions=[['data','application/octet-stream'],['wasm','application/wasm'],['video','video/webm'],['framework','text/javascript'],['loader','text/javascript'],['services','application/json']];let completed=0;await Promise.all(definitions.map(async([name,type])=>{resources[name]=await asset(name,type);label.textContent='Preparing assets · '+(++completed)+' / '+definitions.length;bar.value=completed/definitions.length}));
const originalFetch=window.fetch.bind(window);window.fetch=(input,options)=>{const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;if(url.includes('UnityServicesProjectConfiguration.json'))return originalFetch(resources.services,options);if(url.includes('202512191935.webm')||url.includes('202512191935.mp4'))return originalFetch(resources.video,options);return originalFetch(input,options)};
const descriptor=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'src');Object.defineProperty(HTMLMediaElement.prototype,'src',{configurable:descriptor.configurable,enumerable:descriptor.enumerable,get(){return descriptor.get.call(this)},set(value){if(typeof value==='string'&&(value.includes('202512191935.mp4')||value.includes('202512191935.webm')))value=resources.video;descriptor.set.call(this,value)}});
const script=document.createElement('script');script.src=resources.loader;await new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=()=>reject(Error('Unity loader could not load'));document.body.appendChild(script)});button.disabled=false;label.textContent='Assets ready. Click Play to start.';window.__carterAssetsReady=true;
button.onclick=async()=>{button.disabled=true;label.textContent='Starting Unity…';bar.value=0;try{const instance=await createUnityInstance(document.getElementById('unity-canvas'),{arguments:[],dataUrl:resources.data,frameworkUrl:resources.framework,codeUrl:resources.wasm,streamingAssetsUrl:'StreamingAssets',companyName:'DefaultCompany',productName:'fnae',productVersion:'1.0',showBanner(message,type){if(type==='error')fail(message)}},progress=>{bar.value=progress;label.textContent='Starting Unity · '+Math.round(progress*100)+'%'});window.__carterUnity=instance;document.getElementById('loader').remove();document.getElementById('unity-canvas').focus()}catch(error){fail(error)}};
})().catch(fail);
</script></body></html>`;
if (Buffer.byteLength(html) > 150 * 1024 * 1024)
  throw new Error("Bundled game exceeds the player's verified size limit");
await writeFile(output, html);
console.log(
  `Bundled pinned Unity assets into ${Buffer.byteLength(html)} bytes. No external requests are needed.`,
);
