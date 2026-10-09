import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from 'react-leaflet';
import { MapPin } from 'lucide-react';

const DEFAULT_CENTER = [7.8731, 80.7718];

const getCoord = (stop) => {
  const lat = typeof stop?.lat === 'number' ? stop.lat : typeof stop?.latitude === 'number' ? stop.latitude : null;
  const lng = typeof stop?.lng === 'number' ? stop.lng : typeof stop?.longitude === 'number' ? stop.longitude : null;
  return lat !== null && lng !== null ? [lat, lng] : null;
};

export default function RouteMap({ stops = [], height = 320, title = 'Route Map' }) {
  const sortedStops = [...stops].sort((a, b) => (a.order || 0) - (b.order || 0));
  const points = sortedStops.map(getCoord).filter(Boolean);

  if (points.length < 2) {
    return (
      <div
        className="rounded-2xl border border-dashed border-gray-300 bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-6 text-center"
        style={{ height }}
      >
        <div>
          <div className="w-11 h-11 mx-auto rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center mb-3 shadow-sm">
            <MapPin size={18} className="text-white" />
          </div>
          <p className="font-semibold text-gray-800">Map Preview Unavailable</p>
          <p className="text-sm text-gray-500 mt-1">
            Add coordinates for at least two stops to render {title.toLowerCase()}.
          </p>
        </div>
      </div>
    );
  }

  const center = points[Math.floor(points.length / 2)] || DEFAULT_CENTER;

  return (
    <div className="rounded-2xl overflow-hidden border border-red-100 shadow-sm">
      <MapContainer center={center} zoom={10} scrollWheelZoom={false} style={{ height, width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Polyline positions={points} pathOptions={{ color: '#be123c', weight: 5, opacity: 0.8 }} />

        {sortedStops.map((stop, index) => {
          const coord = getCoord(stop);
          if (!coord) return null;
          const edgeStop = index === 0 || index === sortedStops.length - 1;

          return (
            <CircleMarker
              key={`${stop.name || 'stop'}-${index}`}
              center={coord}
              radius={edgeStop ? 8 : 6}
              pathOptions={{
                color: edgeStop ? '#881337' : '#be123c',
                fillColor: edgeStop ? '#e11d48' : '#fb7185',
                fillOpacity: 0.9,
                weight: 2,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{stop.name || `Stop ${index + 1}`}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Order: {stop.order || index + 1}</p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
