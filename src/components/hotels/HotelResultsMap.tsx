'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Map of the stays on /hotels/: our picks and the live marketplace results,
 * one price pin each. Leaflet loads in the browser on demand from a CDN and
 * the basemap is CARTO Positron over OpenStreetMap data (no npm dependency,
 * no key, attribution shown). If they cannot load, the block says so instead
 * of leaving a blank box. Leaflet's own chrome is restyled to the NSVL
 * palette in globals.css.
 */
export interface MapPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** "From $312 a night" */
  priceLabel?: string;
  /** "$312", drawn on the pin itself. */
  pinLabel?: string;
  href?: string;
  hrefLabel?: string;
  /** Editorial pick: drawn larger and darker, listed first. */
  pinned?: boolean;
}

const LEAFLET_JS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
const LEAFLET_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';

declare global {
  interface Window {
    L?: any;
  }
}

let leafletPromise: Promise<any> | null = null;

function loadLeaflet(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => (window.L ? resolve(window.L) : reject(new Error('Leaflet missing after load')));
    script.onerror = () => reject(new Error('Leaflet failed to load'));
    document.head.appendChild(script);
  });
  return leafletPromise;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

export default function HotelResultsMap({ points, center, title = 'Map of these stays' }: { points: MapPoint[]; center?: { lat: number; lng: number }; title?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'idle' | 'ready' | 'failed'>('idle');

  useEffect(() => {
    if (!host.current || !points.length) return;
    let map: any;
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !host.current) return;
        map = L.map(host.current, { scrollWheelZoom: false, attributionControl: true });
        // CARTO Positron: a near-monochrome basemap that sits with the black and
        // cream palette; the tile pane is tinted toward paper in globals.css.
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          subdomains: 'abcd',
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }).addTo(map);
        const bounds = L.latLngBounds([]);
        for (const p of [...points].sort((a, b) => Number(Boolean(a.pinned)) - Number(Boolean(b.pinned)))) {
          // The nightly rate is the pin. Picks are ink on paper-white text; the rest are paper with an ink border.
          const pinStyle = p.pinned
            ? 'background:#111111;color:#FCFBF8;border:1.5px solid #FCFBF8'
            : 'background:#FCFBF8;color:#111111;border:1.5px solid #111111';
          const text = escapeHtml(p.pinLabel ?? '');
          const icon = L.divIcon({
            className: 'nsvl-price-pin',
            html: `<span style="display:inline-block;white-space:nowrap;padding:3px 8px;border-radius:999px;font:600 13px/1.2 Inter,system-ui,sans-serif;box-shadow:0 1px 2px rgba(0,0,0,.25);${pinStyle}">${text || '•'}</span>`,
            iconSize: null,
            iconAnchor: [0, 12],
          });
          const marker = L.marker([p.lat, p.lng], { icon, zIndexOffset: p.pinned ? 1000 : 0, riseOnHover: true }).addTo(map);
          const html = `<div style="font: 14px/1.4 Inter, system-ui, sans-serif; color: #111111; max-width: 220px">
            <strong>${escapeHtml(p.name)}</strong>${p.pinned ? ' <span style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#5E5E5E">Our pick</span>' : ''}
            ${p.priceLabel ? `<div>${escapeHtml(p.priceLabel)}</div>` : ''}
            ${p.href ? `<a href="${escapeHtml(p.href)}" ${p.href.startsWith('http') ? 'target="_blank" rel="noopener noreferrer sponsored"' : ''} style="color:#111111;font-weight:600;text-decoration:underline">${escapeHtml(p.hrefLabel ?? 'Check rates')}</a>` : ''}
          </div>`;
          marker.bindPopup(html, { closeButton: true });
          marker.bindTooltip(escapeHtml(p.name), { direction: 'top', offset: [0, -14] });
          bounds.extend([p.lat, p.lng]);
        }
        if (center) bounds.extend([center.lat, center.lng]);
        map.fitBounds(bounds.pad(0.15), { maxZoom: 15 });
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('failed');
      });
    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [points, center]);

  if (!points.length) return null;

  return (
    <figure className="overflow-hidden rounded-card border border-paper-edge bg-paper-sunk">
      <div ref={host} role="region" aria-label={title} className="h-[320px] w-full sm:h-[380px]" />
      <figcaption className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-2xs text-ink-soft">
        <span>
          Each pin is the nightly rate.
          <span aria-hidden="true" className="ml-2 mr-1 inline-block rounded-full bg-ink px-1.5 py-0.5 align-middle text-[11px] font-semibold text-paper">$</span>
          Our picks
          <span aria-hidden="true" className="ml-3 mr-1 inline-block rounded-full border border-ink px-1.5 py-0.5 align-middle text-[11px] font-semibold text-ink">$</span>
          Other places. Tap a pin for the name and link.
        </span>
        {state === 'failed' ? <span>The map could not load; the list below has every stay.</span> : null}
      </figcaption>
    </figure>
  );
}
