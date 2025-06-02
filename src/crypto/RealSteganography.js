/**
 * REAL LSB Steganography Implementation
 * Hides messages in image files using Least Significant Bit manipulation
 */

import './cryptoPolyfill';
import { NativeModules } from 'react-native';
import RNFS from 'react-native-fs';

class RealSteganography {
  constructor() {
    this.supportedFormats = ['png', 'bmp', 'tiff'];
    this.maxMessageRatio = 0.125; // Max 12.5% of image capacity
  }

  /**
   * Hide message in image using REAL LSB steganography
   */
  async hideMessage(imagePath, secretMessage, password = null, outputPath = null) {
    try {
      console.log('🖼️ Starting REAL LSB steganography...');
      
      // Validate image format
      const format = this.getImageFormat(imagePath);
      if (!this.supportedFormats.includes(format)) {
        throw new Error(`Unsupported format: ${format}. Supported: ${this.supportedFormats.join(', ')}`);
      }

      // Load image data
      const imageData = await this.loadImageData(imagePath);
      
      // Check capacity
      const capacity = this.calculateCapacity(imageData);
      const messageSize = Buffer.from(secretMessage, 'utf8').length;
      
      if (messageSize > capacity) {
        throw new Error(`Message too large: ${messageSize} bytes > ${capacity} bytes capacity`);
      }

      console.log(`📏 Image capacity: ${capacity} bytes, Message size: ${messageSize} bytes`);

      // Prepare message with encryption if password provided
      let processedMessage = secretMessage;
      if (password) {
        processedMessage = await this.encryptMessage(secretMessage, password);
      }

      // Add message header and terminator
      const messageWithHeader = this.addMessageHeader(processedMessage);
      
      // Convert message to binary
      const messageBits = this.stringToBinary(messageWithHeader);
      
      // Perform LSB embedding
      const stegoImageData = this.embedMessageLSB(imageData, messageBits);
      
      // Save stego image
      const outputImagePath = outputPath || this.generateOutputPath(imagePath);
      await this.saveImageData(stegoImageData, outputImagePath, format);

      console.log('✅ REAL LSB steganography completed');
      
      return {
        success: true,
        outputPath: outputImagePath,
        originalSize: imageData.length,
        messageSize: messageSize,
        capacity: capacity,
        utilizationPercent: ((messageSize / capacity) * 100).toFixed(2),
        encrypted: !!password,
        format: format
      };

    } catch (error) {
      console.error('💀 LSB steganography failed:', error.message);
      throw new Error(`Steganography failed: ${error.message}`);
    }
  }

  /**
   * Extract hidden message from image using REAL LSB steganography
   */
  async extractMessage(imagePath, password = null) {
    try {
      console.log('🔍 Starting REAL LSB message extraction...');
      
      // Load image data
      const imageData = await this.loadImageData(imagePath);
      
      // Extract LSB bits
      const extractedBits = this.extractLSBBits(imageData);
      
      // Convert bits to string
      const extractedString = this.binaryToString(extractedBits);
      
      // Find message using header
      const message = this.extractMessageFromString(extractedString);
      
      if (!message) {
        throw new Error('No hidden message found in image');
      }

      // Decrypt if password provided
      let finalMessage = message;
      if (password) {
        try {
          finalMessage = await this.decryptMessage(message, password);
        } catch (error) {
          throw new Error('Failed to decrypt message - wrong password?');
        }
      }

      console.log('✅ REAL LSB message extraction completed');
      
      return {
        success: true,
        message: finalMessage,
        encrypted: !!password,
        originalLength: message.length,
        decryptedLength: finalMessage.length
      };

    } catch (error) {
      console.error('💀 LSB extraction failed:', error.message);
      throw new Error(`Extraction failed: ${error.message}`);
    }
  }

  /**
   * Load image data from file
   */
  async loadImageData(imagePath) {
    try {
      // Read file as base64
      const base64Data = await RNFS.readFile(imagePath, 'base64');
      
      // Convert to buffer
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      // For PNG, skip header and get raw pixel data
      if (this.getImageFormat(imagePath) === 'png') {
        return this.extractPNGPixelData(imageBuffer);
      }
      
      // For BMP, extract pixel data
      if (this.getImageFormat(imagePath) === 'bmp') {
        return this.extractBMPPixelData(imageBuffer);
      }
      
      // Default: return raw buffer
      return imageBuffer;
      
    } catch (error) {
      throw new Error(`Failed to load image: ${error.message}`);
    }
  }

