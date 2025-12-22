
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

// Correct model names per guidelines
const NANO_BANANA_MODEL = 'gemini-2.5-flash-image';
const PROMPT_MODEL = 'gemini-3-flash-preview';

/**
 * Creates a fresh AI instance. Moving this inside the call ensures 
 * process.env.API_KEY is accessed at the right moment in production.
 */
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }
  return new GoogleGenAI({ apiKey });
};

// --- DESCRIPTIONS ---
const LIGHTING_DETAILS: Partial<Record<LightingStyle, string>> = {
  [LightingStyle.STUDIO]: 'Even, controlled lighting. Minimal shadows. Perfect for e-commerce.',
  [LightingStyle.NATURAL]: 'Mimics sunlight. Soft shadows. Good for lifestyle and organic products.',
  [LightingStyle.CINEMATIC]: 'High contrast, dramatic shadows, moody atmosphere. Adds mystery.',
  [LightingStyle.NEON]: 'Cyberpunk style with colored rim lights (Blue/Pink). Tech & Gaming.',
  [LightingStyle.MINIMALIST]: 'Very soft, diffused light. High-key white/grey background feel.',
  [LightingStyle.PRODUCT_BOOST]: 'Punchy, high key lighting designed specifically to make colors pop.',
};

const PERSPECTIVE_DETAILS: Partial<Record<CameraPerspective, string>> = {
  [CameraPerspective.FRONT]: 'Directly facing the subject. Standard listing shot.',
  [CameraPerspective.ISOMETRIC]: '3/4 view from above. Gives a 3D technical feel.',
  [CameraPerspective.TOP_DOWN]: 'Flat lay, directly from above (90 degrees).',
  [CameraPerspective.LOW_ANGLE]: 'Worm eye view, looking up at product. Heroic scale.',
  [CameraPerspective.HIGH_ANGLE]: 'Looking down slightly (45 degrees). Shows depth.',
  [CameraPerspective.CLOSE_UP]: 'Macro shot focusing on texture and details.',
  [CameraPerspective.WIDE_ANGLE]: 'Wide angle lens, dynamic perspective.',
  [CameraPerspective.DUTCH]: 'Tilted camera for a dynamic, edgy, and energetic look.',
};

const PORTRAIT_ENV_DETAILS: Record<PortraitEnvironment, string> = {
  [PortraitEnvironment.OFFICE]: 'Modern Office: Clean, professional workspace background with soft depth of field.',
  [PortraitEnvironment.CAFE]: 'Cozy Cafe: Warm, ambient lighting with blurred coffee shop details. Casual & inviting.',
  [PortraitEnvironment.NATURE]: 'Nature: Natural outdoor setting with greenery and dappled sunlight.',
  [PortraitEnvironment.URBAN]: 'Urban Street: City streets, concrete textures, and dynamic urban energy.',
  [PortraitEnvironment.STUDIO_GREY]: 'Studio Grey: Classic neutral grey backdrop for pure focus on the subject.',
  [PortraitEnvironment.LUXURY]: 'Luxury Hotel: High-end lobby aesthetic with warm lights, wood, and rich textures.',
  [PortraitEnvironment.BEACH]: 'Sunset Beach: Bright, airy coastal vibe with warm sand and sky tones.',
};

const PORTRAIT_VIBE_DETAILS: Record<PortraitVibe, string> = {
  [PortraitVibe.PROFESSIONAL]: 'Professional: Even, flattering lighting suitable for LinkedIn, CVs, and Corporate.',
  [PortraitVibe.CANDID]: 'Candid & Soft: Soft, natural light that feels unposed, authentic and friendly.',
  [PortraitVibe.DRAMATIC]: 'Dramatic: High contrast shadows and highlights for a moody, artistic look.',
  [PortraitVibe.GOLDEN_HOUR]: 'Golden Hour: Warm, orange-hued lighting simulating sunset. Very flattering.',
  [PortraitVibe.BW]: 'Black & White: Artistic monochromatic processing with strong contrast and timeless feel.',
};

const INTERIOR_STYLE_DETAILS: Record<InteriorStyle, string> = {
  [InteriorStyle.MINIMALIST]: 'Minimalist: Clean lines, decluttered spaces, and monochromatic palettes.',
  [InteriorStyle.INDUSTRIAL]: 'Industrial: Raw elements like exposed brick, metal, and concrete. Loft vibes.',
  [InteriorStyle.SCANDINAVIAN]: 'Scandinavian: Bright, airy, functional with warm wood and white tones. Japandi.',
  [InteriorStyle.MID_CENTURY]: 'Mid-Century: Retro aesthetic with organic curves, teak wood, and olive greens.',
  [InteriorStyle.BOHEMIAN]: 'Bohemian: Eclectic, layered textures, plants, rugs, and relaxed vibes.',
  [InteriorStyle.LUXURY_CLASSIC]: 'Luxury Classic: Ornate details, moldings, chandeliers, and sophisticated elegance.',
};

