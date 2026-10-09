/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Type } from "@google/genai";
import { ZONES } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function geminiHide(zoneId: string): Promise<{ lat: number; lng: number; message: string }> {
  const zone = ZONES[zoneId as keyof typeof ZONES] || ZONES.global;
  const bounds = zone.bounds;
  
  let prompt = `You are playing a game of GeoGuesser/Hide and Seek. You need to pick a hiding spot within the following zone: ${zone.name}.`;
  if (bounds) {
    prompt += ` The bounds are roughly: North ${bounds.north}, South ${bounds.south}, East ${bounds.east}, West ${bounds.west}.`;
  }
  prompt += ` Pick a random, interesting location (like a landmark, a park, or a street) within this area. Return ONLY a JSON object with 'lat', 'lng', and 'message' properties. The 'message' should be a cryptic but playful and cheeky hint about where you are hiding. Have fun with it!`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER },
            message: { type: Type.STRING }
          },
          required: ["lat", "lng", "message"]
        }
      }
    });
    
    const text = response.text;
    if (text) {
      const data = JSON.parse(text);
      return { lat: data.lat, lng: data.lng, message: data.message || "I'm hiding somewhere in this zone! Come find me!" };
    }
  } catch (error) {
    console.error("Error getting hiding spot from Gemini:", error);
  }
  
  // Fallback to center of zone if Gemini fails
  return { ...zone.center, message: "I'm hiding somewhere in this zone! Come find me!" };
}

export async function geminiProvideHint(zoneId: string, hiderLocation: {lat: number, lng: number}, previousGuesses: {lat: number, lng: number, distance: number, bearing: number}[]): Promise<string> {
  const zone = ZONES[zoneId as keyof typeof ZONES] || ZONES.global;
  
  let prompt = `You are hiding at latitude ${hiderLocation.lat}, longitude ${hiderLocation.lng} in ${zone.name}.`;
  prompt += ` The seeker has made ${previousGuesses.length} guesses so far.\n`;
  previousGuesses.forEach((g, i) => {
    prompt += `Guess ${i + 1} was ${g.distance.toFixed(2)} km away.\n`;
  });
  prompt += `Provide a short, cryptic, playful, and cheeky hint to help them find you. Do not give away the exact location. Have fun taunting them a little bit! Return ONLY a JSON object with a 'hint' property.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hint: { type: Type.STRING }
          },
          required: ["hint"]
        }
      }
    });
    
    const text = response.text;
    if (text) {
      const data = JSON.parse(text);
      return data.hint || "Keep looking! You'll never find me!";
    }
  } catch (error) {
    console.error("Error getting hint from Gemini:", error);
  }
  
  return "You're getting warmer... or colder! Who knows!";
}
