// MessagingScreen.js
// Schermata principale per invio/ricezione messaggi Ghost

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
  FlatList,
  RefreshControl,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import BottomSheet from 'react-native-raw-bottom-sheet';
import Toast from 'react-native-toast-message';

import AuthManager from '../firebase/AuthManager';
import MessageManager from '../messaging/MessageManager';
import styles from './MessagingScreen.styles';

export default function MessagingScreen() {
  // Stati
  const [myGhostID, setMyGhostID] = useState(null);
  const [recipientID, setRecipientID] = useState('');
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [messageType, setMessageType] = useState('ghostcode'); // 'ghostcode' o 'stegotext'
  const [isLoading, setIsLoading] = useState(false);
  const [incomingMessages, setIncomingMessages] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentMessageId, setCurrentMessageId] = useState(null);
  
  // Refs
  const bottomSheetRef = useRef();
  const messageListenerRef = useRef();

  // Inizializzazione
  useEffect(() => {
    initializeApp();
    return () => {
      // Cleanup
      if (messageListenerRef.current) {
        messageListenerRef.current();
      }
    };
  }, []);

  const initializeApp = async () => {
    try {
      // Inizializza Auth Manager
      await AuthManager.initialize();
      
      // Ascolta lo stato di autenticazione
      const unsubscribe = AuthManager.addAuthStateListener(async (state) => {
        if (state.authenticated) {
          setMyGhostID(state.ghostID);
          
          // Se non autenticato, fai login anonimo
          if (!state.ghostID) {
            await AuthManager.loginAnonymously();
          }
          
          // Inizia ad ascoltare i messaggi
          startListeningForMessages();
        }
      });
      
      // Se non ancora autenticato, fai login
      if (!AuthManager.isAuthenticated()) {
        await AuthManager.loginAnonymously();
      }
    } catch (error) {
      console.error('Errore inizializzazione:', error);
      Alert.alert('Errore', 'Impossibile inizializzare l\'app');
    }
  };

  // Ascolta messaggi in arrivo
  const startListeningForMessages = () => {
    // Rimuovi listener precedente
    if (messageListenerRef.current) {
      messageListenerRef.current();
    }
    
    // Aggiungi handler per i messaggi
    const removeHandler = MessageManager.addMessageHandler((message) => {
      handleIncomingMessage(message);
    });
    
    // Inizia ad ascoltare
    messageListenerRef.current = MessageManager.startListeningForMessages();
  };

  // Gestisci messaggio in arrivo
  const handleIncomingMessage = (message) => {
    if (message.type === 'ghostcode_received') {
      // Messaggio Ghost Code - richiede password
      setIncomingMessages(prev => [{
        ...message,
        status: 'needs_password',
        receivedAt: new Date()
      }, ...prev]);
      
      // Mostra notifica
      Toast.show({
        type: 'info',
        text1: 'Nuovo Ghost Code',
        text2: `Da: ${message.senderId}`,
        position: 'top',
      });
    } else if (message.type === 'stegotext_received') {
      // Messaggio steganografico - già decifrato
      setIncomingMessages(prev => [{
        ...message,
        status: 'decrypted',
        receivedAt: new Date()
      }, ...prev]);
      
      Toast.show({
        type: 'success',
        text1: 'Nuovo messaggio nascosto',
        text2: `Da: ${message.senderId}`,
        position: 'top',
      });
    } else if (message.type === 'error') {
      Toast.show({
        type: 'error',
        text1: 'Errore ricezione',
        text2: message.error,
        position: 'top',
      });
    }
  };

  // Invia messaggio
  const sendMessage = async () => {
    if (!recipientID.trim() || !message.trim()) {
      Alert.alert('Errore', 'Inserisci destinatario e messaggio');
      return;
    }
    
    if (messageType === 'ghostcode' && !password.trim()) {
      Alert.alert('Errore', 'Inserisci una password per il Ghost Code');
      return;
    }
    
    if (messageType === 'stegotext' && !selectedImage) {
      Alert.alert('Errore', 'Seleziona un\'immagine per nascondere il messaggio');
      return;
    }
    
    setIsLoading(true);
    
    try {
      let result;
      
      if (messageType === 'ghostcode') {
        // Invia Ghost Code
        result = await MessageManager.sendGhostCode(
          recipientID.trim(),
          message,
          password
        );
      } else {
        // Invia messaggio steganografico
        result = await MessageManager.sendStegoMessage(
          recipientID.trim(),
          selectedImage.uri,
          message
        );
      }
      
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Messaggio inviato!',
          text2: `ID: ${result.messageId}`,
          position: 'top',
        });
        
        // Reset form
        setMessage('');
        setPassword('');
        setSelectedImage(null);
        setRecipientID('');
      } else {
        Alert.alert('Errore', result.error || 'Invio fallito');
      }
    } catch (error) {
      console.error('Errore invio:', error);
      Alert.alert('Errore', 'Impossibile inviare il messaggio');
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
      }
    });
  };

  // Decifra Ghost Code con password
  const decryptGhostCode = async (messageId, password) => {
    if (!password.trim()) {
      Alert.alert('Errore', 'Inserisci la password');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await MessageManager.decryptGhostCode(messageId, password);
      
      if (result.success) {
        // Aggiorna il messaggio nella lista
        setIncomingMessages(prev => prev.map(msg => 
          msg.messageId === messageId 
            ? { ...msg, content: result.content, status: 'decrypted' }
            : msg
        ));
        
        setShowPasswordModal(false);
        setCurrentMessageId(null);
        setPassword('');
        
        Toast.show({
          type: 'success',
          text1: 'Messaggio decifrato!',
          position: 'top',
        });
      } else {
        Alert.alert('Errore', result.error || 'Password errata');
      }
    } catch (error) {
      Alert.alert('Errore', 'Impossibile decifrare il messaggio');
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh messaggi
  const onRefresh = () => {
    setRefreshing(true);
    startListeningForMessages();
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Render messaggio
  const renderMessage = ({ item }) => (
    <TouchableOpacity 
      style={styles.messageCard}
      onPress={() => {
        if (item.status === 'needs_password') {
          setCurrentMessageId(item.messageId);
          setShowPasswordModal(true);
        }
      }}
    >
      <LinearGradient
        colors={['#1a1a2e', '#16213e']}
        style={styles.messageGradient}
      >
        <View style={styles.messageHeader}>
          <Text style={styles.senderText}>Da: {item.senderId}</Text>
          <Text style={styles.timeText}>
            {item.receivedAt.toLocaleTimeString()}
          </Text>
        </View>
        
        {item.status === 'needs_password' ? (
          <View style={styles.lockedMessage}>
            <Icon name="lock" size={24} color="#ff6b6b" />
            <Text style={styles.lockedText}>Tocca per decifrare</Text>
          </View>
        ) : (
          <Text style={styles.messageContent}>{item.content}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={['#0f0f0f', '#1a1a1a']} style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>GhostBridge</Text>
          <Text style={styles.ghostId}>ID: {myGhostID || 'Loading...'}</Text>
        </View>

        {/* Tab per tipo messaggio */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, messageType === 'ghostcode' && styles.activeTab]}
            onPress={() => setMessageType('ghostcode')}
          >
            <Icon name="lock" size={20} color={messageType === 'ghostcode' ? '#fff' : '#666'} />
            <Text style={[styles.tabText, messageType === 'ghostcode' && styles.activeTabText]}>
              Ghost Code
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, messageType === 'stegotext' && styles.activeTab]}
            onPress={() => setMessageType('stegotext')}
          >
            <Icon name="image" size={20} color={messageType === 'stegotext' ? '#fff' : '#666'} />
            <Text style={[styles.tabText, messageType === 'stegotext' && styles.activeTabText]}>
              Stego PNG
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form invio */}
        <ScrollView style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="ID Destinatario (es: 000042)"
            placeholderTextColor="#666"
            value={recipientID}
            onChangeText={setRecipientID}
            keyboardType="numeric"
          />
          
          <TextInput
            style={[styles.input, styles.messageInput]}
            placeholder="Scrivi il tuo messaggio segreto..."
            placeholderTextColor="#666"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
          />
          
          {messageType === 'ghostcode' && (
            <TextInput
              style={styles.input}
              placeholder="Password (per cifrare)"
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          )}
          
          {messageType === 'stegotext' && (
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
          )}
          
          <TouchableOpacity 
            style={[styles.sendButton, isLoading && styles.disabledButton]}
            onPress={sendMessage}
            disabled={isLoading}
          >
            <LinearGradient
              colors={['#ff6b6b', '#ee5a6f']}
              style={styles.sendButtonGradient}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="send" size={20} color="#fff" />
                  <Text style={styles.sendButtonText}>Invia Messaggio</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>

        {/* Bottone inbox */}
        <TouchableOpacity 
          style={styles.inboxButton}
          onPress={() => bottomSheetRef.current.open()}
        >
          <LinearGradient
            colors={['#4ecdc4', '#44a3a0']}
            style={styles.inboxButtonGradient}
          >
            <Icon name="inbox" size={24} color="#fff" />
            {incomingMessages.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{incomingMessages.length}</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Bottom Sheet Inbox */}
        <BottomSheet
          ref={bottomSheetRef}
          height={500}
          customStyles={{
            container: styles.bottomSheet,
            draggableIcon: styles.bottomSheetHandle,
          }}
        >
          <View style={styles.inboxContainer}>
            <Text style={styles.inboxTitle}>Messaggi Ricevuti</Text>
            
            <FlatList
              data={incomingMessages}
              keyExtractor={item => item.messageId}
              renderItem={renderMessage}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#ff6b6b"
                />
              }
              ListEmptyComponent={
                <Text style={styles.emptyText}>Nessun messaggio</Text>
              }
            />
          </View>
        </BottomSheet>

        {/* Modal password per decifrare */}
        <Modal
          visible={showPasswordModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPasswordModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Inserisci Password</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Password per decifrare"
                placeholderTextColor="#666"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    setShowPasswordModal(false);
                    setPassword('');
                  }}
                >
                  <Text style={styles.modalButtonText}>Annulla</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={() => decryptGhostCode(currentMessageId, password)}
                >
                  <Text style={styles.modalButtonTextPrimary}>Decifra</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Toast />
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}