'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Map of the stays on /hotels/: our picks and the live marketplace results,
 * one dot each, with the nightly price in the popup. Leaflet and the
 * OpenStreetMap tiles load in the browser on demand from a CDN (no npm
 * dependency, no key). If they cannot load, the block says so instead of
 * leaving a blank box.
 */
export interface MapPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** "From $312 a night" */
  priceLabel?: string;
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
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);
        const bounds = L.latLngBounds([]);
        for (const p of [...points].sort((a, b) => Number(Boolean(a.pinned)) - Number(Boolean(b.pinned)))) {
          const marker = L.circleMarker([p.lat, p.lng], {
            radius: p.pinned ? 9 : 6,
            color: '#FCFBF8',
            weight: 1.5,
            fillColor: p.pinned ? '#111111' : '#5E5E5E',
            fillOpacity: p.pinned ? 1 : 0.85,
          }).addTo(map);
          const html = `<div style="font: 14px/1.4 Inter, system-ui, sans-serif; color: #111111; max-width: 220px">
            <strong>${escapeHtml(p.name)}</strong>${p.pinned ? ' <span style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#5E5E5E">Our pick</span>' : ''}
            ${p.priceLabel ? `<div>${escapeHtml(p.priceLabel)}</div>` : ''}
            ${p.href ? `<a href="${escapeHtml(p.href)}" ${p.href.startsWith('http') ? 'target="_blank" rel="noopener noreferrer sponsored"' : ''} style="color:#111111;font-weight:600;text-decoration:underline">${escapeHtml(p.hrefLabel ?? 'Check rates')}</a>` : ''}
          </div>`;
          marker.bindPopup(html, { closeButton: true });
          marker.bindTooltip(escapeHtml(p.name), { direction: 'top', offset: [0, -8] });
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
          <span aria-hidden="true" className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-ink align-middle" />
          Our picks
          <span aria-hidden="true" className="ml-3 mr-1 inline-block h-2 w-2 rounded-full bg-ink-soft align-middle" />
          Other places with live rates. Tap a dot for the price.
        </span>
        {state === 'failed' ? <span>The map could not load; the list below has every stay.</span> : null}
      </figcaption>
    </figure>
  );
}
