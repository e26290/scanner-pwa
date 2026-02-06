import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { dbService } from '../utils/db'

export const useScanStore = defineStore('scans', () => {
    // Folder Structure: { id, name, createdAt }
    const folders = ref([])

    // Scan Structure: { id, folderId, url, date, width, height }
    const scans = ref([])

    // App State
    const currentFolderId = ref(null)
    const isLoaded = ref(false)

    // Initialize
    async function init() {
        try {
            const [loadedFolders, loadedScans] = await Promise.all([
                dbService.getAllFolders(),
                dbService.getAllScans()
            ])

            folders.value = loadedFolders
            scans.value = loadedScans

            if (folders.value.length === 0) {
                const defaultFolder = {
                    id: 'default',
                    name: '未命名資料夾',
                    createdAt: new Date().toISOString()
                }
                folders.value.push(defaultFolder)
                await dbService.saveFolder(defaultFolder)
                currentFolderId.value = defaultFolder.id
            } else {
                // Restore last folder logic could go here, for now default to stored ordering or first
                currentFolderId.value = folders.value[0].id
            }
        } catch (e) {
            console.error('Failed to load DB', e)
        } finally {
            isLoaded.value = true
        }
    }

    // Getters
    const currentFolder = computed(() => folders.value.find(f => f.id === currentFolderId.value))

    const getScansByFolder = (folderId) => {
        return scans.value.filter(s => s.folderId === folderId).sort((a, b) => b.id - a.id)
    }

    // Actions
    async function addScan(scanData) {
        const newScan = {
            ...scanData,
            folderId: currentFolderId.value
        }
        // Update State
        scans.value.push(newScan)
        // Persist
        await dbService.saveScan(newScan)
    }

    async function updateScan(updatedScan) {
        const index = scans.value.findIndex(s => s.id === updatedScan.id)
        if (index !== -1) {
            scans.value[index] = updatedScan // Update in memory
            await dbService.saveScan(updatedScan) // Update in DB
        }
    }

    async function deleteScan(id) {
        scans.value = scans.value.filter(s => s.id !== id)
        await dbService.deleteScan(id)
    }

    async function moveScanToFolder(scanId, targetFolderId) {
        const scan = scans.value.find(s => s.id === scanId)
        if (scan) {
            scan.folderId = targetFolderId
            await dbService.saveScan(scan)
        }
    }

    async function createFolder(name) {
        const newFolder = {
            id: Date.now().toString(),
            name: name || `新資料夾 ${folders.value.length + 1}`,
            createdAt: new Date().toISOString()
        }
        folders.value.push(newFolder)
        currentFolderId.value = newFolder.id
        await dbService.saveFolder(newFolder)
        return newFolder
    }

    async function renameFolder(id, newName) {
        const folder = folders.value.find(f => f.id === id)
        if (folder) {
            folder.name = newName
            await dbService.saveFolder(folder)
        }
    }

    async function deleteFolder(id) {
        if (folders.value.length <= 1) return false

        // 1. Find scans to delete
        const scansToDelete = scans.value.filter(s => s.folderId === id)

        // 2. Remove from State
        folders.value = folders.value.filter(f => f.id !== id)
        scans.value = scans.value.filter(s => s.folderId !== id)

        // 3. Remove from DB
        await dbService.deleteFolder(id)
        for (const scan of scansToDelete) {
            await dbService.deleteScan(scan.id)
        }

        // 4. Switch Folder
        if (currentFolderId.value === id) {
            currentFolderId.value = folders.value[0].id
        }
        return true
    }

    function switchFolder(folderId) {
        const exists = folders.value.find(f => f.id === folderId)
        if (exists) {
            currentFolderId.value = folderId
        }
    }

    // Auto-init on load
    init()

    return {
        folders,
        scans,
        currentFolderId,
        currentFolder,
        isLoaded,
        getScansByFolder,
        addScan,
        updateScan,
        deleteScan,
        moveScanToFolder,
        createFolder,
        switchFolder,
        renameFolder,
        deleteFolder
    }
})
