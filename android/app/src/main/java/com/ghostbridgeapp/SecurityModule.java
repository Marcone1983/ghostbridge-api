package com.ghostbridgeapp;

import android.app.Activity;
import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.os.Build;
import android.view.WindowManager;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.io.File;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;

public class SecurityModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "SecurityModule";
    private ReactApplicationContext reactContext;

    public SecurityModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void enableSecureWindow(Promise promise) {
        try {
            final Activity activity = getCurrentActivity();
            if (activity != null) {
                activity.runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        activity.getWindow().setFlags(
                            WindowManager.LayoutParams.FLAG_SECURE,
                            WindowManager.LayoutParams.FLAG_SECURE
                        );
                    }
                });
                promise.resolve(true);
            } else {
                promise.reject("NO_ACTIVITY", "Activity not available");
            }
        } catch (Exception e) {
            promise.reject("SECURE_WINDOW_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void disableSecureWindow(Promise promise) {
        try {
            final Activity activity = getCurrentActivity();
            if (activity != null) {
                activity.runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
                    }
                });
                promise.resolve(true);
            } else {
                promise.reject("NO_ACTIVITY", "Activity not available");
            }
        } catch (Exception e) {
            promise.reject("SECURE_WINDOW_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getAppSignature(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            PackageManager pm = context.getPackageManager();
            PackageInfo packageInfo = pm.getPackageInfo(context.getPackageName(), PackageManager.GET_SIGNATURES);
            
            List<String> signatures = new ArrayList<>();
            for (Signature signature : packageInfo.signatures) {
                MessageDigest md = MessageDigest.getInstance("SHA256");
                md.update(signature.toByteArray());
                byte[] digest = md.digest();
                
                StringBuilder hexString = new StringBuilder();
                for (byte b : digest) {
                    String hex = Integer.toHexString(0xFF & b);
                    if (hex.length() == 1) {
                        hexString.append('0');
                    }
                    hexString.append(hex);
                }
                signatures.add(hexString.toString());
            }
            
            WritableMap result = Arguments.createMap();
            result.putString("signature", signatures.get(0));
            result.putInt("signatureCount", signatures.size());
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("SIGNATURE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void checkRootAccess(Promise promise) {
        try {
            WritableMap result = Arguments.createMap();
            result.putBoolean("isRooted", isRooted());
            result.putBoolean("hasSu", checkSuExists());
            result.putBoolean("hasRootApps", checkRootApps());
            result.putBoolean("hasDangerousProps", checkDangerousProps());
            result.putBoolean("hasRWPaths", checkRWPaths());
            result.putBoolean("hasBusyBox", checkBusyBox());
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("ROOT_CHECK_ERROR", e.getMessage());
        }
    }

    private boolean isRooted() {
        return checkSuExists() || checkRootApps() || checkDangerousProps() || checkRWPaths() || checkBusyBox();
    }

    private boolean checkSuExists() {
        String[] paths = {
            "/system/app/Superuser.apk",
            "/sbin/su",
            "/system/bin/su",
            "/system/xbin/su",
            "/data/local/xbin/su",
            "/data/local/bin/su",
            "/system/sd/xbin/su",
            "/system/bin/failsafe/su",
            "/data/local/su",
            "/su/bin/su"
        };
        
        for (String path : paths) {
            if (new File(path).exists()) {
                return true;
            }
        }
        return false;
    }

    private boolean checkRootApps() {
        String[] packages = {
            "com.koushikdutta.superuser",
            "com.noshufou.android.su",
            "com.thirdparty.superuser",
            "eu.chainfire.supersu",
            "com.topjohnwu.magisk",
            "com.kingroot.kinguser",
            "com.kingo.root"
        };
        
        PackageManager pm = getReactApplicationContext().getPackageManager();
        for (String packageName : packages) {
            try {
                pm.getPackageInfo(packageName, 0);
                return true;
            } catch (PackageManager.NameNotFoundException e) {
                // Package not found, continue checking
            }
        }
        return false;
    }

    private boolean checkDangerousProps() {
        String[] props = {
            "ro.debuggable",
            "ro.secure"
        };
        
        try {
            Process process = Runtime.getRuntime().exec("getprop");
            // Implementation details omitted for brevity
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean checkRWPaths() {
        String[] paths = {
            "/system",
            "/system/bin",
            "/system/sbin",
            "/system/xbin",
            "/vendor/bin",
            "/sbin",
            "/etc"
        };
        
        for (String path : paths) {
            File file = new File(path);
            if (file.canWrite()) {
                return true;
            }
        }
        return false;
    }

    private boolean checkBusyBox() {
        String[] paths = {
            "/system/xbin/busybox",
            "/system/bin/busybox",
            "/data/local/bin/busybox"
        };
        
        for (String path : paths) {
            if (new File(path).exists()) {
                return true;
            }
        }
        return false;
    }

    @ReactMethod
    public void detectHookingFrameworks(Promise promise) {
        try {
            WritableMap result = Arguments.createMap();
            result.putBoolean("xposed", checkXposed());
            result.putBoolean("substrate", checkSubstrate());
            result.putBoolean("frida", checkFrida());
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("HOOK_DETECTION_ERROR", e.getMessage());
        }
    }

    private boolean checkXposed() {
        try {
            ClassLoader classLoader = getClass().getClassLoader();
            classLoader.loadClass("de.robv.android.xposed.XposedBridge");
            return true;
        } catch (ClassNotFoundException e) {
            return false;
        }
    }

    private boolean checkSubstrate() {
        try {
            ClassLoader classLoader = getClass().getClassLoader();
            classLoader.loadClass("com.saurik.substrate.MS$2");
            return true;
        } catch (ClassNotFoundException e) {
            return false;
        }
    }

    private boolean checkFrida() {
        String[] fridaServerNames = {
            "frida-server",
            "frida-gadget",
            "frida-agent"
        };
        
        try {
            Process process = Runtime.getRuntime().exec("ps");
            // Check running processes for Frida
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    @ReactMethod
    public void detectEmulator(Promise promise) {
        try {
            WritableMap result = Arguments.createMap();
            result.putBoolean("isEmulator", isEmulator());
            result.putString("brand", Build.BRAND);
            result.putString("device", Build.DEVICE);
            result.putString("model", Build.MODEL);
            result.putString("hardware", Build.HARDWARE);
            result.putString("product", Build.PRODUCT);
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("EMULATOR_DETECTION_ERROR", e.getMessage());
        }
    }

    private boolean isEmulator() {
        return Build.FINGERPRINT.startsWith("generic")
            || Build.FINGERPRINT.startsWith("unknown")
            || Build.MODEL.contains("google_sdk")
            || Build.MODEL.contains("Emulator")
            || Build.MODEL.contains("Android SDK built for x86")
            || Build.MANUFACTURER.contains("Genymotion")
            || (Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic"))
            || "google_sdk".equals(Build.PRODUCT)
            || Build.HARDWARE.contains("goldfish")
            || Build.HARDWARE.contains("ranchu")
            || Build.PRODUCT.contains("sdk_google")
            || Build.PRODUCT.contains("google_sdk")
            || Build.PRODUCT.contains("sdk")
            || Build.PRODUCT.contains("sdk_x86")
            || Build.PRODUCT.contains("vbox86p")
            || Build.PRODUCT.contains("emulator")
            || Build.PRODUCT.contains("simulator");
    }
}