#include <jni.h>
#include <string>
#include <cstring>
#include <cstdlib>
#include <unistd.h>
#include <sys/mman.h>
#include <android/log.h>

#define LOG_TAG "SecureMemoryWiper"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

// DOD 5220.22-M wipe patterns
static const unsigned char DOD_PATTERNS[][3] = {
    {0x00, 0x00, 0x00},  // Pass 1: All zeros
    {0xFF, 0xFF, 0xFF},  // Pass 2: All ones
    {0x55, 0x55, 0x55},  // Pass 3: 01010101
    {0xAA, 0xAA, 0xAA},  // Pass 4: 10101010
    {0x92, 0x49, 0x24},  // Pass 5: Random pattern
    {0x49, 0x24, 0x92},  // Pass 6: Complement
    {0x00, 0x00, 0x00}   // Pass 7: Final zeros
};

static const int DOD_PASSES = 7;

/**
 * Force memory sync to ensure writes reach physical memory
 */
void force_memory_sync(void* ptr, size_t size) {
    // Force CPU cache flush
    __builtin___clear_cache((char*)ptr, (char*)ptr + size);
    
    // Force memory sync
    msync(ptr, size, MS_SYNC);
    
    // Memory barrier
    __sync_synchronize();
}

/**
 * Secure random fill using /dev/urandom
 */
void secure_random_fill(void* ptr, size_t size) {
    FILE* urandom = fopen("/dev/urandom", "rb");
    if (urandom) {
        fread(ptr, 1, size, urandom);
        fclose(urandom);
    } else {
        // Fallback to weak random
        for (size_t i = 0; i < size; i++) {
            ((unsigned char*)ptr)[i] = rand() & 0xFF;
        }
    }
}

/**
 * Perform DOD 5220.22-M compliant memory wipe
 */
bool dod_secure_wipe(void* ptr, size_t size) {
    if (!ptr || size == 0) {
        return false;
    }
    
    unsigned char* memory = (unsigned char*)ptr;
    
    LOGI("Starting DOD 5220.22-M wipe of %zu bytes", size);
    
    // Lock memory to prevent swapping
    if (mlock(ptr, size) != 0) {
        LOGI("Warning: Could not lock memory (non-root), continuing anyway");
    }
    
    // Perform 7-pass DOD wipe
    for (int pass = 0; pass < DOD_PASSES; pass++) {
        LOGI("DOD wipe pass %d/%d", pass + 1, DOD_PASSES);
        
        if (pass < 6) {
            // Use predefined patterns
            for (size_t i = 0; i < size; i++) {
                memory[i] = DOD_PATTERNS[pass][i % 3];
            }
        } else {
            // Final pass: secure random
            secure_random_fill(memory, size);
            
            // Then final zeros
            memset(memory, 0x00, size);
        }
        
        // Force write to physical memory
        force_memory_sync(ptr, size);
        
        // Add delay to ensure completion
        usleep(1000); // 1ms delay
    }
    
    // Final verification
    bool verified = true;
    for (size_t i = 0; i < size; i++) {
        if (memory[i] != 0x00) {
            verified = false;
            break;
        }
    }
    
    // Unlock memory
    munlock(ptr, size);
    
    LOGI("DOD wipe completed, verified: %s", verified ? "true" : "false");
    return verified;
}

/**
 * Allocate secure memory page
 */
