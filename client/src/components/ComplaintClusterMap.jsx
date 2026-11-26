import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [16.5062, 80.648];
const DEFAULT_ZOOM = 9;

function getStatusColor(status) {
  switch ((status || '').toLowerCase()) {
    case 'submitted':
      return '#f9b84a';
    case 'verified':
    case 'assigned':
      return '#38bdf8';
    case 'in progress':
      return '#a855f7';
    case 'resolved':
      return '#4ade80';
    case 'rejected':
      return '#ff6b6b';
    default:
      return '#7DFF6A';
  }
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function ComplaintClusterMap({
  markers = [],
  isAdmin = false,
  onTileError,
  onMarkerAction,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerGroupRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    });

    tiles.on('tileerror', () => {
      if (onTileError) onTileError(true);
    });

    tiles.addTo(map);
    const layerGroup = L.layerGroup().addTo(map);

    mapRef.current = map;
    layerGroupRef.current = layerGroup;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    const boundsPoints = [];

    for (const item of markers) {
      const lat = isAdmin ? item.latitude : item.approx_latitude;
      const lng = isAdmin ? item.longitude : item.approx_longitude;
      if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
        continue;
      }

      const latNum = Number(lat);
      const lngNum = Number(lng);
      boundsPoints.push([latNum, lngNum]);

      const color = getStatusColor(item.status);
      const icon = L.divIcon({
        className: 'gramsetu-marker-dot',
        html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid #060d08;box-shadow:0 0 8px ${color};"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const marker = L.marker([latNum, lngNum], { icon });
      const popupHtml = isAdmin
        ? `
          <div style="min-width:190px;color:#0f172a;font-family:Inter,sans-serif;">
            <strong>${escapeHtml(item.complaint_id)}</strong><br/>
            <span>${escapeHtml(item.title)}</span><br/>
            <small>Village: ${escapeHtml(item.village)} | Status: <b>${escapeHtml(item.status)}</b></small><br/>
            <small>Category: ${escapeHtml(item.category)} | Votes: ${Number(item.vote_count || 0)}</small><br/>
            <small>Pin: ${escapeHtml(item.location_source || 'pinned')}</small>
          </div>
        `
        : `
          <div style="min-width:190px;color:#0f172a;font-family:Inter,sans-serif;">
            <strong>${escapeHtml(item.complaint_id)}</strong><br/>
            <span>${escapeHtml(item.title)}</span><br/>
            <small>Village: ${escapeHtml(item.village)} | Status: <b>${escapeHtml(item.status)}</b></small><br/>
            <small>Category: ${escapeHtml(item.category)} | Support votes: ${Number(item.vote_count || 0)}</small><br/>
            <em style="color:#475569;">Approximate area shown for citizen privacy</em>
          </div>
        `;

      marker.bindPopup(popupHtml);
      if (onMarkerAction) {
        marker.on('click', () => onMarkerAction(item));
      }
      marker.addTo(layerGroup);
    }

    if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0], 14);
    } else if (boundsPoints.length > 1) {
      map.fitBounds(boundsPoints, { padding: [36, 36], maxZoom: 15 });
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  }, [markers, isAdmin]);

  return <div ref={containerRef} className="gs-map-viewport" />;
}

