import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L, { LeafletMouseEvent } from 'leaflet'
import { useEffect, useMemo, useState } from 'react'

// Fix default icon paths for Leaflet
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
const DefaultIcon = L.icon({ iconUrl, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] })
L.Marker.prototype.options.icon = DefaultIcon

type Props = {
  value?: { lat: number; lng: number } | null
  onChange?: (v: { lat: number; lng: number }) => void
  height?: number
}

function ClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      onSelect(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

const LocationPicker = ({ value, onChange, height = 300 }: Props) => {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(value || null)
  useEffect(() => setPos(value || null), [value])

  const center = useMemo(() => pos || { lat: 28.6139, lng: 77.209 }, [pos]) // Default to Delhi

  const onSelect = (lat: number, lng: number) => {
    const v = { lat, lng }
    setPos(v)
    onChange?.(v)
  }

  return (
    <div className="overflow-hidden rounded-cohere-md border border-cohere-card-border" style={{ height }}>
      <MapContainer center={[center.lat, center.lng]} zoom={12} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        <ClickHandler onSelect={onSelect} />
        {pos && <Marker position={[pos.lat, pos.lng]}></Marker>}
      </MapContainer>
    </div>
  )
}

export default LocationPicker
