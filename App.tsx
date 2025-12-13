
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Sparkles, Wand2, Download, AlertCircle, X, ZoomIn, 
    Sun, Moon, RefreshCw, Trash2
} from 'lucide-react';
import { ImageUpload } from './components/ImageUpload';
import { Select } from './components/Select';
import { Button } from './components/Button';
import { HistorySidebar } from './components/HistorySidebar';
import { Navigation } from './components/Navigation';
import { VisualHelper } from './components/VisualHelper';
import { 
    AppMode,
    AspectRatio, LightingStyle, CameraPerspective, ColorTheory, ReferenceTactic, 
    PortraitEnvironment, PortraitVibe,
    InteriorStyle, InteriorMaterial,
    ImageFile, GenerationState, HistoryItem 
} from './types';
import { generateOptimizedPrompt, generateImage } from './services/gemini';
import { downloadImage } from './utils';

// --- COLOR WHEEL SVG GENERATOR ---
const generateColorWheelPreview = (type: ColorTheory): string => {
  // SVG Configuration
  const width = 400; // Increased width for text labels
  const height = 380; 
  const centerX = width / 2;
  const centerY = 150; // Keep wheel at top
  const radius = 120;
  const innerRadius = 70;
  
  // Stroke is white as requested
  const strokeColor = "#ffffff"; 
  const strokeWidth = 5;
  
  // 12 Color Segments (HSL)
  const segments = Array.from({ length: 12 }, (_, i) => {
    const startAngle = (i * 30) - 15; // Offset to center top segment
    const endAngle = startAngle + 30;
    
    // Convert polar to cartesian
    const toRad = (deg: number) => (deg - 90) * Math.PI / 180;
    
    const x1 = centerX + radius * Math.cos(toRad(startAngle));
    const y1 = centerY + radius * Math.sin(toRad(startAngle));
    const x2 = centerX + radius * Math.cos(toRad(endAngle));
    const y2 = centerY + radius * Math.sin(toRad(endAngle));
    
    const x3 = centerX + innerRadius * Math.cos(toRad(endAngle));
    const y3 = centerY + innerRadius * Math.sin(toRad(endAngle));
    const x4 = centerX + innerRadius * Math.cos(toRad(startAngle));
    const y4 = centerY + innerRadius * Math.sin(toRad(startAngle));

    const pathData = `
      M ${x1} ${y1}
      A ${radius} ${radius} 0 0 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${innerRadius} ${innerRadius} 0 0 0 ${x4} ${y4}
      Z
    `;
    
    // HSL Color: Start from Red (0) at top (index 0)
    const hue = i * 30;
    const color = `hsl(${hue}, 85%, 60%)`;
    
    return { path: pathData, color, index: i };
  });

  // Helper to draw connection lines/shapes
  const getCoords = (index: number, r: number = innerRadius + (radius - innerRadius)/2) => {
    const angle = (index * 30);
    const rad = (angle - 90) * Math.PI / 180;
    return {
      x: centerX + r * Math.cos(rad),
      y: centerY + r * Math.sin(rad)
    };
  };

  const drawCircle = (index: number) => {
    const { x, y } = getCoords(index);
    return `<circle cx="${x}" cy="${y}" r="14" fill="transparent" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;
  };

  // Helper for the bottom shade bar
  const drawShadeBar = (hue: number) => {
      const barWidth = 240;
      const barHeight = 40;
      const startX = (width - barWidth) / 2;
      const startY = 300;
      const blocks = 7;
      const blockWidth = barWidth / blocks;
      
      let rects = '';
      for(let i=0; i<blocks; i++) {
        // Lightness from 40% to 90%
        const l = 40 + (i * (55 / (blocks-1))); 
        const color = `hsl(${hue}, 85%, ${l}%)`;
        rects += `<rect x="${startX + i*blockWidth}" y="${startY}" width="${blockWidth}" height="${barHeight}" fill="${color}" stroke="white" stroke-width="1" />`;
      }
      return `<g>${rects}</g>`;
  };

  let overlay = '';
  let rotation = 0;

  switch (type) {
    case ColorTheory.TONE:
      // Tone on Tone: Replaced with Cool/Warm diagram (Rotated Wheel + Text)
      // Rotate 90deg so Red (Warm) is Right, Cyan (Cool) is Left
      rotation = 90; 
      // Add Labels
      overlay += `<text x="40" y="${centerY}" fill="white" font-family="sans-serif" font-weight="bold" font-size="20" dominant-baseline="middle" text-anchor="start">COOL</text>`;
      overlay += `<text x="${width-40}" y="${centerY}" fill="white" font-family="sans-serif" font-weight="bold" font-size="20" dominant-baseline="middle" text-anchor="end">WARM</text>`;
      break;

    case ColorTheory.MONOCHROMATIC:
       // Monochromatic: Green (Index 4 -> 120deg) + Shade Bar
       overlay += drawShadeBar(120);
       overlay += drawCircle(4);
      break;

    case ColorTheory.COMPLEMENTARY:
      // 0 and 6
      const c1 = getCoords(0);
      const c2 = getCoords(6);
      overlay += `<line x1="${c1.x}" y1="${c1.y}" x2="${c2.x}" y2="${c2.y}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;
      overlay += drawCircle(0);
      overlay += drawCircle(6);
      break;

    case ColorTheory.SPLIT_COMPLEMENTARY:
      // 0, 5, 7
      const sc1 = getCoords(0);
      const sc2 = getCoords(5);
      const sc3 = getCoords(7);
      overlay += `<path d="M ${sc1.x} ${sc1.y} L ${centerX} ${centerY} L ${sc2.x} ${sc2.y} M ${centerX} ${centerY} L ${sc3.x} ${sc3.y}" stroke="${strokeColor}" stroke-width="${strokeWidth}" fill="none" />`;
      overlay += drawCircle(0);
      overlay += drawCircle(5);
      overlay += drawCircle(7);
      break;

    case ColorTheory.ANALOGOUS:
      // 11, 0, 1
      const a1 = getCoords(11);
      const a2 = getCoords(1);
      // Curve connecting them
      overlay += `<path d="M ${a1.x} ${a1.y} Q ${centerX} ${centerY-radius-20} ${a2.x} ${a2.y}" stroke="${strokeColor}" stroke-width="${strokeWidth}" fill="none" />`;
      overlay += drawCircle(11);
      overlay += drawCircle(0);
      overlay += drawCircle(1);
      break;

    case ColorTheory.TRIADIC:
      // 0, 4, 8
      const t1 = getCoords(0);
      const t2 = getCoords(4);
      const t3 = getCoords(8);
      overlay += `<polygon points="${t1.x},${t1.y} ${t2.x},${t2.y} ${t3.x},${t3.y}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;
      overlay += drawCircle(0);
      overlay += drawCircle(4);
      overlay += drawCircle(8);
      break;

    case ColorTheory.TETRADIC:
      // 0, 3, 6, 9 (Square)
      const q1 = getCoords(0);
      const q2 = getCoords(3);
      const q3 = getCoords(6);
      const q4 = getCoords(9);
      overlay += `<polygon points="${q1.x},${q1.y} ${q2.x},${q2.y} ${q3.x},${q3.y} ${q4.x},${q4.y}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;
      overlay += drawCircle(0);
      overlay += drawCircle(3);
      overlay += drawCircle(6);
      overlay += drawCircle(9);
      break;

    default:
        // Auto - Rainbow center
        overlay += `<circle cx="${centerX}" cy="${centerY}" r="${innerRadius-10}" fill="url(#rainbow)" opacity="0.3" />`;
        break;
  }

  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="rainbow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ff0000" />
            <stop offset="100%" stop-color="#0000ff" />
        </linearGradient>
      </defs>
      <g transform="rotate(${rotation} ${centerX} ${centerY})">
        ${segments.map(s => `<path d="${s.path}" fill="${s.color}" stroke="white" stroke-width="2" />`).join('')}
      </g>
      <g>
        ${overlay}
      </g>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svgString)}`;
};

const App: React.FC = () => {
  // --- STATE ---
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.STUDIO);
  
  // Inputs
  const [inputImages, setInputImages] = useState<ImageFile[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [styleImages, setStyleImages] = useState<ImageFile[]>([]);
  const [useReference, setUseReference] = useState(true);

  // Mode Specific Configs
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  // Studio
  const [lighting, setLighting] = useState<LightingStyle>(LightingStyle.STUDIO);
  const [perspective, setPerspective] = useState<CameraPerspective>(CameraPerspective.FRONT);
  const [colorTheory, setColorTheory] = useState<ColorTheory>(ColorTheory.AUTO);
  const [referenceTactic, setReferenceTactic] = useState<ReferenceTactic>(ReferenceTactic.FULL);
  // Portrait
  const [portraitEnv, setPortraitEnv] = useState<PortraitEnvironment>(PortraitEnvironment.OFFICE);
  const [portraitVibe, setPortraitVibe] = useState<PortraitVibe>(PortraitVibe.PROFESSIONAL);
  // Interior
  const [interiorStyle, setInteriorStyle] = useState<InteriorStyle>(InteriorStyle.MINIMALIST);
  const [interiorMaterial, setInteriorMaterial] = useState<InteriorMaterial>(InteriorMaterial.WOOD_WHITE);

  // Generation
  const [promptText, setPromptText] = useState<string>('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<GenerationState>({
    isGeneratingPrompt: false,
    isGeneratingImage: false,
    error: null,
  });

  // UI Toggles
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [activeHelper, setActiveHelper] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // --- EFFECT: Theme & History Load ---
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    
    const savedHistory = localStorage.getItem('n-era-history');
    if (savedHistory) {
      try { setHistory(JSON.parse(savedHistory)); } catch (e) {}
    }
  }, [isDarkMode]);

  // --- EFFECT: Match Reference Logic ---
  useEffect(() => {
    if (currentMode === AppMode.STUDIO && referenceTactic === ReferenceTactic.FULL && styleImages.length > 0) {
        // Automatically suggest "Match Reference" if using full mimicry
        if (lighting !== LightingStyle.MATCH_REFERENCE) setLighting(LightingStyle.MATCH_REFERENCE);
        if (perspective !== CameraPerspective.MATCH_REFERENCE) setPerspective(CameraPerspective.MATCH_REFERENCE);
    }
  }, [referenceTactic, styleImages, currentMode]);

  const activeInputImage = inputImages.length > 0 && inputImages[selectedImageIndex] ? inputImages[selectedImageIndex] : null;

  // --- DATA & PRELOADING ---

  // Image URL Generators
  
  // STUDIO: Consistent Tube
  const getTubePreview = (styleDetail: string) => {
    const baseSubject = "minimalist white cosmetic cream tube standing on a beige rectangular block podium, solid beige background, 3d render style product photography";
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(`${baseSubject}, ${styleDetail}, high quality 8k`) }?width=600&height=450&nologo=true`;
  };

  // PORTRAIT: Consistent Woman (New)
  const getPortraitPreview = (detail: string) => {
    const baseSubject = "professional portrait photography of a confident young woman, looking at camera";
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(`${baseSubject}, ${detail}, high quality 8k, photorealistic`) }?width=600&height=450&nologo=true`;
  };

  // INTERIOR: Consistent Living Room (New)
  const getInteriorPreview = (detail: string) => {
    const baseSubject = "interior design photography of a spacious living room with large window";
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(`${baseSubject}, ${detail}, high quality 8k, photorealistic`) }?width=600&height=450&nologo=true`;
  };

  // Keep generic as fallback
  const getPreview = (keyword: string) => `https://image.pollinations.ai/prompt/${encodeURIComponent(keyword + " high quality 8k photorealistic") }?width=600&height=450&nologo=true`;


  // Specific Descriptions for Color Theory
  const colorTheoryDescriptions: Record<ColorTheory, string> = {
    [ColorTheory.AUTO]: 'AI automatically analyzes your product\'s color palette and selects the most harmonious background colors.',
    [ColorTheory.MONOCHROMATIC]: 'Uses variations in lightness and saturation of a single color. Clean, cohesive, and minimalist.',
    [ColorTheory.TONE]: 'Uses distinct color temperatures (Warm vs Cool) to set the mood of the image.',
    [ColorTheory.COMPLEMENTARY]: 'Pairs colors from opposite sides of the wheel (e.g., Blue & Orange). High contrast and vibrant.',
    [ColorTheory.SPLIT_COMPLEMENTARY]: 'Uses a base color plus the two colors adjacent to its complement. High contrast but less tension.',
    [ColorTheory.ANALOGOUS]: 'Uses colors that are next to each other on the wheel. Harmonious and pleasing to the eye.',
    [ColorTheory.TRIADIC]: 'Uses three colors evenly spaced around the wheel. Offers high contrast while retaining harmony.',
    [ColorTheory.TETRADIC]: 'Uses four colors arranged into two complementary pairs. Rich, complex, and colorful.'
  };

  // Memoized Helper Data (Single Source of Truth)
  const helperData = useMemo(() => ({
    LIGHTING: {
        title: "Lighting Styles",
        items: [
            { label: 'Match Reference', desc: 'Analyzes your uploaded reference photo and copies its lighting exactly.', imageUrl: getTubePreview('digital scanning grid effect, analyzing reference, split screen') },
            { label: 'Studio', desc: 'Even, controlled lighting. Minimal shadows. Perfect for e-commerce.', imageUrl: getTubePreview('soft bright even studio lighting, white softbox reflection') },
            { label: 'Natural', desc: 'Mimics sunlight. Soft shadows. Good for lifestyle and organic products.', imageUrl: getTubePreview('natural hard sunlight, leaf shadows, organic feel') },
            { label: 'Cinematic', desc: 'High contrast, dramatic shadows, moody atmosphere. Adds mystery.', imageUrl: getTubePreview('dramatic cinematic lighting, low key, dark shadows, mystery') },
            { label: 'Neon', desc: 'Cyberpunk style with colored rim lights (Blue/Pink). Tech & Gaming.', imageUrl: getTubePreview('cyberpunk neon blue and pink rim lighting, dark background') },
            { label: 'Minimalist', desc: 'Very soft, diffused light. High-key white/grey background feel.', imageUrl: getTubePreview('minimalist high key lighting, very soft white diffusion, ethereal') },
            { label: 'Product Boost', desc: 'Punchy, high key lighting designed specifically to make colors pop.', imageUrl: getTubePreview('vibrant commercial lighting, high saturation, sharp details') }
        ]
    },
    ANGLE: {
        title: "Camera Angles",
        items: [
            { label: 'Match Reference', desc: 'Mimics the exact camera position of your reference photo.', imageUrl: getTubePreview('digital viewfinder overlay, analyzing perspective') },
            { label: 'Front', desc: 'Directly facing the subject. Standard listing shot.', imageUrl: getTubePreview('straight front view, eye level, symmetrical') },
            { label: 'Isometric', desc: '3/4 view from above. Gives a 3D technical feel.', imageUrl: getTubePreview('isometric view, 3/4 angle from above, 3d technical look') },
            { label: 'Flat Lay', desc: 'Directly from above (90 degrees). Good for collections and kits.', imageUrl: getTubePreview('flat lay, top down view directly above, 90 degrees') },
            { label: 'Low Angle', desc: 'Camera looks up at product. Makes it look heroic/large.', imageUrl: getTubePreview('worm eye view, low angle looking up, heroic scale') },
            { label: 'High Angle', desc: 'Looking down slightly. Good for showing depth and dimension.', imageUrl: getTubePreview('high angle looking down 45 degrees, depth') },
            { label: 'Close Up', desc: 'Macro shot focusing on texture and details.', imageUrl: getTubePreview('extreme macro close up, focus on cap texture and details') },
            { label: 'Dutch Angle', desc: 'Tilted camera for a dynamic, edgy, and energetic look.', imageUrl: getTubePreview('dutch angle, tilted camera frame, dynamic diagonal') }
        ]
    },
    COLOR_THEORY: {
        title: "Color Theory",
        items: Object.values(ColorTheory).map(c => ({
            label: c, 
            desc: colorTheoryDescriptions[c as ColorTheory],
            imageUrl: generateColorWheelPreview(c as ColorTheory) // Using custom generator
        }))
    },
    PORTRAIT_ENV: {
        title: "Portrait Environment",
        items: [
            { label: 'Modern Office', desc: 'Clean, professional workspace background with soft depth of field.', imageUrl: getPortraitPreview('modern corporate office interior background, blurred bokeh') },
            { label: 'Cozy Cafe', desc: 'Warm, ambient lighting with blurred coffee shop details. Casual & inviting.', imageUrl: getPortraitPreview('cozy coffee shop interior warm lighting background, blurred bokeh') },
            { label: 'Nature', desc: 'Natural outdoor setting with greenery and dappled sunlight.', imageUrl: getPortraitPreview('outdoor nature park background with green trees, blurred bokeh') },
            { label: 'Urban Street', desc: 'City streets, concrete textures, and dynamic urban energy.', imageUrl: getPortraitPreview('urban city street background, busy, blurred bokeh') },
            { label: 'Studio Grey', desc: 'Classic neutral grey backdrop for pure focus on the subject.', imageUrl: getPortraitPreview('professional studio photography grey seamless backdrop') },
            { label: 'Luxury Hotel', desc: 'High-end lobby aesthetic with warm lights, wood, and rich textures.', imageUrl: getPortraitPreview('luxury hotel lobby interior background, gold and wood, blurred bokeh') },
            { label: 'Sunset Beach', desc: 'Bright, airy coastal vibe with warm sand and sky tones.', imageUrl: getPortraitPreview('sunset beach coastal background, golden hour, blurred bokeh') }
        ]
    },
    PORTRAIT_VIBE: {
        title: "Vibe & Lighting",
        items: [
            { label: 'Professional', desc: 'Even, flattering lighting suitable for LinkedIn, CVs, and Corporate.', imageUrl: getPortraitPreview('professional headshot lighting, clean sharp focus, neutral expression') },
            { label: 'Candid & Soft', desc: 'Soft, natural light that feels unposed, authentic and friendly.', imageUrl: getPortraitPreview('soft natural light portrait photography, candid moment, slight smile, authentic') },
            { label: 'Dramatic', desc: 'High contrast shadows and highlights for a moody, artistic look.', imageUrl: getPortraitPreview('dramatic portrait lighting, chiaroscuro, high contrast, moody shadow') },
            { label: 'Golden Hour', desc: 'Warm, orange-hued lighting simulating sunset. Very flattering.', imageUrl: getPortraitPreview('golden hour sunset lighting portrait photography, warm orange glow, lens flare') },
            { label: 'Black & White', desc: 'Artistic monochromatic processing with strong contrast and timeless feel.', imageUrl: getPortraitPreview('black and white artistic portrait photography, high contrast, monochrome') }
        ]
    },
    INTERIOR_STYLE: {
        title: "Design Style",
        items: [
            { label: 'Minimalist', desc: 'Clean lines, decluttered spaces, and monochromatic palettes.', imageUrl: getInteriorPreview('minimalist interior design, white walls, clean lines, decluttered, zen') },
            { label: 'Industrial', desc: 'Raw elements like exposed brick, metal, and concrete. Loft vibes.', imageUrl: getInteriorPreview('industrial loft interior design, exposed brick walls, concrete floor, black metal accents') },
            { label: 'Scandinavian', desc: 'Bright, airy, functional with warm wood and white tones. Japandi.', imageUrl: getInteriorPreview('scandinavian interior design, bright, warm light wood, white walls, hygge, japandi') },
            { label: 'Mid-Century', desc: 'Retro aesthetic with organic curves, teak wood, and olive greens.', imageUrl: getInteriorPreview('mid century modern living room interior design, teak furniture, retro aesthetic, olive green') },
            { label: 'Bohemian', desc: 'Eclectic, layered textures, plants, rugs, and relaxed vibes.', imageUrl: getInteriorPreview('bohemian interior design, many plants, layered rugs, eclectic textures, relaxed') },
            { label: 'Luxury Classic', desc: 'Ornate details, moldings, chandeliers, and sophisticated elegance.', imageUrl: getInteriorPreview('luxury classic interior design, chandelier, wall molding, sophisticated elegance, expensive') },
            { label: 'Cyberpunk', desc: 'Neon lights, dark tones, and futuristic tech elements.', imageUrl: getInteriorPreview('cyberpunk interior room, neon blue and pink lights, futuristic tech, dark atmosphere') }
        ]
    },
    INTERIOR_MATERIAL: {
        title: "Materials & Finishes",
        items: [
            { label: 'Wood & White', desc: 'Warm oak or walnut paired with crisp white surfaces.', imageUrl: getInteriorPreview('interior featuring warm oak wood furniture and crisp white walls texture') },
            { label: 'Concrete & Metal', desc: 'Urban, raw textures using grey concrete and black steel.', imageUrl: getInteriorPreview('interior featuring raw grey concrete walls and black steel furniture texture') },
            { label: 'Velvet & Gold', desc: 'Soft, plush fabrics accented with metallic gold finishes.', imageUrl: getInteriorPreview('interior featuring plush velvet furniture and metallic gold accents texture') },
            { label: 'Earth Tones', desc: 'Beige, terracotta, linen, and olive greens for a grounded feel.', imageUrl: getInteriorPreview('interior featuring earth tones, beige, terracotta, linen fabric, olive green') },
            { label: 'Marble & Glass', desc: 'Sleek, reflective surfaces denoting high-end luxury.', imageUrl: getInteriorPreview('interior featuring white marble floors and glass surfaces, high end luxury') },
            { label: 'Vibrant', desc: 'Bold, vibrant color combinations for a playful and energetic look.', imageUrl: getInteriorPreview('interior featuring vibrant colorful furniture, bold patterns, energetic colors') }
        ]
    }
  }), []);

  // Preload Images Effect
  useEffect(() => {
    // Determine which categories to preload based on mode
    const categoriesToPreload: (keyof typeof helperData)[] = [];
    
    if (currentMode === AppMode.STUDIO) {
        categoriesToPreload.push('LIGHTING', 'ANGLE', 'COLOR_THEORY');
    } else if (currentMode === AppMode.PORTRAIT) {
        categoriesToPreload.push('PORTRAIT_ENV', 'PORTRAIT_VIBE');
    } else if (currentMode === AppMode.INTERIOR) {
        categoriesToPreload.push('INTERIOR_STYLE', 'INTERIOR_MATERIAL');
    }

    // Iterate and preload
    categoriesToPreload.forEach(cat => {
        helperData[cat].items.forEach(item => {
            if (item.imageUrl) {
                const img = new Image();
                img.src = item.imageUrl;
            }
        });
    });
  }, [currentMode, helperData]);

  // --- ACTIONS ---

  const handleModeChange = (mode: AppMode) => {
    setCurrentMode(mode);
    setPromptText('');
    setGeneratedImageUrl(null);
    setStatus({ isGeneratingImage: false, isGeneratingPrompt: false, error: null });
  };

  const handleReset = () => {
      setInputImages([]);
      setStyleImages([]);
      setGeneratedImageUrl(null);
      setPromptText('');
      setStatus({ isGeneratingImage: false, isGeneratingPrompt: false, error: null });
  };

  const addToHistory = (imageUrl: string, prompt: string) => {
      const newItem: HistoryItem = {
          id: Date.now().toString(),
          mode: currentMode,
          timestamp: Date.now(),
          imageUrl,
          prompt,
          aspectRatio
      };
      const updatedHistory = [newItem, ...history].slice(0, 15);
      setHistory(updatedHistory);
      localStorage.setItem('n-era-history', JSON.stringify(updatedHistory));
  };

  const handleGenerate = async () => {
    if (!activeInputImage) {
      setStatus(prev => ({ ...prev, error: "Please upload an image first." }));
      return;
    }

    // Step 1: Generate Prompt
    setStatus({ isGeneratingPrompt: true, isGeneratingImage: true, error: null });
    setGeneratedImageUrl(null);

    try {
      const prompt = await generateOptimizedPrompt({
        mode: currentMode,
        inputImage: activeInputImage,
        aspectRatio,
        lighting, perspective, colorTheory,
        styleReferences: styleImages,
        referenceTactic: useReference ? referenceTactic : ReferenceTactic.IGNORE,
        portraitEnv, portraitVibe,
        interiorStyle, interiorMaterial
      });
      
      setPromptText(prompt);

      // Step 2: Generate Image
      const resultBase64 = await generateImage(activeInputImage, prompt, aspectRatio);
      setGeneratedImageUrl(resultBase64);
      addToHistory(resultBase64, prompt);

    } catch (err: any) {
      setStatus(prev => ({ ...prev, error: err.message || "Generation failed" }));
    } finally {
      setStatus(prev => ({ ...prev, isGeneratingPrompt: false, isGeneratingImage: false }));
    }
  };

  const handleRegenerateFromPrompt = async () => {
    if (!activeInputImage || !promptText) return;
    setStatus({ isGeneratingPrompt: false, isGeneratingImage: true, error: null });
    try {
        const resultBase64 = await generateImage(activeInputImage, promptText, aspectRatio);
        setGeneratedImageUrl(resultBase64);
        addToHistory(resultBase64, promptText);
    } catch (err: any) {
        setStatus(prev => ({ ...prev, error: err.message || "Generation failed" }));
    } finally {
        setStatus(prev => ({ ...prev, isGeneratingPrompt: false, isGeneratingImage: false }));
    }
  };

  // --- RENDER HELPERS ---

  const renderVisualHelper = () => {
    if (!activeHelper) return null;

    // Type assertion to ensure key access
    const data = helperData[activeHelper as keyof typeof helperData];

    if (!data) return null;

    return (
        <VisualHelper 
            isOpen={!!activeHelper}
            onClose={() => setActiveHelper(null)}
            title={data.title}
            description="Select the best option for your vision."
            items={data.items}
        />
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 font-sans pb-20 lg:pb-0 lg:pl-24">
      
      {/* --- NAVIGATION --- */}
      <Navigation 
        currentMode={currentMode} 
        onModeChange={handleModeChange} 
        onHistoryClick={() => setIsHistoryOpen(true)}
        hasHistory={history.length > 0}
      />

      <HistorySidebar 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelect={(item) => {
            setGeneratedImageUrl(item.imageUrl);
            setPromptText(item.prompt);
            setAspectRatio(item.aspectRatio);
            setCurrentMode(item.mode);
            setIsHistoryOpen(false);
        }}
        onClear={() => { setHistory([]); localStorage.removeItem('n-era-history'); }}
        onDelete={(id) => {
            const up = history.filter(h => h.id !== id);
            setHistory(up);
            localStorage.setItem('n-era-history', JSON.stringify(up));
        }}
      />

      {renderVisualHelper()}

      {/* --- MAIN LAYOUT (APP SHELL) --- */}
      {/* Using 100dvh for better mobile browser support */}
      <div className="flex flex-col lg:flex-row h-[100dvh] overflow-hidden">
        
        {/* --- LEFT: HERO CANVAS (The Result) --- */}
        {/* Mobile: 40% height, Tablet/Desktop: Full height. Shrink-0 prevents crushing on small screens. */}
        <div className="w-full lg:w-1/2 h-[40dvh] lg:h-full shrink-0 bg-slate-100 dark:bg-slate-900 relative flex items-center justify-center p-4 lg:p-12 overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 z-10">
           
           {/* Background Grid Pattern */}
           <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-40"></div>

           {/* Empty/Loading State */}
           {!generatedImageUrl && !status.isGeneratingImage && (
             <div className="text-center z-10 animate-fadeIn px-4">
               <div className="w-16 h-16 lg:w-24 lg:h-24 bg-white dark:bg-slate-800 rounded-3xl mx-auto flex items-center justify-center mb-4 lg:mb-6 shadow-xl shadow-slate-200/50 dark:shadow-black/20 transform rotate-6 border border-slate-100 dark:border-slate-700">
                 <Sparkles className="w-8 h-8 lg:w-10 lg:h-10 text-brand-400" />
               </div>
               <h1 className="text-lg lg:text-2xl font-bold text-slate-900 dark:text-white mb-1 lg:mb-2">
                 {currentMode === AppMode.STUDIO ? 'Product Studio' : currentMode === AppMode.PORTRAIT ? 'AI Portrait' : 'Interior Design'}
               </h1>
               <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto text-xs lg:text-sm">
                 {activeInputImage ? "Ready. Configure below & Generate." : "Upload an image to start."}
               </p>
             </div>
           )}

           {/* Generating State (Snake Border) */}
           {(status.isGeneratingImage || status.isGeneratingPrompt) && (
             <div className="absolute z-20 flex flex-col items-center">
                 <div className="relative w-32 h-32 sm:w-48 sm:h-48 lg:w-64 lg:h-64 rounded-2xl overflow-hidden bg-slate-800/50 backdrop-blur-sm flex items-center justify-center shadow-2xl">
                     <div className="absolute inset-0 snake-border">
                        <span></span><span></span><span></span><span></span>
                     </div>
                     <Sparkles className="w-8 h-8 lg:w-12 lg:h-12 text-brand-400 animate-pulse" />
                 </div>
                 <p className="mt-4 lg:mt-6 text-xs lg:text-sm font-bold text-brand-500 animate-pulse tracking-widest uppercase bg-slate-950/50 px-3 py-1 rounded-full">
                    {status.isGeneratingPrompt ? 'Analyzing Prompt...' : 'Rendering Image...'}
                 </p>
             </div>
           )}

           {/* Result Display */}
           {generatedImageUrl && !status.isGeneratingImage && (
             <div className="relative w-full h-full flex items-center justify-center animate-fadeIn p-2">
                <div 
                  className="relative max-w-full max-h-full shadow-2xl rounded-lg overflow-hidden group cursor-zoom-in"
                  onClick={() => setIsLightboxOpen(true)}
                >
                  <img 
                    src={generatedImageUrl} 
                    alt="AI Result"
                    className="max-w-full max-h-[calc(40dvh-2rem)] lg:max-h-[calc(100vh-6rem)] object-contain transition-all duration-500"
                  />
                  
                  {/* Desktop Hover Zoom Hint */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ZoomIn className="text-white drop-shadow-md" size={32} />
                  </div>
                </div>

                {/* Canvas Actions */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 w-max max-w-full px-2">
                    <button
                        onClick={() => downloadImage(generatedImageUrl, `n-era-${currentMode}.png`)}
                        className="bg-brand-400 text-slate-900 px-3 py-1.5 rounded-full text-[10px] lg:text-xs font-bold shadow-lg shadow-brand-400/20 hover:bg-brand-500 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                    >
                        <Download size={14} /> Save
                    </button>
                    <button
                        onClick={handleReset}
                        className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full text-[10px] lg:text-xs font-bold shadow-lg border border-slate-200 dark:border-slate-700 hover:text-red-500 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                    >
                        <Trash2 size={14} /> Clear
                    </button>
                </div>
             </div>
           )}
        </div>

        {/* --- RIGHT: CONTROLS (Scrollable) --- */}
        {/* Flex-1 ensures it takes remaining space. Overflow-y-auto enables scrolling independently. */}
        <div className="flex-1 w-full lg:w-1/2 bg-white dark:bg-slate-950 overflow-y-auto custom-scrollbar relative">
          <div className="max-w-3xl mx-auto p-5 lg:p-12 pb-24 lg:pb-12 space-y-8 lg:space-y-10">
            
            {/* Header (Desktop + Mobile Row) */}
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-900 pb-4 lg:pb-6 sticky top-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur z-30 pt-2 lg:pt-0">
               <div className="flex items-center gap-3">
                 {/* Logo Icon */}
                 <div className="w-8 h-8 lg:w-10 lg:h-10 bg-slate-900 dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-lg shadow-brand-400/10 border border-slate-800 dark:border-slate-700">
                    <Sparkles className="w-4 h-4 lg:w-5 lg:h-5 text-brand-400" />
                 </div>
                 
                 <span className="font-extrabold text-2xl lg:text-3xl tracking-tight text-slate-900 dark:text-white">
                    N.<span className="text-brand-400">ERA</span>
                 </span>
                 
                 <div className="h-4 lg:h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1 lg:mx-2"></div>
                 
                 <span className="text-[10px] lg:text-xs font-bold bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full uppercase tracking-wide truncate max-w-[100px] lg:max-w-none">
                    {currentMode} Mode
                 </span>
               </div>

               <div className="flex items-center gap-1 lg:gap-2">
                 {(inputImages.length > 0 || generatedImageUrl) && (
                     <Button variant="ghost" className="!p-1.5 lg:!p-2 rounded-full text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10" onClick={handleReset} title="Reset Canvas">
                         <Trash2 size={16} className="lg:w-[18px] lg:h-[18px]" />
                     </Button>
                 )}
                 <Button variant="ghost" className="!p-1.5 lg:!p-2 rounded-full" onClick={() => setIsDarkMode(!isDarkMode)}>
                    {isDarkMode ? <Sun size={16} className="lg:w-[18px] lg:h-[18px]" /> : <Moon size={16} className="lg:w-[18px] lg:h-[18px]" />}
                 </Button>
               </div>
            </div>

            {/* Error Message */}
            {status.error && (
              <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex gap-3 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle size={18} /> {status.error}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
                {/* 1. UPLOAD SECTION */}
                <section className="animate-fadeIn md:col-span-2">
                    <h2 className="text-xs lg:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 lg:mb-6 flex items-center gap-3">
                        <span className="w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] lg:text-xs font-bold text-slate-500">1</span>
                        Assets
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ImageUpload 
                            label={currentMode === AppMode.PORTRAIT ? "Your Portrait" : currentMode === AppMode.INTERIOR ? "Room Photo" : "Product Shot"}
                            images={inputImages}
                            onImagesChange={setInputImages}
                            selectedIndex={selectedImageIndex}
                            onSelect={setSelectedImageIndex}
                            maxFiles={3}
                        />
                        
                        {/* Style References (Only for Studio) */}
                        {currentMode === AppMode.STUDIO && (
                            <div className="pt-0">
                                <ImageUpload label="Style Reference (Optional)" images={styleImages} onImagesChange={setStyleImages} optional maxFiles={1} />
                                {styleImages.length > 0 && (
                                <div className="mt-4">
                                    <Select 
                                        label="Reference Tactic" 
                                        options={Object.values(ReferenceTactic).filter(t => t !== ReferenceTactic.IGNORE).map(v => ({value: v, label: v}))}
                                        value={referenceTactic}
                                        onChange={(e) => setReferenceTactic(e.target.value as ReferenceTactic)}
                                        className="!py-2.5"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-2 px-1 leading-tight">
                                        Tip: Select "Complete Mimicry" to automatically match lighting and angle.
                                    </p>
                                </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>

                {/* 2. CONFIGURATION SECTION */}
                <section className="animate-fadeIn delay-75 md:col-span-2">
                    <h2 className="text-xs lg:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 lg:mb-6 flex items-center gap-3">
                        <span className="w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] lg:text-xs font-bold text-slate-500">2</span>
                        Configuration
                    </h2>
                    
                    <div className="space-y-6 lg:space-y-8">
                        {/* Common: Aspect Ratio */}
                        <div className="max-w-md">
                            <Select 
                                label="Format (Aspect Ratio)" 
                                options={Object.values(AspectRatio).map(v => ({value: v, label: v}))}
                                value={aspectRatio}
                                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                            />
                        </div>

                        {/* STUDIO CONTROLS */}
                        {currentMode === AppMode.STUDIO && (
                            <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Select 
                                    label="Lighting" 
                                    options={Object.values(LightingStyle).map(v => ({value:v, label:v}))} 
                                    value={lighting} 
                                    onChange={(e) => setLighting(e.target.value as LightingStyle)} 
                                    onHelp={() => setActiveHelper('LIGHTING')}
                                />
                                <Select 
                                    label="Camera Angle" 
                                    options={Object.values(CameraPerspective).map(v => ({value:v, label:v}))} 
                                    value={perspective} 
                                    onChange={(e) => setPerspective(e.target.value as CameraPerspective)} 
                                    onHelp={() => setActiveHelper('ANGLE')}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Select 
                                    label="Color Theory" 
                                    options={Object.values(ColorTheory).map(v => ({value:v, label:v}))} 
                                    value={colorTheory} 
                                    onChange={(e) => setColorTheory(e.target.value as ColorTheory)}
                                    onHelp={() => setActiveHelper('COLOR_THEORY')}
                                />
                            </div>
                            </>
                        )}

                        {/* PORTRAIT CONTROLS */}
                        {currentMode === AppMode.PORTRAIT && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Select 
                                    label="Environment" 
                                    options={Object.values(PortraitEnvironment).map(v => ({value:v, label:v}))} 
                                    value={portraitEnv} 
                                    onChange={(e) => setPortraitEnv(e.target.value as PortraitEnvironment)} 
                                    onHelp={() => setActiveHelper('PORTRAIT_ENV')}
                                />
                                <Select 
                                    label="Vibe & Lighting" 
                                    options={Object.values(PortraitVibe).map(v => ({value:v, label:v}))} 
                                    value={portraitVibe} 
                                    onChange={(e) => setPortraitVibe(e.target.value as PortraitVibe)} 
                                    onHelp={() => setActiveHelper('PORTRAIT_VIBE')}
                                />
                            </div>
                        )}

                        {/* INTERIOR CONTROLS */}
                        {currentMode === AppMode.INTERIOR && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Select 
                                    label="Design Style" 
                                    options={Object.values(InteriorStyle).map(v => ({value:v, label:v}))} 
                                    value={interiorStyle} 
                                    onChange={(e) => setInteriorStyle(e.target.value as InteriorStyle)} 
                                    onHelp={() => setActiveHelper('INTERIOR_STYLE')}
                                />
                                <Select 
                                    label="Materials" 
                                    options={Object.values(InteriorMaterial).map(v => ({value:v, label:v}))} 
                                    value={interiorMaterial} 
                                    onChange={(e) => setInteriorMaterial(e.target.value as InteriorMaterial)} 
                                    onHelp={() => setActiveHelper('INTERIOR_MATERIAL')}
                                />
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* ACTION & PROMPT SECTION */}
            <div className="pt-6 sticky bottom-0 bg-white dark:bg-slate-950 pb-4 border-t border-slate-100 dark:border-slate-800 lg:border-none lg:static space-y-6 z-20">
               
               <Button 
                  onClick={handleGenerate}
                  className="w-full h-14 lg:h-16 text-lg lg:text-xl rounded-2xl shadow-xl shadow-brand-400/20 hover:scale-[1.01] active:scale-[0.99] transition-transform"
                  isLoading={status.isGeneratingImage || status.isGeneratingPrompt}
                  disabled={!activeInputImage}
                  icon={<Wand2 size={24} />}
               >
                 {status.isGeneratingPrompt ? 'Analyzing Scene...' : status.isGeneratingImage ? 'Rendering Pixel Magic...' : 'Generate Transformation'}
               </Button>
               
               {/* PROMPT EDITOR */}
               {promptText && (
                 <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 lg:p-5 animate-fadeIn">
                    <div className="flex justify-between items-center mb-3">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Sparkles size={12} /> AI Prompt Logic
                        </label>
                        <span className="text-[10px] bg-brand-400/10 text-brand-500 px-2 py-1 rounded font-bold uppercase tracking-wide">Editable</span>
                    </div>
                    <textarea 
                        value={promptText}
                        onChange={(e) => setPromptText(e.target.value)}
                        className="w-full h-24 lg:h-32 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 lg:p-4 text-xs lg:text-sm text-slate-700 dark:text-slate-300 font-mono focus:ring-2 focus:ring-brand-400 focus:outline-none resize-none leading-relaxed"
                    />
                    <div className="mt-3 flex justify-end">
                        <Button 
                            onClick={handleRegenerateFromPrompt}
                            variant="secondary"
                            className="!py-1.5 !px-3 !text-xs !rounded-xl"
                            icon={<RefreshCw size={14} />}
                            disabled={status.isGeneratingImage}
                        >
                            Regenerate with edits
                        </Button>
                    </div>
                 </div>
               )}
            </div>

          </div>
        </div>
      </div>
      
      {/* Lightbox */}
      {isLightboxOpen && generatedImageUrl && (
         <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setIsLightboxOpen(false)}>
            <img src={generatedImageUrl} className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()} />
            <button className="absolute top-6 right-6 text-white/50 hover:text-white"><X size={32} /></button>
         </div>
      )}

    </div>
  );
};

export default App;
