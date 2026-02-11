import type { Event } from "@/types/event";

export function formatHour(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  const formatted = new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  return `${formatted} h`;
}

export function sortEventsByStartTime(events: Event[]): Event[] {
  return [...events].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
}
