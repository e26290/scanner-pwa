<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Settings, Zap, ZapOff, Image as ImageIcon, Folder, ChevronDown, Wand2, RefreshCw, Hand, Check, Camera } from 'lucide-vue-next'
import { useScanStore } from '../stores/useScanStore'

const router = useRouter()
const store = useScanStore()

const videoRef = ref(null)
const canvasRef = ref(null)
const stream = ref(null)
const isCameraReady = ref(false)
const flashMode = ref('off') 

// Feature Toggles (UI Only)
const isMagicColor = ref(false)
const isStraighten = ref(false)
const isFingerRemoval = ref(false)

// Folder Dropdown Logic
const isFolderDropdownOpen = ref(false)

const toggleFolderDropdown = () => {
  isFolderDropdownOpen.value = !isFolderDropdownOpen.value
}

const selectFolder = (id) => {
  store.switchFolder(id)
  isFolderDropdownOpen.value = false
}

const createNewFolder = () => {
  const name = prompt('請輸入資料夾名稱')
  if (name) {
    store.createFolder(name)
    isFolderDropdownOpen.value = false
  }
}

// Errors
const cameraError = ref(null)

// Camera logic
const startCamera = async () => {
  cameraError.value = null
  try {
    const constraints = {
      video: {
        facingMode: 'environment', // Back camera
        width: { ideal: 4096 },
        height: { ideal: 2160 }
      },
      audio: false
    }
    
    stream.value = await navigator.mediaDevices.getUserMedia(constraints)
    if (videoRef.value) {
      videoRef.value.srcObject = stream.value
      videoRef.value.onloadedmetadata = () => {
        isCameraReady.value = true
        videoRef.value.play()
      }
    }
  } catch (err) {
    console.error("Error accessing camera:", err)
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        cameraError.value = 'permission'
    } else {
        cameraError.value = 'generic'
    }
  }
}

const stopCamera = () => {
  if (stream.value) {
    stream.value.getTracks().forEach(track => track.stop())
    stream.value = null
    isCameraReady.value = false
  }
}

const triggerShutter = () => {
  if (!videoRef.value || !canvasRef.value) return
  
  const video = videoRef.value
  const canvas = canvasRef.value
  const context = canvas.getContext('2d')

  // Flash UI effect
  const flash = document.querySelector('.flash-overlay')
  if(flash) {
      flash.classList.add('active')
      setTimeout(() => flash.classList.remove('active'), 100)
  }

  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  context.drawImage(video, 0, 0, canvas.width, canvas.height)
  
  const imageUrl = canvas.toDataURL('image/jpeg', 0.9)
  
  const newScan = {
    id: Date.now(),
    url: imageUrl,
    date: new Date().toISOString(),
    width: canvas.width,
    height: canvas.height,
    settings: {
        color: isMagicColor.value,
        autoCrop: isStraighten.value
    }
  }
  
  store.addScan(newScan)
  if (navigator.vibrate) navigator.vibrate(50)
}

// Navigation
const goToEditor = () => {
  // Go to edit NEWEST photo (index 0)
  const scansInFolder = store.getScansByFolder(store.currentFolderId)
  if (scansInFolder.length > 0) {
    const newestScan = scansInFolder[0]
    router.push(`/edit/${newestScan.id}`)
  }
}

const goToFolders = () => {
  router.push('/folders') 
}

onMounted(() => {
  startCamera()
})

onUnmounted(() => {
  stopCamera()
})

const currentFolderName = computed(() => store.currentFolder?.name || '資料夾')
const currentFolderCount = computed(() => store.getScansByFolder(store.currentFolderId).length)
</script>

