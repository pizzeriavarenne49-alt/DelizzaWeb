import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadTsModule } from './support/load-ts-module.mjs';
const { BUSINESS, COMMUNES }=loadTsModule(path.resolve('src/lib/seo.ts'));
const { restaurantSchema, communeFaqs }=loadTsModule(path.resolve('src/lib/schemas.ts'));
const specs=restaurantSchema().openingHoursSpecification;
assert.deepEqual(JSON.parse(JSON.stringify(specs.map(s=>[s.dayOfWeek,s.opens,s.closes]))),[
 [['Wednesday','Thursday'],'18:00','21:00'],[['Friday','Saturday','Sunday'],'18:00','21:30'],
]);
assert.equal(BUSINESS.address.streetAddress,'98 Place du Jardin Public');
for(const commune of COMMUNES){
 const faq=communeFaqs(commune);
 assert.ok(faq.some(item=>item.answer.includes(BUSINESS.openingHoursText)));
 assert.ok(faq.some(item=>item.answer.includes('pas de livraison')));
 assert.doesNotMatch(JSON.stringify(faq),/(48|72)\s*(h\b|heures)|18h30|22h00/);
}
function visit(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?visit(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const file of visit('src').filter(f=>/\.(tsx?|json)$/.test(f)&&!f.includes(path.join('data','mock')))){
 const text=fs.readFileSync(file,'utf8');
 assert.doesNotMatch(text,/(?:matur(?:ation|ée?)|fermentation)[^\n]{0,100}(?:48|72)\s*(?:heures|h\b)|tout est fait maison|producteurs exclusivement locaux|18h30|22h00/i,file);
}
// Verify that failure of either catalogue source is contained, without accepting mock commerce in production.
const previousNodeEnv=process.env.NODE_ENV;
process.env.NODE_ENV='production';
const { withFallback }=loadTsModule(path.resolve('src/data/repository.ts'),{
 './firebase-repository':{FirebaseRepository:class{}},
 '@/data/mock':{categories:[],products:[],heroSlides:[],offers:[]},
});
let mockInvoked=false;
const value=await withFallback(async()=>{throw new Error('isolated catalogue failure');},async()=>{mockInvoked=true;return ['development fallback'];});
assert.deepEqual(value,[]);
assert.equal(mockInvoked,false,'a production catalogue outage must never expose mock products');
if(previousNodeEnv===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previousNodeEnv;
console.log('ok - winter hours, structured data, all local FAQ and editorial regression');
