package com.ghostbridgeapp;

import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Handler;
import android.os.Looper;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.ArrayList;
import java.util.List;

public class RealTemperatureSensorModule extends ReactContextBaseJavaModule implements SensorEventListener {
    private static final String MODULE_NAME = "RealTemperatureSensor";
    private ReactApplicationContext reactContext;
    private SensorManager sensorManager;
    private Sensor temperatureSensor;
    private boolean isMonitoring = false;
    private float currentTemperature = Float.NaN;
    private float baselineTemperature = Float.NaN;
    private List<Float> temperatureHistory = new ArrayList<>();
    private Handler mainHandler;
    
    // Cold boot attack detection parameters
    private static final float COLD_BOOT_THRESHOLD = -10.0f; // 10°C drop
    private static final long MONITORING_INTERVAL = 1000; // 1 second
    private static final int HISTORY_SIZE = 60; // Keep 1 minute of data

    public RealTemperatureSensorModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
        this.mainHandler = new Handler(Looper.getMainLooper());
        initializeSensor();
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    private void initializeSensor() {
        try {
            sensorManager = (SensorManager) getReactApplicationContext().getSystemService(Context.SENSOR_SERVICE);
            
            if (sensorManager != null) {
                // Try to get ambient temperature sensor first
                temperatureSensor = sensorManager.getDefaultSensor(Sensor.TYPE_AMBIENT_TEMPERATURE);
                
                // Fallback to other temperature sensors if available
                if (temperatureSensor == null) {
                    List<Sensor> allSensors = sensorManager.getSensorList(Sensor.TYPE_ALL);
                    for (Sensor sensor : allSensors) {
                        if (sensor.getName().toLowerCase().contains("temperature") ||
                            sensor.getName().toLowerCase().contains("thermal")) {
                            temperatureSensor = sensor;
                            break;
                        }
                    }
                }
            }
        } catch (Exception e) {
            temperatureSensor = null;
        }
    }

