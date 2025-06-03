/**
 * Unit tests for Quantum Gravity Engine
 * As specified by the professional programmer
 */

import quantumGravityEngine from '../src/physics/QuantumGravityEngine';

console.log('=== QUANTUM GRAVITY UNIT TESTS ===\n');

// Test 1: Basic gravity calculation at different energy levels
console.log('TEST 1: Gravity calculation E → G → TTL scale');
console.log('----------------------------------------');
for (const E of [0.0, 0.5, 1.0]) {
  const G = quantumGravityEngine.calculateEffectiveG(E);
  const ttl_scale = Math.max(G, 0.01);
  console.log(`E=${E} → G=${G.toExponential(3)} → ttl_scale=${ttl_scale.toFixed(2)}`);
}

// Test 2: Quantum mode detection
console.log('\nTEST 2: Quantum mode threshold (G < 1e-4)');
console.log('----------------------------------------');
const testEnergies = [0.9, 0.95, 0.99, 1.0, 1.1];
for (const E of testEnergies) {
  const G = quantumGravityEngine.calculateEffectiveG(E);
  const isQuantum = quantumGravityEngine.isQuantumMode(G);
  console.log(`E=${E.toFixed(2)} → G=${G.toExponential(2)} → Quantum: ${isQuantum}`);
}

// Test 3: Cache performance
console.log('\nTEST 3: LRU Cache performance');
console.log('----------------------------------------');
const startTime = Date.now();
const iterations = 10000;

// First pass - cache misses
for (let i = 0; i < iterations; i++) {
  const E = (i % 100) / 100; // 100 unique values
  quantumGravityEngine.calculateEffectiveG(E);
}
const firstPassTime = Date.now() - startTime;

// Second pass - cache hits
const cacheStartTime = Date.now();
for (let i = 0; i < iterations; i++) {
  const E = (i % 100) / 100; // Same 100 values
  quantumGravityEngine.calculateEffectiveG(E);
}
const secondPassTime = Date.now() - cacheStartTime;

const cacheStats = quantumGravityEngine._expCache.getStats();
console.log(`First pass (cache building): ${firstPassTime}ms`);
console.log(`Second pass (cache hits): ${secondPassTime}ms`);
console.log(`Speedup: ${(firstPassTime / secondPassTime).toFixed(1)}x`);
console.log(`Cache stats:`, cacheStats);

// Test 4: Routing weight formula
console.log('\nTEST 4: Routing weight formula (w = base_latency * G + hops)');
console.log('----------------------------------------');
const base_latency_ms = 10;
const hops = 1;

for (const E of [0.0, 0.5, 0.9, 1.0]) {
  const G = quantumGravityEngine.calculateEffectiveG(E);
  const weight = base_latency_ms * G + hops;
  console.log(`E=${E} → G=${G.toFixed(3)} → weight=${weight.toFixed(2)}ms`);
}

// Test 5: Protocol TTL scaling
console.log('\nTEST 5: Protocol TTL scaling');
console.log('----------------------------------------');
const baseTTL = 30000; // 30 seconds base
const minTTL = 100; // 100ms minimum

for (const E of [0.0, 0.5, 0.9, 0.95, 1.0]) {
  const G = quantumGravityEngine.calculateEffectiveG(E);
  const ttlScaling = quantumGravityEngine.getProtocolTTLScaling(G);
  const finalTTL = Math.max(baseTTL * ttlScaling, minTTL);
  console.log(`E=${E} → TTL=${finalTTL.toFixed(0)}ms (${(ttlScaling * 100).toFixed(1)}% of base)`);
}

// Test 6: Threat sync frequency
console.log('\nTEST 6: Threat intelligence sync frequency');
console.log('----------------------------------------');
const baseInterval = 300000; // 5 minutes

for (const E of [0.0, 0.5, 0.9, 0.95, 1.0]) {
  const G = quantumGravityEngine.calculateEffectiveG(E);
  const syncFreq = quantumGravityEngine.getThreatSyncFrequency(G, baseInterval);
  const pushInterval = baseInterval / Math.max(G, 0.01); // As per formula
  console.log(`E=${E} → sync=${(syncFreq/1000).toFixed(1)}s → push_interval=${(pushInterval/1000).toFixed(1)}s`);
}

// Test 7: Anti-flood penalty
console.log('\nTEST 7: Anti-flood stabilizer');
console.log('----------------------------------------');
const packetRates = [100, 1000, 10000, 50000];

for (const pps of packetRates) {
  const penalty = quantumGravityEngine.calculateFloodPenalty(pps, 'test-node');
  console.log(`${pps} pps → penalty=${penalty.routingPenalty.toFixed(0)}x, throttle=${penalty.shouldThrottle}`);
}

console.log('\n✅ All tests completed');

// Display final metrics
console.log('\n=== FINAL ENGINE METRICS ===');
const finalMetrics = quantumGravityEngine.getMetrics();
console.log(JSON.stringify(finalMetrics, null, 2));