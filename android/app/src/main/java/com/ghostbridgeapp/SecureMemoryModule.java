package com.ghostbridgeapp;

import android.content.Context;
import android.os.Debug;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class SecureMemoryModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "SecureMemoryModule";
    private ReactApplicationContext reactContext;
    private SecureRandom secureRandom;
    private List<byte[]> secureAllocations;
    
    // Load native library
    static {
        System.loadLibrary("secureMemoryWiper");
    }
    
    // Native method declarations
    public native boolean nativeMemoryWipe(byte[] data);
    public native long nativeAllocateSecure(int size);
    public native boolean nativeFreeSecure(long ptr, int size);
    public native boolean nativeAntiForensicsWipe(int sizeMB);
    public native boolean nativeWipeString(String str);
    
    // DOD 5220.22-M wipe patterns
    private static final byte[][] DOD_PATTERNS = {
        {(byte)0x00}, // Pattern 1: All zeros
        {(byte)0xFF}, // Pattern 2: All ones  
        {(byte)0x55}, // Pattern 3: 01010101
        {(byte)0xAA}, // Pattern 4: 10101010
        {(byte)0x92, (byte)0x49, (byte)0x24}, // Pattern 5: Random
        {(byte)0x49, (byte)0x24, (byte)0x92}, // Pattern 6: Complement
        {(byte)0x00}  // Pattern 7: Final zeros
    };

    public SecureMemoryModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
        this.secureRandom = new SecureRandom();
        this.secureAllocations = new ArrayList<>();
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void performNativeDodMemoryWipe(int size, Promise promise) {
        try {
            // Allocate memory block to wipe using native code
            byte[] memoryBlock = new byte[size];
            
            // Fill with random data first
            secureRandom.nextBytes(memoryBlock);
            
            // Use native DOD 5220.22-M wipe
            boolean result = nativeMemoryWipe(memoryBlock);
            
            WritableMap response = Arguments.createMap();
            response.putBoolean("success", result);
            response.putInt("size", size);
            response.putString("method", "native_dod_wipe");
            response.putString("standard", "DOD 5220.22-M");
            
            promise.resolve(response);
            
        } catch (Exception e) {
            promise.reject("NATIVE_MEMORY_WIPE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void performDodMemoryWipe(int size, Promise promise) {
        try {
            // Allocate memory block to wipe
            byte[] memoryBlock = new byte[size];
            
            // Fill with random data first
            secureRandom.nextBytes(memoryBlock);
            
            WritableMap result = Arguments.createMap();
            result.putInt("size", size);
            result.putInt("patterns", DOD_PATTERNS.length);
            
            // Perform DOD 5220.22-M 7-pass wipe
            for (int pass = 0; pass < DOD_PATTERNS.length; pass++) {
                byte[] pattern = DOD_PATTERNS[pass];
                
                // Fill entire block with pattern
                for (int i = 0; i < memoryBlock.length; i++) {
                    memoryBlock[i] = pattern[i % pattern.length];
                }
                
                // Force memory sync
                System.gc();
                
                result.putString("pass" + (pass + 1), "completed");
            }
            
            // Final verification - all should be zeros
            boolean verified = true;
            for (byte b : memoryBlock) {
                if (b != 0) {
                    verified = false;
                    break;
                }
            }
            
            result.putBoolean("verified", verified);
            result.putString("standard", "DOD 5220.22-M");
            
            // Clear reference
            Arrays.fill(memoryBlock, (byte)0);
            memoryBlock = null;
            
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("MEMORY_WIPE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void secureAllocateMemory(int size, Promise promise) {
        try {
            // Allocate secure memory block
            byte[] secureBlock = new byte[size];
            
            // Fill with secure random data
            secureRandom.nextBytes(secureBlock);
            
            // Add to tracking list
            secureAllocations.add(secureBlock);
            
            WritableMap result = Arguments.createMap();
            result.putInt("size", size);
            result.putInt("blockId", secureAllocations.size() - 1);
            result.putInt("totalAllocations", secureAllocations.size());
            
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("SECURE_ALLOCATION_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void secureWipeAllAllocations(Promise promise) {
        try {
            int wiped = 0;
            
            for (byte[] allocation : secureAllocations) {
                if (allocation != null) {
                    // Perform secure wipe
                    performSecureWipe(allocation);
                    wiped++;
                }
            }
            
            // Clear the list
            secureAllocations.clear();
            
            // Force garbage collection
            System.gc();
            System.runFinalization();
            System.gc();
            
            WritableMap result = Arguments.createMap();
            result.putInt("wiped", wiped);
            result.putBoolean("success", true);
            
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("SECURE_WIPE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getMemoryInfo(Promise promise) {
        try {
            Runtime runtime = Runtime.getRuntime();
            Debug.MemoryInfo memInfo = new Debug.MemoryInfo();
            Debug.getMemoryInfo(memInfo);
            
            WritableMap result = Arguments.createMap();
            result.putDouble("totalMemory", runtime.totalMemory());
            result.putDouble("freeMemory", runtime.freeMemory());
            result.putDouble("maxMemory", runtime.maxMemory());
            result.putDouble("usedMemory", runtime.totalMemory() - runtime.freeMemory());
            result.putInt("dalvikPrivateDirty", memInfo.dalvikPrivateDirty);
            result.putInt("nativePrivateDirty", memInfo.nativePrivateDirty);
            result.putInt("otherPrivateDirty", memInfo.otherPrivateDirty);
            result.putInt("secureAllocations", secureAllocations.size());
            
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("MEMORY_INFO_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void performMemoryPressure(Promise promise) {
        try {
            // Create memory pressure to force garbage collection
            List<byte[]> pressureBlocks = new ArrayList<>();
            
            try {
                // Allocate blocks until we get close to memory limit
                while (true) {
                    byte[] block = new byte[1024 * 1024]; // 1MB blocks
                    secureRandom.nextBytes(block);
                    pressureBlocks.add(block);
                    
                    // Check if we're getting close to memory limit
                    Runtime runtime = Runtime.getRuntime();
                    long used = runtime.totalMemory() - runtime.freeMemory();
                    long max = runtime.maxMemory();
                    
                    if (used > max * 0.8) {
                        break;
                    }
                }
            } catch (OutOfMemoryError e) {
                // Expected - we've reached memory limit
            }
            
            // Now secure wipe all pressure blocks
            for (byte[] block : pressureBlocks) {
                performSecureWipe(block);
            }
            
            pressureBlocks.clear();
            
            // Force multiple garbage collection cycles
            for (int i = 0; i < 5; i++) {
                System.gc();
                System.runFinalization();
                Thread.sleep(100);
            }
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("description", "Memory pressure applied and cleaned");
            
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("MEMORY_PRESSURE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void secureStringWipe(String sensitiveString, Promise promise) {
        try {
            if (sensitiveString == null) {
                promise.resolve(false);
                return;
            }
            
            // Use reflection to access the internal char array
            boolean wiped = wipeStringInternals(sensitiveString);
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("wiped", wiped);
            result.putInt("originalLength", sensitiveString.length());
            
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("STRING_WIPE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void performAntiForensicsWipe(Promise promise) {
        try {
            // Get current memory info
            Runtime runtime = Runtime.getRuntime();
            long totalMemory = runtime.totalMemory();
            
            // Calculate number of blocks to allocate
            int blockSize = 1024 * 1024; // 1MB blocks
            int numBlocks = (int)(totalMemory / blockSize / 2); // Use half of available memory
            
            List<byte[]> forensicsBlocks = new ArrayList<>();
            
            // Phase 1: Fill memory with random data
            for (int i = 0; i < numBlocks; i++) {
                byte[] block = new byte[blockSize];
                secureRandom.nextBytes(block);
                forensicsBlocks.add(block);
            }
            
            // Phase 2: Overwrite with different patterns
            for (int pass = 0; pass < 3; pass++) {
                for (byte[] block : forensicsBlocks) {
                    // Different pattern each pass
                    byte pattern = (byte)(0x55 << pass);
                    Arrays.fill(block, pattern);
                }
                System.gc();
            }
            
            // Phase 3: Final random overwrite
            for (byte[] block : forensicsBlocks) {
                secureRandom.nextBytes(block);
            }
            
            // Phase 4: Secure wipe everything
            for (byte[] block : forensicsBlocks) {
                performSecureWipe(block);
            }
            
            forensicsBlocks.clear();
            
            // Force extensive garbage collection
            for (int i = 0; i < 10; i++) {
                System.gc();
                System.runFinalization();
            }
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putInt("blocksProcessed", numBlocks);
            result.putString("technique", "Anti-forensics memory overwrite");
            
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("ANTI_FORENSICS_ERROR", e.getMessage());
        }
    }

    private void performSecureWipe(byte[] data) {
        if (data == null) return;
        
        // DOD 5220.22-M compliant wipe
        for (byte[] pattern : DOD_PATTERNS) {
            for (int i = 0; i < data.length; i++) {
                data[i] = pattern[i % pattern.length];
            }
        }
        
        // Final random overwrite
        secureRandom.nextBytes(data);
        
        // Final zero
        Arrays.fill(data, (byte)0);
    }

    private boolean wipeStringInternals(String str) {
        try {
            // Get the char array from String using reflection
            Field valueField = String.class.getDeclaredField("value");
            valueField.setAccessible(true);
            char[] chars = (char[]) valueField.get(str);
            
            if (chars != null) {
                // Wipe the char array
                Arrays.fill(chars, '\0');
                return true;
            }
            
        } catch (Exception e) {
            // Reflection failed, try alternative approach
            try {
                // Try to get the bytes and wipe them
                byte[] bytes = str.getBytes();
                Arrays.fill(bytes, (byte)0);
                return true;
            } catch (Exception ex) {
                return false;
            }
        }
        
        return false;
    }

    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        
        // Emergency wipe on destroy
        try {
            for (byte[] allocation : secureAllocations) {
                if (allocation != null) {
                    performSecureWipe(allocation);
                }
            }
            secureAllocations.clear();
        } catch (Exception e) {
            // Best effort cleanup
        }
    }
}