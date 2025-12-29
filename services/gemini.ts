
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

// Model configuration
const IMAGE_MODEL = 'gemini-2.5-flash-image';
const TEXT_MODEL = 'gemini-3-flash-preview';

/**
 * Generates an optimized creative prompt based on user settings.
 */
export const generateOptimizedPrompt = async (params: GeneratePromptParams): Promise<string> => {
  const parts: Part[] = [];
  
  // Primary Subject Image
  parts.push({
    inlineData: {
      mimeType: params.inputImage.mimeType,
      data: params.inputImage.base64,
    },
  });

  let systemInstruction = "You are an elite Creative Director and Master Photographer specializing in high-fidelity AI asset generation. Your goal is to output a single, dense, highly descriptive prompt string that results in a photorealistic masterpiece.";

  if (params.mode === AppMode.STUDIO) {
    const isMatchLighting = params.lighting === LightingStyle.MATCH_REFERENCE;
    const isMatchPerspective = params.perspective === CameraPerspective.MATCH_REFERENCE;

    systemInstruction += `
    \n### TASK: PROFESSIONAL PRODUCT RESTYLING
    1. CORE IDENTITY: Absolute preservation of the primary product's shape, silhouettes, branding, labels, and text. No hallucinations on the product itself.
    2. SCENE SETTING: Place the product in a high-end, premium studio or environmental setting.
    3. LIGHTING: ${isMatchLighting ? 'Analyze and replicate the exact lighting rigs from the Reference Image.' : params.lighting}
    4. ANGLE: ${isMatchPerspective ? 'Replicate the precise lens focal length and camera angle of the Reference Image.' : params.perspective}
    5. COLOR: Apply a ${params.colorTheory} color grade with professional chromatic balance.
    6. TEXTURE: Ensure macro-level detail on surfaces, including realistic reflections and refractive properties.
    `;

    if (params.styleReferences?.length && params.referenceTactic !== ReferenceTactic.IGNORE) {
        params.styleReferences.forEach(ref => parts.push({ 
          inlineData: { mimeType: ref.mimeType, data: ref.base64 } 
        }));

        if (params.referenceTactic === ReferenceTactic.FULL) {
            systemInstruction += `
            \n### CRITICAL: TRUE COMPLETE MIMICRY PROTOCOL
            - Perform a forensic visual extraction from the attached Reference Image.
            - LIGHTING & SHADOW FALL-OFF: Meticulously replicate the directional light quality. Pay special attention to the lighting fall-off.
            - TEXTURAL CONGRUENCE: Match the material properties of the surfaces in the reference image.
            - ATMOSPHERE: Reconstruct the global illumination and bounce light hues.
            - INTEGRATION: The product must look as if it was physically present during the original photoshoot of the reference image.`;
        }
    }
  } else if (params.mode === AppMode.PORTRAIT) {
    systemInstruction += `
    \n### TASK: HIGH-END PORTRAIT GENERATION
    - SUBJECT PRESERVATION: Maintain exact facial features, skin texture, and hair identity of the input subject.
    - ENVIRONMENT: ${params.portraitEnv}.
    - LIGHTING & VIBE: ${params.portraitVibe}.
    - TECHNICAL: Cinematic depth of field, 85mm lens feel, soft eye catchlights.`;
  } else if (params.mode === AppMode.INTERIOR) {
    systemInstruction += `
    \n### TASK: INTERIOR ARCHITECTURAL TRANSFORMATION
    - STRUCTURAL INTEGRITY: Preserve the exact room layout, window placements, and perspective lines.
    - DESIGN AESTHETIC: ${params.interiorStyle}.
    - MATERIALS: Focus on ${params.interiorMaterial}.`;
  }

  systemInstruction += "\n\nOUTPUT ONLY THE FINAL PROMPT STRING. DO NOT INCLUDE ANY PREAMBLE OR EXPLANATION.";

  parts.push({ text: systemInstruction });

  try {
    // FRESH INSTANCE: Ensure the latest session/API key is used
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: { parts },
      config: { temperature: 0.8 }
    });
    return response.text?.trim() || "Commercial studio product photography, hyper-realistic, 8k resolution.";
  } catch (error: any) {
    console.error("Prompt error:", error);
    throw new Error(error.message || "Failed to generate prompt logic.");
  }
};

/**
 * Renders the final pixel-perfect image using the optimized prompt.
 */
export const generateImage = async (
  inputImage: ImageFile,
  prompt: string,
  aspectRatio: AspectRatio | string
): Promise<string> => {
  const resizedBase64 = await resizeImageToAspectRatio(inputImage.base64, inputImage.mimeType, aspectRatio);
  const parts: Part[] = [
    { inlineData: { mimeType: 'image/png', data: resizedBase64 } },
    { text: prompt }
  ];

  try {
    // FRESH INSTANCE: Required for image models to work with linked sessions
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: { parts },
      config: {
        imageConfig: { aspectRatio: aspectRatio as any } 
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
    throw new Error("No image data returned from Gemini.");
  } catch (error: any) {
    console.error("Image error:", error);
    throw new Error(error.message || "Failed to render pixels.");
  }
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