  /**
   * Extract PNG pixel data
   */
  extractPNGPixelData(buffer) {
    // Simple PNG pixel extraction (simplified implementation)
    // In production, use a full PNG decoder
    
    // Skip PNG header (8 bytes) and find IDAT chunk
    let offset = 8;
    let pixelData = Buffer.alloc(0);
    
    while (offset < buffer.length) {
      const chunkLength = buffer.readUInt32BE(offset);
      const chunkType = buffer.toString('ascii', offset + 4, offset + 8);
      
      if (chunkType === 'IDAT') {
        // Found image data chunk
        const chunkData = buffer.slice(offset + 8, offset + 8 + chunkLength);
        pixelData = Buffer.concat([pixelData, chunkData]);
      }
      
      offset += chunkLength + 12; // Length + Type + Data + CRC
    }
    
    return pixelData;
  }

  /**
   * Extract BMP pixel data
   */
  extractBMPPixelData(buffer) {
    // BMP header is 54 bytes, pixel data starts after
    const pixelDataOffset = buffer.readUInt32LE(10);
    return buffer.slice(pixelDataOffset);
  }

  /**
   * Calculate steganography capacity
   */
  calculateCapacity(imageData) {
    // 1 bit per byte in LSB steganography
    // Reserve some space for header and terminator
    const theoreticalCapacity = Math.floor(imageData.length / 8);
    const practicalCapacity = Math.floor(theoreticalCapacity * this.maxMessageRatio);
    
    return practicalCapacity - 32; // Reserve 32 bytes for header/terminator
  }

  /**
   * Add message header for identification
   */
  addMessageHeader(message) {
    const header = 'GHOST';
    const length = message.length.toString().padStart(8, '0');
    const terminator = 'END';
    
    return header + length + message + terminator;
  }

  /**
   * Convert string to binary
   */
  stringToBinary(text) {
    return text.split('').map(char => {
      return char.charCodeAt(0).toString(2).padStart(8, '0');
    }).join('');
  }

  /**
   * Convert binary to string
   */
  binaryToString(binary) {
    const chars = [];
    for (let i = 0; i < binary.length; i += 8) {
      const byte = binary.substr(i, 8);
      if (byte.length === 8) {
        chars.push(String.fromCharCode(parseInt(byte, 2)));
      }
    }
    return chars.join('');
  }

  /**
   * Embed message bits into image using LSB
   */
  embedMessageLSB(imageData, messageBits) {
    const stegoData = Buffer.from(imageData);
    
    console.log(`🔧 Embedding ${messageBits.length} bits into ${stegoData.length} bytes`);
    
    for (let i = 0; i < messageBits.length && i < stegoData.length; i++) {
      const bit = parseInt(messageBits[i]);
      
      // Clear LSB and set new bit
      stegoData[i] = (stegoData[i] & 0xFE) | bit;
    }
    
    return stegoData;
  }

  /**
   * Extract LSB bits from image
   */
  extractLSBBits(imageData) {
    let bits = '';
    
    // Extract up to maximum possible message length
    const maxBits = Math.floor(imageData.length * this.maxMessageRatio) * 8;
    
    for (let i = 0; i < Math.min(imageData.length, maxBits / 8); i++) {
      bits += (imageData[i] & 1).toString();
    }
    
    return bits;
  }

  /**
   * Extract message from extracted string using header
   */
  extractMessageFromString(text) {
    const headerStart = text.indexOf('GHOST');
    if (headerStart === -1) {
      return null;
    }

    // Extract length
    const lengthStr = text.substr(headerStart + 5, 8);
    const messageLength = parseInt(lengthStr);
    
    if (isNaN(messageLength) || messageLength <= 0) {
      return null;
    }

    // Extract message
    const messageStart = headerStart + 13; // GHOST + 8 length chars
    const message = text.substr(messageStart, messageLength);
    
    // Verify terminator
    const terminatorStart = messageStart + messageLength;
    const terminator = text.substr(terminatorStart, 3);
    
    if (terminator !== 'END') {
      console.warn('⚠️ Terminator not found, message may be corrupted');
    }

    return message;
  }

  /**
   * Encrypt message with password
   */
  async encryptMessage(message, password) {
    const crypto = require('react-native-crypto');
    
    // Derive key from password
    const salt = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');
    
    // Encrypt message
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Combine salt + iv + encrypted
    return salt.toString('hex') + iv.toString('hex') + encrypted;
  }

