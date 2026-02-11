export const EVENT_CATEGORIES = [
  "music",
  "theatre",
  "sport",
  "festival",
  "other",
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export type Event = {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  startTime: string;
  endTime: string;
  category: EventCategory;
};
