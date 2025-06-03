// P2PScreen.js
// Schermata per connessioni P2P dirette

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import P2PManager from '../network/P2PManager';

export default function P2PScreen() {
  const [onlinePeers, setOnlinePeers] = useState([]);
  const [connectedPeers, setConnectedPeers] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedPeer, setSelectedPeer] = useState(null);
  const [message, setMessage] = useState('');
  const [receivedMessages, setReceivedMessages] = useState([]);
  const [stats, setStats] = useState({
    myPeerId: '',
    totalConnections: 0,
    openDataChannels: 0,
  });

  useEffect(() => {
    initializeP2P();
    
    // Cleanup on unmount
    return () => {
      P2PManager.cleanup();
    };
  }, []);

  const initializeP2P = async () => {
    try {
      await P2PManager.initialize();
      
      // Setup message handler
      P2PManager.onMessage((peerId, message) => {
        setReceivedMessages(prev => [{
          id: Date.now().toString(),
          from: peerId,
          message: message,
          timestamp: new Date(),
        }, ...prev]);
        
        Toast.show({
          type: 'info',
          text1: 'Nuovo Messaggio P2P',
          text2: `Da: ${peerId.substr(0, 8)}...`,
        });
      });
      
      // Setup connection handler
      P2PManager.onConnection((peerId, status) => {
        if (status === 'connected') {
          setConnectedPeers(prev => [...new Set([...prev, peerId])]);
        } else {
          setConnectedPeers(prev => prev.filter(id => id !== peerId));
        }
        updateStats();
      });
      
      // Initial load
      await refreshPeers();
      updateStats();
      
    } catch (error) {
      console.error('P2P initialization error:', error);
      Alert.alert('Errore', 'Impossibile inizializzare P2P');
    }
  };

  const refreshPeers = async () => {
    setIsRefreshing(true);
    try {
      const peers = await P2PManager.getOnlinePeers();
      setOnlinePeers(peers);
    } catch (error) {
      console.error('Error refreshing peers:', error);
    }
    setIsRefreshing(false);
  };

  const updateStats = () => {
    const stats = P2PManager.getConnectionStats();
    setStats(stats);
    setConnectedPeers(stats.connectedPeers);
  };

  const connectToPeer = async (peerId) => {
    setIsConnecting(true);
    try {
      await P2PManager.connectToPeer(peerId);
      Toast.show({
        type: 'success',
        text1: 'Connessione P2P',
        text2: 'Connessione in corso...',
      });
    } catch (error) {
      console.error('Connection error:', error);
      Alert.alert('Errore', 'Impossibile connettersi al peer');
    }
    setIsConnecting(false);
  };

  const sendMessageToPeer = async () => {
    if (!message.trim() || !selectedPeer) return;
    
    try {
      await P2PManager.sendMessage(selectedPeer, {
        text: message,
        timestamp: Date.now(),
      });
      
      Toast.show({
        type: 'success',
        text1: 'Messaggio Inviato',
        text2: 'Messaggio P2P cifrato inviato',
      });
      
      setMessage('');
      setShowMessageModal(false);
      
    } catch (error) {
      console.error('Send error:', error);
      Alert.alert('Errore', 'Impossibile inviare il messaggio');
    }
  };

  const renderPeer = ({ item: peerId }) => {
    const isConnected = connectedPeers.includes(peerId);
    const shortId = peerId.substr(0, 8) + '...';
    
    return (
      <TouchableOpacity
        style={[styles.peerItem, isConnected && styles.connectedPeer]}
        onPress={() => {
          if (isConnected) {
            setSelectedPeer(peerId);
            setShowMessageModal(true);
          } else {
            connectToPeer(peerId);
          }
        }}
        disabled={isConnecting}
      >
        <View style={styles.peerInfo}>
          <Icon 
            name={isConnected ? 'wifi' : 'wifi-off'} 
            size={24} 
            color={isConnected ? '#4FC3F7' : '#666'} 
          />
          <Text style={styles.peerId}>{shortId}</Text>
        </View>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => isConnected ? null : connectToPeer(peerId)}
        >
          {isConnected ? (
            <Icon name="message" size={20} color="#4FC3F7" />
          ) : (
            <Icon name="link" size={20} color="#666" />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderMessage = ({ item }) => (
    <View style={styles.messageItem}>
      <Text style={styles.messageFrom}>
        Da: {item.from.substr(0, 8)}...
      </Text>
      <Text style={styles.messageText}>{item.message.text}</Text>
      <Text style={styles.messageTime}>
        {item.timestamp.toLocaleTimeString()}
      </Text>
    </View>
  );

  return (
    <LinearGradient colors={['#0f0f0f', '#1a1a1a']} style={styles.container}>
      {/* Header Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>P2P Network Status</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.myPeerId.substr(0, 8)}...</Text>
            <Text style={styles.statLabel}>My ID</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{connectedPeers.length}</Text>
            <Text style={styles.statLabel}>Connected</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{onlinePeers.length}</Text>
            <Text style={styles.statLabel}>Online</Text>
          </View>
        </View>
      </View>

      {/* Online Peers */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Peer Disponibili</Text>
        <FlatList
          data={onlinePeers}
          keyExtractor={(item) => item}
          renderItem={renderPeer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshPeers}
              tintColor="#4FC3F7"
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nessun peer online</Text>
          }
        />
      </View>

      {/* Received Messages */}
      {receivedMessages.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Messaggi Ricevuti</Text>
          <FlatList
            data={receivedMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            style={styles.messagesList}
          />
        </View>
      )}

      {/* Message Modal */}
      <Modal
        visible={showMessageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMessageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Invia a {selectedPeer?.substr(0, 8)}...
            </Text>
            
            <TextInput
              style={styles.messageInput}
              placeholder="Scrivi messaggio..."
              placeholderTextColor="#666"
              value={message}
              onChangeText={setMessage}
              multiline
              autoFocus
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowMessageModal(false);
                  setMessage('');
                }}
              >
                <Text style={styles.buttonText}>Annulla</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.sendButton]}
                onPress={sendMessageToPeer}
              >
                <LinearGradient
                  colors={['#4FC3F7', '#29B6F6']}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>Invia</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {isConnecting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4FC3F7" />
          <Text style={styles.loadingText}>Connessione in corso...</Text>
        </View>
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
  statsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4FC3F7',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  section: {
    flex: 1,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  peerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  connectedPeer: {
    borderColor: '#4FC3F7',
    backgroundColor: 'rgba(79, 195, 247, 0.1)',
  },
  peerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  peerId: {
    color: '#fff',
    fontSize: 16,
  },
  actionButton: {
    padding: 10,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  messagesList: {
    maxHeight: 200,
  },
  messageItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  messageFrom: {
    fontSize: 12,
    color: '#4FC3F7',
    marginBottom: 5,
  },
  messageText: {
    color: '#fff',
    fontSize: 14,
  },
  messageTime: {
    fontSize: 10,
    color: '#666',
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  messageInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    color: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  modalButton: {
    flex: 1,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  sendButton: {
    overflow: 'hidden',
    borderRadius: 10,
  },
  buttonGradient: {
    padding: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
  },
});