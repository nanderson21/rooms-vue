<template>
  <div class="room-settings-overlay" @click="handleOverlayClick">
    <div class="room-settings-modal" @click.stop>
      <div class="settings-header">
        <h2 class="settings-title">Room Settings</h2>
        <p class="settings-subtitle">{{ roomData?.name || 'Configure folder roles and metadata' }}</p>
        <button class="close-button" @click="$emit('close')">
          <font-awesome-icon :icon="['fas', 'times']" />
        </button>
      </div>

      <div class="settings-content">
        <!-- Left Panel: Directory Tree Navigation -->
        <div class="directory-panel">
          <div class="panel-header">
            <h3>Directory Structure</h3>
            <div class="panel-actions">
              <button class="scan-button" @click="scanDirectory" :disabled="isScanning">
                <font-awesome-icon :icon="['fas', isScanning ? 'spinner' : 'sync-alt']" :spin="isScanning" />
                {{ isScanning ? 'Scanning...' : 'Scan' }}
              </button>
            </div>
          </div>
          
          <div class="directory-tree" v-if="directoryTree.length > 0">
            <DirectoryTreeNode
              v-for="node in directoryTree"
              :key="node.path"
              :node="node"
              :level="0"
              :selectedPath="selectedFolderPath"
              @select-folder="selectFolder"
              @toggle-folder="toggleFolder"
            />
          </div>
          
          <div v-else class="empty-tree">
            <p>No folders found</p>
            <button @click="scanDirectory" class="scan-button-small">
              Scan Directory
            </button>
          </div>
        </div>

        <!-- Right Panel: Folder Role Assignment -->
        <div class="role-panel">
          <div class="panel-header">
            <h3>Folder Role Assignment</h3>
            <div v-if="selectedFolder" class="selected-folder-info">
              <font-awesome-icon :icon="['fas', 'folder']" />
              <span>{{ selectedFolder.name }}</span>
            </div>
          </div>

          <div v-if="selectedFolder" class="role-assignment">
            <!-- Current Classification -->
            <div class="current-classification" v-if="selectedFolder.classification">
              <h4>Current Classification</h4>
              <div class="classification-display">
                <span class="classification-badge" :class="getConfidenceClass(selectedFolder.classification)">
                  {{ selectedFolder.classification.label }}
                </span>
                <span class="confidence-score">
                  {{ Math.round((selectedFolder.classification.confidence || 0) * 100) }}% confidence
                </span>
              </div>
            </div>

            <!-- Role Selection -->
            <div class="role-selection">
              <h4>Assign Role</h4>
              
              <!-- Parent Role Selection -->
              <div class="role-group">
                <label>Parent Role:</label>
                <select v-model="selectedParentRole" @change="onParentRoleChange" class="role-select">
                  <option value="">Select parent role...</option>
                  <optgroup v-for="category in folderRoleHierarchy" :key="category.name" :label="category.name">
                    <option v-for="role in category.roles" :key="role.id" :value="role.id">
                      {{ role.name }}
                    </option>
                  </optgroup>
                </select>
              </div>

              <!-- Child Role Selection -->
              <div class="role-group" v-if="selectedParentRole && availableChildRoles.length > 0">
                <label>Child Role:</label>
                <select v-model="selectedChildRole" class="role-select">
                  <option value="">Select child role...</option>
                  <option v-for="role in availableChildRoles" :key="role.id" :value="role.id">
                    {{ role.name }}
                  </option>
                </select>
              </div>

              <!-- Role Description -->
              <div v-if="selectedRoleInfo" class="role-description">
                <h5>{{ selectedRoleInfo.name }}</h5>
                <p>{{ selectedRoleInfo.description }}</p>
                <div v-if="selectedRoleInfo.expectedFormats?.length" class="expected-formats">
                  <strong>Expected formats:</strong>
                  <span class="format-tags">
                    <span v-for="format in selectedRoleInfo.expectedFormats" :key="format" class="format-tag">
                      {{ format }}
                    </span>
                  </span>
                </div>
              </div>

              <!-- Apply Button -->
              <div class="role-actions">
                <button 
                  @click="applyRoleAssignment" 
                  :disabled="!selectedParentRole"
                  class="apply-button"
                >
                  Apply Role Assignment
                </button>
                <button 
                  @click="clearRoleAssignment" 
                  v-if="selectedFolder.assignedRole"
                  class="clear-button"
                >
                  Clear Role
                </button>
              </div>
            </div>

            <!-- Metadata Fields -->
            <div class="metadata-section" v-if="selectedFolder.assignedRole">
              <h4>Metadata Fields</h4>
              <div v-if="roleMetadataFields.length > 0" class="metadata-fields">
                <div v-for="field in roleMetadataFields" :key="field.name" class="field-row">
                  <label :for="`field-${field.name}`">{{ field.label }}</label>
                  <component
                    :is="getFieldComponent(field.type)"
                    :id="`field-${field.name}`"
                    v-model="folderMetadata[field.name]"
                    :field="field"
                    :placeholder="field.placeholder"
                    :required="field.required"
                  />
                </div>
              </div>
              <p v-else class="no-fields">No additional metadata fields for this role.</p>
            </div>
          </div>

          <div v-else class="no-selection">
            <div class="no-selection-content">
              <font-awesome-icon :icon="['fas', 'arrow-left']" />
              <p>Select a folder from the directory tree to configure its role and metadata.</p>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-footer">
        <button @click="saveSettings" class="save-button" :disabled="!hasChanges">
          Save Changes
        </button>
        <button @click="$emit('close')" class="cancel-button">
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import DirectoryTreeNode from './DirectoryTreeNode.vue';
import { roomService } from '../services/roomService.js';
import { folderRolePersistence } from '../services/folderRolePersistence.js';

