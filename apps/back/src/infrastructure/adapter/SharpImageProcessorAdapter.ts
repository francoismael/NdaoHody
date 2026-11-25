import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { ImageProcessor, ProcessedImage } from '../../application/port/ImageProcessor';
import { DomainException } from '../../domain/exception/DomainException';

const PROFILE_PHOTO_SIZE = 512;
/** Large enough to read the text of a licence or a plate. */
const DOCUMENT_MAX_SIZE = 1600;
const JPEG_QUALITY = 82;
const UNREADABLE_IMAGE_MESSAGE = "Cette image n'est pas lisible. Essaie avec une autre photo.";

@Injectable()
export class SharpImageProcessorAdapter extends ImageProcessor {
  toProfilePhoto(content: Buffer): Promise<ProcessedImage> {
    return this.toJpeg(content, { width: PROFILE_PHOTO_SIZE, height: PROFILE_PHOTO_SIZE, fit: 'cover' });
  }

  toDocumentImage(content: Buffer): Promise<ProcessedImage> {
    return this.toJpeg(content, {
      width: DOCUMENT_MAX_SIZE,
      height: DOCUMENT_MAX_SIZE,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  private async toJpeg(content: Buffer, resize: sharp.ResizeOptions): Promise<ProcessedImage> {
    try {
      const image = await sharp(content)
        .rotate() // applies the phone's EXIF orientation, then drops the metadata (GPS position...)
        .resize(resize)
        .jpeg({ quality: JPEG_QUALITY })
        .toBuffer();
      return { content: image, extension: 'jpg' };
    } catch {
      throw new DomainException('invalid', UNREADABLE_IMAGE_MESSAGE);
    }
  }
}