void* allocate_secure_memory(size_t size) {
    // Allocate page-aligned memory
    size_t page_size = getpagesize();
    size_t aligned_size = ((size + page_size - 1) / page_size) * page_size;
    
    void* ptr = mmap(NULL, aligned_size, PROT_READ | PROT_WRITE, 
                     MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    
    if (ptr == MAP_FAILED) {
        LOGE("Failed to allocate secure memory");
        return NULL;
    }
    
    // Lock memory to prevent swapping
    if (mlock(ptr, aligned_size) != 0) {
        LOGI("Warning: Could not lock allocated memory");
    }
    
    // Initialize with random data
    secure_random_fill(ptr, aligned_size);
    
    LOGI("Allocated %zu bytes of secure memory at %p", aligned_size, ptr);
    return ptr;
}

/**
 * Free secure memory with guaranteed wipe
 */
bool free_secure_memory(void* ptr, size_t size) {
    if (!ptr) {
        return false;
    }
    
    // Page-align size
    size_t page_size = getpagesize();
    size_t aligned_size = ((size + page_size - 1) / page_size) * page_size;
    
    // Perform secure wipe
    bool wiped = dod_secure_wipe(ptr, aligned_size);
    
    // Unlock and unmap
    munlock(ptr, aligned_size);
    munmap(ptr, aligned_size);
    
    LOGI("Freed secure memory at %p, wiped: %s", ptr, wiped ? "true" : "false");
    return wiped;
}

/**
 * Anti-forensics memory pressure wipe
 */
bool anti_forensics_wipe(size_t target_size) {
    LOGI("Starting anti-forensics wipe for %zu MB", target_size / (1024 * 1024));
    
    const size_t BLOCK_SIZE = 1024 * 1024; // 1MB blocks
    size_t blocks = target_size / BLOCK_SIZE;
    void** memory_blocks = (void**)malloc(blocks * sizeof(void*));
    
    if (!memory_blocks) {
        LOGE("Failed to allocate block tracking array");
        return false;
    }
    
    // Phase 1: Allocate and fill with patterns
    for (size_t i = 0; i < blocks; i++) {
        memory_blocks[i] = allocate_secure_memory(BLOCK_SIZE);
        if (!memory_blocks[i]) {
            LOGE("Failed to allocate block %zu", i);
            break;
        }
        
        // Fill with forensic-defeating patterns
        for (int pattern = 0; pattern < 3; pattern++) {
            memset(memory_blocks[i], DOD_PATTERNS[pattern][0], BLOCK_SIZE);
            force_memory_sync(memory_blocks[i], BLOCK_SIZE);
        }
    }
    
    // Phase 2: Random overwrite
    for (size_t i = 0; i < blocks; i++) {
        if (memory_blocks[i]) {
            secure_random_fill(memory_blocks[i], BLOCK_SIZE);
            force_memory_sync(memory_blocks[i], BLOCK_SIZE);
        }
    }
    
    // Phase 3: Secure wipe and free
    for (size_t i = 0; i < blocks; i++) {
        if (memory_blocks[i]) {
            free_secure_memory(memory_blocks[i], BLOCK_SIZE);
        }
    }
    
    free(memory_blocks);
    
    LOGI("Anti-forensics wipe completed for %zu blocks", blocks);
    return true;
}

/**
 * Wipe JVM string internals using reflection bypass
 */
bool wipe_jvm_string(JNIEnv* env, jstring jstr) {
    if (!jstr) {
        return false;
    }
    
    // Get string length
    jsize len = env->GetStringLength(jstr);
    
    // Get direct access to string chars (critical section)
    const jchar* chars = env->GetStringCritical(jstr, NULL);
    if (!chars) {
        LOGE("Failed to get string critical access");
        return false;
    }
    
    // Cast away const and wipe (dangerous but necessary)
    jchar* mutable_chars = const_cast<jchar*>(chars);
    
    // Multi-pass wipe of Unicode chars
    for (int pass = 0; pass < DOD_PASSES; pass++) {
        for (jsize i = 0; i < len; i++) {
            if (pass < 6) {
                mutable_chars[i] = (jchar)(DOD_PATTERNS[pass][i % 3] | 
                                          (DOD_PATTERNS[pass][(i + 1) % 3] << 8));
            } else {
                mutable_chars[i] = 0x0000;
            }
        }
        
        // Force memory sync
        force_memory_sync(mutable_chars, len * sizeof(jchar));
    }
    
    // Release critical section
    env->ReleaseStringCritical(jstr, chars);
    
    LOGI("JVM string wiped: %d chars", len);
    return true;
}

// JNI exported functions
extern "C" {

JNIEXPORT jboolean JNICALL
Java_com_ghostbridgeapp_SecureMemoryModule_nativeMemoryWipe(
    JNIEnv* env, jobject thiz, jbyteArray data) {
    
    if (!data) {
        return JNI_FALSE;
    }
    
    jsize len = env->GetArrayLength(data);
    jbyte* bytes = env->GetByteArrayElements(data, NULL);
    
    if (!bytes) {
        return JNI_FALSE;
    }
    
    bool result = dod_secure_wipe(bytes, len);
    
    env->ReleaseByteArrayElements(data, bytes, 0);
    return result ? JNI_TRUE : JNI_FALSE;
}

JNIEXPORT jlong JNICALL
Java_com_ghostbridgeapp_SecureMemoryModule_nativeAllocateSecure(
    JNIEnv* env, jobject thiz, jint size) {
    
    void* ptr = allocate_secure_memory(size);
    return reinterpret_cast<jlong>(ptr);
}

JNIEXPORT jboolean JNICALL
Java_com_ghostbridgeapp_SecureMemoryModule_nativeFreeSecure(
    JNIEnv* env, jobject thiz, jlong ptr, jint size) {
    
    void* memory = reinterpret_cast<void*>(ptr);
    return free_secure_memory(memory, size) ? JNI_TRUE : JNI_FALSE;
}

JNIEXPORT jboolean JNICALL
Java_com_ghostbridgeapp_SecureMemoryModule_nativeAntiForensicsWipe(
    JNIEnv* env, jobject thiz, jint sizeMB) {
    
    size_t target_size = sizeMB * 1024 * 1024;
    return anti_forensics_wipe(target_size) ? JNI_TRUE : JNI_FALSE;
}

JNIEXPORT jboolean JNICALL
Java_com_ghostbridgeapp_SecureMemoryModule_nativeWipeString(
    JNIEnv* env, jobject thiz, jstring str) {
    
    return wipe_jvm_string(env, str) ? JNI_TRUE : JNI_FALSE;
}

} // extern "C"