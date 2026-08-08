import { useState } from 'react'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
import { AlertTriangle } from 'lucide-react'

const DefaultIcon = L.icon({ iconUrl, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] })
L.Marker.prototype.options.icon = DefaultIcon

export default function MapPreview({ lat, lng, height = 180 }: { lat: number; lng: number; height?: number }) {
  const [tileError, setTileError] = useState(false)

  if (tileError) {
    return (
      <div className="flex items-center justify-center overflow-hidden rounded-cohere-md border border-cohere-card-border bg-card/40 backdrop-blur-md" style={{ height }}>
        <div className="text-center text-sm text-muted-foreground">
          <AlertTriangle className="h-5 w-5 mx-auto mb-1" />
          Map unavailable
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-cohere-md border border-cohere-card-border" style={{ height }}>
      <MapContainer center={[lat, lng]} zoom={14} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false} dragging={false} doubleClickZoom={false}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
          eventHandlers={{
            tileerror: () => setTileError(true),
          }}
        />
        <Marker position={[lat, lng]} />
      </MapContainer>
    </div>
  )
}

