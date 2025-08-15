<template>
  <EmbeddedRoomView
    :room="adaptedRoom"
    :items="adaptedItems"
    :folders="adaptedFolders"
    :breadcrumbs="breadcrumbs"
    :currentFolderPath="currentFolderPath"
    :selectedFileId="selectedFileId"
    @item-selected="handleItemSelected"
    @folder-selected="handleFolderSelected"
    @folder-settings="handleFolderSettings"
    @back-to-room="handleBackToRoom"
    @navigate-to-root="navigateToRoot"
    @navigate-to-folder="navigateToFolder"
  />
</template>

<script>
import { computed, watch, ref } from 'vue';
import EmbeddedRoomView from './EmbeddedRoomView.vue';
import { roomService } from '../services/roomService.js';
import { folderRolePersistence } from '../services/folderRolePersistence.js';

export default {
  name: 'FileSystemRoomAdapter',
  
  components: {
    EmbeddedRoomView
  },

  props: {
    roomId: {
      type: String,
      required: true
    },
    currentFolderPath: {
      type: String,
      default: null
    },
    selectedFileId: {
      type: String,
      default: null
    }
  },

  emits: ['item-selected', 'folder-selected', 'folder-settings', 'back-to-room'],

  setup(props, { emit }) {
    // Navigation state
    const currentFolderPath = ref(null);
    const breadcrumbs = ref([]);
    
    // Get reactive room data
    const room = computed(() => roomService.getRoom(props.roomId));
    
    // Live files data
    const roomFiles = ref([]);
    const isLoadingFiles = ref(false);
    
    // Load files for the room
    const loadRoomFiles = async () => {
      if (!props.roomId) return;
      
      isLoadingFiles.value = true;
      try {
        const files = await roomService.getLiveRoomFiles(props.roomId);
        roomFiles.value = files;
      } catch (error) {
        console.error('Error loading room files in adapter:', error);
        roomFiles.value = [];
      } finally {
        isLoadingFiles.value = false;
      }
    };

    // Adapt room data to look like a room
    const adaptedRoom = computed(() => {
      if (!room.value) {
        return {
          id: props.roomId,
          title: 'Loading...',
          totalSize: '0 B',
          status: 'loading'
        };
      }

      return {
        id: room.value.id,
        title: room.value.title,
        description: room.value.description,
        thumbnail: room.value.thumbnail,
        totalSize: room.value.totalSize,
        status: room.value.status || 'ready',
        statusText: getStatusText(room.value.status),
        type: room.value.type || 'filesystem', // Ensure type is included for comment persistence
        dbManager: room.value.dbManager // Critical: Include database manager for comment persistence
      };
    });

    // Extract folders from the room's folder tree
    const extractFoldersFromTree = (files) => {
      if (!files || !files.length) return [];
      
      const folderMap = new Map();
      
      // Build folder structure from file paths
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
        if (pathParts.length <= 1) return; // Skip files in root
        
        // Process each folder level
        for (let i = 0; i < pathParts.length - 1; i++) {
          const folderPath = pathParts.slice(0, i + 1).join('/');
          const folderName = pathParts[i];
          
          if (!folderMap.has(folderPath)) {
            folderMap.set(folderPath, {
              id: `folder-${folderPath}`,
              name: folderName,
              path: folderPath,
              fileCount: 0,
              subfolderCount: 0,
              size: 0,
              files: []
            });
          }
          
          // Add file to folder
          const folder = folderMap.get(folderPath);
          folder.files.push(file);
          folder.fileCount++;
          folder.size += file.size || 0;
        }
      });
      
      // Calculate subfolder counts
      folderMap.forEach((folder, folderPath) => {
        folderMap.forEach((otherFolder, otherPath) => {
          if (otherPath !== folderPath && otherPath.startsWith(folderPath + '/')) {
            const relativePath = otherPath.substring(folderPath.length + 1);
            if (!relativePath.includes('/')) {
              folder.subfolderCount++;
            }
          }
        });
      });
      
      return Array.from(folderMap.values());
    };

    // Adapt folders for display
    const adaptedFolders = computed(() => {
      if (!roomFiles.value.length) return [];
      
      const allFolders = extractFoldersFromTree(roomFiles.value);
      
      // Filter folders based on currentFolderPath
      const filteredFolders = allFolders.filter(folder => {
        if (!currentFolderPath.value) {
          // Show top-level folders (no slashes in path)
          return !folder.path.includes('/');
        } else {
          // Show folders directly within the current path
          const relativePath = folder.path.substring(currentFolderPath.value.length + 1);
          return folder.path.startsWith(currentFolderPath.value + '/') && !relativePath.includes('/');
        }
      });
      
      // Load saved folder roles
      const savedRoles = folderRolePersistence.loadFolderRoles(props.roomId);
      
      return filteredFolders.map(folder => {
        const savedRole = savedRoles?.[folder.path];
        
        return {
          id: folder.id,
          name: folder.name,
          path: folder.path,
          fileCount: folder.fileCount,
          subfolderCount: folder.subfolderCount,
          size: folder.size,
          files: folder.files,
          // Apply saved role if exists, otherwise use default classification
          assignedRole: savedRole?.assignedRole || null,
          metadata: savedRole?.metadata || {},
          classification: savedRole?.assignedRole ? {
            id: savedRole.assignedRole.childId || savedRole.assignedRole.parentId,
            label: getRoleLabel(savedRole.assignedRole),
            confidence: 1.0 // Manually assigned roles have 100% confidence
          } : {
            id: 'generic_folder',
            label: 'Folder',
            confidence: 0.5
          }
        };
      });
    });
    
    // Helper function to get role label
    const getRoleLabel = (assignedRole) => {
      if (!assignedRole) return 'Folder';
      
      // This is a simplified lookup - in a full implementation you'd lookup from the role hierarchy
      const roleLabels = {
        'video_source': 'Video Source',
        'red_camera_roll': 'RED Camera Roll',
        'red_clip_standalone': 'RED Clip',
        'arri_camera_roll': 'ARRI Camera Roll',
        'vfx_shots': 'VFX Shots',
        'vfx_elements': 'VFX Elements',
        'editorial': 'Editorial',
        'color_projects': 'Color',
        'audio_projects': 'Audio',
        'deliverables_master': 'Deliverables'
      };
      
      return roleLabels[assignedRole.childId] || 
             roleLabels[assignedRole.parentId] || 
             'Assigned Role';
    };

    // Helper function to determine if a file type should generate thumbnails
    const shouldGenerateThumbnail = (mimeType) => {
      if (!mimeType) return false;
      
      const thumbnailSupportedTypes = [
        'image/', // All image types
        'video/', // All video types  
        'application/pdf', // PDF files
        // Add other types that support thumbnail generation
      ];
      
      return thumbnailSupportedTypes.some(type => mimeType.startsWith(type));
    };

    // Adapt files to look like room items
    const adaptedItems = computed(() => {
      if (!roomFiles.value.length) {
        return [];
      }

      const filteredFiles = roomFiles.value.filter(file => {
        if (!file.fullPath) return false; // Skip files without a fullPath

        if (!currentFolderPath.value) {
          // Show top-level files
          return !file.fullPath.includes('/');
        } else {
          // Show files directly within the current path
          const relativePath = file.fullPath.substring(currentFolderPath.value.length + 1);
          return file.fullPath.startsWith(currentFolderPath.value + '/') && !relativePath.includes('/');
        }
      });

      return filteredFiles.map(file => ({
        id: file.id,
        title: file.name,
        description: file.description || `${file.type || 'File'} • ${formatFileSize(file.size)}`,
        thumbnail: file.thumbnail,
        spriteUrl: file.spriteUrl,
        previewVideo: null, // Will be created by video player when needed
        mimetype: file.type,
        filetype: getFileType(file.type),
        filesize: formatFileSize(file.size),
        duration: file.duration,
        formattedDuration: file.formattedDuration,
        width: file.width,
        height: file.height,
        createdDate: formatDate(file.lastModified),
        modifiedDate: formatDate(file.lastModified),
        // Add filesystem-specific properties
        path: file.path,
        isLocal: true,
        fileHandle: file.handle, // Keep handle for video playbook
        // Status indicators
        isOnline: file.isOnline !== false, // Default to online if not specified
        isOffline: file.isOffline === true, // Only true if explicitly set
        showOfflineIndicator: file.isOffline === true, // Show hazard icon for offline files
        isProcessing: file.isOnline && !file.thumbnail && !file.isOffline && shouldGenerateThumbnail(file.type) // Only show processing for files that should have thumbnails
      }));
    });

    // Handle item selection
    const handleItemSelected = (item) => {
      emit('item-selected', item);
    };

    // Handle folder selection (navigate into folder)
    const handleFolderSelected = (folder) => {
      currentFolderPath.value = folder.path;
      updateBreadcrumbs();
      emit('folder-selected', folder);
    };
    
    // Update breadcrumbs for navigation
    const updateBreadcrumbs = () => {
      if (!currentFolderPath.value) {
        breadcrumbs.value = [];
        return;
      }
      
      const parts = currentFolderPath.value.split('/').filter(p => p);
      breadcrumbs.value = parts.map((part, index) => ({
        name: part,
        path: parts.slice(0, index + 1).join('/')
      }));
    };
    
    // Navigate back up the folder hierarchy
    const navigateToFolder = (folderPath) => {
      currentFolderPath.value = folderPath;
      updateBreadcrumbs();
    };
    
    // Navigate to root
    const navigateToRoot = () => {
      currentFolderPath.value = null;
      breadcrumbs.value = [];
    };

    // Handle folder settings
    const handleFolderSettings = (folder) => {
      emit('folder-settings', folder);
    };

    // Handle back to room
    const handleBackToRoom = () => {
      emit('back-to-room');
    };

    // Utility functions
    const getStatusText = (status) => {
      switch (status) {
        case 'loading': return 'Loading...';
        case 'scanning': return 'Scanning';
        case 'processing': return 'Processing';
        case 'error': return 'Error';
        case 'ready': return 'Local Folder';
        default: return 'Active';
      }
    };

    const getFileType = (mimeType) => {
      if (!mimeType) return 'file';
      
      if (mimeType.startsWith('image/')) return 'image';
      if (mimeType.startsWith('video/')) return 'video';
      if (mimeType.startsWith('audio/')) return 'audio';
      if (mimeType.includes('pdf')) return 'pdf';
      
      return 'document';
    };

    const formatFileSize = (bytes) => {
      if (!bytes) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (timestamp) => {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleDateString();
    };

    // Load files when component mounts or roomId changes
    watch(() => props.roomId, loadRoomFiles, { immediate: true });

    return {
      adaptedRoom,
      adaptedItems,
      adaptedFolders,
      breadcrumbs,
      currentFolderPath,
      selectedFileId: computed(() => props.selectedFileId),
      roomFiles,
      isLoadingFiles,
      loadRoomFiles,
      handleItemSelected,
      handleFolderSelected,
      handleFolderSettings,
      navigateToFolder,
      navigateToRoot,
      handleBackToRoom
    };
  }
};
</script>

<style scoped>
/* No additional styles needed - inherits from EmbeddedRoomView */
</style>