import assert from 'node:assert/strict';
const base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:3200';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname)&&process.env.ALLOW_PRODUCTION_READONLY_SMOKE!=='true')throw new Error('Explicit readonly production smoke authorization required');
const agents=['Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36','Mozilla/5.0 (Linux; Android 13) Chrome/130.0.0.0 Mobile Safari/537.36','Googlebot','Mozilla/5.0 HeadlessChrome/130.0.0.0 Chrome-Lighthouse'];
for(const route of ['/','/menu','/notre-savoir-faire','/pizza-drain','/pizzeria-oudon','/pizza-saint-florent-le-vieil']){
 for(const ua of (route==='/menu'?agents:[agents[0]])){
  const response=await fetch(base+route,{headers:{'user-agent':ua},signal:AbortSignal.timeout(45000)});
  assert.equal(response.status,200,route);const html=await response.text();
  assert.doesNotMatch(html,/<html[^>]*id="__next_error__"/,route);
  assert.match(html,/<html[^>]*lang="fr"/,route);assert.match(html,/<title>[^<]+<\/title>/,route);
  assert.match(html,/<meta[^>]*name="description"[^>]*content="[^"]+"/,route);
  assert.match(html,/<main[\s>]/,route);
  for(const match of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)){
   const data=JSON.parse(match[1]);
   if(data.openingHoursSpecification)assert.deepEqual(data.openingHoursSpecification.map(x=>[x.opens,x.closes]),[['18:00','21:00'],['18:00','21:30']]);
  }
  assert.doesNotMatch(html,/(48|72)\s*(heures|h\b)|18h30|22h00/,route);
  console.log('ok - normal HTML, metadata, winter JSON-LD:',route,ua.includes('Lighthouse')?'lighthouse':ua.includes('Googlebot')?'googlebot':ua.includes('Mobile')?'mobile':'desktop');
 }
}
