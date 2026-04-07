import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface MapsLink {
  uri: string;
  title: string;
}

export interface GeminiResponse {
  markdown: string;
  mapsLinks: MapsLink[];
}

export async function searchBusinesses(category: string, location: string): Promise<GeminiResponse> {
  const prompt = `Actúa como un experto guía local de Buenos Aires. Recomienda 5 excelentes opciones de "${category}" en el barrio de "${location}", CABA. 
Para cada opción, incluye:
- Nombre del lugar (como título)
- Una imagen del lugar (intenta extraer y mostrar una imagen real de las reseñas de Google Maps usando formato Markdown ![alt](url). Si no es posible, usa una imagen representativa).
- Una breve descripción de por qué es bueno y qué ofrecen.
- Un resumen de sus mejores reviews o calificación general (menciona textualmente alguna review muy positiva si está disponible).
Usa un formato Markdown limpio y atractivo.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const markdown = response.text || "No se encontraron resultados.";

    // Extract web links from grounding metadata
    const mapsLinks: MapsLink[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

    if (chunks && Array.isArray(chunks)) {
      for (const chunk of chunks) {
        if (chunk.web && chunk.web.uri) {
          mapsLinks.push({
            uri: chunk.web.uri,
            title: chunk.web.title || "Ver más"
          });
        }
      }
    }

    return { markdown, mapsLinks };
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Hubo un error al buscar los comercios. Por favor, intenta de nuevo.");
  }
}
