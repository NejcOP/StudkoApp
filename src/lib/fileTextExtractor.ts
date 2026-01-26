import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set the worker source using Vite's ?url import to get the bundled worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface ExtractedContent {
  text: string;
  fileName: string;
  fileType: string;
  pageCount?: number;
}

/**
 * Extract text from a PDF file
 */
export const extractTextFromPdf = async (file: File): Promise<ExtractedContent> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    const numPages = pdf.numPages;
    
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => {
          // Normalize Unicode text to fix encoding issues
          const str = item.str;
          // Replace common broken characters
          return str
            .normalize('NFC') // Normalize Unicode
            .replace(/\u010D/g, 'č')  // Fix č
            .replace(/\u0161/g, 'š')  // Fix š
            .replace(/\u017E/g, 'ž')  // Fix ž
            .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width spaces
        })
        .join(' ');
      fullText += pageText + '\n\n';
    }
    
    // Final cleanup
    const cleanText = fullText
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n{3,}/g, '\n\n'); // Max 2 newlines
    
    return {
      text: cleanText,
      fileName: file.name,
      fileType: 'pdf',
      pageCount: numPages
    };
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw new Error('Napaka pri branju PDF dokumenta.');
  }
};

/**
 * Extract text from a TXT file
 */
export const extractTextFromTxt = async (file: File): Promise<ExtractedContent> => {
  try {
    const text = await file.text();
    return {
      text: text.trim(),
      fileName: file.name,
      fileType: 'txt'
    };
  } catch (error) {
    console.error('Error reading TXT file:', error);
    throw new Error('Napaka pri branju tekstovne datoteke.');
  }
};

/**
 * Extract text from an image using AI OCR
 * For now, we'll create a placeholder that returns a message for images
 * The actual OCR will be handled server-side
 */
export const extractTextFromImage = async (file: File): Promise<ExtractedContent> => {
  // For images, we'll return the file info and let the backend handle OCR
  return {
    text: `[Slika: ${file.name}]\nSistema bo analiziral sliko in ekstrahiral besedilo.`,
    fileName: file.name,
    fileType: file.type.startsWith('image/') ? 'image' : 'unknown'
  };
};

/**
 * Main function to extract text from any supported file type
 */
export const extractTextFromFile = async (file: File): Promise<ExtractedContent> => {
  const fileName = file.name.toLowerCase();
  const fileType = file.type;
  
  // PDF files
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return extractTextFromPdf(file);
  }
  
  // Text files
  if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
    return extractTextFromTxt(file);
  }
  
  // Image files
  if (fileType.startsWith('image/') || 
      fileName.endsWith('.png') || 
      fileName.endsWith('.jpg') || 
      fileName.endsWith('.jpeg')) {
    return extractTextFromImage(file);
  }
  
  throw new Error('Nepodprta vrsta datoteke.');
};

/**
 * Convert file to base64 for sending to AI
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data:xxx;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};
