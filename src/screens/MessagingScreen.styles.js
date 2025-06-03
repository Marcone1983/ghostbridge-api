// MessagingScreen.styles.js
// Stili per la schermata di messaggistica

import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export default StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Header
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  ghostId: {
    fontSize: 16,
    color: '#ff6b6b',
    fontFamily: 'monospace',
  },
  
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
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
  
  // Form
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  input: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontSize: 16,
    color: '#fff',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  messageInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  
  // Image selector
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
  
  // Send button
  sendButton: {
    marginBottom: 20,
  },
  sendButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  disabledButton: {
    opacity: 0.6,
  },
  
  // Inbox button
  inboxButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
  },
  inboxButtonGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff6b6b',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Bottom sheet
  bottomSheet: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bottomSheetHandle: {
    backgroundColor: '#666',
  },
  inboxContainer: {
    flex: 1,
    padding: 20,
  },
  inboxTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  
  // Message card
  messageCard: {
    marginBottom: 15,
  },
  messageGradient: {
    padding: 15,
    borderRadius: 10,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  senderText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timeText: {
    color: '#666',
    fontSize: 12,
  },
  messageContent: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
  },
  lockedMessage: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockedText: {
    color: '#666',
    fontSize: 14,
    marginLeft: 10,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 25,
    width: width * 0.85,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#0f0f0f',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontSize: 16,
    color: '#fff',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 10,
    marginHorizontal: 5,
    backgroundColor: '#2a2a3e',
  },
  modalButtonPrimary: {
    backgroundColor: '#ff6b6b',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  modalButtonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});