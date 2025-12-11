
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
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md transition-opacity" onClick={onClose} />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-fadeIn flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md z-10 sticky top-0">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Info size={20} className="text-brand-400" />
              {title}
            </h3>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-slate-950">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.map((item, idx) => (
              <div 
                key={idx} 
                className="group relative flex flex-col gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-brand-400/30 dark:hover:border-brand-400/30 transition-all hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                {/* Image Area */}
                <div 
                  className="relative w-full aspect-video rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 cursor-zoom-in"
                  onClick={() => item.imageUrl && setZoomedImage({ url: item.imageUrl, label: item.label })}
                >
                  {item.imageUrl ? (
                    <>
                      <img src={item.imageUrl} alt={item.label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Maximize2 className="text-white drop-shadow-md" size={20} />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      No Preview
                    </div>
                  )}
                </div>

                {/* Text Area */}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-200">{item.label}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Footer Fade */}
        <div className="h-6 bg-gradient-to-t from-white dark:from-slate-900 to-transparent pointer-events-none absolute bottom-0 left-0 right-0" />
      </div>

      {/* Image Zoom Overlay */}
      {zoomedImage && (
        <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-fadeIn" onClick={() => setZoomedImage(null)}>
          <div className="relative max-w-4xl w-full max-h-[80vh] flex flex-col items-center">
             <img src={zoomedImage.url} alt={zoomedImage.label} className="max-w-full max-h-[70vh] rounded-lg shadow-2xl border border-slate-800" onClick={e => e.stopPropagation()} />
             <h3 className="text-white font-bold mt-4 text-lg">{zoomedImage.label}</h3>
             <p className="text-slate-400 text-sm mt-1">Tap anywhere to close</p>
             <button className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white" onClick={() => setZoomedImage(null)}>
                <X size={32} />
             </button>
          </div>
        </div>
      )}
    </div>
  );
};
