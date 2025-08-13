<template>
  <EmbeddedCollectionView
    :collection="adaptedCollection"
    :items="adaptedItems"
    @item-selected="handleItemSelected"
    @back-to-collection="handleBackToCollection"
  />
</template>

<script>
import { computed, watch } from 'vue';
import EmbeddedCollectionView from './EmbeddedCollectionView.vue';
import { roomService } from '../services/roomService.js';

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

  emits: ['item-selected', 'back-to-collection'],

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
        fileHandle: file.handle // Keep handle for video playback
      }));
    });

    // Handle item selection
    const handleItemSelected = (item) => {
      emit('item-selected', item);
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
      handleItemSelected,
      handleBackToCollection
    };
  }
};
</script>

<style scoped>
/* No additional styles needed - inherits from EmbeddedCollectionView */
</style>