import fs from 'node:fs/promises';

const targets = [
  {name:'Memoir Wedgewood Houston branded',url:'https://www.memoir-wedgewoodhouston.com/scheduletour'},
  {name:'Memoir May Hosiery branded',url:'https://www.memoir-mayhosiery.com/scheduletour'},
  {name:'Memoir Wedgewood Houston RentCafe',url:'https://www.rentcafe.com/apartments/tn/nashville/memoir-wedgewood-houston/default.aspx'},
  {name:'Memoir May Hosiery RentCafe',url:'https://www.rentcafe.com/apartments/tn/nashville/memoir-may-hosiery/default.aspx'}
];
const fn = `async ({ page }) => {
  await page.waitForTimeout(12000);
  return await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    text: (document.body?.innerText || '').slice(0, 80000),
    html: (document.documentElement?.outerHTML || '').slice(0, 250000),
    iframes: Array.from(document.querySelectorAll('iframe')).map(f => ({src:f.src,title:f.title,name:f.name})),
    resources: performance.getEntriesByType('resource').map(r=>r.name).filter(u=>/tour|schedul|appoint|availab|calendar|time|rentcafe|securecafe|yardi|guestcard/i.test(u)).slice(0,500)
  }));
}`;
const results=[];
for(const target of targets){
  const api=new URL('https://api.microlink.io/');
  api.searchParams.set('url',target.url);
  api.searchParams.set('function',fn);
  const response=await fetch(api,{headers:{accept:'application/json'}});
  const body=await response.text();
  console.log(target.name,response.status,body.slice(0,240).replace(/\s+/g,' '));
  results.push({target,status:response.status,contentType:response.headers.get('content-type'),apiUrl:api.toString(),body});
}
await fs.mkdir('tour-audit-memoir-microlink-output',{recursive:true});
await fs.writeFile('tour-audit-memoir-microlink-output/memoir-microlink.json',JSON.stringify({generatedAt:new Date().toISOString(),results},null,2));
