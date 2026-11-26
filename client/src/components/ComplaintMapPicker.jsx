import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [16.5062, 80.648]; // Andhra Pradesh region default center
const DEFAULT_ZOOM = 9;
const PIN_ZOOM = 15;

function createPinIcon() {
  return L.divIcon({
    className: 'gramsetu-map-pin',
    html: '<div style="width:22px;height:22px;border-radius:50%;background:#4ade80;border:3px solid #060d08;box-shadow:0 0 12px rgba(74,222,128,0.85);"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export default function ComplaintMapPicker({
  latitude,
  longitude,
  locationSource,
  onChange,
}) {
  const [mapOpen, setMapOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [tileError, setTileError] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const hasCoords = latitude !== null && longitude !== null && latitude !== '' && longitude !== '';
  const parsedLat = hasCoords ? Number(latitude) : null;
  const parsedLng = hasCoords ? Number(longitude) : null;

  useEffect(() => {
    if (!mapOpen || !mapContainerRef.current || mapInstanceRef.current) {
      return undefined;
    }

    const initialCenter =
      parsedLat !== null && parsedLng !== null ? [parsedLat, parsedLng] : DEFAULT_CENTER;
    const initialZoom = parsedLat !== null && parsedLng !== null ? PIN_ZOOM : DEFAULT_ZOOM;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
    });

    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    });

    tileLayer.on('tileerror', () => {
      setTileError(true);
    });

    tileLayer.addTo(map);

    map.on('click', (e) => {
      const nextLat = Number(e.latlng.lat.toFixed(6));
      const nextLng = Number(e.latlng.lng.toFixed(6));
      setLocationMessage('Manual location pin updated on map.');
      onChange({ latitude: nextLat, longitude: nextLng, locationSource: 'manual' });
    });

    mapInstanceRef.current = map;
    setTimeout(() => map.invalidateSize(), 120);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [mapOpen]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (parsedLat !== null && parsedLng !== null && Number.isFinite(parsedLat) && Number.isFinite(parsedLng)) {
      if (!markerRef.current) {
        const marker = L.marker([parsedLat, parsedLng], {
          draggable: true,
          icon: createPinIcon(),
        }).addTo(map);

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onChange({
            latitude: Number(pos.lat.toFixed(6)),
            longitude: Number(pos.lng.toFixed(6)),
            locationSource: 'manual',
          });
          setLocationMessage('Adjusted pin location manually.');
        });
        markerRef.current = marker;
      } else {
        markerRef.current.setLatLng([parsedLat, parsedLng]);
      }
      map.setView([parsedLat, parsedLng], Math.max(map.getZoom(), PIN_ZOOM));
    } else if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }
  }, [parsedLat, parsedLng, mapOpen]);

  const handleUseGps = () => {
    setLocationMessage('');
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationMessage('GPS is unavailable in this browser. You can open the map to pin manually or skip location.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        onChange({ latitude: lat, longitude: lng, locationSource: 'gps' });
        setLocationMessage('GPS location captured. You can adjust the pin on the map if needed.');
        setMapOpen(true);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err && err.code === 1) {
          setLocationMessage('Location permission denied. You can click "Pin on Map" to choose manually or submit without location.');
        } else if (err && err.code === 3) {
          setLocationMessage('GPS timed out. Please try again or pick a location manually on the map.');
        } else {
          setLocationMessage('Unable to detect GPS location. You can pick manually on the map or skip.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleClear = () => {
    onChange({ latitude: null, longitude: null, locationSource: null });
    setLocationMessage('Location pin cleared. Complaint will be submitted without map coordinates.');
  };

  return (
    <div className="location-picker-box">
      <div className="location-picker-actions">
        <button
          type="button"
          className="location-btn"
          onClick={handleUseGps}
          disabled={locating}
        >
          <i className={locating ? 'fas fa-spinner fa-spin' : 'fas fa-crosshairs'} />{' '}
          {locating ? 'Getting GPS...' : 'Use Current GPS'}
        </button>
        <button
          type="button"
          className="location-btn secondary"
          onClick={() => setMapOpen((prev) => !prev)}
        >
          <i className="fas fa-map-pin" /> {mapOpen ? 'Hide Map Picker' : 'Pin on Map'}
        </button>
        {hasCoords && (
          <button type="button" className="location-btn danger" onClick={handleClear}>
            <i className="fas fa-times" /> Clear Location
          </button>
        )}
      </div>

      {hasCoords && (
        <div className="location-coords-pill">
          <i className="fas fa-map-marker-alt" /> Selected ({locationSource === 'gps' ? 'GPS' : 'Manual Pin'}):{' '}
          <strong>
            {Number(parsedLat).toFixed(5)}, {Number(parsedLng).toFixed(5)}
          </strong>
        </div>
      )}

      {locationMessage && <p className="location-feedback">{locationMessage}</p>}

      {tileError && (
        <p className="location-feedback warning">
          Map tiles could not load (network offline or blocked). Manual submission without a map pin still works normally.
        </p>
      )}

      {mapOpen && (
        <div className="location-map-shell">
          <div ref={mapContainerRef} className="location-map-canvas" />
          <small className="location-privacy-note">
            Click anywhere on the map or drag the green pin to set the issue spot. Public maps show only an approximate area (~400m) for your privacy; exact coordinates stay restricted to Panchayat officials.
          </small>
        </div>
      )}
    </div>
  );
}

