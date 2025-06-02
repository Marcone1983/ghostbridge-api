/**
 * UX SECURITY PRESETS SYSTEM
 * Paranoid/Journalist/Casual modes with guided setup wizards
 * Simplifies 40+ security layers into user-friendly presets
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SecurityPresets = ({ onPresetSelected }) => {
  const [selectedPreset, setSelectedPreset] = useState('PARANOID');
  const [showWizard, setShowWizard] = useState(false);

  const presets = {
    CASUAL: {
      name: 'Casual User',
      description: 'Basic privacy for everyday messaging',
      icon: '😊',
      security: 'STANDARD',
      features: {
        postQuantumCrypto: false,
        torRouting: false,
        steganography: false,
        mlDetection: true,
        coverTraffic: false,
        hardwareTEE: true,
        biometrics: true,
        sidechannelProtection: false
      },
      monitoring: {
        integrityChecks: 'LOW',
        interval: 300000, // 5 minutes
        logging: 'MINIMAL'
      }
    },
    
    JOURNALIST: {
      name: 'Journalist',
      description: 'Professional-grade protection for sensitive communications',
      icon: '📰',
      security: 'HIGH',
      features: {
        postQuantumCrypto: true,
        torRouting: true,
        steganography: true,
        mlDetection: true,
        coverTraffic: true,
        hardwareTEE: true,
        biometrics: true,
        sidechannelProtection: true
      },
      monitoring: {
        integrityChecks: 'HIGH',
        interval: 60000, // 1 minute
        logging: 'DETAILED'
      }
    },
    
    PARANOID: {
      name: 'Paranoid',
      description: 'Maximum security for high-threat environments',
      icon: '🔒',
      security: 'MAXIMUM',
      features: {
        postQuantumCrypto: true,
        torRouting: true,
        steganography: true,
        mlDetection: true,
        coverTraffic: true,
        hardwareTEE: true,
        biometrics: true,
        sidechannelProtection: true,
        runtimeProtection: true,
        trafficPadding: true,
        federatedLearning: true
      },
      monitoring: {
        integrityChecks: 'MAXIMUM',
        interval: 30000, // 30 seconds
        logging: 'VERBOSE'
      }
    }
  };

  const PresetCard = ({ presetKey, preset, isSelected, onSelect }) => (
    <TouchableOpacity 
      style={[styles.presetCard, isSelected && styles.selectedCard]}
      onPress={() => onSelect(presetKey)}
    >
      <Text style={styles.presetIcon}>{preset.icon}</Text>
      <Text style={styles.presetName}>{preset.name}</Text>
      <Text style={styles.presetDescription}>{preset.description}</Text>
      <Text style={styles.securityLevel}>Security: {preset.security}</Text>
      
      <View style={styles.featuresContainer}>
        {Object.entries(preset.features).slice(0, 4).map(([feature, enabled]) => (
          <View key={feature} style={styles.featureItem}>
            <Text style={[styles.featureText, enabled ? styles.enabled : styles.disabled]}>
              {enabled ? '✅' : '❌'} {formatFeatureName(feature)}
            </Text>
          </View>
        ))}
        {Object.keys(preset.features).length > 4 && (
          <Text style={styles.moreFeatures}>
            +{Object.keys(preset.features).length - 4} more features
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const formatFeatureName = (feature) => {
    return feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const showPresetDetails = (presetKey) => {
    const preset = presets[presetKey];
    const featureList = Object.entries(preset.features)
      .map(([feature, enabled]) => `${enabled ? '✅' : '❌'} ${formatFeatureName(feature)}`)
      .join('\n');
    
    Alert.alert(
      `${preset.name} Security Preset`,
      `${preset.description}\n\nFeatures:\n${featureList}\n\nMonitoring: ${preset.monitoring.integrityChecks}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Select This Preset', onPress: () => selectPreset(presetKey) }
      ]
    );
  };

  const selectPreset = async (presetKey) => {
    try {
      setSelectedPreset(presetKey);
      await AsyncStorage.setItem('security_preset', presetKey);
      
      if (onPresetSelected) {
        onPresetSelected(presets[presetKey]);
      }
      
      Alert.alert(
        'Security Preset Applied',
        `${presets[presetKey].name} preset has been activated. Your app security is now configured optimally for your use case.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save security preset');
    }
  };

  const startSetupWizard = () => {
    setShowWizard(true);
  };

  const SecurityWizard = () => {
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState({});

    const wizardSteps = [
      {
        question: "What best describes your primary use case?",
        options: [
          { text: "Personal messaging with friends/family", value: "personal" },
          { text: "Professional communications", value: "professional" },
          { text: "Journalism or activism", value: "journalism" },
          { text: "High-sensitivity communications", value: "sensitive" }
        ]
      },
      {
        question: "What is your threat model?",
        options: [
          { text: "Casual privacy from corporations", value: "casual" },
          { text: "Protection from criminals/hackers", value: "moderate" },
          { text: "Government-level surveillance", value: "government" },
          { text: "Nation-state actors", value: "nationstate" }
        ]
      },
      {
        question: "How important is performance vs security?",
        options: [
          { text: "Prefer faster performance", value: "performance" },
          { text: "Balanced approach", value: "balanced" },
          { text: "Maximum security regardless of speed", value: "security" }
        ]
      }
    ];

    const getRecommendedPreset = () => {
      const { useCase, threatModel, priority } = answers;
      
      if (threatModel === 'nationstate' || priority === 'security') {
        return 'PARANOID';
      } else if (useCase === 'journalism' || threatModel === 'government') {
        return 'JOURNALIST';
      } else {
        return 'CASUAL';
      }
    };

    const completeWizard = () => {
      const recommended = getRecommendedPreset();
      selectPreset(recommended);
      setShowWizard(false);
    };

    if (!showWizard) return null;

    const currentStep = wizardSteps[step];

    return (
      <View style={styles.wizardOverlay}>
        <View style={styles.wizardContainer}>
          <Text style={styles.wizardTitle}>Security Setup Wizard</Text>
          <Text style={styles.wizardProgress}>Step {step + 1} of {wizardSteps.length}</Text>
          
          <Text style={styles.wizardQuestion}>{currentStep.question}</Text>
          
          {currentStep.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.wizardOption}
              onPress={() => {
                const newAnswers = { ...answers };
                const keys = ['useCase', 'threatModel', 'priority'];
                newAnswers[keys[step]] = option.value;
                setAnswers(newAnswers);
                
                if (step < wizardSteps.length - 1) {
                  setStep(step + 1);
                } else {
                  completeWizard();
                }
              }}
            >
              <Text style={styles.wizardOptionText}>{option.text}</Text>
            </TouchableOpacity>
          ))}
          
          <View style={styles.wizardButtons}>
            {step > 0 && (
              <TouchableOpacity
                style={styles.wizardBackButton}
                onPress={() => setStep(step - 1)}
              >
                <Text style={styles.wizardButtonText}>Back</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.wizardCancelButton}
              onPress={() => setShowWizard(false)}
            >
              <Text style={styles.wizardButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  useEffect(() => {
    const loadSavedPreset = async () => {
      try {
        const saved = await AsyncStorage.getItem('security_preset');
        if (saved && presets[saved]) {
          setSelectedPreset(saved);
        }
      } catch (error) {
        console.warn('Failed to load saved preset:', error);
      }
    };
    
    loadSavedPreset();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Security Presets</Text>
      <Text style={styles.subtitle}>
        Choose a security configuration that matches your needs
      </Text>
      
      <TouchableOpacity style={styles.wizardButton} onPress={startSetupWizard}>
        <Text style={styles.wizardButtonText}>🧙‍♂️ Setup Wizard</Text>
      </TouchableOpacity>
      
      <View style={styles.presetsContainer}>
        {Object.entries(presets).map(([key, preset]) => (
          <PresetCard
            key={key}
            presetKey={key}
            preset={preset}
            isSelected={selectedPreset === key}
            onSelect={showPresetDetails}
          />
        ))}
      </View>
      
      <TouchableOpacity
        style={styles.applyButton}
        onPress={() => selectPreset(selectedPreset)}
      >
        <Text style={styles.applyButtonText}>
          Apply {presets[selectedPreset].name} Preset
        </Text>
      </TouchableOpacity>
      
      <SecurityWizard />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#0a0a0a',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00ff88',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  wizardButton: {
    backgroundColor: '#444',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  wizardButtonText: {
    color: '#00ff88',
    fontSize: 16,
    fontWeight: 'bold',
  },
  presetsContainer: {
    flex: 1,
  },
  presetCard: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#333',
  },
  selectedCard: {
    borderColor: '#00ff88',
    backgroundColor: '#002211',
  },
  presetIcon: {
    fontSize: 30,
    textAlign: 'center',
    marginBottom: 10,
  },
  presetName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 5,
  },
  presetDescription: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 10,
  },
  securityLevel: {
    fontSize: 12,
    color: '#00ff88',
    textAlign: 'center',
    marginBottom: 15,
    fontWeight: 'bold',
  },
  featuresContainer: {
    marginTop: 10,
  },
  featureItem: {
    marginBottom: 5,
  },
  featureText: {
    fontSize: 12,
  },
  enabled: {
    color: '#00ff88',
  },
  disabled: {
    color: '#666',
  },
  moreFeatures: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 5,
  },
  applyButton: {
    backgroundColor: '#00ff88',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Wizard styles
  wizardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  wizardContainer: {
    backgroundColor: '#1a1a1a',
    padding: 30,
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
  },
  wizardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#00ff88',
    textAlign: 'center',
    marginBottom: 10,
  },
  wizardProgress: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  wizardQuestion: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  wizardOption: {
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  wizardOptionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  wizardButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  wizardBackButton: {
    backgroundColor: '#666',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  wizardCancelButton: {
    backgroundColor: '#cc0000',
    padding: 10,
    borderRadius: 8,
    flex: 1,
  },
});

export default SecurityPresets;