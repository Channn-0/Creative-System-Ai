
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Sparkles, Wand2, Download, AlertCircle, X, ZoomIn, 
    Sun, Moon, RefreshCw, Trash2, ShieldCheck, Zap
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
import { downloadImage, addFilmGrain, historyDB, getImageDimensions, getClosestSupportedAspectRatio } from './utils';

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
  const [isSetupActive, setIsSetupActive] = useState(true);

  useEffect(() => {
    // Initial check for API Key availability in the studio environment
    const checkKey = async () => {
        try {
            if (window.aistudio) {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                // If a key is already selected, bypass the splash screen
                if (hasKey) setIsSetupActive(false);
            }
        } catch (e) {
            console.debug("Studio connection check deferred.");
        }
    };
    checkKey();
    
    const root = window.document.documentElement;
    if (isDarkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    historyDB.getAll().then(items => { setHistory(items); });
  }, [isDarkMode]);

  const activeInputImage = inputImages.length > 0 && inputImages[selectedImageIndex] ? inputImages[selectedImageIndex] : null;

  const handleSetupConnection = async () => {
    // 1. Attempt to open the secure key picker dialog provided by the platform
    if (window.aistudio) {
        try {
            await window.aistudio.openSelectKey();
        } catch (e) {
            console.warn("Secure key selection dialog could not be opened, proceeding to app.");
        }
    }
    // 2. Regardless of outcome, proceed to the app to allow the user to work
    // The Gemini SDK will handle error feedback during actual generation if the key is missing.
    setIsSetupActive(false);
  };

  const getModeDisplayName = () => {
    switch (currentMode) {
      case AppMode.STUDIO: return "Professional Studio";
      case AppMode.PORTRAIT: return "Portrait Transformation";
      case AppMode.INTERIOR: return "Interior Design Studio";
      default: return "AI Creative Studio";
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
    
    setStatus({ isGeneratingPrompt: true, isGeneratingImage: true, error: null });
    setGeneratedImageUrl(null);

    try {
        let finalApiAspectRatio: string = aspectRatio;
        
        if (aspectRatio === AspectRatio.MATCH_REFERENCE && styleImages.length > 0) {
            const dims = await getImageDimensions(styleImages[0].base64, styleImages[0].mimeType);
            finalApiAspectRatio = getClosestSupportedAspectRatio(dims.width, dims.height);
        } else if (currentMode === AppMode.INTERIOR) {
            const dims = await getImageDimensions(activeInputImage.base64, activeInputImage.mimeType);
            finalApiAspectRatio = getClosestSupportedAspectRatio(dims.width, dims.height);
        }

        const prompt = await generateOptimizedPrompt({ 
            mode: currentMode, 
            inputImage: activeInputImage, 
            aspectRatio: finalApiAspectRatio as AspectRatio, 
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
        setStatus(prev => ({ ...prev, isGeneratingPrompt: false }));

        const resultBase64 = await generateImage(activeInputImage, prompt, finalApiAspectRatio);
        const grainedBase64 = await addFilmGrain(resultBase64, 0.04);
        
        setGeneratedImageUrl(grainedBase64);
        
        await historyDB.add({ 
            id: Date.now().toString(), 
            mode: currentMode, 
            timestamp: Date.now(), 
            imageUrl: grainedBase64, 
            prompt, 
            aspectRatio: finalApiAspectRatio as AspectRatio
        });
        
        const freshHistory = await historyDB.getAll(); 
        setHistory(freshHistory);

    } catch (err: any) {
        console.error("Generation Error:", err);
        const errorMsg = err.message || "Generation failed.";
        
        // Handle specific Auth errors by returning to the setup screen
        if (errorMsg.includes("API Key") || errorMsg.includes("Requested entity") || errorMsg.includes("403")) {
            setIsSetupActive(true);
        }
        
        setStatus({ 
            isGeneratingPrompt: false, 
            isGeneratingImage: false, 
            error: errorMsg
        });
    } finally { 
        setStatus(prev => ({ ...prev, isGeneratingPrompt: false, isGeneratingImage: false })); 
    }
  };

  if (isSetupActive) {
    return (
        <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
            <div className="absolute inset-0 mesh-gradient opacity-40"></div>
            <div className="relative z-10 max-w-md animate-fadeIn">
                <div className="w-20 h-20 bg-brand-400 rounded-3xl mx-auto flex items-center justify-center mb-8 shadow-2xl shadow-brand-400/40 transform rotate-12">
                    <Sparkles className="w-10 h-10 text-slate-950" />
                </div>
                <h1 className="text-4xl font-black text-white mb-4 tracking-tight">N.<span className="text-brand-400">ERA</span> STUDIO</h1>
                <p className="text-slate-400 mb-10 leading-relaxed text-sm">
                    Welcome to the professional photography workspace. Click below to securely connect your Gemini account and begin generating high-fidelity assets.
                </p>
                <button 
                    onClick={handleSetupConnection}
                    className="w-full bg-white text-slate-950 h-16 rounded-2xl font-extrabold text-lg shadow-xl hover:bg-brand-400 transition-all flex items-center justify-center gap-3 active:scale-95 group"
                >
                    <Zap className="fill-current group-hover:scale-110 transition-transform" />
                    Enter Studio
                </button>
                <div className="mt-8 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-6 opacity-40">
                        <div className="flex items-center gap-2 text-white text-[10px] font-bold tracking-widest uppercase">
                            <ShieldCheck size={14} /> Secure Link
                        </div>
                        <div className="flex items-center gap-2 text-white text-[10px] font-bold tracking-widest uppercase">
                            <Zap size={14} /> Pro Features
                        </div>
                    </div>
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-[10px] text-slate-500 hover:text-slate-300 underline underline-offset-4">
                        Requires a project with active billing
                    </a>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 font-sans pb-20 lg:pb-0 lg:pl-24">
      <Navigation currentMode={currentMode} onModeChange={handleModeChange} onHistoryClick={() => setIsHistoryOpen(true)} hasHistory={history.length > 0} />
      <HistorySidebar isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} history={history} onSelect={(item) => { setGeneratedImageUrl(item.imageUrl); setPromptText(item.prompt); setAspectRatio(item.aspectRatio); setCurrentMode(item.mode); setIsHistoryOpen(false); }} onClear={async () => { await historyDB.clear(); setHistory([]); }} onDelete={async (id) => { await historyDB.delete(id); const fresh = await historyDB.getAll(); setHistory(fresh); }} />
      {activeHelper && <VisualHelper title="Visual Guide" description="Select a style." items={[]} isOpen={!!activeHelper} onClose={() => setActiveHelper(null)} />}
      
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
               <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto text-xs lg:text-sm">{activeInputImage ? "Configuration complete. Ready to render." : "Upload an image to start."}</p>
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
                            <Sparkles className="w-6 h-6 lg:w-8 lg:h-8 text-white animate-pulse-soft" />
                        </div>
                     </div>
                 </div>
                 <div className="mt-8 text-white/80 font-bold text-[10px] tracking-[0.2em] uppercase">
                    {status.isGeneratingPrompt ? "Synthesizing Scene..." : "Rendering Pixels..."}
                 </div>
             </div>
           )}

           {generatedImageUrl && !status.isGeneratingImage && (
             <div className="relative w-full h-full flex items-center justify-center animate-fadeIn p-2">
                <div className="relative max-w-full max-h-full shadow-2xl rounded-lg overflow-hidden group cursor-zoom-in" onClick={() => setIsLightboxOpen(true)}>
                  <img src={generatedImageUrl} alt="AI Result" className="max-w-full max-h-[calc(40dvh-2rem)] lg:max-h-[calc(100vh-6rem)] object-contain" />
                </div>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
                    <button onClick={() => downloadImage(generatedImageUrl, `n-era-${currentMode}.png`)} className="bg-brand-400 text-slate-900 px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 hover:bg-brand-500 transition-colors"><Download size={14} /> Save</button>
                    <button onClick={handleReset} className="bg-white/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 hover:text-red-500 transition-colors"><Trash2 size={14} /> Clear</button>
                </div>
             </div>
           )}
        </div>

        <div className="flex-1 w-full lg:w-1/2 bg-white dark:bg-slate-950 overflow-y-auto custom-scrollbar">
          <div className="max-w-3xl mx-auto p-5 lg:p-12 pb-24 lg:pb-12 space-y-10">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-900 pb-6 sticky top-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur z-30 pt-2 lg:pt-0">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 lg:w-10 lg:h-10 bg-slate-900 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-800"><Sparkles className="w-4 h-4 text-brand-400" /></div>
                 <span className="font-extrabold text-2xl lg:text-3xl tracking-tight text-slate-900 dark:text-white">N.<span className="text-brand-400">ERA</span></span>
               </div>
               <div className="flex items-center gap-2">
                 <Button variant="ghost" className="!p-2 rounded-full" onClick={() => setIsDarkMode(!isDarkMode)}>{isDarkMode ? <Sun size={18} /> : <Moon size={18} />}</Button>
               </div>
            </div>

            {status.error && (
                <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 text-red-600 dark:text-red-400 text-sm transition-all animate-fadeIn shadow-sm">
                    <div className="flex gap-3">
                        <AlertCircle size={18} className="shrink-0" /> 
                        <span>{status.error}</span>
                    </div>
                    {(status.error.includes("entity") || status.error.includes("API Key") || status.error.includes("403")) && (
                        <Button 
                            variant="primary" 
                            className="!py-1.5 !px-4 !text-[10px] !rounded-lg" 
                            onClick={handleSetupConnection}
                            icon={<RefreshCw size={12} />}
                        >
                            Reconnect Project
                        </Button>
                    )}
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <section className="animate-fadeIn md:col-span-2">
                    <h2 className="text-xs lg:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-3"><span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">1</span>Assets</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ImageUpload label={`${currentMode} Image`} images={inputImages} onImagesChange={setInputImages} selectedIndex={selectedImageIndex} onSelect={setSelectedImageIndex} maxFiles={3} />
                        {currentMode === AppMode.STUDIO && <div className="pt-0"><ImageUpload label="Reference Style" images={styleImages} onImagesChange={setStyleImages} optional maxFiles={1} /></div>}
                    </div>
                </section>
                <section className="animate-fadeIn delay-75 md:col-span-2">
                    <h2 className="text-xs lg:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-3"><span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">2</span>Configuration</h2>
                    <div className="space-y-8">
                        <div className="max-w-md"><Select label="Output Ratio" options={Object.values(AspectRatio).map(v => ({value: v, label: v}))} value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} /></div>
                        {currentMode === AppMode.STUDIO && <StudioPanel lighting={lighting} setLighting={setLighting} perspective={perspective} setPerspective={setPerspective} colorTheory={colorTheory} setColorTheory={setColorTheory} onShowHelper={setActiveHelper} />}
                        {currentMode === AppMode.PORTRAIT && <PortraitPanel env={portraitEnv} setEnv={setPortraitEnv} vibe={portraitVibe} setVibe={setPortraitVibe} onShowHelper={setActiveHelper} />}
                        {currentMode === AppMode.INTERIOR && <InteriorPanel style={interiorStyle} setStyle={setInteriorStyle} material={interiorMaterial} setMaterial={setInteriorMaterial} onShowHelper={setActiveHelper} />}
                    </div>
                </section>
            </div>
            
            <div className="pt-6 sticky bottom-0 bg-white dark:bg-slate-950 pb-4 border-t border-slate-100 dark:border-slate-800 lg:border-none lg:static space-y-6 z-20">
               <Button 
                  onClick={handleGenerate} 
                  className="w-full h-14 lg:h-16 text-lg lg:text-xl rounded-2xl shadow-xl shadow-brand-400/20 active:scale-[0.98]" 
                  isLoading={status.isGeneratingImage || status.isGeneratingPrompt} 
                  disabled={!activeInputImage} 
                  icon={<Wand2 size={24} />}
               >
                 {status.isGeneratingPrompt ? 'Analyzing Asset...' : status.isGeneratingImage ? 'Rendering...' : 'Generate New Style'}
               </Button>
            </div>
          </div>
        </div>
      </div>

      {isLightboxOpen && generatedImageUrl && (
         <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setIsLightboxOpen(false)}>
            <img src={generatedImageUrl} className="max-w-full max-h-full object-contain" />
            <button className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"><X size={32} /></button>
         </div>
      )}
    </div>
  );
};

export default App;
