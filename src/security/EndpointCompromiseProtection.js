export default class EndpointCompromiseProtection {
  constructor() {
    // Lista estesa di endpoint consentiti per tutta l'app
    this.allowedEndpoints = new Set([
      "ghostbridge-backend.example.com",
      "quantum.ghostbridge.example.com",
      "api.ghostbridge-realm.com"
    ]);
  }

  /**
   * Verifica se l'hostname dell'URL è presente nella whitelist
   * @param {string} url - URL completo ("https://host/path")
   * @returns {boolean}
   */
  validateEndpoint(url) {
    try {
      const { hostname } = new URL(url);
      return this.allowedEndpoints.has(hostname);
    } catch (e) {
      return false;
    }
  }
}