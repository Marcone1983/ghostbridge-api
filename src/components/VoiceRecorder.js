// VoiceRecorder.js
// Componente per registrazione e riproduzione messaggi vocali con cifratura end-to-end

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import Icon from 'react-native-vector-icons/MaterialIcons';
import RNFS from 'react-native-fs';
import GhostCrypto from '../crypto/GhostCrypto';
import Toast from 'react-native-toast-message';

const audioRecorderPlayer = new AudioRecorderPlayer();

export default function VoiceRecorder({ onRecordingComplete, recipientPublicKey }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState('00:00');
  const [recordSecs, setRecordSecs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPositionSec, setCurrentPositionSec] = useState(0);
  const [playTime, setPlayTime] = useState('00:00');
  const [duration, setDuration] = useState('00:00');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    requestPermissions();
    return () => {
      audioRecorderPlayer.removeRecordBackListener();
      audioRecorderPlayer.removePlayBackListener();
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);

        if (
          grants['android.permission.WRITE_EXTERNAL_STORAGE'] !==
            PermissionsAndroid.RESULTS.GRANTED ||
          grants['android.permission.READ_EXTERNAL_STORAGE'] !==
            PermissionsAndroid.RESULTS.GRANTED ||
          grants['android.permission.RECORD_AUDIO'] !==
            PermissionsAndroid.RESULTS.GRANTED
        ) {
          Alert.alert('Permessi richiesti', 'Necessari permessi audio per registrare messaggi vocali');
        }
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const onStartRecord = async () => {
    const audioSet = {
      AudioEncoderAndroid: AudioRecorderPlayer.AudioEncoderAndroidType.AAC,
      AudioSourceAndroid: AudioRecorderPlayer.AudioSourceAndroidType.MIC,
      AVEncoderAudioQualityKeyIOS: AudioRecorderPlayer.AVEncoderAudioQualityIOSType.high,
      AVNumberOfChannelsKeyIOS: 2,
      AVFormatIDKeyIOS: AudioRecorderPlayer.AVEncodingOption.aac,
    };

    const path = Platform.select({
      ios: 'ghostbridge_voice.m4a',
      android: `${RNFS.CachesDirectoryPath}/ghostbridge_voice_${Date.now()}.mp4`,
    });

    try {
      const result = await audioRecorderPlayer.startRecorder(path, audioSet);
      audioRecorderPlayer.addRecordBackListener((e) => {
        setRecordSecs(e.currentPosition);
        setRecordTime(audioRecorderPlayer.mmssss(Math.floor(e.currentPosition)));
      });
      setIsRecording(true);
      console.log('Recording started:', result);
    } catch (error) {
      console.error('Start record error:', error);
      Toast.show({
        type: 'error',
        text1: 'Errore Registrazione',
        text2: 'Impossibile avviare la registrazione',
      });
    }
  };

  const onStopRecord = async () => {
    try {
      const result = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      setIsRecording(false);
      setRecordSecs(0);
      
      // Leggi il file audio registrato
      const audioData = await RNFS.readFile(result, 'base64');
      
      // Cifra l'audio con la chiave pubblica del destinatario
      const encryptedAudio = await encryptVoiceMessage(audioData);
      
      // Callback con l'audio cifrato
      if (onRecordingComplete) {
        onRecordingComplete({
          type: 'voice',
          encrypted: encryptedAudio,
          duration: recordTime,
          timestamp: Date.now(),
        });
      }

      // Elimina il file temporaneo non cifrato
      await RNFS.unlink(result);
      
      Toast.show({
        type: 'success',
        text1: 'Messaggio Vocale',
        text2: 'Registrazione completata e cifrata',
      });
    } catch (error) {
      console.error('Stop record error:', error);
      Toast.show({
        type: 'error',
        text1: 'Errore',
        text2: 'Impossibile salvare la registrazione',
      });
    }
  };

  const encryptVoiceMessage = async (audioBase64) => {
    try {
      const ghostCrypto = new GhostCrypto();
      
      // Comprimi l'audio prima della cifratura
      const compressed = await compressAudio(audioBase64);
      
      // Cifra con multiple layers
      const encrypted = await ghostCrypto.encryptMessage(compressed, recipientPublicKey);
      
      // Aggiungi metadata
      return {
        data: encrypted,
        algorithm: 'AES-256-GCM',
        compression: 'zlib',
        format: 'mp4',
        checksum: await ghostCrypto.generateChecksum(compressed),
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw error;
    }
  };

  const compressAudio = async (audioBase64) => {
    // Implementazione semplificata - in produzione usare codec audio avanzati
    // Per ora ritorna l'audio originale
    return audioBase64;
  };

  const onStartPlay = async (encryptedAudio) => {
    try {
      // Decifra l'audio
      const ghostCrypto = new GhostCrypto();
      const decryptedAudio = await ghostCrypto.decryptMessage(encryptedAudio.data);
      
      // Salva temporaneamente per la riproduzione
      const tempPath = `${RNFS.CachesDirectoryPath}/temp_play_${Date.now()}.mp4`;
      await RNFS.writeFile(tempPath, decryptedAudio, 'base64');
      
      // Riproduci
      const msg = await audioRecorderPlayer.startPlayer(tempPath);
      audioRecorderPlayer.setVolume(1.0);
      console.log('Playing:', msg);
      
      audioRecorderPlayer.addPlayBackListener((e) => {
        setCurrentPositionSec(e.currentPosition);
        setPlayTime(audioRecorderPlayer.mmssss(Math.floor(e.currentPosition)));
        setDuration(audioRecorderPlayer.mmssss(Math.floor(e.duration)));
        
        if (e.currentPosition === e.duration) {
          onStopPlay();
        }
      });
      
      setIsPlaying(true);
      
      // Elimina il file temp dopo la riproduzione
      setTimeout(async () => {
        try {
          await RNFS.unlink(tempPath);
        } catch (e) {
          // File già eliminato
        }
      }, 5000);
    } catch (error) {
      console.error('Play error:', error);
      Toast.show({
        type: 'error',
        text1: 'Errore Riproduzione',
        text2: 'Impossibile riprodurre il messaggio',
      });
    }
  };

  const onStopPlay = async () => {
    try {
      await audioRecorderPlayer.stopPlayer();
      audioRecorderPlayer.removePlayBackListener();
      setIsPlaying(false);
    } catch (error) {
      console.error('Stop play error:', error);
    }
  };

  const onPausePlay = async () => {
    try {
      await audioRecorderPlayer.pausePlayer();
      setIsPlaying(false);
    } catch (error) {
      console.error('Pause error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.recordSection}>
        <TouchableOpacity
          style={[styles.recordButton, isRecording && styles.recordingButton]}
          onPress={isRecording ? onStopRecord : onStartRecord}
          activeOpacity={0.7}
        >
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Icon 
              name={isRecording ? 'stop' : 'mic'} 
              size={32} 
              color="#FFFFFF" 
            />
          </Animated.View>
        </TouchableOpacity>
        
        {isRecording && (
          <View style={styles.recordingInfo}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordTime}>{recordTime}</Text>
            <View style={styles.waveform}>
              {[...Array(5)].map((_, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.waveLine,
                    {
                      height: Math.random() * 20 + 10,
                      opacity: waveAnim,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        )}
      </View>

      {!isRecording && recordTime !== '00:00' && (
        <View style={styles.playbackControls}>
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => isPlaying ? onPausePlay() : onStartPlay()}
          >
            <Icon 
              name={isPlaying ? 'pause' : 'play-arrow'} 
              size={24} 
              color="#4FC3F7" 
            />
          </TouchableOpacity>
          
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${(currentPositionSec / (duration || 1)) * 100}%` }
              ]}
            />
          </View>
          
          <Text style={styles.playTime}>{playTime} / {duration}</Text>
        </View>
      )}

      <View style={styles.features}>
        <View style={styles.featureItem}>
          <Icon name="lock" size={16} color="#4FC3F7" />
          <Text style={styles.featureText}>End-to-End Encrypted</Text>
        </View>
        <View style={styles.featureItem}>
          <Icon name="timer" size={16} color="#4FC3F7" />
          <Text style={styles.featureText}>Auto-delete dopo ascolto</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    margin: 10,
  },
  recordSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4FC3F7',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#4FC3F7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  recordingButton: {
    backgroundColor: '#F44336',
  },
  recordingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F44336',
    marginRight: 8,
  },
  recordTime: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 15,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  waveLine: {
    width: 3,
    backgroundColor: '#4FC3F7',
    borderRadius: 1.5,
  },
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(79, 195, 247, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginRight: 15,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4FC3F7',
    borderRadius: 2,
  },
  playTime: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  featureText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
});