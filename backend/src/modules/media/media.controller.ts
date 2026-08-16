import { Request, Response } from 'express';
import { query } from '../../config/database';
import { execSync } from 'child_process';
import path from 'path';
import { mkdirSync, existsSync, unlinkSync, statSync, readdirSync } from 'fs';

const MEDIA_ROOT = path.join(__dirname, '../../public/media/products');
const TEMP_DIR = path.join(__dirname, '../../temp');

// Ensure directories exist
if (!existsSync(MEDIA_ROOT)) mkdirSync(MEDIA_ROOT, { recursive: true });
if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });

interface Product {
  id: number;
  product_name: string;
  slug: string;
  brand_name: string;
  category_id: number;
  sub_category: string;
  main_image: string | null;
}

// Search Amazon for product images
async function searchAmazonImages(brand: string, productName: string): Promise<string[]> {
  const searchQuery = `${brand} ${productName}`.replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const encodedQuery = encodeURIComponent(searchQuery);
  
  try {
    const searchFile = path.join(TEMP_DIR, `search_${Date.now()}.html`);
    const productFile = path.join(TEMP_DIR, `product_${Date.now()}.html`);
    
    // Search Amazon
    const searchCmd = `curl -s -L -o "${searchFile}" \
      -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' \
      -H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' \
      -H 'Accept-Language: en-US,en;q=0.5' \
      'https://www.amazon.com/s?k=${encodedQuery}'`;
    
    execSync(searchCmd, { timeout: 15000 });
    
    // Extract ASINs
    const asinCmd = `grep -oP 'data-asin="[A-Z0-9]{10}"' "${searchFile}" | head -5 | grep -oP '[A-Z0-9]{10}'`;
    const asins = execSync(asinCmd, { encoding: 'utf-8' }).trim().split('\n').filter(Boolean);
    
    // Cleanup search file
    try { unlinkSync(searchFile); } catch {}
    
    if (asins.length === 0) return [];
    
    // Get product page
    const productCmd = `curl -s -L -o "${productFile}" \
      -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' \
      -H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' \
      -H 'Accept-Language: en-US,en;q=0.5' \
      'https://www.amazon.com/dp/${asins[0]}'`;
    
    execSync(productCmd, { timeout: 15000 });
    
    // Extract high-res image URL
    const imgCmd = `grep -oP 'https://m\\.media-amazon\\.com/images/I/[^"]+_AC_SL1500_\\.jpg' "${productFile}" | head -1`;
    const imgUrl = execSync(imgCmd, { encoding: 'utf-8' }).trim();
    
    // Cleanup product file
    try { unlinkSync(productFile); } catch {}
    
    return imgUrl ? [imgUrl] : [];
  } catch (error) {
    return [];
  }
}

// Download and convert to WebP
async function downloadAndConvert(imageUrl: string, outputPath: string): Promise<boolean> {
  try {
    const tempJpg = path.join(TEMP_DIR, `dl_${Date.now()}.jpg`);
    
    // Download
    const dlCmd = `curl -s -L -o "${tempJpg}" \
      -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' \
      '${imageUrl}'`;
    execSync(dlCmd, { timeout: 20000 });
    
    // Check file size (>10KB = real image)
    const stats = statSync(tempJpg);
    if (stats.size < 10000) {
      try { unlinkSync(tempJpg); } catch {}
      return false;
    }
    
    // Convert to WebP using Python PIL
    const convertCmd = `python -c "from PIL import Image; img=Image.open(r'${tempJpg}'); img.save(r'${outputPath}', 'WEBP', quality=80); print('OK')"`;
    const result = execSync(convertCmd, { timeout: 15000, encoding: 'utf-8' });
    
    try { unlinkSync(tempJpg); } catch {}
    
    return result.includes('OK');
  } catch (error) {
    return false;
  }
}

// Generate thumbnail
async function generateThumbnail(mainPath: string, thumbPath: string): Promise<boolean> {
  try {
    const cmd = `python -c "from PIL import Image; img=Image.open(r'${mainPath}'); img.thumbnail((300,300)); img.save(r'${thumbPath}', 'WEBP', quality=75); print('OK')"`;
    const result = execSync(cmd, { timeout: 10000, encoding: 'utf-8' });
    return result.includes('OK');
  } catch {
    return false;
  }
}

