"use client";

import { useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";

import type { Event } from "@/types/event";

const BARCELONA_CENTER: [number, number] = [41.3874, 2.1686];

const defaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const selectedIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconRetinaUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type ItineraryMapProps = {
  events: Event[];
  selectedEvents: Event[];
  orderedEvents: Event[];
};

export default function ItineraryMap({
  events,
  selectedEvents,
  orderedEvents,
}: ItineraryMapProps) {
  const selectedIds = useMemo(
    () => new Set(selectedEvents.map((event) => event.id)),
    [selectedEvents],
  );

  const polylinePositions = orderedEvents.map(
    (event) => [event.latitude, event.longitude] as [number, number],
  );

  return (
    <MapContainer
      center={BARCELONA_CENTER}
      zoom={13}
      scrollWheelZoom
      className="h-[360px] w-full rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {events.map((event) => {
        const isSelected = selectedIds.has(event.id);

        return (
          <Marker
            key={event.id}
            position={[event.latitude, event.longitude]}
            icon={isSelected ? selectedIcon : defaultIcon}
          >
            <Popup>
              <strong>{event.name}</strong>
              <br />
              {event.category}
            </Popup>
          </Marker>
        );
      })}

      {polylinePositions.length >= 2 ? (
        <Polyline positions={polylinePositions} pathOptions={{ color: "#ef4444", weight: 4 }} />
      ) : null}
    </MapContainer>
  );
}