export default {
  name: 'RoomSettings',
  
  components: {
    DirectoryTreeNode
  },
  
  props: {
    roomId: {
      type: String,
      required: true
    },
    selectedFolderPath: {
      type: String,
      default: null
    }
  },
  
  emits: ['close', 'settings-saved'],
  
  setup(props, { emit }) {
    // State
    const roomData = ref(null);
    const directoryTree = ref([]);
    const selectedFolder = ref(null);
    const isScanning = ref(false);
    const selectedParentRole = ref('');
    const selectedChildRole = ref('');
    const folderMetadata = ref({});
    const hasChanges = ref(false);
    
    // Folder Role Hierarchy from NickNotes-Aug13.md
    const folderRoleHierarchy = ref([
      {
        name: 'Media Assets',
        roles: [
          {
            id: 'video_source',
            name: 'Video - Source',
            description: 'Source assets from production directly from camera media',
            expectedFormats: ['.R3D', '.MXF', '.MP4', '.MOV', '.CINE', '.MTS'],
            children: [
              { id: 'red_camera_roll', name: 'RED Camera Roll', description: 'RED camera magazine containing .RDC clip folders' },
              { id: 'arri_camera_roll', name: 'ARRI Camera Roll', description: 'ARRI camera roll structure' },
              { id: 'sony_xavc', name: 'Sony XAVC', description: 'Sony XAVC format captures' }
            ]
          },
          {
            id: 'video_master',
            name: 'Video - Master',
            description: 'Master assets created from source clips for final master',
            expectedFormats: ['.MXF', '.MOV', '.DPX', '.EXR', '.TIFF'],
            children: []
          },
          {
            id: 'video_mezzanine',
            name: 'Video - Mezzanine',
            description: 'Mezzanine assets created from source material for editorial process',
            expectedFormats: ['.MXF', '.MOV', '.AVI'],
            children: []
          },
          {
            id: 'video_proxy',
            name: 'Video - Proxy',
            description: 'Lower quality proxy versions for reference',
            expectedFormats: ['.MP4', '.MOV'],
            children: []
          },
          {
            id: 'audio_source',
            name: 'Audio - Source',
            description: 'Audio files captured during production',
            expectedFormats: ['.WAV', '.AIFF', '.BWF'],
            children: [
              { id: 'audio_music', name: 'Music', description: 'Music-related audio assets' },
              { id: 'audio_sfx', name: 'Sound Effects', description: 'Non-dialogue sound files created after production' },
              { id: 'audio_mixes', name: 'Mixes', description: 'Sample mixes from sound designer/mixer' },
              { id: 'audio_voiceover', name: 'Voiceover/ADR', description: 'Non-production dialogue recordings' }
            ]
          },
          {
            id: 'vfx_shots',
            name: 'VFX - Shots',
            description: 'Visual effects sequence and shot folders',
            expectedFormats: ['.EXR', '.DPX', '.TIFF', '.PNG'],
            children: [
              { id: 'vfx_working', name: 'Working Folder', description: 'VFX artist sandbox for shot work' }
            ]
          },
          {
            id: 'vfx_elements',
            name: 'VFX - Elements',
            description: 'VFX elements and CGI assets',
            expectedFormats: ['.EXR', '.DPX', '.TIFF', '.PNG'],
            children: [
              { id: 'vfx_elements_working', name: 'Working Folder', description: 'CGI elements workspace' },
              { id: 'vfx_elements_final', name: 'Final Assets', description: 'Finished elements for use in shots' },
              { id: 'vfx_elements_reference', name: 'Reference Renders', description: 'Reference elements for previs work' }
            ]
          },
          {
            id: 'graphics_source',
            name: 'Graphics (GFX) - Source',
            description: 'Images in format and folder structure from camera card',
            expectedFormats: ['.RAW', '.JPEG', '.TIFF', '.PNG'],
            children: [
              { id: 'graphics_bts', name: 'Behind the Scenes', description: 'Making-of project stills' },
              { id: 'graphics_images', name: 'Images', description: 'Image files used in edit' }
            ]
          }
        ]
      },
      {
        name: 'Project Files',
        roles: [
          {
            id: 'editorial',
            name: 'Editorial',
            description: 'Adobe Premiere project files and editorial assets',
            expectedFormats: ['.PRPROJ', '.AAF', '.XML'],
            children: []
          },
          {
            id: 'vfx_projects',
            name: 'VFX Projects',
            description: 'VFX project files and scripts',
            expectedFormats: ['.NUK', '.AEP', '.FLAME'],
            children: [
              { id: 'vfx_compositing', name: 'Compositing', description: 'Nuke X, Fusion Studio, After Effects, Flame projects' },
              { id: 'vfx_cgi', name: 'CGI', description: 'Maya, 3ds Max, Cinema 4D projects' }
            ]
          },
          {
            id: 'color_projects',
            name: 'Color',
            description: 'DaVinci Resolve projects and color assets',
            expectedFormats: ['.DRP', '.CUBE', '.CDL'],
            children: []
          },
          {
            id: 'audio_projects',
            name: 'Audio',
            description: 'Audio session files from Pro Tools, Logic, Audition',
            expectedFormats: ['.PTX', '.LOGICX', '.SESX'],
            children: []
          }
        ]
      },
      {
        name: 'Finishing',
        roles: [
          {
            id: 'editorial_picture_lock',
            name: 'Editorial Picture Lock',
            description: 'Picture lock bundle with Premiere project and assets',
            expectedFormats: ['.PRPROJ'],
            children: []
          },
          {
            id: 'editor_to_color',
            name: 'Editor to Color',
            description: 'Managed bundle for colorist with baked effects',
            expectedFormats: ['.PRPROJ', '.XML'],
            children: []
          },
          {
            id: 'editor_to_audio',
            name: 'Editor to Audio',
            description: 'OMF/AAF assets for sound designer or mixer',
            expectedFormats: ['.OMF', '.AAF'],
            children: []
          },
          {
            id: 'editor_to_vfx',
            name: 'Editor to VFX',
            description: 'Prepared assets for VFX artist shots',
            expectedFormats: ['.XML', '.EDL'],
            children: []
          },
          {
            id: 'color_finish',
            name: 'Color Finish',
            description: 'Completed media managed assets and Resolve project',
            expectedFormats: ['.DRP'],
            children: []
          },
          {
            id: 'audio_finish',
            name: 'Audio Finish',
            description: 'All finished assets of audio session',
            expectedFormats: ['.WAV', '.AIFF'],
            children: []
          },
          {
            id: 'vfx_delivery',
            name: 'VFX Delivery',
            description: 'Finished VFX assets and project files',
            expectedFormats: ['.EXR', '.DPX'],
            children: []
          },
          {
            id: 'master_bundle',
            name: 'Master',
            description: 'All assets needed to bring back project in future',
            expectedFormats: ['.*'],
            children: []
          }
        ]
      },
      {
        name: 'Exports',
        roles: [
          {
            id: 'review_editorial',
            name: 'Review - Editorial',
            description: 'Edits ready for review with version tracking',
            expectedFormats: ['.MOV', '.MP4'],
            children: []
          },
          {
            id: 'review_audio',
            name: 'Review - Audio',
            description: 'Sound mixes ready for review',
            expectedFormats: ['.WAV', '.AIFF'],
            children: []
          },
          {
            id: 'review_color',
            name: 'Review - Color',
            description: 'Color passes ready for review',
            expectedFormats: ['.MOV', '.MP4'],
            children: []
          },
          {
            id: 'review_vfx',
            name: 'Review - VFX',
            description: 'VFX shots ready for review',
            expectedFormats: ['.MOV', '.MP4', '.EXR'],
            children: []
          },
          {
            id: 'deliverables_master',
            name: 'Deliverables - Master',
            description: 'Final master deliverables',
            expectedFormats: ['.MOV', '.MXF'],
            children: [
              { id: 'deliverables_master_final', name: 'Master', description: 'Highest quality final cut' },
              { id: 'deliverables_archival', name: 'Archival', description: 'Future-ready linear archive master' },
              { id: 'deliverables_web', name: 'Web', description: 'Web distribution transcodes' },
              { id: 'deliverables_broadcast', name: 'Broadcast', description: 'Broadcast distribution transcodes' }
            ]
          }
        ]
      },
      {
        name: 'Other',
        roles: [
          {
            id: 'documents',
            name: 'Documents',
            description: 'Text information and documentation',
            expectedFormats: ['.PDF', '.DOCX', '.TXT'],
            children: []
          }
        ]
      }
    ]);
    
    // Computed properties
    const selectedFolderPath = ref(props.selectedFolderPath);
    
    const availableChildRoles = computed(() => {
      if (!selectedParentRole.value) return [];
      
      // Find the parent role
      let parentRole = null;
      for (const category of folderRoleHierarchy.value) {
        const role = category.roles.find(r => r.id === selectedParentRole.value);
        if (role) {
          parentRole = role;
          break;
        }
      }
      
      return parentRole?.children || [];
    });
    
    const selectedRoleInfo = computed(() => {
      if (selectedChildRole.value && availableChildRoles.value.length > 0) {
        return availableChildRoles.value.find(r => r.id === selectedChildRole.value);
      } else if (selectedParentRole.value) {
        // Find parent role info
        for (const category of folderRoleHierarchy.value) {
          const role = category.roles.find(r => r.id === selectedParentRole.value);
          if (role) return role;
        }
      }
      return null;
    });
    
    const roleMetadataFields = computed(() => {
      // Return metadata fields based on selected role
      // This would be dynamically generated based on the role
      return [];
    });
    
    // Methods
    const handleOverlayClick = (event) => {
      if (event.target.classList.contains('room-settings-overlay')) {
        emit('close');
      }
    };
    
    const scanDirectory = async () => {
      isScanning.value = true;
      try {
        // Get room data and build directory tree
        roomData.value = roomService.getRoom(props.roomId);
        directoryTree.value = buildDirectoryTree(roomData.value?.files || []);
        
        // Load and apply existing folder roles
        const savedRoles = folderRolePersistence.loadFolderRoles(props.roomId);
        if (savedRoles) {
          directoryTree.value = folderRolePersistence.applyFolderRolesToTree(
            directoryTree.value, 
            savedRoles
          );
          console.log('Applied saved folder roles to directory tree');
        }
      } catch (error) {
        console.error('Error scanning directory:', error);
      } finally {
        isScanning.value = false;
      }
    };
    
    const buildDirectoryTree = (files) => {
      const folderMap = new Map();
      
      files.forEach(file => {
        let fullPath = '';
        if (file.fullPath) {
          fullPath = file.fullPath;
        } else if (file.path && file.name) {
          fullPath = file.path ? `${file.path}/${file.name}` : file.name;
        } else if (file.name) {
          fullPath = file.name;
        } else {
          return;
        }
        
        const pathParts = fullPath.split('/').filter(p => p);
        if (pathParts.length <= 1) return;
        
        for (let i = 0; i < pathParts.length - 1; i++) {
          const folderPath = pathParts.slice(0, i + 1).join('/');
          const folderName = pathParts[i];
          
          if (!folderMap.has(folderPath)) {
            folderMap.set(folderPath, {
              name: folderName,
              path: folderPath,
              children: new Map(),
              isExpanded: false,
              fileCount: 0,
              assignedRole: null,
              classification: {
                id: 'generic_folder',
                label: 'Folder',
                confidence: 0.5
              }
            });
          }
          
          folderMap.get(folderPath).fileCount++;
        }
      });
      
      // Convert to tree structure
      const rootFolders = [];
      folderMap.forEach((folder, folderPath) => {
        const pathParts = folderPath.split('/');
        if (pathParts.length === 1) {
          rootFolders.push({
            ...folder,
            children: Array.from(folder.children?.values() || [])
          });
        } else {
          const parentPath = pathParts.slice(0, -1).join('/');
          const parentFolder = folderMap.get(parentPath);
          if (parentFolder) {
            parentFolder.children.set(folderPath, folder);
          }
        }
      });
      
      return rootFolders;
    };
    
    const selectFolder = (folder) => {
      selectedFolder.value = folder;
      selectedFolderPath.value = folder.path;
      
      // Load existing role assignment if any
      if (folder.assignedRole) {
        selectedParentRole.value = folder.assignedRole.parentId || '';
        selectedChildRole.value = folder.assignedRole.childId || '';
        
        // Load metadata if available
        if (folder.metadata) {
          folderMetadata.value = { ...folder.metadata };
        }
      } else {
        selectedParentRole.value = '';
        selectedChildRole.value = '';
        folderMetadata.value = {};
      }
    };
    
    const toggleFolder = (folder) => {
      folder.isExpanded = !folder.isExpanded;
    };
    
    const onParentRoleChange = () => {
      selectedChildRole.value = '';
      hasChanges.value = true;
    };
    
    const getConfidenceClass = (classification) => {
      const confidence = classification.confidence || 0;
      if (confidence >= 0.8) return 'high-confidence';
      if (confidence >= 0.6) return 'medium-confidence';
      return 'low-confidence';
    };
    
    const getFieldComponent = (fieldType) => {
      switch (fieldType) {
        case 'select':
          return 'select';
        case 'textarea':
          return 'textarea';
        case 'number':
          return 'input';
        case 'date':
          return 'input';
        default:
          return 'input';
      }
    };
    
    const applyRoleAssignment = () => {
      if (!selectedFolder.value || !selectedParentRole.value) return;
      
      selectedFolder.value.assignedRole = {
        parentId: selectedParentRole.value,
        childId: selectedChildRole.value,
        assignedAt: new Date().toISOString()
      };
      
      // Save metadata
      selectedFolder.value.metadata = {
        ...selectedFolder.value.metadata,
        ...folderMetadata.value,
        lastModified: new Date().toISOString()
      };
      
      hasChanges.value = true;
      console.log('Applied role assignment:', selectedFolder.value.assignedRole);
    };
    
    const clearRoleAssignment = () => {
      if (!selectedFolder.value) return;
      
      selectedFolder.value.assignedRole = null;
      selectedParentRole.value = '';
      selectedChildRole.value = '';
      hasChanges.value = true;
    };
    
    const saveSettings = () => {
      try {
        console.log('Saving room settings...');
        
        // Extract folder roles from directory tree
        const folderRoles = folderRolePersistence.extractFolderRolesFromTree(directoryTree.value);
        
        // Save to localStorage
        const saved = folderRolePersistence.saveFolderRoles(props.roomId, folderRoles);
        
        if (saved) {
          console.log('Successfully saved folder roles');
          hasChanges.value = false;
          
          emit('settings-saved', {
            roomId: props.roomId,
            folderRoles: folderRoles,
            directoryTree: directoryTree.value
          });
          
          emit('close');
        } else {
          console.error('Failed to save folder roles');
          // Could show an error message to user here
        }
      } catch (error) {
        console.error('Error saving settings:', error);
        // Could show an error message to user here
      }
    };
    
    // Lifecycle
    onMounted(() => {
      scanDirectory();
    });
    
    watch(() => props.selectedFolderPath, (newPath) => {
      if (newPath) {
        // Find and select the folder
        const findFolder = (folders, path) => {
          for (const folder of folders) {
            if (folder.path === path) {
              selectFolder(folder);
              return;
            }
            if (folder.children?.length > 0) {
              findFolder(folder.children, path);
            }
          }
        };
        findFolder(directoryTree.value, newPath);
      }
    });
    
    return {
      roomData,
      directoryTree,
      selectedFolder,
      selectedFolderPath,
      isScanning,
      folderRoleHierarchy,
      selectedParentRole,
      selectedChildRole,
      availableChildRoles,
      selectedRoleInfo,
      roleMetadataFields,
      folderMetadata,
      hasChanges,
      handleOverlayClick,
      scanDirectory,
      selectFolder,
      toggleFolder,
      onParentRoleChange,
      getConfidenceClass,
      getFieldComponent,
      applyRoleAssignment,
      clearRoleAssignment,
      saveSettings
    };
  }
};
</script>

