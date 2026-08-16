import { useState } from 'react';
import ProductImage from './ProductImage';
import { getProductImageUrl } from '../../lib/productImages';

interface Props { images: string[]; productName?: string; }

export default function ProductGallery({ images, productName = 'Product' }: Props) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
  const safeImages = images.filter(Boolean);
  const currentImage = getProductImageUrl(safeImages[selectedImage]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  };

  return (
    <div className="space-y-4">
      <div
        className="relative w-full aspect-square bg-gray-800 rounded-xl overflow-hidden cursor-crosshair"
        onMouseEnter={() => setZoomed(true)}
        onMouseLeave={() => setZoomed(false)}
        onMouseMove={handleMouseMove}
      >
        <ProductImage
          src={currentImage}
          alt={productName}
          className="w-full h-full object-contain p-4"
          style={zoomed ? { transform: 'scale(2)', transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` } : undefined}
        />
        {safeImages.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            <div className="text-center"><div className="text-4xl mb-2">📷</div><p>No image available</p></div>
          </div>
        )}
      </div>
      {safeImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {safeImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelectedImage(i)}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                i === selectedImage ? 'border-blue-500' : 'border-transparent hover:border-gray-500'
              }`}
            >
              <ProductImage src={img} alt={`${productName} view ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
