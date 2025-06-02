#!/bin/bash

# GitLab Setup Script for GhostBridge
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔧 GitLab Repository Setup for GhostBridge${NC}"
echo "============================================="

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git not found. Please install git first.${NC}"
    exit 1
fi

# Initialize git if not already done
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}📝 Initializing Git repository...${NC}"
    git init
    echo -e "${GREEN}✅ Git repository initialized${NC}"
fi

# Create .gitignore if not exists
if [ ! -f ".gitignore" ]; then
    echo -e "${YELLOW}📝 Creating .gitignore...${NC}"
    cat > .gitignore << 'EOF'
# React Native
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Android
android/app/build/
android/build/
android/.gradle/
android/local.properties
*.jks
*.keystore

# iOS
ios/build/
ios/Pods/
ios/*.xcworkspace/xcuserdata/

# Environment
.env
.env.local
.env.production
.env.staging

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# APK outputs
*.apk
*.aab
*.sha256
*.md5
release-*/

# Firebase
google-services.json
GoogleService-Info.plist

# Temporary files
tmp/
temp/
EOF
    echo -e "${GREEN}✅ .gitignore created${NC}"
fi

# Get repository URL
echo -e "${YELLOW}🌐 Enter your GitLab repository URL:${NC}"
echo "Example: https://gitlab.com/username/ghostbridge-real.git"
read -p "Repository URL: " REPO_URL

if [ -z "$REPO_URL" ]; then
    echo -e "${RED}❌ Repository URL cannot be empty${NC}"
    exit 1
fi

# Add remote origin
echo -e "${YELLOW}🔗 Adding GitLab remote...${NC}"
if git remote get-url origin &> /dev/null; then
    git remote set-url origin "$REPO_URL"
    echo -e "${GREEN}✅ Remote origin updated${NC}"
else
    git remote add origin "$REPO_URL"
    echo -e "${GREEN}✅ Remote origin added${NC}"
fi

# Get GitLab credentials
echo -e "${YELLOW}🔑 GitLab Configuration:${NC}"
read -p "GitLab Username: " GITLAB_USERNAME
read -s -p "GitLab Token (Personal Access Token): " GITLAB_TOKEN
echo ""

if [ -z "$GITLAB_USERNAME" ] || [ -z "$GITLAB_TOKEN" ]; then
    echo -e "${RED}❌ GitLab credentials cannot be empty${NC}"
    exit 1
fi

# Setup GitLab CI/CD variables instructions
echo -e "${YELLOW}📋 GitLab CI/CD Variables Setup:${NC}"
echo "Please add these variables in your GitLab project settings:"
echo "Go to: Settings > CI/CD > Variables"
echo ""
echo -e "${BLUE}Required Variables:${NC}"
echo "GHOSTBRIDGE_STORE_PASSWORD (protected, masked)"
echo "GHOSTBRIDGE_KEY_PASSWORD (protected, masked)"
echo "GITLAB_TOKEN (protected, masked)"
echo ""
echo -e "${BLUE}Optional Variables:${NC}"
echo "FIREBASE_PROJECT_ID"
echo "FIREBASE_CLIENT_EMAIL"
echo "FIREBASE_PRIVATE_KEY (protected)"
echo ""

# Create environment template
echo -e "${YELLOW}📝 Creating environment template...${NC}"
cat > .env.example << 'EOF'
# GhostBridge Environment Variables
# Copy to .env and fill with real values

# Build Configuration
GHOSTBRIDGE_STORE_PASSWORD=your-keystore-password
GHOSTBRIDGE_KEY_PASSWORD=your-key-password

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="your-private-key"

# GitLab Configuration
GITLAB_TOKEN=your-gitlab-token
CI_PROJECT_ID=your-project-id
CI_API_V4_URL=https://gitlab.com/api/v4
EOF

# Add files to git
echo -e "${YELLOW}📝 Adding files to Git...${NC}"
git add .
echo -e "${GREEN}✅ Files staged${NC}"

# Initial commit
echo -e "${YELLOW}💾 Creating initial commit...${NC}"
if git diff --cached --quiet; then
    echo -e "${YELLOW}ℹ️  No changes to commit${NC}"
else
    git commit -m "Initial commit: GhostBridge-Real mobile security app

Features:
- Military-grade encryption (AES-256 + X25519)
- Perfect Forward Secrecy
- Anti-forensics & intrusion detection
- Hardware-backed security
- Advanced steganography
- GitLab CI/CD pipeline"
    echo -e "${GREEN}✅ Initial commit created${NC}"
fi