const INTERIOR_MATERIAL_DETAILS: Record<InteriorMaterial, string> = {
  [InteriorMaterial.WOOD_WHITE]: 'Wood & White: Warm oak or walnut paired with crisp white surfaces.',
  [InteriorMaterial.CONCRETE_METAL]: 'Concrete & Metal: Urban, raw textures using grey concrete and black steel.',
  [InteriorMaterial.VELVET_GOLD]: 'Velvet & Gold: Soft, plush fabrics accented with metallic gold finishes.',
  [InteriorMaterial.EARTH_TONES]: 'Earth Tones: Beige, terracotta, linen, and olive greens for a grounded feel.',
  [InteriorMaterial.MARBLE_GLASS]: 'Marble & Glass: Sleek, reflective surfaces denoting high-end luxury.',
  [InteriorMaterial.COLORFUL]: 'Vibrant: Bold, vibrant color combinations for a playful and energetic look.',
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

  let systemInstruction = "";

  if (params.mode === AppMode.STUDIO) {
    const isMatchLighting = params.lighting === LightingStyle.MATCH_REFERENCE;
    const isMatchPerspective = params.perspective === CameraPerspective.MATCH_REFERENCE;

    const lightingDesc = isMatchLighting
        ? "ANALYZE carefully the Input Image's lighting direction and shadows. The generated background must match this lighting direction perfectly."
        : (params.lighting && LIGHTING_DETAILS[params.lighting]) 
            ? `${params.lighting} (${LIGHTING_DETAILS[params.lighting]})` 
            : params.lighting;

    const perspectiveDesc = (params.perspective && PERSPECTIVE_DETAILS[params.perspective])
        ? `${params.perspective} (${PERSPECTIVE_DETAILS[params.perspective]})`
        : params.perspective;

    systemInstruction = `You are an expert commercial art director. Write a descriptive image generation prompt to restyle a product photo.
    Attributes:
    - Lighting: ${lightingDesc}
    - Perspective: ${isMatchPerspective ? 'MATCH INPUT IMAGE PERSPECTIVE' : perspectiveDesc}
    - Color Strategy: ${params.colorTheory}
    Instructions:
    1. ANALYZE the attached Product Image.
    2. Describe the scene, lighting, and mood.
    3. CRITICAL: Start with "Preserve the exact details, shape, and text of the primary product."
    `;

    if (params.styleReferences && params.styleReferences.length > 0 && params.referenceTactic !== ReferenceTactic.IGNORE) {
        for (const refImg of params.styleReferences) {
            parts.push({ inlineData: { mimeType: refImg.mimeType, data: refImg.base64 } });
        }
        systemInstruction += `\n4. Use the attached additional images as STYLE REFERENCES (Tactic: ${params.referenceTactic}).`;
    }

  } else if (params.mode === AppMode.PORTRAIT) {
    const envDesc = (params.portraitEnv && PORTRAIT_ENV_DETAILS[params.portraitEnv]) || params.portraitEnv;
    const vibeDesc = (params.portraitVibe && PORTRAIT_VIBE_DETAILS[params.portraitVibe]) || params.portraitVibe;
    systemInstruction = `Expert portrait photographer instructions: Describe a scene for '${envDesc}' with '${vibeDesc}' lighting. Start with "Preserve the exact facial features, skin tone, hair, and identity of the person."`;
  } else if (params.mode === AppMode.INTERIOR) {
    const styleDesc = (params.interiorStyle && INTERIOR_STYLE_DETAILS[params.interiorStyle]) || params.interiorStyle;
    const materialDesc = (params.interiorMaterial && INTERIOR_MATERIAL_DETAILS[params.interiorMaterial]) || params.interiorMaterial;
    systemInstruction = `Interior designer instructions: Redecorate a room in '${styleDesc}' style using '${materialDesc}'. Start with "Preserve the exact structural perspective, walls, floor plan, and window placements."`;
  }

  parts.push({ text: systemInstruction });

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: PROMPT_MODEL,
      contents: { parts },
    });
    return response.text?.trim() || "A high quality professional transformation.";
  } catch (error: any) {
    console.error("Error generating prompt:", error);
    throw new Error(error.message || "Failed to connect to AI service. Check your API key.");
  }
};

export const generateImage = async (
  inputImage: ImageFile,
  prompt: string,
  aspectRatio: AspectRatio
): Promise<string> => {
  const resizedBase64 = await resizeImageToAspectRatio(
    inputImage.base64, 
    inputImage.mimeType, 
    aspectRatio
  );

  const parts: Part[] = [
    { inlineData: { mimeType: 'image/png', data: resizedBase64 } },
    { text: prompt },
  ];

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: NANO_BANANA_MODEL,
      contents: { parts },
      config: {
        imageConfig: { aspectRatio: aspectRatio }
      },
    });

    const candidate = response.candidates?.[0];
    if (candidate) {
      for (const part of candidate.content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("Generation complete but no image data returned.");
  } catch (error: any) {
    console.error("Error generating image:", error);
    throw new Error(error.message || "Failed to render pixels. Please try again.");
  }
};
