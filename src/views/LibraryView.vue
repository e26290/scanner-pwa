<script setup>
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ArrowLeft, Trash2, Share2, MoreVertical, Check, FileText, Image as ImageIcon, X, Folder } from 'lucide-vue-next'
import { useScanStore } from '../stores/useScanStore'
import { jsPDF } from 'jspdf'

const router = useRouter()
const route = useRoute()
const store = useScanStore()
const isSelectionMode = ref(false)
const selectedIds = ref(new Set())
const isShareMenuOpen = ref(false)

// Get Folder ID from Params
const currentFolderId = computed(() => route.params.id)
const currentFolderName = computed(() => {
  const folder = store.folders.find(f => f.id === currentFolderId.value)
  return folder ? folder.name : 'Unknown Folder'
})

// Current Folder Scans
const currentFolderScans = computed(() => store.getScansByFolder(currentFolderId.value))

// Group scans by date
const groupedScans = computed(() => {
  const groups = {}
  currentFolderScans.value.forEach(scan => {
    const date = new Date(scan.date)
    const dateStr = date.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })
    if (!groups[dateStr]) groups[dateStr] = []
    groups[dateStr].push(scan)
  })
  return groups
})

const isAllSelected = computed(() => {
  return currentFolderScans.value.length > 0 && selectedIds.value.size === currentFolderScans.value.length
})

const toggleSelectionMode = () => {
  if (isSelectionMode.value) {
    selectedIds.value.clear()
  }
  isSelectionMode.value = !isSelectionMode.value
}

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value.clear()
  } else {
    currentFolderScans.value.forEach(scan => selectedIds.value.add(scan.id))
  }
}

const toggleSelection = (id) => {
  if (!isSelectionMode.value) {
    router.push(`/edit/${id}`)
    return
  }
  
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
}

const deleteSelected = () => {
  if (confirm(`確定刪除 ${selectedIds.value.size} 張影像？`)) {
    store.scans = store.scans.filter(s => !selectedIds.value.has(s.id))
    selectedIds.value.clear()
    isSelectionMode.value = false
  }
}

const openShareMenu = () => {
  isShareMenuOpen.value = true
}

const closeShareMenu = () => {
  isShareMenuOpen.value = false
}

// Folder Move Logic
const isFolderPickerOpen = ref(false)

const openFolderPicker = () => {
  if (selectedIds.value.size === 0) return
  isFolderPickerOpen.value = true
}

const closeFolderPicker = () => {
  isFolderPickerOpen.value = false
}

const moveToFolder = async (targetFolderId) => {
  if (targetFolderId === currentFolderId.value) {
    closeFolderPicker()
    return // Same folder, no action needed
  }

  const ids = Array.from(selectedIds.value)
  
  for (const id of ids) {
    await store.moveScanToFolder(id, targetFolderId)
  }
  
  // Clear selection and close
  selectedIds.value.clear()
  isSelectionMode.value = false
  closeFolderPicker()
}

const handleShare = async (type) => { // type: 'pdf' | 'image'
  closeShareMenu()
  
  const ids = Array.from(selectedIds.value)
  if (ids.length === 0) return

  if (type === 'pdf') {
      try {
        const doc = new jsPDF()
        
        for (let i = 0; i < ids.length; i++) {
            const scan = store.scans.find(s => s.id === ids[i])
            if (!scan) continue

            if (i > 0) doc.addPage()

            // Get image properties
            const imgProps = doc.getImageProperties(scan.url)
            const pdfWidth = doc.internal.pageSize.getWidth()
            const pdfHeight = doc.internal.pageSize.getHeight()
            
            // Calculate ratio to fit page
            const ratio = Math.min(pdfWidth / imgProps.width, pdfHeight / imgProps.height)
            const width = imgProps.width * ratio
            const height = imgProps.height * ratio
            
            // Center image
            const x = (pdfWidth - width) / 2
            const y = (pdfHeight - height) / 2

            doc.addImage(scan.url, 'JPEG', x, y, width, height)
        }

        const pdfBlob = doc.output('blob')
        const file = new File([pdfBlob], `scan_${new Date().getTime()}.pdf`, { type: 'application/pdf' })

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: '掃描文件 (PDF)',
                text: '這是我剛掃描的文件'
            })
        } else {
            // Fallback: Download
            doc.save(`scan_${new Date().getTime()}.pdf`)
        }

      } catch (err) {
          console.error("PDF Generation Error:", err)
          alert("建立 PDF 失敗，請稍後再試。")
      }

  } else {
     // Share as Images
     if (navigator.share && ids.length > 0) {
        try {
          const files = []
          for (const id of ids) {
            const scan = store.scans.find(s => s.id === id)
            if (scan) {
              const res = await fetch(scan.url)
              const blob = await res.blob()
              files.push(new File([blob], `scan-${id}.jpg`, { type: 'image/jpeg' }))
            }
          }
          
          if (navigator.canShare && navigator.canShare({ files })) {
              await navigator.share({
                files: files,
                title: '掃描文件 (圖片)',
                text: `分享 ${files.length} 張影像`
              })
          } else {
               alert("您的裝置不支援分享圖片檔案，或是圖片格式不被支援。")
          }
        } catch (err) {
          console.error('Share failed', err)
          // Fallback? Browsers don't support multi-file download easily without zip
          alert("分享發生錯誤")
        }
      } else {
        alert("此瀏覽器不支援原生分享功能 (Web Share API)。")
      }
  }
}
</script>

