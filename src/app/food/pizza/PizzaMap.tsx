'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import Link from 'next/link';
import type { PizzaReview } from '@/lib/pizza/types';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon issue
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// NYC center coordinates
const NYC_CENTER: [number, number] = [40.7831, -73.9712];
const NYC_ZOOM = 12;

interface Props {
  reviews: PizzaReview[];
}

// Zoom control buttons component
function ZoomControls({ reviews }: { reviews: PizzaReview[] }) {
  const map = useMap();

  const zoomToNYC = () => {
    map.setView(NYC_CENTER, NYC_ZOOM);
  };

  const zoomToAll = () => {
    const validReviews = reviews.filter(
      (r) => r.lat !== null && r.lon !== null
    );
    if (validReviews.length === 0) return;

    const bounds = L.latLngBounds(
      validReviews.map((r) => [r.lat!, r.lon!] as [number, number])
    );
    map.fitBounds(bounds, { padding: [50, 50] });
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <button
        onClick={zoomToNYC}
        style={{
          padding: '8px 12px',
          background: '#fff',
          border: '2px solid rgba(0,0,0,0.2)',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 500,
          fontSize: '13px',
        }}
        title="Zoom to New York City"
      >
        NYC
      </button>
      <button
        onClick={zoomToAll}
        style={{
          padding: '8px 12px',
          background: '#fff',
          border: '2px solid rgba(0,0,0,0.2)',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 500,
          fontSize: '13px',
        }}
        title="Zoom to fit all locations"
      >
        All
      </button>
    </div>
  );
}

export default function PizzaMap({ reviews }: Props) {
  const validReviews = reviews.filter(
    (r) => r.lat !== null && r.lon !== null
  );

  if (validReviews.length === 0) {
    return <p>No reviews with coordinates.</p>;
  }

  // Calculate bounds for initial view
  const bounds = L.latLngBounds(
    validReviews.map((r) => [r.lat!, r.lon!] as [number, number])
  );

  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [50, 50] }}
      style={{ height: '500px', width: '100%', borderRadius: '8px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControls reviews={validReviews} />
      {validReviews.map((review) => (
        <Marker
          key={review.slug}
          position={[review.lat!, review.lon!]}
          icon={icon}
        >
          <Popup>
            <div style={{ minWidth: '150px' }}>
              <strong>
                <Link
                  href={`/food/pizza/${review.slug}`}
                  style={{ color: '#0066cc', textDecoration: 'none' }}
                >
                  {review.restaurant}
                </Link>
              </strong>
              <br />
              <span style={{ color: '#666' }}>{review.location}</span>
              {review.overallScore !== null && (
                <>
                  <br />
                  <span style={{ fontWeight: 500 }}>
                    Score: {review.overallScore}
                  </span>
                </>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
