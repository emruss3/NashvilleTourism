'use client';

import { useEffect, useRef, useState } from 'react';
import { MAP_LANDMARKS } from '@/lib/content/map-landmarks';

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
  /** Photo shown at the top of the popup. Provider thumbnails are display-only. */
  image?: string;
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

/**
 * Two looks, both in the site palette, from either of two keyless tile
 * providers:
 *  - `paper` (default): light grey basemap tinted toward cream, ink price pins.
 *  - `ink`: dark basemap pulled to neutral black, paper price pins.
 *  - provider `esri` (default): Esri "Canvas" light/dark grey with a
 *    separate label layer; clean and quiet, max zoom 16.
 *  - provider `carto`: CARTO Positron / Dark Matter over OpenStreetMap data.
 * Switch with the `variant` and `provider` props; nothing else changes.
 */
export type MapVariant = 'ink' | 'paper';
export type MapProvider = 'esri' | 'carto';

const TILES: Record<MapProvider, Record<MapVariant, { base: string; labels?: string; subdomains?: string; maxZoom: number; attribution: string }>> = {
  esri: {
    paper: {
      base: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      labels: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      maxZoom: 16,
      attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS user community',
    },
    ink: {
      base: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      labels: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      maxZoom: 16,
      attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS user community',
    },
  },
  carto: {
    paper: { base: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', subdomains: 'abcd', maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' },
    ink: { base: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', subdomains: 'abcd', maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' },
  },
};

export default function HotelResultsMap({
  points,
  center,
  title = 'Map of these stays',
  variant = 'paper',
  provider = 'esri',
}: {
  points: MapPoint[];
  center?: { lat: number; lng: number };
  title?: string;
  variant?: MapVariant;
  provider?: MapProvider;
}) {
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
        const tiles = TILES[provider][variant];
        L.tileLayer(tiles.base, { subdomains: tiles.subdomains ?? 'abc', maxZoom: tiles.maxZoom, attribution: tiles.attribution }).addTo(map);
        // Labels ride above the tinted base so they stay crisp.
        if (tiles.labels) L.tileLayer(tiles.labels, { maxZoom: tiles.maxZoom, pane: 'shadowPane', attribution: '' }).addTo(map);
        const bounds = L.latLngBounds([]);
        for (const p of [...points].sort((a, b) => Number(Boolean(a.pinned)) - Number(Boolean(b.pinned)))) {
          // The nightly rate is the pin. Picks are the solid pin, the rest the outlined one, in whichever palette the basemap needs.
          const pinStyle =
            variant === 'ink'
              ? p.pinned
                ? 'background:#FCFBF8;color:#111111;border:1.5px solid #111111'
                : 'background:#111111;color:#FCFBF8;border:1.5px solid #FCFBF8'
              : p.pinned
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
          const linkLabel = p.hrefLabel ?? (p.pinLabel ? `See rooms from ${p.pinLabel}` : 'Check rates');
          const html = `<div style="font: 14px/1.4 Inter, system-ui, sans-serif; color: #111111; width: 240px">
            ${p.image ? `<div style="aspect-ratio:3/2;width:100%;overflow:hidden;background:#EDE2CF;margin-bottom:8px"><img src="${escapeHtml(p.image)}" alt="" referrerpolicy="no-referrer" loading="lazy" style="display:block;width:100%;height:100%;object-fit:cover"></div>` : ''}
            <strong>${escapeHtml(p.name)}</strong>${p.pinned ? ' <span style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#5E5E5E">Our pick</span>' : ''}
            ${p.priceLabel ? `<div>${escapeHtml(p.priceLabel)}</div>` : ''}
            ${p.href ? `<a href="${escapeHtml(p.href)}" ${p.href.startsWith('http') ? 'target="_blank" rel="noopener noreferrer sponsored"' : ''} style="display:inline-block;margin-top:6px;color:#111111;font-weight:600;text-decoration:underline">${escapeHtml(linkLabel)}</a>` : ''}
          </div>`;
          marker.bindPopup(html, { closeButton: true, minWidth: 240, maxWidth: 260 });
          marker.bindTooltip(escapeHtml(p.name), { direction: 'top', offset: [0, -14] });
          bounds.extend([p.lat, p.lng]);
        }
        if (center) bounds.extend([center.lat, center.lng]);
        map.fitBounds(bounds.pad(0.15), { maxZoom: Math.min(15, tiles.maxZoom) });

        // Landmarks: Broadway, the arena, the stadium, Vanderbilt and the
        // rest, so a visitor can read a stay against the places they came
        // for. Major ones always; district-level ones from zoom 14. They sit
        // under the price pins and never widen the view.
        const landmarkColor = variant === 'ink' ? '#FCFBF8' : '#111111';
        const landmarkBg = variant === 'ink' ? 'rgba(17,17,17,.85)' : 'rgba(252,251,248,.9)';
        const landmarks = MAP_LANDMARKS.map((l) => {
          const icon = L.divIcon({
            className: 'nsvl-landmark',
            html: `<span style="display:inline-flex;align-items:center;gap:5px;white-space:nowrap;font:600 11px/1.2 Inter,system-ui,sans-serif;letter-spacing:.04em;color:${landmarkColor}"><span style="display:inline-block;width:8px;height:8px;transform:rotate(45deg);background:${landmarkColor};flex:none"></span><span style="background:${landmarkBg};padding:1px 4px;border-radius:2px">${escapeHtml(l.name)}</span></span>`,
            iconSize: null,
            iconAnchor: [4, 6],
          });
          return { weight: l.weight, marker: L.marker([l.lat, l.lng], { icon, interactive: false, zIndexOffset: -500, keyboard: false }) };
        });
        const syncLandmarks = () => {
          const zoom = map.getZoom();
          for (const { weight, marker } of landmarks) {
            const show = weight === 1 || zoom >= 14;
            if (show && !map.hasLayer(marker)) marker.addTo(map);
            if (!show && map.hasLayer(marker)) map.removeLayer(marker);
          }
        };
        syncLandmarks();
        map.on('zoomend', syncLandmarks);
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('failed');
      });
    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [points, center, variant, provider]);

  if (!points.length) return null;

  return (
    <figure className={`overflow-hidden rounded-card border border-paper-edge ${variant === 'ink' ? 'bg-ink' : 'bg-paper-sunk'}`}>
      <div ref={host} role="region" aria-label={title} data-variant={variant} className="h-[320px] w-full sm:h-[380px]" />
      <figcaption className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-2xs ${variant === 'ink' ? 'bg-paper text-ink-soft' : 'text-ink-soft'}`}>
        <span>
          Each pin is the nightly rate; the diamonds are landmarks.
          <span aria-hidden="true" className={`ml-2 mr-1 inline-block rounded-full px-1.5 py-0.5 align-middle text-[11px] font-semibold ${variant === 'ink' ? 'border border-ink bg-paper text-ink' : 'bg-ink text-paper'}`}>$</span>
          Our picks
          <span aria-hidden="true" className={`ml-3 mr-1 inline-block rounded-full px-1.5 py-0.5 align-middle text-[11px] font-semibold ${variant === 'ink' ? 'bg-ink text-paper ring-1 ring-paper-edge' : 'border border-ink bg-paper text-ink'}`}>$</span>
          Other places. Tap a pin for the name and link.
        </span>
        {state === 'failed' ? <span>The map could not load; the list below has every stay.</span> : null}
      </figcaption>
    </figure>
  );
}