<template>
  <div class="library-container">
    <!-- Header -->
    <header class="header">
      <div class="left">
         <button v-if="!isSelectionMode" class="icon-btn" @click="router.push('/folders')">
          <ArrowLeft :size="24" />
        </button>
        <button v-else class="icon-btn" @click="toggleSelectionMode">
          <span class="text-btn">取消</span>
        </button>
      </div>
      
      <div class="title">
        {{ isSelectionMode ? `已選 ${selectedIds.size} 張` : currentFolderName }}
      </div>
      
      <div class="right">
        <!-- Show 'Select' only if not empty -->
        <button 
          v-if="!isSelectionMode && currentFolderScans.length > 0" 
          class="icon-btn" 
          @click="toggleSelectionMode"
        >
          <span class="text-btn">選取</span>
        </button>
        
        <!-- Show 'Select All' in selection mode -->
        <button 
          v-if="isSelectionMode" 
          class="icon-btn" 
          @click="toggleSelectAll"
        >
          <span class="text-btn">{{ isAllSelected ? '全消' : '全選' }}</span>
        </button>
      </div>
    </header>

    <!-- Content -->
    <main class="content">
      <div v-if="currentFolderScans.length === 0" class="empty-state">
        <p>此資料夾尚無照片</p>
        <button class="cta-btn" @click="router.push('/')">立即掃描</button>
      </div>

      <div v-for="(scans, date) in groupedScans" :key="date" class="date-group">
        <h3 class="date-header">{{ date }}</h3>
        <div class="grid">
          <div 
            v-for="scan in scans" 
            :key="scan.id" 
            class="grid-item"
            :class="{ selected: selectedIds.has(scan.id) }"
            @click="toggleSelection(scan.id)"
          >
            <img :src="scan.url" loading="lazy" />
            
            <div v-if="isSelectionMode" class="check-circle" :class="{ active: selectedIds.has(scan.id) }">
              <Check v-if="selectedIds.has(scan.id)" :size="14" color="#fff" />
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Bottom Action Bar (Selection Mode) -->
    <div v-if="isSelectionMode" class="selection-bar">
      <button class="action-btn" :disabled="selectedIds.size === 0" @click="openShareMenu">
        <Share2 :size="20" />
        <span>分享</span>
      </button>
      <button class="action-btn" :disabled="selectedIds.size === 0" @click="openFolderPicker">
        <Folder :size="20" />
        <span>移動</span>
      </button>
      <button class="action-btn delete" :disabled="selectedIds.size === 0" @click="deleteSelected">
        <Trash2 :size="20" />
        <span>刪除</span>
      </button>
    </div>

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
            <span>JPG 影像 ({{ selectedIds.size }}張)</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Folder Picker Modal -->
    <div v-if="isFolderPickerOpen" class="modal-overlay" @click="closeFolderPicker">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>移動到資料夾</h3>
          <button class="icon-btn" @click="closeFolderPicker"><X :size="20" /></button>
        </div>
        <div class="folder-list">
          <button 
            v-for="folder in store.folders.filter(f => f.id !== currentFolderId)" 
            :key="folder.id"
            class="folder-list-item"
            @click="moveToFolder(folder.id)"
          >
            <Folder :size="20" />
            <span>{{ folder.name }}</span>
          </button>
          <div v-if="store.folders.length <= 1" class="empty-folders">
            <p>沒有其他資料夾</p>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.library-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-color);
  color: #fff;
}

.header {
  height: 56px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 10;
}

.title {
  font-weight: 600;
  font-size: 17px;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.date-group {
  margin-bottom: 24px;
}

.date-header {
  font-size: 14px;
  color: #888;
  margin-bottom: 12px;
  font-weight: 500;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3px;
}

.grid-item {
  position: relative;
  aspect-ratio: 1;
  background: #333;
  overflow: hidden;
  cursor: pointer;
}

.grid-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s;
}

/* Selection State */
.grid-item.selected img {
  transform: scale(0.9);
}

.check-circle {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-circle.active {
  background: var(--accent-color, #ffd700);
  border-color: var(--accent-color, #ffd700);
}

/* Controls */
.icon-btn {
  background: none;
  border: none;
  color: #fff;
  padding: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.text-btn {
  color: var(--accent-color, #ffd700);
  font-weight: 500;
  font-size: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  color: #666;
}

.cta-btn {
  margin-top: 16px;
  background: var(--accent-color, #ffd700);
  color: #000;
  border: none;
  padding: 12px 24px;
  border-radius: 24px;
  font-weight: 600;
  cursor: pointer;
}

.selection-bar {
  height: 60px;
  background: #1a1a1a;
  border-top: 1px solid rgba(255,255,255,0.1);
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding-bottom: env(safe-area-inset-bottom, 10px);
}

.action-btn {
  background: none;
  border: none;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 10px;
  gap: 4px;
  opacity: 0.8;
  cursor: pointer;
}

.action-btn:disabled {
  opacity: 0.3;
}

.action-btn.delete {
  color: #ff3b30;
}

/* Modal Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 100;
  display: flex;
  align-items: flex-end; /* Bottom sheet style */
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

/* Folder Picker */
.folder-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.folder-list-item {
  background: rgba(255,255,255,0.05);
  border: none;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #fff;
  font-size: 16px;
  text-align: left;
  cursor: pointer;
}

.folder-list-item:active {
  background: rgba(255,255,255,0.1);
}

.empty-folders {
  text-align: center;
  padding: 32px;
  color: #666;
}
</style>
