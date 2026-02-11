"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";

import { eventsBcn } from "@/data/events-bcn";
import { filterEventsByCategory, getEventsByIds, mapIdsToEvents, orderEventsByIds } from "@/lib/events";
import { buildGoogleMapsDirectionsUrl, estimateLegsForRoute } from "@/lib/routing";
import { formatHour, sortEventsByStartTime } from "@/lib/time";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Checkbox } from "@/shared/ui/shadcn/checkbox";
import { ScrollArea } from "@/shared/ui/shadcn/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/shadcn/select";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";
import { EVENT_CATEGORIES, type EventCategory } from "@/types/event";

const ItineraryMap = dynamic(() => import("@/components/map/ItineraryMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-[360px] w-full rounded-lg" />,
});

type ItineraryResponse = {
  orderedEvents: string[];
  explanation: string;
};

const categoryLabels: Record<EventCategory | "all", string> = {
  all: "Todas",
  music: "Music",
  theatre: "Theatre",
  sport: "Sport",
  festival: "Festival",
  other: "Other",
};

export default function HomePage() {
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | "all">("all");
  const [transportMode, setTransportMode] = useState<"walk" | "public">("walk");
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [orderedEventIds, setOrderedEventIds] = useState<string[]>([]);
  const [itineraryExplanation, setItineraryExplanation] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredEvents = useMemo(
    () => filterEventsByCategory(eventsBcn, categoryFilter),
    [categoryFilter],
  );

  const selectedEvents = useMemo(
    () => getEventsByIds(filteredEvents, selectedEventIds),
    [filteredEvents, selectedEventIds],
  );

  const orderedEvents = useMemo(
    () => mapIdsToEvents(filteredEvents, orderedEventIds),
    [filteredEvents, orderedEventIds],
  );

  const visibleEvents = useMemo(() => {
    const fallback = sortEventsByStartTime(filteredEvents);
    return orderedEventIds.length > 0 ? orderEventsByIds(fallback, orderedEventIds) : fallback;
  }, [filteredEvents, orderedEventIds]);

  const legsEstimate = useMemo(
    () => estimateLegsForRoute(orderedEvents, transportMode),
    [orderedEvents, transportMode],
  );

  const routeToGoogleMaps = useMemo(
    () => buildGoogleMapsDirectionsUrl(orderedEvents, transportMode),
    [orderedEvents, transportMode],
  );

  const toggleEventSelection = (eventId: string, checked: boolean) => {
    setSelectedEventIds((prev) => {
      if (checked) {
        return prev.includes(eventId) ? prev : [...prev, eventId];
      }

      return prev.filter((id) => id !== eventId);
    });
  };

  const handleGenerateItinerary = async () => {
    const selected = getEventsByIds(eventsBcn, selectedEventIds);

    if (selected.length === 0) {
      toast.error("Selecciona al menos un evento.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: selected, transportMode }),
      });

      const payload = (await response.json()) as Partial<ItineraryResponse> & { error?: string };

      if (!response.ok || !payload.orderedEvents) {
        throw new Error(payload.error ?? "Respuesta invalida del servidor.");
      }

      setOrderedEventIds(payload.orderedEvents);
      setItineraryExplanation(payload.explanation ?? "");

      const orderedIdsSet = new Set(payload.orderedEvents);
      const incompatibleEvents = selected.filter((event) => !orderedIdsSet.has(event.id));

      if (incompatibleEvents.length > 0) {
        const previewNames = incompatibleEvents
          .slice(0, 3)
          .map((event) => event.name)
          .join(", ");
        const remainingCount = incompatibleEvents.length - 3;
        const incompatibleLabel =
          remainingCount > 0 ? `${previewNames} y ${remainingCount} mas` : previewNames;

        toast.warning("Hay eventos incompatibles en la seleccion", {
          description: `No se pudieron encajar por horario/distancia: ${incompatibleLabel}. Te recomiendo elegir otros eventos compatibles.`,
        });
      }
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "No se pudo generar el itinerario.";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const openGoogleMapsRoute = () => {
    if (!routeToGoogleMaps) {
      return;
    }

    window.open(routeToGoogleMaps, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_1.2fr]">
      <section className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Eventury Barcelona</CardTitle>
            <CardDescription>
              Genera rutas inteligentes para asistir a eventos en Barcelona segun horarios y
              proximidad.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">Categoria</p>
                <Select
                  value={categoryFilter}
                  onValueChange={(value) => setCategoryFilter(value as EventCategory | "all")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {EVENT_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {categoryLabels[category]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Transporte</p>
                <Select
                  value={transportMode}
                  onValueChange={(value) => setTransportMode(value as "walk" | "public")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk">A pie</SelectItem>
                    <SelectItem value="public">Transporte publico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button className="w-full" onClick={handleGenerateItinerary} disabled={isLoading}>
              {isLoading ? "Generando..." : "Generar itinerario con IA"}
            </Button>
          </CardContent>
        </Card>

        <Card className="min-h-[420px]">
          <CardHeader>
            <CardTitle>Eventos disponibles</CardTitle>
            <CardDescription>
              Selecciona los eventos que te interesan para construir tu recorrido.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[520px] pr-3">
              <div className="space-y-3">
                {visibleEvents.map((event) => {
                  const isChecked = selectedEventIds.includes(event.id);

                  return (
                    <Card key={event.id} className="gap-3 py-4">
                      <CardContent className="space-y-2 px-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold">{event.name}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{categoryLabels[event.category]}</Badge>
                              <p className="text-xs text-muted-foreground">
                                {formatHour(event.startTime)} - {formatHour(event.endTime)}
                              </p>
                            </div>
                          </div>

                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => toggleEventSelection(event.id, Boolean(checked))}
                          />
                        </div>

                        <p className="text-xs text-muted-foreground">{event.description}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Mapa de eventos</CardTitle>
            <CardDescription>
              Marcadores azules: eventos filtrados. Marcadores rojos: eventos seleccionados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ItineraryMap
              events={filteredEvents}
              selectedEvents={selectedEvents}
              orderedEvents={orderedEvents}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Itinerario sugerido por IA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : (
              <>
                {orderedEvents.length > 0 ? (
                  <div className="space-y-3">
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={openGoogleMapsRoute}
                      disabled={!routeToGoogleMaps}
                    >
                      Ver ruta en Google Maps
                    </Button>
                    <ol className="space-y-2 text-sm">
                      {orderedEvents.map((event, index) => (
                        <li key={event.id} className="rounded-md border p-3">
                          <span className="font-semibold">{index + 1}. </span>
                          {event.name}
                          <p className="text-xs text-muted-foreground">
                            {formatHour(event.startTime)} - {formatHour(event.endTime)}
                          </p>
                        </li>
                      ))}
                    </ol>
                    {legsEstimate.length > 0 ? (
                      <>
                        <Separator />
                        <div className="space-y-2 text-sm">
                          <p className="font-medium">Tiempos estimados entre eventos</p>
                          {legsEstimate.map((leg) => {
                            const fromName =
                              orderedEvents.find((event) => event.id === leg.fromEventId)?.name ??
                              leg.fromEventId;
                            const toName =
                              orderedEvents.find((event) => event.id === leg.toEventId)?.name ??
                              leg.toEventId;

                            return (
                              <p key={`${leg.fromEventId}-${leg.toEventId}`} className="text-muted-foreground">
                                {fromName} - {toName}: {leg.distanceKm} km aprox, {leg.estimatedMinutes} min
                              </p>
                            );
                          })}
                        </div>
                      </>
                    ) : null}
                    <Separator />
                    <p className="text-sm text-muted-foreground">
                      {itineraryExplanation || "La IA no devolvio explicacion adicional."}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Selecciona eventos y pulsa el boton para generar una propuesta de itinerario.
                  </p>
                )}
              </>
            )}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
