/**
 * QUANTUM GRAVITY DEMONSTRATION
 * Shows how G→0_P affects GhostBridge systems
 */

import quantumGravityEngine from '../src/physics/QuantumGravityEngine';

console.log('🌌 QUANTUM GRAVITY ENGINE DEMONSTRATION 🌌\n');
console.log('Formula: G = G₀ * e^(-E/E_P)');
console.log('When E → E_P, G → 0 (gravity disappears)\n');

// Test different energy levels
const energyLevels = [0, 0.1, 0.3, 0.5, 0.7, 0.9, 0.95, 0.99, 1.0, 1.1];

console.log('=== GRAVITY EFFECTS AT DIFFERENT ENERGY LEVELS ===\n');
console.log('Energy | G_eff    | Mode      | Routing | TTL    | Sync(s)');
console.log('-------|----------|-----------|---------|--------|--------');

for (const energy of energyLevels) {
  const state = quantumGravityEngine.getQuantumState(energy);
  const mode = state.isQuantumMode ? 'QUANTUM' : 'Classical';
  const routing = (state.routingWeight * 100).toFixed(1) + '%';
  const ttl = (state.protocolTTL * 100).toFixed(1) + '%';
  const sync = Math.round(state.syncFrequency / 1000);
  
  console.log(
    `${energy.toFixed(2).padEnd(6)} | ` +
    `${state.G_eff.toFixed(6).padEnd(8)} | ` +
    `${mode.padEnd(9)} | ` +
    `${routing.padEnd(7)} | ` +
    `${ttl.padEnd(6)} | ` +
    `${sync}`
  );
}

console.log('\n=== SYSTEM BEHAVIOR SCENARIOS ===\n');

// Scenario 1: Normal operation
console.log('1. NORMAL OPERATION (Low Energy)');
const normalEnergy = quantumGravityEngine.computeSystemEnergy({
  packetsPerSecond: 100,
  cpuLoad: 0.2,
  threatScore: 0
});
const normalState = quantumGravityEngine.getQuantumState(normalEnergy);
console.log(`   Energy: ${normalEnergy.toFixed(3)}`);
console.log(`   Gravity: ${normalState.G_eff.toFixed(3)}`);
console.log(`   Effects: Normal routing, 5-minute protocol TTL, 5-minute threat sync\n`);

// Scenario 2: Under attack
console.log('2. UNDER ATTACK (High Threat Score)');
const attackEnergy = quantumGravityEngine.computeSystemEnergy({
  packetsPerSecond: 500,
  cpuLoad: 0.7,
  threatScore: 0.9
});
const attackState = quantumGravityEngine.getQuantumState(attackEnergy);
console.log(`   Energy: ${attackEnergy.toFixed(3)}`);
console.log(`   Gravity: ${attackState.G_eff.toFixed(3)}`);
console.log(`   Effects: ${attackState.routingWeight < 0.1 ? 'Near-instant' : 'Fast'} routing, ` +
            `${Math.round(attackState.protocolTTL * 30000)}ms protocol TTL, ` +
            `${Math.round(attackState.syncFrequency/1000)}s threat sync\n`);

// Scenario 3: DDoS flood
console.log('3. DDOS FLOOD (Extreme Traffic)');
const floodEnergy = quantumGravityEngine.computeSystemEnergy({
  packetsPerSecond: 50000,
  cpuLoad: 0.95,
  threatScore: 1.0
});
const floodState = quantumGravityEngine.getQuantumState(floodEnergy);
console.log(`   Energy: ${floodEnergy.toFixed(3)}`);
console.log(`   Gravity: ${floodState.G_eff.toExponential(2)}`);
if (floodState.isQuantumMode) {
  console.log('   🚨 QUANTUM MODE ACTIVATED!');
  console.log('   - Teleportation routing enabled');
  console.log('   - Protocols evaporate in milliseconds');
  console.log('   - Real-time threat intelligence sync');
  console.log('   - Attackers automatically isolated\n');
}

// Anti-flood demonstration
console.log('=== ANTI-FLOOD STABILIZER ===\n');
const floodPenalty = quantumGravityEngine.calculateFloodPenalty(50000, 'attacker-node');
console.log(`Flood from attacker-node at 50k pps:`);
console.log(`- Should throttle: ${floodPenalty.shouldThrottle}`);
console.log(`- Routing penalty: ${floodPenalty.routingPenalty.toFixed(0)}x`);
console.log(`- Suggested delay: ${floodPenalty.suggestedDelay}ms`);
console.log('→ Attacker isolated by physics!\n');

// Show metrics
console.log('=== ENGINE METRICS ===');
const metrics = quantumGravityEngine.getMetrics();
console.log(JSON.stringify(metrics, null, 2));