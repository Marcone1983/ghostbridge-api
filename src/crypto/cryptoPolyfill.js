/**
 * CRYPTO POLYFILL - REAL CRYPTO FOR REACT NATIVE
 * Provides Node.js crypto API compatibility for React Native
 */

// Setup React Native crypto polyfills
import 'react-native-get-random-values';
import { Buffer } from 'buffer';

// Make Buffer global for Node.js compatibility
global.Buffer = Buffer;

// Setup crypto polyfill
import crypto from 'react-native-crypto';

// Make crypto global for Node.js compatibility
if (!global.crypto) {
  global.crypto = crypto;
}

// Setup random bytes for crypto compatibility
if (!global.crypto.getRandomValues) {
  global.crypto.getRandomValues = (array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };
}

export default crypto;