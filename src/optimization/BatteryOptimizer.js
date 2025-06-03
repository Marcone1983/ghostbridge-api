export default class BatteryOptimizer {
  constructor() {
    this.lastCheck = 0;
  }

  optimize(energy) {
    const now = Date.now();
    if (now - this.lastCheck < 60000) return;
    this.lastCheck = now;
    const Gfactor = 1.0;
    try {
      console.log(`BatteryOptimizer: energia=${energy}, Ĝ=${Gfactor}`);
    } catch {
      console.warn("BatteryOptimizer: errore calcolo Ĝ");
    }
  }
}