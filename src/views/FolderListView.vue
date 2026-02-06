<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Camera, Search, MoreVertical, Plus, Folder as FolderIcon } from 'lucide-vue-next'
import { useScanStore } from '../stores/useScanStore'

const router = useRouter()
const store = useScanStore()
const activeMenuId = ref(null)

const handleFolderClick = (id) => {
  store.switchFolder(id)
  router.push(`/folders/${id}`)
}

const createFolder = () => {
  const name = prompt("請輸入新資料夾名稱")
  if (name) {
    store.createFolder(name)
  }
}

const toggleMenu = (event, id) => {
  event.stopPropagation()
  activeMenuId.value = activeMenuId.value === id ? null : id
}

const renameFolder = (folder) => {
  const newName = prompt("重新命名資料夾", folder.name)
  if (newName) {
    store.renameFolder(folder.id, newName)
  }
  activeMenuId.value = null
}

const deleteFolder = (folder) => {
  if (confirm(`確定要刪除「${folder.name}」及其所有內容嗎？`)) {
    store.deleteFolder(folder.id)
  }
  activeMenuId.value = null
}

// Close menu when clicking outside
const closeMenu = () => {
  activeMenuId.value = null
}
</script>

<template>
  <div class="folder-list-container" @click="closeMenu">
    <header class="header">
      <div>
        <div class="title">文件庫</div>
        <div class="subtitle">{{ store.folders.length }} 個資料夾 · 共 {{ store.scans.length }} 張</div>
      </div>
      <button class="icon-btn text-accent" @click="createFolder">
        <Plus :size="24" />
      </button>
    </header>

    <div class="content">
      <div class="folder-list">
        <div 
          v-for="folder in store.folders" 
          :key="folder.id" 
          class="folder-item-row"
          @click="handleFolderClick(folder.id)"
        >
          <!-- Icon -->
          <div class="folder-icon-wrapper">
            <FolderIcon :size="24" color="#fff" />
          </div>

          <!-- Info -->
          <div class="folder-info">
            <div class="folder-name">{{ folder.name }}</div>
            <div class="folder-meta">
              {{ store.getScansByFolder(folder.id).length }} 張 · {{ new Date(folder.createdAt).toLocaleDateString() }}
            </div>
          </div>

          <!-- Menu Button -->
          <div class="folder-action">
            <button class="icon-btn" @click="(e) => toggleMenu(e, folder.id)">
              <MoreVertical :size="20" color="#aaa" />
            </button>
            
            <!-- Context Menu -->
            <div v-if="activeMenuId === folder.id" class="context-menu" @click.stop>
              <button @click="renameFolder(folder)">重新命名</button>
              <button class="danger" @click="deleteFolder(folder)">刪除</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- FAB -->
    <button class="fab-camera" @click="router.push('/')">
      <Camera :size="28" />
    </button>
  </div>
</template>

<style scoped>
.folder-list-container {
  height: 100%;
  background: #f5f5f5; /* Light bg per screenshot hint */
  color: #333;
  display: flex;
  flex-direction: column;
  position: relative;
}

.header {
  height: 80px; /* Taller header */
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  background: #fff;
  border-bottom: 1px solid #eee;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #000;
}

.subtitle {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.text-accent {
  color: #00bfa5; /* Teal color from screenshot */
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.folder-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.folder-item-row {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  position: relative;
  border: 1px solid #eee;
}

.folder-icon-wrapper {
  width: 48px;
  height: 48px;
  background: #00bfa5; /* Teal */
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.folder-info {
  flex: 1;
}

.folder-name {
  font-weight: 600;
  font-size: 16px;
  color: #000;
  margin-bottom: 4px;
}

.folder-meta {
  font-size: 12px;
  color: #888;
}

.icon-btn {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
}

/* Menu */
.folder-action {
  position: relative;
}

.context-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  overflow: hidden;
  z-index: 10;
  min-width: 120px;
  border: 1px solid #eee;
}

.context-menu button {
  display: block;
  width: 100%;
  padding: 12px;
  text-align: left;
  background: none;
  border: none;
  font-size: 14px;
  color: #333;
  border-bottom: 1px solid #f9f9f9;
}

.context-menu button:active {
  background: #f0f0f0;
}

.context-menu button.danger {
  color: #ff3b30;
}

.fab-camera {
  position: absolute;
  bottom: 24px;
  right: 24px; /* Move to right as per Material Design mostly, or center if preferred. Screenshot seems right. */
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #00bfa5;
  color: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 191, 165, 0.4);
}
</style>
