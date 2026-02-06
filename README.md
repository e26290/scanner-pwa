# 📱 Document Scanner PWA

一個基於 Vue 3 的文件掃描 Progressive Web App，提供專業的文件掃描、編輯與管理功能。

## ✨ 主要功能

### 📸 智能掃描

- 即時相機預覽
- 資料夾分類管理
- 自動儲存到 IndexedDB

### 🎨 強大編輯

- **濾鏡**：Magic Color、黑白、灰階
- **旋轉**：90度旋轉
- **裁切**：自由裁切功能
- 即時預覽編輯效果

### 📁 資料夾管理

- 建立、重新命名、刪除資料夾
- 批次移動文件到其他資料夾
- 依日期分組顯示

### 📤 分享與匯出

- **PDF 匯出**：單張或批次匯出為 PDF
- **圖片分享**：原生分享功能
- 支援 Web Share API

### 💾 資料持久化

- IndexedDB 本地儲存
- 離線可用
- 資料不會遺失（除非手動清除瀏覽器資料）

### 📲 PWA 支援

- 可安裝到主畫面
- 離線運作
- 類原生 App 體驗

## 🚀 快速開始

### 安裝依賴

```bash
npm install
```

### 開發模式

```bash
npm run dev
```

### 建置生產版本

```bash
npm run build
```

### 預覽生產版本

```bash
npm run preview
```

## 🛠️ 技術棧

- **框架**: Vue 3 (Composition API)
- **建置工具**: Vite
- **狀態管理**: Pinia
- **路由**: Vue Router
- **圖示**: lucide-vue-next
- **圖片裁切**: vue-advanced-cropper
- **PDF 生成**: jsPDF
- **PWA**: vite-plugin-pwa
- **資料庫**: IndexedDB

## 📱 使用說明

### 1. 掃描文件

1. 開啟應用程式
2. 允許相機權限
3. 選擇或建立資料夾
4. 點擊快門按鈕拍攝

### 2. 編輯文件

1. 點擊縮圖進入編輯器
2. 套用濾鏡、旋轉或裁切
3. 點擊「完成」儲存

### 3. 分享文件

- **單張分享**：編輯器內點擊「分享」按鈕
- **批次分享**：文件庫 → 選取 → 分享

### 4. 管理資料夾

1. 進入資料夾列表
2. 長按資料夾可重新命名或刪除
3. 使用批次移動整理文件

## 🌐 瀏覽器支援

- Chrome/Edge 90+
- Safari 14+
- Firefox 88+

**注意**：相機功能需要 HTTPS 或 localhost

## 📝 授權

MIT License

## 👨‍💻 作者

gillwu
