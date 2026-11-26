const crypto = require('crypto');

const APPROX_GRID_STEP = 0.004; // ~440 meters grid snapping for public coordinate privacy

function parseCoordinatePair(rawLat, rawLng) {
  const latEmpty = rawLat === undefined || rawLat === null || String(rawLat).trim() === '';
  const lngEmpty = rawLng === undefined || rawLng === null || String(rawLng).trim() === '';

  if (latEmpty && lngEmpty) {
    return { provided: false, valid: true, latitude: null, longitude: null };
  }

  if (latEmpty || lngEmpty) {
    return {
      provided: true,
      valid: false,
      message: 'Both latitude and longitude must be provided together.',
    };
  }

  const lat = Number(rawLat);
  const lng = Number(rawLng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return {
      provided: true,
      valid: false,
      message: 'Location coordinates are invalid.',
    };
  }

  return {
    provided: true,
    valid: true,
    latitude: Number(lat.toFixed(7)),
    longitude: Number(lng.toFixed(7)),
  };
}

/**
 * Generates privacy-safe approximate coordinates for public map markers.
 * Snaps exact coordinates onto an ~440m grid with a small deterministic jitter so
 * exact citizen addresses/homes are never exposed publicly.
 */
function toApproximateCoordinates(latitude, longitude, seed = '') {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { approxLatitude: null, approxLongitude: null };
  }

  const snappedLat = Math.round(latitude / APPROX_GRID_STEP) * APPROX_GRID_STEP;
  const snappedLng = Math.round(longitude / APPROX_GRID_STEP) * APPROX_GRID_STEP;

  const digest = crypto.createHash('sha256').update(`${seed}:${snappedLat}:${snappedLng}`).digest();
  const jitterLat = (((digest[0] / 255) - 0.5) * 0.0016);
  const jitterLng = (((digest[1] / 255) - 0.5) * 0.0016);

  const clampedLat = Math.max(-90, Math.min(90, snappedLat + jitterLat));
  const clampedLng = Math.max(-180, Math.min(180, snappedLng + jitterLng));

  return {
    approxLatitude: Number(clampedLat.toFixed(4)),
    approxLongitude: Number(clampedLng.toFixed(4)),
  };
}

module.exports = {
  APPROX_GRID_STEP,
  parseCoordinatePair,
  toApproximateCoordinates,
};

