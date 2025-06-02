package com.ghostbridgeapp;

import android.content.Context;
import android.content.pm.PackageManager;
import android.content.pm.ApplicationInfo;
import android.os.Build;
import android.provider.Settings;
import android.telephony.TelephonyManager;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableArray;

import java.io.File;
import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.lang.reflect.Method;
import java.net.NetworkInterface;
import java.security.MessageDigest;
import java.util.Collections;
import java.util.List;

public class AdvancedSecurityModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "AdvancedSecurity";
    private ReactApplicationContext reactContext;

    public AdvancedSecurityModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void performAdvancedSecurityScan(Promise promise) {
        try {
            WritableMap result = Arguments.createMap();
            
            // Root detection
            WritableMap rootCheck = performRootDetection();
            result.putMap("rootDetection", rootCheck);
            
            // Emulator detection
            WritableMap emulatorCheck = performEmulatorDetection();
            result.putMap("emulatorDetection", emulatorCheck);
            
            // Hooking framework detection
            WritableMap hookCheck = performHookDetection();
            result.putMap("hookDetection", hookCheck);
            
            // Debugger detection
            WritableMap debugCheck = performDebuggerDetection();
            result.putMap("debuggerDetection", debugCheck);
            
            // Tampering detection
            WritableMap tamperCheck = performTamperingDetection();
            result.putMap("tamperingDetection", tamperCheck);
            
            // Network security check
            WritableMap networkCheck = performNetworkSecurityCheck();
            result.putMap("networkSecurity", networkCheck);
            
            // Environment analysis
            WritableMap envCheck = performEnvironmentAnalysis();
            result.putMap("environmentAnalysis", envCheck);
            
            // Calculate overall security score
            double securityScore = calculateSecurityScore(rootCheck, emulatorCheck, hookCheck, 
                                                         debugCheck, tamperCheck, networkCheck);
            result.putDouble("securityScore", securityScore);
            result.putBoolean("isSecure", securityScore > 0.7);
            
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("SECURITY_SCAN_ERROR", "Advanced security scan failed: " + e.getMessage());
        }
    }

    private WritableMap performRootDetection() {
        WritableMap result = Arguments.createMap();
        WritableArray detectedMethods = Arguments.createArray();
        boolean isRooted = false;
        
        // Check for su binary
        if (checkSuBinary()) {
            isRooted = true;
            detectedMethods.pushString("su_binary");
        }
        
        // Check for root management apps
        if (checkRootApps()) {
            isRooted = true;
            detectedMethods.pushString("root_apps");
        }
        
        // Check for dangerous properties
        if (checkDangerousProps()) {
            isRooted = true;
            detectedMethods.pushString("dangerous_props");
        }
        
        // Check for writable system directories
        if (checkWritableSystem()) {
            isRooted = true;
            detectedMethods.pushString("writable_system");
        }
        
        // Check for Magisk
        if (checkMagisk()) {
            isRooted = true;
            detectedMethods.pushString("magisk");
        }
        
        result.putBoolean("isRooted", isRooted);
        result.putArray("detectedMethods", detectedMethods);
        
        return result;
    }

    private WritableMap performEmulatorDetection() {
        WritableMap result = Arguments.createMap();
        WritableArray indicators = Arguments.createArray();
        boolean isEmulator = false;
        int confidence = 0;
        
        // Check build properties
        if (Build.FINGERPRINT.startsWith("generic") || 
            Build.FINGERPRINT.startsWith("unknown") ||
            Build.MODEL.contains("google_sdk") ||
            Build.MODEL.contains("Emulator") ||
            Build.MODEL.contains("Android SDK built for x86")) {
            isEmulator = true;
            confidence += 30;
            indicators.pushString("build_properties");
        }
        
        // Check manufacturer
        if (Build.MANUFACTURER.contains("Genymotion") ||
            Build.MANUFACTURER.contains("unknown")) {
            isEmulator = true;
            confidence += 20;
            indicators.pushString("manufacturer");
        }
        
        // Check hardware
        if (Build.HARDWARE.contains("goldfish") ||
            Build.HARDWARE.contains("ranchu")) {
            isEmulator = true;
            confidence += 25;
            indicators.pushString("hardware");
        }
        
        // Check telephony
        if (checkEmulatorTelephony()) {
            isEmulator = true;
            confidence += 15;
            indicators.pushString("telephony");
        }
        
        // Check sensors
        if (checkEmulatorSensors()) {
            isEmulator = true;
            confidence += 10;
            indicators.pushString("sensors");
        }
        
        result.putBoolean("isEmulator", isEmulator);
        result.putInt("confidence", Math.min(confidence, 100));
        result.putArray("indicators", indicators);
        
        return result;
    }

    private WritableMap performHookDetection() {
        WritableMap result = Arguments.createMap();
        WritableArray detectedFrameworks = Arguments.createArray();
        boolean isHooked = false;
        
        // Check for Xposed
        if (checkXposedFramework()) {
            isHooked = true;
            detectedFrameworks.pushString("xposed");
        }
        
        // Check for Frida
        if (checkFridaFramework()) {
            isHooked = true;
            detectedFrameworks.pushString("frida");
        }
        
        // Check for Substrate
        if (checkSubstrateFramework()) {
            isHooked = true;
            detectedFrameworks.pushString("substrate");
        }
        
        // Check for memory inspection
        if (checkMemoryInspection()) {
            isHooked = true;
            detectedFrameworks.pushString("memory_inspection");
        }
        
        result.putBoolean("isHooked", isHooked);
        result.putArray("detectedFrameworks", detectedFrameworks);
        
        return result;
    }

    private WritableMap performDebuggerDetection() {
        WritableMap result = Arguments.createMap();
        WritableArray methods = Arguments.createArray();
        boolean isDebugging = false;
        
        // Check if debugger is connected
        if (android.os.Debug.isDebuggerConnected()) {
            isDebugging = true;
            methods.pushString("debugger_connected");
        }
        
        // Check debug flags
        if ((reactContext.getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            isDebugging = true;
            methods.pushString("debuggable_flag");
        }
        
        // Check for debugging tools
        if (checkDebuggingTools()) {
            isDebugging = true;
            methods.pushString("debugging_tools");
        }
        
        result.putBoolean("isDebugging", isDebugging);
        result.putArray("methods", methods);
        
        return result;
    }

    private WritableMap performTamperingDetection() {
        WritableMap result = Arguments.createMap();
        WritableArray indicators = Arguments.createArray();
        boolean isTampered = false;
        
        // Check installer package
        if (checkInstallerPackage()) {
            isTampered = true;
            indicators.pushString("unknown_installer");
        }
        
        // Check for overlay attacks
        if (checkOverlayAttacks()) {
            isTampered = true;
            indicators.pushString("overlay_attack");
        }
        
        // Check APK signature
        if (checkAPKSignature()) {
            isTampered = true;
            indicators.pushString("signature_mismatch");
        }
        
        result.putBoolean("isTampered", isTampered);
        result.putArray("indicators", indicators);
        
        return result;
    }

    private WritableMap performNetworkSecurityCheck() {
        WritableMap result = Arguments.createMap();
        WritableArray threats = Arguments.createArray();
        boolean isSecure = true;
        
        // Check for proxy/VPN
        if (checkProxyVPN()) {
            isSecure = false;
            threats.pushString("proxy_vpn");
        }
        
        // Check for packet capture
        if (checkPacketCapture()) {
            isSecure = false;
            threats.pushString("packet_capture");
        }
        
        result.putBoolean("isSecure", isSecure);
        result.putArray("threats", threats);
        
        return result;
    }

    private WritableMap performEnvironmentAnalysis() {
        WritableMap result = Arguments.createMap();
        
        // Device info
        result.putString("manufacturer", Build.MANUFACTURER);
        result.putString("model", Build.MODEL);
        result.putString("device", Build.DEVICE);
        result.putString("brand", Build.BRAND);
        result.putString("hardware", Build.HARDWARE);
        result.putString("fingerprint", Build.FINGERPRINT);
        result.putInt("sdkVersion", Build.VERSION.SDK_INT);
        
        // Security patch level
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            result.putString("securityPatch", Build.VERSION.SECURITY_PATCH);
        }
        
        // Developer options
        boolean devOptions = Settings.Secure.getInt(reactContext.getContentResolver(),
            Settings.Global.DEVELOPMENT_SETTINGS_ENABLED, 0) != 0;
        result.putBoolean("developerOptionsEnabled", devOptions);
        
        return result;
    }

    // Individual check methods
    private boolean checkSuBinary() {
        String[] paths = {
            "/system/app/Superuser.apk",
            "/sbin/su", "/system/bin/su", "/system/xbin/su",
            "/data/local/xbin/su", "/data/local/bin/su",
            "/system/sd/xbin/su", "/system/bin/failsafe/su",
            "/data/local/su", "/su/bin/su"
        };
        
        for (String path : paths) {
            if (new File(path).exists()) return true;
        }
        return false;
    }

    private boolean checkRootApps() {
        String[] packages = {
            "com.koushikdutta.superuser", "com.noshufou.android.su",
            "com.thirdparty.superuser", "eu.chainfire.supersu",
            "com.topjohnwu.magisk", "com.kingroot.kinguser"
        };
        
        PackageManager pm = reactContext.getPackageManager();
        for (String pkg : packages) {
            try {
                pm.getPackageInfo(pkg, 0);
                return true;
            } catch (PackageManager.NameNotFoundException e) {
                // Continue checking
            }
        }
        return false;
    }

    private boolean checkDangerousProps() {
        try {
            String buildTags = Build.TAGS;
            return buildTags != null && buildTags.contains("test-keys");
        } catch (Exception e) {
            return false;
        }
    }

    private boolean checkWritableSystem() {
        String[] paths = {"/system", "/system/bin", "/system/xbin"};
        for (String path : paths) {
            if (new File(path).canWrite()) return true;
        }
        return false;
    }

    private boolean checkMagisk() {
        String[] paths = {
            "/sbin/magisk", "/system/xbin/magisk",
            "/data/adb/magisk", "/cache/magisk"
        };
        for (String path : paths) {
            if (new File(path).exists()) return true;
        }
        return false;
    }

    private boolean checkEmulatorTelephony() {
        try {
            TelephonyManager tm = (TelephonyManager) reactContext.getSystemService(Context.TELEPHONY_SERVICE);
            String networkOperator = tm.getNetworkOperatorName();
            return "Android".equals(networkOperator);
        } catch (Exception e) {
            return false;
        }
    }

    private boolean checkEmulatorSensors() {
        try {
            android.hardware.SensorManager sensorManager = 
                (android.hardware.SensorManager) reactContext.getSystemService(Context.SENSOR_SERVICE);
            List<android.hardware.Sensor> sensors = sensorManager.getSensorList(android.hardware.Sensor.TYPE_ALL);
            return sensors.size() < 5; // Emulators typically have fewer sensors
        } catch (Exception e) {
            return false;
        }
    }

    private boolean checkXposedFramework() {
        try {
            throw new Exception("XposedBridge");
        } catch (Exception e) {
            return e.getStackTrace()[0].getClassName().contains("XposedBridge");
        }
    }

    private boolean checkFridaFramework() {
        try {
            File fridaFiles = new File("/data/local/tmp/frida-server");
            return fridaFiles.exists();
        } catch (Exception e) {
            return false;
        }
    }

    private boolean checkSubstrateFramework() {
        try {
            File substrateLib = new File("/system/lib/libsubstrate.so");
            return substrateLib.exists();
        } catch (Exception e) {
            return false;
        }
    }

    private boolean checkMemoryInspection() {
        try {
            // Check for common memory inspection tools
            File maps = new File("/proc/self/maps");
            if (maps.exists()) {
                BufferedReader reader = new BufferedReader(new FileReader(maps));
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.contains("frida") || line.contains("gum-js-loop")) {
                        reader.close();
                        return true;
                    }
                }
                reader.close();
            }
        } catch (IOException e) {
            // Ignore
        }
        return false;
    }

    private boolean checkDebuggingTools() {
        String[] tools = {"gdb", "strace", "ltrace"};
        for (String tool : tools) {
            if (new File("/system/bin/" + tool).exists() || 
                new File("/system/xbin/" + tool).exists()) {
                return true;
            }
        }
        return false;
    }

    private boolean checkInstallerPackage() {
        try {
            String installer = reactContext.getPackageManager()
                .getInstallerPackageName(reactContext.getPackageName());
            return installer == null || 
                   (!installer.equals("com.android.vending") && 
                    !installer.equals("com.google.android.packageinstaller"));
        } catch (Exception e) {
            return true; // Assume tampered if can't check
        }
    }

    private boolean checkOverlayAttacks() {
        try {
            // Check if system alert window permission is granted
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                return Settings.canDrawOverlays(reactContext);
            }
        } catch (Exception e) {
            // Ignore
        }
        return false;
    }

    @ReactMethod
    public void getAppSignature(Promise promise) {
        try {
            PackageManager pm = reactContext.getPackageManager();
            String packageName = reactContext.getPackageName();
            
            android.content.pm.PackageInfo packageInfo = pm.getPackageInfo(packageName, 
                PackageManager.GET_SIGNATURES);
            
            if (packageInfo.signatures == null || packageInfo.signatures.length == 0) {
                promise.reject("NO_SIGNATURE", "No signature found for package");
                return;
            }
            
            android.content.pm.Signature signature = packageInfo.signatures[0];
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(signature.toByteArray());
            
            StringBuilder hexString = new StringBuilder();
            for (byte b : md.digest()) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("signature", "sha256:" + hexString.toString().toUpperCase());
            result.putString("packageName", packageName);
            result.putString("certificate", android.util.Base64.encodeToString(
                signature.toByteArray(), android.util.Base64.NO_WRAP));
            
            promise.resolve(result);
            
        } catch (Exception e) {
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", false);
            result.putString("error", e.getMessage());
            promise.resolve(result);
        }
    }

    @ReactMethod
    public void validateSignature(com.facebook.react.bridge.ReadableMap options, Promise promise) {
        try {
            String signature = options.getString("signature");
            String certificate = options.getString("certificate");
            String packageName = options.getString("packageName");
            
            // Verify signature hasn't been tampered with
            PackageManager pm = reactContext.getPackageManager();
            android.content.pm.PackageInfo packageInfo = pm.getPackageInfo(packageName, 
                PackageManager.GET_SIGNATURES);
            
            if (packageInfo.signatures == null || packageInfo.signatures.length == 0) {
                WritableMap result = Arguments.createMap();
                result.putBoolean("valid", false);
                result.putString("error", "No signature found for validation");
                promise.resolve(result);
                return;
            }
            
            // Get current signature and compare
            android.content.pm.Signature currentSig = packageInfo.signatures[0];
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(currentSig.toByteArray());
            
            StringBuilder currentHex = new StringBuilder();
            for (byte b : md.digest()) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) currentHex.append('0');
                currentHex.append(hex);
            }
            
            String currentSignature = "sha256:" + currentHex.toString().toUpperCase();
            boolean isValid = currentSignature.equals(signature);
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("valid", isValid);
            result.putString("currentSignature", currentSignature);
            result.putString("expectedSignature", signature);
            
            if (!isValid) {
                result.putString("error", "Signature mismatch - app may be tampered");
            } else {
                result.putString("signedBy", "Valid signature");
            }
            
            promise.resolve(result);
            
        } catch (Exception e) {
            WritableMap result = Arguments.createMap();
            result.putBoolean("valid", false);
            result.putString("error", "Signature validation failed: " + e.getMessage());
            promise.resolve(result);
        }
    }

    private boolean checkProxyVPN() {
        try {
            String proxyHost = System.getProperty("http.proxyHost");
            return proxyHost != null && !proxyHost.isEmpty();
        } catch (Exception e) {
            return false;
        }
    }

    private boolean checkPacketCapture() {
        try {
            List<NetworkInterface> interfaces = Collections.list(NetworkInterface.getNetworkInterfaces());
            for (NetworkInterface intf : interfaces) {
                if (intf.getName().contains("tun") || intf.getName().contains("ppp")) {
                    return true;
                }
            }
        } catch (Exception e) {
            // Ignore
        }
        return false;
    }

    private double calculateSecurityScore(WritableMap... checks) {
        double score = 1.0;
        
        for (WritableMap check : checks) {
            if (check.hasKey("isRooted") && check.getBoolean("isRooted")) score -= 0.3;
            if (check.hasKey("isEmulator") && check.getBoolean("isEmulator")) score -= 0.2;
            if (check.hasKey("isHooked") && check.getBoolean("isHooked")) score -= 0.25;
            if (check.hasKey("isDebugging") && check.getBoolean("isDebugging")) score -= 0.15;
            if (check.hasKey("isTampered") && check.getBoolean("isTampered")) score -= 0.2;
            if (check.hasKey("isSecure") && !check.getBoolean("isSecure")) score -= 0.1;
        }
        
        return Math.max(0.0, score);
    }
}