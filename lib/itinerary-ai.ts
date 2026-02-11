import type { Event } from "@/types/event";

type ParsedItineraryResponse = {
  orderedEvents: string[];
  explanation: string;
};

type GeminiCandidatePart = {
  text?: string;
};

type GeminiCandidateContent = {
  parts?: GeminiCandidatePart[];
};

type GeminiCandidate = {
  content?: GeminiCandidateContent;
};

type GeminiGenerateResponse = {
  candidates?: GeminiCandidate[];
};

export function buildItineraryPrompt(events: Event[], transportMode: "walk" | "public"): string {
  const serializedEvents = events.map((event) => ({
    id: event.id,
    name: event.name,
    latitude: event.latitude,
    longitude: event.longitude,
    startTime: event.startTime,
    endTime: event.endTime,
    category: event.category,
  }));

  return [
    "Eres un planificador experto de itinerarios de eventos en Barcelona.",
    `Modo de transporte del usuario: ${transportMode}.`,
    "Objetivo: ordenar los eventos para maximizar la asistencia considerando compatibilidad horaria y distancia aproximada.",
    "No inventes eventos ni IDs.",
    "Devuelve exclusivamente JSON valido, sin markdown ni texto adicional.",
    "Formato exacto requerido:",
    '{"orderedEvents":["id-1","id-2"],"explanation":"texto corto"}',
    "Eventos seleccionados:",
    JSON.stringify(serializedEvents),
  ].join("\n");
}

export function extractJsonBlock(rawText: string): string {
  const cleaned = rawText.trim();

  if (cleaned.startsWith("{") && cleaned.endsWith("}")) {
    return cleaned;
  }

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error("No se pudo extraer JSON de la respuesta de la IA.");
  }

  return jsonMatch[0];
}

export function parseItineraryTextResponse(
  textResponse: string,
  allowedEventIds: string[],
): ParsedItineraryResponse {
  if (!textResponse) {
    throw new Error("La IA devolvio una respuesta vacia.");
  }

  // Algunos modelos devuelven JSON con texto extra; extraemos solo el bloque del objeto.
  const jsonText = extractJsonBlock(textResponse);
  const parsed = JSON.parse(jsonText) as Partial<ParsedItineraryResponse>;

  if (!Array.isArray(parsed.orderedEvents) || typeof parsed.explanation !== "string") {
    throw new Error("El formato JSON de la IA no coincide con el esquema esperado.");
  }

  const allowedIdsSet = new Set(allowedEventIds);
  const uniqueOrderedIds = [...new Set(parsed.orderedEvents)];
  const validOrderedIds = uniqueOrderedIds.filter((id): id is string => {
    return typeof id === "string" && allowedIdsSet.has(id);
  });

  if (validOrderedIds.length === 0) {
    throw new Error("La IA no devolvio IDs de eventos validos.");
  }

  return {
    orderedEvents: validOrderedIds,
    explanation: parsed.explanation.trim(),
  };
}

export function parseGeminiResponse(
  rawProviderResponse: GeminiGenerateResponse,
  allowedEventIds: string[],
): ParsedItineraryResponse {
  const textResponse = rawProviderResponse.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  return parseItineraryTextResponse(textResponse ?? "", allowedEventIds);
}
