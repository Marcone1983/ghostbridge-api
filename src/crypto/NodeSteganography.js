/**
 * NODE.JS LSB Steganography Implementation
 * Real implementation for hiding/extracting messages in images
 */

import './cryptoPolyfill';
const fs = require('fs');
const path = require('path');
const crypto = require('react-native-crypto');
const Jimp = require('jimp');

class NodeSteganography {
  constructor() {
    this.supportedFormats = ['png', 'bmp', 'jpg', 'jpeg'];
    this.maxMessageRatio = 0.125; // Max 12.5% of image capacity
  }

  /**
   * Hide message in image using REAL LSB steganography
   */
  async hideMessage(imagePath, secretMessage, password = null, outputPath = null) {
    try {
      console.log('🖼️ Starting REAL Node.js LSB steganography...');
      
      // Load image using Jimp
      const image = await Jimp.read(imagePath);
      console.log(`📏 Image loaded: ${image.getWidth()}x${image.getHeight()}`);
      
      // Check capacity
      const capacity = this.calculateCapacity(image);
      const messageSize = Buffer.from(secretMessage, 'utf8').length;
      
      if (messageSize > capacity) {
        throw new Error(`Message too large: ${messageSize} bytes > ${capacity} bytes capacity`);
      }

      console.log(`📏 Image capacity: ${capacity} bytes, Message size: ${messageSize} bytes`);

      // Prepare message with encryption if password provided
      let processedMessage = secretMessage;
      if (password) {
        processedMessage = await this.encryptMessage(secretMessage, password);
        console.log('🔐 Message encrypted with password');
      }

      // Add message header and terminator
      const messageWithHeader = this.addMessageHeader(processedMessage);
      
      // Convert message to binary
      const messageBits = this.stringToBinary(messageWithHeader);
      
      // Perform LSB embedding
      this.embedMessageLSB(image, messageBits);
      
      // Save stego image
      const outputImagePath = outputPath || this.generateOutputPath(imagePath);
      await image.writeAsync(outputImagePath);

      console.log('✅ REAL Node.js LSB steganography completed');
      
      return {
        success: true,
        outputPath: outputImagePath,
        originalSize: image.getWidth() * image.getHeight() * 4,
        messageSize: messageSize,
        capacity: capacity,
        utilizationPercent: ((messageSize / capacity) * 100).toFixed(2),
        encrypted: !!password,
        format: path.extname(imagePath).substring(1)
      };

    } catch (error) {
      console.error('💀 Node.js LSB steganography failed:', error.message);
      throw new Error(`Steganography failed: ${error.message}`);
    }
  }

  /**
   * Extract hidden message from image using REAL LSB steganography
   */
  async extractMessage(imagePath, password = null) {
    try {
      console.log('🔍 Starting REAL Node.js LSB message extraction...');
      
      // Load image using Jimp
      const image = await Jimp.read(imagePath);
      
      // Extract LSB bits
      const extractedBits = this.extractLSBBits(image);
      
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
          console.log('🔓 Message decrypted successfully');
        } catch (error) {
          throw new Error('Failed to decrypt message - wrong password?');
        }
      }

      console.log('✅ REAL Node.js LSB message extraction completed');
      
