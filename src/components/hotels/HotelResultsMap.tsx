'use client';

import { useEffect, useRef, useState } from 'react';
import { MAP_LANDMARKS, type LandmarkKind } from '@/lib/content/map-landmarks';

/**
 * Map of the stays on /hotels/: our picks and the live marketplace results as
 * price pins, over a landmark layer (shaded districts plus glyph markers for
 * venues, arenas, campuses, parks and the airport). Pins that would overlap
 * at the current zoom merge into a count bubble that zooms in when tapped,
 * so downtown never becomes a pile of prices.
 *
 * Leaflet loads in the browser on demand from a CDN; the basemap is a
 * keyless tile service with attribution shown. If they cannot load, the
 * block says so instead of leaving a blank box. Leaflet's own chrome is
 * restyled to the NSVL palette in globals.css.
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
  /** Editorial pick: solid pin, listed first. */
  pinned?: boolean;
}

export type MapVariant = 'ink' | 'paper';
export type MapProvider = 'esri' | 'carto';

const LEAFLET_JS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
const LEAFLET_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';

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

/** 12px glyphs, drawn in currentColor. */
const GLYPHS: Record<Exclude<LandmarkKind, 'district'>, string> = {
  music: '<path d="M9 2v6.5a2 2 0 1 1-1.2-1.83V4.2L4.5 5v4.5A2 2 0 1 1 3.3 7.7V3.6L9 2z"/>',
  arena: '<path d="M2 5.5h8v1.2H2zM2.6 6.7h6.8L8.6 10H3.4zM3 2.8h6l.6 2.2H2.4z"/>',
  stadium: '<path d="M6 2.5c2.8 0 4.5 1 4.5 2.2S8.8 6.9 6 6.9 1.5 5.9 1.5 4.7 3.2 2.5 6 2.5zm-4.5 3.5c.9 1 2.5 1.6 4.5 1.6s3.6-.6 4.5-1.6v1.6c0 1.2-1.7 2.2-4.5 2.2S1.5 8.8 1.5 7.6z"/>',
  park: '<path d="M6 1.5 8.8 6H7.5l2 3H6.6v1.8H5.4V9H2.5l2-3H3.2z"/>',
  university: '<path d="M6 2 11 4.5 6 7 1 4.5zM3 6.2l3 1.5 3-1.5v2.3c0 .9-1.4 1.6-3 1.6S3 9.4 3 8.5z"/>',
  airport: '<path d="M10.8 6.2 7.2 5.1 5.1 1.3H4l1 3.5-2.4-.6-.9-1.2H1l.7 2.2-.7 2.2h.7l.9-1.2 2.4-.6-1 3.5h1.1l2.1-3.8 3.6-1.1z"/>',
  museum: '<path d="M6 1.8 10.5 4v.8h-9V4zM2.5 5.4h1.2v3.4H2.5zm2.6 0h1.2v3.4H5.1zm2.7 0H9v3.4H7.8zM1.5 9.4h9v1.2h-9z"/>',
  civic: '<path d="M2 3h8v1.3H2zm.7 1.8h6.6v4.4H2.7zm.9.9v2.6h1.3V5.7zm2.2 0v2.6h1.3V5.7zM2 9.7h8V11H2z"/>',
};

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

