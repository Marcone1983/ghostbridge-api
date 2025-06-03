import RealTensorFlowAI from "../ml/RealTensorFlowAI";
import GhostCrypto from "../crypto/GhostCrypto";
import { computeQuantumGravity } from "../physics/GravityOperator";

export default class AdaptiveThreatIntelligence {
  constructor() {
    this.tensorFlowAI = RealTensorFlowAI;
    this.threatHistory = [];
    this.modelMetrics = {
      network: { accuracy: 0.0, predictions: 0, threats: 0 },
      behavioral: { accuracy: 0.0, predictions: 0, threats: 0 },
      crypto: { accuracy: 0.0, predictions: 0, threats: 0 },
      mesh: { accuracy: 0.0, predictions: 0, threats: 0 },
      social: { accuracy: 0.0, predictions: 0, threats: 0 },
    };
    this.initialize();
  }

  async initialize() {
    try {
      await this.tensorFlowAI.initialize();
      console.log('AdaptiveThreatIntelligence initialized with real TensorFlow models');
    } catch (error) {
      console.error('Failed to initialize TensorFlow AI:', error);
    }
  }

  /**
   * Analizza minacce di rete usando il modello TensorFlow
   */
  async analyzeNetworkThreat(networkData) {
    try {
      const features = this.extractNetworkFeatures(networkData);
      const prediction = await this.tensorFlowAI.predict('network', features);
      const threatScore = prediction[0];
      
      this.modelMetrics.network.predictions++;
      if (threatScore > 0.7) {
        this.modelMetrics.network.threats++;
      }
      
      return {
        type: 'network',
        score: threatScore,
        level: threatScore > 0.7 ? 'HIGH' : threatScore > 0.4 ? 'MEDIUM' : 'LOW',
        confidence: this.calculateConfidence(prediction),
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Network threat analysis error:', error);
      return { type: 'network', score: 0.5, level: 'UNKNOWN', confidence: 0.0 };
    }
  }

  /**
   * Analizza comportamenti sospetti usando il modello behavioral
   */
  async analyzeBehavioralThreat(behaviorData) {
    try {
      const features = this.extractBehavioralFeatures(behaviorData);
      const prediction = await this.tensorFlowAI.predict('behavioral', features);
      
      // prediction è [normal, suspicious, malicious]
      const maxIndex = prediction.indexOf(Math.max(...prediction));
      const categories = ['NORMAL', 'SUSPICIOUS', 'MALICIOUS'];
      
      this.modelMetrics.behavioral.predictions++;
      if (maxIndex > 0) {
        this.modelMetrics.behavioral.threats++;
      }
      
      return {
        type: 'behavioral',
        category: categories[maxIndex],
        scores: {
          normal: prediction[0],
          suspicious: prediction[1],
          malicious: prediction[2],
        },
        level: maxIndex === 2 ? 'HIGH' : maxIndex === 1 ? 'MEDIUM' : 'LOW',
        confidence: Math.max(...prediction),
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Behavioral threat analysis error:', error);
      return { type: 'behavioral', category: 'UNKNOWN', level: 'LOW', confidence: 0.0 };
    }
  }

  /**
   * Rileva attacchi crittografici
   */
  async analyzeCryptoThreat(cryptoData) {
    try {
      const features = this.extractCryptoFeatures(cryptoData);
      const prediction = await this.tensorFlowAI.predict('crypto', features);
      const threatScore = prediction[0];
      
      this.modelMetrics.crypto.predictions++;
      if (threatScore > 0.6) {
        this.modelMetrics.crypto.threats++;
      }
      
      return {
        type: 'crypto',
        score: threatScore,
        level: threatScore > 0.6 ? 'HIGH' : threatScore > 0.3 ? 'MEDIUM' : 'LOW',
        attack_indicators: this.identifyCryptoAttackType(features, threatScore),
        confidence: this.calculateConfidence(prediction),
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Crypto threat analysis error:', error);
      return { type: 'crypto', score: 0.0, level: 'LOW', confidence: 0.0 };
    }
  }

  /**
   * Analizza compromissioni mesh network
   */
  async analyzeMeshThreat(meshData) {
    try {
      const features = this.extractMeshFeatures(meshData);
      const prediction = await this.tensorFlowAI.predict('mesh', features);
      
      // prediction è [secure, degraded, compromised, byzantine]
      const maxIndex = prediction.indexOf(Math.max(...prediction));
      const states = ['SECURE', 'DEGRADED', 'COMPROMISED', 'BYZANTINE'];
      
      this.modelMetrics.mesh.predictions++;
      if (maxIndex > 1) {
        this.modelMetrics.mesh.threats++;
      }
      
      return {
        type: 'mesh',
        state: states[maxIndex],
        scores: {
          secure: prediction[0],
          degraded: prediction[1],
          compromised: prediction[2],
          byzantine: prediction[3],
        },
        level: maxIndex >= 2 ? 'HIGH' : maxIndex === 1 ? 'MEDIUM' : 'LOW',
        confidence: Math.max(...prediction),
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Mesh threat analysis error:', error);
      return { type: 'mesh', state: 'UNKNOWN', level: 'LOW', confidence: 0.0 };
    }
  }

  /**
   * Rileva social engineering
   */
  async analyzeSocialThreat(socialData) {
    try {
      const features = this.extractSocialFeatures(socialData);
      const prediction = await this.tensorFlowAI.predict('social', features);
      
      // prediction è [legitimate, social_engineering]
      const isSocialEngineering = prediction[1] > prediction[0];
      
      this.modelMetrics.social.predictions++;
      if (isSocialEngineering) {
        this.modelMetrics.social.threats++;
      }
      
      return {
        type: 'social',
        is_social_engineering: isSocialEngineering,
        scores: {
          legitimate: prediction[0],
          social_engineering: prediction[1],
        },
        level: prediction[1] > 0.7 ? 'HIGH' : prediction[1] > 0.4 ? 'MEDIUM' : 'LOW',
        confidence: Math.max(...prediction),
        indicators: this.extractSocialEngineeringIndicators(socialData, prediction[1]),
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Social threat analysis error:', error);
      return { type: 'social', is_social_engineering: false, level: 'LOW', confidence: 0.0 };
    }
  }

  /**
   * Analisi completa multi-modello
   */
  async evaluateThreat(data, energy) {
    const results = {};
    
    // Applica gravity factor per importanza
    const Gfactor = computeQuantumGravity(energy);
    
    // Analizza con tutti i modelli in parallelo
    const [network, behavioral, crypto, mesh, social] = await Promise.all([
      this.analyzeNetworkThreat(data.network || {}),
      this.analyzeBehavioralThreat(data.behavioral || {}),
      this.analyzeCryptoThreat(data.crypto || {}),
      this.analyzeMeshThreat(data.mesh || {}),
      this.analyzeSocialThreat(data.social || {}),
    ]);

    // Calcola score aggregato
    const scores = [network.score || 0, crypto.score || 0];
    const behavioralScore = behavioral.scores ? behavioral.scores.malicious : 0;
    const meshScore = mesh.scores ? mesh.scores.compromised + mesh.scores.byzantine : 0;
    const socialScore = social.scores ? social.scores.social_engineering : 0;
    
    scores.push(behavioralScore, meshScore, socialScore);
    
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const weightedScore = avgScore * Gfactor;
    
    const overallLevel = weightedScore > 0.7 ? 'HIGH' : weightedScore > 0.4 ? 'MEDIUM' : 'LOW';
    
    const result = {
      overall: {
        score: weightedScore,
        level: overallLevel,
        gravity_factor: Gfactor,
        energy,
      },
      models: { network, behavioral, crypto, mesh, social },
      timestamp: Date.now(),
    };

    // Salva nella cronologia per federated learning
    this.threatHistory.push(result);
    if (this.threatHistory.length > 1000) {
      this.threatHistory = this.threatHistory.slice(-1000);
    }

    return result;
  }

  // Feature extraction methods
  extractNetworkFeatures(data) {
    return [
      data.latency || 30,
      data.packet_size || 512,
      data.frequency || 1.0,
      data.error_rate || 0.01,
      data.success_rate || 0.95,
      data.connection_duration || 10,
      data.retransmission_rate || 0.05,
      data.bandwidth_usage || 100,
      data.jitter || 0.1,
      data.hops || 5,
      data.packet_loss || 0.02,
      data.window_size || 1024,
      data.protocol_compliance || 0.9,
      data.session_count || 10,
      data.anomaly_score || 0.1,
    ];
  }

  extractBehavioralFeatures(data) {
    return Array.from({ length: 20 }, (_, i) => data[`feature_${i}`] || Math.random() * 0.5);
  }

  extractCryptoFeatures(data) {
    return [
      data.timing_variance || 0.1,
      data.entropy || 0.8,
      data.pattern_score || 0.2,
      data.key_strength || 256,
      data.algorithm_age || 5,
      data.side_channel_risk || 0.1,
      data.implementation_quality || 0.9,
      data.randomness_quality || 0.95,
      data.correlation_analysis || 0.05,
      data.frequency_analysis || 0.1,
      data.differential_analysis || 0.05,
      data.linear_analysis || 0.02,
    ];
  }

  extractMeshFeatures(data) {
    return Array.from({ length: 18 }, (_, i) => data[`mesh_feature_${i}`] || Math.random() * 0.7);
  }

  extractSocialFeatures(data) {
    return Array.from({ length: 25 }, (_, i) => data[`social_feature_${i}`] || Math.random() * 0.3);
  }

  calculateConfidence(prediction) {
    const max = Math.max(...prediction);
    const secondMax = prediction.sort((a, b) => b - a)[1] || 0;
    return max - secondMax; // Confidence = differenza tra prima e seconda predizione
  }

  identifyCryptoAttackType(features, score) {
    const indicators = [];
    if (features[0] > 0.5) indicators.push('timing_attack');
    if (features[2] > 0.7) indicators.push('pattern_analysis');
    if (features[5] > 0.4) indicators.push('side_channel');
    if (score > 0.8) indicators.push('advanced_persistent');
    return indicators;
  }

  extractSocialEngineeringIndicators(data, score) {
    const indicators = [];
    if (data.urgency_words) indicators.push('urgency_manipulation');
    if (data.authority_claims) indicators.push('false_authority');
    if (data.personal_info_requests) indicators.push('information_harvesting');
    if (score > 0.8) indicators.push('sophisticated_attack');
    return indicators;
  }

  async performFederatedLearning() {
    // Simula federated learning con dati storici
    if (this.threatHistory.length < 50) return;
    
    console.log('Performing federated learning update...');
    
    // Prendi gli ultimi 50 threat evaluations per retraining
    const recentThreats = this.threatHistory.slice(-50);
    
    for (const threat of recentThreats) {
      const { overall, models } = threat;
      
      // Se era una minaccia reale (HIGH), usa per online learning
      if (overall.level === 'HIGH') {
        // Retrain dei modelli che hanno identificato correttamente la minaccia
        Object.entries(models).forEach(async ([modelType, result]) => {
          if (result.level === 'HIGH' && result.confidence > 0.7) {
            // Positive reinforcement
            await this.tensorFlowAI.trainOnline(modelType, this.getFeatures(modelType, threat), [1]);
          }
        });
      }
    }
    
    console.log('Federated learning update completed');
  }

  getFeatures(modelType, threat) {
    switch (modelType) {
      case 'network': return this.extractNetworkFeatures(threat.network || {});
      case 'behavioral': return this.extractBehavioralFeatures(threat.behavioral || {});
      case 'crypto': return this.extractCryptoFeatures(threat.crypto || {});
      case 'mesh': return this.extractMeshFeatures(threat.mesh || {});
      case 'social': return this.extractSocialFeatures(threat.social || {});
      default: return [];
    }
  }

  getStats() {
    const stats = this.tensorFlowAI.getModelStats();
    return {
      ...stats,
      modelMetrics: { ...this.modelMetrics },
      threatHistory: this.threatHistory.length,
      lastThreat: this.threatHistory[this.threatHistory.length - 1]?.timestamp || null,
    };
  }

  async cleanup() {
    await this.tensorFlowAI.cleanup();
  }
}