# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.hermes.reactexecutor.** { *; }
-dontwarn com.facebook.react.**

# React Native Navigation
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.swmansion.reanimated.** { *; }

# Firebase
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Crypto libraries
-keep class org.spongycastle.** { *; }
-keep class com.facebook.crypto.** { *; }
-dontwarn org.spongycastle.**

# Native modules
-keep class com.ghostbridgeapp.SecurityModule { *; }
-keep class com.ghostbridgeapp.SecurityPackage { *; }

# Biometrics
-keep class androidx.biometric.** { *; }
-keep class android.hardware.biometrics.** { *; }

# Keychain / Keystore
-keep class android.security.keystore.** { *; }
-keep class javax.crypto.** { *; }

# Device Info
-keep class com.learnium.RNDeviceInfo.** { *; }

# Jail Monkey
-keep class com.gantix.JailMonkey.** { *; }

# AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Networking
-keep class okhttp3.** { *; }
-keep class okio.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

# JS Interface (if any)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep native method names
-keepclasseswithmembernames class * {
    native <methods>;
}

# Prevent obfuscation of security-related classes
-keep class com.ghostbridgeapp.** { *; }

# Keep classes with cryptographic operations
-keep class javax.crypto.** { *; }
-keep class java.security.** { *; }

# Prevent removal of security checks
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int i(...);
    public static int w(...);
    public static int d(...);
    public static int e(...);
}

# Advanced obfuscation
-repackageclasses ''
-allowaccessmodification
-overloadaggressively

# String encryption (be careful with this)
-keepclassmembers class * {
    java.lang.String *;
}

# Additional security
-printmapping mapping.txt
-printseeds seeds.txt
-printusage usage.txt