package com.ghostbridgeapp;

import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import java.io.File;
import java.io.FileReader;
import java.io.BufferedReader;
import java.io.IOException;

public class TemperatureSensorModule extends ReactContextBaseJavaModule implements SensorEventListener {
    private static final String MODULE_NAME = "TemperatureSensor";
    private ReactApplicationContext reactContext;
    private SensorManager sensorManager;
    private Sensor temperatureSensor;
    private Sensor ambientTemperatureSensor;
    private AtomicBoolean isMonitoring = new AtomicBoolean(false);
    private AtomicReference<Float> lastTemperature = new AtomicReference<>(0f);
    private AtomicReference<Float> lastAmbientTemperature = new AtomicReference<>(0f);
    private long lastUpdateTime = 0;

    public TemperatureSensorModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.sensorManager = (SensorManager) reactContext.getSystemService(Context.SENSOR_SERVICE);
        
        // Try to get device temperature sensor (battery/CPU)
        this.temperatureSensor = sensorManager.getDefaultSensor(Sensor.TYPE_TEMPERATURE);
        
        // Get ambient temperature sensor if available
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.ICE_CREAM_SANDWICH) {
            this.ambientTemperatureSensor = sensorManager.getDefaultSensor(Sensor.TYPE_AMBIENT_TEMPERATURE);
        }
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void getSensorInfo(Promise promise) {
        try {
            WritableMap result = Arguments.createMap();
            
            // Check device temperature sensor
            if (temperatureSensor != null) {
                result.putBoolean("hasDeviceTemperatureSensor", true);
                result.putString("deviceTemperatureName", temperatureSensor.getName());
                result.putString("deviceTemperatureVendor", temperatureSensor.getVendor());
                result.putFloat("deviceTemperatureMaxRange", temperatureSensor.getMaximumRange());
                result.putFloat("deviceTemperatureResolution", temperatureSensor.getResolution());
            } else {
                result.putBoolean("hasDeviceTemperatureSensor", false);
            }
            
            // Check ambient temperature sensor
            if (ambientTemperatureSensor != null) {
                result.putBoolean("hasAmbientTemperatureSensor", true);
                result.putString("ambientTemperatureName", ambientTemperatureSensor.getName());
                result.putString("ambientTemperatureVendor", ambientTemperatureSensor.getVendor());
                result.putFloat("ambientTemperatureMaxRange", ambientTemperatureSensor.getMaximumRange());
                result.putFloat("ambientTemperatureResolution", ambientTemperatureSensor.getResolution());
            } else {
                result.putBoolean("hasAmbientTemperatureSensor", false);
            }
            
            // Additional system information
            result.putString("manufacturer", Build.MANUFACTURER);
            result.putString("model", Build.MODEL);
            result.putInt("sdkVersion", Build.VERSION.SDK_INT);
            
            // Check thermal status (API 29+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                android.os.PowerManager powerManager = (android.os.PowerManager) 
                    reactContext.getSystemService(Context.POWER_SERVICE);
                if (powerManager != null) {
                    result.putInt("thermalStatus", powerManager.getCurrentThermalStatus());
                }
            }
            
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("SENSOR_INFO_ERROR", "Failed to get sensor info: " + e.getMessage());
        }
    }

    @ReactMethod
    public void getCurrentTemperature(Promise promise) {
        try {
            WritableMap result = Arguments.createMap();
            
            // Get last known temperatures
            result.putFloat("deviceTemperature", lastTemperature.get());
            result.putFloat("ambientTemperature", lastAmbientTemperature.get());
            result.putDouble("timestamp", System.currentTimeMillis());
            result.putBoolean("isMonitoring", isMonitoring.get());
            
            // Try to get CPU temperature via thermal files
            float cpuTemp = getCPUTemperatureFromThermal();
            if (cpuTemp > 0) {
                result.putFloat("cpuTemperature", cpuTemp);
            }
            
            // Try to get battery temperature
            float batteryTemp = getBatteryTemperature();
            if (batteryTemp > 0) {
                result.putFloat("batteryTemperature", batteryTemp);
            }
            
            // Get thermal status if available
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                android.os.PowerManager powerManager = (android.os.PowerManager) 
                    reactContext.getSystemService(Context.POWER_SERVICE);
                if (powerManager != null) {
                    result.putInt("thermalStatus", powerManager.getCurrentThermalStatus());
                }
            }
            
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("TEMPERATURE_ERROR", "Failed to get temperature: " + e.getMessage());
        }
    }

    @ReactMethod
    public void startTemperatureMonitoring(Promise promise) {
        try {
            if (isMonitoring.get()) {
                promise.reject("ALREADY_MONITORING", "Temperature monitoring already active");
                return;
            }
            
            boolean success = false;
            
            // Register device temperature sensor
            if (temperatureSensor != null) {
                boolean registered = sensorManager.registerListener(this, temperatureSensor, 
                    SensorManager.SENSOR_DELAY_NORMAL);
                if (registered) {
                    success = true;
                }
            }
            
            // Register ambient temperature sensor
            if (ambientTemperatureSensor != null) {
                boolean registered = sensorManager.registerListener(this, ambientTemperatureSensor, 
                    SensorManager.SENSOR_DELAY_NORMAL);
                if (registered) {
                    success = true;
                }
            }
            
            if (success) {
                isMonitoring.set(true);
                WritableMap result = Arguments.createMap();
                result.putBoolean("success", true);
                result.putBoolean("monitoring", true);
                promise.resolve(result);
            } else {
                promise.reject("SENSOR_REGISTRATION_FAILED", "Failed to register temperature sensors");
            }
            
        } catch (Exception e) {
            promise.reject("MONITORING_ERROR", "Failed to start monitoring: " + e.getMessage());
        }
    }

    @ReactMethod
    public void stopTemperatureMonitoring(Promise promise) {
        try {
            if (!isMonitoring.get()) {
                promise.resolve(Arguments.createMap());
                return;
            }
            
            sensorManager.unregisterListener(this);
            isMonitoring.set(false);
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putBoolean("monitoring", false);
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("STOP_MONITORING_ERROR", "Failed to stop monitoring: " + e.getMessage());
        }
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        long currentTime = System.currentTimeMillis();
        
        // Limit update frequency to prevent spam
        if (currentTime - lastUpdateTime < 1000) {
            return;
        }
        lastUpdateTime = currentTime;
        
        try {
            if (event.sensor.getType() == Sensor.TYPE_TEMPERATURE) {
                // Device temperature (battery/CPU)
                float temperature = event.values[0];
                lastTemperature.set(temperature);
                
                WritableMap data = Arguments.createMap();
                data.putString("type", "device");
                data.putFloat("temperature", temperature);
                data.putDouble("timestamp", currentTime);
                
                sendEvent("temperatureUpdate", data);
                
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.ICE_CREAM_SANDWICH && 
                       event.sensor.getType() == Sensor.TYPE_AMBIENT_TEMPERATURE) {
                // Ambient temperature
                float temperature = event.values[0];
                lastAmbientTemperature.set(temperature);
                
                WritableMap data = Arguments.createMap();
                data.putString("type", "ambient");
                data.putFloat("temperature", temperature);
                data.putDouble("timestamp", currentTime);
                
                sendEvent("temperatureUpdate", data);
            }
        } catch (Exception e) {
            // Log error but don't crash
            android.util.Log.e(MODULE_NAME, "Error processing sensor data: " + e.getMessage());
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        try {
            WritableMap data = Arguments.createMap();
            data.putString("sensorName", sensor.getName());
            data.putInt("accuracy", accuracy);
            data.putDouble("timestamp", System.currentTimeMillis());
            
            sendEvent("temperatureAccuracyChanged", data);
        } catch (Exception e) {
            android.util.Log.e(MODULE_NAME, "Error processing accuracy change: " + e.getMessage());
        }
    }

    private float getCPUTemperatureFromThermal() {
        try {
            // Try to read CPU temperature from thermal zone files
            String[] thermalPaths = {
                "/sys/class/thermal/thermal_zone0/temp",
                "/sys/class/thermal/thermal_zone1/temp",
                "/sys/class/thermal/thermal_zone2/temp",
                "/sys/devices/virtual/thermal/thermal_zone0/temp",
                "/sys/devices/virtual/thermal/thermal_zone1/temp"
            };
            
            for (String path : thermalPaths) {
                try {
                    java.io.FileInputStream fis = new java.io.FileInputStream(path);
                    java.io.BufferedReader reader = new java.io.BufferedReader(
                        new java.io.InputStreamReader(fis));
                    String tempStr = reader.readLine();
                    reader.close();
                    fis.close();
                    
                    if (tempStr != null && !tempStr.isEmpty()) {
                        long tempMilliC = Long.parseLong(tempStr.trim());
                        // Convert from millicelsius to celsius
                        return tempMilliC / 1000.0f;
                    }
                } catch (Exception e) {
                    // Try next path
                    continue;
                }
            }
        } catch (Exception e) {
            // Thermal files not accessible
        }
        
        return 0f;
    }

    private float getBatteryTemperature() {
        try {
            android.content.IntentFilter filter = new android.content.IntentFilter(
                android.content.Intent.ACTION_BATTERY_CHANGED);
            android.content.Intent batteryStatus = reactContext.registerReceiver(null, filter);
            
            if (batteryStatus != null) {
                int temperature = batteryStatus.getIntExtra(
                    android.os.BatteryManager.EXTRA_TEMPERATURE, -1);
                if (temperature > 0) {
                    // Battery temperature is in tenths of degrees Celsius
                    return temperature / 10.0f;
                }
            }
        } catch (Exception e) {
            // Battery info not accessible
        }
        
        return 0f;
    }

    private void sendEvent(String eventName, WritableMap params) {
        try {
            if (reactContext.hasActiveCatalystInstance()) {
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(eventName, params);
            }
        } catch (Exception e) {
            android.util.Log.e(MODULE_NAME, "Error sending event: " + e.getMessage());
        }
    }
}