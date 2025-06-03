// ReceiveScreen.js  
// Pagina Receive - decifra Ghost Code o estrai da immagine

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';

import GhostCrypto from '../crypto/GhostCrypto';
import RealSteganography from '../crypto/RealSteganography';
import GhostQRScanner from '../components/QRCodeScanner';
import RNFS from 'react-native-fs';

export default function ReceiveScreen() {
  const [ghostCode, setGhostCode] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [decryptedMessage, setDecryptedMessage] = useState('');
  const [activeTab, setActiveTab] = useState('ghostcode'); // 'ghostcode', 'stego', 'qr'
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Incolla da clipboard
  const pasteFromClipboard = async () => {
    const text = await Clipboard.getString();
    if (text) {
      setGhostCode(text);
      Toast.show({
        type: 'info',
        text1: 'Incollato dagli appunti',
        position: 'top',
      });
    }
  };

  // Decifra Ghost Code
  const decryptGhostCode = async () => {
    if (!ghostCode.trim()) {
      Alert.alert('Errore', 'Inserisci o incolla un Ghost Code');
      return;
    }

    setIsLoading(true);
    setDecryptedMessage('');
    
    try {
      const ghostCrypto = new GhostCrypto();
      
      // Parsing del Ghost Code
      // Formato: GHOST:password:salt:nonce:ciphertext
      const parts = ghostCode.split(':');
      
      if (parts.length !== 5 || parts[0] !== 'GHOST') {
        throw new Error('Formato Ghost Code non valido');
      }
      
      const [_, password, salt, nonce, ciphertext] = parts;
      
      // Decifra
      const decrypted = await ghostCrypto.decryptMessage(
        { salt, nonce, ciphertext },
        password
      );
      
      setDecryptedMessage(decrypted);
      
      Toast.show({
        type: 'success',
        text1: 'Messaggio decifrato!',
        position: 'top',
      });
    } catch (error) {
      console.error('Errore decifratura:', error);
      Alert.alert('Errore', 'Impossibile decifrare il Ghost Code. Verifica che sia corretto.');
    } finally {
      setIsLoading(false);
    }
  };

  // Seleziona immagine
  const selectImage = () => {
    const options = {
      mediaType: 'photo',
      quality: 1,
      selectionLimit: 1,
    };
    
    launchImageLibrary(options, (response) => {
      if (response.assets && response.assets[0]) {
        setSelectedImage(response.assets[0]);
        setDecryptedMessage('');
      }
    });
  };

  // Estrai messaggio da immagine
  const extractFromImage = async () => {
    if (!selectedImage) {
      Alert.alert('Errore', 'Seleziona un\'immagine contenente un messaggio nascosto');
      return;
    }

    setIsLoading(true);
    setDecryptedMessage('');
    
    try {
      const steganography = new RealSteganography();
      
      // Leggi l'immagine
      const imageBase64 = await RNFS.readFile(selectedImage.uri, 'base64');
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      
      // Estrai il messaggio nascosto
      const hiddenMessage = await steganography.extractData(imageBuffer);
      
      if (!hiddenMessage) {
        throw new Error('Nessun messaggio trovato nell\'immagine');
      }
      
      // Se il messaggio è JSON (cifrato), decifralo
      try {
        const parsed = JSON.parse(hiddenMessage);
        if (parsed.encrypted && parsed.password) {
          const ghostCrypto = new GhostCrypto();
          const decrypted = await ghostCrypto.decryptMessage(
            parsed.encrypted,
            parsed.password
          );
          setDecryptedMessage(decrypted);
        } else {
          setDecryptedMessage(hiddenMessage);
        }
      } catch {
        // Non è JSON, mostra come testo normale
        setDecryptedMessage(hiddenMessage);
      }
      
      Toast.show({
        type: 'success',
        text1: 'Messaggio estratto!',
        position: 'top',
      });
    } catch (error) {
      console.error('Errore estrazione:', error);
      Alert.alert('Errore', 'Impossibile estrarre il messaggio dall\'immagine');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler QR Scanner
  const handleQRScanResult = (result) => {
    setShowQRScanner(false);
    
    if (result.type === 'ghost_code') {
      setGhostCode(`GHOST:${result.messageType}:${result.content}`);
      setDecryptedMessage(result.content);
      setActiveTab('ghostcode');
      
      Toast.show({
        type: 'success',
        text1: 'QR Code Decodificato',
        text2: `Messaggio ${result.messageType} ricevuto`,
      });
    } else if (result.type === 'p2p_invite') {
      // Gestisci invito P2P
      Alert.alert(
        'Invito P2P',
        `Vuoi connetterti a ${result.displayName}?`,
        [
          { text: 'No', style: 'cancel' },
          { text: 'Sì', onPress: () => handleP2PInvite(result) },
        ]
      );
    } else {
      // QR generico
      setGhostCode(result.data);
      Toast.show({
        type: 'info',
        text1: 'QR Code Scansionato',
        text2: 'Contenuto inserito',
      });
    }
  };

  const handleP2PInvite = (invite) => {
    // TODO: Implementa connessione P2P automatica
    console.log('P2P invite:', invite);
  };

  // Reset
  const resetForm = () => {
    setGhostCode('');
    setSelectedImage(null);
    setDecryptedMessage('');
  };

  return (
    <LinearGradient colors={['#0f0f0f', '#1a1a1a']} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'ghostcode' && styles.activeTab]}
            onPress={() => setActiveTab('ghostcode')}
          >
            <Icon name="lock" size={20} color={activeTab === 'ghostcode' ? '#fff' : '#666'} />
            <Text style={[styles.tabText, activeTab === 'ghostcode' && styles.activeTabText]}>
              Ghost Code
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'stego' && styles.activeTab]}
            onPress={() => setActiveTab('stego')}
          >
            <Icon name="image" size={20} color={activeTab === 'stego' ? '#fff' : '#666'} />
            <Text style={[styles.tabText, activeTab === 'stego' && styles.activeTabText]}>
              Immagine
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'qr' && styles.activeTab]}
            onPress={() => setActiveTab('qr')}
          >
            <Icon name="qr-code-scanner" size={20} color={activeTab === 'qr' ? '#fff' : '#666'} />
            <Text style={[styles.tabText, activeTab === 'qr' && styles.activeTabText]}>
              QR Code
            </Text>
          </TouchableOpacity>
        </View>

        {/* Ghost Code Tab */}
        {activeTab === 'ghostcode' && (
          <View style={styles.tabContent}>
            <Text style={styles.label}>Inserisci Ghost Code</Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.codeInput}
                placeholder="GHOST:password:salt:nonce:ciphertext"
                placeholderTextColor="#666"
                value={ghostCode}
                onChangeText={setGhostCode}
                multiline
                numberOfLines={3}
              />
              
              <TouchableOpacity style={styles.pasteButton} onPress={pasteFromClipboard}>
                <Icon name="content-paste" size={20} color="#ff6b6b" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.decryptButton}
              onPress={decryptGhostCode}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#ff6b6b', '#ee5a6f']}
                style={styles.buttonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Icon name="lock-open" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Decifra Messaggio</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Stego Tab */}
        {activeTab === 'stego' && (
          <View style={styles.tabContent}>
            <Text style={styles.label}>Seleziona Immagine</Text>
            
            <TouchableOpacity style={styles.imageButton} onPress={selectImage}>
              {selectedImage ? (
                <View style={styles.selectedImageContainer}>
                  <Image source={{ uri: selectedImage.uri }} style={styles.selectedImage} />
                  <Text style={styles.imageText}>Tocca per cambiare</Text>
                </View>
              ) : (
                <>
                  <Icon name="add-photo-alternate" size={40} color="#666" />
                  <Text style={styles.imageText}>Seleziona immagine con messaggio nascosto</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.decryptButton}
              onPress={extractFromImage}
              disabled={isLoading || !selectedImage}
            >
              <LinearGradient
                colors={['#4ecdc4', '#44a3a0']}
                style={styles.buttonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Icon name="search" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Estrai Messaggio</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* QR Code Tab */}
        {activeTab === 'qr' && (
          <View style={styles.tabContent}>
            <Text style={styles.label}>Scanner QR Code</Text>
            <Text style={styles.description}>
              Scansiona QR Code contenenti Ghost Code, inviti P2P o contatti
            </Text>
            
            <TouchableOpacity
              style={styles.qrButton}
              onPress={() => setShowQRScanner(true)}
            >
              <LinearGradient
                colors={['#4FC3F7', '#29B6F6']}
                style={styles.buttonGradient}
              >
                <Icon name="qr-code-scanner" size={24} color="#fff" />
                <Text style={styles.buttonText}>Avvia Scanner</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.qrFeatures}>
              <View style={styles.featureItem}>
                <Icon name="lock" size={16} color="#4FC3F7" />
                <Text style={styles.featureText}>Decodifica automatica Ghost Code</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="wifi" size={16} color="#4FC3F7" />
                <Text style={styles.featureText}>Inviti P2P diretti</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="contacts" size={16} color="#4FC3F7" />
                <Text style={styles.featureText">Condivisione contatti sicuri</Text>
              </View>
            </View>
          </View>
        )}

        {/* Risultato */}
        {decryptedMessage ? (
          <View style={styles.resultContainer}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>Messaggio Decifrato</Text>
              <TouchableOpacity
                onPress={() => {
                  Clipboard.setString(decryptedMessage);
                  Toast.show({
                    type: 'info',
                    text1: 'Messaggio copiato!',
                    position: 'top',
                  });
                }}
              >
                <Icon name="content-copy" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.messageText}>{decryptedMessage}</Text>
          </View>
        ) : null}

        {/* Reset button */}
        <TouchableOpacity style={styles.resetButton} onPress={resetForm}>
          <Icon name="refresh" size={20} color="#666" />
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </ScrollView>
      
      {/* QR Scanner Modal */}
      {showQRScanner && (
        <GhostQRScanner
          onScanResult={handleQRScanResult}
          onClose={() => setShowQRScanner(false)}
        />
      )}
      
      <Toast />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#ff6b6b',
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  tabContent: {
    marginBottom: 20,
  },
  
  // Input
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  inputContainer: {
    position: 'relative',
  },
  codeInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 15,
    paddingRight: 50,
    fontSize: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2a2a3e',
    fontFamily: 'monospace',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pasteButton: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  
  // Image
  imageButton: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#2a2a3e',
    borderStyle: 'dashed',
  },
  selectedImageContainer: {
    alignItems: 'center',
  },
  selectedImage: {
    width: 150,
    height: 150,
    borderRadius: 10,
    marginBottom: 10,
  },
  imageText: {
    color: '#666',
    marginTop: 10,
    fontSize: 14,
    textAlign: 'center',
  },
  
  // Buttons
  decryptButton: {
    marginTop: 15,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  
  // QR Code
  qrButton: {
    marginBottom: 20,
  },
  description: {
    color: '#666',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  qrFeatures: {
    backgroundColor: 'rgba(79, 195, 247, 0.1)',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(79, 195, 247, 0.3)',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  featureText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  
  // Result
  resultContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4ecdc4',
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
  },
  
  // Reset
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    marginTop: 20,
    marginBottom: 30,
  },
  resetText: {
    color: '#666',
    marginLeft: 8,
    fontSize: 14,
  },
});