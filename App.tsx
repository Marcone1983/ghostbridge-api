// App.tsx
// Entry point dell'applicazione GhostBridge

import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import MainNavigator from './src/navigation/MainNavigator';
import AuthManager from './src/firebase/AuthManager';
import NotificationManager from './src/notifications/NotificationManager';

export default function App() {
  useEffect(() => {
    // Inizializza l'app all'avvio
    const initApp = async () => {
      try {
        await AuthManager.initialize();
        if (!AuthManager.isAuthenticated()) {
          await AuthManager.loginAnonymously();
        }
        
        // Inizializza notifiche dopo auth
        await NotificationManager.initialize();
        
      } catch (error) {
        console.error('Errore inizializzazione app:', error);
      }
    };
    
    initApp();
    
    // Cleanup on unmount
    return () => {
      NotificationManager.cleanup();
    };
  }, []);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" />
      <MainNavigator />
    </>
  );
}