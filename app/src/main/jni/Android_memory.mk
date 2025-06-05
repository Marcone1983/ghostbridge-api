LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)

LOCAL_MODULE    := memory_tamper
LOCAL_SRC_FILES := memory_tampering_detector.cpp

# Usa libreria libcrypto di OpenSSL inclusa via NDK (assicurati che sia abilitata in ABI)
LOCAL_LDLIBS    := -lcrypto -llog
LOCAL_C_INCLUDES := $(LOCAL_PATH)/openssl/include  # percorso header OpenSSL (se necessario)
LOCAL_CPPFLAGS  := -std=c++17 -O2 -fno-exceptions

include $(BUILD_SHARED_LIBRARY)