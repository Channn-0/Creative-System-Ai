export enum AspectRatio {
  SQUARE = '1:1',
  PORTRAIT = '3:4',
  LANDSCAPE = '4:3',
  WIDE = '16:9',
  TALL = '9:16',
}

export enum LightingStyle {
  STUDIO = 'Studio Lighting',
  NATURAL = 'Natural Sunlight',
  NEON = 'Cyberpunk Neon',
  CINEMATIC = 'Cinematic & Moody',
  MINIMALIST = 'Soft & Minimalist',
  PRODUCT_BOOST = 'Bright Commercial',
}

export enum CameraPerspective {
  FRONT = 'Front View',
  ISOMETRIC = 'Isometric View',
  TOP_DOWN = 'Flat Lay (Top Down)',
  LOW_ANGLE = 'Low Angle (Hero Shot)',
  HIGH_ANGLE = 'High Angle (Looking Down)',
  EYE_LEVEL = 'Eye Level (Standard)',
  CLOSE_UP = 'Macro Close-up',
  WIDE_ANGLE = 'Wide Angle',
  DUTCH = 'Dutch Angle (Dynamic Tilt)',
}

export enum ColorTheory {
  AUTO = 'AI Auto-Select',
  MONOCHROMATIC = 'Monochromatic',
  TONE = 'Tone on Tone',
  COMPLEMENTARY = 'Complementary',
  SPLIT_COMPLEMENTARY = 'Split Complementary',
  ANALOGOUS = 'Analogous',
  TRIADIC = 'Triadic',
  TETRADIC = 'Tetradic',
}

export enum ReferenceTactic {
  FULL = 'Complete Mimicry',
  STYLE = 'Visual Style (Colors/Textures)',
  LIGHTING = 'Lighting & Atmosphere',
  COMPOSITION = 'Composition & Layout',
  IGNORE = 'Do Not Use Reference',
}

export interface GenerationState {
  isGeneratingPrompt: boolean;
  isGeneratingImage: boolean;
  error: string | null;
}

export interface ImageFile {
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  imageUrl: string;
  prompt: string;
  aspectRatio: AspectRatio;
}

export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
}