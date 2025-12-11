import { GoogleGenAI, Part } from "@google/genai";
import { 
  AppMode, 
  AspectRatio, 
  LightingStyle, 
  CameraPerspective, 
  ColorTheory, 
  ReferenceTactic, 
  ImageFile,
  PortraitEnvironment,
  PortraitVibe,
  InteriorStyle,
  InteriorMaterial
} from "../types";
import { resizeImageToAspectRatio } from "../utils";

// Prevent "Cannot find name 'process'" error in environments without @types/node
declare const process: any;

const getApiKey = (): string | undefined => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.API_KEY) return process.env.API_KEY;
      if (process.env.REACT_APP_API_KEY) return process.env.REACT_APP_API_KEY;
      if (process.env.NEXT_PUBLIC_API_KEY) return process.env.NEXT_PUBLIC_API_KEY;
    }
  } catch (e) {}
  
  try {
    // @ts-ignore
    if (import.meta && import.meta.env) {
        // @ts-ignore
        if (import.meta.env.VITE_API_KEY) return import.meta.env.VITE_API_KEY;
        // @ts-ignore
        if (import.meta.env.API_KEY) return import.meta.env.API_KEY;
    }
  } catch (e) {}

  return undefined;
};

const getAIClient = () => {
    const key = getApiKey();
    if (!key) {
        console.warn("Gemini API Key missing.");
    }
    return new GoogleGenAI({ apiKey: key || '' });
};

const NANO_BANANA_MODEL = 'gemini-2.5-flash-image';
const PROMPT_MODEL = 'gemini-2.5-flash';

interface GeneratePromptParams {
  mode: AppMode;
  inputImage: ImageFile;
  aspectRatio: AspectRatio;
  
  // Studio Params
  lighting?: LightingStyle;
  perspective?: CameraPerspective;
  colorTheory?: ColorTheory;
  styleReferences?: ImageFile[];
  referenceTactic?: ReferenceTactic;

  // Portrait Params
  portraitEnv?: PortraitEnvironment;
  portraitVibe?: PortraitVibe;

  // Interior Params
  interiorStyle?: InteriorStyle;
  interiorMaterial?: InteriorMaterial;
}

export const generateOptimizedPrompt = async (params: GeneratePromptParams): Promise<string> => {
  const ai = getAIClient();
  const parts: Part[] = [];

  // Add Input Image for analysis
  parts.push({
    inlineData: {
      mimeType: params.inputImage.mimeType,
      data: params.inputImage.base64,
    },
  });

  let systemInstruction = "";

  if (params.mode === AppMode.STUDIO) {
    const isMatchLighting = params.lighting === LightingStyle.MATCH_REFERENCE;
    const isMatchPerspective = params.perspective === CameraPerspective.MATCH_REFERENCE;

    systemInstruction = `You are an expert commercial art director.
    Task: Write a descriptive image generation prompt to restyle a product photo.
    
    Attributes:
    - Lighting: ${isMatchLighting ? 'ANALYZE AND COPY FROM REFERENCE IMAGE' : params.lighting}
    - Perspective: ${isMatchPerspective ? 'ANALYZE AND COPY FROM REFERENCE IMAGE' : params.perspective}
    - Color Strategy: ${params.colorTheory}
    
    Instructions:
    1. ANALYZE the attached Product Image. Identify colors and material.
    2. Apply the Color Strategy to choose background colors.
    3. Describe the scene, lighting, and mood.
    4. CRITICAL: Start with "Preserve the exact details, shape, and text of the primary product."
    `;

    // Handle Style References (Studio only)
    if (params.styleReferences && params.styleReferences.length > 0 && params.referenceTactic !== ReferenceTactic.IGNORE) {
        for (const refImg of params.styleReferences) {
            parts.push({
                inlineData: {
                    mimeType: refImg.mimeType,
                    data: refImg.base64,
                },
            });
        }
        systemInstruction += `\n\n5. CRITICAL: Use the attached additional images as STYLE REFERENCES (Tactic: ${params.referenceTactic}). Extract their style/vibe into text descriptions.`;
        
        if (isMatchLighting) {
           systemInstruction += `\n\n6. IMPORTANT: You MUST analyze the lighting in the reference image(s) and describe it exactly in the prompt to match.`;
        }
        if (isMatchPerspective) {
           systemInstruction += `\n\n7. IMPORTANT: You MUST analyze the camera angle/perspective in the reference image(s) and describe it exactly in the prompt to match.`;
        }
    }

  } else if (params.mode === AppMode.PORTRAIT) {
    systemInstruction = `You are a professional portrait photographer.
    Task: Write a descriptive prompt to change the background and lighting of a person's photo while preserving their identity.
    
    Attributes:
    - New Environment: ${params.portraitEnv}
    - Vibe/Lighting: ${params.portraitVibe}
    
    Instructions:
    1. ANALYZE the person in the image.
    2. Describe a high-quality, realistic scene based on the 'New Environment'.
    3. Describe the lighting based on 'Vibe'.
    4. CRITICAL: Start with "Preserve the exact facial features, skin tone, hair, and identity of the person in the input image."
    5. Output ONLY the raw prompt text.
    `;
  } else if (params.mode === AppMode.INTERIOR) {
    systemInstruction = `You are an interior designer.
    Task: Write a descriptive prompt to redecorate a room while keeping its structure.
    
    Attributes:
    - Design Style: ${params.interiorStyle}
    - Materials: ${params.interiorMaterial}
    
    Instructions:
    1. ANALYZE the room's layout, window positions, and perspective.
    2. Describe the room redecorated in the '${params.interiorStyle}' style.
    3. Use '${params.interiorMaterial}' for furniture and textures.
    4. CRITICAL: Start with "Preserve the exact structural perspective, walls, floor plan, and window placements of the room."
    5. Output ONLY the raw prompt text.
    `;
  }

  parts.push({ text: systemInstruction });

  try {
    const response = await ai.models.generateContent({
      model: PROMPT_MODEL,
      contents: { parts },
    });
    return response.text?.trim() || "Preserve the input image exactly.";
  } catch (error) {
    console.error("Error generating prompt:", error);
    throw new Error("Failed to generate prompt.");
  }
};

export const generateImage = async (
  inputImage: ImageFile,
  prompt: string,
  aspectRatio: AspectRatio
): Promise<string> => {
  const ai = getAIClient();

  const resizedBase64 = await resizeImageToAspectRatio(
    inputImage.base64, 
    inputImage.mimeType, 
    aspectRatio
  );

  const parts: Part[] = [
    {
      inlineData: {
        mimeType: 'image/png',
        data: resizedBase64,
      },
    },
    {
      text: prompt,
    },
  ];

  try {
    const response = await ai.models.generateContent({
      model: NANO_BANANA_MODEL,
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
        }
      },
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image data found in response.");
  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error("Failed to generate image.");
  }
};