      return {
        success: true,
        message: finalMessage,
        encrypted: !!password,
        originalLength: message.length,
        decryptedLength: finalMessage.length
      };

    } catch (error) {
      console.error('💀 Node.js LSB extraction failed:', error.message);
      throw new Error(`Extraction failed: ${error.message}`);
    }
  }

  /**
   * Calculate steganography capacity
   */
  calculateCapacity(image) {
    // 4 channels (RGBA), 1 bit per channel per pixel
    const totalPixels = image.getWidth() * image.getHeight();
    const totalBits = totalPixels * 4; // RGBA channels
    const theoreticalCapacity = Math.floor(totalBits / 8);
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
    // Use Buffer to handle UTF-8 encoding properly
    const buffer = Buffer.from(text, 'utf8');
    return Array.from(buffer).map(byte => {
      return byte.toString(2).padStart(8, '0');
    }).join('');
  }

  /**
   * Convert binary to string
   */
  binaryToString(binary) {
    const bytes = [];
    for (let i = 0; i < binary.length; i += 8) {
      const byte = binary.substr(i, 8);
      if (byte.length === 8) {
        const byteValue = parseInt(byte, 2);
        if (byteValue >= 0 && byteValue <= 255) {
          bytes.push(byteValue);
        }
      }
    }
    // Convert bytes back to UTF-8 string
    return Buffer.from(bytes).toString('utf8');
  }

  /**
   * Embed message bits into image using LSB
   */
  embedMessageLSB(image, messageBits) {
    console.log(`🔧 Embedding ${messageBits.length} bits into image`);
    
    let bitIndex = 0;
    const width = image.getWidth();
    const height = image.getHeight();
    
    // Iterate through pixels
    for (let y = 0; y < height && bitIndex < messageBits.length; y++) {
      for (let x = 0; x < width && bitIndex < messageBits.length; x++) {
        const pixel = Jimp.intToRGBA(image.getPixelColor(x, y));
        
        // Modify LSB of each channel (R, G, B, A)
        if (bitIndex < messageBits.length) {
          pixel.r = (pixel.r & 0xFE) | parseInt(messageBits[bitIndex++]);
        }
        if (bitIndex < messageBits.length) {
          pixel.g = (pixel.g & 0xFE) | parseInt(messageBits[bitIndex++]);
        }
        if (bitIndex < messageBits.length) {
          pixel.b = (pixel.b & 0xFE) | parseInt(messageBits[bitIndex++]);
        }
        if (bitIndex < messageBits.length) {
          pixel.a = (pixel.a & 0xFE) | parseInt(messageBits[bitIndex++]);
        }
        
        // Set modified pixel back
        const newColor = Jimp.rgbaToInt(pixel.r, pixel.g, pixel.b, pixel.a);
        image.setPixelColor(newColor, x, y);
      }
    }
    
    console.log(`✅ Embedded ${bitIndex} bits successfully`);
  }

  /**
   * Extract LSB bits from image
   */
  extractLSBBits(image) {
    let bits = '';
    const width = image.getWidth();
    const height = image.getHeight();
    
    // Calculate maximum bits to extract
    const maxBits = Math.floor(width * height * 4 * this.maxMessageRatio);
    
    let bitCount = 0;
    
    // Iterate through pixels
    for (let y = 0; y < height && bitCount < maxBits; y++) {
      for (let x = 0; x < width && bitCount < maxBits; x++) {
        const pixel = Jimp.intToRGBA(image.getPixelColor(x, y));
        
        // Extract LSB from each channel
        bits += (pixel.r & 1).toString();
        bitCount++;
        if (bitCount >= maxBits) break;
        
        bits += (pixel.g & 1).toString();
        bitCount++;
        if (bitCount >= maxBits) break;
        
        bits += (pixel.b & 1).toString();
        bitCount++;
        if (bitCount >= maxBits) break;
        
        bits += (pixel.a & 1).toString();
        bitCount++;
      }
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
   * Generate output path for stego image
   */
  generateOutputPath(inputPath) {
    const dir = path.dirname(inputPath);
    const ext = path.extname(inputPath);
    const base = path.basename(inputPath, ext);
    return path.join(dir, `${base}_stego${ext}`);
  }

  /**
   * Analyze image for steganography capacity
   */
  async analyzeImage(imagePath) {
    try {
      const image = await Jimp.read(imagePath);
      const capacity = this.calculateCapacity(image);
      const format = path.extname(imagePath).substring(1);
      
      return {
        path: imagePath,
        format: format,
        width: image.getWidth(),
        height: image.getHeight(),
        size: image.getWidth() * image.getHeight() * 4,
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
      // Create new image with random noise pattern
      const image = await new Promise((resolve, reject) => {
        new Jimp(width, height, (err, img) => {
          if (err) reject(err);
          else resolve(img);
        });
      });
      
      // Fill with pseudo-random data that looks natural
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          // Generate correlated RGB values for natural look
          const base = Math.floor(Math.random() * 200) + 30; // 30-230 range
          const variation = Math.floor(Math.random() * 40) - 20; // ±20
          
          const r = Math.max(0, Math.min(255, base + variation));
          const g = Math.max(0, Math.min(255, base + variation));
          const b = Math.max(0, Math.min(255, base + variation));
          const a = 255; // Full opacity
          
          const color = Jimp.rgbaToInt(r, g, b, a);
          image.setPixelColor(color, x, y);
        }
      }
      
      // Save image
      await image.writeAsync(outputPath);
      
      console.log(`🖼️ Generated cover image: ${width}x${height}, ${outputPath}`);
      
      return {
        path: outputPath,
        width: width,
        height: height,
        size: width * height * 4,
        capacity: this.calculateCapacity(image)
      };
      
    } catch (error) {
      throw new Error(`Cover image generation failed: ${error.message}`);
    }
  }
}

module.exports = new NodeSteganography();