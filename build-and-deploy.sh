#!/bin/bash

# GhostBridge Build and Deploy Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="GhostBridge-Real"
APK_NAME="ghostbridge-$(date +%Y%m%d-%H%M%S)"
BUILD_TYPE="release"  # or "debug"

echo -e "${BLUE}🚀 Starting GhostBridge Build and Deploy Process${NC}"
echo "=================================================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command_exists node; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm not found. Please install npm${NC}"
    exit 1
fi

if [ ! -d "android" ]; then
    echo -e "${RED}❌ Android directory not found. Run from project root${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm ci
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Run linting
echo -e "${YELLOW}🔍 Running linting...${NC}"
if npm run lint; then
    echo -e "${GREEN}✅ Linting passed${NC}"
else
    echo -e "${YELLOW}⚠️  Linting warnings found (continuing)${NC}"
fi

# Check for required environment variables
echo -e "${YELLOW}🔐 Checking signing configuration...${NC}"

if [ "$BUILD_TYPE" = "release" ]; then
    if [ -z "$GHOSTBRIDGE_STORE_PASSWORD" ] || [ -z "$GHOSTBRIDGE_KEY_PASSWORD" ]; then
        echo -e "${RED}❌ Production signing credentials not set${NC}"
        echo "Please set environment variables:"
        echo "  export GHOSTBRIDGE_STORE_PASSWORD='your-store-password'"
        echo "  export GHOSTBRIDGE_KEY_PASSWORD='your-key-password'"
        exit 1
    fi
    echo -e "${GREEN}✅ Production signing credentials configured${NC}"
else
    echo -e "${YELLOW}⚠️  Building debug version (no signing required)${NC}"
fi

# Check Firebase configuration
if [ ! -f "android/app/google-services.json" ]; then
    echo -e "${YELLOW}⚠️  Firebase configuration not found${NC}"
    echo "Creating from template..."
    if [ -f "android/app/google-services.json.template" ]; then
        cp android/app/google-services.json.template android/app/google-services.json
        echo -e "${YELLOW}📝 Please edit android/app/google-services.json with real Firebase config${NC}"
    else
        echo -e "${RED}❌ Firebase template not found${NC}"
        exit 1
    fi
fi

# Build the APK
echo -e "${YELLOW}🏗️  Building APK...${NC}"
cd android

if [ "$BUILD_TYPE" = "release" ]; then
    echo "Building release APK..."
    ./gradlew assembleRelease --no-daemon
    APK_PATH="app/build/outputs/apk/release/app-release.apk"
    FINAL_APK="../${APK_NAME}-release.apk"
else
    echo "Building debug APK..."
    ./gradlew assembleDebug --no-daemon
    APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
    FINAL_APK="../${APK_NAME}-debug.apk"
fi

# Check if APK was built successfully
if [ -f "$APK_PATH" ]; then
    echo -e "${GREEN}✅ APK built successfully${NC}"
    
    # Copy APK to project root with timestamp
    cp "$APK_PATH" "$FINAL_APK"
    
    # Generate checksums
    cd ..
    sha256sum "${FINAL_APK}" > "${FINAL_APK}.sha256"
    md5sum "${FINAL_APK}" > "${FINAL_APK}.md5"
    
    # Get APK info
    APK_SIZE=$(du -h "${FINAL_APK}" | cut -f1)
    echo -e "${GREEN}📱 APK created: ${FINAL_APK} (${APK_SIZE})${NC}"
    
    # Display checksums
    echo -e "${BLUE}🔒 Checksums:${NC}"
    echo "SHA256: $(cat ${FINAL_APK}.sha256 | cut -d' ' -f1)"
    echo "MD5:    $(cat ${FINAL_APK}.md5 | cut -d' ' -f1)"
    
else
    echo -e "${RED}❌ APK build failed${NC}"
    exit 1
fi

# GitLab deployment (if configured)
if [ -n "$GITLAB_TOKEN" ] && [ -n "$CI_PROJECT_ID" ]; then
    echo -e "${YELLOW}🚀 Deploying to GitLab...${NC}"
    
    # Upload to GitLab Package Registry
    PACKAGE_URL="${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/packages/generic/ghostbridge/$(date +%Y%m%d-%H%M%S)/${APK_NAME}-${BUILD_TYPE}.apk"
    
    if curl --fail --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
            --upload-file "${FINAL_APK}" \
            "$PACKAGE_URL"; then
        echo -e "${GREEN}✅ APK uploaded to GitLab Package Registry${NC}"
        echo "Download URL: $PACKAGE_URL"
    else
        echo -e "${RED}❌ Failed to upload to GitLab${NC}"
    fi
else
    echo -e "${YELLOW}ℹ️  GitLab deployment skipped (credentials not configured)${NC}"
    echo "To enable GitLab deployment, set:"
    echo "  export GITLAB_TOKEN='your-gitlab-token'"
    echo "  export CI_PROJECT_ID='your-project-id'"
    echo "  export CI_API_V4_URL='https://gitlab.com/api/v4'"
fi

# Create release package
echo -e "${YELLOW}📦 Creating release package...${NC}"
RELEASE_DIR="release-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RELEASE_DIR"

# Copy files to release directory
cp "${FINAL_APK}" "$RELEASE_DIR/"
cp "${FINAL_APK}.sha256" "$RELEASE_DIR/"
cp "${FINAL_APK}.md5" "$RELEASE_DIR/"

# Create release notes
cat > "$RELEASE_DIR/RELEASE_NOTES.md" << EOF
# GhostBridge Release $(date +%Y-%m-%d)

## Build Information
- **Build Type**: $BUILD_TYPE
- **APK Name**: $(basename $FINAL_APK)
- **Build Date**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
- **APK Size**: $APK_SIZE

## Security Features
- ✅ Military-grade encryption (AES-256 + X25519)
- ✅ Perfect Forward Secrecy with ephemeral keys
- ✅ Anti-forensics & memory protection
- ✅ Hardware-backed security (Android Keystore)
- ✅ Intrusion detection system
- ✅ Advanced steganography
- ✅ Onion routing protocol

## Checksums
\`\`\`
SHA256: $(cat ${FINAL_APK}.sha256 | cut -d' ' -f1)
MD5:    $(cat ${FINAL_APK}.md5 | cut -d' ' -f1)
\`\`\`

## Installation
1. Enable "Unknown Sources" in Android settings
2. Download and install the APK
3. Grant required permissions for security features

## Security Verification
Verify APK integrity using the provided checksums before installation.
EOF

echo -e "${GREEN}✅ Release package created: $RELEASE_DIR${NC}"

# Final summary
echo ""
echo -e "${GREEN}🎉 Build and Deploy Complete!${NC}"
echo "=================================================="
echo -e "📱 APK: ${FINAL_APK}"
echo -e "📦 Release Package: ${RELEASE_DIR}/"
echo -e "🔒 Checksums available"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Test the APK on a device"
echo "2. Verify checksums"
echo "3. Deploy to app store or distribute directly"
echo ""

# Cleanup
echo -e "${YELLOW}🧹 Cleaning up build files...${NC}"
cd android
./gradlew clean --no-daemon || true
cd ..

echo -e "${GREEN}✨ All done!${NC}"