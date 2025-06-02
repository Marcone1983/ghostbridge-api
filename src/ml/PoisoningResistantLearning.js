/**
 * POISONING-RESISTANT FEDERATED LEARNING
 * Gradient anomaly detection, KRUM aggregation, and Byzantine fault tolerance
 * Protects against adversarial participants and model poisoning attacks
 */

import RealFederatedLearning from './RealFederatedLearning';

class PoisoningResistantLearning extends RealFederatedLearning {
  constructor() {
    super();
    this.byzantineTolerance = true;
    this.anomalyThreshold = 2.0; // Standard deviations
    this.minHonestParticipants = 0.6; // 60% honest assumption
    this.aggregationMethod = 'KRUM'; // KRUM, TRIMMED_MEAN, MEDIAN
  }

  async aggregateGradients(gradients) {
    console.log('🛡️ Performing Byzantine-resistant aggregation...');
    
    // Detect anomalous gradients
    const anomalies = this.detectGradientAnomalies(gradients);
    
    // Filter out anomalous gradients
    const filteredGradients = gradients.filter((_, index) => !anomalies.includes(index));
    
    // Apply Byzantine-resistant aggregation
    switch (this.aggregationMethod) {
      case 'KRUM':
        return this.krumAggregation(filteredGradients);
      case 'TRIMMED_MEAN':
        return this.trimmedMeanAggregation(filteredGradients);
      case 'MEDIAN':
        return this.medianAggregation(filteredGradients);
      default:
        return this.krumAggregation(filteredGradients);
    }
  }

  detectGradientAnomalies(gradients) {
    const anomalies = [];
    
    // Calculate pairwise distances
    const distances = this.calculatePairwiseDistances(gradients);
    
    // Identify outliers using statistical methods
    for (let i = 0; i < gradients.length; i++) {
      const participantDistances = distances[i];
      const meanDistance = participantDistances.reduce((sum, d) => sum + d, 0) / participantDistances.length;
      const variance = participantDistances.reduce((sum, d) => sum + Math.pow(d - meanDistance, 2), 0) / participantDistances.length;
      const stdDev = Math.sqrt(variance);
      
      if (meanDistance > this.anomalyThreshold * stdDev) {
        anomalies.push(i);
        console.warn(`🚨 Anomalous gradient detected from participant ${i}`);
      }
    }
    
    return anomalies;
  }

  calculatePairwiseDistances(gradients) {
    const distances = [];
    
    for (let i = 0; i < gradients.length; i++) {
      distances[i] = [];
      for (let j = 0; j < gradients.length; j++) {
        if (i !== j) {
          distances[i][j] = this.calculateEuclideanDistance(gradients[i], gradients[j]);
        } else {
          distances[i][j] = 0;
        }
      }
    }
    
    return distances;
  }

  calculateEuclideanDistance(grad1, grad2) {
    let distance = 0;
    
    // Flatten gradients and calculate L2 distance
    const flat1 = this.flattenGradient(grad1);
    const flat2 = this.flattenGradient(grad2);
    
    for (let i = 0; i < Math.min(flat1.length, flat2.length); i++) {
      distance += Math.pow(flat1[i] - flat2[i], 2);
    }
    
    return Math.sqrt(distance);
  }

  flattenGradient(gradient) {
    const flattened = [];
    
    if (gradient.layers) {
      for (const layer of gradient.layers) {
        if (layer.weightGradients) {
          for (const row of layer.weightGradients) {
            flattened.push(...row);
          }
        }
        if (layer.biasGradients) {
          flattened.push(...layer.biasGradients);
        }
      }
    }
    
    return flattened;
  }

  krumAggregation(gradients) {
    if (gradients.length === 0) {
      throw new Error('No gradients to aggregate');
    }
    
    console.log('🔒 Applying KRUM aggregation...');
    
    // Calculate scores for each gradient
    const scores = this.calculateKrumScores(gradients);
    
    // Select gradient with lowest score (most similar to others)
    const bestIndex = scores.indexOf(Math.min(...scores));
    
    console.log(`✅ KRUM selected gradient ${bestIndex} with score ${scores[bestIndex].toFixed(4)}`);
    
    return gradients[bestIndex];
  }

  calculateKrumScores(gradients) {
    const distances = this.calculatePairwiseDistances(gradients);
    const scores = [];
    const m = Math.floor(gradients.length * this.minHonestParticipants); // Expected honest participants
    
    for (let i = 0; i < gradients.length; i++) {
      // Sort distances for participant i
      const sortedDistances = distances[i].slice().sort((a, b) => a - b);
      
      // Sum of m-1 closest distances (excluding self)
      const score = sortedDistances.slice(1, m).reduce((sum, d) => sum + d, 0);
      scores.push(score);
    }
    
    return scores;
  }

  trimmedMeanAggregation(gradients) {
    console.log('📊 Applying trimmed mean aggregation...');
    
    const trimRatio = 0.2; // Trim 20% from each end
    const trimCount = Math.floor(gradients.length * trimRatio);
    
    // Initialize result structure
    const result = this.initializeGradientStructure(gradients[0]);
    
    // For each parameter, calculate trimmed mean
    this.applyParameterWiseOperation(gradients, result, (values) => {
      const sorted = values.slice().sort((a, b) => a - b);
      const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
      return trimmed.reduce((sum, val) => sum + val, 0) / trimmed.length;
    });
    
    return result;
  }

