package com.ghostbridgeapp.modules;

import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.content.pm.SigningInfo;
import android.os.Build;
import android.security.keystore.KeyInfo;
import android.util.Base64;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableNativeArray;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.security.MessageDigest;
import java.security.cert.Certificate;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.List;

/**
 * REAL Advanced Security Module
 * Provides comprehensive security validation and app integrity checking
 */
public class AdvancedSecurityModule extends ReactContextBaseJavaModule {
    private static final String TAG = "AdvancedSecurityModule";
    
    private final ReactApplicationContext reactContext;
    private final PackageManager packageManager;
    
    // Known good app signatures (replace with real production signatures)
    private static final String[] EXPECTED_SIGNATURES = {
        "308202ed308201d5a00302010202044e5b4c1b300d06092a864886f70d01010b0500302e310b30090603550406130255533110300e060355040a1307416e64726f69643115301306035504031106616e64726f6964301e170d3130303430383139323230305a170d3337303832343139323230305a302e310b30090603550406130255533110300e060355040a1307416e64726f69643115301306035504031106616e64726f696430820122300d06092a864886f70d01010105000382010f003082010a02820101009b5b9a6f0b2e1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f0203010001"
    };
    
    public AdvancedSecurityModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.packageManager = reactContext.getPackageManager();
    }

    @Override
    public String getName() {
        return "AdvancedSecurity";
    }

    /**
     * Get REAL app signature using Android PackageManager
     */
    @ReactMethod
    public void getAppSignature(Promise promise) {
        try {
            String packageName = reactContext.getPackageName();
            
            WritableMap result = new WritableNativeMap();
            result.putBoolean("success", false);
            
            // For API 28+ use the new signing info
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                PackageInfo packageInfo = packageManager.getPackageInfo(
                    packageName, 
                    PackageManager.GET_SIGNING_CERTIFICATES
                );
                
                SigningInfo signingInfo = packageInfo.signingInfo;
                if (signingInfo == null) {
                    promise.reject("NO_SIGNING_INFO", "No signing information available");
                    return;
                }
                
                Signature[] signatures;
                if (signingInfo.hasMultipleSigners()) {
                    signatures = signingInfo.getApkContentsSigners();
                } else {
                    signatures = signingInfo.getSigningCertificateHistory();
                }
                
                if (signatures.length > 0) {
                    Signature signature = signatures[0];
                    String signatureString = signature.toCharsString();
                    byte[] signatureBytes = signature.toByteArray();
                    
                    // Calculate signature hash
                    MessageDigest md = MessageDigest.getInstance("SHA-256");
                    byte[] signatureHash = md.digest(signatureBytes);
                    String signatureHashBase64 = Base64.encodeToString(signatureHash, Base64.NO_WRAP);
                    
                    // Parse certificate
                    CertificateFactory certFactory = CertificateFactory.getInstance("X.509");
                    X509Certificate cert = (X509Certificate) certFactory.generateCertificate(
                        new ByteArrayInputStream(signatureBytes)
                    );
                    
                    result.putBoolean("success", true);
                    result.putString("signature", signatureString);
                    result.putString("signatureHash", signatureHashBase64);
                    result.putString("packageName", packageName);
                    result.putString("issuer", cert.getIssuerDN().getName());
                    result.putString("subject", cert.getSubjectDN().getName());
                    result.putLong("notBefore", cert.getNotBefore().getTime());
                    result.putLong("notAfter", cert.getNotAfter().getTime());
                    result.putString("serialNumber", cert.getSerialNumber().toString());
                    result.putString("signatureAlgorithm", cert.getSigAlgName());
                    
                    Log.d(TAG, "App signature retrieved successfully for: " + packageName);
                }
                
            } else {
                // Legacy method for older Android versions
                PackageInfo packageInfo = packageManager.getPackageInfo(
                    packageName, 
                    PackageManager.GET_SIGNATURES
                );
                
                Signature[] signatures = packageInfo.signatures;
                if (signatures.length > 0) {
                    Signature signature = signatures[0];
                    String signatureString = signature.toCharsString();
                    
                    result.putBoolean("success", true);
                    result.putString("signature", signatureString);
                    result.putString("packageName", packageName);
                    result.putString("method", "legacy");
                    
                    Log.d(TAG, "App signature retrieved (legacy) for: " + packageName);
                }
            }
            
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to get app signature", e);
            promise.reject("GET_SIGNATURE_FAILED", e.getMessage());
        }
    }

    /**
     * Validate app signature against known good signatures
     */
    @ReactMethod
    public void validateSignature(ReadableMap params, Promise promise) {
        try {
            String signature = params.getString("signature");
            String certificate = params.getString("certificate");
            String packageName = params.getString("packageName");
            
            if (signature == null) {
                promise.reject("INVALID_PARAMS", "Signature is required");
                return;
            }
            
            WritableMap result = new WritableNativeMap();
            result.putBoolean("valid", false);
            
            // Check against expected signatures
            boolean isValidSignature = false;
            String matchedSignature = null;
            
            for (String expectedSig : EXPECTED_SIGNATURES) {
                if (signature.equals(expectedSig)) {
                    isValidSignature = true;
                    matchedSignature = expectedSig;
                    break;
                }
            }
            
            result.putBoolean("valid", isValidSignature);
            result.putString("packageName", packageName);
            
            if (isValidSignature) {
                result.putString("signedBy", "GhostBridge Official");
                result.putString("matchedSignature", matchedSignature);
                result.putString("trustLevel", "TRUSTED");
                Log.d(TAG, "Signature validation PASSED for: " + packageName);
            } else {
                result.putString("error", "Signature does not match expected values");
                result.putString("trustLevel", "UNTRUSTED");
                Log.w(TAG, "Signature validation FAILED for: " + packageName);
                
                // Additional security checks for tampered apps
                WritableMap tamperingIndicators = detectTampering();
                result.putMap("tamperingIndicators", tamperingIndicators);
            }
            
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to validate signature", e);
            promise.reject("SIGNATURE_VALIDATION_FAILED", e.getMessage());
        }
    }

    /**
     * Detect app tampering indicators
     */
    @ReactMethod
    public void detectAppTampering(Promise promise) {
        try {
            WritableMap result = detectTampering();
            result.putBoolean("success", true);
            
            // Count tampering indicators
            int tamperingCount = 0;
            if (result.hasKey("debuggingEnabled") && result.getBoolean("debuggingEnabled")) tamperingCount++;
            if (result.hasKey("installerSuspicious") && result.getBoolean("installerSuspicious")) tamperingCount++;
            if (result.hasKey("systemPartitionModified") && result.getBoolean("systemPartitionModified")) tamperingCount++;
            
            result.putInt("tamperingScore", tamperingCount);
            result.putString("riskLevel", getTamperingRiskLevel(tamperingCount));
            
            Log.d(TAG, "App tampering detection completed. Score: " + tamperingCount);
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to detect app tampering", e);
            promise.reject("TAMPERING_DETECTION_FAILED", e.getMessage());
        }
    }

    /**
     * Check if app is running in debug mode
     */
    @ReactMethod
    public void isDebuggingEnabled(Promise promise) {
        try {
            boolean isDebugging = (reactContext.getApplicationInfo().flags & 
                                  android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0;
            
            WritableMap result = new WritableNativeMap();
            result.putBoolean("success", true);
            result.putBoolean("debuggingEnabled", isDebugging);
            result.putString("buildType", isDebugging ? "DEBUG" : "RELEASE");
            
            if (isDebugging) {
                result.putString("warning", "App is running in debug mode - security may be compromised");
            }
            
            Log.d(TAG, "Debug mode check: " + (isDebugging ? "ENABLED" : "DISABLED"));
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to check debug mode", e);
            promise.reject("DEBUG_CHECK_FAILED", e.getMessage());
        }
    }

    /**
     * Get app installer information
     */
    @ReactMethod
    public void getInstallerInfo(Promise promise) {
        try {
            String packageName = reactContext.getPackageName();
            String installerPackage = packageManager.getInstallerPackageName(packageName);
            
            WritableMap result = new WritableNativeMap();
            result.putBoolean("success", true);
            result.putString("packageName", packageName);
            
            if (installerPackage != null) {
                result.putString("installerPackage", installerPackage);
                result.putBoolean("fromPlayStore", "com.android.vending".equals(installerPackage));
                result.putBoolean("sideloaded", false);
                
                // Check if installer is trusted
                boolean trustedInstaller = isTrustedInstaller(installerPackage);
                result.putBoolean("trustedInstaller", trustedInstaller);
                
                if (!trustedInstaller) {
                    result.putString("warning", "App installed from untrusted source");
                }
                
            } else {
                result.putNull("installerPackage");
                result.putBoolean("fromPlayStore", false);
                result.putBoolean("sideloaded", true);
                result.putBoolean("trustedInstaller", false);
                result.putString("warning", "App was sideloaded - potential security risk");
            }
            
            Log.d(TAG, "Installer info: " + installerPackage);
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to get installer info", e);
            promise.reject("INSTALLER_INFO_FAILED", e.getMessage());
        }
    }

    /**
     * Check system integrity
     */
    @ReactMethod
    public void checkSystemIntegrity(Promise promise) {
        try {
            WritableMap result = new WritableNativeMap();
            result.putBoolean("success", true);
            
            // Check root indicators
            boolean isRooted = checkForRoot();
            result.putBoolean("deviceRooted", isRooted);
            
            // Check for Xposed framework
            boolean xposedDetected = checkForXposed();
            result.putBoolean("xposedDetected", xposedDetected);
            
            // Check for hooking frameworks
            boolean hookingDetected = checkForHookingFrameworks();
            result.putBoolean("hookingDetected", hookingDetected);
            
            // Check system partition
            boolean systemModified = checkSystemPartition();
            result.putBoolean("systemPartitionModified", systemModified);
            
            // Overall integrity score
            int integrityScore = 0;
            if (isRooted) integrityScore += 3;
            if (xposedDetected) integrityScore += 2;
            if (hookingDetected) integrityScore += 2;
            if (systemModified) integrityScore += 1;
            
            result.putInt("integrityScore", integrityScore);
            result.putString("integrityLevel", getIntegrityLevel(integrityScore));
            
            Log.d(TAG, "System integrity check completed. Score: " + integrityScore);
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to check system integrity", e);
            promise.reject("SYSTEM_INTEGRITY_FAILED", e.getMessage());
        }
    }

    /**
     * Calculate APK hash
     */
    @ReactMethod
    public void calculateAPKHash(Promise promise) {
        try {
            String packageName = reactContext.getPackageName();
            String apkPath = reactContext.getPackageCodePath();
            
            File apkFile = new File(apkPath);
            if (!apkFile.exists()) {
                promise.reject("APK_NOT_FOUND", "APK file not found at: " + apkPath);
                return;
            }
            
            // Calculate SHA-256 hash of APK
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            FileInputStream fis = new FileInputStream(apkFile);
            byte[] buffer = new byte[8192];
            int bytesRead;
            
            while ((bytesRead = fis.read(buffer)) != -1) {
                md.update(buffer, 0, bytesRead);
            }
            fis.close();
            
            byte[] hashBytes = md.digest();
            String hashString = bytesToHex(hashBytes);
            
            WritableMap result = new WritableNativeMap();
            result.putBoolean("success", true);
            result.putString("packageName", packageName);
            result.putString("apkPath", apkPath);
            result.putString("sha256Hash", hashString);
            result.putLong("apkSize", apkFile.length());
            result.putLong("lastModified", apkFile.lastModified());
            
            Log.d(TAG, "APK hash calculated: " + hashString);
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to calculate APK hash", e);
            promise.reject("APK_HASH_FAILED", e.getMessage());
        }
    }

    /**
     * Get comprehensive security assessment
     */
    @ReactMethod
    public void getSecurityAssessment(Promise promise) {
        try {
            WritableMap result = new WritableNativeMap();
            result.putBoolean("success", true);
            
            // Collect all security data
            boolean isDebugging = (reactContext.getApplicationInfo().flags & 
                                  android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0;
            
            String installerPackage = packageManager.getInstallerPackageName(reactContext.getPackageName());
            boolean fromTrustedSource = installerPackage != null && isTrustedInstaller(installerPackage);
            
            boolean isRooted = checkForRoot();
            boolean xposedDetected = checkForXposed();
            boolean hookingDetected = checkForHookingFrameworks();
            
            // Calculate overall security score (0-100)
            int securityScore = 100;
            if (isDebugging) securityScore -= 20;
            if (!fromTrustedSource) securityScore -= 15;
            if (isRooted) securityScore -= 30;
            if (xposedDetected) securityScore -= 20;
            if (hookingDetected) securityScore -= 15;
            
            securityScore = Math.max(0, securityScore);
            
            result.putInt("securityScore", securityScore);
            result.putString("securityLevel", getSecurityLevel(securityScore));
            result.putBoolean("isSecure", securityScore >= 80);
            
            // Individual assessments
            WritableMap assessments = new WritableNativeMap();
            assessments.putBoolean("debuggingEnabled", isDebugging);
            assessments.putBoolean("fromTrustedSource", fromTrustedSource);
            assessments.putBoolean("deviceRooted", isRooted);
            assessments.putBoolean("xposedDetected", xposedDetected);
            assessments.putBoolean("hookingDetected", hookingDetected);
            
            result.putMap("assessments", assessments);
            
            // Recommendations
            WritableArray recommendations = new WritableNativeArray();
            if (isDebugging) recommendations.pushString("Disable debugging in production builds");
            if (!fromTrustedSource) recommendations.pushString("Install from official app stores only");
            if (isRooted) recommendations.pushString("Avoid using rooted devices for sensitive operations");
            if (xposedDetected) recommendations.pushString("Remove Xposed framework for better security");
            if (hookingDetected) recommendations.pushString("Remove hooking frameworks and debugging tools");
            
            result.putArray("recommendations", recommendations);
            
            Log.d(TAG, "Security assessment completed. Score: " + securityScore);
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to get security assessment", e);
            promise.reject("SECURITY_ASSESSMENT_FAILED", e.getMessage());
        }
    }

    // Helper methods
    
    private WritableMap detectTampering() {
        WritableMap result = new WritableNativeMap();
        
        // Check debugging
        boolean isDebugging = (reactContext.getApplicationInfo().flags & 
                              android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        result.putBoolean("debuggingEnabled", isDebugging);
        
        // Check installer
        String installerPackage = packageManager.getInstallerPackageName(reactContext.getPackageName());
        boolean suspiciousInstaller = installerPackage == null || !isTrustedInstaller(installerPackage);
        result.putBoolean("installerSuspicious", suspiciousInstaller);
        
        // Check system
        boolean systemModified = checkSystemPartition();
        result.putBoolean("systemPartitionModified", systemModified);
        
        return result;
    }
    
    private boolean isTrustedInstaller(String installerPackage) {
        return "com.android.vending".equals(installerPackage) ||       // Google Play Store
               "com.amazon.venezia".equals(installerPackage) ||         // Amazon Appstore
               "com.huawei.appmarket".equals(installerPackage) ||       // Huawei AppGallery
               "com.samsung.android.app.spastore".equals(installerPackage); // Samsung Galaxy Store
    }
    
    private boolean checkForRoot() {
        // Check for common root indicators
        String[] rootPaths = {
            "/system/app/Superuser.apk",
            "/sbin/su",
            "/system/bin/su",
            "/system/xbin/su",
            "/data/local/xbin/su",
            "/data/local/bin/su",
            "/system/sd/xbin/su",
            "/system/bin/failsafe/su",
            "/data/local/su"
        };
        
        for (String path : rootPaths) {
            if (new File(path).exists()) {
                return true;
            }
        }
        
        return false;
    }
    
    private boolean checkForXposed() {
        try {
            Class.forName("de.robv.android.xposed.XposedBridge");
            return true;
        } catch (ClassNotFoundException e) {
            return false;
        }
    }
    
    private boolean checkForHookingFrameworks() {
        String[] hookingIndicators = {
            "/data/data/com.saurik.substrate",
            "/data/data/de.robv.android.xposed",
            "/data/data/com.android.vending.billing.InAppBillingService.LACK"
        };
        
        for (String path : hookingIndicators) {
            if (new File(path).exists()) {
                return true;
            }
        }
        
        return false;
    }
    
    private boolean checkSystemPartition() {
        try {
            // Check if system partition is mounted as read-write
            return new File("/system").canWrite();
        } catch (Exception e) {
            return false;
        }
    }
    
    private String getTamperingRiskLevel(int score) {
        if (score == 0) return "LOW";
        if (score <= 2) return "MEDIUM";
        return "HIGH";
    }
    
    private String getIntegrityLevel(int score) {
        if (score == 0) return "EXCELLENT";
        if (score <= 2) return "GOOD";
        if (score <= 4) return "MODERATE";
        return "POOR";
    }
    
    private String getSecurityLevel(int score) {
        if (score >= 90) return "EXCELLENT";
        if (score >= 80) return "GOOD";
        if (score >= 60) return "MODERATE";
        if (score >= 40) return "POOR";
        return "CRITICAL";
    }
    
    private String bytesToHex(byte[] bytes) {
        StringBuilder result = new StringBuilder();
        for (byte b : bytes) {
            result.append(String.format("%02x", b));
        }
        return result.toString();
    }
}