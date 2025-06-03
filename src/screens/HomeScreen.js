// HomeScreen.js
// Pagina Home con tutte le implementazioni e info

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AuthManager from '../firebase/AuthManager';
import GhostCrypto from '../crypto/GhostCrypto';
import AdaptiveThreatIntelligence from '../intelligence/AdaptiveThreatIntelligence';
import QuantumMeshNetwork from '../network/QuantumMeshNetwork';
import GhostProtocols from '../network/GhostProtocols';

export default function HomeScreen() {
  const [myGhostID, setMyGhostID] = useState(null);
  const [securityStatus, setSecurityStatus] = useState({});
  const [isChecking, setIsChecking] = useState(false);
  const [threatIntelligence, setThreatIntelligence] = useState(null);
  const [networkStats, setNetworkStats] = useState(null);
  const [protocolStats, setProtocolStats] = useState(null);

  useEffect(() => {
    initializeApp();
    checkSecurityStatus();
    initializeAdvancedSystems();
  }, []);

  const initializeApp = async () => {
    try {
      await AuthManager.initialize();
      
      const unsubscribe = AuthManager.addAuthStateListener((state) => {
        if (state.authenticated) {
          setMyGhostID(state.ghostID);
        }
      });
      
      if (!AuthManager.isAuthenticated()) {
        await AuthManager.loginAnonymously();
      }
    } catch (error) {
      console.error('Errore inizializzazione:', error);
    }
  };

  const checkSecurityStatus = async () => {
    setIsChecking(true);
    const ghostCrypto = new GhostCrypto();
    
    try {
      const status = {
        apkIntegrity: await ghostCrypto.checkAPKIntegrity(),
        runtimeTampering: await ghostCrypto.checkRuntimeTampering(),
        memoryTampering: ghostCrypto.checkMemoryTampering(),
        debugDetection: await ghostCrypto.checkDebuggingDetection(),
      };
      
      setSecurityStatus(status);
    } catch (error) {
      console.error('Errore controllo sicurezza:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const initializeAdvancedSystems = async () => {
    try {
      // Inizializza Adaptive Threat Intelligence
      const ati = new AdaptiveThreatIntelligence();
      setThreatIntelligence(ati.getIntelligenceStats());
      
      // Inizializza Quantum Mesh Network
      const meshNetwork = new QuantumMeshNetwork();
      const meshStats = meshNetwork.getNetworkStats();
      setNetworkStats(meshStats);
      
      // Inizializza Ghost Protocols
      const ghostProtocols = new GhostProtocols();
      const protocolInfo = ghostProtocols.getActiveProtocols();
      setProtocolStats({
        activeProtocols: protocolInfo.length,
        totalMaterialized: ghostProtocols.getProtocolStats().totalMaterialized
      });
      
      // Aggiorna stats ogni 30 secondi
      const interval = setInterval(async () => {
        setThreatIntelligence(ati.getIntelligenceStats());
        setNetworkStats(meshNetwork.getNetworkStats());
        setProtocolStats({
          activeProtocols: ghostProtocols.getActiveProtocols().length,
          totalMaterialized: ghostProtocols.getProtocolStats().totalMaterialized
        });
      }, 30000);
      
      return () => clearInterval(interval);
    } catch (error) {
      console.error('Errore inizializzazione sistemi avanzati:', error);
    }
  };

  const renderSecurityItem = (title, status, icon) => (
    <View style={styles.securityItem}>
      <Icon 
        name={icon} 
        size={24} 
        color={status?.valid === false || status?.detected ? '#ff6b6b' : '#4ecdc4'} 
      />
      <View style={styles.securityTextContainer}>
        <Text style={styles.securityTitle}>{title}</Text>
        <Text style={[
          styles.securityStatus,
          { color: status?.valid === false || status?.detected ? '#ff6b6b' : '#4ecdc4' }
        ]}>
          {status?.valid === false || status?.detected ? 'RILEVATO' : 'SICURO'}
        </Text>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={['#0f0f0f', '#1a1a1a']} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image 
            source={{ uri: 'https://i.imgur.com/Cn5l3uH.png' }}
            style={styles.logoHome}
            resizeMode="contain"
          />
        </View>

        {/* Ghost ID Card */}
        <LinearGradient
          colors={['#1a1a2e', '#16213e']}
          style={styles.idCard}
        >
          <Text style={styles.welcomeText}>Benvenuto Ghost</Text>
          <Text style={styles.ghostId}>{myGhostID || 'Loading...'}</Text>
          <Text style={styles.idDescription}>Il tuo ID univoco e anonimo</Text>
        </LinearGradient>

        {/* Revolutionary Features */}
        <Text style={styles.sectionTitle}>Funzionalità Rivoluzionarie</Text>
        
        <View style={styles.revolutionaryGrid}>
          <TouchableOpacity style={styles.revolutionaryCard}>
            <LinearGradient
              colors={['#6c5ce7', '#5f3dc4']}
              style={styles.featureGradient}
            >
              <Icon name="settings" size={32} color="#fff" />
              <Text style={styles.featureTitle}>Quantum Mesh</Text>
              <Text style={styles.featureDesc}>
                Nodi attivi: {networkStats?.totalNodes || 0}
              </Text>
              <Text style={styles.featureDesc}>
                G-Engine: {networkStats?.gravityFactor || 'N/A'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.revolutionaryCard}>
            <LinearGradient
              colors={['#a29bfe', '#6c5ce7']}
              style={styles.featureGradient}
            >
              <Icon name="blur-on" size={32} color="#fff" />
              <Text style={styles.featureTitle}>Ghost Protocols</Text>
              <Text style={styles.featureDesc}>
                Attivi: {protocolStats?.activeProtocols || 0}
              </Text>
              <Text style={styles.featureDesc}>
                Materializzati: {protocolStats?.totalMaterialized || 0}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.revolutionaryCard}>
            <LinearGradient
              colors={['#00b894', '#00a085']}
              style={styles.featureGradient}
            >
              <Icon name="psychology" size={32} color="#fff" />
              <Text style={styles.featureTitle}>Threat Intelligence</Text>
              <Text style={styles.featureDesc}>
                Livello: {threatIntelligence?.global?.networkThreatLevel || 0}%
              </Text>
              <Text style={styles.featureDesc}>
                Rilevate: {threatIntelligence?.global?.totalThreatsDetected || 0}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Core Features */}
        <Text style={styles.sectionTitle}>Funzionalità Core</Text>
        
        <View style={styles.featureGrid}>
          <TouchableOpacity style={styles.featureCard}>
            <LinearGradient
              colors={['#ff6b6b', '#ee5a6f']}
              style={styles.featureGradient}
            >
              <Icon name="lock" size={32} color="#fff" />
              <Text style={styles.featureTitle}>Ghost Code</Text>
              <Text style={styles.featureDesc}>Messaggi cifrati AES-256</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard}>
            <LinearGradient
              colors={['#4ecdc4', '#44a3a0']}
              style={styles.featureGradient}
            >
              <Icon name="image" size={32} color="#fff" />
              <Text style={styles.featureTitle}>Stego PNG</Text>
              <Text style={styles.featureDesc}>Nascondi in immagini</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard}>
            <LinearGradient
              colors={['#f7b731', '#f5af19']}
              style={styles.featureGradient}
            >
              <Icon name="timer" size={32} color="#fff" />
              <Text style={styles.featureTitle}>Auto-Delete</Text>
              <Text style={styles.featureDesc}>Messaggi temporanei</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard}>
            <LinearGradient
              colors={['#5f27cd', '#341f97']}
              style={styles.featureGradient}
            >
              <Icon name="visibility-off" size={32} color="#fff" />
              <Text style={styles.featureTitle}>100% Anonimo</Text>
              <Text style={styles.featureDesc}>Zero metadati</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* AI Models Status */}
        {threatIntelligence && (
          <>
            <Text style={styles.sectionTitle}>Modelli AI Attivi</Text>
            
            <View style={styles.aiContainer}>
              {Object.entries(threatIntelligence.models || {}).map(([modelName, stats]) => (
                <View key={modelName} style={styles.aiModelCard}>
                  <View style={styles.aiModelHeader}>
                    <Icon 
                      name="smart-toy" 
                      size={20} 
                      color={stats.accuracy > 85 ? '#4ecdc4' : stats.accuracy > 70 ? '#f7b731' : '#ff6b6b'}
                    />
                    <Text style={styles.aiModelName}>
                      {modelName.replace('_MODEL', '').replace('_', ' ')}
                    </Text>
                  </View>
                  <View style={styles.aiModelStats}>
                    <Text style={styles.aiStatText}>Accuracy: {stats.accuracy}%</Text>
                    <Text style={styles.aiStatText}>Detections: {stats.detections}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Security Status */}
        <Text style={styles.sectionTitle}>Stato Sicurezza Enterprise</Text>
        
        <View style={styles.securityContainer}>
          {renderSecurityItem('Integrità APK', securityStatus.apkIntegrity, 'security')}
          {renderSecurityItem('Runtime Protection', securityStatus.runtimeTampering, 'shield')}
          {renderSecurityItem('Memory Guard', securityStatus.memoryTampering, 'memory')}
          {renderSecurityItem('Anti-Debug', securityStatus.debugDetection, 'bug-report')}
          
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={checkSecurityStatus}
            disabled={isChecking}
          >
            <Icon name="refresh" size={20} color="#fff" />
            <Text style={styles.refreshText}>
              {isChecking ? 'Controllo...' : 'Ricontrolla'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>GhostBridge Real v1.0.0</Text>
          <Text style={styles.infoText}>
            Sistema di messaggistica anonima con crittografia end-to-end, 
            steganografia LSB e protezione enterprise-grade.
          </Text>
          <Text style={styles.infoText}>
            Nessun dato personale. Nessun login. Solo Ghost IDs.
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  
  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoHome: {
    width: 120,
    height: 120,
  },
  
  // ID Card
  idCard: {
    padding: 25,
    borderRadius: 15,
    marginBottom: 30,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  ghostId: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ff6b6b',
    fontFamily: 'monospace',
    marginBottom: 10,
  },
  idDescription: {
    fontSize: 14,
    color: '#999',
  },
  
  // Sections
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  
  // Features
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  featureCard: {
    width: '48%',
    marginBottom: 15,
  },
  featureGradient: {
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
  },
  featureDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
    textAlign: 'center',
  },
  
  // Security
  securityContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  securityTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  securityTitle: {
    fontSize: 16,
    color: '#fff',
  },
  securityStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a3e',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  refreshText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
  },
  
  // Info
  infoContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
    marginBottom: 10,
  },
  
  // Revolutionary Features
  revolutionaryGrid: {
    marginBottom: 30,
  },
  revolutionaryCard: {
    marginBottom: 15,
  },
  
  // AI Models
  aiContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 15,
    padding: 15,
    marginBottom: 30,
  },
  aiModelCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  aiModelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiModelName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
    textTransform: 'capitalize',
  },
  aiModelStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  aiStatText: {
    fontSize: 12,
    color: '#4ecdc4',
  },
});