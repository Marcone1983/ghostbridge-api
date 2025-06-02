#!/bin/bash

echo "🚀 Building Ghost Bridge APK..."
echo "================================"

cd android

# Build debug APK
echo "🔨 Building debug APK..."
./gradlew assembleDebug

# Check if build succeeded
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ BUILD SUCCESSFUL!"
    echo "================================"
    echo "📱 APK Location:"
    echo "app/build/outputs/apk/debug/app-debug.apk"
    echo ""
    echo "📥 To install on device:"
    echo "adb install app/build/outputs/apk/debug/app-debug.apk"
    echo ""
    
    # Show APK size
    APK_SIZE=$(ls -lh app/build/outputs/apk/debug/app-debug.apk | awk '{print $5}')
    echo "📦 APK Size: $APK_SIZE"
else
    echo ""
    echo "❌ BUILD FAILED!"
    echo "Check error messages above"
fi