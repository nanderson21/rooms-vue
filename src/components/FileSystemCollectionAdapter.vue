<template>
  <EmbeddedCollectionView
    :collection="adaptedCollection"
    :items="adaptedItems"
    :folders="adaptedFolders"
    @item-selected="handleItemSelected"
    @folder-selected="handleFolderSelected"
    @folder-settings="handleFolderSettings"
    @back-to-collection="handleBackToCollection"
  />
</template>

<script>
import { computed, watch } from 'vue';
import EmbeddedCollectionView from './EmbeddedCollectionView.vue';
import { roomService } from '../services/roomService.js';
import { folderRolePersistence } from '../services/folderRolePersistence.js';

export default {
  name: 'FileSystemCollectionAdapter',
  
  components: {
    EmbeddedCollectionView
  },

  props: {
    roomId: {
      type: String,
      required: true
    }
  },

  emits: ['item-selected', 'folder-selected', 'folder-settings', 'back-to-collection'],

  setup(props, { emit }) {
    // Get reactive room data
    const room = computed(() => roomService.getRoom(props.roomId));

    // Adapt room data to look like a collection
    const adaptedCollection = computed(() => {
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
        statusText: getStatusText(room.value.status)
      };
    });

    // Extract folders from the room's folder tree
    const extractFoldersFromTree = (room) => {
      if (!room?.files) return [];
      
      const folderMap = new Map();
      
      // Build folder structure from file paths
      room.files.forEach(file => {
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
      if (!room.value) return [];
      
      const folders = extractFoldersFromTree(room.value);
      
      // Load saved folder roles
      const savedRoles = folderRolePersistence.loadFolderRoles(props.roomId);
      
      return folders.map(folder => {
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

    // Adapt files to look like collection items
    const adaptedItems = computed(() => {
      if (!room.value || !room.value.files) {
        return [];
      }

      return room.value.files.map(file => ({
        id: file.id,
        title: file.name,
        description: file.description || `${file.type || 'File'} • ${formatFileSize(file.size)}`,
        thumbnail: file.thumbnail,
        spriteUrl: file.spriteUrl,
        previewVideo: null, // Will be created by video player when needed
        mimetype: file.type,
        filetype: getFileType(file.type),
        filesize: formatFileSize(file.size),
        duration: file.duration || file.formattedDuration,
        width: file.width,
        height: file.height,
        createdDate: formatDate(file.lastModified),
        modifiedDate: formatDate(file.lastModified),
        // Add filesystem-specific properties
        path: file.path,
        isLocal: true,
        fileHandle: file.handle // Keep handle for video playbook
      }));
    });

    // Handle item selection
    const handleItemSelected = (item) => {
      emit('item-selected', item);
    };

    // Handle folder selection
    const handleFolderSelected = (folder) => {
      emit('folder-selected', folder);
    };

    // Handle folder settings
    const handleFolderSettings = (folder) => {
      emit('folder-settings', folder);
    };

    // Handle back to collection
    const handleBackToCollection = () => {
      emit('back-to-collection');
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


    return {
      adaptedCollection,
      adaptedItems,
      adaptedFolders,
      handleItemSelected,
      handleFolderSelected,
      handleFolderSettings,
      handleBackToCollection
    };
  }
};
</script>

<style scoped>
/* No additional styles needed - inherits from EmbeddedCollectionView */
</style>