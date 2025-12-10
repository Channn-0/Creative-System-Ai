import React from 'react';
import { X, Calendar, Trash2, Image as ImageIcon } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
  onDelete: (id: string) => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({ 
  isOpen, 
  onClose, 
  history, 
  onSelect, 
  onClear,
  onDelete
}) => {
  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Sidebar Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/50 dark:bg-slate-950/50 backdrop-blur-md">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-400" />
              History
            </h2>
            <div className="flex items-center gap-2">
              {history.length > 0 && (
                <button 
                  onClick={onClear}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Clear All History"
                >
                  <Trash2 size={20} />
                </button>
              )}
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 p-8 text-center">
                <ImageIcon size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-medium">No history yet</p>
                <p className="text-xs mt-1 opacity-70">Generated images will appear here automatically.</p>
              </div>
            ) : (
              history.map((item) => (
                <div 
                  key={item.id} 
                  className="group relative bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:border-brand-400 dark:hover:border-brand-400 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
                  onClick={() => onSelect(item)}
                >
                  <div className="aspect-square w-full relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img 
                      src={item.imageUrl} 
                      alt="History item" 
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </div>
                  
                  <div className="p-3">
                    <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            {new Date(item.timestamp).toLocaleDateString()} • {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                            {item.prompt}
                            </p>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 font-medium">
                            {item.aspectRatio}
                        </span>
                    </div>
                  </div>

                  <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-red-500/90 text-white rounded-lg opacity-0 group-hover:opacity-100 transform translate-y-[-10px] group-hover:translate-y-0 transition-all duration-200 shadow-lg hover:bg-red-600"
                    title="Delete item"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};