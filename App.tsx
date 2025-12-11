import React, { useState, useEffect } from 'react';
import { 
    Sparkles, Wand2, Download, AlertCircle, X, ZoomIn, 
    Sun, Moon, HelpCircle, RefreshCw, Trash2
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
    let items: {label: string, desc: string, imageUrl?: string}[] = [];
    let title = "";
    
    // Using placeholder services to represent the visual styles
    const placeholderBase = "https://placehold.co/600x400/1e293b/FFF?text=";

    if (activeHelper === 'LIGHTING') {
        title = "Lighting Styles";
        items = [
            { label: 'Match Reference', desc: 'Analyzes your uploaded reference photo and copies its lighting exactly.', imageUrl: placeholderBase + "Reference+Match" },
            { label: 'Studio', desc: 'Even, controlled lighting. Minimal shadows. Perfect for e-commerce.', imageUrl: placeholderBase + "Studio+Light" },
            { label: 'Natural', desc: 'Mimics sunlight. Soft shadows. Good for lifestyle.', imageUrl: placeholderBase + "Natural+Sunlight" },
            { label: 'Cinematic', desc: 'High contrast, dramatic shadows, moody atmosphere.', imageUrl: placeholderBase + "Cinematic+Mood" },
            { label: 'Neon', desc: 'Cyberpunk style with colored rim lights (Blue/Pink).', imageUrl: placeholderBase + "Neon+Cyberpunk" },
            { label: 'Minimalist', desc: 'Very soft, diffused light. White/Grey background feel.', imageUrl: placeholderBase + "Minimalist+Soft" },
            { label: 'Product Boost', desc: 'High key lighting designed to make colors pop.', imageUrl: placeholderBase + "Product+Boost" }
        ];
    } else if (activeHelper === 'ANGLE') {
        title = "Camera Angles";
        items = [
            { label: 'Match Reference', desc: 'Mimics the exact camera position of your reference photo.', imageUrl: placeholderBase + "Ref+Perspective" },
            { label: 'Front', desc: 'Directly facing the subject. Standard listing shot.', imageUrl: placeholderBase + "Front+View" },
            { label: 'Isometric', desc: '3/4 view from above. Gives a 3D technical feel.', imageUrl: placeholderBase + "Isometric" },
            { label: 'Flat Lay', desc: 'Directly from above (90 degrees). Good for collections.', imageUrl: placeholderBase + "Flat+Lay" },
            { label: 'Low Angle', desc: 'Camera looks up at product. Makes it look heroic/large.', imageUrl: placeholderBase + "Low+Angle" },
            { label: 'High Angle', desc: 'Looking down slightly. Good for showing depth.', imageUrl: placeholderBase + "High+Angle" },
            { label: 'Close Up', desc: 'Macro shot focusing on texture and details.', imageUrl: placeholderBase + "Macro+CloseUp" },
            { label: 'Dutch Angle', desc: 'Tilted camera for a dynamic, edgy look.', imageUrl: placeholderBase + "Dutch+Tilt" }
        ];
    } else {
        title = "Color Theory";
        items = Object.values(ColorTheory).map(c => ({
            label: c, 
            desc: c === ColorTheory.AUTO ? 'AI decides based on product color.' : 'Applies standard color wheel rules.',
            imageUrl: placeholderBase + c.replace(/\s+/g, '+')
        }));
    }

    return (
        <VisualHelper 
            isOpen={!!activeHelper}
            onClose={() => setActiveHelper(null)}
            title={title}
            description="Visual guide to help you choose the best setting."
            items={items}
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
               <div className="flex items-center gap-3 lg:gap-4">
                 <span className="font-extrabold text-2xl lg:text-3xl tracking-tight">N.<span className="text-brand-400">ERA</span></span>
                 <div className="h-4 lg:h-6 w-px bg-slate-200 dark:bg-slate-800"></div>
                 <span className="text-[10px] lg:text-xs font-bold bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 px-2 lg:px-3 py-1 lg:py-1.5 rounded-full uppercase tracking-wide truncate max-w-[100px] lg:max-w-none">{currentMode} Mode</span>
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
                                <div className="relative">
                                    <Select label="Lighting" options={Object.values(LightingStyle).map(v => ({value:v, label:v}))} value={lighting} onChange={(e) => setLighting(e.target.value as LightingStyle)} className="h-10 lg:h-12" />
                                    <button onClick={() => setActiveHelper('LIGHTING')} className="absolute top-0 right-0 text-slate-400 hover:text-brand-400 p-1"><HelpCircle size={14} /></button>
                                </div>
                                <div className="relative">
                                    <Select label="Camera Angle" options={Object.values(CameraPerspective).map(v => ({value:v, label:v}))} value={perspective} onChange={(e) => setPerspective(e.target.value as CameraPerspective)} className="h-10 lg:h-12" />
                                    <button onClick={() => setActiveHelper('ANGLE')} className="absolute top-0 right-0 text-slate-400 hover:text-brand-400 p-1"><HelpCircle size={14} /></button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Select label="Color Theory" options={Object.values(ColorTheory).map(v => ({value:v, label:v}))} value={colorTheory} onChange={(e) => setColorTheory(e.target.value as ColorTheory)} className="h-10 lg:h-12" />
                            </div>
                            </>
                        )}

                        {/* PORTRAIT CONTROLS */}
                        {currentMode === AppMode.PORTRAIT && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Select label="Environment" options={Object.values(PortraitEnvironment).map(v => ({value:v, label:v}))} value={portraitEnv} onChange={(e) => setPortraitEnv(e.target.value as PortraitEnvironment)} className="h-10 lg:h-12" />
                            <Select label="Vibe & Lighting" options={Object.values(PortraitVibe).map(v => ({value:v, label:v}))} value={portraitVibe} onChange={(e) => setPortraitVibe(e.target.value as PortraitVibe)} className="h-10 lg:h-12" />
                            </div>
                        )}

                        {/* INTERIOR CONTROLS */}
                        {currentMode === AppMode.INTERIOR && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Select label="Design Style" options={Object.values(InteriorStyle).map(v => ({value:v, label:v}))} value={interiorStyle} onChange={(e) => setInteriorStyle(e.target.value as InteriorStyle)} className="h-10 lg:h-12" />
                            <Select label="Materials" options={Object.values(InteriorMaterial).map(v => ({value:v, label:v}))} value={interiorMaterial} onChange={(e) => setInteriorMaterial(e.target.value as InteriorMaterial)} className="h-10 lg:h-12" />
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