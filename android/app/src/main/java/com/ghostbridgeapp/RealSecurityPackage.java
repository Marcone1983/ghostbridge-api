package com.ghostbridgeapp;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Package containing all REAL security modules
 * HSM, Deep Packet Inspection, Secure Memory Wiper
 */
public class RealSecurityPackage implements ReactPackage {

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }

    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        
        // Real Hardware Security Module
        modules.add(new RealHSMModule(reactContext));
        
        // Real Deep Packet Inspection
        modules.add(new RealDeepPacketInspectionModule(reactContext));
        
        // Secure Memory Wiper
        modules.add(new SecureMemoryModule(reactContext));
        
        return modules;
    }
}