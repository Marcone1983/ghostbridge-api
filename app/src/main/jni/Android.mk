LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)

LOCAL_MODULE    := coldboot_protector
LOCAL_SRC_FILES := cold_boot_protector.cpp

# Imposta NDK e ABI
LOCAL_C_INCLUDES := $(LOCAL_PATH)
LOCAL_LDLIBS    := -llog
LOCAL_CPPFLAGS  := -std=c++17 -O2

include $(BUILD_SHARED_LIBRARY)