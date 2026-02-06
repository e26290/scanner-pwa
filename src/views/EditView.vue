<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Check, Trash2, Crop, RotateCw, X, Share2, FileText, Image as ImageIcon } from 'lucide-vue-next'
import { useScanStore } from '../stores/useScanStore'
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import { jsPDF } from 'jspdf'

const route = useRoute()
const router = useRouter()
const store = useScanStore()

const canvasRef = ref(null)
const cropperRef = ref(null)
const currentImage = ref(null)
const scanItem = ref(null)
const isProcessing = ref(false)

// State
const activeFilter = ref('original') 
const rotation = ref(0) 

// Crop State
const isCropping = ref(false)
const cropImageSrc = ref(null)

// Share State
const isShareMenuOpen = ref(false)

const filters = [
  { id: 'original', name: '原圖' },
  { id: 'magic', name: 'Magic' },
  { id: 'bw', name: '黑白' },
  { id: 'grayscale', name: '灰階' },
]

onMounted(async () => {
  // Wait for store to load if refreshing directly
  if (!store.isLoaded) {
     const unwatch = store.$subscribe((mutation, state) => {
        if (store.isLoaded) {
            loadScan()
            unwatch()
        }
     })
      // Double check mechanism
     setTimeout(() => { if(store.isLoaded) loadScan() }, 500)
  } else {
     loadScan()
  }
})

const loadScan = async () => {
    const id = route.params.id
    scanItem.value = store.scans.find(s => s.id == id)
  
    if (!scanItem.value) {
        alert("找不到圖片或載入中...")
        router.back()
        return
    }

    await loadImage(scanItem.value.url)
    renderImage()
}

const loadImage = (src) => {
  return new Promise((resolve) => {
    const img = new Image()
    img.src = src
    img.crossOrigin = "anonymous"
    img.onload = () => {
      currentImage.value = img
      resolve()
    }
  })
}

const rotateImage = () => {
  if (isCropping.value) return 
  rotation.value = (rotation.value + 90) % 360
  renderImage()
}

const applyFilter = (filterId) => {
  activeFilter.value = filterId
  renderImage()
}

// Main Render Function
const renderImage = () => {
  if (!currentImage.value || !canvasRef.value) return
  isProcessing.value = true
  
  requestAnimationFrame(() => {
    const canvas = canvasRef.value
    const ctx = canvas.getContext('2d')
    const img = currentImage.value
    
    // Calculate new dimensions based on rotation
    const isVertical = rotation.value === 90 || rotation.value === 270
    const newWidth = isVertical ? img.height : img.width
    const newHeight = isVertical ? img.width : img.height
    
    canvas.width = newWidth
    canvas.height = newHeight
    
    // Clear and Save Context
    ctx.clearRect(0, 0, newWidth, newHeight)
    ctx.save()
    
    // Translate and Rotate Context
    ctx.translate(newWidth / 2, newHeight / 2)
    ctx.rotate((rotation.value * Math.PI) / 180)
    ctx.drawImage(img, -img.width / 2, -img.height / 2)
    
    ctx.restore()
    
    // Apply Filters (Pixel Manipulation)
    if (activeFilter.value !== 'original') {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          
          if (activeFilter.value === 'grayscale') {
            const avg = 0.299 * r + 0.587 * g + 0.114 * b
            data[i] = avg; data[i + 1] = avg; data[i + 2] = avg
          } 
          else if (activeFilter.value === 'bw') {
            const avg = 0.299 * r + 0.587 * g + 0.114 * b
            const val = avg > 128 ? 255 : 0
            data[i] = val; data[i + 1] = val; data[i + 2] = val
          }
          else if (activeFilter.value === 'magic') {
            const factor = 1.2
            const intercept = 128 * (1 - factor)
            let nr = r * factor + intercept
            let ng = g * factor + intercept
            let nb = b * factor + intercept
            
            if (nr > 200) nr = 255
            if (nr < 50) nr = 0
            
            data[i] = clamp(nr); data[i + 1] = clamp(ng); data[i + 2] = clamp(nb)
          }
        }
        ctx.putImageData(imageData, 0, 0)
    }
    
    isProcessing.value = false
  })
}

const clamp = (val) => Math.max(0, Math.min(255, val))

// Cropping Logic
const startCropping = () => {
    // Generate a temporary image of the current state WITHOUT filters, but WITH rotation
    const tempCanvas = document.createElement('canvas')
    const ctx = tempCanvas.getContext('2d')
    const img = currentImage.value
    
    const isVertical = rotation.value === 90 || rotation.value === 270
    const newWidth = isVertical ? img.height : img.width
    const newHeight = isVertical ? img.width : img.height
    
    tempCanvas.width = newWidth
    tempCanvas.height = newHeight
    
    ctx.translate(newWidth / 2, newHeight / 2)
    ctx.rotate((rotation.value * Math.PI) / 180)
    ctx.drawImage(img, -img.width / 2, -img.height / 2)
    
    cropImageSrc.value = tempCanvas.toDataURL('image/jpeg', 1.0)
    isCropping.value = true
}