  /**
   * Decrypt message with password
   */
  async decryptMessage(encryptedMessage, password) {
    const crypto = require('react-native-crypto');
    
    // Extract salt, iv, and encrypted data
    const salt = Buffer.from(encryptedMessage.substr(0, 32), 'hex');
    const iv = Buffer.from(encryptedMessage.substr(32, 32), 'hex');
    const encrypted = encryptedMessage.substr(64);
    
    // Derive key from password
    const key = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');
    
    // Decrypt message
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Save image data to file
   */
  async saveImageData(imageData, outputPath, format) {
    try {
      // Convert buffer to base64
      const base64Data = imageData.toString('base64');
      
      // Write to file
      await RNFS.writeFile(outputPath, base64Data, 'base64');
      
      console.log(`💾 Stego image saved to: ${outputPath}`);
      
    } catch (error) {
      throw new Error(`Failed to save image: ${error.message}`);
    }
  }

  /**
   * Get image format from path
   */
  getImageFormat(imagePath) {
    const extension = imagePath.split('.').pop().toLowerCase();
    return extension;
  }

  /**
   * Generate output path for stego image
   */
  generateOutputPath(inputPath) {
    const pathParts = inputPath.split('.');
    pathParts[pathParts.length - 2] += '_stego';
    return pathParts.join('.');
  }

  /**
   * Analyze image for steganography capacity
   */
  async analyzeImage(imagePath) {
    try {
      const imageData = await this.loadImageData(imagePath);
      const capacity = this.calculateCapacity(imageData);
      const format = this.getImageFormat(imagePath);
      
      return {
        path: imagePath,
        format: format,
        size: imageData.length,
        capacity: capacity,
        maxMessageLength: capacity,
        supported: this.supportedFormats.includes(format),
        utilizationRatio: this.maxMessageRatio
      };
      
    } catch (error) {
      throw new Error(`Image analysis failed: ${error.message}`);
    }
  }

  /**
   * Generate cover image for steganography
   */
  async generateCoverImage(width = 512, height = 512, outputPath) {
    try {
      // Generate random RGB data
      const pixelCount = width * height;
      const imageData = Buffer.alloc(pixelCount * 3); // RGB
      
      // Fill with pseudo-random data that looks natural
      for (let i = 0; i < imageData.length; i += 3) {
        // Generate correlated RGB values for natural look
        const base = Math.floor(Math.random() * 200) + 30; // 30-230 range
        const variation = Math.floor(Math.random() * 40) - 20; // ±20
        
        imageData[i] = Math.max(0, Math.min(255, base + variation)); // R
        imageData[i + 1] = Math.max(0, Math.min(255, base + variation)); // G
        imageData[i + 2] = Math.max(0, Math.min(255, base + variation)); // B
      }

      // Create simple BMP header
      const bmpHeader = this.createBMPHeader(width, height, imageData.length);
      const fullBMP = Buffer.concat([bmpHeader, imageData]);
      
      // Save as base64
      const base64Data = fullBMP.toString('base64');
      await RNFS.writeFile(outputPath, base64Data, 'base64');
      
      console.log(`🖼️ Generated cover image: ${width}x${height}, ${outputPath}`);
      
      return {
        path: outputPath,
        width: width,
        height: height,
        size: fullBMP.length,
        capacity: this.calculateCapacity(imageData)
      };
      
    } catch (error) {
      throw new Error(`Cover image generation failed: ${error.message}`);
    }
  }

  /**
   * Create BMP header
   */
  createBMPHeader(width, height, dataSize) {
    const header = Buffer.alloc(54);
    
    // BMP signature
    header.write('BM', 0);
    // File size
    header.writeUInt32LE(54 + dataSize, 2);
    // Reserved
    header.writeUInt32LE(0, 6);
    // Data offset
    header.writeUInt32LE(54, 10);
    // Info header size
    header.writeUInt32LE(40, 14);
    // Width
    header.writeUInt32LE(width, 18);
    // Height
    header.writeUInt32LE(height, 22);
    // Planes
    header.writeUInt16LE(1, 26);
    // Bits per pixel
    header.writeUInt16LE(24, 28);
    // Compression
    header.writeUInt32LE(0, 30);
    // Image size
    header.writeUInt32LE(dataSize, 34);
    
    return header;
  }
}

export default new RealSteganography();