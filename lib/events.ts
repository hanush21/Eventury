import type { Event, EventCategory } from "@/types/event";

export function filterEventsByCategory(
  events: Event[],
  category: EventCategory | "all",
): Event[] {
  if (category === "all") {
    return events;
  }

  return events.filter((event) => event.category === category);
}

export function getEventsByIds(events: Event[], ids: string[]): Event[] {
  const idsSet = new Set(ids);
  return events.filter((event) => idsSet.has(event.id));
}

export function mapIdsToEvents(events: Event[], ids: string[]): Event[] {
  const eventMap = new Map(events.map((event) => [event.id, event]));
  return ids
    .map((id) => eventMap.get(id))
    .filter((event): event is Event => Boolean(event));
}

export function orderEventsByIds(events: Event[], orderedIds: string[]): Event[] {
  if (orderedIds.length === 0) {
    return events;
  }

  const position = new Map(orderedIds.map((id, index) => [id, index]));

  return [...events].sort((a, b) => {
    const aPos = position.get(a.id);
    const bPos = position.get(b.id);

    if (aPos === undefined && bPos === undefined) {
      return 0;
    }

    if (aPos === undefined) {
      return 1;
    }

    if (bPos === undefined) {
      return -1;
    }

    return aPos - bPos;
  });
}
