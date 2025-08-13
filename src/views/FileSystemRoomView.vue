<template>
  <div class="filesystem-room-view">
    <!-- Room Header -->
    <div class="room-header">
      <div class="header-left">
        <h1 class="room-title">{{ room?.title || 'Loading...' }}</h1>
        <div class="room-meta">
          <span v-if="room">{{ room.totalFiles }} files • {{ room.totalSize }}</span>
          <span v-if="room?.status === 'inaccessible'" class="status-error">
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
    <div v-if="isLoading" class="loading-state">
      <font-awesome-icon :icon="['fas', 'spinner']" spin class="loading-icon" />
      <p>Loading room contents...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <font-awesome-icon :icon="['fas', 'exclamation-triangle']" class="error-icon" />
      <h3>Unable to access folder</h3>
      <p>{{ error }}</p>
      <div class="error-actions">
        <button @click="retryAccess" class="btn-primary">Retry Access</button>
        <button @click="$emit('close')" class="btn-secondary">Back to Rooms</button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!files || files.length === 0" class="empty-state">
      <font-awesome-icon :icon="['fas', 'folder-open']" class="empty-icon" />
      <h3>No supported files found</h3>
      <p>This folder doesn't contain any supported media files.</p>
      <button @click="refreshRoom" class="btn-primary">Refresh</button>
    </div>

    <!-- File Grid/List -->
    <div v-else class="files-container">
      <!-- Grid View -->
      <div v-if="viewMode === 'grid'" class="files-grid">
        <div 
          v-for="file in files" 
          :key="file.id"
          class="file-item"
          @click="openFile(file)"
        >
          <div class="file-thumbnail" :class="file.category">
            <img 
              v-if="file.thumbnail" 
              :src="file.thumbnail" 
              :alt="file.name"
              class="thumbnail-image"
            />
            <div v-else class="file-type-icon">
              <font-awesome-icon :icon="getFileIcon(file.category)" />
            </div>
            
            <!-- Duration overlay for videos/audio -->
            <div v-if="file.formattedDuration" class="duration-overlay">
              {{ file.formattedDuration }}
            </div>
            
            <!-- Play button for videos -->
            <div v-if="file.category === 'video'" class="play-overlay">
              <font-awesome-icon :icon="['fas', 'play']" />
            </div>
          </div>
          
          <div class="file-info">
            <h3 class="file-name" :title="file.name">{{ file.name }}</h3>
            <div class="file-meta">
              <span class="file-size">{{ file.formattedSize }}</span>
              <span class="file-date">{{ file.formattedDate }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- List View -->
      <div v-else class="files-list">
        <div 
          v-for="file in files" 
          :key="file.id"
          class="file-list-item"
          @click="openFile(file)"
        >
          <div class="file-list-thumbnail" :class="file.category">
            <img 
              v-if="file.thumbnail" 
              :src="file.thumbnail" 
              :alt="file.name"
              class="thumbnail-image"
            />
            <div v-else class="file-type-icon">
              <font-awesome-icon :icon="getFileIcon(file.category)" />
            </div>
          </div>
          
          <div class="file-list-info">
            <h3 class="file-name">{{ file.name }}</h3>
            <div class="file-path">{{ file.path || 'Root folder' }}</div>
          </div>
          
          <div class="file-list-meta">
            <div class="file-size">{{ file.formattedSize }}</div>
            <div class="file-date">{{ file.formattedDate }}</div>
            <div v-if="file.formattedDuration" class="file-duration">{{ file.formattedDuration }}</div>
          </div>
          
          <div class="file-list-actions">
            <button @click.stop="downloadFile(file)" title="Download file">
              <font-awesome-icon :icon="['fas', 'download']" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { roomService } from '../services/roomService.js';

export default {
  name: 'FileSystemRoomView',
  props: {
    roomId: {
      type: String,
      required: true
    }
  },
  emits: ['close'],
  setup(props, { emit }) {
    const viewMode = ref('grid');
    const isLoading = ref(false);
    const isRefreshing = ref(false);
    const error = ref(null);

    const room = computed(() => roomService.getRoom(props.roomId));
    const files = computed(() => roomService.getRoomFiles(props.roomId));

    const getFileIcon = (category) => {
      const icons = {
        image: ['fas', 'image'],
        video: ['fas', 'video'],
        audio: ['fas', 'music'],
        document: ['fas', 'file-alt'],
        archive: ['fas', 'file-archive'],
        data: ['fas', 'table'],
        other: ['fas', 'file']
      };
      return icons[category] || icons.other;
    };

    const validateAccess = async () => {
      if (!props.roomId) return;
      
      isLoading.value = true;
      error.value = null;
      
      try {
        const hasAccess = await roomService.validateRoomAccess(props.roomId);
        if (!hasAccess) {
          error.value = 'Cannot access the selected folder. Permission may have been revoked.';
        }
      } catch (err) {
        error.value = err.message;
      } finally {
        isLoading.value = false;
      }
    };

    const refreshRoom = async () => {
      if (!props.roomId) return;
      
      isRefreshing.value = true;
      error.value = null;
      
      try {
        const success = await roomService.refreshRoom(props.roomId, (progress) => {
          // Handle progress updates if needed
          console.log('Refresh progress:', progress);
        });
        
        if (!success) {
          error.value = 'Failed to refresh room contents.';
        }
      } catch (err) {
        error.value = err.message;
      } finally {
        isRefreshing.value = false;
      }
    };

    const retryAccess = async () => {
      await validateAccess();
    };

    const openFile = async (file) => {
      try {
        // Create object URL for the file
        const fileUrl = await roomService.getFileUrl(props.roomId, file.id);
        
        // Open file based on its type
        if (file.category === 'image' || file.category === 'video') {
          // For images and videos, open in a new tab/window
          window.open(fileUrl, '_blank');
        } else if (file.category === 'audio') {
          // For audio, create a simple audio player
          const audio = new Audio(fileUrl);
          audio.controls = true;
          audio.play();
        } else {
          // For other files, trigger download
          downloadFile(file);
        }
      } catch (err) {
        console.error('Failed to open file:', err);
        alert(`Failed to open file: ${err.message}`);
      }
    };

    const downloadFile = async (file) => {
      try {
        const fileBlob = await roomService.getFileBlob(props.roomId, file.id);
        const fileUrl = URL.createObjectURL(fileBlob);
        
        // Create download link
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
      } catch (err) {
        console.error('Failed to download file:', err);
        alert(`Failed to download file: ${err.message}`);
      }
    };

    // Watch for room ID changes
    watch(() => props.roomId, async (newRoomId) => {
      if (newRoomId) {
        await validateAccess();
      }
    }, { immediate: true });

    onMounted(() => {
      if (props.roomId) {
        roomService.updateRoomAccess(props.roomId);
      }
    });

    return {
      viewMode,
      isLoading,
      isRefreshing,
      error,
      room,
      files,
      getFileIcon,
      refreshRoom,
      retryAccess,
      openFile,
      downloadFile
    };
  }
};
</script>

<style scoped>
.filesystem-room-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #ffffff;
}

