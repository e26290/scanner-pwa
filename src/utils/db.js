const DB_NAME = 'ScannerAppDB'
const DB_VERSION = 1
const STORE_SCANS = 'scans'
const STORE_FOLDERS = 'folders'

export const dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains(STORE_SCANS)) {
            db.createObjectStore(STORE_SCANS, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(STORE_FOLDERS)) {
            db.createObjectStore(STORE_FOLDERS, { keyPath: 'id' })
        }
    }

    request.onsuccess = (event) => {
        resolve(event.target.result)
    }

    request.onerror = (event) => {
        reject('Database error: ' + event.target.errorCode)
    }
})

export const dbService = {
    async getAllFolders() {
        const db = await dbPromise
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_FOLDERS], 'readonly')
            const store = transaction.objectStore(STORE_FOLDERS)
            const request = store.getAll()
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
        })
    },

    async saveFolder(folder) {
        const db = await dbPromise
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_FOLDERS], 'readwrite')
            const store = transaction.objectStore(STORE_FOLDERS)
            const request = store.put(JSON.parse(JSON.stringify(folder))) // Ensure plain object
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
        })
    },

    async deleteFolder(id) {
        const db = await dbPromise
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_FOLDERS], 'readwrite')
            const store = transaction.objectStore(STORE_FOLDERS)
            const request = store.delete(id)
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
        })
    },

    async getAllScans() {
        const db = await dbPromise
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_SCANS], 'readonly')
            const store = transaction.objectStore(STORE_SCANS)
            const request = store.getAll()
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
        })
    },

    async saveScan(scan) {
        const db = await dbPromise
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_SCANS], 'readwrite')
            const store = transaction.objectStore(STORE_SCANS)
            const request = store.put(JSON.parse(JSON.stringify(scan)))
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
        })
    },

    async deleteScan(id) {
        const db = await dbPromise
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_SCANS], 'readwrite')
            const store = transaction.objectStore(STORE_SCANS)
            const request = store.delete(id)
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
        })
    }
}
