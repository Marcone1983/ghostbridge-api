// MainNavigator.js
// Navigazione principale con 3 tab: Home, Send, Receive

import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { NavigationContainer } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

import HomeScreen from '../screens/HomeScreen';
import SendScreen from '../screens/SendScreen';
import ReceiveScreen from '../screens/ReceiveScreen';
import P2PScreen from '../screens/P2PScreen';

const Tab = createMaterialTopTabNavigator();

function LogoHeader() {
  return (
    <LinearGradient 
      colors={['#0f0f0f', '#1a1a1a']} 
      style={styles.header}
    >
      <Image 
        source={{ uri: 'https://i.imgur.com/Cn5l3uH.png' }}
        style={styles.logo}
        resizeMode="contain"
      />
    </LinearGradient>
  );
}

export default function MainNavigator() {
  return (
    <NavigationContainer>
      <View style={styles.container}>
        <LogoHeader />
        <Tab.Navigator
          screenOptions={{
            tabBarStyle: {
              backgroundColor: '#1a1a1a',
              elevation: 0,
              shadowOpacity: 0,
            },
            tabBarActiveTintColor: '#ff6b6b',
            tabBarInactiveTintColor: '#666',
            tabBarIndicatorStyle: {
              backgroundColor: '#ff6b6b',
              height: 3,
            },
            tabBarLabelStyle: {
              fontSize: 14,
              fontWeight: 'bold',
              textTransform: 'none',
            },
            tabBarIconStyle: {
              width: 24,
              height: 24,
            },
            tabBarShowIcon: true,
          }}
        >
          <Tab.Screen 
            name="Home" 
            component={HomeScreen}
            options={{
              tabBarLabel: 'Home',
              tabBarIcon: ({ color }) => (
                <Icon name="home" size={24} color={color} />
              ),
            }}
          />
          <Tab.Screen 
            name="Send" 
            component={SendScreen}
            options={{
              tabBarLabel: 'Send',
              tabBarIcon: ({ color }) => (
                <Icon name="send" size={24} color={color} />
              ),
            }}
          />
          <Tab.Screen 
            name="Receive" 
            component={ReceiveScreen}
            options={{
              tabBarLabel: 'Receive',
              tabBarIcon: ({ color }) => (
                <Icon name="download" size={24} color={color} />
              ),
            }}
          />
          <Tab.Screen 
            name="P2P" 
            component={P2PScreen}
            options={{
              tabBarLabel: 'P2P',
              tabBarIcon: ({ color }) => (
                <Icon name="wifi" size={24} color={color} />
              ),
            }}
          />
        </Tab.Navigator>
      </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  logo: {
    width: 150,
    height: 40,
  },
});