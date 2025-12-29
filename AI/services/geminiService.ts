
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

const API_KEY = process.env.API_KEY || '';

export class ROKOService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: API_KEY });
  }

  async generateImage(prompt: string) {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: `High-quality, futuristic, detailed: ${prompt}` }]
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9"
          }
        }
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return null;
    } catch (error) {
      console.error("Error generating image:", error);
      throw error;
    }
  }

  async textInteraction(prompt: string) {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: "You are ROKO, a highly advanced JARVIS-style personal AI assistant created by Rohit Koli. Respond concisely, professionally, and with a touch of dry wit. Use terms like 'Sir', 'At your service', or 'Processing data'. If asked to perform physical tasks like 'screenshot' or 'open app', acknowledge the command as if you are executing it in the background. Your primary goal is speed and efficiency.",
        }
      });
      return response.text;
    } catch (error) {
      console.error("Error in text interaction:", error);
      throw error;
    }
  }

  connectLive(voiceName: string, callbacks: {
    onopen: () => void;
    onmessage: (msg: LiveServerMessage) => void;
    onerror: (err: any) => void;
    onclose: () => void;
  }) {
    return this.ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName } }
        },
        systemInstruction: "You are ROKO, a highly advanced JARVIS-style AI created by Rohit Koli. Maintain a calm, sophisticated, and helpful demeanor. Your response latency must be minimized. Keep your verbal responses punchy and efficient, just like JARVIS."
      }
    });
  }
}

export const rokoService = new ROKOService();
