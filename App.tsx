
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Sparkles, Wand2, Download, AlertCircle, X, ZoomIn, 
    Sun, Moon, RefreshCw, Trash2, Key, ExternalLink
} from 'lucide-react';
import { ImageUpload } from './components/ImageUpload';
import { Select } from './components/Select';
import { Button } from './components/Button';
import { HistorySidebar } from './components/HistorySidebar';
import { Navigation } from './components/Navigation';
import { VisualHelper } from './components/VisualHelper';
import { StudioPanel } from './components/modes/StudioPanel';
import { PortraitPanel } from './components/modes/PortraitPanel';
import { InteriorPanel } from './components/modes/InteriorPanel';
import { 
    AppMode,
    AspectRatio, LightingStyle, CameraPerspective, ColorTheory, ReferenceTactic, 
    PortraitEnvironment, PortraitVibe,
    InteriorStyle, InteriorMaterial,
    ImageFile, GenerationState, HistoryItem 
} from './types';
import { generateOptimizedPrompt, generateImage } from './services/gemini';
import { downloadImage, addFilmGrain, historyDB } from './utils';

// --- SVG PREVIEW GENERATORS ---
const generateLightingPreview = (type: LightingStyle): string => {
    const w = 400; const h = 300; const cx = w/2; const cy = h/2; const capW = 50; const capH = 25; const bodyW_bottom = 50; const bodyW_top = 70; const bodyH = 110; const crimpH = 15; const capY = cy + 40; const bodyY_bottom = capY; const bodyY_top = bodyY_bottom - bodyH; const tubePath = `M ${cx - bodyW_bottom/2} ${bodyY_bottom} L ${cx - bodyW_top/2} ${bodyY_top} L ${cx + bodyW_top/2} ${bodyY_top} L ${cx + bodyW_bottom/2} ${bodyY_bottom} Z`; const crimpPath = `M ${cx - bodyW_top/2 - 2} ${bodyY_top} L ${cx - bodyW_top/2 - 2} ${bodyY_top - crimpH} L ${cx + bodyW_top/2 + 2} ${bodyY_top - crimpH} L ${cx + bodyW_top/2 + 2} ${bodyY_top} Z`; const capPath = `M ${cx - capW/2} ${capY} L ${cx - capW/2} ${capY + capH} Q ${cx} ${capY + capH + 5} ${cx + capW/2} ${capY + capH} L ${cx + capW/2} ${capY} Z`; let defs = ''; let content = '';
    switch (type) {
        case LightingStyle.STUDIO: defs = `<linearGradient id="studioTube" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#cbd5e1"/><stop offset="40%" stop-color="#ffffff"/><stop offset="60%" stop-color="#ffffff"/><stop offset="100%" stop-color="#94a3b8"/></linearGradient><filter id="softShadow" x="-50%" y="0" width="200%" height="200%"><feGaussianBlur in="SourceAlpha" stdDeviation="5"/><feOffset dy="5" result="offsetblur"/><feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer><feMerge><feMergeNode in="offsetblur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`; content = `<rect x="0" y="0" width="${w}" height="${h}" fill="#e2e8f0" /><path d="${capPath}" fill="#475569" filter="url(#softShadow)" /><path d="${tubePath}" fill="url(#studioTube)" filter="url(#softShadow)" /><path d="${crimpPath}" fill="#e2e8f0" stroke="#cbd5e1" filter="url(#softShadow)" />`; break;
        case LightingStyle.NATURAL: defs = `<filter id="leaf" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="3" /></filter>`; content = `<rect x="0" y="0" width="${w}" height="${h}" fill="#f1f5f9" /><g transform="skewX(-30) translate(120, 0)" opacity="0.2" fill="#000"><path d="${capPath}" /><path d="${tubePath}" /><path d="${crimpPath}" /></g><g><path d="${capPath}" fill="#64748b" /><path d="${tubePath}" fill="#ffffff" /><path d="${crimpPath}" fill="#f1f5f9" /></g><path d="M${cx-150} ${cy-150} C${cx} ${cy-50}, ${cx+50} ${cy+50}, ${cx+200} ${cy+200}" stroke="#000" stroke-width="80" opacity="0.05" filter="url(#leaf)"/>`; break;
        case LightingStyle.CINEMATIC: content = `<rect x="0" y="0" width="${w}" height="${h}" fill="#0a0a0a" /><defs><linearGradient id="cineLight" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#000"/><stop offset="40%" stop-color="#1e293b"/><stop offset="60%" stop-color="#fff"/><stop offset="100%" stop-color="#334155"/></linearGradient></defs><path d="M${w} 0 L${cx-40} ${h} L${w} ${h} Z" fill="#fff" opacity="0.07" /><g><path d="${capPath}" fill="#0f172a" stroke="#334155" stroke-width="1"/><path d="${tubePath}" fill="url(#cineLight)" /><path d="${crimpPath}" fill="url(#cineLight)" /></g>`; break;
        case LightingStyle.NEON: content = `<rect x="0" y="0" width="${w}" height="${h}" fill="#0a0a0a" /><defs><filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g filter="url(#neonGlow)"><path d="${capPath}" stroke="#ec4899" stroke-width="3" fill="#171717" /><path d="${tubePath}" stroke="#3b82f6" stroke-width="3" fill="#171717" /><path d="${crimpPath}" stroke="#ec4899" stroke-width="3" fill="#171717" /></g>`; break;
        case LightingStyle.MINIMALIST: content = `<rect x="0" y="0" width="${w}" height="${h}" fill="#f8fafc" /><g opacity="0.8"><path d="${capPath}" fill="#cbd5e1" /><path d="${tubePath}" fill="#ffffff" stroke="#e2e8f0" /><path d="${crimpPath}" fill="#f1f5f9" stroke="#e2e8f0" /></g>`; break;
        case LightingStyle.PRODUCT_BOOST: content = `<rect x="0" y="0" width="${w}" height="${h}" fill="#facc15" /><circle cx="${cx}" cy="${cy}" r="120" fill="#fef08a" opacity="0.5" /><g filter="drop-shadow(0px 10px 10px rgba(0,0,0,0.2))"><path d="${capPath}" fill="#334155" /><path d="${tubePath}" fill="#ffffff" /><path d="${crimpPath}" fill="#ffffff" /></g><rect x="${cx-15}" y="${bodyY_top + 10}" width="10" height="80" fill="white" opacity="0.4" rx="5" />`; break;
        case LightingStyle.MATCH_REFERENCE: content = `<rect x="0" y="0" width="${w}" height="${h}" fill="#1e293b" /><g stroke="#ffffff" stroke-width="2" fill="none" opacity="0.5"><path d="${capPath}" stroke-dasharray="4 4" /><path d="${tubePath}" stroke-dasharray="4 4" /><path d="${crimpPath}" stroke-dasharray="4 4" /></g><rect x="0" y="${cy}" width="${w}" height="2" fill="#3b82f6" opacity="0.8"><animate attributeName="y" from="0" to="${h}" duration="2s" repeatCount="indefinite" /></rect>`; break;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${defs}${content}</svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
};

const generateAnglePreview = (angle: CameraPerspective): string => {
    const w = 400; const h = 300; const cx = w/2; const cy = h/2; const bg = "#334155"; const cTube = "#f1f5f9"; const cCap = "#475569"; const cHighlight = "#ffffff"; let content = ''; const drawCamera = (scale = 1, rotate = 0) => `<g transform="translate(${cx}, ${cy}) rotate(${rotate}) scale(${scale}) translate(-${cx}, -${cy})"><rect x="${cx-60}" y="${cy-40}" width="120" height="80" rx="10" fill="none" stroke="white" stroke-width="4"/><circle cx="${cx}" cy="${cy}" r="25" fill="none" stroke="white" stroke-width="4"/><rect x="${cx+20}" y="${cy-55}" width="20" height="15" fill="white"/></g>`;
    switch (angle) {
        case CameraPerspective.FRONT: content = `<rect x="0" y="0" width="${w}" height="${h}" fill="${bg}" /><g transform="translate(${cx}, ${cy})"><rect x="-35" y="-60" width="70" height="15" fill="${cTube}" /><path d="M -25 60 L -35 -45 L 35 -45 L 25 60 Z" fill="${cTube}" /><rect x="-25" y="60" width="50" height="25" fill="${cCap}" /><rect x="-10" y="-40" width="5" height="90" fill="${cHighlight}" opacity="0.3" /><text x="0" y="110" fill="white" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold">FRONT</text></g>`; break;
        case CameraPerspective.TOP_DOWN: content = `<rect x="0" y="0" width="${w}" height="${h}" fill="${bg}" /><g transform="rotate(-90 ${cx} ${cy}) translate(0, -10)"><path d="M ${cx-30} ${cy+65} L ${cx-40} ${cy-45} L ${cx+40} ${cy-45} L ${cx+30} ${cy+65} Z" fill="black" opacity="0.3" filter="blur(4px)" transform="translate(5, 5)" /><rect x="${cx - 25}" y="${cy + 60}" width="50" height="25" fill="${cCap}" /><path d="M ${cx - 25} ${cy + 60} L ${cx - 35} ${cy - 50} L ${cx + 35} ${cy - 50} L ${cx + 25} ${cy + 60} Z" fill="${cTube}" /><rect x="${cx - 35}" y="${cy - 65}" width="70" height="15" fill="#e2e8f0" /></g><text x="${cx}" y="${cy+120}" fill="white" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold">FLAT LAY</text>`; break;
        case CameraPerspective.ISOMETRIC: content = `<rect x="0" y="0" width="${w}" height="${h}" fill="${bg}" /><g transform="translate(${cx}, ${cy})"><path d="M -25 60 L -25 85 L 25 85 L 25 60 Z" fill="${cCap}" /><path d="M 25 60 L 25 85 L 45 65 L 45 40 Z" fill="#334155" opacity="0.5"/><path d="M -25 60 L -35 -45 L 35 -45 L 25 60 Z" fill="${cTube}" /><path d="M 25 60 L 35 -45 L 55 -65 L 45 40 Z" fill="#cbd5e1" /><path d="M -35 -45 L -35 -60 L 35 -60 L 35 -45 Z" fill="#e2e8f0" /><path d="M 35 -45 L 35 -60 L 55 -80 L 55 -65 Z" fill="#94a3b8" /><text x="0" y="120" fill="white" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold">ISOMETRIC</text></g>`; break;
        case CameraPerspective.LOW_ANGLE: content = `<rect x="0" y="0" width="${w}" height="${h}" fill="${bg}" /><g transform="translate(${cx}, ${cy})"><ellipse cx="0" cy="70" rx="35" ry="12" fill="#1e293b" stroke="${cCap}" stroke-width="2"/><path d="M -35 70 L -35 45 L 35 45 L 35 70 Z" fill="${cCap}" /><path d="M -35 45 L -20 -50 L 20 -50 L 35 45 Z" fill="${cTube}" /><rect x="-20" y="-65" width="40" height="15" fill="#e2e8f0" /><path d="M -200 80 L 200 80 M -200 120 L 200 120" stroke="white" stroke-opacity="0.1" /><text x="0" y="120" fill="white" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold">LOW ANGLE</text></g>`; break;
        case CameraPerspective.HIGH_ANGLE: content = `<rect x="0" y="0" width="${w}" height="${h}" fill="${bg}" /><g transform="translate(${cx}, ${cy})"><ellipse cx="0" cy="80" rx="15" ry="8" fill="${cCap}" opacity="0.5"/> <path d="M -15 80 L -45 -20 L 45 -20 L 15 80 Z" fill="${cTube}" /><path d="M -45 -20 Q 0 -30 45 -20 L 45 -40 Q 0 -50 -45 -40 Z" fill="#e2e8f0" /><text x="0" y="120" fill="white" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold">HIGH ANGLE</text></g>`; break;
        case CameraPerspective.CLOSE_UP: content = `<rect x="0" y="0" width="${w}" height="${h}" fill="${bg}" />${drawCamera(1.8)}<text x="${cx}" y="${cy+130}" fill="white" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold">MACRO CLOSE-UP</text>`; break;
        case CameraPerspective.WIDE_ANGLE: content = `<rect x="0" y="0" width="${w}" height="${h}" fill="${bg}" /><line x1="0" y1="0" x2="${cx-60}" y2="${cy-40}" stroke="white" stroke-width="3" /><line x1="${w}" y1="0" x2="${cx+60}" y2="${cy-40}" stroke="white" stroke-width="3" /><line x1="0" y1="${h}" x2="${cx-60}" y2="${cy+40}" stroke="white" stroke-width="3" /><line x1="${w}" y1="${h}" x2="${cx+60}" y2="${cy+40}" stroke="white" stroke-width="3" />${drawCamera(1)}<text x="${cx}" y="${cy+120}" fill="white" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold">WIDE ANGLE</text>`; break;
        case CameraPerspective.DUTCH: content = `<rect x="0" y="0" width="${w}" height="${h}" fill="${bg}" />${drawCamera(1, -15)}<text x="${cx}" y="${cy+120}" fill="white" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold">DUTCH ANGLE</text>`; break;
        default: content = `<rect x="0" y="0" width="${w}" height="${h}" fill="${bg}" />${drawCamera(1)}<text x="${cx}" y="${cy+80}" fill="white" text-anchor="middle" font-family="sans-serif">${angle}</text>`; break;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${content}</svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
};

const generatePortraitEnvPreview = (env: PortraitEnvironment): string => {
    const w = 400; const h = 300; const personSvg = `<defs><linearGradient id="personGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#475569" /><stop offset="100%" stop-color="#334155" /></linearGradient></defs><g transform="translate(200, 300)"><path d="M -100 0 C -100 -60, -60 -110, 0 -110 C 60 -110, 100 -60, 100 0 Z" fill="url(#personGrad)" /><rect x="-25" y="-130" width="50" height="40" fill="url(#personGrad)" /><circle cx="0" cy="-160" r="55" fill="url(#personGrad)" /></g>`; let bgContent = '';
    switch (env) {
        case PortraitEnvironment.OFFICE: bgContent = `<rect width="${w}" height="${h}" fill="#f1f5f9" /><defs><pattern id="blinds" x="0" y="0" width="10" height="20" patternUnits="userSpaceOnUse"><rect x="0" y="18" width="10" height="2" fill="#cbd5e1" /></pattern></defs><rect width="${w}" height="${h}" fill="url(#blinds)" opacity="0.6" />`; break;
        case PortraitEnvironment.CAFE: bgContent = `<rect width="${w}" height="${h}" fill="#451a03" /><circle cx="50" cy="50" r="20" fill="#fbbf24" opacity="0.4" filter="blur(5px)" /><circle cx="350" cy="120" r="30" fill="#fbbf24" opacity="0.4" filter="blur(8px)" />`; break;
        case PortraitEnvironment.NATURE: bgContent = `<rect width="${w}" height="${h}" fill="#ecfdf5" /><path d="M0,300 Q100,100 200,300" fill="#22c55e" opacity="0.2" filter="blur(5px)" />`; break;
        case PortraitEnvironment.URBAN: bgContent = `<rect width="${w}" height="${h}" fill="#e2e8f0" /><path d="M0,300 L0,150 L60,150 L60,250 L120,250 L120,100 L200,100 L200,200 L300,200 L300,130 L400,130 L400,300 Z" fill="#94a3b8" />`; break;
        case PortraitEnvironment.STUDIO_GREY: bgContent = `<defs><radialGradient id="studioGrad" cx="0.5" cy="0.5" r="0.7"><stop offset="0%" stop-color="#ffffff" /><stop offset="100%" stop-color="#94a3b8" /></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#studioGrad)" />`; break;
        case PortraitEnvironment.LUXURY: bgContent = `<rect width="${w}" height="${h}" fill="#1c1917" /><path d="M50,0 V300 M350,0 V300" stroke="#b45309" stroke-width="2" />`; break;
        case PortraitEnvironment.BEACH: bgContent = `<rect width="${w}" height="${h}" fill="#bae6fd" /><rect x="0" y="180" width="400" height="120" fill="#fde68a" />`; break;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${bgContent}${personSvg}</svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
}

const generateAspectRatioPreview = (ratio: AspectRatio): string => {
    const w = 400; const h = 300; const cx = w/2; const cy = h/2; const maxW = 220; const maxH = 160; const [rw, rh] = ratio.split(':').map(Number); const r = rw / rh; let boxW, boxH; if (r > (maxW/maxH)) { boxW = maxW; boxH = maxW / r; } else { boxH = maxH; boxW = maxH * r; } const x = cx - boxW/2; const y = cy - boxH/2; const content = `<rect x="0" y="0" width="${w}" height="${h}" fill="#f1f5f9" /><rect x="${x}" y="${y}" width="${boxW}" height="${boxH}" fill="#ffffff" stroke="#334155" stroke-width="4" rx="8" /><text x="${cx}" y="${cy}" fill="#0f172a" font-family="sans-serif" font-size="32" font-weight="800" text-anchor="middle" dominant-baseline="middle">${ratio}</text>`; const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${content}</svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
}

const getClosestAspectRatio = (width: number, height: number): AspectRatio => {
    const ratio = width / height;
    const supported = [ { r: 1, val: AspectRatio.SQUARE }, { r: 3/4, val: AspectRatio.PORTRAIT }, { r: 4/3, val: AspectRatio.LANDSCAPE }, { r: 16/9, val: AspectRatio.WIDE }, { r: 9/16, val: AspectRatio.TALL } ];
    return supported.reduce((prev, curr) => Math.abs(curr.r - ratio) < Math.abs(prev.r - ratio) ? curr : prev).val;
};

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.STUDIO);
  const [inputImages, setInputImages] = useState<ImageFile[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [styleImages, setStyleImages] = useState<ImageFile[]>([]);
  const [useReference, setUseReference] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [lighting, setLighting] = useState<LightingStyle>(LightingStyle.STUDIO);
  const [perspective, setPerspective] = useState<CameraPerspective>(CameraPerspective.FRONT);
  const [colorTheory, setColorTheory] = useState<ColorTheory>(ColorTheory.AUTO);
  const [referenceTactic, setReferenceTactic] = useState<ReferenceTactic>(ReferenceTactic.FULL);
  const [portraitEnv, setPortraitEnv] = useState<PortraitEnvironment>(PortraitEnvironment.OFFICE);
  const [portraitVibe, setPortraitVibe] = useState<PortraitVibe>(PortraitVibe.PROFESSIONAL);
  const [interiorStyle, setInteriorStyle] = useState<InteriorStyle>(InteriorStyle.MINIMALIST);
  const [interiorMaterial, setInteriorMaterial] = useState<InteriorMaterial>(InteriorMaterial.WOOD_WHITE);
  const [promptText, setPromptText] = useState<string>('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<GenerationState>({
    isGeneratingPrompt: false,
    isGeneratingImage: false,
    error: null,
  });
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [activeHelper, setActiveHelper] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    historyDB.getAll().then(items => { setHistory(items); });
    
    // Check key status on mount if in aistudio environment
    if (window.aistudio?.hasSelectedApiKey) {
        window.aistudio.hasSelectedApiKey().then(setHasApiKey);
    } else {
        // If not in aistudio, we rely solely on process.env.API_KEY which is handled in gemini.ts
        setHasApiKey(!!process.env.API_KEY);
    }
  }, [isDarkMode]);

  const handleConnectKey = async () => {
    if (window.aistudio?.openSelectKey) {
        await window.aistudio.openSelectKey();
        setHasApiKey(true);
    }
  };

  useEffect(() => {
    if (currentMode === AppMode.STUDIO && referenceTactic === ReferenceTactic.FULL && styleImages.length > 0) {
        if (lighting !== LightingStyle.MATCH_REFERENCE) setLighting(LightingStyle.MATCH_REFERENCE);
        if (perspective !== CameraPerspective.MATCH_REFERENCE) setPerspective(CameraPerspective.MATCH_REFERENCE);
    }
  }, [referenceTactic, styleImages, currentMode]);

  const activeInputImage = inputImages.length > 0 && inputImages[selectedImageIndex] ? inputImages[selectedImageIndex] : null;

  const helperData = useMemo(() => {
    return {
        LIGHTING: { title: "Lighting Styles", items: Object.values(LightingStyle).map(style => ({ label: style, desc: style.toString(), imageUrl: generateLightingPreview(style) })) },
        ANGLE: { title: "Camera Angles", items: Object.values(CameraPerspective).map(angle => ({ label: angle, desc: angle.toString(), imageUrl: generateAnglePreview(angle) })) },
        PORTRAIT_ENV: { title: "Portrait Environment", items: Object.values(PortraitEnvironment).map(env => ({ label: env, desc: env.toString(), imageUrl: generatePortraitEnvPreview(env) })) },
        ASPECT_RATIO: { title: "Aspect Ratio", items: Object.values(AspectRatio).map(r => ({ label: r, desc: r.toString(), imageUrl: generateAspectRatioPreview(r) })) }
    };
  }, []);

  const getModeDisplayName = () => {
    switch (currentMode) {
      case AppMode.STUDIO: return 'Product Studio';
      case AppMode.PORTRAIT: return 'AI Portrait';
      case AppMode.INTERIOR: return 'Interior Design';
      default: return 'Studio';
    }
  };

  const handleModeChange = (mode: AppMode) => {
    setCurrentMode(mode); setPromptText(''); setGeneratedImageUrl(null);
    setStatus({ isGeneratingImage: false, isGeneratingPrompt: false, error: null });
  };

  const handleReset = () => {
    setInputImages([]); setStyleImages([]); setGeneratedImageUrl(null); setPromptText('');
    setStatus({ isGeneratingImage: false, isGeneratingPrompt: false, error: null });
  };

  const handleGenerate = async () => {
    if (!activeInputImage) { 
        setStatus(prev => ({ ...prev, error: "Please upload an image first." })); 
        return; 
    }
    
    // Visual feedback starts immediately
    setStatus({ isGeneratingPrompt: true, isGeneratingImage: true, error: null });
    setGeneratedImageUrl(null);

    try {
        // Double check key if in aistudio environment
        if (window.aistudio?.hasSelectedApiKey) {
            const keyOk = await window.aistudio.hasSelectedApiKey();
            if (!keyOk) { 
                setHasApiKey(false); 
                setStatus({ isGeneratingPrompt: false, isGeneratingImage: false, error: null });
                return; 
            }
        }

        let finalAspectRatio = aspectRatio;
        if (currentMode === AppMode.INTERIOR) {
            const img = new Image();
            await new Promise((resolve, reject) => { 
                img.onload = resolve; 
                img.onerror = reject;
                img.src = `data:${activeInputImage.mimeType};base64,${activeInputImage.base64}`; 
            });
            finalAspectRatio = getClosestAspectRatio(img.width, img.height);
            setAspectRatio(finalAspectRatio);
        }

        const prompt = await generateOptimizedPrompt({ 
            mode: currentMode, 
            inputImage: activeInputImage, 
            aspectRatio: finalAspectRatio, 
            lighting, 
            perspective, 
            colorTheory, 
            styleReferences: styleImages, 
            referenceTactic: useReference ? referenceTactic : ReferenceTactic.IGNORE, 
            portraitEnv, 
            portraitVibe, 
            interiorStyle, 
            interiorMaterial 
        });
        
        setPromptText(prompt);
        setStatus(prev => ({ ...prev, isGeneratingPrompt: false })); // Prompt done, still rendering image

        const resultBase64 = await generateImage(activeInputImage, prompt, finalAspectRatio);
        const grainedBase64 = await addFilmGrain(resultBase64, 0.04);
        
        setGeneratedImageUrl(grainedBase64);
        
        await historyDB.add({ 
            id: Date.now().toString(), 
            mode: currentMode, 
            timestamp: Date.now(), 
            imageUrl: grainedBase64, 
            prompt, 
            aspectRatio: finalAspectRatio 
        });
        
        const freshHistory = await historyDB.getAll(); 
        setHistory(freshHistory);

    } catch (err: any) {
        console.error("Generation Error:", err);
        if (err.message.includes("API Key")) setHasApiKey(false);
        setStatus({ 
            isGeneratingPrompt: false, 
            isGeneratingImage: false, 
            error: err.message || "Generation failed. Please try again." 
        });
    } finally { 
        setStatus(prev => ({ ...prev, isGeneratingPrompt: false, isGeneratingImage: false })); 
    }
  };

  const handleRegenerateFromPrompt = async () => {
    if (!activeInputImage || !promptText) return;
    setStatus({ isGeneratingPrompt: false, isGeneratingImage: true, error: null });
    try {
        const resultBase64 = await generateImage(activeInputImage, promptText, aspectRatio);
        const grainedBase64 = await addFilmGrain(resultBase64, 0.04);
        setGeneratedImageUrl(grainedBase64);
        await historyDB.add({ id: Date.now().toString(), mode: currentMode, timestamp: Date.now(), imageUrl: grainedBase64, prompt: promptText, aspectRatio });
        const freshHistory = await historyDB.getAll(); setHistory(freshHistory);
    } catch (err: any) { setStatus(prev => ({ ...prev, error: err.message || "Generation failed" })); } 
    finally { setStatus(prev => ({ ...prev, isGeneratingPrompt: false, isGeneratingImage: false })); }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 font-sans pb-20 lg:pb-0 lg:pl-24">
      {/* Setup Overlay */}
      {!hasApiKey && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-2xl flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-brand-400/30 shadow-2xl animate-fadeIn text-center">
                <div className="w-20 h-20 bg-brand-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Key className="text-brand-400 w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Connection Required</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm leading-relaxed">
                    N.ERA Pro requires a secure connection to your Gemini API Project. Please connect your project to begin generating high-fidelity assets.
                </p>
                <div className="space-y-4">
                    <Button onClick={handleConnectKey} className="w-full h-14 rounded-2xl" icon={<Sparkles size={18} />}>Connect to Gemini</Button>
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-brand-400 transition-colors group">
                        Requires a paid GCP project <ExternalLink size={12} className="group-hover:translate-x-0.5 transition-transform" />
                    </a>
                </div>
            </div>
        </div>
      )}

      <Navigation currentMode={currentMode} onModeChange={handleModeChange} onHistoryClick={() => setIsHistoryOpen(true)} hasHistory={history.length > 0} />
      <HistorySidebar isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} history={history} onSelect={(item) => { setGeneratedImageUrl(item.imageUrl); setPromptText(item.prompt); setAspectRatio(item.aspectRatio); setCurrentMode(item.mode); setIsHistoryOpen(false); }} onClear={async () => { await historyDB.clear(); setHistory([]); }} onDelete={async (id) => { await historyDB.delete(id); const fresh = await historyDB.getAll(); setHistory(fresh); }} />
      {activeHelper && helperData[activeHelper as keyof typeof helperData] && <VisualHelper title={helperData[activeHelper as keyof typeof helperData].title} description="Select an option." items={helperData[activeHelper as keyof typeof helperData].items} isOpen={!!activeHelper} onClose={() => setActiveHelper(null)} />}
      
      <div className="flex flex-col lg:flex-row h-[100dvh] overflow-hidden">
        <div className="w-full lg:w-1/2 h-[40dvh] lg:h-full shrink-0 bg-slate-100 dark:bg-slate-900 relative flex items-center justify-center p-4 lg:p-12 overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 z-10">
           
           {!status.isGeneratingImage && !status.isGeneratingPrompt && (
              <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-40"></div>
           )}

           {!generatedImageUrl && !status.isGeneratingImage && (
             <div className="text-center z-10 animate-fadeIn px-4">
               <div className="w-16 h-16 lg:w-24 lg:h-24 bg-white dark:bg-slate-800 rounded-3xl mx-auto flex items-center justify-center mb-4 lg:mb-6 shadow-xl shadow-slate-200/50 dark:shadow-black/20 transform rotate-6 border border-slate-100 dark:border-slate-700">
                 <Sparkles className="w-8 h-8 lg:w-10 lg:h-10 text-brand-400" />
               </div>
               <h1 className="text-lg lg:text-2xl font-bold text-slate-900 dark:text-white mb-1 lg:mb-2">{getModeDisplayName()}</h1>
               <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto text-xs lg:text-sm">{activeInputImage ? "Ready. Configure & Generate." : "Upload an image to start."}</p>
             </div>
           )}

           {(status.isGeneratingImage || status.isGeneratingPrompt) && (
             <div className="absolute inset-0 z-20 flex flex-col items-center justify-center mesh-gradient">
                 <div className="relative w-24 h-24 lg:w-32 lg:h-32">
                     <div className="focal-bracket bracket-tl animate-bracket-pulse"></div>
                     <div className="focal-bracket bracket-tr animate-bracket-pulse"></div>
                     <div className="focal-bracket bracket-bl animate-bracket-pulse"></div>
                     <div className="focal-bracket bracket-br animate-bracket-pulse"></div>
                     <div className="magic-border-container w-full h-full shadow-2xl animate-spin-weighted">
                        <div className="magic-inner-glass">
                            <Sparkles className="w-6 h-6 lg:w-8 lg:h-8 text-white animate-pulse-soft drop-shadow-[0_0_12px_rgba(255,255,255,0.6)]" />
                        </div>
                     </div>
                 </div>
                 <div className="absolute bottom-16 flex flex-col items-center gap-4">
                    <p className="text-[10px] lg:text-xs font-black text-white/90 drop-shadow-md tracking-[0.3em] uppercase bg-white/5 backdrop-blur-2xl px-5 py-2 rounded-full border border-white/10">
                        {status.isGeneratingPrompt ? 'Analyzing scene' : 'Rendering pixels'}
                    </p>
                 </div>
             </div>
           )}

           {generatedImageUrl && !status.isGeneratingImage && (
             <div className="relative w-full h-full flex items-center justify-center animate-fadeIn p-2">
                <div className="relative max-w-full max-h-full shadow-2xl rounded-lg overflow-hidden group cursor-zoom-in" onClick={() => setIsLightboxOpen(true)}>
                  <img src={generatedImageUrl} alt="AI Result" className="max-w-full max-h-[calc(40dvh-2rem)] lg:max-h-[calc(100vh-6rem)] object-contain transition-all duration-500" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><ZoomIn className="text-white drop-shadow-md" size={32} /></div>
                </div>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 w-max max-w-full px-2">
                    <button onClick={() => downloadImage(generatedImageUrl, `n-era-${currentMode}.png`)} className="bg-brand-400 text-slate-900 px-3 py-1.5 rounded-full text-[10px] lg:text-xs font-bold shadow-lg shadow-brand-400/20 hover:bg-brand-500 transition-colors flex items-center gap-1.5"><Download size={14} /> Save</button>
                    <button onClick={handleReset} className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full text-[10px] lg:text-xs font-bold shadow-lg border border-slate-200 dark:border-slate-700 hover:text-red-500 transition-colors flex items-center gap-1.5"><Trash2 size={14} /> Clear</button>
                </div>
             </div>
           )}
        </div>

        <div className="flex-1 w-full lg:w-1/2 bg-white dark:bg-slate-950 overflow-y-auto custom-scrollbar relative">
          <div className="max-w-3xl mx-auto p-5 lg:p-12 pb-24 lg:pb-12 space-y-10">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-900 pb-6 sticky top-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur z-30 pt-2 lg:pt-0">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 lg:w-10 lg:h-10 bg-slate-900 dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-lg border border-slate-800 dark:border-slate-700"><Sparkles className="w-4 h-4 lg:w-5 lg:h-5 text-brand-400" /></div>
                 <span className="font-extrabold text-2xl lg:text-3xl tracking-tight text-slate-900 dark:text-white">N.<span className="text-brand-400">ERA</span></span>
                 <div className="h-4 lg:h-6 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>
                 <span className="text-[10px] lg:text-xs font-bold bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-full uppercase tracking-wide">{currentMode}</span>
               </div>
               <div className="flex items-center gap-2">
                 {(inputImages.length > 0 || generatedImageUrl) && <Button variant="ghost" className="!p-2 rounded-full text-red-400" onClick={handleReset} title="Reset"><Trash2 size={18} /></Button>}
                 <Button variant="ghost" className="!p-2 rounded-full" onClick={() => setIsDarkMode(!isDarkMode)}>{isDarkMode ? <Sun size={18} /> : <Moon size={18} />}</Button>
               </div>
            </div>

            {status.error && <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex gap-3 text-red-600 dark:text-red-400 text-sm transition-all animate-fadeIn"><AlertCircle size={18} /> {status.error}</div>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <section className="animate-fadeIn md:col-span-2">
                    <h2 className="text-xs lg:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-3"><span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">1</span>Assets</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ImageUpload label={`${currentMode} Image`} images={inputImages} onImagesChange={setInputImages} selectedIndex={selectedImageIndex} onSelect={setSelectedImageIndex} maxFiles={3} />
                        {currentMode === AppMode.STUDIO && <div className="pt-0"><ImageUpload label="Reference" images={styleImages} onImagesChange={setStyleImages} optional maxFiles={1} />{styleImages.length > 0 && <div className="mt-4"><Select label="Tactic" options={Object.values(ReferenceTactic).filter(t => t !== ReferenceTactic.IGNORE).map(v => ({value: v, label: v}))} value={referenceTactic} onChange={(e) => setReferenceTactic(e.target.value as ReferenceTactic)} /></div>}</div>}
                    </div>
                </section>
                <section className="animate-fadeIn delay-75 md:col-span-2">
                    <h2 className="text-xs lg:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-3"><span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">2</span>Configuration</h2>
                    <div className="space-y-8">
                        {currentMode !== AppMode.INTERIOR && <div className="max-w-md"><Select label="Format" options={Object.values(AspectRatio).map(v => ({value: v, label: v}))} value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} onHelp={() => setActiveHelper('ASPECT_RATIO')} /></div>}
                        {currentMode === AppMode.STUDIO && <StudioPanel lighting={lighting} setLighting={setLighting} perspective={perspective} setPerspective={setPerspective} colorTheory={colorTheory} setColorTheory={setColorTheory} onShowHelper={setActiveHelper} />}
                        {currentMode === AppMode.PORTRAIT && <PortraitPanel env={portraitEnv} setEnv={setPortraitEnv} vibe={portraitVibe} setVibe={setPortraitVibe} onShowHelper={setActiveHelper} />}
                        {currentMode === AppMode.INTERIOR && <InteriorPanel style={interiorStyle} setStyle={setInteriorStyle} material={interiorMaterial} setMaterial={setInteriorMaterial} onShowHelper={setActiveHelper} />}
                    </div>
                </section>
            </div>
            <div className="pt-6 sticky bottom-0 bg-white dark:bg-slate-950 pb-4 border-t border-slate-100 dark:border-slate-800 lg:border-none lg:static space-y-6 z-20">
               <Button 
                  onClick={handleGenerate} 
                  className="w-full h-14 lg:h-16 text-lg lg:text-xl rounded-2xl shadow-xl shadow-brand-400/20" 
                  isLoading={status.isGeneratingImage || status.isGeneratingPrompt} 
                  disabled={!activeInputImage} 
                  icon={<Wand2 size={24} />}
               >
                 {status.isGeneratingPrompt ? 'Analyzing scene...' : status.isGeneratingImage ? 'Rendering pixels...' : 'Generate Transformation'}
               </Button>
               {promptText && (
                 <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 animate-fadeIn">
                    <div className="flex justify-between items-center mb-3"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Sparkles size={12} /> Prompt Logic</label><span className="text-[10px] bg-brand-400/10 text-brand-500 px-2 py-1 rounded font-bold uppercase">Editable</span></div>
                    <textarea value={promptText} onChange={(e) => setPromptText(e.target.value)} className="w-full h-24 lg:h-32 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs lg:text-sm text-slate-700 dark:text-slate-300 font-mono focus:ring-2 focus:ring-brand-400 focus:outline-none resize-none leading-relaxed" />
                    <div className="mt-3 flex justify-end"><Button onClick={handleRegenerateFromPrompt} variant="secondary" className="!py-1.5 !px-3 !text-xs !rounded-xl" icon={<RefreshCw size={14} />} disabled={status.isGeneratingImage}>Regenerate</Button></div>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
      {isLightboxOpen && generatedImageUrl && (
         <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setIsLightboxOpen(false)}>
            <img src={generatedImageUrl} className="max-w-full max-h-full object-contain" />
            <button className="absolute top-6 right-6 text-white/50 hover:text-white"><X size={32} /></button>
         </div>
      )}
    </div>
  );
};

export default App;
