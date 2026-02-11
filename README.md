# Eventury Barcelona

Aplicacion web construida con Next.js + TypeScript para generar itinerarios de eventos en Barcelona usando IA.

## Stack

- Next.js 14 (App Router)
- TypeScript
- TailwindCSS
- shadcn/ui
- Leaflet + React-Leaflet

## Requisitos previos

- Node.js 18.18+ o 20+
- npm o pnpm

## Instalacion de dependencias

```bash
npm install
```

o

```bash
pnpm install
```

## Configurar variables de IA

Crea un archivo `.env.local` en la raiz:

```bash
AI_PROVIDER=deepseek
AI_MODEL=deepseek-chat
AI_API_KEY=tu_api_key_aqui
```

Valores soportados:

- `AI_PROVIDER=deepseek` usa `https://api.deepseek.com/chat/completions`.
- `AI_PROVIDER=gemini` usa `https://generativelanguage.googleapis.com`.
- `AI_MODEL` permite forzar un modelo especifico.
  - DeepSeek recomendado: `deepseek-chat`.
  - Gemini opcional: `gemini-2.0-flash` (o dejar vacio para fallback interno).

La API key nunca se hardcodea en el codigo; se lee en `app/api/itinerary/route.ts`.

## Ejecutar en desarrollo

```bash
npm run dev
```

o

```bash
pnpm dev
```

Abre `http://localhost:3000`.

## Estructura relevante

- `app/page.tsx`: UI principal con filtros, seleccion de eventos, mapa e itinerario.
- `app/api/itinerary/route.ts`: endpoint POST para generar itinerario con IA.
- `components/map/ItineraryMap.tsx`: mapa OSM con marcadores y polyline.
- `data/events-bcn.ts`: eventos mock tipados.
- `types/event.ts`: tipo `Event`.
- `lib/time.ts`: helpers de tiempo y orden por hora.
- `lib/events.ts`: filtros por categoria y mapeos IDs <-> objetos.
- `lib/itinerary-ai.ts`: construccion de prompt y parseo/validacion de respuesta IA.
- `lib/routing.ts`: estimacion local de distancias/tiempos y enlace de ruta en Google Maps.
