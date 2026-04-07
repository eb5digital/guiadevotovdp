import { GoogleGenAI } from "@google/genai";

export interface MapsLink {
  uri: string;
  title: string;
}

export interface GeminiResponse {
  markdown: string;
  mapsLinks: MapsLink[];
}

export async function searchBusinesses(category: string, location: string): Promise<GeminiResponse> {
  // @ts-ignore - Bypass TS error for import.meta.env
  const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
  
  if (!apiKey || apiKey === 'undefined') {
    throw new Error("Falta la clave de API de Gemini. Por favor, configura la variable GEMINI_API_KEY en Vercel y vuelve a hacer el deploy (Redeploy).");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Actúa como un experto guía local de Buenos Aires. Recomienda 5 excelentes opciones de "${category}" en el barrio de "${location}", CABA. 
Para cada opción, incluye:
- Nombre del lugar (como título)
- Una imagen del lugar (intenta extraer y mostrar una imagen real de las reseñas de Google Maps usando formato Markdown ![alt](url). Si no es posible, usa una imagen representativa).
- Una breve descripción de por qué es bueno y qué ofrecen.
- Un resumen de sus mejores reviews o calificación general (menciona textualmente alguna review muy positiva si está disponible).
Usa un formato Markdown limpio y atractivo.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: -34.5985, // Villa Devoto approx
              longitude: -58.5105
            }
          }
        }
      },
    });

    const markdown = response.text || "No se encontraron resultados.";
    
    // Extract Maps links
    const mapsLinks: MapsLink[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (chunks && Array.isArray(chunks)) {
      for (const chunk of chunks) {
        if (chunk.maps && chunk.maps.uri) {
          mapsLinks.push({
            uri: chunk.maps.uri,
            title: chunk.maps.title || "Ver en Google Maps"
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