# Setup branch protection
echo -e "${YELLOW}🌿 Setting up branches...${NC}"
git branch -M main

# Push to GitLab
echo -e "${YELLOW}🚀 Pushing to GitLab...${NC}"
echo "This will require your GitLab credentials..."

if git push -u origin main; then
    echo -e "${GREEN}✅ Code pushed to GitLab successfully!${NC}"
else
    echo -e "${RED}❌ Failed to push to GitLab${NC}"
    echo "Please check your credentials and repository URL"
    exit 1
fi

# Create README for GitLab
if [ ! -f "README.md" ] || [ ! -s "README.md" ]; then
    echo -e "${YELLOW}📖 Creating README.md...${NC}"
    cat > README.md << 'EOF'
# GhostBridge-Real 🔒

**Military-Grade Secure Messaging Mobile App**

[![pipeline status](https://gitlab.com/username/ghostbridge-real/badges/main/pipeline.svg)](https://gitlab.com/username/ghostbridge-real/-/commits/main)
[![Latest Release](https://gitlab.com/username/ghostbridge-real/-/badges/release.svg)](https://gitlab.com/username/ghostbridge-real/-/releases)

## 🛡️ Security Features

- **Military-Grade Encryption**: AES-256 + X25519 ECDH
- **Perfect Forward Secrecy**: Ephemeral key generation
- **Anti-Forensics**: DoD 5220.22-M memory wiping
- **Hardware Security**: Android Keystore integration
- **Intrusion Detection**: Real-time threat monitoring
- **Advanced Steganography**: F5 algorithm with DCT
- **Onion Routing**: Multi-hop anonymity

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Android SDK 35
- Java 11+

### Installation
```bash
git clone https://gitlab.com/username/ghostbridge-real.git
cd ghostbridge-real
npm install
```

### Build APK
```bash
# Set environment variables
export GHOSTBRIDGE_STORE_PASSWORD="your-password"
export GHOSTBRIDGE_KEY_PASSWORD="your-password"

# Build release APK
./build-and-deploy.sh
```

## 📱 Download

Latest APK releases are available in the [GitLab Package Registry](https://gitlab.com/username/ghostbridge-real/-/packages).

## 🔐 Security Verification

Always verify APK integrity using provided checksums:
```bash
sha256sum ghostbridge-release.apk
```

## 🏗️ CI/CD Pipeline

Automated builds with GitLab CI:
- ✅ Lint & Security Scan
- ✅ Unit Tests
- ✅ APK Build
- ✅ Package Registry Deploy
- ✅ Release Management

## 📊 Architecture

```
┌─────────────────┐    ┌──────────────────┐
│   Mobile App    │    │   Backend API    │
│  (React Native) │◄──►│   (Express.js)   │
│                 │    │                  │
│ • Crypto Stack  │    │ • Zero-Knowledge │
│ • UI/UX Layer   │    │ • Rate Limiting  │
│ • Native Mods   │    │ • Steganography  │
└─────────────────┘    └──────────────────┘
```

## 🛠️ Development

### Local Development
```bash
npm start          # Start Metro bundler
npm run android    # Run on Android
npm run ios        # Run on iOS
npm run lint       # Run linting
npm test           # Run tests
```

### Configuration
1. Copy `.env.example` to `.env`
2. Configure Firebase project
3. Set up signing credentials
4. Update GitLab CI/CD variables

## 📄 License

This project is licensed under a proprietary license. Unauthorized distribution is prohibited.

## ⚠️ Security Notice

This is a security-focused application. Report vulnerabilities responsibly.

---
**Built with 🔒 for maximum security**
EOF
    
    git add README.md
    git commit -m "docs: Add comprehensive README with security features"
    git push origin main
    echo -e "${GREEN}✅ README.md created and pushed${NC}"
fi

# Final instructions
echo ""
echo -e "${GREEN}🎉 GitLab Setup Complete!${NC}"
echo "================================"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Go to your GitLab project: $REPO_URL"
echo "2. Set up CI/CD variables in Settings > CI/CD > Variables"
echo "3. Configure Firebase (google-services.json)"
echo "4. Commit changes to trigger first pipeline"
echo ""
echo -e "${BLUE}🔧 CI/CD Variables to Add:${NC}"
echo "• GHOSTBRIDGE_STORE_PASSWORD"
echo "• GHOSTBRIDGE_KEY_PASSWORD"
echo "• GITLAB_TOKEN"
echo ""
echo -e "${BLUE}🚀 To build APK:${NC}"
echo "./build-and-deploy.sh"
echo ""
echo -e "${GREEN}✨ Repository ready for development!${NC}"