    @ReactMethod
    public void isTemperatureSensorAvailable(Promise promise) {
        try {
            WritableMap result = Arguments.createMap();
            result.putBoolean("available", temperatureSensor != null);
            
            if (temperatureSensor != null) {
                result.putString("sensorName", temperatureSensor.getName());
                result.putString("vendor", temperatureSensor.getVendor());
                result.putFloat("resolution", temperatureSensor.getResolution());
                result.putFloat("maximumRange", temperatureSensor.getMaximumRange());
                result.putInt("minDelay", temperatureSensor.getMinDelay());
            } else {
                result.putString("error", "No temperature sensor found on device");
            }
            
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("SENSOR_CHECK_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void startTemperatureMonitoring(Promise promise) {
        try {
            if (temperatureSensor == null) {
                promise.reject("NO_SENSOR", "Temperature sensor not available");
                return;
            }

            if (isMonitoring) {
                promise.reject("ALREADY_MONITORING", "Temperature monitoring already active");
                return;
            }

            boolean registered = sensorManager.registerListener(
                this,
                temperatureSensor,
                SensorManager.SENSOR_DELAY_NORMAL
            );

            if (registered) {
                isMonitoring = true;
                temperatureHistory.clear();
                
                // Start baseline calibration
                mainHandler.postDelayed(() -> {
                    if (isMonitoring && !Float.isNaN(currentTemperature)) {
                        baselineTemperature = currentTemperature;
                        sendEvent("temperatureBaselineSet", baselineTemperature);
                    }
                }, 5000); // 5 second calibration period
                
                promise.resolve(true);
            } else {
                promise.reject("REGISTRATION_FAILED", "Failed to register sensor listener");
            }
            
        } catch (Exception e) {
            promise.reject("MONITORING_START_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopTemperatureMonitoring(Promise promise) {
        try {
            if (!isMonitoring) {
                promise.resolve(false);
                return;
            }

            sensorManager.unregisterListener(this);
            isMonitoring = false;
            currentTemperature = Float.NaN;
            baselineTemperature = Float.NaN;
            temperatureHistory.clear();
            
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("MONITORING_STOP_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getCurrentTemperature(Promise promise) {
        try {
            WritableMap result = Arguments.createMap();
            
            if (Float.isNaN(currentTemperature)) {
                result.putBoolean("available", false);
                result.putString("error", "No temperature reading available");
            } else {
                result.putBoolean("available", true);
                result.putDouble("temperature", currentTemperature);
                result.putDouble("baseline", baselineTemperature);
                result.putDouble("delta", Float.isNaN(baselineTemperature) ? 0 : (currentTemperature - baselineTemperature));
                result.putInt("historySize", temperatureHistory.size());
            }
            
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("TEMPERATURE_READ_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void performColdBootDetection(Promise promise) {
        try {
            WritableMap result = Arguments.createMap();
            
            if (Float.isNaN(currentTemperature) || Float.isNaN(baselineTemperature)) {
                result.putBoolean("reliable", false);
                result.putString("error", "Insufficient temperature data for analysis");
                promise.resolve(result);
                return;
            }

            float temperatureDelta = currentTemperature - baselineTemperature;
            boolean coldBootSuspected = temperatureDelta <= COLD_BOOT_THRESHOLD;
            
            // Analyze temperature trend
            String trend = analyzeTrend();
            boolean rapidCooling = trend.equals("rapid_cooling");
            
            result.putBoolean("reliable", true);
            result.putBoolean("coldBootSuspected", coldBootSuspected);
            result.putBoolean("rapidCooling", rapidCooling);
            result.putDouble("currentTemp", currentTemperature);
            result.putDouble("baselineTemp", baselineTemperature);
            result.putDouble("delta", temperatureDelta);
            result.putDouble("threshold", COLD_BOOT_THRESHOLD);
            result.putString("trend", trend);
            result.putInt("dataPoints", temperatureHistory.size());
            
            if (coldBootSuspected || rapidCooling) {
                result.putString("recommendation", "EMERGENCY_BURN_RECOMMENDED");
                sendEvent("coldBootThreatDetected", result);
            }
            
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("COLD_BOOT_DETECTION_ERROR", e.getMessage());
        }
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() == temperatureSensor.getType()) {
            currentTemperature = event.values[0];
            
            // Add to history
            temperatureHistory.add(currentTemperature);
            if (temperatureHistory.size() > HISTORY_SIZE) {
                temperatureHistory.remove(0);
            }
            
            // Send real-time update
            WritableMap data = Arguments.createMap();
            data.putDouble("temperature", currentTemperature);
            data.putLong("timestamp", System.currentTimeMillis());
            
            if (!Float.isNaN(baselineTemperature)) {
                data.putDouble("delta", currentTemperature - baselineTemperature);
                
                // Check for sudden temperature drops
                float delta = currentTemperature - baselineTemperature;
                if (delta <= COLD_BOOT_THRESHOLD) {
                    data.putBoolean("coldBootAlert", true);
                }
            }
            
            sendEvent("temperatureReading", data);
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        WritableMap data = Arguments.createMap();
        data.putString("sensor", sensor.getName());
        data.putInt("accuracy", accuracy);
        sendEvent("sensorAccuracyChanged", data);
    }

    private String analyzeTrend() {
        if (temperatureHistory.size() < 10) {
            return "insufficient_data";
        }
        
        // Analyze last 10 readings
        List<Float> recentReadings = temperatureHistory.subList(
            Math.max(0, temperatureHistory.size() - 10),
            temperatureHistory.size()
        );
        
        // Calculate trend
        float firstTemp = recentReadings.get(0);
        float lastTemp = recentReadings.get(recentReadings.size() - 1);
        float change = lastTemp - firstTemp;
        
        if (change <= -5.0f) {
            return "rapid_cooling";
        } else if (change <= -2.0f) {
            return "cooling";
        } else if (change >= 2.0f) {
            return "warming";
        } else {
            return "stable";
        }
    }

    private void sendEvent(String eventName, Object data) {
        if (reactContext.hasActiveReactInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, data);
        }
    }
}