function popupHtml(p: MapPoint): string {
  const linkLabel = p.hrefLabel ?? (p.pinLabel ? `See rooms from ${p.pinLabel}` : 'Check rates');
  return `<div style="font: 14px/1.4 Inter, system-ui, sans-serif; color: #111111; width: 240px">
    ${p.image ? `<div style="aspect-ratio:3/2;width:100%;overflow:hidden;background:#EDE2CF;margin-bottom:8px"><img src="${escapeHtml(p.image)}" alt="" referrerpolicy="no-referrer" loading="lazy" style="display:block;width:100%;height:100%;object-fit:cover"></div>` : ''}
    <strong>${escapeHtml(p.name)}</strong>${p.pinned ? ' <span style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#5E5E5E">Our pick</span>' : ''}
    ${p.priceLabel ? `<div>${escapeHtml(p.priceLabel)}</div>` : ''}
    ${p.href ? `<a href="${escapeHtml(p.href)}" ${p.href.startsWith('http') ? 'target="_blank" rel="noopener noreferrer sponsored"' : ''} style="display:inline-block;margin-top:6px;color:#111111;font-weight:600;text-decoration:underline">${escapeHtml(linkLabel)}</a>` : ''}
  </div>`;
}

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
    const ink = variant === 'ink';
    const fg = ink ? '#FCFBF8' : '#111111';
    const bg = ink ? '#111111' : '#FCFBF8';

    loadLeaflet()
      .then((L) => {
        if (cancelled || !host.current) return;
        map = L.map(host.current, { scrollWheelZoom: false, attributionControl: true });
        const tiles = TILES[provider][variant];
        L.tileLayer(tiles.base, { subdomains: tiles.subdomains ?? 'abc', maxZoom: tiles.maxZoom, attribution: tiles.attribution }).addTo(map);
        if (tiles.labels) L.tileLayer(tiles.labels, { maxZoom: tiles.maxZoom, pane: 'shadowPane', attribution: '' }).addTo(map);
        map.createPane('districts').style.zIndex = '350';

        // --- Landmarks -------------------------------------------------------
        const landmarkLayers = MAP_LANDMARKS.map((l) => {
          if (l.kind === 'district') {
            const area = L.circle([l.lat, l.lng], {
              pane: 'districts',
              radius: l.radiusM ?? 350,
              color: fg,
              weight: 1,
              dashArray: '3 4',
              opacity: 0.55,
              fillColor: fg,
              fillOpacity: ink ? 0.08 : 0.05,
              interactive: false,
            });
            const label = L.marker([l.lat, l.lng], {
              icon: L.divIcon({
                className: 'nsvl-landmark',
                html: `<span style="display:inline-block;transform:translate(-50%,-50%);white-space:nowrap;font:700 11px/1 Manrope,Inter,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:${fg};text-shadow:0 0 4px ${bg},0 0 4px ${bg},0 0 6px ${bg}">${escapeHtml(l.name)}</span>`,
                iconSize: [0, 0],
              }),
              interactive: false,
              keyboard: false,
              zIndexOffset: -900,
            });
            return { weight: l.weight, layer: L.layerGroup([area, label]) };
          }
          const glyph = GLYPHS[l.kind];
          const marker = L.marker([l.lat, l.lng], {
            icon: L.divIcon({
              className: 'nsvl-landmark',
              html: `<span style="display:inline-flex;align-items:center;gap:6px;white-space:nowrap;transform:translate(-11px,-11px)">
                <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:${fg};color:${bg};box-shadow:0 0 0 2px ${bg};flex:none"><svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">${glyph}</svg></span>
                <span style="font:600 11px/1.2 Inter,system-ui,sans-serif;letter-spacing:.02em;color:${fg};background:${bg};border:1px solid ${fg};padding:2px 6px;border-radius:2px">${escapeHtml(l.name)}</span>
              </span>`,
              iconSize: [0, 0],
            }),
            interactive: false,
            keyboard: false,
            zIndexOffset: -600,
          });
          return { weight: l.weight, layer: marker };
        });
        const syncLandmarks = () => {
          const zoom = map.getZoom();
          for (const { weight, layer } of landmarkLayers) {
            const show = weight === 1 || zoom >= 14;
            if (show && !map.hasLayer(layer)) layer.addTo(map);
            if (!show && map.hasLayer(layer)) map.removeLayer(layer);
          }
        };

        // --- Price pins with overlap merging ----------------------------------
        const pinGroup = L.layerGroup().addTo(map);
        const pinStyle = (pinned: boolean) => (pinned ? `background:${fg};color:${bg};border:1.5px solid ${bg}` : `background:${bg};color:${fg};border:1.5px solid ${fg}`);
        const cellPx = 46;
        const renderPins = () => {
          pinGroup.clearLayers();
          const zoom = map.getZoom();
          const cells = new Map<string, MapPoint[]>();
          for (const p of points) {
            const px = map.project([p.lat, p.lng], zoom);
            const key = `${Math.floor(px.x / cellPx)}:${Math.floor(px.y / cellPx)}`;
            const cell = cells.get(key) ?? [];
            cell.push(p);
            cells.set(key, cell);
          }
          for (const members of cells.values()) {
            if (members.length === 1 || zoom >= tiles.maxZoom) {
              for (const p of members) {
                const icon = L.divIcon({
                  className: 'nsvl-price-pin',
                  html: `<span style="display:inline-block;transform:translate(-50%,-100%);white-space:nowrap;padding:3px 8px;border-radius:999px;font:600 13px/1.2 Inter,system-ui,sans-serif;box-shadow:0 1px 2px rgba(0,0,0,.25);${pinStyle(Boolean(p.pinned))}">${escapeHtml(p.pinLabel ?? '•')}</span>`,
                  iconSize: [0, 0],
                });
                const marker = L.marker([p.lat, p.lng], { icon, zIndexOffset: p.pinned ? 1000 : 0, riseOnHover: true });
                marker.bindPopup(popupHtml(p), { closeButton: true, minWidth: 240, maxWidth: 260 });
                marker.bindTooltip(escapeHtml(p.name), { direction: 'top', offset: [0, -30] });
                pinGroup.addLayer(marker);
              }
              continue;
            }
            const lat = members.reduce((s, p) => s + p.lat, 0) / members.length;
            const lng = members.reduce((s, p) => s + p.lng, 0) / members.length;
            const hasPick = members.some((p) => p.pinned);
            const prices = members.map((p) => Number((p.pinLabel ?? '').replace(/[^0-9.]/g, ''))).filter((n) => Number.isFinite(n) && n > 0);
            const from = prices.length ? `from $${Math.round(Math.min(...prices))}` : '';
            const icon = L.divIcon({
              className: 'nsvl-price-pin',
              html: `<span style="display:inline-flex;align-items:center;gap:6px;transform:translate(-50%,-50%);white-space:nowrap;padding:4px 10px 4px 6px;border-radius:999px;font:600 13px/1.2 Inter,system-ui,sans-serif;box-shadow:0 1px 2px rgba(0,0,0,.25);${pinStyle(hasPick)}"><span style="display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 5px;border-radius:999px;background:${hasPick ? bg : fg};color:${hasPick ? fg : bg};font-weight:700">${members.length}</span>${from}</span>`,
              iconSize: [0, 0],
            });
            const cluster = L.marker([lat, lng], { icon, zIndexOffset: hasPick ? 900 : 100 });
            cluster.bindTooltip(`${members.length} stays here. Tap to zoom in.`, { direction: 'top', offset: [0, -18] });
            cluster.on('click', () => {
              const b = L.latLngBounds(members.map((p) => [p.lat, p.lng]));
              map.fitBounds(b.pad(0.4), { maxZoom: tiles.maxZoom });
            });
            pinGroup.addLayer(cluster);
          }
        };

        const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
        if (center) bounds.extend([center.lat, center.lng]);
        map.fitBounds(bounds.pad(0.15), { maxZoom: Math.min(15, tiles.maxZoom) });
        syncLandmarks();
        renderPins();
        map.on('zoomend', () => {
          syncLandmarks();
          renderPins();
        });
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
  const ink = variant === 'ink';

  return (
    <figure className={`overflow-hidden rounded-card border border-paper-edge ${ink ? 'bg-ink' : 'bg-paper-sunk'}`}>
      <div ref={host} role="region" aria-label={title} data-variant={variant} className="h-[360px] w-full sm:h-[440px]" />
      <figcaption className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-2xs text-ink-soft ${ink ? 'bg-paper' : ''}`}>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>
            <span aria-hidden="true" className={`mr-1 inline-block rounded-full px-1.5 py-0.5 align-middle text-[11px] font-semibold ${ink ? 'border border-ink bg-paper text-ink' : 'bg-ink text-paper'}`}>$</span>
            Our picks
          </span>
          <span>
            <span aria-hidden="true" className={`mr-1 inline-block rounded-full px-1.5 py-0.5 align-middle text-[11px] font-semibold ${ink ? 'bg-ink text-paper ring-1 ring-paper-edge' : 'border border-ink bg-paper text-ink'}`}>$</span>
            Other stays
          </span>
          <span>
            <span aria-hidden="true" className="mr-1 inline-block rounded-full bg-ink px-1.5 py-0.5 align-middle text-[11px] font-semibold text-paper">3</span>
            Several stays; tap to zoom in
          </span>
          <span>Shaded areas are districts; round icons are venues, arenas, campuses and parks.</span>
        </span>
        {state === 'failed' ? <span>The map could not load; the list below has every stay.</span> : null}
      </figcaption>
    </figure>
  );
}
