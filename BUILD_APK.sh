#!/usr/bin/env bash
echo "Install dependencies"
npm install
echo "Usare variabili d'ambiente BITRISE_IO_ANDROID_KEYSTORE_FILE e BITRISE_IO_KEYSTORE_PASSWORD per la firma"

cd android || exit
echo "Costruzione APK release"
./gradlew assembleRelease

echo "Allineamento APK"
cp app/build/outputs/apk/release/app-release.apk ../GhostBridge-Real.apk
zipalign -v -p 4 ../GhostBridge-Real.apk GhostBridge-Real-aligned.apk
apksigner sign --ks "$BITRISE_IO_ANDROID_KEYSTORE_FILE" --ks-key-alias ghostbridge \
  --ks-pass env.BITRISE_IO_KEYSTORE_PASSWORD GhostBridge-Real-aligned.apk

echo "APK firmato e allineato: GhostBridge-Real-aligned.apk"