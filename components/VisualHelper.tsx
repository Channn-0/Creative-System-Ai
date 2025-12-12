
import React, { useState } from 'react';
import { X, Info, Maximize2 } from 'lucide-react';

interface VisualHelperProps {
  title: string;
  description: string;
  items: { label: string; desc: string; imageUrl?: string }[];
  isOpen: boolean;
  onClose: () => void;
}

export const VisualHelper: React.FC<VisualHelperProps> = ({ 
  title, 
  description, 
  items, 
  isOpen, 
  onClose 
}) => {
  const [zoomedImage, setZoomedImage] = useState<{url: string, label: string} | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-950 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-fadeIn flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-white dark:bg-slate-950 z-10 sticky top-0">
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <span className="p-2 bg-brand-400/10 rounded-lg text-brand-500 dark:text-brand-400">
                 <Info size={24} />
              </span>
              {title}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{description}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-900 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400 hover:text-red-500">
            <X size={24} />
          </button>
        </div>

        {/* Content - Card Grid */}
        <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50 dark:bg-slate-950">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((item, idx) => (
              <div 
                key={idx} 
                className="group flex flex-col h-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:border-brand-400 dark:hover:border-brand-400 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1"
              >
                {/* Hero Area (Image or Text Box) */}
                <div 
                  className="w-full aspect-[4/3] rounded-xl bg-slate-900 flex items-center justify-center relative overflow-hidden text-center mb-4 cursor-pointer ring-1 ring-slate-200 dark:ring-slate-800 group-hover:ring-brand-400/50 transition-all"
                  onClick={() => item.imageUrl && setZoomedImage({ url: item.imageUrl, label: item.label })}
                >
                  {item.imageUrl ? (
                    <>
                      <img 
                        src={item.imageUrl} 
                        alt={item.label} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Maximize2 className="text-white drop-shadow-md transform scale-75 group-hover:scale-100 transition-transform" size={32} />
                      </div>
                    </>
                  ) : (
                    // Fallback Text if image fails or not provided
                    <span className="text-white font-bold text-xl md:text-2xl leading-tight select-none px-4">
                      {item.label}
                    </span>
                  )}
                </div>

                {/* Text Area */}
                <div className="mt-auto px-1">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">{item.label}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Image Zoom Overlay */}
      {zoomedImage && (
        <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-fadeIn" onClick={() => setZoomedImage(null)}>
          <div className="relative max-w-5xl w-full max-h-[85vh] flex flex-col items-center">
             <img src={zoomedImage.url} alt={zoomedImage.label} className="max-w-full max-h-[75vh] rounded-lg shadow-2xl border border-slate-800" onClick={e => e.stopPropagation()} />
             <h3 className="text-white font-bold mt-6 text-xl">{zoomedImage.label}</h3>
             <button className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white transition-colors" onClick={() => setZoomedImage(null)}>
                <X size={32} />
             </button>
          </div>
        </div>
      )}
    </div>
  );
};
