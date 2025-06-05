#include <jni.h>
#include <sys/mman.h>
#include <string.h>
#include <unistd.h>
#include <android/log.h>
#include <stdlib.h>

#define LOG_TAG "ColdBootNative"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

/**
 * Mutex per garantire thread‐safety tra chiamate JNI, se necessario.
 * In questa versione base non viene usato, ma è predisposto in caso di estensione.
 */
// static pthread_mutex_t g_lock = PTHREAD_MUTEX_INITIALIZER;

extern "C" JNIEXPORT jlong JNICALL
Java_com_ghostbridge_crypto_security_ColdBootProtector_nativeAllocateLockedBuffer(
        JNIEnv* env,
        jclass /* clazz */,
        jint size) {
    if (size <= 0) {
        LOGE("nativeAllocateLockedBuffer: dimensione non valida: %d", size);
        return 0;
    }

    // Alloca memoria allineata su pagina (mmap)
    long pageSize = sysconf(_SC_PAGESIZE);
    long allocSize = ((size + pageSize - 1) / pageSize) * pageSize;

    void* ptr = mmap(nullptr,
                     allocSize,
                     PROT_READ | PROT_WRITE,
                     MAP_ANONYMOUS | MAP_PRIVATE,
                     -1,
                     0);
    if (ptr == MAP_FAILED) {
        LOGE("mmap fallita per %ld bytes", allocSize);
        return 0;
    }

    // Blocca pagine in RAM per evitare swap
    if (mlock(ptr, allocSize) != 0) {
        LOGE("mlock fallita su %p (%ld bytes)", ptr, allocSize);
        // Anche se mlock fallisce, continuiamo ma segnaliamo errore
        munmap(ptr, allocSize);
        return 0;
    }

    // Inizializziamo a zero per sicurezza
    memset(ptr, 0, allocSize);
    LOGI("Buffer lockato in RAM: ptr=%p, size=%ld", ptr, allocSize);

    // Restituiamo l'indirizzo originale al chiamante Java (come long)
    return reinterpret_cast<jlong>(ptr);
}

extern "C" JNIEXPORT void JNICALL
Java_com_ghostbridge_crypto_security_ColdBootProtector_nativeZeroAndFree(
        JNIEnv* env,
        jclass /* clazz */,
        jlong bufferPtr,
        jint size) {
    if (bufferPtr == 0 || size <= 0) {
        LOGE("nativeZeroAndFree: parametri non validi: ptr=%lld, size=%d", bufferPtr, size);
        return;
    }

    void* ptr = reinterpret_cast<void*>(bufferPtr);
    long pageSize = sysconf(_SC_PAGESIZE);
    long allocSize = ((size + pageSize - 1) / pageSize) * pageSize;

    // Sovrascrivi la memoria con 0
    explicit_bzero(ptr, allocSize);

    // Sblocca e rilascia la memoria
    if (munlock(ptr, allocSize) != 0) {
        LOGE("munlock fallito su %p (%ld bytes)", ptr, allocSize);
        // Procediamo comunque a free
    }

    if (munmap(ptr, allocSize) != 0) {
        LOGE("munmap fallita su %p (%ld bytes)", ptr, allocSize);
    } else {
        LOGI("Buffer liberato e sovrascritto: ptr=%p, size=%ld", ptr, allocSize);
    }
}