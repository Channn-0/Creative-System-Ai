import React, { useState, useEffect } from 'react';
import { Sparkles, Image as ImageIcon, Wand2, Download, AlertCircle, X, ZoomIn } from 'lucide-react';
import { ImageUpload } from './components/ImageUpload';
import { Select } from './components/Select';
import { Button } from './components/Button';
import { AspectRatio, LightingStyle, CameraPerspective, ColorTheory, ReferenceTactic, ImageFile, GenerationState } from './types';
import { generateOptimizedPrompt, generateProductImage } from './services/gemini';
import { downloadImage, resizeImageToAspectRatio } from './utils';

const App: React.FC = () => {
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
    } catch (err: any) {
      setStatus(prev => ({ ...prev, error: err.message || "Failed to generate image" }));
    } finally {
      setStatus(prev => ({ ...prev, isGeneratingImage: false }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-yellow-500/30">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-yellow-400 p-1.5 rounded-lg">
               <Sparkles className="w-5 h-5 text-slate-900" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Nano <span className="text-yellow-400">Banana</span> Studio
            </h1>
          </div>
          <a href="https://ai.google.dev" target="_blank" rel="noreferrer" className="text-xs font-medium text-slate-500 hover:text-yellow-400 transition-colors">
            Powered by Gemini
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {status.error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400 animate-fadeIn">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{status.error}</p>
            <button onClick={() => setStatus(prev => ({...prev, error: null}))} className="ml-auto hover:text-white"><span className="sr-only">Dismiss</span>×</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Controls & Input */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* 1. Uploads */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-700 text-xs text-white">1</span>
                Upload Assets
              </h2>
              
              <div className="space-y-6">
                <div>
                  <ImageUpload 
                    label="Product Photos (Select 1 to Edit)" 
                    images={productImages} 
                    onImagesChange={setProductImages}
                    selectedIndex={selectedProductIndex}
                    onSelect={setSelectedProductIndex}
                  />
                  {productImages.length > 0 && (
                    <p className="text-xs text-slate-500 mt-2 text-center">
                        Selected image will be used for generation
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <ImageUpload 
                    label="Style References" 
                    images={styleImages} 
                    onImagesChange={setStyleImages}
                    optional
                    // No selection needed for style, we use all of them
                  />
                  
                  {styleImages.length > 0 && (
                    <div className="mt-4 animate-fadeIn p-3 bg-slate-800 rounded-xl border border-slate-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-slate-300">Use References</label>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={useReference}
                          onClick={() => setUseReference(!useReference)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-1 focus:ring-offset-slate-900 ${useReference ? 'bg-yellow-400' : 'bg-slate-600'}`}
                        >
                          <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${useReference ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                      </div>
                      
                      {useReference && (
                        <div className="pt-1 animate-fadeIn">
                          <Select
                            label="Tactic"
                            value={referenceTactic}
                            onChange={(e) => setReferenceTactic(e.target.value as ReferenceTactic)}
                            options={Object.values(ReferenceTactic)
                              .filter(t => t !== ReferenceTactic.IGNORE)
                              .map(v => ({ value: v, label: v }))}
                            className="!py-2 !text-xs"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Configuration */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-700 text-xs text-white">2</span>
                Configuration
              </h2>
              
              <div className="grid grid-cols-1 gap-4">
                <Select
                  label="Aspect Ratio"
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                  options={Object.values(AspectRatio).map(v => ({ value: v, label: v }))}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Lighting Style"
                    value={lighting}
                    onChange={(e) => setLighting(e.target.value as LightingStyle)}
                    options={Object.values(LightingStyle).map(v => ({ value: v, label: v }))}
                  />
                  <Select
                    label="Camera Angle"
                    value={perspective}
                    onChange={(e) => setPerspective(e.target.value as CameraPerspective)}
                    options={Object.values(CameraPerspective).map(v => ({ value: v, label: v }))}
                  />
                </div>

                <Select
                  label="Background Color Harmony"
                  value={colorTheory}
                  onChange={(e) => setColorTheory(e.target.value as ColorTheory)}
                  options={Object.values(ColorTheory).map(v => ({ value: v, label: v }))}
                />
              </div>

              <div className="pt-2">
                 <Button 
                  onClick={handleGeneratePrompt} 
                  variant="secondary" 
                  className="w-full"
                  isLoading={status.isGeneratingPrompt}
                  disabled={!activeProductImage}
                  icon={<Wand2 size={16} />}
                >
                  {status.isGeneratingPrompt ? 'Analyzing Assets...' : 'Generate AI Prompt'}
                </Button>
              </div>
            </div>

            {/* 3. Prompt Editor */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-700 text-xs text-white">3</span>
                  Detailed Prompt
                </h2>
                <span className="text-xs text-slate-500">Editable</span>
              </div>

              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="The detailed prompt will appear here after step 2..."
                className="w-full h-32 bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-300 focus:ring-yellow-400 focus:border-yellow-400 resize-none"
              />

              <Button 
                onClick={handleGenerateImage} 
                className="w-full h-12 text-lg"
                isLoading={status.isGeneratingImage}
                disabled={!promptText || !activeProductImage}
                icon={<Sparkles size={20} />}
              >
                {status.isGeneratingImage ? 'Generating Image...' : 'Generate Final Image'}
              </Button>
            </div>

          </div>

          {/* RIGHT COLUMN: Output */}
          <div className="lg:col-span-7">
            <div className="h-full bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col min-h-[600px]">
               <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Studio Output</h2>
                {generatedImageUrl && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="!py-1.5 !px-3 text-xs"
                    onClick={() => downloadImage(generatedImageUrl!, 'nano-banana-result.png')}
                    icon={<Download size={14} />}
                  >
                    Download
                  </Button>
                )}
              </div>

              <div className="flex-1 flex items-center justify-center bg-slate-950/50 rounded-xl border border-dashed border-slate-800 relative overflow-hidden group">
                {status.isGeneratingImage ? (
                  <div className="text-center space-y-4">
                    <div className="relative w-20 h-20 mx-auto">
                      <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-t-yellow-400 animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-white font-medium">Creating Masterpiece</h3>
                      <p className="text-slate-500 text-sm mt-1">Applying {lighting}...</p>
                    </div>
                  </div>
                ) : generatedImageUrl ? (
                  <div 
                    className="relative group cursor-zoom-in max-w-full max-h-full flex items-center justify-center"
                    onClick={() => setIsLightboxOpen(true)}
                  >
                    <img 
                      src={generatedImageUrl} 
                      alt="Generated Result" 
                      className="max-w-full max-h-[700px] object-contain shadow-2xl rounded-lg"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 bg-slate-950/40 rounded-lg">
                      <div className="bg-slate-900/90 text-white px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-md shadow-xl border border-slate-700 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                        <ZoomIn size={16} />
                        <span className="text-sm font-medium">View Fullscreen</span>
                      </div>
                    </div>
                  </div>
                ) : formattedPreview ? (
                   <div className="relative group max-w-full max-h-full flex items-center justify-center opacity-90 transition-opacity">
                      <img 
                        src={formattedPreview} 
                        alt="Preview with Aspect Ratio" 
                        className="max-w-full max-h-[700px] object-contain rounded-lg shadow-lg"
                      />
                      <div className="absolute top-4 left-1/2 -translate-x-1/2">
                         <span className="bg-slate-900/80 text-yellow-400 text-xs font-semibold px-3 py-1.5 rounded-full border border-yellow-500/30 backdrop-blur-sm shadow-lg">
                            PREVIEW ({aspectRatio})
                         </span>
                      </div>
                   </div>
                ) : (
                  <div className="text-center text-slate-500 max-w-sm px-6">
                    <div className="w-16 h-16 bg-slate-800/50 rounded-2xl mx-auto flex items-center justify-center mb-4">
                      <ImageIcon className="w-8 h-8 opacity-50" />
                    </div>
                    <h3 className="text-slate-300 font-medium mb-1">Ready to Create</h3>
                    <p className="text-sm">Upload a product photo to start generating professional shots.</p>
                  </div>
                )}
              </div>
              
              {generatedImageUrl && (
                <div className="mt-4 p-4 bg-slate-950 rounded-lg border border-slate-800">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Used Prompt</h4>
                  <p className="text-xs text-slate-400 line-clamp-2 hover:line-clamp-none transition-all cursor-default">
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
          className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Controls */}
          <div className="absolute top-6 right-6 flex items-center gap-4 z-10" onClick={e => e.stopPropagation()}>
            <Button 
              variant="secondary" 
              onClick={() => downloadImage(generatedImageUrl, 'nano-banana-result.png')}
              icon={<Download size={18} />}
              className="!bg-slate-800 hover:!bg-slate-700 text-white border border-slate-700"
            >
              Download
            </Button>
            <button 
              onClick={() => setIsLightboxOpen(false)}
              className="p-2.5 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
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