
export enum AppMode {
  STUDIO = 'STUDIO',
  PORTRAIT = 'PORTRAIT',
  INTERIOR = 'INTERIOR',
}

export enum AspectRatio {
  SQUARE = '1:1',
  PORTRAIT = '3:4',
  LANDSCAPE = '4:3',
  WIDE = '16:9',
  TALL = '9:16',
  MATCH_REFERENCE = 'Match Reference',
}

// --- STUDIO MODE TYPES ---
export enum LightingStyle {
  MATCH_REFERENCE = 'Match Reference Image',
  STUDIO = 'Studio Lighting',
  NATURAL = 'Natural Sunlight',
  NEON = 'Cyberpunk Neon',
  CINEMATIC = 'Cinematic & Moody',
  MINIMALIST = 'Soft & Minimalist',
  PRODUCT_BOOST = 'Bright Commercial',
}

export enum CameraPerspective {
  MATCH_REFERENCE = 'Match Reference Perspective',
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

// --- PORTRAIT MODE TYPES ---
export enum PortraitEnvironment {
  OFFICE = 'Modern Office',
  CAFE = 'Cozy Cafe',
  NATURE = 'Outdoor Nature',
  URBAN = 'Urban Street',
  STUDIO_GREY = 'Professional Studio Grey',
  LUXURY = 'Luxury Hotel Lobby',
  BEACH = 'Sunset Beach',
}

export enum PortraitVibe {
  PROFESSIONAL = 'Professional & Sharp',
  CANDID = 'Candid & Soft',
  DRAMATIC = 'Dramatic & High Contrast',
  GOLDEN_HOUR = 'Warm Golden Hour',
  BW = 'Black & White Artistic',
}

// --- INTERIOR MODE TYPES ---
export enum InteriorStyle {
  MINIMALIST = 'Minimalist',
  INDUSTRIAL = 'Industrial Loft',
  SCANDINAVIAN = 'Scandinavian (Japandi)',
  MID_CENTURY = 'Mid-Century Modern',
  BOHEMIAN = 'Bohemian',
  LUXURY_CLASSIC = 'Luxury Classic',
}

export enum InteriorMaterial {
  WOOD_WHITE = 'Warm Wood & White',
  CONCRETE_METAL = 'Concrete & Black Metal',
  VELVET_GOLD = 'Velvet & Gold Accents',
  EARTH_TONES = 'Natural Earth Tones',
  MARBLE_GLASS = 'Marble & Glass',
  COLORFUL = 'Vibrant & Colorful',
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
  mode: AppMode;
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
