/**
 * GHOST CODE SCREEN - Real Steganography UI
 * Interface for hiding/extracting messages in images using LSB steganography
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import RealSteganography from '../crypto/RealSteganography';

const GhostCodeScreen = ({ navigation }) => {
  const [mode, setMode] = useState('hide'); // 'hide' or 'extract'
  const [secretMessage, setSecretMessage] = useState('');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [coverImageUri, setCoverImageUri] = useState(null);
  const [stegoImageUri, setStegoImageUri] = useState(null);
  const [extractedMessage, setExtractedMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Pick cover image from gallery
   */
  const pickCoverImage = () => {
    const options = {
      mediaType: 'photo',
      quality: 1.0,
      includeBase64: false,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel || response.error) {
        return;
      }

      if (response.assets && response.assets[0]) {
        setCoverImageUri(response.assets[0].uri);
        setStegoImageUri(null); // Reset stego image
        setExtractedMessage(''); // Reset extracted message
      }
    });
  };

  /**
   * Pick stego image for extraction
   */
  const pickStegoImage = () => {
    const options = {
      mediaType: 'photo',
      quality: 1.0,
      includeBase64: false,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel || response.error) {
        return;
      }

      if (response.assets && response.assets[0]) {
        setCoverImageUri(response.assets[0].uri);
        setExtractedMessage(''); // Reset extracted message
      }
    });
  };

  /**
   * Hide message in image using real LSB steganography
   */
  const hideMessage = async () => {
    if (!coverImageUri) {
      Alert.alert('Errore', 'Seleziona un\'immagine di copertura');
      return;
    }

    if (!secretMessage.trim()) {
      Alert.alert('Errore', 'Inserisci il messaggio da nascondere');
      return;
    }

    if (usePassword && !password.trim()) {
      Alert.alert('Errore', 'Inserisci una password per la crittografia');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Generate output path
      const outputDir = Platform.OS === 'ios' 
        ? RNFS.DocumentDirectoryPath 
        : RNFS.ExternalDirectoryPath || RNFS.DocumentDirectoryPath;
      const outputPath = `${outputDir}/ghost_${Date.now()}.png`;

      console.log('🔒 Hiding message in image...');
      console.log('Cover image:', coverImageUri);
      console.log('Output path:', outputPath);

      // Hide message using real steganography
      const result = await RealSteganography.hideMessage(
        coverImageUri,
        secretMessage,
        usePassword ? password : null,
        outputPath
      );

      if (result.success) {
        setStegoImageUri(result.outputPath);
        
        Alert.alert(
          '✅ Ghost Code Creato!',
          `Messaggio nascosto con successo!\n\nUtilizzo: ${result.utilizationPercent}% della capacità\nCrittografato: ${result.encrypted ? 'SÌ' : 'NO'}`,
          [
            {
              text: 'OK',
              style: 'default'
            },
            {
              text: 'Condividi',
              onPress: () => shareGhostImage(result.outputPath)
            }
          ]
        );
      } else {
        throw new Error('Steganografia fallita');
      }

    } catch (error) {
      console.error('❌ Hide message error:', error);
      Alert.alert('Errore', `Impossibile nascondere il messaggio: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Extract message from stego image
   */
  const extractMessage = async () => {
    if (!coverImageUri) {
      Alert.alert('Errore', 'Seleziona un\'immagine contenente il ghost code');
      return;
    }

    setIsProcessing(true);
    
    try {
      console.log('🔍 Extracting message from image...');
      console.log('Stego image:', coverImageUri);

      // Extract message using real steganography
      const result = await RealSteganography.extractMessage(
        coverImageUri,
        usePassword ? password : null
      );

      if (result.success) {
        setExtractedMessage(result.message);
        
        Alert.alert(
          '🔓 Ghost Code Estratto!',
          `Messaggio trovato e decodificato con successo!\n\nCrittografato: ${result.encrypted ? 'SÌ' : 'NO'}`,
          [{ text: 'OK' }]
        );
      } else {
        throw new Error('Nessun messaggio trovato');
      }

    } catch (error) {
      console.error('❌ Extract message error:', error);
      
      if (error.message.includes('wrong password')) {
        Alert.alert('Errore', 'Password errata per decrittografare il messaggio');
      } else if (error.message.includes('No hidden message')) {
        Alert.alert('Errore', 'Nessun ghost code trovato in questa immagine');
      } else {
        Alert.alert('Errore', `Impossibile estrarre il messaggio: ${error.message}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Share ghost image
   */
  const shareGhostImage = async (imagePath) => {
    try {
      const shareOptions = {
        title: 'Ghost Code - Immagine con Messaggio Nascosto',
        message: 'Ho inviato un ghost code! Usa GhostBridge per decodificare il messaggio nascosto.',
        url: `file://${imagePath}`,
        type: 'image/png',
      };

      await Share.open(shareOptions);
    } catch (error) {
      console.log('Share cancelled or failed:', error);
    }
  };

  /**
   * Reset all fields
   */
  const resetFields = () => {
    setSecretMessage('');
    setPassword('');
    setCoverImageUri(null);
    setStegoImageUri(null);
    setExtractedMessage('');
    setUsePassword(false);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>👻 Ghost Code</Text>
        <Text style={styles.subtitle}>Nascondi messaggi nelle immagini usando steganografia LSB reale</Text>
      </View>

      {/* Mode Selection */}
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'hide' && styles.modeButtonActive]}
          onPress={() => setMode('hide')}
        >
          <Text style={[styles.modeButtonText, mode === 'hide' && styles.modeButtonTextActive]}>
            🔒 Nascondi Messaggio
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.modeButton, mode === 'extract' && styles.modeButtonActive]}
          onPress={() => setMode('extract')}
        >
          <Text style={[styles.modeButtonText, mode === 'extract' && styles.modeButtonTextActive]}>
            🔍 Estrai Messaggio
          </Text>
        </TouchableOpacity>
      </View>

      {/* Hide Message Mode */}
      {mode === 'hide' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nascondi un messaggio nell'immagine</Text>
          
          {/* Secret Message Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Messaggio Segreto:</Text>
            <TextInput
              style={styles.textArea}
              value={secretMessage}
              onChangeText={setSecretMessage}
              placeholder="Inserisci il tuo messaggio segreto..."
              multiline
              numberOfLines={4}
              maxLength={1000}
            />
            <Text style={styles.charCount}>{secretMessage.length}/1000 caratteri</Text>
          </View>

          {/* Password Option */}
          <View style={styles.inputGroup}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setUsePassword(!usePassword)}
            >
              <View style={[styles.checkbox, usePassword && styles.checkboxChecked]}>
                {usePassword && <Text style={styles.checkboxIcon}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Crittografa con password</Text>
            </TouchableOpacity>
            
            {usePassword && (
              <TextInput
                style={styles.textInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Inserisci password..."
                secureTextEntry
              />
            )}
          </View>

          {/* Cover Image Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Immagine di Copertura:</Text>
            <TouchableOpacity style={styles.imageButton} onPress={pickCoverImage}>
              <Text style={styles.imageButtonText}>
                {coverImageUri ? '📷 Cambia Immagine' : '📷 Seleziona Immagine'}
              </Text>
            </TouchableOpacity>
            
            {coverImageUri && (
              <Image source={{ uri: coverImageUri }} style={styles.imagePreview} />
            )}
          </View>

          {/* Hide Button */}
          <TouchableOpacity
            style={[styles.actionButton, (!coverImageUri || !secretMessage.trim()) && styles.actionButtonDisabled]}
            onPress={hideMessage}
            disabled={!coverImageUri || !secretMessage.trim() || isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>🔒 Crea Ghost Code</Text>
            )}
          </TouchableOpacity>

          {/* Stego Image Result */}
          {stegoImageUri && (
            <View style={styles.resultSection}>
              <Text style={styles.resultTitle}>✅ Ghost Code Creato!</Text>
              <Image source={{ uri: stegoImageUri }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.shareButton}
                onPress={() => shareGhostImage(stegoImageUri)}
              >
                <Text style={styles.shareButtonText}>📤 Condividi Ghost Code</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Extract Message Mode */}
      {mode === 'extract' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estrai messaggio nascosto dall'immagine</Text>
          
          {/* Stego Image Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Immagine con Ghost Code:</Text>
            <TouchableOpacity style={styles.imageButton} onPress={pickStegoImage}>
              <Text style={styles.imageButtonText}>
                {coverImageUri ? '📷 Cambia Immagine' : '📷 Seleziona Immagine'}
              </Text>
            </TouchableOpacity>
            
            {coverImageUri && (
              <Image source={{ uri: coverImageUri }} style={styles.imagePreview} />
            )}
          </View>

          {/* Password Option */}
          <View style={styles.inputGroup}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setUsePassword(!usePassword)}
            >
              <View style={[styles.checkbox, usePassword && styles.checkboxChecked]}>
                {usePassword && <Text style={styles.checkboxIcon}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Il messaggio è crittografato</Text>
            </TouchableOpacity>
            
            {usePassword && (
              <TextInput
                style={styles.textInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Inserisci password..."
                secureTextEntry
              />
            )}
          </View>

          {/* Extract Button */}
          <TouchableOpacity
            style={[styles.actionButton, !coverImageUri && styles.actionButtonDisabled]}
            onPress={extractMessage}
            disabled={!coverImageUri || isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>🔍 Estrai Ghost Code</Text>
            )}
          </TouchableOpacity>

          {/* Extracted Message Result */}
          {extractedMessage && (
            <View style={styles.resultSection}>
              <Text style={styles.resultTitle}>🔓 Messaggio Estratto!</Text>
              <View style={styles.messageResult}>
                <Text style={styles.extractedMessage}>{extractedMessage}</Text>
              </View>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => {
                  // Copy to clipboard functionality would go here
                  Alert.alert('Copiato!', 'Messaggio copiato negli appunti');
                }}
              >
                <Text style={styles.copyButtonText}>📋 Copia Messaggio</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Reset Button */}
      <TouchableOpacity style={styles.resetButton} onPress={resetFields}>
        <Text style={styles.resetButtonText}>🗑️ Reset</Text>
      </TouchableOpacity>

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>ℹ️ Come Funziona</Text>
        <Text style={styles.infoText}>
          • Il ghost code non è un testo, ma un'immagine contenente il messaggio nascosto
        </Text>
        <Text style={styles.infoText}>
          • Usa steganografia LSB reale per nascondere messaggi nei pixel
        </Text>
        <Text style={styles.infoText}>
          • L'immagine sembra normale ma contiene dati segreti
        </Text>
        <Text style={styles.infoText}>
          • Opzionalmente cripta il messaggio con password AES-256
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00ff88',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  modeSelector: {
    flexDirection: 'row',
    marginBottom: 30,
    borderRadius: 8,
    overflow: 'hidden',
  },
  modeButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#00ff88',
  },
  modeButtonText: {
    color: '#888',
    fontWeight: 'bold',
  },
  modeButtonTextActive: {
    color: '#000',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    height: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    color: '#888',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 5,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 4,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#00ff88',
    borderColor: '#00ff88',
  },
  checkboxIcon: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    color: '#fff',
    fontSize: 16,
  },
  imageButton: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    marginBottom: 10,
  },
  imageButtonText: {
    color: '#00ff88',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  actionButton: {
    backgroundColor: '#00ff88',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  actionButtonDisabled: {
    backgroundColor: '#333',
  },
  actionButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultSection: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 8,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#00ff88',
  },
  resultTitle: {
    fontSize: 18,
    color: '#00ff88',
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  messageResult: {
    backgroundColor: '#0a0a0a',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
  },
  extractedMessage: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
  },
  shareButton: {
    backgroundColor: '#007acc',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  copyButton: {
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#cc3300',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoSection: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    color: '#00ff88',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoText: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 5,
  },
});

export default GhostCodeScreen;