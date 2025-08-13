<template>
  <div class="embedded-filesystem-room-view">
    <!-- Show file detail if one is selected -->
    <div v-if="selectedFile" class="file-detail-container">
      <div class="file-detail-header">
        <button @click="backToRoom" class="back-button">
          <font-awesome-icon :icon="['fas', 'arrow-left']" />
          <span>Back to {{ room?.title || 'Room' }}</span>
        </button>
      </div>
      
      <!-- File detail view -->
      <div class="file-detail-content">
        <div class="file-header">
          <h1 class="file-title">{{ selectedFile.name }}</h1>
          <p class="file-type">{{ selectedFile.type || 'Unknown type' }}</p>
          
          <div class="file-actions">
            <button 
              class="download-button"
              @click="downloadFile(selectedFile)"
            >
              <font-awesome-icon :icon="['fas', 'download']" />
              <span>Download</span>
            </button>
          </div>
        </div>

        <!-- File content display -->
        <div class="file-content-display">
          <!-- Image files -->
          <div v-if="isImage(selectedFile)" class="image-viewer">
            <img 
              :src="selectedFile.blobUrl" 
              :alt="selectedFile.name"
              class="image-display"
            />
          </div>
          
          <!-- Video files -->
          <div v-else-if="isVideo(selectedFile)" class="video-viewer">
            <video 
              :src="selectedFile.blobUrl" 
              controls
              class="video-display"
            >
              Your browser does not support the video tag.
            </video>
          </div>
          
          <!-- Audio files -->
          <div v-else-if="isAudio(selectedFile)" class="audio-viewer">
            <div class="audio-player-card">
              <div class="audio-header">
                <div class="audio-thumbnail">
                  <img 
                    v-if="selectedFile.thumbnail"
                    :src="selectedFile.thumbnail" 
                    :alt="selectedFile.name"
                  />
                  <div v-else class="audio-icon">
                    <font-awesome-icon :icon="['fas', 'music']" />
                  </div>
                </div>
                <div class="audio-info">
                  <h3 class="audio-title">{{ selectedFile.name }}</h3>
                  <p class="audio-subtitle">{{ formatFileSize(selectedFile.size) }}</p>
                </div>
              </div>
              
              <audio 
                :src="selectedFile.blobUrl" 
                controls
                class="audio-controls"
              >
                Your browser does not support the audio tag.
              </audio>
            </div>
          </div>
          
          <!-- Other files -->
          <div v-else class="file-viewer">
            <div class="file-preview-card">
              <div class="file-icon-large">
                <font-awesome-icon :icon="['fas', 'file']" />
              </div>
              <h3 class="file-name">{{ selectedFile.name }}</h3>
              <p class="file-info">
                {{ formatFileSize(selectedFile.size) }}
                <br>
                {{ selectedFile.type || 'Unknown type' }}
              </p>
              <button 
                class="open-file-button"
                @click="openFile(selectedFile)"
              >
                Open File
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Show room contents when no file is selected -->
    <div v-else class="room-content">
      <!-- Room Header -->
      <div class="room-header">
        <div class="header-left">
          <h1 class="room-title">{{ room?.title || 'Loading...' }}</h1>
          <div class="room-meta">
            <span v-if="room?.status === 'loading' || room?.status === 'scanning' || room?.status === 'processing'">
              <font-awesome-icon 
                :icon="['fas', room.status === 'loading' ? 'spinner' : 'sync-alt']" 
                spin 
                class="loading-icon-small"
              />
              {{ room.loadingMessage || 'Processing...' }}
              <span v-if="room.totalFiles > 0">• {{ room.totalFiles }} files found</span>
              <span v-if="room.processedFiles > 0 && room.totalFiles > 0">
                • {{ Math.round((room.processedFiles / room.totalFiles) * 100) }}% processed
              </span>
            </span>
            <span v-else-if="room?.status === 'error'" class="status-error">
              <font-awesome-icon :icon="['fas', 'exclamation-triangle']" />
              {{ room.loadingMessage || 'Error loading room' }}
            </span>
            <span v-else-if="room?.status === 'ready' && room">
              {{ room.totalFiles }} files • {{ room.totalSize }}
            </span>
            <span v-else-if="room?.status === 'inaccessible'" class="status-error">
              • Access Denied - Click to retry
            </span>
          </div>
        </div>
        
        <!-- View controls -->
        <div class="view-controls">
          <button 
            class="refresh-btn"
            @click="refreshRoom"
            :disabled="isRefreshing"
            title="Refresh folder contents"
          >
            <font-awesome-icon 
              :icon="['fas', 'sync-alt']" 
              :spin="isRefreshing"
            />
          </button>
          
          <div class="view-toggle">
            <button 
              class="view-button" 
              :class="{ 'active': viewMode === 'grid' }" 
              @click="viewMode = 'grid'"
            >
              <font-awesome-icon :icon="['fas', 'th']" />
            </button>
            <button 
              class="view-button" 
              :class="{ 'active': viewMode === 'list' }" 
              @click="viewMode = 'list'"
            >
              <font-awesome-icon :icon="['fas', 'list']" />
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading || room?.status === 'loading' || room?.status === 'scanning' || room?.status === 'processing'" class="loading-state">
        <font-awesome-icon 
          :icon="['fas', room?.status === 'loading' ? 'spinner' : 'sync-alt']" 
          spin 
          class="loading-icon" 
        />
        <h3 class="loading-title">
          {{ room?.status === 'loading' ? 'Initializing...' : 
             room?.status === 'scanning' ? 'Scanning Directory' : 
             room?.status === 'processing' ? 'Processing Files' : 
             'Loading folder contents...' }}
        </h3>
        <p class="loading-text">{{ room?.loadingMessage || 'Please wait while we process your folder.' }}</p>
        
        <!-- Progress indicators -->
        <div v-if="room?.totalFiles > 0" class="progress-info">
          <div class="progress-stats">
            <span>{{ room.totalFiles }} files found</span>
            <span v-if="room.processedFiles > 0">
              • {{ room.processedFiles }} processed ({{ Math.round((room.processedFiles / room.totalFiles) * 100) }}%)
            </span>
          </div>
          
          <!-- Progress bar -->
          <div v-if="room.processedFiles > 0" class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: Math.round((room.processedFiles / room.totalFiles) * 100) + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <font-awesome-icon :icon="['fas', 'exclamation-triangle']" class="error-icon" />
        <h3 class="error-title">Unable to load folder</h3>
        <p class="error-message">{{ error }}</p>
        <button @click="refreshRoom" class="retry-button">
          <font-awesome-icon :icon="['fas', 'sync-alt']" />
          Retry
        </button>
      </div>

      <!-- Empty State -->
      <div v-else-if="!files.length" class="empty-state">
        <font-awesome-icon :icon="['fas', 'folder']" class="empty-icon" />
        <h3 class="empty-title">No files found</h3>
        <p class="empty-message">This folder appears to be empty or contains no supported file types.</p>
      </div>

      <!-- File Grid/List -->
      <div v-else class="files-container">
        <!-- Grid View -->
        <div v-if="viewMode === 'grid'" class="files-grid">
          <div 
            v-for="file in files" 
            :key="file.id"
            class="file-card"
            @click="selectFile(file)"
          >
            <div class="file-thumbnail">
              <img 
                v-if="file.thumbnail" 
                :src="file.thumbnail" 
                :alt="file.name"
                class="thumbnail-image"
              />
              <div v-else class="file-icon">
                <font-awesome-icon 
                  :icon="['fas', getFileIcon(file)]" 
                  class="icon"
                />
              </div>
            </div>
            <div class="file-info">
              <h3 class="file-name">{{ file.name }}</h3>
              <p class="file-size">{{ formatFileSize(file.size) }}</p>
            </div>
          </div>
        </div>

        <!-- List View -->
        <div v-else class="files-list">
          <table class="files-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Size</th>
                <th>Modified</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="file in files" 
                :key="file.id"
                class="file-row"
                @click="selectFile(file)"
              >
                <td>
                  <div class="file-name-cell">
                    <img 
                      v-if="file.thumbnail" 
                      :src="file.thumbnail" 
                      :alt="file.name"
                      class="file-thumbnail-small"
                    />
                    <font-awesome-icon 
                      v-else
                      :icon="['fas', getFileIcon(file)]" 
                      class="file-icon-small"
                    />
                    <span class="file-name-text">{{ file.name }}</span>
                  </div>
                </td>
                <td>{{ file.type || 'Unknown' }}</td>
                <td>{{ formatFileSize(file.size) }}</td>
                <td>{{ formatDate(file.lastModified) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { roomService } from '../services/roomService.js';

export default {
  name: 'EmbeddedFileSystemRoomView',

  props: {
    roomId: {
      type: String,
      required: true
    }
  },

  emits: ['file-selected', 'back-to-room'],

  setup(props, { emit }) {
    const selectedFile = ref(null);
    const viewMode = ref('grid');
    const isRefreshing = ref(false);

    // Get reactive room data
    const room = computed(() => roomService.getRoom(props.roomId));
    const files = computed(() => room.value?.files || []);
    const isLoading = computed(() => roomService.isLoading.value);
    const error = computed(() => roomService.error.value);

    // File selection
    const selectFile = async (file) => {
      // Create blob URL for file display if not already available
      if (!file.blobUrl && file.handle) {
        try {
          const fileData = await file.handle.getFile();
          file.blobUrl = URL.createObjectURL(fileData);
        } catch (error) {
          console.warn(`Could not create blob URL for ${file.name}:`, error);
        }
      }
      
      selectedFile.value = file;
      emit('file-selected', file);
    };

    const backToRoom = () => {
      selectedFile.value = null;
      emit('back-to-room');
    };

    // File operations
    const downloadFile = async (file) => {
      try {
        const blob = await roomService.getFileBlob(props.roomId, file.id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Download failed:', error);
      }
    };

    const openFile = async (file) => {
      try {
        const blob = await roomService.getFileBlob(props.roomId, file.id);
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } catch (error) {
        console.error('Open failed:', error);
      }
    };

    const refreshRoom = async () => {
      isRefreshing.value = true;
      try {
        await roomService.refreshRoom(props.roomId);
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        isRefreshing.value = false;
      }
    };

    // Helper functions
    const isImage = (file) => {
      return file.type?.startsWith('image/') || false;
    };

    const isVideo = (file) => {
      return file.type?.startsWith('video/') || false;
    };

    const isAudio = (file) => {
      return file.type?.startsWith('audio/') || false;
    };

    const getFileIcon = (file) => {
      if (isImage(file)) return 'image';
      if (isVideo(file)) return 'video';
      if (isAudio(file)) return 'music';
      if (file.type?.includes('pdf')) return 'file-pdf';
      return 'file';
    };

    const formatFileSize = (bytes) => {
      if (!bytes) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (timestamp) => {
      if (!timestamp) return '—';
      return new Date(timestamp).toLocaleDateString();
    };

    return {
      selectedFile,
      room,
      files,
      isLoading,
      error,
      viewMode,
      isRefreshing,
      selectFile,
      backToRoom,
      downloadFile,
      openFile,
      refreshRoom,
      isImage,
      isVideo,
      isAudio,
      getFileIcon,
      formatFileSize,
      formatDate
    };
  }
};
</script>

<style scoped>
.embedded-filesystem-room-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.file-detail-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.file-detail-header {
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  background: white;
  flex-shrink: 0;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  font-weight: normal;
  transition: color 0.2s;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.back-button:hover {
  color: #111827;
}

.file-detail-content {
  flex: 1;
  overflow: auto;
  padding: 2rem;
}

.file-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.file-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.file-type {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0.25rem 0 0;
}

.file-actions {
  display: flex;
  gap: 0.75rem;
}

.download-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #3b82f6;
  color: white;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: background-color 0.2s;
  border: none;
  cursor: pointer;
}

.download-button:hover {
  background-color: #2563eb;
}

.file-content-display {
  max-width: 100%;
}

.image-viewer,
.video-viewer {
  display: flex;
  justify-content: center;
  align-items: center;
}

.image-display,
.video-display {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.audio-viewer {
  display: flex;
  justify-content: center;
}

.audio-player-card {
  background: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  max-width: 32rem;
  width: 100%;
}

.audio-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.audio-thumbnail {
  width: 4rem;
  height: 4rem;
  border-radius: 0.25rem;
  overflow: hidden;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.audio-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.audio-icon {
  font-size: 1.5rem;
  color: #6b7280;
}

.audio-info {
  flex: 1;
}

.audio-title {
  font-weight: 500;
  color: #111827;
  margin: 0 0 0.25rem;
}

.audio-subtitle {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.audio-controls {
  width: 100%;
}

.file-viewer {
  display: flex;
  justify-content: center;
}

.file-preview-card {
  background: white;
  padding: 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 24rem;
}

.file-icon-large {
  font-size: 4rem;
  color: #6b7280;
  margin-bottom: 1rem;
}

.file-name {
  font-size: 1.125rem;
  font-weight: 500;
  color: #111827;
  margin: 0 0 0.5rem;
}

.file-info {
  color: #6b7280;
  margin-bottom: 1.5rem;
}

.open-file-button {
  background-color: #3b82f6;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.open-file-button:hover {
  background-color: #2563eb;
}

/* Room content styles */
.room-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.room-header {
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  flex-shrink: 0;
}

.header-left {
  flex: 1;
}

.room-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.25rem;
}

.room-meta {
  font-size: 0.875rem;
  color: #6b7280;
}

.loading-icon-small {
  margin-right: 0.5rem;
  color: #3b82f6;
}

.status-error {
  color: #dc2626;
}

.view-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.refresh-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.25rem;
  background: #f3f4f6;
  color: #6b7280;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: #e5e7eb;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.view-toggle {
  display: flex;
  background-color: #f8f9fa;
  border-radius: 0.25rem;
  overflow: hidden;
}

.view-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  background: none;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.view-button.active {
  background-color: #e7f0fd;
  color: #3c5a9b;
}

/* Loading, error, and empty states */
.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 2rem;
  text-align: center;
}

.loading-icon,
.error-icon,
.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.loading-icon {
  color: #3b82f6;
}

.error-icon {
  color: #dc2626;
}

.empty-icon {
  color: #6b7280;
}

.loading-text,
.loading-title,
.error-title,
.empty-title {
  font-size: 1.125rem;
  font-weight: 500;
  color: #111827;
  margin: 0 0 0.5rem;
}

.loading-text {
  font-size: 1rem;
  font-weight: normal;
  color: #6b7280;
}

.error-message,
.empty-message {
  color: #6b7280;
  margin-bottom: 1rem;
}

.retry-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #3b82f6;
  color: white;
  border-radius: 0.375rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background-color: #2563eb;
}

.progress-info {
  margin-top: 1.5rem;
  width: 100%;
  max-width: 400px;
}

.progress-stats {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.75rem;
  text-align: center;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #3b82f6;
  border-radius: 4px;
  transition: width 0.3s ease;
}

/* File grid and list styles */
.files-container {
  flex: 1;
  overflow: auto;
  padding: 1rem;
}

.files-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.file-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.file-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.file-thumbnail {
  width: 100%;
  height: 120px;
  background: #f9fafb;
  border-radius: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.75rem;
  overflow: hidden;
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-icon {
  font-size: 2rem;
  color: #6b7280;
}

.file-info .file-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #111827;
  margin: 0 0 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0;
}

.files-list {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  overflow: hidden;
}

.files-table {
  width: 100%;
  border-collapse: collapse;
}

.files-table th,
.files-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.files-table th {
  background: #f9fafb;
  font-weight: 500;
  color: #6b7280;
  font-size: 0.875rem;
}

.files-table tr:last-child td {
  border-bottom: none;
}

.file-row {
  cursor: pointer;
  transition: background-color 0.2s;
}

.file-row:hover {
  background: #f9fafb;
}

.file-name-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.file-thumbnail-small {
  width: 2rem;
  height: 2rem;
  object-fit: cover;
  border-radius: 0.25rem;
  flex-shrink: 0;
}

.file-icon-small {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  flex-shrink: 0;
}

.file-name-text {
  font-weight: 500;
  color: #111827;
}

/* Responsive */
@media (max-width: 768px) {
  .file-header {
    flex-direction: column;
    align-items: stretch;
  }

  .files-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
  
  .files-table {
    font-size: 0.875rem;
  }

  .files-table th,
  .files-table td {
    padding: 0.5rem 0.75rem;
  }
}
</style>