/**
 * LRU Cache implementation for high-performance caching
 * Used for exp() calculations in quantum gravity engine
 */

class LRUCache {
  constructor(maxSize = 256) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    if (!this.cache.has(key)) {
      this.misses++;
      return undefined;
    }
    
    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    this.hits++;
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      // Update existing
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, value);
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0
    };
  }
}

export default LRUCache;