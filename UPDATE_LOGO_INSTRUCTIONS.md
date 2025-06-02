# 🖼️ AGGIORNA LOGO APK - ISTRUZIONI

## Logo attualmente configurato:
**URL:** `https://i.imgur.com/Cn5l3uH.png`

## Per aggiornare le icone APK con il tuo logo:

### 1. Scarica il logo da Imgur
```bash
wget https://i.imgur.com/Cn5l3uH.png -O ghost_logo.png
```

### 2. Ridimensiona nelle varie risoluzioni Android:
```bash
# 48x48 (mdpi)
convert ghost_logo.png -resize 48x48 android/app/src/main/res/mipmap-mdpi/ic_launcher.png

# 72x72 (hdpi)  
convert ghost_logo.png -resize 72x72 android/app/src/main/res/mipmap-hdpi/ic_launcher.png

# 96x96 (xhdpi)
convert ghost_logo.png -resize 96x96 android/app/src/main/res/mipmap-xhdpi/ic_launcher.png

# 144x144 (xxhdpi)
convert ghost_logo.png -resize 144x144 android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png

# 192x192 (xxxhdpi)
convert ghost_logo.png -resize 192x192 android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
```

### 3. Crea anche le versioni round:
```bash
# Copia le stesse immagini per ic_launcher_round.png
cp android/app/src/main/res/mipmap-mdpi/ic_launcher.png android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png
cp android/app/src/main/res/mipmap-hdpi/ic_launcher.png android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png
cp android/app/src/main/res/mipmap-xhdpi/ic_launcher.png android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png
cp android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png
cp android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png
```

## ✅ Modifiche già fatte:
- 🏠 **Logo in home**: rimosso testo "GhostBridge", ora solo il tuo logo centrato (120x120px)
- 📱 **Dimensioni ottimizzate**: perfetto per mobile con `alignSelf: 'center'`

## 🔄 Per applicare:
1. Esegui i comandi sopra per scaricare e ridimensionare il logo
2. Fai build APK - il tuo logo apparirà come icona dell'app