<template>
  <div class="camera-container">
    <canvas ref="canvasRef" class="hidden-canvas"></canvas>
    
    <!-- Viewport -->
    <div class="viewport">
        <video ref="videoRef" class="camera-feed" playsinline autoplay muted></video>
        
        <!-- Flash Animation -->
        <div class="flash-overlay"></div>

        <!-- Error Overlay -->
        <div v-if="cameraError" class="error-overlay">
            <div class="error-card">
                 <Camera :size="48" class="text-error mb-4" />
                 <h3 v-if="cameraError === 'permission'">無法存取相機</h3>
                 <h3 v-else>相機發生錯誤</h3>
                 
                 <p v-if="cameraError === 'permission'" class="error-msg">
                    瀏覽器拒絕了相機存取權限。
                    <br><br>
                    <strong>解決方法：</strong><br>
                    請至手機「設定」開啟瀏覽器的相機權限，或檢查網址是否為 HTTPS (192.168.x.x)。
                 </p>
                 <button class="retry-btn" @click="startCamera">重試</button>
            </div>
        </div>
    </div>

    <!-- Top Bar: Folder Switcher -->
    <div class="top-bar">
      <div class="folder-switcher" @click="toggleFolderDropdown">
        <span class="folder-name">{{ currentFolderName }}</span>
        <ChevronDown :size="16" />
      </div>
      
      <!-- Simple Dropdown -->
      <div v-if="isFolderDropdownOpen" class="folder-dropdown" @click.stop>
        <div 
          v-for="folder in store.folders" 
          :key="folder.id" 
          class="folder-item"
          :class="{ active: folder.id === store.currentFolderId }"
          @click="selectFolder(folder.id)"
        >
          {{ folder.name }}
          <Check v-if="folder.id === store.currentFolderId" :size="14" />
        </div>
        <div class="folder-item new" @click="createNewFolder">
          + 新增資料夾
        </div>
      </div>
    </div>

    <!-- Bottom Interface -->
    <div class="bottom-interface">
      
      <!-- Feature Toggles (Above Shutter) -->
      <div class="feature-toggles">
        <button class="toggle-btn" :class="{ active: isMagicColor }" @click="isMagicColor = !isMagicColor">
          <Wand2 :size="20" />
        </button>
        <button class="toggle-btn" :class="{ active: isStraighten }" @click="isStraighten = !isStraighten">
          <RefreshCw :size="20" />
        </button>
        <button class="toggle-btn" :class="{ active: isFingerRemoval }" @click="isFingerRemoval = !isFingerRemoval">
          <Hand :size="20" />
        </button>
      </div>

      <!-- Main Control Bar -->
      <div class="control-bar">
        <!-- Left: Edit / Gallery Thumbnail (NEWEST) -->
        <button class="action-btn" @click="goToEditor">
          <div v-if="currentFolderCount > 0" class="thumb-wrapper">
             <img :src="store.getScansByFolder(store.currentFolderId)[0].url" class="mini-thumb-img" />
             <span class="count-badge">{{ currentFolderCount }}</span>
          </div>
          <div v-else class="placeholder-icon">
            <ImageIcon :size="28" />
          </div>
        </button>

        <!-- Center: Shutter (Fixed) -->
        <button class="shutter-btn" @click="triggerShutter">
          <div class="shutter-inner"></div>
        </button>

        <!-- Right: Folder List -->
        <button class="action-btn" @click="goToFolders">
          <Folder :size="28" />
          <span class="btn-label">文件庫</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.camera-container {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #000;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.viewport {
    flex: 1;
    position: relative;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
}

.hidden-canvas { display: none; }
.camera-feed {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.flash-overlay {
    position: absolute;
    inset: 0;
    background: white;
    opacity: 0;
    pointer-events: none;
    z-index: 20;
    transition: opacity 0.1s;
}
.flash-overlay.active {
    opacity: 0.8;
}

/* Top Bar */
.top-bar {
  position: absolute;
  top: env(safe-area-inset-top, 20px);
  left: 0;
  right: 0;
  height: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.folder-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  padding: 8px 16px;
  border-radius: 20px;
  color: #fff;
  font-weight: 500;
  border: 1px solid rgba(255,255,255,0.2);
  cursor: pointer;
  position: relative; /* Anchor for dropdown */
}

/* Dropdown Styles */
.folder-dropdown {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 8px;
  background: #333;
  border-radius: 12px;
  width: 200px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  z-index: 20;
}

.folder-item {
  padding: 12px 16px;
  font-size: 14px;
  color: #fff;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.folder-item:active {
  background: rgba(255,255,255,0.1);
}

.folder-item.active {
  color: var(--accent-color, #ffd700);
}

.folder-item.new {
  color: var(--accent-color, #ffd700);
  justify-content: center;
  font-weight: 500;
}

/* Bottom Interface Wrapper */
.bottom-interface {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding-bottom: env(safe-area-inset-bottom, 20px);
  background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.feature-toggles {
  display: flex;
  justify-content: center;
  gap: 24px;
}

.toggle-btn {
  background: rgba(255,255,255,0.1);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  transition: all 0.2s;
}

.toggle-btn.active {
  background: var(--accent-color, #ffd700);
  color: #000;
  border-color: var(--accent-color, #ffd700);
  box-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
}

.control-bar {
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 100px;
  padding: 0 20px;
}

/* Shutter - Fixed Layout */
.shutter-btn {
  width: 72px;
  height: 72px;
  min-width: 72px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: 4px solid #fff;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0; 
  box-sizing: border-box; 
  cursor: pointer;
}

.shutter-btn:active {
  transform: scale(0.95);
}

.shutter-inner {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: #fff;
  pointer-events: none; 
}

/* Side Actions */
.action-btn {
  background: none;
  border: none;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  gap: 4px;
}

.btn-label {
  font-size: 12px;
  opacity: 0.8;
  white-space: nowrap;
}

/* Thumbnails */
.thumb-wrapper {
  position: relative;
  width: 44px;
  height: 44px;
}

.mini-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
  border: 2px solid rgba(255,255,255,0.8);
  display: block;
}

.count-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #ff3b30;
  color: #fff;
  font-size: 10px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  z-index: 2;
}


/* Error UI */
.error-overlay {
    position: absolute;
    inset: 0;
    background: #111;
    z-index: 50;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 24px;
}

.error-card {
    text-align: center;
    max-width: 300px;
}

.text-error { color: #ff3b30; margin: 0 auto; }

.error-msg {
    margin-top: 12px;
    font-size: 14px;
    color: #ccc;
    line-height: 1.5;
    text-align: left;
    background: #222;
    padding: 16px;
    border-radius: 8px;
}

.retry-btn {
    margin-top: 24px;
    background: var(--accent-color);
    color: #000;
    border: none;
    padding: 10px 32px;
    border-radius: 24px;
    font-weight: 600;
    font-size: 16px;
}
</style>