const confirmCrop = () => {
    const { canvas } = cropperRef.value.getResult()
    if (canvas) {
        // Update source image with cropped result
        const newSrc = canvas.toDataURL('image/jpeg', 1.0)
        loadImage(newSrc).then(() => {
            // Reset rotation as it's baked into the crop
            rotation.value = 0 
            // Re-render with active filters
            renderImage()
        })
    }
    isCropping.value = false
}

const cancelCrop = () => {
    isCropping.value = false
    cropImageSrc.value = null
}

const deleteScan = async () => {
    if (confirm("確定刪除此圖片？")) {
        await store.deleteScan(scanItem.value.id)
        router.back()
    }
}

const saveAndExit = async () => {
    if (canvasRef.value && !isCropping.value) {
        const newUrl = canvasRef.value.toDataURL('image/jpeg', 0.9)
        const updatedScan = {
            ...scanItem.value,
            url: newUrl,
            // Could update width/height here if changed
        }
        await store.updateScan(updatedScan)
    }
    router.back()
}

// Share Logic
const openShareMenu = () => {
  isShareMenuOpen.value = true
}

const closeShareMenu = () => {
  isShareMenuOpen.value = false
}

const handleShare = async (type) => {
  closeShareMenu()
  
  if (!canvasRef.value) return
  
  const imageUrl = canvasRef.value.toDataURL('image/jpeg', 0.9)
  
  if (type === 'pdf') {
    try {
      const doc = new jsPDF()
      const imgProps = doc.getImageProperties(imageUrl)
      const pdfWidth = doc.internal.pageSize.getWidth()
      const pdfHeight = doc.internal.pageSize.getHeight()
      
      const ratio = Math.min(pdfWidth / imgProps.width, pdfHeight / imgProps.height)
      const width = imgProps.width * ratio
      const height = imgProps.height * ratio
      
      const x = (pdfWidth - width) / 2
      const y = (pdfHeight - height) / 2
      
      doc.addImage(imageUrl, 'JPEG', x, y, width, height)
      
      const pdfBlob = doc.output('blob')
      const file = new File([pdfBlob], `scan_${scanItem.value.id}.pdf`, { type: 'application/pdf' })
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: '掃描文件 (PDF)',
          text: '這是我剛掃描的文件'
        })
      } else {
        doc.save(`scan_${scanItem.value.id}.pdf`)
      }
    } catch (err) {
      console.error("PDF Generation Error:", err)
      alert("建立 PDF 失敗，請稍後再試。")
    }
  } else {
    // Share as Image
    try {
      const res = await fetch(imageUrl)
      const blob = await res.blob()
      const file = new File([blob], `scan_${scanItem.value.id}.jpg`, { type: 'image/jpeg' })
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: '掃描文件 (圖片)',
          text: '這是我剛掃描的文件'
        })
      } else {
        // Fallback: download
        const a = document.createElement('a')
        a.href = imageUrl
        a.download = `scan_${scanItem.value.id}.jpg`
        a.click()
      }
    } catch (err) {
      console.error("Share Error:", err)
      alert("分享發生錯誤")
    }
  }
}
</script>