.room-header {
  padding: 24px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-left {
  display: flex;
  flex-direction: column;
}

.room-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
  line-height: 1.2;
}

.room-meta {
  margin-top: 4px;
  font-size: 14px;
  color: #6c757d;
}

.status-error {
  color: #dc3545;
  cursor: pointer;
}

.view-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.refresh-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background-color: #f8f9fa;
  border-radius: 4px;
  color: #6c757d;
  cursor: pointer;
  transition: all 0.2s ease;
}

.refresh-btn:hover:not(:disabled) {
  background-color: #e9ecef;
  color: #3c5a9b;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.view-toggle {
  display: flex;
  background-color: #f8f9fa;
  border-radius: 4px;
  overflow: hidden;
}

.view-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: none;
  color: #6c757d;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-button.active {
  background-color: #e7f0fd;
  color: #3c5a9b;
}

/* Loading, Error, and Empty States */
.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 48px 24px;
  text-align: center;
}

.loading-icon,
.error-icon,
.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  color: #6c757d;
}

.error-icon {
  color: #dc3545;
}

.error-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.btn-primary {
  padding: 8px 16px;
  background-color: #3c5a9b;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.btn-primary:hover {
  background-color: #2c4a8b;
}

.btn-secondary {
  padding: 8px 16px;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.btn-secondary:hover {
  background-color: #5a6268;
}

/* Files Container */
.files-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* Grid View */
.files-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.file-item {
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.file-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.file-thumbnail {
  position: relative;
  height: 150px;
  background-color: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.file-thumbnail.video {
  background-color: #1a1a1a;
}

.file-thumbnail.image {
  background-color: #f8f9fa;
}

.file-thumbnail.audio {
  background-color: #3c5a9b;
  background: linear-gradient(135deg, #3c5a9b 0%, #5a7bc5 100%);
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-type-icon {
  font-size: 48px;
  color: #6c757d;
}

.file-thumbnail.audio .file-type-icon {
  color: white;
}

.duration-overlay {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 2px 6px;
  border-radius: 2px;
  font-size: 12px;
  font-weight: 500;
}

.play-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.file-item:hover .play-overlay {
  opacity: 1;
}

.file-info {
  padding: 12px;
}

.file-name {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 500;
  color: #2c3e50;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #6c757d;
}

/* List View */
.files-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background-color: #e9ecef;
}

.file-list-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: #ffffff;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.file-list-item:hover {
  background-color: #f8f9fa;
}

.file-list-thumbnail {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  margin-right: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f8f9fa;
  overflow: hidden;
  flex-shrink: 0;
}

.file-list-thumbnail.video {
  background-color: #1a1a1a;
}

.file-list-thumbnail.audio {
  background-color: #3c5a9b;
}

.file-list-thumbnail .thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-list-thumbnail .file-type-icon {
  font-size: 20px;
  color: #6c757d;
}

.file-list-thumbnail.audio .file-type-icon {
  color: white;
}

.file-list-info {
  flex: 1;
  min-width: 0;
}

.file-list-info .file-name {
  margin: 0 0 2px 0;
  font-size: 14px;
  font-weight: 500;
  color: #2c3e50;
}

.file-path {
  font-size: 12px;
  color: #6c757d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-list-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-right: 16px;
  flex-shrink: 0;
}

.file-list-meta > div {
  font-size: 12px;
  color: #6c757d;
  margin-bottom: 2px;
}

.file-list-meta > div:last-child {
  margin-bottom: 0;
}

.file-list-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.file-list-actions button {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  color: #6c757d;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.file-list-actions button:hover {
  background-color: #e9ecef;
  color: #3c5a9b;
}

.room-not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 48px 24px;
  text-align: center;
}

.room-not-found h2 {
  color: #dc3545;
  margin-bottom: 8px;
}

.room-not-found p {
  color: #6c757d;
  margin-bottom: 24px;
}
</style>