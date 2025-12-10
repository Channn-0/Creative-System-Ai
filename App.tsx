import React, { useState, useEffect } from 'react';
import { Sparkles, Image as ImageIcon, Wand2, Download, AlertCircle, X, ZoomIn, Sun, Moon, Clock, Save, FileText, Trash2 } from 'lucide-react';
import { ImageUpload } from './components/ImageUpload';
import { Select } from './components/Select';
import { Button } from './components/Button';
import { HistorySidebar } from './components/HistorySidebar';
import { AspectRatio, LightingStyle, CameraPerspective, ColorTheory, ReferenceTactic, ImageFile, GenerationState, HistoryItem, PromptTemplate } from './types';
import { generateOptimizedPrompt, generateProductImage } from './services/gemini';
import { downloadImage, resizeImageToAspectRatio } from './utils';

const App: React.FC = () => {
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Input State
  const [productImages, setProductImages] = useState<ImageFile[]>([]);
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);

  const [styleImages, setStyleImages] = useState<ImageFile[]>([]);
  const [useReference, setUseReference] = useState(true);
  
  // Configuration State
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [lighting, setLighting] = useState<LightingStyle>(LightingStyle.STUDIO);
  const [perspective, setPerspective] = useState<CameraPerspective>(CameraPerspective.FRONT);
  const [colorTheory, setColorTheory] = useState<ColorTheory>(ColorTheory.AUTO);
  const [referenceTactic, setReferenceTactic] = useState<ReferenceTactic>(ReferenceTactic.FULL);
  
  // Generation State
  const [promptText, setPromptText] = useState<string>('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [formattedPreview, setFormattedPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<GenerationState>({
    isGeneratingPrompt: false,
    isGeneratingImage: false,
    error: null,
  });

  // History & Templates
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  // Load Persisted Data
  useEffect(() => {
    // Theme
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Load History
    const savedHistory = localStorage.getItem('n-era-history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }

    // Load Templates
    const savedTemplates = localStorage.getItem('n-era-templates');
    if (savedTemplates) {
      try {
        setTemplates(JSON.parse(savedTemplates));
      } catch (e) {
        console.error("Failed to parse templates", e);
      }
    }
  }, [isDarkMode]);

  // Derived active product image
  const activeProductImage = productImages.length > 0 && productImages[selectedProductIndex] 
    ? productImages[selectedProductIndex] 
    : null;

  // Update preview when active product or aspect ratio changes
  useEffect(() => {
    if (activeProductImage) {
      resizeImageToAspectRatio(activeProductImage.base64, activeProductImage.mimeType, aspectRatio)
        .then(base64 => setFormattedPreview(`data:image/png;base64,${base64}`))
        .catch(err => {
            console.error("Error creating preview", err);
            setFormattedPreview(null);
        });
    } else {
      setFormattedPreview(null);
    }
  }, [activeProductImage, aspectRatio]);

  // History Helper: Save to local storage
  const saveHistoryToStorage = (newHistory: HistoryItem[]) => {
     try {
         localStorage.setItem('n-era-history', JSON.stringify(newHistory));
         setHistory(newHistory);
     } catch (e) {
         console.error("Storage full or error", e);
         // If quota exceeded, try removing oldest
         if (newHistory.length > 1) {
             saveHistoryToStorage(newHistory.slice(0, newHistory.length - 1));
         }
     }
  };

  const addToHistory = (imageUrl: string, prompt: string) => {
      const newItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          imageUrl,
          prompt,
          aspectRatio
      };
      const updatedHistory = [newItem, ...history].slice(0, 10); // Keep max 10
      saveHistoryToStorage(updatedHistory);
  };

  const handleClearHistory = () => {
      localStorage.removeItem('n-era-history');
      setHistory([]);
  };

  const handleDeleteHistoryItem = (id: string) => {
      const updated = history.filter(item => item.id !== id);
      saveHistoryToStorage(updated);
  };

  // Template Helpers
  const handleSaveTemplate = () => {
      if (!newTemplateName.trim() || !promptText.trim()) return;
      
      const newTemplate: PromptTemplate = {
          id: Date.now().toString(),
          name: newTemplateName.trim(),
          content: promptText
      };
      
      const updatedTemplates = [...templates, newTemplate];
      setTemplates(updatedTemplates);
      localStorage.setItem('n-era-templates', JSON.stringify(updatedTemplates));
      
      setIsSavingTemplate(false);
      setNewTemplateName('');
  };

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const updated = templates.filter(t => t.id !== id);
      setTemplates(updated);
      localStorage.setItem('n-era-templates', JSON.stringify(updated));
  };

  const handleGeneratePrompt = async () => {
    if (!activeProductImage) {
      setStatus(prev => ({ ...prev, error: "Please upload a product image first." }));
      return;
    }

    setStatus({ ...status, isGeneratingPrompt: true, error: null });

    try {
      const generatedPrompt = await generateOptimizedPrompt({
        productImage: activeProductImage,
        aspectRatio,
        lighting,
        perspective,
        colorTheory,
        styleReferences: styleImages,
        referenceTactic: useReference ? referenceTactic : ReferenceTactic.IGNORE,
      });
      setPromptText(generatedPrompt);
    } catch (err: any) {
      setStatus(prev => ({ ...prev, error: err.message || "Failed to generate prompt" }));
    } finally {
      setStatus(prev => ({ ...prev, isGeneratingPrompt: false }));
    }
  };

  const handleGenerateImage = async () => {
    if (!activeProductImage || !promptText) {
      setStatus(prev => ({ ...prev, error: "Product image and prompt are required." }));
      return;
    }

    setStatus({ ...status, isGeneratingImage: true, error: null });
    setGeneratedImageUrl(null);

    try {
      const resultBase64 = await generateProductImage(activeProductImage, promptText, aspectRatio);
      setGeneratedImageUrl(resultBase64);
      addToHistory(resultBase64, promptText);
    } catch (err: any) {
      setStatus(prev => ({ ...prev, error: err.message || "Failed to generate image" }));
    } finally {
      setStatus(prev => ({ ...prev, isGeneratingImage: false }));
    }
  };

  return (
    <div className="min-h-screen transition-colors duration-300">
      <HistorySidebar 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelect={(item) => {
            setGeneratedImageUrl(item.imageUrl);
            setPromptText(item.prompt);
            setAspectRatio(item.aspectRatio);
            setIsHistoryOpen(false);
        }}
        onClear={handleClearHistory}
        onDelete={handleDeleteHistoryItem}
      />

      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-brand-400 p-2 rounded-xl shadow-lg shadow-brand-400/20">
               <Sparkles className="w-5 h-5 text-slate-900" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              N.<span className="text-brand-400">ERA</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
             <Button 
               variant="ghost" 
               onClick={() => setIsHistoryOpen(true)}
               className="!p-2 rounded-full relative"
               aria-label="View History"
               title="History"
             >
               <Clock size={20} />
               {history.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-400 rounded-full" />}
             </Button>

             <Button 
               variant="ghost" 
               onClick={() => setIsDarkMode(!isDarkMode)}
               className="!p-2 rounded-full"
               aria-label="Toggle theme"
             >
               {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
             </Button>
            <a href="https://ai.google.dev" target="_blank" rel="noreferrer" className="text-xs font-semibold text-slate-400 hover:text-brand-400 transition-colors hidden sm:block">
              Powered by Gemini
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        
        {status.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/20 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 animate-fadeIn shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{status.error}</p>
            <button onClick={() => setStatus(prev => ({...prev, error: null}))} className="ml-auto hover:text-slate-900 dark:hover:text-white transition-colors"><span className="sr-only">Dismiss</span><X size={18} /></button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* LEFT COLUMN: Controls & Input */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* 1. Uploads */}
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm transition-colors duration-300">
              <h2 className="text-lg font-bold flex items-center gap-3 mb-6 text-slate-900 dark:text-white">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-600 dark:text-brand-400 ring-1 ring-slate-200 dark:ring-slate-700">1</span>
                Upload Assets
              </h2>
              
              <div className="space-y-8">
                <div>
                  <ImageUpload 
                    label="Product Photos (Select 1 to Edit)" 
                    images={productImages} 
                    onImagesChange={setProductImages}
                    selectedIndex={selectedProductIndex}
                    onSelect={setSelectedProductIndex}
                  />
                  {productImages.length > 0 && (
                    <p className="text-xs font-medium text-brand-500 dark:text-brand-400 mt-3 text-center bg-brand-50 dark:bg-brand-400/10 py-1.5 px-3 rounded-lg inline-block mx-auto w-full">
                        Selected image will be used for generation
                    </p>
                  )}
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                  <ImageUpload 
                    label="Style References" 
                    images={styleImages} 
                    onImagesChange={setStyleImages}
                    optional
                  />
                  
                  {styleImages.length > 0 && (
                    <div className="mt-4 animate-fadeIn p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Use References</label>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={useReference}
                          onClick={() => setUseReference(!useReference)}
                          className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 ${useReference ? 'bg-brand-400' : 'bg-slate-300 dark:bg-slate-600'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${useReference ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                      </div>
                      
                      {useReference && (
                        <div className="pt-1 animate-fadeIn">
                          <Select
                            label="Influence Tactic"
                            value={referenceTactic}
                            onChange={(e) => setReferenceTactic(e.target.value as ReferenceTactic)}
                            options={Object.values(ReferenceTactic)
                              .filter(t => t !== ReferenceTactic.IGNORE)
                              .map(v => ({ value: v, label: v }))}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Configuration */}
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm transition-colors duration-300">
              <h2 className="text-lg font-bold flex items-center gap-3 mb-6 text-slate-900 dark:text-white">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-600 dark:text-brand-400 ring-1 ring-slate-200 dark:ring-slate-700">2</span>
                Configuration
              </h2>
              
              <div className="space-y-5">
                <Select
                  label="Aspect Ratio"
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                  options={Object.values(AspectRatio).map(v => ({ value: v, label: v }))}
                />
                
                <div className="grid grid-cols-2 gap-5">
                  <Select
                    label="Lighting"
                    value={lighting}
                    onChange={(e) => setLighting(e.target.value as LightingStyle)}
                    options={Object.values(LightingStyle).map(v => ({ value: v, label: v }))}
                  />
                  <Select
                    label="Angle"
                    value={perspective}
                    onChange={(e) => setPerspective(e.target.value as CameraPerspective)}
                    options={Object.values(CameraPerspective).map(v => ({ value: v, label: v }))}
                  />
                </div>

                <Select
                  label="Color Harmony"
                  value={colorTheory}
                  onChange={(e) => setColorTheory(e.target.value as ColorTheory)}
                  options={Object.values(ColorTheory).map(v => ({ value: v, label: v }))}
                />
              </div>

              <div className="pt-6">
                 <Button 
                  onClick={handleGeneratePrompt} 
                  variant="secondary" 
                  className="w-full py-3"
                  isLoading={status.isGeneratingPrompt}
                  disabled={!activeProductImage}
                  icon={<Wand2 size={16} />}
                >
                  {status.isGeneratingPrompt ? 'Analyzing Assets...' : 'Generate AI Prompt'}
                </Button>
              </div>
            </div>

            {/* 3. Prompt Editor */}
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm transition-colors duration-300 relative">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-3 text-slate-900 dark:text-white">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-600 dark:text-brand-400 ring-1 ring-slate-200 dark:ring-slate-700">3</span>
                  Detailed Prompt
                </h2>
                
                {/* Template Controls */}
                <div className="flex items-center gap-2">
                    {/* Load Template Dropdown */}
                    {templates.length > 0 && (
                        <div className="relative group">
                            <button className="text-xs font-semibold text-slate-500 hover:text-brand-400 flex items-center gap-1 transition-colors">
                                <FileText size={14} /> Load <span className="hidden sm:inline">Template</span>
                            </button>
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 overflow-hidden">
                                {templates.map(t => (
                                    <div key={t.id} className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 group/item">
                                        <button 
                                            onClick={() => setPromptText(t.content)}
                                            className="text-left text-xs font-medium text-slate-700 dark:text-slate-300 truncate flex-1 mr-2"
                                        >
                                            {t.name}
                                        </button>
                                        <button 
                                            onClick={(e) => handleDeleteTemplate(t.id, e)}
                                            className="text-slate-400 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Save Template Button */}
                    {!isSavingTemplate ? (
                        <button 
                            onClick={() => setIsSavingTemplate(true)}
                            disabled={!promptText}
                            className="text-xs font-semibold text-slate-500 hover:text-brand-400 flex items-center gap-1 transition-colors disabled:opacity-50"
                        >
                            <Save size={14} /> Save
                        </button>
                    ) : (
                        <div className="flex items-center gap-1 animate-fadeIn">
                             <input 
                                type="text" 
                                autoFocus
                                value={newTemplateName}
                                onChange={(e) => setNewTemplateName(e.target.value)}
                                placeholder="Template Name"
                                className="w-32 bg-slate-100 dark:bg-slate-800 border-none rounded-lg py-1 px-2 text-xs focus:ring-1 focus:ring-brand-400"
                             />
                             <button onClick={handleSaveTemplate} className="text-brand-400 hover:text-brand-500"><Save size={14} /></button>
                             <button onClick={() => setIsSavingTemplate(false)} className="text-slate-400 hover:text-slate-500"><X size={14} /></button>
                        </div>
                    )}
                </div>
              </div>

              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="The detailed prompt will appear here after step 2..."
                className="w-full h-32 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-brand-400 focus:border-transparent resize-none transition-all duration-200"
              />

              <div className="mt-4">
                <Button 
                  onClick={handleGenerateImage} 
                  className="w-full h-14 text-lg shadow-xl shadow-brand-400/20"
                  isLoading={status.isGeneratingImage}
                  disabled={!promptText || !activeProductImage}
                  icon={<Sparkles size={20} />}
                >
                  {status.isGeneratingImage ? 'Generating Image...' : 'Generate Final Image'}
                </Button>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Output */}
          <div className="lg:col-span-7">
            <div className="h-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col min-h-[700px] shadow-sm transition-colors duration-300 sticky top-24">
               <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Studio Output
                    {status.isGeneratingImage && <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span></span>}
                </h2>
                {generatedImageUrl && (
                  <Button 
                    variant="outline" 
                    className="!py-1.5 !px-3 text-xs"
                    onClick={() => downloadImage(generatedImageUrl!, 'n-era-result.png')}
                    icon={<Download size={14} />}
                  >
                    Download
                  </Button>
                )}
              </div>

              <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 relative overflow-hidden group transition-colors duration-300">
                {status.isGeneratingImage ? (
                  <div className="text-center space-y-6 animate-pulse">
                    <div className="relative w-24 h-24 mx-auto">
                      <div className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-slate-800"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-t-brand-400 animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-brand-400" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Creating Masterpiece</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Applying {lighting}...</p>
                    </div>
                  </div>
                ) : generatedImageUrl ? (
                  <div 
                    className="relative group cursor-zoom-in w-full h-full flex items-center justify-center p-4"
                    onClick={() => setIsLightboxOpen(true)}
                  >
                    <img 
                      src={generatedImageUrl} 
                      alt="Generated Result" 
                      className="max-w-full max-h-[700px] object-contain shadow-2xl rounded-lg"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 bg-slate-900/20 dark:bg-slate-950/40 backdrop-blur-[2px] rounded-2xl">
                      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-5 py-2.5 rounded-full flex items-center gap-2 shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                        <ZoomIn size={16} />
                        <span className="text-sm font-semibold">View Fullscreen</span>
                      </div>
                    </div>
                  </div>
                ) : formattedPreview ? (
                   <div className="relative group max-w-full max-h-full flex items-center justify-center opacity-90 transition-opacity p-4">
                      <img 
                        src={formattedPreview} 
                        alt="Preview with Aspect Ratio" 
                        className="max-w-full max-h-[700px] object-contain rounded-lg shadow-xl"
                      />
                      <div className="absolute top-8 left-1/2 -translate-x-1/2">
                         <span className="bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-brand-400 text-xs font-bold px-4 py-2 rounded-full border border-slate-200 dark:border-brand-500/30 backdrop-blur-md shadow-lg tracking-wider">
                            PREVIEW ({aspectRatio})
                         </span>
                      </div>
                   </div>
                ) : (
                  <div className="text-center text-slate-400 dark:text-slate-600 max-w-sm px-6">
                    <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-3xl mx-auto flex items-center justify-center mb-5 shadow-sm border border-slate-100 dark:border-slate-800 transform rotate-3">
                      <ImageIcon className="w-10 h-10 opacity-50 -rotate-3" />
                    </div>
                    <h3 className="text-slate-900 dark:text-slate-200 font-semibold mb-2 text-lg">Ready to Create</h3>
                    <p className="text-sm leading-relaxed">Upload a product photo to start generating professional shots.</p>
                  </div>
                )}
              </div>
              
              {generatedImageUrl && (
                <div className="mt-6 p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 transition-colors duration-300">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Used Prompt</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 hover:line-clamp-none transition-all cursor-default leading-relaxed">
                    {promptText}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Lightbox Overlay */}
      {isLightboxOpen && generatedImageUrl && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/90 dark:bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Controls */}
          <div className="absolute top-6 right-6 flex items-center gap-4 z-10" onClick={e => e.stopPropagation()}>
            <Button 
              variant="secondary" 
              onClick={() => downloadImage(generatedImageUrl, 'n-era-result.png')}
              icon={<Download size={18} />}
              className="!bg-white dark:!bg-slate-800 text-slate-900 dark:text-white border-none shadow-lg"
            >
              Download
            </Button>
            <button 
              onClick={() => setIsLightboxOpen(false)}
              className="p-3 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all shadow-lg"
              aria-label="Close lightbox"
            >
              <X size={24} />
            </button>
          </div>
          
          {/* Full Image */}
          <img 
            src={generatedImageUrl} 
            alt="Full Resolution Result" 
            className="max-w-full max-h-full object-contain shadow-2xl rounded-sm"
            onClick={e => e.stopPropagation()} 
          />
        </div>
      )}
    </div>
  );
};

export default App;