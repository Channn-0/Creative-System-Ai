import { ImageFile, AspectRatio } from './types';

export const fileToImageFile = (file: File): Promise<ImageFile> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Extract base64 data (remove data:image/xxx;base64, prefix)
      const base64Data = result.split(',')[1];
      resolve({
        file,
        previewUrl: URL.createObjectURL(file),
        base64: base64Data,
        mimeType: file.type,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const downloadImage = (url: string, filename: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const resizeImageToAspectRatio = (
  imageBase64: string, 
  mimeType: string, 
  aspectRatio: AspectRatio
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const [ratioW, ratioH] = aspectRatio.split(':').map(Number);
      const targetRatio = ratioW / ratioH;
      const currentRatio = img.width / img.height;

      let canvasWidth, canvasHeight;
      let drawX, drawY, drawW, drawH;

      // Determine canvas dimensions to contain the image within the target aspect ratio
      // without cropping (Letterboxing/Pillarboxing)
      if (currentRatio > targetRatio) {
         // Image is wider than target. Fit to width.
         canvasWidth = img.width;
         canvasHeight = img.width / targetRatio;
      } else {
         // Image is taller than target. Fit to height.
         canvasHeight = img.height;
         canvasWidth = img.height * targetRatio;
      }

      // Center the image
      drawX = (canvasWidth - img.width) / 2;
      drawY = (canvasHeight - img.height) / 2;
      drawW = img.width;
      drawH = img.height;

      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Fill background with white (Standard for product processing inputs)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Draw image
      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      // Return base64 (always as PNG for quality/consistency in processing)
      const dataUrl = canvas.toDataURL('image/png');
      resolve(dataUrl.split(',')[1]);
    };
    img.onerror = reject;
    img.src = `data:${mimeType};base64,${imageBase64}`;
  });
};