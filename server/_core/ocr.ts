/**
 * OCR Service - Optical Character Recognition for screenshot text extraction
 * Uses Tesseract.js for client-side and server-side OCR processing
 */

import Tesseract from 'tesseract.js';

/**
 * Extract text from a base64-encoded image using Tesseract OCR
 *
 * @param base64Image - Base64-encoded image string (with or without data URI prefix)
 * @param language - OCR language (default: 'eng' for English)
 * @returns Extracted text from the image
 */
export async function extractTextFromImage(
  base64Image: string,
  language: string = 'eng'
): Promise<string> {
  try {
    console.log('[OCR] Starting text extraction...');

    // Remove data URI prefix if present (data:image/png;base64,...)
    const base64Data = base64Image.includes(',')
      ? base64Image.split(',')[1]
      : base64Image;

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Perform OCR recognition
    const { data } = await Tesseract.recognize(imageBuffer, language, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`[OCR] Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    const extractedText = data.text.trim();
    console.log(`[OCR] Extraction complete. Extracted ${extractedText.length} characters`);

    if (!extractedText) {
      throw new Error('No text could be extracted from the image. The image may be empty, too low quality, or contain no readable text.');
    }

    return extractedText;
  } catch (error) {
    console.error('[OCR] Text extraction failed:', error);
    throw new Error(
      `OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
      'Please ensure the image is clear and contains readable text.'
    );
  }
}

/**
 * Preprocess image data to improve OCR accuracy
 * This is a placeholder for future enhancements like:
 * - Grayscale conversion
 * - Contrast enhancement
 * - Noise reduction
 * - Deskewing
 *
 * @param base64Image - Base64-encoded image
 * @returns Preprocessed base64 image
 */
export async function preprocessImage(base64Image: string): Promise<string> {
  // For now, return the image as-is
  // Future: Use sharp or jimp for image preprocessing
  return base64Image;
}

/**
 * Validate image format and size
 *
 * @param base64Image - Base64-encoded image
 * @param maxSizeMB - Maximum allowed size in megabytes (default: 10MB)
 * @returns true if valid, throws error otherwise
 */
export function validateImage(
  base64Image: string,
  maxSizeMB: number = 10
): boolean {
  const base64Data = base64Image.includes(',')
    ? base64Image.split(',')[1]
    : base64Image;

  // Calculate size in MB
  const sizeInBytes = (base64Data.length * 3) / 4;
  const sizeInMB = sizeInBytes / (1024 * 1024);

  if (sizeInMB > maxSizeMB) {
    throw new Error(
      `Image size (${sizeInMB.toFixed(2)}MB) exceeds maximum allowed size (${maxSizeMB}MB). ` +
      'Please compress the image before uploading.'
    );
  }

  // Check for valid base64 format
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64Data)) {
    throw new Error('Invalid image format. Please provide a valid base64-encoded image.');
  }

  return true;
}

/**
 * Extract text from image with preprocessing and validation
 * This is the main entry point for OCR operations
 *
 * @param base64Image - Base64-encoded image
 * @param options - OCR options
 * @returns Extracted text
 */
export async function extractTextFromImageWithPreprocessing(
  base64Image: string,
  options: {
    language?: string;
    maxSizeMB?: number;
    preprocess?: boolean;
  } = {}
): Promise<string> {
  const {
    language = 'eng',
    maxSizeMB = 10,
    preprocess = false,
  } = options;

  // Validate image
  validateImage(base64Image, maxSizeMB);

  // Optionally preprocess
  let processedImage = base64Image;
  if (preprocess) {
    processedImage = await preprocessImage(base64Image);
  }

  // Extract text
  return await extractTextFromImage(processedImage, language);
}