<template>
  <div class="edit-container">
    <!-- Header -->
    <header class="header">
      <button class="icon-btn" @click="isCropping ? cancelCrop() : router.back()">
        <X v-if="isCropping" :size="24" />
        <ArrowLeft v-else :size="24" />
      </button>
      <div class="title">{{ isCropping ? '裁切影像' : '編輯影像' }}</div>
      
      <div class="header-actions">
        <button v-if="isCropping" class="icon-btn text-accent" @click="confirmCrop">
          <Check :size="24" />
        </button>
        <button v-else class="icon-btn text-accent" @click="saveAndExit">
          <Check :size="24" />
          <span class="save-text">完成</span>
        </button>
      </div>
    </header>

    <!-- Main Area -->
    <main class="editor-area">
      <!-- Cropper View -->
      <div v-if="isCropping" class="cropper-wrapper">
         <Cropper
            ref="cropperRef"
            class="cropper"
            :src="cropImageSrc"
            :stencil-props="{
                aspectRatio: 0 // Free aspect ratio
            }"
         />
      </div>

      <!-- Canvas Preview -->
      <div v-show="!isCropping" class="canvas-wrapper">
         <canvas ref="canvasRef"></canvas>
      </div>
      
      <div v-if="isProcessing" class="loading-overlay">處理中...</div>
    </main>

    <!-- Tools (Hidden when cropping) -->
    <footer v-show="!isCropping" class="tools-panel">
        <!-- Filter Selector -->
        <div class="filters-scroll">
            <div 
                v-for="filter in filters" 
                :key="filter.id" 
                class="filter-chip"
                :class="{ active: activeFilter === filter.id }"
                @click="applyFilter(filter.id)"
            >
                <div class="chip-preview" :class="filter.id"></div>
                <span>{{ filter.name }}</span>
            </div>
        </div>

        <!-- Main Actions -->
        <div class="main-actions">
            <!-- Share -->
            <button class="action-btn" @click="openShareMenu">
                <Share2 :size="24" />
                <span>分享</span>
            </button>
            <!-- Crop -->
            <button class="action-btn" @click="startCropping">
                <Crop :size="24" />
                <span>裁切</span>
            </button>
            <button class="action-btn" @click="rotateImage">
                <RotateCw :size="24" />
                <span>旋轉</span>
            </button>
             <button class="action-btn delete" @click="deleteScan">
                <Trash2 :size="24" />
                <span>刪除</span>
            </button>
        </div>
    </footer>

    <!-- Share Options Modal -->
    <div v-if="isShareMenuOpen" class="modal-overlay" @click="closeShareMenu">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>分享至...</h3>
          <button class="icon-btn" @click="closeShareMenu"><X :size="20" /></button>
        </div>
        <div class="share-options">
          <button class="share-option" @click="handleShare('pdf')">
            <div class="option-icon red"><FileText :size="24" /></div>
            <span>PDF 文件</span>
          </button>
          <button class="share-option" @click="handleShare('image')">
            <div class="option-icon blue"><ImageIcon :size="24" /></div>
            <span>JPG 影像</span>
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.edit-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #000;
  color: #fff;
}

.header {
  height: 56px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  background: #111;
  z-index: 10;
}

.title {
    font-size: 16px;
    font-weight: 500;
}

.text-accent {
    color: var(--accent-color, #ffd700);
    display: flex;
    align-items: center;
    gap: 4px;
}

.save-text {
    font-weight: 600;
    font-size: 14px;
}

.editor-area {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    position: relative;
    background: #222;
}

.canvas-wrapper {
    max-width: 100%;
    max-height: 100%;
    padding: 20px;
    display: flex;
}

.cropper-wrapper {
    width: 100%;
    height: 100%;
    background: #000;
}

.cropper {
    height: 100%;
    width: 100%;
}

canvas {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    transition: width 0.3s, height 0.3s;
}

.loading-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0,0,0,0.7);
    padding: 12px 24px;
    border-radius: 20px;
    font-size: 14px;
}

.tools-panel {
    background: #111;
    padding-bottom: env(safe-area-inset-bottom);
}

.filters-scroll {
    display: flex;
    gap: 16px;
    overflow-x: auto;
    padding: 16px;
    border-bottom: 1px solid #222;
}

.filter-chip {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    min-width: 60px;
    font-size: 12px;
    opacity: 0.6;
    transition: opacity 0.2s;
    cursor: pointer;
}

.filter-chip.active {
    opacity: 1;
    color: var(--accent-color, #ffd700);
}

.chip-preview {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #444;
    border: 2px solid transparent;
}

.filter-chip.active .chip-preview {
    border-color: var(--accent-color, #ffd700);
}

.chip-preview.original { background: linear-gradient(45deg, #f093fb 0%, #f5576c 100%); }
.chip-preview.magic { background: linear-gradient(45deg, #4facfe 0%, #00f2fe 100%); filter: contrast(1.5); }
.chip-preview.bw { background: #fff; border: 1px solid #444; background: linear-gradient(to right, #000 50%, #fff 50%); }
.chip-preview.grayscale { background: #888; }

.main-actions {
    display: flex;
    justify-content: space-around;
    padding: 16px 0;
}

.action-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    color: #fff;
    font-size: 12px;
    opacity: 0.8;
}

.action-btn.disabled {
  opacity: 0.3;
}

.action-btn.delete {
    color: #ff3b30;
}

.icon-btn {
    background: none;
    border: none;
    color: #fff;
    padding: 8px;
}

.icon-btn {
    background: none;
    border: none;
    color: #fff;
    opacity: 0.5;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Share Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.modal-content {
  background: #222;
  width: 100%;
  max-width: 500px;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  padding: 20px;
  padding-bottom: max(20px, env(safe-area-inset-bottom));
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.share-options {
  display: flex;
  gap: 16px;
  justify-content: space-around;
}

.share-option {
  background: rgba(255,255,255,0.05);
  border: none;
  border-radius: 12px;
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.share-option:active {
  background: rgba(255,255,255,0.1);
}

.option-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.option-icon.red { background: rgba(255, 59, 48, 0.2); color: #ff3b30; }
.option-icon.blue { background: rgba(0, 122, 255, 0.2); color: #007aff; }
</style>
