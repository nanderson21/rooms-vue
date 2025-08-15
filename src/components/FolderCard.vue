<template>
  <div class="folder-card" @click="selectFolder">
    <div class="item-media">
      <div class="folder-icon-container">
        <div class="folder-icon">
          <font-awesome-icon 
            :icon="['fas', 'folder']" 
            :style="{ color: folderColor }"
          />
        </div>
        <div class="folder-overlay">
          <div class="folder-info">
            <span class="file-count">{{ folder.fileCount || 0 }} files</span>
            <span v-if="folder.subfolderCount" class="subfolder-count">
              {{ folder.subfolderCount }} folders
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="item-header">
      <div class="header-content">
        <h3 class="item-title">{{ folder.name }}</h3>
        <p class="item-metadata">
          {{ getFolderTypeDisplay() }}
        </p>
      </div>
      <button 
        class="gear-button" 
        @click.stop="openFolderSettings"
        :title="`Settings for ${folder.name}`"
      >
        <font-awesome-icon :icon="['fas', 'cog']" />
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FolderCard',
  
  props: {
    folder: {
      type: Object,
      required: true
    }
  },
  
  emits: ['folder-selected', 'folder-settings'],
  
  computed: {
    folderColor() {
      if (this.folder.classification) {
        const classId = this.folder.classification.id;
        
        // Color scheme based on folder classification
        const colors = {
          'red_camera_roll': '#dc2626',     // Red for RED camera
          'red_clip': '#ef4444',            // Lighter red for clips
          'arri_camera_roll': '#059669',    // Green for ARRI
          'vfx_sequence': '#7c3aed',        // Purple for VFX
          'vfx_shot': '#8b5cf6',           // Lighter purple
          'image_sequence': '#0ea5e9',      // Blue for sequences
          'proxies': '#f59e0b',            // Orange for proxies
          'deliverables': '#10b981',        // Emerald for deliverables
          'audio_stems': '#f97316',         // Orange for audio
          'generic_folder': '#6b7280'       // Gray for generic
        };
        
        return colors[classId] || '#3c5a9b';
      }
      return '#3c5a9b'; // Default blue
    }
  },
  
  methods: {
    selectFolder() {
      this.$emit('folder-selected', this.folder);
    },
    
    openFolderSettings() {
      this.$emit('folder-settings', this.folder);
    },
    
    getFolderTypeDisplay() {
      if (this.folder.classification) {
        return this.folder.classification.label || 'Folder';
      }
      return 'Folder';
    },
    
    getClassificationClass() {
      if (!this.folder.classification) return 'generic';
      
      const confidence = this.folder.classification.confidence || 0;
      if (confidence >= 0.8) return 'high-confidence';
      if (confidence >= 0.6) return 'medium-confidence';
      return 'low-confidence';
    },
    
    formatFileSize(bytes) {
      if (!bytes) return '';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
  }
};
</script>

<style scoped>
.folder-card {
  background-color: white;
  border-radius: 12px;
  border: 2px solid #dbeafe;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
  position: relative;
  transform: translateY(0);
}

.folder-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
  border-color: #93c5fd;
}

.item-header {
  padding: 12px 16px 16px 16px;
  background-color: white;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.header-content {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.2;
  color: #1f2937;
  margin: 0 0 4px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gear-button {
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  flex-shrink: 0;
}

.gear-button:hover {
  color: #374151;
  background-color: #f3f4f6;
}

.item-media {
  aspect-ratio: 16 / 9;
  background-color: white;
  position: relative;
  overflow: hidden;
  border-radius: 10px 10px 0 0;
  height: auto;
  min-height: 180px;
  padding: 12px;
}

.folder-icon-container {
  position: relative;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 8px;
}

.folder-icon {
  font-size: 64px;
  opacity: 0.7;
  transition: all 0.2s ease;
}

.folder-card:hover .folder-icon {
  opacity: 0.9;
  transform: scale(1.03);
}

.folder-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
  padding: 12px;
  color: white;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.folder-card:hover .folder-overlay {
  opacity: 1;
}

.folder-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-count, .subfolder-count {
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
}

.item-metadata {
  font-size: 13px;
  color: #6b7280;
  font-weight: 400;
  margin: 0;
  line-height: 1.2;
}


</style>