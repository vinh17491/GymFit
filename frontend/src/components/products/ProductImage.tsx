import { ImgHTMLAttributes, useEffect, useState } from 'react';
import { getProductImageUrl, PRODUCT_PLACEHOLDER } from '../../lib/productImages';

interface Props extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> { src?: string | null }

export default function ProductImage({ src, alt = '', onError, ...props }: Props) {
  const [resolved, setResolved] = useState(() => getProductImageUrl(src));
  useEffect(() => setResolved(getProductImageUrl(src)), [src]);
  return <img {...props} src={resolved} alt={alt} onError={event => {
    onError?.(event);
    if (resolved !== PRODUCT_PLACEHOLDER) setResolved(PRODUCT_PLACEHOLDER);
    else event.currentTarget.onerror = null;
  }} />;
}
