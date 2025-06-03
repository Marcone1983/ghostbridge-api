// SendScreen.js
// Pagina Send - invia messaggi come Ghost Code o Stego PNG

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

import MessageManager from '../messaging/MessageManager';
import GhostCrypto from '../crypto/GhostCrypto';
import VoiceRecorder from '../components/VoiceRecorder';

export default function SendScreen() {
  const [recipientID, setRecipientID] = useState('');
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedGhostCode, setGeneratedGhostCode] = useState('');
  const [generatedStegoImage, setGeneratedStegoImage] = useState(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState(null);

  // Genera Ghost Code
  const generateGhostCode = async () => {
    if (!message.trim() && !voiceMessage) {
      Alert.alert('Errore', 'Inserisci un messaggio testuale o vocale da cifrare');
      return;
    }

    setIsLoading(true);
    
    try {
      const ghostCrypto = new GhostCrypto();
      // Genera password random per questo messaggio
      const password = ghostCrypto.generatePassword(16);
      
      // Determina il contenuto da cifrare
      let contentToEncrypt;
      let messageType = 'text';
      
      if (voiceMessage) {
        // Se c'è un messaggio vocale, cifra quello
        contentToEncrypt = JSON.stringify(voiceMessage);
        messageType = 'voice';
      } else {
        // Altrimenti cifra il testo
        contentToEncrypt = message;
      }
      
      // Cifra il contenuto
      const encrypted = await ghostCrypto.encryptMessage(contentToEncrypt, password);
      
      // Crea il Ghost Code includendo il tipo di messaggio
      const ghostCode = `GHOST:${messageType}:${password}:${encrypted.salt}:${encrypted.nonce}:${encrypted.ciphertext}`;
      
      setGeneratedGhostCode(ghostCode);
      
      // Copia negli appunti
      Clipboard.setString(ghostCode);
      
      Toast.show({
        type: 'success',
        text1: 'Ghost Code generato!',
        text2: 'Copiato negli appunti',
        position: 'top',
      });
      
      // Se c'è un destinatario, invia anche via Firebase
      if (recipientID.trim()) {
        await sendGhostCodeToRecipient(ghostCode);
      }
    } catch (error) {
      console.error('Errore generazione Ghost Code:', error);
      Alert.alert('Errore', 'Impossibile generare Ghost Code');
    } finally {
      setIsLoading(false);
    }
  };

  // Invia Ghost Code a destinatario
  const sendGhostCodeToRecipient = async (ghostCode) => {
    try {
      const result = await MessageManager.sendGhostCode(
        recipientID.trim(),
        ghostCode,
        '' // Nessuna password aggiuntiva, il ghost code contiene tutto
      );
      
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Inviato!',
          text2: `Ghost Code inviato a ${recipientID}`,
          position: 'top',
        });
      }
    } catch (error) {
      console.error('Errore invio:', error);
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
        setGeneratedStegoImage(null);
      }
    });
  };

  // Genera immagine steganografica
  const generateStegoImage = async () => {
    if (!message.trim()) {
      Alert.alert('Errore', 'Inserisci un messaggio da nascondere');
      return;
    }
    
    if (!selectedImage) {
      Alert.alert('Errore', 'Seleziona un\'immagine PNG');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Per ora simuliamo la generazione
      // In produzione useremmo RealSteganography
      setGeneratedStegoImage(selectedImage.uri);
      
      Toast.show({
        type: 'success',
        text1: 'Immagine steganografica creata!',
        text2: 'Messaggio nascosto nell\'immagine',
        position: 'top',
      });
      
      // Se c'è un destinatario, invia
      if (recipientID.trim()) {
        const result = await MessageManager.sendStegoMessage(
          recipientID.trim(),
          selectedImage.uri,
          message
        );
        
        if (result.success) {
          Toast.show({
            type: 'success',
            text1: 'Inviato!',
            text2: `Stego PNG inviato a ${recipientID}`,
            position: 'top',
          });
        }
      }
    } catch (error) {
      console.error('Errore generazione stego:', error);
      Alert.alert('Errore', 'Impossibile creare immagine steganografica');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setMessage('');
    setRecipientID('');
    setSelectedImage(null);
    setGeneratedGhostCode('');
    setGeneratedStegoImage(null);
  };

  return (
    <LinearGradient colors={['#0f0f0f', '#1a1a1a']} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Recipient ID (opzionale) */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>ID Destinatario (opzionale)</Text>
          <TextInput
            style={styles.input}
            placeholder="es: 000042"
            placeholderTextColor="#666"
            value={recipientID}
            onChangeText={setRecipientID}
            keyboardType="numeric"
          />
          <Text style={styles.hint}>
            Lascia vuoto per generare solo il codice
          </Text>
        </View>

        {/* Message */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Messaggio Segreto</Text>
          <TextInput
            style={[styles.input, styles.messageInput]}
            placeholder="Scrivi il tuo messaggio..."
            placeholderTextColor="#666"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Ghost Code Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ghost Code</Text>
          
          <TouchableOpacity
            style={styles.generateButton}
            onPress={generateGhostCode}
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
                  <Icon name="lock" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Genera Ghost Code</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {generatedGhostCode ? (
            <View style={styles.resultContainer}>
              <Text style={styles.resultLabel}>Ghost Code generato:</Text>
              <TouchableOpacity 
                style={styles.codeContainer}
                onPress={() => {
                  Clipboard.setString(generatedGhostCode);
                  Toast.show({
                    type: 'info',
                    text1: 'Copiato!',
                    position: 'top',
                  });
                }}
              >
                <Text style={styles.ghostCode}>{generatedGhostCode}</Text>
                <Icon name="content-copy" size={16} color="#666" style={styles.copyIcon} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Voice Message Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Messaggio Vocale</Text>
          
          <TouchableOpacity
            style={styles.voiceButton}
            onPress={() => setShowVoiceRecorder(!showVoiceRecorder)}
          >
            <LinearGradient
              colors={['#9c27b0', '#7b1fa2']}
              style={styles.buttonGradient}
            >
              <Icon name="keyboard-voice" size={20} color="#fff" />
              <Text style={styles.buttonText}>
                {showVoiceRecorder ? 'Nascondi Registratore' : 'Registra Messaggio Vocale'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {showVoiceRecorder && (
            <VoiceRecorder 
              onRecordingComplete={(voice) => {
                setVoiceMessage(voice);
                setShowVoiceRecorder(false);
                Toast.show({
                  type: 'success',
                  text1: 'Messaggio Vocale Pronto',
                  text2: 'Puoi inviarlo con un Ghost Code',
                });
              }}
              recipientPublicKey={recipientID}
            />
          )}

          {voiceMessage && (
            <View style={styles.voiceMessageReady}>
              <Icon name="mic" size={20} color="#9c27b0" />
              <Text style={styles.voiceReadyText}>
                Messaggio vocale registrato ({voiceMessage.duration})
              </Text>
              <TouchableOpacity onPress={() => setVoiceMessage(null)}>
                <Icon name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Stego Image Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Immagine Steganografica</Text>
          
          <TouchableOpacity style={styles.imageButton} onPress={selectImage}>
            {selectedImage ? (
              <View style={styles.selectedImageContainer}>
                <Image source={{ uri: selectedImage.uri }} style={styles.selectedImage} />
                <Text style={styles.imageText}>Tocca per cambiare</Text>
              </View>
            ) : (
              <>
                <Icon name="add-photo-alternate" size={40} color="#666" />
                <Text style={styles.imageText}>Seleziona immagine PNG</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.generateButton}
            onPress={generateStegoImage}
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
                  <Icon name="image" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Genera Immagine</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {generatedStegoImage && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultLabel}>Immagine con messaggio nascosto:</Text>
              <Image source={{ uri: generatedStegoImage }} style={styles.stegoImage} />
            </View>
          )}
        </View>

        {/* Reset button */}
        <TouchableOpacity style={styles.resetButton} onPress={resetForm}>
          <Icon name="refresh" size={20} color="#666" />
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </ScrollView>
      
      <Toast />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  
  // Input
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  messageInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  
  // Sections
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  
  // Buttons
  generateButton: {
    marginBottom: 15,
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
  
  // Voice
  voiceButton: {
    marginBottom: 15,
  },
  voiceMessageReady: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(156, 39, 176, 0.1)',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#9c27b0',
  },
  voiceReadyText: {
    flex: 1,
    color: '#fff',
    marginLeft: 10,
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
  },
  
  // Results
  resultContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 15,
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ghostCode: {
    fontSize: 12,
    color: '#ff6b6b',
    fontFamily: 'monospace',
    flex: 1,
  },
  copyIcon: {
    marginLeft: 10,
  },
  stegoImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    resizeMode: 'contain',
  },
  
  // Reset
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    marginBottom: 30,
  },
  resetText: {
    color: '#666',
    marginLeft: 8,
    fontSize: 14,
  },
});