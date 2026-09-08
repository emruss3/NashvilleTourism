import fs from 'node:fs/promises';

const targets = [
  { name: 'Emblem Park', url: 'https://integrations.nestio.com/contact-widget/v1/iframe-widget.html?type=lead_capture_appointment&key=03f5fe3982bf41a380739512238020a1&group=10676&color=00414B' },
  { name: 'Westerly House', url: 'https://integrations.nestio.com/contact-widget/v1/iframe-widget.html?type=lead_capture_appointment&key=03f5fe3982bf41a380739512238020a1&group=8221&color=736b74' },
  { name: 'Queens Wedgewood Houston', url: 'https://integrations.nestio.com/contact-widget/v1/iframe-widget.html?type=lead_capture_appointment&key=03f5fe3982bf41a380739512238020a1&group=6311&color=385440' },
];

await fs.mkdir('nestio-direct-output', { recursive: true });
const output = [];
for (const target of targets) {
  const parsed = new URL(target.url);
  const group = parsed.searchParams.get('group');
  const widgetKey = parsed.searchParams.get('key');
  const auth = `Basic ${Buffer.from(`${widgetKey}:undefined`).toString('base64')}`;
  const record = { name: target.name, group, responses: {} };
  for (const tourType of ['guided', 'video', 'self-guided']) {
    const url = `https://nestiolistings.com/api/v2/appointments/group/${group}/available-times?from_date=2026-09-08&tour_type=${encodeURIComponent(tourType)}`;
    const response = await fetch(url, { headers: { Authorization: auth, Accept: 'application/json' } });
    const text = await response.text();
    let body = text;
    try { body = JSON.parse(text); } catch {}
    record.responses[tourType] = { status: response.status, url, body };
  }
  output.push(record);
}
await fs.writeFile('nestio-direct-output/results.json', JSON.stringify(output, null, 2));
console.log(JSON.stringify(output, null, 2));
