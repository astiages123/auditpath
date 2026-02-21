import sharp from 'sharp';
import { DRY_RUN } from './config';
import { supabase } from './clients';

export async function uploadImageAsWebP(
  imageUrl: string,
  courseId: string,
  sectionTitle: string,
  index: number
): Promise<string | null> {
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would upload image: ${imageUrl}`);
    return 'https://dry-run-placeholder.com/image.webp';
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    const webpBuffer = await sharp(Buffer.from(buffer))
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const sanitizedSection = sectionTitle.replace(/[^a-zA-Z0-9-_]/g, '_');
    const path = `lessons/${courseId}/${sanitizedSection}/img_${index}.webp`;

    const { error } = await supabase.storage
      .from('lessons')
      .upload(path, webpBuffer, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('lessons')
      .getPublicUrl(path);
    return urlData.publicUrl;
  } catch (err) {
    console.error('Image processing error:', err);
    return null;
  }
}
