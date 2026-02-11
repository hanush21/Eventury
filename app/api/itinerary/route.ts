import { NextResponse } from "next/server";

import {
  buildItineraryPrompt,
  parseGeminiResponse,
  parseItineraryTextResponse,
} from "@/lib/itinerary-ai";
import type { Event } from "@/types/event";

type ItineraryRequestBody = {
  events?: Event[];
  transportMode?: "walk" | "public";
};

type ProviderErrorInfo = {
  status: number;
  body: string;
};

type DeepSeekResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
];

async function callGemini(
  apiKey: string,
  prompt: string,
  modelOverride?: string,
) {
  const models = modelOverride ? [modelOverride] : GEMINI_MODELS;
  let lastError: ProviderErrorInfo | null = null;

  for (const model of models) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        }),
      },
    );

    if (response.ok) {
      return response.json();
    }

    const errorBody = await response.text();
    lastError = { status: response.status, body: errorBody };

    if (response.status === 404 && !modelOverride) {
      continue;
    }

    break;
  }

  throw new Error(
    `Error de proveedor IA: ${
      lastError?.status ?? "unknown"
    } - ${lastError?.body ?? "sin detalle"}`,
  );
}

async function callDeepSeek(apiKey: string, prompt: string, model?: string) {
  const deepSeekModel = model || "deepseek-chat";
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: deepSeekModel,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error de proveedor IA: ${response.status} - ${errorBody}`);
  }

  const payload = (await response.json()) as DeepSeekResponse;
  const text = payload.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error("Error de proveedor IA: respuesta vacia de DeepSeek.");
  }

  return text;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.AI_API_KEY;
    const provider = (process.env.AI_PROVIDER ?? "gemini").toLowerCase();
    const model = process.env.AI_MODEL;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Falta configurar AI_API_KEY en el servidor." },
        { status: 500 },
      );
    }

    if (provider !== "gemini" && provider !== "deepseek") {
      return NextResponse.json(
        { error: "AI_PROVIDER invalido. Usa 'gemini' o 'deepseek'." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as ItineraryRequestBody;
    const events = body.events ?? [];
    const transportMode = body.transportMode === "public" ? "public" : "walk";

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: "Selecciona al menos un evento para generar el itinerario." },
        { status: 400 },
      );
    }

    const prompt = buildItineraryPrompt(events, transportMode);
    const allowedIds = events.map((event) => event.id);

    const parsed =
      provider === "deepseek"
        ? parseItineraryTextResponse(await callDeepSeek(apiKey, prompt, model), allowedIds)
        : parseGeminiResponse(await callGemini(apiKey, prompt, model), allowedIds);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Error generating itinerary:", error);
    const message = error instanceof Error ? error.message : "";

    if (message.includes("Error de proveedor IA: 401")) {
      return NextResponse.json(
        { error: "API key invalida o sin permisos para el proveedor seleccionado." },
        { status: 500 },
      );
    }

    if (message.includes("Error de proveedor IA: 404")) {
      return NextResponse.json(
        {
          error:
            "Modelo o endpoint no disponible para la API key. Revisa AI_PROVIDER y AI_MODEL.",
        },
        { status: 500 },
      );
    }

    if (message.includes("Error de proveedor IA: 429")) {
      return NextResponse.json(
        {
          error: "Se alcanzo el limite de cuota o rate limit de la API IA. Intenta mas tarde.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        error:
          "No se pudo generar el itinerario ahora mismo. Intenta de nuevo en unos minutos.",
      },
      { status: 500 },
    );
  }
}
