/**
 * Global Error Handler for Native Module Failures
 * Provides graceful fallbacks and comprehensive error logging
 */

import { NativeModules, Alert, Platform } from 'react-native';

class GlobalErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
    this.criticalErrors = [];
    this.fallbackEnabled = false; // No fallbacks for production security
    
    this.setupGlobalHandlers();
  }

  /**
   * Setup global error handling
   */
  setupGlobalHandlers() {
    // React Native error boundary
    if (global.ErrorUtils) {
      const originalHandler = global.ErrorUtils.getGlobalHandler();
      
      global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        this.handleError(error, {
          type: 'GLOBAL',
          isFatal,
          timestamp: Date.now()
        });
        
        // Call original handler
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });
    }

    // Promise rejection handler
    if (global.addEventListener) {
      global.addEventListener('unhandledrejection', (event) => {
        this.handleError(event.reason, {
          type: 'PROMISE_REJECTION',
          isFatal: false,
          timestamp: Date.now()
        });
      });
    }

    console.log('🛡️ Global error handler initialized');
  }

  /**
   * Handle native module errors with context
   */
  async handleNativeModuleError(moduleName, methodName, error, context = {}) {
    const errorInfo = {
      module: moduleName,
      method: methodName,
      error: error.message,
      stack: error.stack,
      platform: Platform.OS,
      timestamp: Date.now(),
      context,
      type: 'NATIVE_MODULE'
    };

    // Log the error
    this.logError(errorInfo);

    // Check if this is a critical security module
    const criticalModules = ['AndroidKeystore', 'TemperatureSensor', 'AdvancedSecurity'];
    const isCritical = criticalModules.includes(moduleName);

    if (isCritical) {
      this.handleCriticalError(errorInfo);
    }

    // Determine appropriate response
    const response = await this.determineErrorResponse(errorInfo);
    
    return response;
  }

  /**
   * Handle critical security module failures
   */
  handleCriticalError(errorInfo) {
    this.criticalErrors.push(errorInfo);
    
    console.error('🚨 CRITICAL SECURITY MODULE FAILURE:', errorInfo);
    
    // Alert user to critical security failure
    Alert.alert(
      '🚨 Security System Failure',
      `Critical security module ${errorInfo.module} has failed. Some security features may not be available.`,
      [
        {
          text: 'Continue',
          style: 'cancel'
        },
        {
          text: 'View Details',
          onPress: () => this.showErrorDetails(errorInfo)
        }
      ]
    );

    // Log to security monitoring
    this.logSecurityIncident(errorInfo);
  }

  /**
   * Determine appropriate error response
   */
  async determineErrorResponse(errorInfo) {
    switch (errorInfo.module) {
      case 'AndroidKeystore':
        return this.handleKeystoreError(errorInfo);
      
      case 'TemperatureSensor':
        return this.handleTemperatureError(errorInfo);
      
      case 'AdvancedSecurity':
        return this.handleAdvancedSecurityError(errorInfo);
      
      default:
        return this.handleGenericError(errorInfo);
    }
  }

  /**
   * Handle AndroidKeystore errors
   */
  handleKeystoreError(errorInfo) {
    const error = errorInfo.error.toLowerCase();
    
    if (error.includes('module not available')) {
      return {
        success: false,
        error: 'Hardware keystore not available',
        fallback: 'software_keystore',
        security_level: 'DEGRADED',
        recommendation: 'Update to a device with hardware security module support'
      };
    }
    
    if (error.includes('strongbox')) {
      return {
        success: false,
        error: 'StrongBox not available on this device',
        fallback: 'tee_keystore',
        security_level: 'REDUCED',
        recommendation: 'StrongBox requires Android 9+ and supported hardware'
      };
    }
    
    if (error.includes('hardware')) {
      return {
        success: false,
        error: 'Hardware security not available',
        fallback: 'software_security',
        security_level: 'MINIMAL',
        recommendation: 'Use a device with Trusted Execution Environment (TEE)'
      };
    }

    return {
      success: false,
      error: `Android Keystore error: ${errorInfo.error}`,
      fallback: null,
      security_level: 'UNKNOWN'
    };
  }

  /**
   * Handle TemperatureSensor errors
   */
  handleTemperatureError(errorInfo) {
    const error = errorInfo.error.toLowerCase();
    
    if (error.includes('module not available')) {
      return {
        success: false,
        error: 'Temperature sensors not accessible',
        fallback: null, // NO FALLBACKS for temperature monitoring
        security_level: 'COMPROMISED',
        recommendation: 'Temperature monitoring is critical for cold boot protection'
      };
    }
    
    if (error.includes('no sensors')) {
      return {
        success: false,
        error: 'No temperature sensors available on device',
        fallback: null,
        security_level: 'COMPROMISED',
        recommendation: 'This device lacks necessary temperature sensors for security'
      };
    }

    if (error.includes('permission')) {
      return {
        success: false,
        error: 'Temperature sensor permission denied',
        fallback: null,
        security_level: 'COMPROMISED',
        recommendation: 'Grant hardware sensor permissions for security features'
      };
    }

    return {
      success: false,
      error: `Temperature sensor error: ${errorInfo.error}`,
      fallback: null,
      security_level: 'COMPROMISED'
    };
  }

  /**
   * Handle AdvancedSecurity errors
   */
  handleAdvancedSecurityError(errorInfo) {
    const error = errorInfo.error.toLowerCase();
    
    if (error.includes('module not available')) {
      return {
        success: false,
        error: 'Advanced security module not available',
        fallback: 'basic_security',
        security_level: 'BASIC',
        recommendation: 'App integrity and signature validation not available'
      };
    }
    
    if (error.includes('signature')) {
      return {
        success: false,
        error: 'App signature validation failed',
        fallback: null,
        security_level: 'COMPROMISED',
        recommendation: 'App may be tampered or modified'
      };
    }

    if (error.includes('rooted') || error.includes('jailbroken')) {
      return {
        success: false,
        error: 'Device security compromised',
        fallback: null,
        security_level: 'COMPROMISED',
        recommendation: 'Use an unrooted device for maximum security'
      };
    }

    return {
      success: false,
      error: `Advanced security error: ${errorInfo.error}`,
      fallback: 'basic_security',
      security_level: 'REDUCED'
    };
  }

  /**
   * Handle generic errors
   */
  handleGenericError(errorInfo) {
    return {
      success: false,
      error: errorInfo.error,
      fallback: null,
      security_level: 'UNKNOWN',
      recommendation: 'Check device compatibility and permissions'
    };
  }

  /**
   * Check if native module is available
   */
  checkNativeModule(moduleName) {
    try {
      const module = NativeModules[moduleName];
      
      if (!module) {
        const error = new Error(`${moduleName} native module not found`);
        this.handleNativeModuleError(moduleName, 'checkAvailability', error);
        return false;
      }
      
      return true;
    } catch (error) {
      this.handleNativeModuleError(moduleName, 'checkAvailability', error);
      return false;
    }
  }

  /**
   * Safe native module call with error handling
   */
  async safeNativeCall(moduleName, methodName, params = {}) {
    try {
      // Check if module is available
      if (!this.checkNativeModule(moduleName)) {
        throw new Error(`${moduleName} module not available`);
      }

      const module = NativeModules[moduleName];
      const method = module[methodName];
      
      if (!method) {
        throw new Error(`Method ${methodName} not found in ${moduleName}`);
      }

      // Make the call
      const result = await method(params);
      
      // Log successful call
      this.logSuccess(moduleName, methodName, params);
      
      return {
        success: true,
        data: result,
        module: moduleName,
        method: methodName
      };

    } catch (error) {
      // Handle and log error
      const response = await this.handleNativeModuleError(
        moduleName, 
        methodName, 
        error, 
        { params }
      );
      
      return {
        success: false,
        error: response.error,
        fallback: response.fallback,
        security_level: response.security_level,
        recommendation: response.recommendation,
        module: moduleName,
        method: methodName
      };
    }
  }

  /**
   * Get comprehensive error report
   */
  getErrorReport() {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    
    const recentErrors = this.errorLog.filter(e => e.timestamp > last24h);
    const criticalErrors = this.criticalErrors.filter(e => e.timestamp > last24h);
    
    // Group errors by module
    const errorsByModule = {};
    recentErrors.forEach(error => {
      if (!errorsByModule[error.module]) {
        errorsByModule[error.module] = [];
      }
      errorsByModule[error.module].push(error);
    });

    return {
      summary: {
        totalErrors: recentErrors.length,
        criticalErrors: criticalErrors.length,
        affectedModules: Object.keys(errorsByModule).length,
        timestamp: now
      },
      errorsByModule,
      criticalErrors,
      recommendations: this.generateRecommendations(recentErrors)
    };
  }

  /**
   * Generate recommendations based on error patterns
   */
  generateRecommendations(errors) {
    const recommendations = [];
    
    // Check for missing native modules
    const missingModules = errors.filter(e => 
      e.error.includes('module not available') || e.error.includes('not found')
    );
    
    if (missingModules.length > 0) {
      recommendations.push({
        type: 'MISSING_MODULES',
        message: 'Some native modules are not available. Ensure proper installation and linking.',
        priority: 'HIGH'
      });
    }

    // Check for permission errors
    const permissionErrors = errors.filter(e => 
      e.error.includes('permission') || e.error.includes('access denied')
    );
    
    if (permissionErrors.length > 0) {
      recommendations.push({
        type: 'PERMISSIONS',
        message: 'Grant necessary hardware permissions in device settings.',
        priority: 'HIGH'
      });
    }

    // Check for hardware limitations
    const hardwareErrors = errors.filter(e => 
      e.error.includes('not available') || e.error.includes('not supported')
    );
    
    if (hardwareErrors.length > 0) {
      recommendations.push({
        type: 'HARDWARE',
        message: 'Consider upgrading to a device with better hardware security support.',
        priority: 'MEDIUM'
      });
    }

    return recommendations;
  }

  /**
   * Show detailed error information
   */
  showErrorDetails(errorInfo) {
    const details = `
Module: ${errorInfo.module}
Method: ${errorInfo.method}
Error: ${errorInfo.error}
Time: ${new Date(errorInfo.timestamp).toLocaleString()}
Platform: ${errorInfo.platform}

Stack:
${errorInfo.stack || 'No stack trace available'}
    `.trim();

    Alert.alert(
      'Error Details',
      details,
      [{ text: 'OK' }]
    );
  }

  /**
   * Log error to internal log
   */
  logError(errorInfo) {
    this.errorLog.push(errorInfo);
    
    // Maintain log size
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }
    
    // Console logging with proper formatting
    console.error(`🚨 [${errorInfo.module}] ${errorInfo.method}:`, errorInfo.error);
  }

  /**
   * Log successful operations
   */
  logSuccess(moduleName, methodName, params) {
    console.log(`✅ [${moduleName}] ${methodName} completed successfully`);
  }

  /**
   * Log security incidents
   */
  logSecurityIncident(errorInfo) {
    const incident = {
      ...errorInfo,
      severity: 'CRITICAL',
      category: 'SECURITY_MODULE_FAILURE',
      impact: 'Security features may be compromised'
    };
    
    // In production, this would send to security monitoring service
    console.error('🔒 SECURITY INCIDENT:', incident);
  }

  /**
   * Handle general errors
   */
  handleError(error, context) {
    const errorInfo = {
      error: error.message || String(error),
      stack: error.stack,
      context,
      timestamp: Date.now()
    };
    
    this.logError(errorInfo);
  }

  /**
   * Get current security status
   */
  getSecurityStatus() {
    const critical = this.criticalErrors.length;
    const total = this.errorLog.length;
    
    let status = 'EXCELLENT';
    let level = 100;
    
    if (critical > 0) {
      status = 'COMPROMISED';
      level = Math.max(0, 100 - (critical * 30));
    } else if (total > 10) {
      status = 'DEGRADED';
      level = Math.max(50, 100 - (total * 2));
    } else if (total > 5) {
      status = 'GOOD';
      level = Math.max(80, 100 - (total * 3));
    }
    
    return {
      status,
      level,
      criticalErrors: critical,
      totalErrors: total,
      timestamp: Date.now()
    };
  }

  /**
   * Clear error logs
   */
  clearLogs() {
    this.errorLog = [];
    this.criticalErrors = [];
    console.log('🧹 Error logs cleared');
  }
}

export default new GlobalErrorHandler();