// Process single product
export async function processProductMedia(req: Request, res: Response) {
  const { productId } = req.params;
  
  try {
    const productResult = await query<Product>(`
      SELECT p.id, p.product_name, p.slug, p.brand_id, p.category_id, p.sub_category, p.main_image,
             b.name as brand_name
      FROM Products p
      LEFT JOIN Brands b ON p.brand_id = b.id
      WHERE p.id = @id
    `, { id: parseInt(productId) });
    
    if (productResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const product = productResult.recordset[0];
    
    // Search for images
    const imageUrls = await searchAmazonImages(product.brand_name, product.product_name);
    
    if (imageUrls.length === 0) {
      return res.json({ status: 'MEDIA_PENDING', product: product.id, message: 'No images found' });
    }
    
    // Create product directory
    const brandSlug = product.brand_name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const productSlug = product.slug || product.product_name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const productDir = path.join(MEDIA_ROOT, brandSlug, productSlug);
    mkdirSync(productDir, { recursive: true });
    
    // Download main image
    const mainPath = path.join(productDir, 'main.webp');
    const success = await downloadAndConvert(imageUrls[0], mainPath);
    
    if (!success) {
      return res.json({ status: 'FAILED', product: product.id, message: 'Download failed' });
    }
    
    // Generate thumbnail
    const thumbPath = path.join(productDir, 'thumbnail.webp');
    await generateThumbnail(mainPath, thumbPath);
    
    // Update database
    const mediaPath = `/media/products/${brandSlug}/${productSlug}/main.webp`;
    await query('UPDATE Products SET main_image = @mainImage WHERE id = @id', { id: product.id, mainImage: mediaPath });
    
    // Delete old SVG
    const oldSvgPath = path.join(MEDIA_ROOT, brandSlug, productSlug, 'main.svg');
    if (existsSync(oldSvgPath)) unlinkSync(oldSvgPath);
    
    return res.json({ status: 'OK', product: product.id, path: mediaPath });
    
  } catch (error) {
    return res.status(500).json({ error: 'Media processing failed' });
  }
}

// Batch process all products
export async function batchProcessMedia(req: Request, res: Response) {
  try {
    const products = await query<Product>(`
      SELECT p.id, p.product_name, p.slug, p.brand_id, p.category_id, p.sub_category, p.main_image,
             b.name as brand_name
      FROM Products p
      LEFT JOIN Brands b ON p.brand_id = b.id
      ORDER BY p.id
    `);
    
    const results: Array<{id:number;status:string;path?:string}> = [];
    
    for (const product of products.recordset) {
      try {
        // Skip if already has webp
        if (product.main_image && product.main_image.includes('.webp')) {
          results.push({ id: product.id, status: 'SKIPPED', path: product.main_image });
          continue;
        }
        
        // Search for images
        const imageUrls = await searchAmazonImages(product.brand_name, product.product_name);
        
        if (imageUrls.length === 0) {
          results.push({ id: product.id, status: 'MEDIA_PENDING' });
          continue;
        }
        
        // Create product directory
        const brandSlug = product.brand_name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const productSlug = product.slug || product.product_name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const productDir = path.join(MEDIA_ROOT, brandSlug, productSlug);
        mkdirSync(productDir, { recursive: true });
        
        // Download main image
        const mainPath = path.join(productDir, 'main.webp');
        const success = await downloadAndConvert(imageUrls[0], mainPath);
        
        if (!success) {
          results.push({ id: product.id, status: 'FAILED' });
          continue;
        }
        
        // Generate thumbnail
        const thumbPath = path.join(productDir, 'thumbnail.webp');
        await generateThumbnail(mainPath, thumbPath);
        
        // Update database
        const mediaPath = `/media/products/${brandSlug}/${productSlug}/main.webp`;
        await query('UPDATE Products SET main_image = @mainImage WHERE id = @id', { id: product.id, mainImage: mediaPath });
        
        // Delete old SVG
        const oldSvgPath = path.join(MEDIA_ROOT, brandSlug, productSlug, 'main.svg');
        if (existsSync(oldSvgPath)) unlinkSync(oldSvgPath);
        
        results.push({ id: product.id, status: 'OK', path: mediaPath });
        
      } catch (error) {
        results.push({ id: product.id, status: 'ERROR' });
      }
    }
    
    const summary = {
      total: results.length,
      ok: results.filter(r => r.status === 'OK').length,
      skipped: results.filter(r => r.status === 'SKIPPED').length,
      pending: results.filter(r => r.status === 'MEDIA_PENDING').length,
      failed: results.filter(r => r.status === 'FAILED').length,
      error: results.filter(r => r.status === 'ERROR').length,
      details: results
    };
    
    return res.json(summary);
    
  } catch (error) {
    return res.status(500).json({ error: 'Media processing failed' });
  }
}

// Get status
export async function getMediaStatus(req: Request, res: Response) {
  try {
    const total = await query('SELECT COUNT(*) as count FROM Products');
    const withWebp = await query(`SELECT COUNT(*) as count FROM Products WHERE main_image LIKE '%.webp'`);
    const withSvg = await query(`SELECT COUNT(*) as count FROM Products WHERE main_image LIKE '%.svg'`);
    const withNull = await query(`SELECT COUNT(*) as count FROM Products WHERE main_image IS NULL`);
    
    // Count files on disk
    let filesOnDisk = 0;
    try {
      const walk = (dir: string) => {
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(fullPath);
          else if (entry.name.endsWith('.webp')) filesOnDisk++;
        }
      };
      walk(MEDIA_ROOT);
    } catch {}
    
    return res.json({
      total: total.recordset[0].count,
      with_webp: withWebp.recordset[0].count,
      with_svg: withSvg.recordset[0].count,
      with_null: withNull.recordset[0].count,
      files_on_disk: filesOnDisk
    });
  } catch (error) {
    return res.status(500).json({ error: 'Media status unavailable' });
  }
}
