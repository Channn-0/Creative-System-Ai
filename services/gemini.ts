import { GoogleGenAI, Part } from "@google/genai";
import { AspectRatio, LightingStyle, CameraPerspective, ColorTheory, ReferenceTactic, ImageFile } from "../types";
import { resizeImageToAspectRatio } from "../utils";

// Initialize the API client
// Note: We create a new instance in the functions to ensure we pick up the latest env var if it changes,
// though typically process.env.API_KEY is static.
const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const NANO_BANANA_MODEL = 'gemini-2.5-flash-image';
const PROMPT_MODEL = 'gemini-2.5-flash';

interface GeneratePromptParams {
  productImage: ImageFile;
  aspectRatio: AspectRatio;
  lighting: LightingStyle;
  perspective: CameraPerspective;
  colorTheory: ColorTheory;
  styleReferences: ImageFile[];
  referenceTactic: ReferenceTactic;
}

/**
 * Generates a detailed text prompt using Gemini Flash (Text model).
 * It analyzes the style reference (if present) and combines it with user parameters.
 */
export const generateOptimizedPrompt = async (params: GeneratePromptParams): Promise<string> => {
  const ai = getAIClient();
  
  let userInstruction = `You are an expert AI art director. 
  Your task is to write a highly detailed, descriptive image generation prompt used to edit/restyle a product photo.
  
  The user wants the final image to have these attributes:
  - Aspect Ratio target: ${params.aspectRatio}
  - Lighting Style: ${params.lighting}
  - Camera Perspective: ${params.perspective}
  - Color Theory Strategy: ${params.colorTheory}
  
  Instructions:
  1. ANALYZE the attached Product Image (the first image). Identify its primary and secondary colors.
  2. Apply the selected Color Theory ("${params.colorTheory}") to choose background colors and environmental elements that harmonize with the product.
     - If "Monochromatic": Use shades/tints of the product color.
     - If "Complementary": Use colors opposite to the product on the color wheel.
     - If "Analogous": Use colors adjacent to the product color.
     - If "AI Auto-Select": Choose the most aesthetically pleasing color palette for this specific product type.
  3. Describe the background, lighting, and mood in vivid detail matching the selected attributes and calculated color palette.
  4. Ensure the product remains the central focus but sits naturally in this new environment.
  5. Do NOT include phrases like "generated image", "aspect ratio" or "edit". Focus on visual descriptions of the scene.
  6. CRITICAL: Include the instruction "Preserve the exact details, shape, text, and appearance of the primary product in the input image" at the start of the prompt.
  7. Output ONLY the raw prompt text.`;

  const parts: Part[] = [];

  // Add Product Image for analysis (Critical for Color Theory)
  parts.push({
    inlineData: {
      mimeType: params.productImage.mimeType,
      data: params.productImage.base64,
    },
  });

  if (params.styleReferences && params.styleReferences.length > 0 && params.referenceTactic !== ReferenceTactic.IGNORE) {
    let tacticSpecifics = "";
    
    switch (params.referenceTactic) {
        case ReferenceTactic.STYLE:
            tacticSpecifics = "Focus exclusively on extracting the color palette, textures, and material artistic style (e.g. marble, wood, neon). Ignore the subject matter and layout of the references.";
            break;
        case ReferenceTactic.LIGHTING:
            tacticSpecifics = "Focus exclusively on extracting the lighting setup, shadow qualities, direction of light, and atmospheric mood. Ignore the colors and composition.";
            break;
        case ReferenceTactic.COMPOSITION:
            tacticSpecifics = "Focus exclusively on the camera angle, framing, depth of field, and geometric arrangement of elements. Ignore the specific colors and lighting.";
            break;
        case ReferenceTactic.FULL:
        default:
            tacticSpecifics = "Analyze and describe the overall visual style, including lighting, colors, textures, and composition.";
            break;
    }

    userInstruction += `\n\n8. CRITICAL: ${params.styleReferences.length} Style Reference Image(s) are attached.
    - TACTIC Selected: ${params.referenceTactic}.
    - ${tacticSpecifics}
    - Describe these specific attributes in detail so the generation model can replicate this aspect.
    - Do NOT refer to them as "the reference images". The image generation model will NOT see these reference images, so you must translate their style completely into descriptive text words.
    - Synthesize a cohesive style description from these references.`;
    
    // Append all style references
    for (const refImg of params.styleReferences) {
        parts.push({
            inlineData: {
                mimeType: refImg.mimeType,
                data: refImg.base64,
            },
        });
    }
  }

  parts.push({ text: userInstruction });

  try {
    const response = await ai.models.generateContent({
      model: PROMPT_MODEL,
      contents: { parts },
    });
    return response.text?.trim() || "A high quality product photo. Preserve the product exactly.";
  } catch (error) {
    console.error("Error generating prompt:", error);
    throw new Error("Failed to generate prompt. Please check your API key and try again.");
  }
};

/**
 * Generates the final image using Gemini Nano Banana (gemini-2.5-flash-image).
 * It takes the product image and the generated prompt.
 */
export const generateProductImage = async (
  productImage: ImageFile,
  prompt: string,
  aspectRatio: AspectRatio
): Promise<string> => {
  const ai = getAIClient();

  // 1. Resize/Pad the input image to match the target aspect ratio
  // This ensures the composition is correct (e.g. 16:9 product shot) without the model
  // having to stretch or guess the canvas bounds.
  // We use PNG for the intermediate resized file to preserve quality.
  const resizedBase64 = await resizeImageToAspectRatio(
    productImage.base64, 
    productImage.mimeType, 
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
      // Reinforce product preservation in the final call
      text: "Preserve the exact details of the product. " + prompt,
    },
  ];

  try {
    const response = await ai.models.generateContent({
      model: NANO_BANANA_MODEL,
      contents: { parts },
      config: {
        // Nano banana supports aspectRatio in imageConfig
        imageConfig: {
          aspectRatio: aspectRatio,
        }
      },
    });

    // Parse response for image
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
    throw new Error("Failed to generate image. Please ensure your API key is valid for Gemini 2.5 models.");
  }
};