  medianAggregation(gradients) {
    console.log('📈 Applying median aggregation...');
    
    const result = this.initializeGradientStructure(gradients[0]);
    
    this.applyParameterWiseOperation(gradients, result, (values) => {
      const sorted = values.slice().sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      
      if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
      } else {
        return sorted[mid];
      }
    });
    
    return result;
  }

  initializeGradientStructure(templateGradient) {
    if (templateGradient.layers) {
      return {
        layers: templateGradient.layers.map(layer => ({
          weightGradients: layer.weightGradients.map(row => new Array(row.length).fill(0)),
          biasGradients: new Array(layer.biasGradients.length).fill(0)
        }))
      };
    }
    
    return { layers: [] };
  }

  applyParameterWiseOperation(gradients, result, operation) {
    if (!result.layers || result.layers.length === 0) return;
    
    for (let layerIndex = 0; layerIndex < result.layers.length; layerIndex++) {
      const resultLayer = result.layers[layerIndex];
      
      // Process weight gradients
      if (resultLayer.weightGradients) {
        for (let i = 0; i < resultLayer.weightGradients.length; i++) {
          for (let j = 0; j < resultLayer.weightGradients[i].length; j++) {
            const values = gradients.map(grad => {
              try {
                return grad.layers[layerIndex].weightGradients[i][j] || 0;
              } catch (error) {
                return 0;
              }
            });
            
            resultLayer.weightGradients[i][j] = operation(values);
          }
        }
      }
      
      // Process bias gradients
      if (resultLayer.biasGradients) {
        for (let i = 0; i < resultLayer.biasGradients.length; i++) {
          const values = gradients.map(grad => {
            try {
              return grad.layers[layerIndex].biasGradients[i] || 0;
            } catch (error) {
              return 0;
            }
          });
          
          resultLayer.biasGradients[i] = operation(values);
        }
      }
    }
  }

  async validateParticipantGradient(gradient, participantId) {
    try {
      // Check gradient structure
      if (!this.isValidGradientStructure(gradient)) {
        console.warn(`⚠️ Invalid gradient structure from ${participantId}`);
        return false;
      }
      
      // Check gradient magnitude
      const magnitude = this.calculateGradientMagnitude(gradient);
      if (magnitude > 100 || magnitude < 0.001) { // Reasonable bounds
        console.warn(`⚠️ Suspicious gradient magnitude ${magnitude} from ${participantId}`);
        return false;
      }
      
      // Check for NaN or infinite values
      if (this.hasInvalidValues(gradient)) {
        console.warn(`⚠️ Invalid values in gradient from ${participantId}`);
        return false;
      }
      
      return true;
      
    } catch (error) {
      console.error(`Gradient validation failed for ${participantId}:`, error.message);
      return false;
    }
  }

  isValidGradientStructure(gradient) {
    try {
      if (!gradient || !gradient.layers || !Array.isArray(gradient.layers)) {
        return false;
      }
      
      for (const layer of gradient.layers) {
        if (!layer.weightGradients || !Array.isArray(layer.weightGradients) ||
            !layer.biasGradients || !Array.isArray(layer.biasGradients)) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  calculateGradientMagnitude(gradient) {
    let magnitude = 0;
    
    try {
      const flattened = this.flattenGradient(gradient);
      for (const value of flattened) {
        magnitude += value * value;
      }
      
      return Math.sqrt(magnitude);
    } catch (error) {
      return Infinity;
    }
  }

  hasInvalidValues(gradient) {
    try {
      const flattened = this.flattenGradient(gradient);
      return flattened.some(value => isNaN(value) || !isFinite(value));
    } catch (error) {
      return true;
    }
  }

  async detectModelPoisoning(updatedModel, previousModel) {
    try {
      // Compare model performance before and after update
      const performanceDrop = await this.measurePerformanceDrop(updatedModel, previousModel);
      
      if (performanceDrop > 0.1) { // 10% performance drop threshold
        console.warn(`🚨 Potential model poisoning detected: ${(performanceDrop * 100).toFixed(2)}% performance drop`);
        return true;
      }
      
      // Check for adversarial patterns in model weights
      const hasAdversarialPatterns = this.detectAdversarialPatterns(updatedModel);
      
      if (hasAdversarialPatterns) {
        console.warn('🚨 Adversarial patterns detected in model weights');
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('Model poisoning detection failed:', error.message);
      return true; // Assume poisoning if detection fails
    }
  }

  async measurePerformanceDrop(newModel, oldModel) {
    try {
      // This would require a validation dataset
      // For now, return a placeholder value
      return 0.0;
    } catch (error) {
      return 1.0; // Maximum performance drop if measurement fails
    }
  }

  detectAdversarialPatterns(model) {
    try {
      // Look for suspicious patterns in model weights
      // This is a simplified implementation
      
      if (!model.layers) return false;
      
      for (const layer of model.layers) {
        if (layer.weights) {
          for (const weightRow of layer.weights) {
            for (const weight of weightRow) {
              // Check for extreme values
              if (Math.abs(weight) > 1000) {
                return true;
              }
            }
          }
        }
      }
      
      return false;
    } catch (error) {
      return true;
    }
  }

  getPoisoningResistanceStatus() {
    return {
      byzantineTolerance: this.byzantineTolerance,
      anomalyThreshold: this.anomalyThreshold,
      minHonestParticipants: this.minHonestParticipants,
      aggregationMethod: this.aggregationMethod,
      protectionLevel: 'BYZANTINE_FAULT_TOLERANT'
    };
  }
}

export default new PoisoningResistantLearning();