<style scoped>
.room-settings-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.room-settings-modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  width: 100%;
  max-width: 1200px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.settings-header {
  padding: 24px 24px 16px 24px;
  border-bottom: 1px solid #e5e7eb;
  position: relative;
}

.settings-title {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0 40px 4px 0;
}

.settings-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.close-button {
  position: absolute;
  top: 24px;
  right: 24px;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-button:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.settings-content {
  display: flex;
  flex: 1;
  min-height: 0;
}

.directory-panel {
  width: 320px;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.role-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.panel-header {
  padding: 20px;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.panel-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.panel-actions {
  display: flex;
  gap: 8px;
}

.scan-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.scan-button:hover:not(:disabled) {
  background: #e5e7eb;
}

.scan-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.selected-folder-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #6b7280;
  margin-top: 4px;
}

.directory-tree {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.empty-tree {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  padding: 40px 20px;
}

.empty-tree p {
  margin: 0 0 16px 0;
  font-size: 14px;
}

.scan-button-small {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.scan-button-small:hover {
  background: #2563eb;
}

.role-assignment {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
}

.current-classification {
  margin-bottom: 24px;
}

.current-classification h4 {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px 0;
}

.classification-display {
  display: flex;
  align-items: center;
  gap: 12px;
}

.classification-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
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

.confidence-score {
  font-size: 12px;
  color: #6b7280;
}

.role-selection h4 {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px 0;
}

.role-group {
  margin-bottom: 16px;
}

.role-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.role-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  color: #111827;
}

.role-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.role-description {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
}

.role-description h5 {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px 0;
}

.role-description p {
  font-size: 13px;
  color: #6b7280;
  margin: 0 0 12px 0;
  line-height: 1.5;
}

.expected-formats {
  font-size: 12px;
}

.format-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.format-tag {
  background: #e5e7eb;
  color: #374151;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 11px;
}

.role-actions {
  display: flex;
  gap: 8px;
  margin-top: 20px;
}

.apply-button {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.apply-button:hover:not(:disabled) {
  background: #2563eb;
}

.apply-button:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.clear-button {
  padding: 8px 16px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-button:hover {
  background: #e5e7eb;
}

.metadata-section {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

.metadata-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px 0;
}

.field-row {
  margin-bottom: 16px;
}

.field-row label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.field-row input,
.field-row select,
.field-row textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
}

.field-row input:focus,
.field-row select:focus,
.field-row textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.no-fields {
  font-size: 13px;
  color: #9ca3af;
  font-style: italic;
  margin: 0;
}

.no-selection {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-selection-content {
  text-align: center;
  color: #9ca3af;
  max-width: 280px;
}

.no-selection-content .fa-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.no-selection-content p {
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
}

.settings-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-shrink: 0;
}

.save-button {
  padding: 8px 16px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.save-button:hover:not(:disabled) {
  background: #059669;
}

.save-button:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.cancel-button {
  padding: 8px 16px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-button:hover {
  background: #e5e7eb;
}
</style>