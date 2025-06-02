package com.ghostbridgeapp.modules;

import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

/**
 * REAL Temperature Sensor Module for Cold Boot Attack Protection
 * Monitors hardware temperature sensors to detect potential cold boot attacks
 */
public class TemperatureSensorModule extends ReactContextBaseJavaModule implements SensorEventListener {
    private static final String TAG = "TemperatureSensorModule";
    
    // Temperature thresholds for cold boot attack detection
    private static final float COLD_BOOT_THRESHOLD = 15.0f; // °C
    private static final float CRITICAL_COLD_THRESHOLD = 0.0f; // °C
    private static final float NORMAL_OPERATING_MIN = 20.0f; // °C
    private static final float NORMAL_OPERATING_MAX = 45.0f; // °C
    
    private final ReactApplicationContext reactContext;
    private SensorManager sensorManager;
    private List<Sensor> temperatureSensors;
    private Handler mainHandler;
    
    // Current sensor readings
    private final AtomicReference<Float> currentTemperature = new AtomicReference<>(null);
    private final AtomicReference<Float> batteryTemperature = new AtomicReference<>(null);
    private final AtomicReference<Float> ambientTemperature = new AtomicReference<>(null);
    
    // Monitoring state
    private final AtomicBoolean isMonitoring = new AtomicBoolean(false);
    private final AtomicBoolean coldBootDetected = new AtomicBoolean(false);
    
    // Temperature history for analysis
    private final List<TemperatureReading> temperatureHistory = new ArrayList<>();
    private static final int MAX_HISTORY_SIZE = 100;
    
