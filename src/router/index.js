import { createRouter, createWebHistory } from 'vue-router'
import CameraView from '../views/CameraView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'camera',
      component: CameraView
    },
    {
      path: '/library', // Legacy fallback
      redirect: '/folders'
    },
    {
      path: '/folders',
      name: 'folders',
      component: () => import('../views/FolderListView.vue')
    },
    {
      path: '/folders/:id',
      name: 'folder-detail',
      component: () => import('../views/LibraryView.vue') // Reusing LibraryView for now
    },
    {
      path: '/edit/:id',
      name: 'edit',
      component: () => import('../views/EditView.vue')
    }
  ]
})

export default router
