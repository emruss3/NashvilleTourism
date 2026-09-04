import fs from 'node:fs/promises';

const targets = [
  {name:'Memoir Wedgewood Houston branded',url:'https://www.memoir-wedgewoodhouston.com/scheduletour'},
  {name:'Memoir May Hosiery branded',url:'https://www.memoir-mayhosiery.com/scheduletour'},
  {name:'Memoir Wedgewood Houston RentCafe',url:'https://www.rentcafe.com/apartments/tn/nashville/memoir-wedgewood-houston/default.aspx'},
  {name:'Memoir May Hosiery RentCafe',url:'https://www.rentcafe.com/apartments/tn/nashville/memoir-may-hosiery/default.aspx'}
];
const fn = `({ page }) => page.evaluate(() => ({
  url: location.href,
  title: document.title,
  text: (document.body?.innerText || '').slice(0, 100000),
  html: (document.documentElement?.outerHTML || '').slice(0, 300000),
  iframes: Array.from(document.querySelectorAll('iframe')).map(f => ({src:f.src,title:f.title,name:f.name})),
  scripts: Array.from(document.scripts).map(s=>s.src).filter(Boolean).slice(0,500),
  resources: performance.getEntriesByType('resource').map(r=>r.name).filter(u=>/tour|schedul|appoint|availab|calendar|time|rentcafe|securecafe|yardi|guestcard/i.test(u)).slice(0,500)
}))`;
const results=[];
for(const target of targets){
  for (const mode of ['function','data']) {
    const api=new URL('https://api.microlink.io/');
    api.searchParams.set('url',target.url);
    if (mode === 'function') {
      api.searchParams.set('function',fn);
    } else {
      api.searchParams.set('data.body.selector','body');
      api.searchParams.set('data.body.type','html');
      api.searchParams.set('data.text.selector','body');
      api.searchParams.set('data.text.type','text');
    }
    const response=await fetch(api,{headers:{accept:'application/json'}});
    const body=await response.text();
    console.log(target.name,mode,response.status,body.slice(0,260).replace(/\s+/g,' '));
    results.push({target,mode,status:response.status,contentType:response.headers.get('content-type'),apiUrl:api.toString(),body});
  }
}
await fs.mkdir('tour-audit-memoir-microlink-output',{recursive:true});
await fs.writeFile('tour-audit-memoir-microlink-output/memoir-microlink.json',JSON.stringify({generatedAt:new Date().toISOString(),results},null,2));
