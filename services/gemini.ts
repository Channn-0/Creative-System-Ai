
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

// Upgrading to High-Quality Pro models as required for managed key selection
const PRO_IMAGE_MODEL = 'gemini-3-pro-image-preview';
const PRO_TEXT_MODEL = 'gemini-3-pro-preview';

/**
 * Creates a fresh AI instance at the moment of the request.
 * This ensures we use the most up-to-date API key from the selection dialog.
 */
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found. Please click 'Connect to Gemini' in the setup menu.");
  }
  return new GoogleGenAI({ apiKey });
};

// --- DESCRIPTIONS ---
const LIGHTING_DETAILS: Partial<Record<LightingStyle, string>> = {
  [LightingStyle.STUDIO]: 'Even, controlled lighting. Minimal shadows. High-end e-commerce style.',
  [LightingStyle.NATURAL]: 'Soft, organic sunlight. Natural shadows and warmth.',
  [LightingStyle.CINEMATIC]: 'High contrast, moody atmosphere with deep shadows and sharp highlights.',
  [LightingStyle.NEON]: 'Vibrant colored lighting with cyan and magenta rim lights. Cyberpunk aesthetic.',
  [LightingStyle.MINIMALIST]: 'High-key, diffused lighting. Very clean and airy.',
  [LightingStyle.PRODUCT_BOOST]: 'Punchy, vibrant commercial lighting that enhances product materials.',
};

const PERSPECTIVE_DETAILS: Partial<Record<CameraPerspective, string>> = {
  [CameraPerspective.FRONT]: 'Directly facing the subject at eye-level.',
  [CameraPerspective.ISOMETRIC]: '3/4 isometric view from a slightly elevated angle.',
  [CameraPerspective.TOP_DOWN]: '90-degree flat lay view from directly above.',
  [CameraPerspective.LOW_ANGLE]: 'Looking up at the subject to give it a heroic, large-scale feel.',
  [CameraPerspective.HIGH_ANGLE]: 'Looking down from a 45-degree angle.',
  [CameraPerspective.CLOSE_UP]: 'Macro focus on intricate details and textures.',
  [CameraPerspective.WIDE_ANGLE]: 'Dynamic wide-angle lens perspective with deep focus.',
  [CameraPerspective.DUTCH]: 'Tilted camera for a dynamic, edgy, and high-energy composition.',
};

interface GeneratePromptParams {
  mode: AppMode;
  inputImage: ImageFile;
  aspectRatio: AspectRatio;
  lighting?: LightingStyle;
  perspective?: CameraPerspective;
  colorTheory?: ColorTheory;
  styleReferences?: ImageFile[];
  referenceTactic?: ReferenceTactic;
  portraitEnv?: PortraitEnvironment;
  portraitVibe?: PortraitVibe;
  interiorStyle?: InteriorStyle;
  interiorMaterial?: InteriorMaterial;
}

export const generateOptimizedPrompt = async (params: GeneratePromptParams): Promise<string> => {
  const parts: Part[] = [];
  parts.push({
    inlineData: {
      mimeType: params.inputImage.mimeType,
      data: params.inputImage.base64,
    },
  });

  let systemInstruction = "You are a world-class creative director at a high-end photography studio. Output ONLY the raw prompt string.";

  if (params.mode === AppMode.STUDIO) {
    const isMatchLighting = params.lighting === LightingStyle.MATCH_REFERENCE;
    const isMatchPerspective = params.perspective === CameraPerspective.MATCH_REFERENCE;

    systemInstruction += `\nCreate an intricate restyling prompt for this product.
    - Style: ${isMatchLighting ? 'Match Input Lighting' : params.lighting}
    - Perspective: ${isMatchPerspective ? 'Match Input Perspective' : params.perspective}
    - Color: ${params.colorTheory}
    - Requirement: Start with "Preserve the exact shape, labels, and text of the primary product."
    `;
    if (params.styleReferences?.length && params.referenceTactic !== ReferenceTactic.IGNORE) {
        params.styleReferences.forEach(ref => parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.base64 } }));
        systemInstruction += `\n- Mimic the style and atmosphere of the attached reference images.`;
    }
  } else if (params.mode === AppMode.PORTRAIT) {
    systemInstruction += `\nCreate a professional portrait prompt.
    - Environment: ${params.portraitEnv}
    - Lighting: ${params.portraitVibe}
    - Requirement: Start with "Preserve the exact identity, facial features, and hair of the subject."`;
  } else if (params.mode === AppMode.INTERIOR) {
    systemInstruction += `\nCreate a room transformation prompt.
    - Style: ${params.interiorStyle}
    - Material: ${params.interiorMaterial}
    - Requirement: Start with "Preserve the exact room layout and structural perspective."`;
  }

  parts.push({ text: systemInstruction });

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: PRO_TEXT_MODEL,
      contents: { parts },
      config: { 
        temperature: 0.7,
        // Removed explicit thinkingBudget: 0 as it's invalid for this model version
      }
    });
    return response.text?.trim() || "High quality studio photography.";
  } catch (error: any) {
    console.error("Prompt error:", error);
    throw new Error(error.message || "Failed to generate prompt logic.");
  }
};

export const generateImage = async (
  inputImage: ImageFile,
  prompt: string,
  aspectRatio: AspectRatio
): Promise<string> => {
  const resizedBase64 = await resizeImageToAspectRatio(inputImage.base64, inputImage.mimeType, aspectRatio);
  const parts: Part[] = [
    { inlineData: { mimeType: 'image/png', data: resizedBase64 } },
    { text: prompt }
  ];

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: PRO_IMAGE_MODEL,
      contents: { parts },
      config: {
        imageConfig: { aspectRatio, imageSize: "1K" }
      },
    });

    const candidate = response.candidates?.[0];
    if (candidate) {
      for (const part of candidate.content.parts) {
        if (part.inlineData?.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image data returned from Gemini Pro.");
  } catch (error: any) {
    console.error("Image error:", error);
    // Handle specific Pro model key selection error
    if (error.message?.includes("Requested entity was not found")) {
        throw new Error("API Project mismatch. Please reconnect your API Key.");
    }
    throw new Error(error.message || "Failed to render high-quality pixels.");
  }
};
