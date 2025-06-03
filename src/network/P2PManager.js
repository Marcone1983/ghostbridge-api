// P2PManager.js
// Gestione connessioni P2P reali con WebRTC

import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
} from 'react-native-webrtc';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import GhostCrypto from '../crypto/GhostCrypto';
import Toast from 'react-native-toast-message';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  // TURN servers per NAT traversal (in produzione usare propri server)
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

class P2PManager {
  constructor() {
    this.peers = new Map(); // Map<peerId, RTCPeerConnection>
    this.dataChannels = new Map(); // Map<peerId, RTCDataChannel>
    this.pendingCandidates = new Map(); // Map<peerId, RTCIceCandidate[]>
    this.messageHandlers = new Set();
    this.connectionHandlers = new Set();
    this.ghostCrypto = new GhostCrypto();
    this.myPeerId = null;
    this.signalingRef = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Genera peer ID univoco
      const user = auth().currentUser;
      this.myPeerId = user ? user.uid : `anon_${Math.random().toString(36).substr(2, 9)}`;
      
      // Setup signaling server via Firebase
      this.signalingRef = database().ref(`p2p_signaling/${this.myPeerId}`);
      
      // Pulisci vecchi segnali
      await this.signalingRef.remove();
      
      // Ascolta incoming signals
      this.signalingRef.on('child_added', async (snapshot) => {
        const signal = snapshot.val();
        if (signal) {
          await this.handleSignal(signal);
          // Rimuovi segnale processato
          snapshot.ref.remove();
        }
      });
      
      // Imposta presence
      await database().ref(`p2p_presence/${this.myPeerId}`).set({
        online: true,
        timestamp: database.ServerValue.TIMESTAMP,
      });
      
      // Auto-disconnect on offline
      database().ref(`p2p_presence/${this.myPeerId}`).onDisconnect().remove();
      
      this.isInitialized = true;
      console.log('P2P Manager initialized with ID:', this.myPeerId);
      
    } catch (error) {
      console.error('P2P initialization error:', error);
      throw error;
    }
  }

  async connectToPeer(peerId) {
    if (!this.isInitialized) await this.initialize();
    
    if (this.peers.has(peerId)) {
      console.log('Already connected to peer:', peerId);
      return;
    }
    
    try {
      // Crea peer connection
      const pc = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
        iceCandidatePoolSize: 10,
      });
      
      this.peers.set(peerId, pc);
      
      // Setup ICE candidates handling
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignal(peerId, {
            type: 'ice-candidate',
            candidate: event.candidate.toJSON(),
            from: this.myPeerId,
          });
        }
      };
      
      // Setup connection state monitoring
      pc.onconnectionstatechange = () => {
        console.log(`Connection state with ${peerId}:`, pc.connectionState);
        
        if (pc.connectionState === 'connected') {
          this.notifyConnectionHandlers(peerId, 'connected');
          Toast.show({
            type: 'success',
            text1: 'P2P Connesso',
            text2: `Connessione diretta stabilita con ${peerId.substr(0, 8)}...`,
          });
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          this.cleanupPeer(peerId);
          this.notifyConnectionHandlers(peerId, 'disconnected');
        }
      };
      
      // Crea data channel per messaggi
      const dataChannel = pc.createDataChannel('messages', {
        ordered: true,
        maxRetransmits: 3,
      });
      
      dataChannel.onopen = () => {
        console.log('Data channel opened with:', peerId);
        this.dataChannels.set(peerId, dataChannel);
      };
      
      dataChannel.onmessage = async (event) => {
        await this.handleDataChannelMessage(peerId, event.data);
      };
      
      dataChannel.onerror = (error) => {
        console.error('Data channel error:', error);
      };
      
      // Crea offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false,
      });
      
      await pc.setLocalDescription(offer);
      
      // Invia offer via signaling
      await this.sendSignal(peerId, {
        type: 'offer',
        offer: offer.toJSON(),
        from: this.myPeerId,
      });
      
      // Applica pending ICE candidates se esistono
      const pendingCandidates = this.pendingCandidates.get(peerId);
      if (pendingCandidates) {
        for (const candidate of pendingCandidates) {
          await pc.addIceCandidate(candidate);
        }
        this.pendingCandidates.delete(peerId);
      }
      
    } catch (error) {
      console.error('Error connecting to peer:', error);
      this.cleanupPeer(peerId);
      throw error;
    }
  }

  async handleSignal(signal) {
    const { type, from } = signal;
    
    if (from === this.myPeerId) return; // Ignora propri segnali
    
    switch (type) {
      case 'offer':
        await this.handleOffer(from, signal.offer);
        break;
        
      case 'answer':
        await this.handleAnswer(from, signal.answer);
        break;
        
      case 'ice-candidate':
        await this.handleIceCandidate(from, signal.candidate);
        break;
        
      default:
        console.warn('Unknown signal type:', type);
    }
  }

  async handleOffer(peerId, offer) {
    try {
      // Crea o riusa peer connection
      let pc = this.peers.get(peerId);
      
      if (!pc) {
        pc = new RTCPeerConnection({
          iceServers: ICE_SERVERS,
          iceCandidatePoolSize: 10,
        });
        
        this.peers.set(peerId, pc);
        
        // Setup handlers
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            this.sendSignal(peerId, {
              type: 'ice-candidate',
              candidate: event.candidate.toJSON(),
              from: this.myPeerId,
            });
          }
        };
        
        pc.onconnectionstatechange = () => {
          console.log(`Connection state with ${peerId}:`, pc.connectionState);
          
          if (pc.connectionState === 'connected') {
            this.notifyConnectionHandlers(peerId, 'connected');
          } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            this.cleanupPeer(peerId);
            this.notifyConnectionHandlers(peerId, 'disconnected');
          }
        };
        
        // Handle incoming data channel
        pc.ondatachannel = (event) => {
          const dataChannel = event.channel;
          
          dataChannel.onopen = () => {
            console.log('Incoming data channel opened from:', peerId);
            this.dataChannels.set(peerId, dataChannel);
          };
          
          dataChannel.onmessage = async (event) => {
            await this.handleDataChannelMessage(peerId, event.data);
          };
        };
      }
      
      // Set remote description
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      // Send answer
      await this.sendSignal(peerId, {
        type: 'answer',
        answer: answer.toJSON(),
        from: this.myPeerId,
      });
      
      // Apply pending candidates
      const pendingCandidates = this.pendingCandidates.get(peerId);
      if (pendingCandidates) {
        for (const candidate of pendingCandidates) {
          await pc.addIceCandidate(candidate);
        }
        this.pendingCandidates.delete(peerId);
      }
      
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  async handleAnswer(peerId, answer) {
    try {
      const pc = this.peers.get(peerId);
      if (!pc) {
        console.warn('No peer connection for answer from:', peerId);
        return;
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  async handleIceCandidate(peerId, candidateData) {
    try {
      const pc = this.peers.get(peerId);
      const candidate = new RTCIceCandidate(candidateData);
      
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(candidate);
      } else {
        // Salva per dopo
        if (!this.pendingCandidates.has(peerId)) {
          this.pendingCandidates.set(peerId, []);
        }
        this.pendingCandidates.get(peerId).push(candidate);
      }
      
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  async sendSignal(peerId, signal) {
    try {
      await database().ref(`p2p_signaling/${peerId}`).push({
        ...signal,
        timestamp: database.ServerValue.TIMESTAMP,
      });
    } catch (error) {
      console.error('Error sending signal:', error);
    }
  }

  async sendMessage(peerId, message) {
    const dataChannel = this.dataChannels.get(peerId);
    
    if (!dataChannel || dataChannel.readyState !== 'open') {
      throw new Error('No open data channel with peer');
    }
    
    try {
      // Cifra il messaggio
      const encrypted = await this.ghostCrypto.encryptMessage(
        JSON.stringify(message),
        peerId // Usa peerId come chiave simmetrica temporanea
      );
      
      // Invia tramite data channel
      dataChannel.send(JSON.stringify({
        type: 'encrypted-message',
        data: encrypted,
        timestamp: Date.now(),
      }));
      
      console.log('Message sent to peer:', peerId);
      
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async handleDataChannelMessage(peerId, data) {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.type === 'encrypted-message') {
        // Decifra il messaggio
        const decrypted = await this.ghostCrypto.decryptMessage(
          parsed.data,
          peerId
        );
        
        const message = JSON.parse(decrypted);
        
        // Notifica handlers
        this.notifyMessageHandlers(peerId, message);
      }
      
    } catch (error) {
      console.error('Error handling data channel message:', error);
    }
  }

  onMessage(handler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onConnection(handler) {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  notifyMessageHandlers(peerId, message) {
    this.messageHandlers.forEach(handler => {
      try {
        handler(peerId, message);
      } catch (error) {
        console.error('Message handler error:', error);
      }
    });
  }

  notifyConnectionHandlers(peerId, status) {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(peerId, status);
      } catch (error) {
        console.error('Connection handler error:', error);
      }
    });
  }

  async getOnlinePeers() {
    try {
      const snapshot = await database().ref('p2p_presence').once('value');
      const presence = snapshot.val() || {};
      
      return Object.keys(presence).filter(id => 
        id !== this.myPeerId && presence[id].online
      );
      
    } catch (error) {
      console.error('Error getting online peers:', error);
      return [];
    }
  }

  cleanupPeer(peerId) {
    // Chiudi data channel
    const dataChannel = this.dataChannels.get(peerId);
    if (dataChannel) {
      dataChannel.close();
      this.dataChannels.delete(peerId);
    }
    
    // Chiudi peer connection
    const pc = this.peers.get(peerId);
    if (pc) {
      pc.close();
      this.peers.delete(peerId);
    }
    
    // Pulisci pending candidates
    this.pendingCandidates.delete(peerId);
  }

  async cleanup() {
    // Disconnetti da tutti i peer
    for (const peerId of this.peers.keys()) {
      this.cleanupPeer(peerId);
    }
    
    // Rimuovi signaling listener
    if (this.signalingRef) {
      this.signalingRef.off();
    }
    
    // Rimuovi presence
    if (this.myPeerId) {
      await database().ref(`p2p_presence/${this.myPeerId}`).remove();
    }
    
    this.isInitialized = false;
  }

  getConnectionStats() {
    return {
      myPeerId: this.myPeerId,
      connectedPeers: Array.from(this.peers.keys()).filter(peerId => {
        const pc = this.peers.get(peerId);
        return pc && pc.connectionState === 'connected';
      }),
      totalConnections: this.peers.size,
      openDataChannels: Array.from(this.dataChannels.keys()).filter(peerId => {
        const dc = this.dataChannels.get(peerId);
        return dc && dc.readyState === 'open';
      }).length,
    };
  }
}

export default new P2PManager();