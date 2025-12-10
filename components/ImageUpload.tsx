import React, { useRef } from 'react';
import { Upload, X, Image as ImageIcon, Plus } from 'lucide-react';
import { ImageFile } from '../types';
import { fileToImageFile } from '../utils';

interface ImageUploadProps {
  label: string;
  images: ImageFile[];
  onImagesChange: (images: ImageFile[]) => void;
  selectedIndex?: number;
  onSelect?: (index: number) => void;
  optional?: boolean;
  maxFiles?: number;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ 
  label, 
  images, 
  onImagesChange,
  selectedIndex = 0,
  onSelect,
  optional = false,
  maxFiles = 5
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Handle adding new files
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const remainingSlots = maxFiles - images.length;
      if (remainingSlots <= 0) return;

      const filesToProcess = Array.from(e.target.files).slice(0, remainingSlots);
      
      try {
        const newImages = await Promise.all(filesToProcess.map(fileToImageFile));
        onImagesChange([...images, ...newImages]);
      } catch (err) {
        console.error("Failed to process images", err);
      }
      // Reset input so same file can be selected again if deleted
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const remainingSlots = maxFiles - images.length;
    if (remainingSlots <= 0) return;

    const items = e.clipboardData.items;
    const newImages: ImageFile[] = [];

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
           try {
             const imgFile = await fileToImageFile(file);
             newImages.push(imgFile);
           } catch (err) {
             console.error("Failed to process pasted image", err);
           }
        }
      }
    }
    
    if (newImages.length > 0) {
      // Limit to remaining slots
      const limitedNewImages = newImages.slice(0, remainingSlots);
      onImagesChange([...images, ...limitedNewImages]);
      e.preventDefault();
    }
  };

  const handleTriggerUpload = () => {
    if (images.length >= maxFiles) return;
    inputRef.current?.click();
  };

  const handleRemove = (indexToRemove: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newImages = images.filter((_, i) => i !== indexToRemove);
    onImagesChange(newImages);
    
    // If we removed the selected index, adjust selection
    if (onSelect) {
        if (newImages.length === 0) {
            onSelect(0); // Reset to 0 (though empty)
        } else if (indexToRemove === selectedIndex) {
            // If we removed the active one, select the first one (or previous)
            onSelect(0);
        } else if (indexToRemove < selectedIndex) {
            // If we removed one before the active one, shift index down
            onSelect(selectedIndex - 1);
        }
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between mb-2">
        <label className="block text-sm font-medium text-slate-300">
          {label} {optional && <span className="text-slate-500 text-xs">(Optional)</span>}
        </label>
        <span className="text-xs text-slate-500">{images.length}/{maxFiles}</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Main Upload Area (Only if empty) */}
      {images.length === 0 ? (
        <div
          onClick={handleTriggerUpload}
          onPaste={handlePaste}
          tabIndex={0}
          className={`
            relative group cursor-pointer 
            border-2 border-dashed border-slate-700 hover:border-slate-500
            rounded-xl bg-slate-900 hover:bg-slate-800/50
            transition-all duration-200 ease-in-out
            h-32 flex flex-col items-center justify-center text-center p-4
            outline-none focus:ring-2 focus:ring-yellow-400/50
          `}
        >
          <div className="bg-slate-800 p-2.5 rounded-full mb-2 group-hover:bg-slate-700 transition-colors">
            <Upload size={20} className="text-yellow-400" />
          </div>
          <p className="text-sm font-medium text-slate-300">Click or Paste to upload</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Main Preview (Only for selectable types like Product Photo) */}
          {onSelect && images.length > 0 && images[selectedIndex] && (
             <div className="relative h-48 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center group">
                 <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMWgydjJIMUMxeiIgZmlsbD0iIzMzMyIgZmlsbC1vcGFjaXR5PSIwLjEiLz48L3N2Zz4=')] opacity-20"></div>
                 <img 
                    src={images[selectedIndex].previewUrl} 
                    alt="Active Selection" 
                    className="max-h-full max-w-full object-contain z-10"
                 />
                 <div className="absolute top-2 left-2 z-20">
                    <span className="px-2 py-0.5 rounded bg-yellow-400 text-slate-900 text-[10px] font-bold uppercase tracking-wider">
                        Active Shot
                    </span>
                 </div>
             </div>
          )}

          {/* Grid List */}
          <div 
            className="grid grid-cols-5 gap-2"
            onPaste={handlePaste} 
            tabIndex={0} // Allow paste on the grid area too
          >
            {images.map((img, idx) => {
              const isActive = onSelect && idx === selectedIndex;
              return (
                <div 
                  key={idx}
                  onClick={() => onSelect && onSelect(idx)}
                  className={`
                    relative aspect-square rounded-lg overflow-hidden cursor-pointer
                    border-2 transition-all group
                    ${isActive 
                        ? 'border-yellow-400 ring-1 ring-yellow-400/50' 
                        : 'border-slate-700 hover:border-slate-500'}
                  `}
                >
                  <img 
                    src={img.previewUrl} 
                    alt={`Thumbnail ${idx}`} 
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Remove Button */}
                  <button
                    onClick={(e) => handleRemove(idx, e)}
                    className="absolute top-0.5 right-0.5 p-0.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                </div>
              );
            })}

            {/* Add More Button */}
            {images.length < maxFiles && (
              <button
                onClick={handleTriggerUpload}
                className="aspect-square rounded-lg border-2 border-dashed border-slate-700 hover:border-yellow-500/50 hover:bg-slate-800 flex items-center justify-center transition-all text-slate-500 hover:text-yellow-400"
                title="Add another image"
              >
                <Plus size={20} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};