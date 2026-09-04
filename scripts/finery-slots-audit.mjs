import fs from 'node:fs/promises';

const output = 'tour-audit-finery-output';
await fs.mkdir(output, { recursive: true });
const scheduleId = '1769511060134303458';
const tplId = '1587156259900772678';
const dates = ['2026/09/4','2026/09/5','2026/09/6','2026/09/7','2026/09/8','2026/09/9','2026/09/10'];
const result = {generatedAt:new Date().toISOString(),scheduleId,tplId,appointmentType:'in_person',dates:[]};
for (const date of dates) {
  const rec = {date};
  for (const endpoint of ['disabled_dates','time_select']) {
    const url = new URL(`https://my.hy.ly/tours/schedules/${scheduleId}/${endpoint}`);
    url.searchParams.set('tpl_id',tplId);
    url.searchParams.set('date',date);
    url.searchParams.set('appointment_type','in_person');
    const response = await fetch(url,{headers:{accept:'text/javascript,*/*;q=0.1','x-requested-with':'XMLHttpRequest',referer:`https://my.hy.ly/tours/schedules/${scheduleId}?dd=0&frame=1&popup=1&site=1&type=in_person`}});
    const body = await response.text();
    rec[endpoint] = {status:response.status,contentType:response.headers.get('content-type'),url:url.toString(),body};
    console.log(date,endpoint,response.status,body.slice(0,240).replace(/\s+/g,' '));
  }
  result.dates.push(rec);
}
await fs.writeFile(`${output}/finery.json`,JSON.stringify(result,null,2));
console.log('FINERY_API_COMPLETE');
