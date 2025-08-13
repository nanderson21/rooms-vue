<template>
  <div class="folder-card" @click="selectFolder">
    <div class="item-header">
      <h3 class="item-title">{{ folder.name }}</h3>
      <div class="folder-actions">
        <button 
          class="gear-button" 
          @click.stop="openFolderSettings"
          :title="`Settings for ${folder.name}`"
        >
          <font-awesome-icon :icon="['fas', 'cog']" />
        </button>
      </div>
    </div>
    
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
    
    <div class="folder-meta">
      <p class="folder-type">
        {{ getFolderTypeDisplay() }}
      </p>
      <p v-if="folder.size" class="folder-size">
        {{ formatFileSize(folder.size) }}
      </p>
      <div v-if="folder.classification" class="folder-classification">
        <span class="classification-badge" :class="getClassificationClass()">
          {{ folder.classification.label || 'Generic Folder' }}
        </span>
      </div>
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
  background-color: #fff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
  position: relative;
}

.folder-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border-color: #d1d5db;
}

.item-header {
  padding: 16px 16px 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.item-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0;
  flex: 1;
  line-height: 1.4;
}

.folder-actions {
  display: flex;
  align-items: center;
  margin-left: 12px;
}

.gear-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.gear-button:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.item-media {
  padding: 0 16px 16px 16px;
}

.folder-icon-container {
  position: relative;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 8px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.folder-icon {
  font-size: 48px;
  opacity: 0.8;
  transition: all 0.2s ease;
}

.folder-card:hover .folder-icon {
  opacity: 1;
  transform: scale(1.05);
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

.folder-meta {
  padding: 0 16px 16px 16px;
}

.folder-type {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 4px 0;
  font-weight: 500;
}

.folder-size {
  font-size: 12px;
  color: #9ca3af;
  margin: 0 0 8px 0;
}

.folder-classification {
  margin-top: 8px;
}

.classification-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  line-height: 1;
}

.classification-badge.high-confidence {
  background-color: #dcfce7;
  color: #166534;
}

.classification-badge.medium-confidence {
  background-color: #fef3c7;
  color: #92400e;
}

.classification-badge.low-confidence {
  background-color: #fee2e2;
  color: #991b1b;
}

.classification-badge.generic {
  background-color: #f3f4f6;
  color: #6b7280;
}
</style>