
import { ImageFile, AspectRatio, HistoryItem } from './types';

export const fileToImageFile = (file: File): Promise<ImageFile> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
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

export const getImageDimensions = (base64: string, mimeType: string): Promise<{width: number, height: number}> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = `data:${mimeType};base64,${base64}`;
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

/**
 * Maps any arbitrary width/height ratio to the closest aspect ratio 
 * supported by the Gemini Image API.
 */
export const getClosestSupportedAspectRatio = (width: number, height: number): string => {
    const ratio = width / height;
    const supported = [
        { r: 1, val: '1:1' },
        { r: 2/3, val: '2:3' },
        { r: 3/2, val: '3:2' },
        { r: 3/4, val: '3:4' },
        { r: 4/3, val: '4:3' },
        { r: 4/5, val: '4:5' },
        { r: 5/4, val: '5:4' },
        { r: 9/16, val: '9:16' },
        { r: 16/9, val: '16:9' },
        { r: 21/9, val: '21:9' }
    ];
    
    return supported.reduce((prev, curr) => 
        Math.abs(curr.r - ratio) < Math.abs(prev.r - ratio) ? curr : prev
    ).val;
};

export const resizeImageToAspectRatio = (
  imageBase64: string, 
  mimeType: string, 
  aspectRatio: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const [ratioW, ratioH] = aspectRatio.split(':').map(Number);
      const targetRatio = ratioW / ratioH;
      const currentRatio = img.width / img.height;

      let canvasWidth, canvasHeight;
      if (targetRatio > 1) {
          canvasWidth = Math.max(img.width, 1024);
          canvasHeight = canvasWidth / targetRatio;
      } else {
          canvasHeight = Math.max(img.height, 1024);
          canvasWidth = canvasHeight * targetRatio;
      }

      let sx, sy, sWidth, sHeight;
      if (currentRatio > targetRatio) {
        sHeight = img.height;
        sWidth = img.height * targetRatio;
        sx = (img.width - sWidth) / 2;
        sy = 0;
      } else {
        sWidth = img.width;
        sHeight = img.width / targetRatio;
        sx = 0;
        sy = (img.height - sHeight) / 2;
      }

      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvasWidth, canvasHeight);
      const dataUrl = canvas.toDataURL('image/png');
      resolve(dataUrl.split(',')[1]);
    };
    img.onerror = reject;
    img.src = `data:${mimeType};base64,${imageBase64}`;
  });
};

export const addFilmGrain = (
    imageBase64: string,
    intensity: number = 0.04
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            const workerCode = `
                self.onmessage = function(e) {
                    const { imageData, intensity } = e.data;
                    const data = imageData.data;
                    for (let i = 0; i < data.length; i += 4) {
                        const noise = (Math.random() - 0.5) * 255 * intensity;
                        data[i] = Math.min(255, Math.max(0, data[i] + noise));
                        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
                        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
                    }
                    self.postMessage({ imageData });
                };
            `;
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const worker = new Worker(URL.createObjectURL(blob));

            worker.onmessage = (e) => {
                ctx.putImageData(e.data.imageData, 0, 0);
                resolve(canvas.toDataURL('image/png'));
                worker.terminate();
                URL.revokeObjectURL(blob.toString());
            };

            worker.postMessage({ imageData, intensity });
        };
        img.onerror = reject;
        img.src = imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`;
    });
};

export const historyDB = {
  async open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('n-era-db', 1);
      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('history')) {
          db.createObjectStore('history', { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getAll(): Promise<HistoryItem[]> {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('history', 'readonly');
        const store = tx.objectStore('history');
        const request = store.getAll();
        request.onsuccess = () => {
          const items = request.result as HistoryItem[];
          items.sort((a, b) => b.timestamp - a.timestamp);
          resolve(items);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      return [];
    }
  },

  async add(item: HistoryItem): Promise<void> {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('history', 'readwrite');
        const store = tx.objectStore('history');
        store.put(item);
        const getAllReq = store.getAll();
        getAllReq.onsuccess = () => {
          const items = getAllReq.result as HistoryItem[];
          if (items.length > 15) {
             items.sort((a, b) => b.timestamp - a.timestamp);
             const toDelete = items.slice(15);
             toDelete.forEach(i => store.delete(i.id));
          }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {}
  },

  async delete(id: string): Promise<void> {
    try {
      const db = await this.open();
      const tx = db.transaction('history', 'readwrite');
      tx.objectStore('history').delete(id);
      return new Promise((resolve) => {
          tx.oncomplete = () => resolve();
      });
    } catch (e) {}
  },

  async clear(): Promise<void> {
    try {
      const db = await this.open();
      const tx = db.transaction('history', 'readwrite');
      tx.objectStore('history').clear();
      return new Promise((resolve) => {
          tx.oncomplete = () => resolve();
      });
    } catch (e) {}
  }
};