    public TemperatureSensorModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.mainHandler = new Handler(Looper.getMainLooper());
        initializeSensorManager();
    }

    @Override
    public String getName() {
        return "TemperatureSensor";
    }

    /**
     * Initialize sensor manager and discover temperature sensors
     */
    private void initializeSensorManager() {
        try {
            sensorManager = (SensorManager) reactContext.getSystemService(Context.SENSOR_SERVICE);
            temperatureSensors = new ArrayList<>();
            
            if (sensorManager == null) {
                Log.e(TAG, "SensorManager not available");
                return;
            }
            
            // Get all available temperature sensors
            List<Sensor> allSensors = sensorManager.getSensorList(Sensor.TYPE_ALL);
            for (Sensor sensor : allSensors) {
                if (isTemperatureSensor(sensor)) {
                    temperatureSensors.add(sensor);
                    Log.d(TAG, "Found temperature sensor: " + sensor.getName() + 
                          " (Type: " + sensor.getType() + ")");
                }
            }
            
            Log.d(TAG, "Initialized with " + temperatureSensors.size() + " temperature sensors");
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize sensor manager", e);
        }
    }
    
    /**
     * Check if sensor is a temperature sensor
     */
    private boolean isTemperatureSensor(Sensor sensor) {
        int type = sensor.getType();
        return type == Sensor.TYPE_AMBIENT_TEMPERATURE ||
               type == Sensor.TYPE_TEMPERATURE ||
               sensor.getName().toLowerCase().contains("temperature") ||
               sensor.getName().toLowerCase().contains("thermal");
    }

    /**
     * Start temperature monitoring
     */
    @ReactMethod
    public void startMonitoring(Promise promise) {
        try {
            if (sensorManager == null) {
                promise.reject("SENSOR_MANAGER_NULL", "Sensor manager not available");
                return;
            }
            
            if (temperatureSensors.isEmpty()) {
                promise.reject("NO_SENSORS", "No temperature sensors available on this device");
                return;
            }
            
            if (isMonitoring.get()) {
                WritableMap result = new WritableNativeMap();
                result.putBoolean("success", true);
                result.putString("status", "already_monitoring");
                promise.resolve(result);
                return;
            }
            
            // Register listeners for all temperature sensors
            boolean registered = false;
            for (Sensor sensor : temperatureSensors) {
                boolean success = sensorManager.registerListener(
                    this, 
                    sensor, 
                    SensorManager.SENSOR_DELAY_NORMAL
                );
                
                if (success) {
                    registered = true;
                    Log.d(TAG, "Registered listener for: " + sensor.getName());
                } else {
                    Log.w(TAG, "Failed to register listener for: " + sensor.getName());
                }
            }
            
            if (!registered) {
                promise.reject("REGISTRATION_FAILED", "Failed to register any temperature sensor listeners");
                return;
            }
            
            isMonitoring.set(true);
            coldBootDetected.set(false);
            
            WritableMap result = new WritableNativeMap();
            result.putBoolean("success", true);
            result.putString("status", "monitoring_started");
            result.putInt("sensorsRegistered", temperatureSensors.size());
            result.putDouble("coldBootThreshold", COLD_BOOT_THRESHOLD);
            result.putDouble("criticalThreshold", CRITICAL_COLD_THRESHOLD);
            
            Log.d(TAG, "Temperature monitoring started with " + temperatureSensors.size() + " sensors");
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to start temperature monitoring", e);
            promise.reject("START_MONITORING_FAILED", e.getMessage());
        }
    }

    /**
     * Stop temperature monitoring
     */
    @ReactMethod
    public void stopMonitoring(Promise promise) {
        try {
            if (sensorManager != null) {
                sensorManager.unregisterListener(this);
            }
            
            isMonitoring.set(false);
            
            WritableMap result = new WritableNativeMap();
            result.putBoolean("success", true);
            result.putString("status", "monitoring_stopped");
            
            Log.d(TAG, "Temperature monitoring stopped");
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to stop temperature monitoring", e);
            promise.reject("STOP_MONITORING_FAILED", e.getMessage());
        }
    }

    /**
     * Get current temperature readings
     */
    @ReactMethod
    public void getCurrentTemperature(Promise promise) {
        try {
            WritableMap result = new WritableNativeMap();
            result.putBoolean("success", true);
            result.putBoolean("isMonitoring", isMonitoring.get());
            result.putBoolean("coldBootDetected", coldBootDetected.get());
            
            Float current = currentTemperature.get();
            Float battery = batteryTemperature.get();
            Float ambient = ambientTemperature.get();
            
            if (current != null) {
                result.putDouble("temperature", current);
                result.putBoolean("belowColdBootThreshold", current < COLD_BOOT_THRESHOLD);
                result.putBoolean("criticallyLow", current < CRITICAL_COLD_THRESHOLD);
            } else {
                result.putNull("temperature");
            }
            
            if (battery != null) {
                result.putDouble("batteryTemperature", battery);
            } else {
                result.putNull("batteryTemperature");
            }
            
            if (ambient != null) {
                result.putDouble("ambientTemperature", ambient);
            } else {
                result.putNull("ambientTemperature");
            }
            
            result.putLong("timestamp", System.currentTimeMillis());
            
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to get current temperature", e);
            promise.reject("GET_TEMPERATURE_FAILED", e.getMessage());
        }
    }

    /**
     * Get available temperature sensors info
     */
    @ReactMethod
    public void getSensorInfo(Promise promise) {
        try {
            WritableMap result = new WritableNativeMap();
            result.putBoolean("success", true);
            result.putInt("sensorCount", temperatureSensors.size());
            
            WritableArray sensorsArray = new WritableNativeArray();
            for (Sensor sensor : temperatureSensors) {
                WritableMap sensorInfo = new WritableNativeMap();
                sensorInfo.putString("name", sensor.getName());
                sensorInfo.putString("vendor", sensor.getVendor());
                sensorInfo.putInt("type", sensor.getType());
                sensorInfo.putString("typeName", getSensorTypeName(sensor.getType()));
                sensorInfo.putDouble("resolution", sensor.getResolution());
                sensorInfo.putDouble("maximumRange", sensor.getMaximumRange());
                sensorInfo.putDouble("power", sensor.getPower());
                sensorInfo.putInt("minDelay", sensor.getMinDelay());
                
                sensorsArray.pushMap(sensorInfo);
            }
            
            result.putArray("sensors", sensorsArray);
            
            Log.d(TAG, "Sensor info retrieved for " + temperatureSensors.size() + " sensors");
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to get sensor info", e);
            promise.reject("GET_SENSOR_INFO_FAILED", e.getMessage());
        }
    }

    /**
     * Get temperature history for analysis
     */
    @ReactMethod
    public void getTemperatureHistory(Promise promise) {
        try {
            WritableMap result = new WritableNativeMap();
            result.putBoolean("success", true);
            result.putInt("historySize", temperatureHistory.size());
            
            WritableArray historyArray = new WritableNativeArray();
            synchronized (temperatureHistory) {
                for (TemperatureReading reading : temperatureHistory) {
                    WritableMap entry = new WritableNativeMap();
                    entry.putDouble("temperature", reading.temperature);
                    entry.putLong("timestamp", reading.timestamp);
                    entry.putString("sensorType", reading.sensorType);
                    entry.putBoolean("suspicious", reading.temperature < COLD_BOOT_THRESHOLD);
                    
                    historyArray.pushMap(entry);
                }
            }
            
            result.putArray("history", historyArray);
            
            // Calculate statistics
            if (!temperatureHistory.isEmpty()) {
                float min = Float.MAX_VALUE;
                float max = Float.MIN_VALUE;
                float sum = 0;
                
                for (TemperatureReading reading : temperatureHistory) {
                    min = Math.min(min, reading.temperature);
                    max = Math.max(max, reading.temperature);
                    sum += reading.temperature;
                }
                
                float average = sum / temperatureHistory.size();
                
                WritableMap stats = new WritableNativeMap();
                stats.putDouble("min", min);
                stats.putDouble("max", max);
                stats.putDouble("average", average);
                stats.putBoolean("coldBootSuspected", min < COLD_BOOT_THRESHOLD);
                
                result.putMap("statistics", stats);
            }
            
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to get temperature history", e);
            promise.reject("GET_HISTORY_FAILED", e.getMessage());
        }
    }

    /**
     * Check for cold boot attack indicators
     */
    @ReactMethod
    public void checkColdBootRisk(Promise promise) {
        try {
            WritableMap result = new WritableNativeMap();
            result.putBoolean("success", true);
            
            Float current = currentTemperature.get();
            boolean riskDetected = false;
            String riskLevel = "NORMAL";
            String reason = "Temperature within normal range";
            
            if (current != null) {
                if (current < CRITICAL_COLD_THRESHOLD) {
                    riskDetected = true;
                    riskLevel = "CRITICAL";
                    reason = "Temperature critically low - potential cold boot attack";
                } else if (current < COLD_BOOT_THRESHOLD) {
                    riskDetected = true;
                    riskLevel = "HIGH";
                    reason = "Temperature below cold boot threshold";
                } else if (current < NORMAL_OPERATING_MIN) {
                    riskDetected = true;
                    riskLevel = "MEDIUM";
                    reason = "Temperature below normal operating range";
                }
            } else {
                riskDetected = true;
                riskLevel = "UNKNOWN";
                reason = "No temperature reading available";
            }
            
            result.putBoolean("riskDetected", riskDetected);
            result.putString("riskLevel", riskLevel);
            result.putString("reason", reason);
            result.putBoolean("coldBootDetected", coldBootDetected.get());
            
            if (current != null) {
                result.putDouble("currentTemperature", current);
            }
            
            result.putLong("timestamp", System.currentTimeMillis());
            
            Log.d(TAG, "Cold boot risk check: " + riskLevel + " - " + reason);
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to check cold boot risk", e);
            promise.reject("COLD_BOOT_CHECK_FAILED", e.getMessage());
        }
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        try {
            float temperature = event.values[0];
            long timestamp = System.currentTimeMillis();
            String sensorType = getSensorTypeName(event.sensor.getType());
            
            // Update current readings based on sensor type
            if (event.sensor.getType() == Sensor.TYPE_AMBIENT_TEMPERATURE) {
                ambientTemperature.set(temperature);
            } else {
                currentTemperature.set(temperature);
            }
            
            // Add to history
            synchronized (temperatureHistory) {
                temperatureHistory.add(new TemperatureReading(temperature, timestamp, sensorType));
                
                // Limit history size
                if (temperatureHistory.size() > MAX_HISTORY_SIZE) {
                    temperatureHistory.remove(0);
                }
            }
            
            // Check for cold boot attack
            if (temperature < COLD_BOOT_THRESHOLD && !coldBootDetected.get()) {
                coldBootDetected.set(true);
                
                // Send alert to React Native
                WritableMap alertData = new WritableNativeMap();
                alertData.putDouble("temperature", temperature);
                alertData.putString("alertType", "COLD_BOOT_DETECTED");
                alertData.putString("sensorType", sensorType);
                alertData.putLong("timestamp", timestamp);
                alertData.putBoolean("critical", temperature < CRITICAL_COLD_THRESHOLD);
                
                sendEvent("TemperatureAlert", alertData);
                
                Log.w(TAG, "COLD BOOT ATTACK DETECTED! Temperature: " + temperature + "°C");
            }
            
            // Periodic temperature updates
            if (timestamp % 10000 < 1000) { // Every ~10 seconds
                WritableMap updateData = new WritableNativeMap();
                updateData.putDouble("temperature", temperature);
                updateData.putString("sensorType", sensorType);
                updateData.putLong("timestamp", timestamp);
                
                sendEvent("TemperatureUpdate", updateData);
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error processing sensor data", e);
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        Log.d(TAG, "Sensor accuracy changed: " + sensor.getName() + " -> " + accuracy);
    }
    
    /**
     * Send event to React Native
     */
    private void sendEvent(String eventName, WritableMap data) {
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, data);
        } catch (Exception e) {
            Log.e(TAG, "Failed to send event: " + eventName, e);
        }
    }
    
    /**
     * Get human-readable sensor type name
     */
    private String getSensorTypeName(int sensorType) {
        switch (sensorType) {
            case Sensor.TYPE_AMBIENT_TEMPERATURE:
                return "AMBIENT_TEMPERATURE";
            case Sensor.TYPE_TEMPERATURE:
                return "TEMPERATURE";
            default:
                return "UNKNOWN_" + sensorType;
        }
    }
    
    /**
     * Temperature reading data class
     */
    private static class TemperatureReading {
        final float temperature;
        final long timestamp;
        final String sensorType;
        
        TemperatureReading(float temperature, long timestamp, String sensorType) {
            this.temperature = temperature;
            this.timestamp = timestamp;
            this.sensorType = sensorType;
        }
    }
}