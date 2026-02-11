import type { Event } from "@/types/event";

type TransportMode = "walk" | "public";

export type RouteLegEstimate = {
  fromEventId: string;
  toEventId: string;
  distanceKm: number;
  estimatedMinutes: number;
};

const EARTH_RADIUS_KM = 6371;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(
  originLat: number,
  originLng: number,
  destinationLat: number,
  destinationLng: number,
): number {
  const dLat = toRadians(destinationLat - originLat);
  const dLng = toRadians(destinationLng - originLng);
  const lat1 = toRadians(originLat);
  const lat2 = toRadians(destinationLat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

export function estimateLegsForRoute(
  orderedEvents: Event[],
  transportMode: TransportMode,
): RouteLegEstimate[] {
  if (orderedEvents.length < 2) {
    return [];
  }

  const avgSpeedKmH = transportMode === "walk" ? 4.8 : 18;
  const transferBufferMin = transportMode === "walk" ? 0 : 6;

  const legs: RouteLegEstimate[] = [];

  for (let index = 0; index < orderedEvents.length - 1; index += 1) {
    const from = orderedEvents[index];
    const to = orderedEvents[index + 1];
    const straightDistance = haversineDistanceKm(
      from.latitude,
      from.longitude,
      to.latitude,
      to.longitude,
    );

    // Factor urbano para aproximar calles/retrasos sobre distancia en linea recta.
    const adjustedDistance = straightDistance * (transportMode === "walk" ? 1.25 : 1.45);
    const minutes = Math.ceil((adjustedDistance / avgSpeedKmH) * 60 + transferBufferMin);

    legs.push({
      fromEventId: from.id,
      toEventId: to.id,
      distanceKm: Number(adjustedDistance.toFixed(2)),
      estimatedMinutes: minutes,
    });
  }

  return legs;
}

export function buildGoogleMapsDirectionsUrl(
  orderedEvents: Event[],
  transportMode: TransportMode,
): string | null {
  if (orderedEvents.length < 2) {
    return null;
  }

  const travelMode = transportMode === "public" ? "transit" : "walking";
  const origin = `${orderedEvents[0].latitude},${orderedEvents[0].longitude}`;
  const destination = `${orderedEvents[orderedEvents.length - 1].latitude},${
    orderedEvents[orderedEvents.length - 1].longitude
  }`;
  const waypoints = orderedEvents
    .slice(1, -1)
    .map((event) => `${event.latitude},${event.longitude}`)
    .join("|");

  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: travelMode,
  });

  if (waypoints) {
    params.set("waypoints", waypoints);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
