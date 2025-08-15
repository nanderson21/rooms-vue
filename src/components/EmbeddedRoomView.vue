<template>
  <div class="embedded-room-view">
    <!-- Show media item detail if one is selected -->
    <div v-if="selectedMediaItem" class="media-detail-container">
      <div class="media-detail-header">
        <button @click="backToRoom" class="back-button">
          <font-awesome-icon :icon="['fas', 'arrow-left']" />
          <span>Back to {{ room.title || 'Room' }}</span>
        </button>
      </div>
      
      <!-- Embed the RoomItemDetail component -->
      <RoomItemDetail
        :roomId="room.id"
        :mediaItemId="selectedMediaItem.id"
        :mediaItem="selectedMediaItem"
        :room="room"
        :isEmbedded="true"
        class="embedded-media-detail"
      />
    </div>

    <!-- Show room grid when no item is selected -->
    <div v-else class="room-content">
      <div class="hero-section" v-if="room.id">
        <div class="hero-background">
          <img 
            :src="room.thumbnail || ''" 
            :alt="room.title || 'Room'"
            class="hero-image"
          />
          <div class="hero-overlay"></div>
        </div>
        
        <div class="hero-content">
          <h1 class="hero-title">
            {{ room.title || 'Room' }}
          </h1>
          
          <div class="hero-meta">
            <span class="hero-meta-text">
              {{ filteredItems.length }} items with video preview • {{ room.totalSize || '0 KB' }}
            </span>
            <div v-if="room.status !== 'default' && room.statusText" 
                 :class="getStatusClass(room.status)"
                 class="status-badge">
              <span class="status-icon">
                <svg v-if="room.status === 'secure'" viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <svg v-else viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </span>
              {{ room.statusText }}
            </div>
          </div>
        </div>
      </div>

      <!-- Breadcrumb Navigation -->
      <div v-if="breadcrumbs.length > 0" class="breadcrumb-nav">
        <nav class="breadcrumb-container">
          <button @click="$emit('navigate-to-root')" class="breadcrumb-item root">
            <font-awesome-icon :icon="['fas', 'home']" />
            <span>Root</span>
          </button>
          <span class="breadcrumb-separator">/</span>
          <template v-for="(crumb, index) in breadcrumbs" :key="crumb.path">
            <button 
              @click="$emit('navigate-to-folder', crumb.path)" 
              class="breadcrumb-item"
              :class="{ 'current': index === breadcrumbs.length - 1 }"
            >
              {{ crumb.name }}
            </button>
            <span v-if="index < breadcrumbs.length - 1" class="breadcrumb-separator">/</span>
          </template>
        </nav>
      </div>

      <!-- Main Content Area -->
      <div class="content-area">
        <!-- View toggles -->
        <div class="view-controls">
          <div class="view-toggles">
            <button 
              @click="setViewType('grid')" 
              :class="{ 'active': isGridView }"
              class="view-toggle-btn">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </button>
            <button 
              @click="setViewType('list')" 
              :class="{ 'active': !isGridView }"
              class="view-toggle-btn">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Content Grid/List -->
        <div class="content-container" :class="{'view-transitioning': isTransitioning}">
          <!-- Grid View -->
          <div v-if="isGridView" class="grid-view" :class="{ 'transitioning': isTransitioning }">
            <!-- Folder Cards -->
            <FolderCard
              v-for="folder in folders"
              :key="`folder-${folder.id}`"
              :folder="folder"
              @folder-selected="selectFolder"
              @folder-settings="openFolderSettings"
            />
            
            <!-- File Cards -->
            <div
              v-for="(item, index) in filteredItems" 
              :key="item.id"
              class="grid-item"
              :class="{ 'selected': selectedItemId === item.id }"
              @click="selectMediaItem(item)">
              <div class="item-media">
                <!-- Image items -->
                <div v-if="isImage(item)" class="item-thumbnail-container">
                  <div class="thumbnail-wrapper">
                    <!-- Show loading indicator if file is being processed -->
                    <div v-if="item.isProcessing" class="thumbnail-status-indicator processing">
                      <font-awesome-icon :icon="['fas', 'sync-alt']" spin />
                      <span>Processing...</span>
                    </div>
                    
                    <!-- Show offline indicator for offline files -->
                    <div v-else-if="item.isOffline" class="thumbnail-status-indicator offline">
                      <font-awesome-icon :icon="['fas', 'exclamation-triangle']" />
                      <span>Offline</span>
                    </div>
                    
                    <!-- Show image placeholder if no thumbnail available -->
                    <div v-else-if="!item.thumbnail" class="thumbnail-status-indicator placeholder">
                      <font-awesome-icon :icon="['fas', 'image']" />
                      <span>No Preview</span>
                    </div>
                    
                    <!-- Show actual thumbnail -->
                    <img 
                      v-else
                      :src="item.thumbnail" 
                      :alt="item.title" 
                      class="item-thumbnail"
                      @error="handleThumbnailError"
                    />
                  </div>
                </div>
                
                <!-- Video items -->
                <div v-else-if="isVideo(item)" class="item-thumbnail-container">
                  <div class="thumbnail-wrapper">
                    <!-- Show loading indicator if file is being processed -->
                    <div v-if="item.isProcessing" class="thumbnail-status-indicator processing">
                      <font-awesome-icon :icon="['fas', 'sync-alt']" spin />
                      <span>Processing...</span>
                    </div>
                    
                    <!-- Show offline indicator for offline files -->
                    <div v-else-if="item.isOffline" class="thumbnail-status-indicator offline">
                      <font-awesome-icon :icon="['fas', 'exclamation-triangle']" />
                      <span>Offline</span>
                    </div>
                    
                    <!-- Show video placeholder if no thumbnail available -->
                    <div v-else-if="!item.thumbnail" class="thumbnail-status-indicator placeholder">
                      <font-awesome-icon :icon="['fas', 'video']" />
                      <span>No Preview</span>
                    </div>
                    
                    <!-- Show scrubbing sprite if available -->
                    <ScrubbableImage
                      v-else-if="item.spriteUrl"
                      :spriteUrl="item.spriteUrl"
                      :width="300"
                      :height="200"
                      :rows="5"
                      :columns="10"
                    >
                      <template #overlay>
                        <div class="play-button-container">
                          <div class="play-button">
                            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                              <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                          </div>
                        </div>
                        <div v-if="item.duration && item.formattedDuration" class="duration-badge">{{ item.formattedDuration }}</div>
                      </template>
                    </ScrubbableImage>
                    
                    <!-- Show regular thumbnail -->
                    <img 
                      v-else
                      :src="item.thumbnail" 
                      :alt="item.title" 
                      class="item-thumbnail"
                      @error="handleThumbnailError"
                    />
                  </div>
                  
                  <!-- Play button and duration for non-sprite videos -->
                  <div v-if="!item.spriteUrl && item.thumbnail" class="play-button-container">
                    <div class="play-button">
                      <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                    </div>
                  </div>
                  <div v-if="!item.spriteUrl && item.duration && item.formattedDuration && item.thumbnail" class="duration-badge">{{ item.formattedDuration }}</div>
                </div>
                
                <!-- Audio items -->
                <div v-else-if="isAudio(item)" class="item-thumbnail-container">
                  <div class="thumbnail-wrapper">
                    <!-- Show loading indicator if file is being processed -->
                    <div v-if="item.isProcessing" class="thumbnail-status-indicator processing">
                      <font-awesome-icon :icon="['fas', 'sync-alt']" spin />
                      <span>Processing...</span>
                    </div>
                    
                    <!-- Show offline indicator for offline files -->
                    <div v-else-if="item.isOffline" class="thumbnail-status-indicator offline">
                      <font-awesome-icon :icon="['fas', 'exclamation-triangle']" />
                      <span>Offline</span>
                    </div>
                    
                    <!-- Show thumbnail if available -->
                    <img 
                      v-else-if="item.thumbnail"
                      :src="item.thumbnail" 
                      :alt="item.title" 
                      class="item-thumbnail"
                      @error="handleThumbnailError"
                    />
                  </div>
                  
                  <!-- Audio icon overlay (always show for audio files) -->
                  <div class="audio-icon-container">
                    <div class="audio-icon">
                      <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="2" fill="none">
                        <path d="M9 18V5l12-2v13"></path>
                        <circle cx="6" cy="18" r="3"></circle>
                        <circle cx="18" cy="16" r="3"></circle>
                      </svg>
                    </div>
                  </div>
                </div>
                
                <!-- Document items -->
                <div v-else class="item-thumbnail-container document-container">
                  <!-- Show loading indicator if file is being processed -->
                  <div v-if="item.isProcessing" class="thumbnail-status-indicator processing">
                    <font-awesome-icon :icon="['fas', 'sync-alt']" spin />
                    <span>Processing...</span>
                  </div>
                  
                  <!-- Show offline indicator for offline files -->
                  <div v-else-if="item.isOffline" class="thumbnail-status-indicator offline">
                    <font-awesome-icon :icon="['fas', 'exclamation-triangle']" />
                    <span>Offline</span>
                  </div>
                  
                  <!-- Show thumbnail if available -->
                  <div v-else-if="item.thumbnail" class="thumbnail-wrapper">
                    <img 
                      :src="item.thumbnail" 
                      :alt="item.title" 
                      class="item-thumbnail"
                      @error="handleThumbnailError"
                    />
                  </div>
                  
                  <!-- Document icon (fallback or overlay) -->
                  <div v-else class="document-icon">
                    <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="2" fill="none">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  </div>
                </div>
                
                <!-- Offline indicator for files not available in filesystem -->
                <div v-if="item.showOfflineIndicator" class="offline-indicator" title="File is offline - not found in filesystem">
                  <font-awesome-icon :icon="['fas', 'exclamation-triangle']" />
                </div>
              </div>
              <div class="item-header">
                <div class="header-content">
                  <h3 class="item-title">{{ item.title }}</h3>
                  <p class="item-metadata">{{ item.createdDate || formatDate(new Date()) }}</p>
                </div>
                <button class="more-button" :title="`More options for ${item.title}`">
                  ⋯
                </button>
              </div>
            </div>
          </div>
          
          <!-- List View -->
          <div v-else class="list-view">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Added</th>
                  <th>Size</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in filteredItems" :key="item.id" @click="selectMediaItem(item)" class="list-row">
                  <td>
                    <div class="list-item-link">
                      <div class="list-item-thumbnail">
                        <!-- Show thumbnail if available -->
                        <div 
                          v-if="item.thumbnail && !item.isOffline"
                          class="list-thumbnail-wrapper"
                        >
                          <img 
                            :src="item.thumbnail" 
                            :alt="item.title" 
                            class="list-thumbnail"
                            @error="handleThumbnailError"
                          />
                        </div>
                        
                        <!-- Show status indicators -->
                        <div v-else-if="item.isProcessing" class="list-status-indicator processing">
                          <font-awesome-icon :icon="['fas', 'sync-alt']" spin />
                        </div>
                        
                        <div v-else-if="item.isOffline" class="list-status-indicator offline">
                          <font-awesome-icon :icon="['fas', 'exclamation-triangle']" />
                        </div>
                        
                        <!-- Show default icons for different file types -->
                        <div v-else class="list-icon">
                          <svg v-if="isVideo(item)" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
                            <polygon points="23 7 16 12 23 17 23 7"></polygon>
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                          </svg>
                          <svg v-else-if="isAudio(item)" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
                            <path d="M9 18V5l12-2v13"></path>
                            <circle cx="6" cy="18" r="3"></circle>
                            <circle cx="18" cy="16" r="3"></circle>
                          </svg>
                          <svg v-else-if="isImage(item)" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21,15 16,10 5,21"></polyline>
                          </svg>
                          <svg v-else viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                          </svg>
                        </div>
                      </div>
                      <span class="list-item-title">{{ item.title }}</span>
                    </div>
                  </td>
                  <td>{{ item.filetype || item.mimetype }}</td>
                  <td>{{ item.createdDate || '—' }}</td>
                  <td>{{ item.filesize || '—' }}</td>
                  <td>
                    <span class="status-badge success">Approved</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch, defineProps, defineEmits } from 'vue';
import { getRoom, getRoomItems } from '@/utils/mockData';
import ScrubbableImage from '@/components/scrubbable/ScrubbableImage.vue';
import RoomItemDetail from '@/views/RoomItemDetail.vue';
import FolderCard from '@/components/FolderCard.vue';

export default {
  name: 'EmbeddedRoomView',
  
  components: {
    ScrubbableImage,
    RoomItemDetail,
    FolderCard
  },

  props: {
    roomId: {
      type: String,
      default: 'nab-demo'
    },
    room: {
      type: Object,
      default: null
    },
    items: {
      type: Array,
      default: null
    },
    folders: {
      type: Array,
      default: () => []
    },
    breadcrumbs: {
      type: Array,
      default: () => []
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

  emits: ['item-selected', 'folder-selected', 'folder-settings', 'back-to-room', 'navigate-to-root', 'navigate-to-folder'],
  
  setup(props, { emit }) {
    const viewType = ref('grid');
    const room = ref({});
    const items = ref([]);
    const selectedItemId = ref(null);
    const selectedMediaItem = ref(null);
    const isTransitioning = ref(false);
    
    // Filter to show all supported media types
    const filteredItems = computed(() => {
      return items.value.filter(item => 
        isImage(item) || isVideo(item) || isAudio(item) || isDocument(item)
      );
    });
    
    const isGridView = computed(() => viewType.value === 'grid');
    
    // Set the view type
    const setViewType = (type) => {
      viewType.value = type;
    };
    
    // Set the selected item and trigger the transitioning state
    const setSelectedItem = (itemId) => {
      selectedItemId.value = itemId;
      isTransitioning.value = true;
      
      // Reset transitioning state after animation completes
      setTimeout(() => {
        isTransitioning.value = false;
      }, 500);
    };

    // Select a media item for detailed view
    const selectMediaItem = (item) => {
      // Prevent double-selection of the same item
      if (selectedItemId.value === item.id) {
        console.log('Item already selected, ignoring duplicate selection:', item.id);
        return;
      }
      
      console.log('Selecting media item:', item.id, item.title);
      selectedMediaItem.value = item;
      setSelectedItem(item.id);
      emit('item-selected', item);
    };

    // Handle folder selection
    const selectFolder = (folder) => {
      emit('folder-selected', folder);
    };

    // Handle folder settings
    const openFolderSettings = (folder) => {
      emit('folder-settings', folder);
    };

    // Go back to room view
    const backToRoom = () => {
      selectedMediaItem.value = null;
      selectedItemId.value = null;
      emit('back-to-room');
    };
    
    // Handle thumbnail loading errors
    const handleThumbnailError = (event) => {
      console.warn('Thumbnail failed to load:', event.target.src);
      // Set fallback image for failed thumbnails
      event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Ik0xMiA4VjE2TTggMTJIMTYiIHN0cm9rZT0iIzZiNzI4MCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPC9zdmc+';
      // Remove the error handler to prevent infinite loops
      event.target.onerror = null;
    };
    
    // Helper functions to determine item type
    const isImage = (item) => {
      return item.mimetype?.includes('image') || item.filetype?.includes('image');
    };
    
    const isVideo = (item) => {
      return item.mimetype?.includes('video') || item.filetype?.includes('video');
    };
    
    const isAudio = (item) => {
      return item.mimetype?.includes('audio') || item.filetype?.includes('audio');
    };
    
    const isDocument = (item) => {
      return !isImage(item) && !isVideo(item) && !isAudio(item);
    };
    
    // Get status class based on status type
    const getStatusClass = (status) => {
      const baseClass = 'status-badge';
      
      switch(status) {
        case 'secure':
          return `${baseClass} secure`;
        case 'active':
          return `${baseClass} success`;
        case 'team':
          return `${baseClass} team`;
        default:
          return baseClass;
      }
    };
    
    // Load room data on component mount
    onMounted(() => {
      if (props.room && props.items) {
        // Use external room and items data
        room.value = props.room;
        items.value = props.items;
      } else {
        // Get room data from mockData
        room.value = getRoom(props.roomId) || { 
          id: 'not-found',
          title: 'Room Not Found'
        };
        
        // Get items for the room
        items.value = getRoomItems(props.roomId);
      }
    });

    // Watch for changes in external props
    watch(() => props.room, (newRoom) => {
      if (newRoom) {
        room.value = newRoom;
      }
    }, { immediate: true });

    watch(() => props.items, (newItems) => {
      if (newItems) {
        items.value = newItems;
      }
    }, { immediate: true });

    // Watch for selectedFileId prop and auto-select the media item
    watch(() => props.selectedFileId, (newSelectedFileId) => {
      if (newSelectedFileId && items.value?.length) {
        // Find the item with matching ID
        const item = items.value.find(item => item.id === newSelectedFileId);
        if (item) {
          console.log('Auto-selecting media item from selectedFileId:', item);
          selectedMediaItem.value = item;
          setSelectedItem(item.id);
        } else {
          console.warn('No item found for selectedFileId:', newSelectedFileId);
        }
      } else if (!newSelectedFileId) {
        // Clear selection if no file ID provided
        selectedMediaItem.value = null;
        selectedItemId.value = null;
      }
    }, { immediate: true });

    // Also watch items to handle case where selectedFileId arrives before items are loaded
    watch(() => [props.selectedFileId, items.value], ([fileId, itemsArray]) => {
      if (fileId && itemsArray?.length && !selectedMediaItem.value) {
        const item = itemsArray.find(item => item.id === fileId);
        if (item && selectedItemId.value !== item.id) { // Avoid duplicate selection
          console.log('Auto-selecting media item after items loaded:', item);
          selectedMediaItem.value = item;
          setSelectedItem(item.id);
        }
      }
    }, { immediate: true });
    
    return {
      room,
      items,
      filteredItems,
      viewType,
      isGridView,
      setViewType,
      isImage,
      isVideo,
      isAudio,
      isDocument,
      getStatusClass,
      selectedItemId,
      selectedMediaItem,
      isTransitioning,
      setSelectedItem,
      selectMediaItem,
      selectFolder,
      openFolderSettings,
      backToRoom,
      handleThumbnailError
    };
  }
};
</script>

<style scoped>
.embedded-room-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.media-detail-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.media-detail-header {
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

.embedded-media-detail {
  flex: 1;
  overflow: hidden;
}

.room-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

/* All the same styles from RoomView.vue */
.hero-section {
  position: relative;
  background-color: #18181b;
  overflow: hidden;
}

.hero-background {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.hero-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
}

.hero-content {
  position: relative;
  z-index: 10;
  padding: 32px 16px;
  width: 100%;
}

@media (min-width: 640px) {
  .hero-content {
    padding: 40px 20px;
  }
}

@media (min-width: 1024px) {
  .hero-content {
    padding: 48px 24px;
  }
}

.hero-title {
  font-size: 2rem;
  font-weight: 700;
  color: white;
  margin-bottom: 0.5rem;
}

.hero-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.hero-meta-text {
  font-size: 0.875rem;
  color: #d4d4d8;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  background-color: #374151;
  color: #d1d5db;
}

.status-badge.secure {
  background-color: #78350f;
  color: #fbbf24;
}

.status-badge.success {
  background-color: #064e3b;
  color: #10b981;
}

.status-badge.team {
  background-color: #1e3a8a;
  color: #3b82f6;
}

.status-icon {
  margin-right: 0.25rem;
  display: inline-flex;
}

/* Content area styles */
.content-area {
  background-color: white;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.view-controls {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  background-color: white;
  transition: background-color 0.4s ease-in-out;
}

@media (min-width: 640px) {
  .view-controls {
    padding: 20px;
  }
}

@media (min-width: 1024px) {
  .view-controls {
    padding: 24px;
  }
}

.view-toggles {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  width: 100%;
}

.view-toggle-btn {
  padding: 0.5rem;
  border-radius: 0.375rem;
  background-color: transparent;
  color: #6b7280;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
}

.view-toggle-btn:hover {
  background-color: #f3f4f6;
}

.view-toggle-btn.active {
  background-color: #f3f4f6;
  color: #111827;
}

.content-container {
  width: 100%;
}

/* Grid view styles */
.grid-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  padding: 16px;
}

@media (min-width: 640px) {
  .grid-view {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
    padding: 20px;
  }
}

@media (min-width: 1024px) {
  .grid-view {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 24px;
    padding: 24px;
  }
}

@media (min-width: 1400px) {
  .grid-view {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }
}

.grid-item {
  display: block;
  background-color: white;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid #dbeafe;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  transform: translateY(0);
  cursor: pointer;
  padding: 0;
}

.grid-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
  border-color: #93c5fd;
}

.grid-item.selected {
  z-index: 10;
}

.grid-view.transitioning .grid-item {
  transition: opacity 0.3s ease-out, transform 0.3s ease-out;
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

.item-thumbnail-container {
  width: 100%;
  height: 100%;
  transition: transform 0.2s ease;
  border-radius: 8px;
  overflow: hidden;
  background-color: #f8fafc;
}

.grid-item:hover .item-thumbnail-container {
  transform: scale(1.02);
}

.thumbnail-wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #f8fafc;
  position: relative;
  z-index: 1;
  border-radius: 8px;
}

.item-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}

.grid-item:hover .item-thumbnail {
  transform: scale(1.02);
}

.more-button {
  width: 32px;
  height: 32px;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  flex-shrink: 0;
  font-size: 18px;
  font-weight: bold;
}

.more-button:hover {
  color: #111827;
  background-color: #e5e7eb;
  border-color: #9ca3af;
}

.play-button-container {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-button {
  width: 48px;
  height: 48px;
  background-color: rgba(0, 0, 0, 0.8);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.play-button:hover {
  background-color: rgba(0, 0, 0, 0.9);
  transform: scale(1.05);
}

.duration-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 6px;
  border-radius: 4px;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  letter-spacing: 0.02em;
}

.offline-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  background-color: rgba(245, 158, 11, 0.9);
  color: white;
  font-size: 12px;
  padding: 4px 6px;
  border-radius: 4px;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

.offline-indicator:hover {
  background-color: rgba(245, 158, 11, 1);
}

/* Thumbnail status indicators */
.thumbnail-status-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  background-color: #f8fafc;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  text-align: center;
  gap: 8px;
}

.thumbnail-status-indicator.processing {
  background-color: #f0f9ff;
  color: #0369a1;
}

.thumbnail-status-indicator.processing svg {
  font-size: 24px;
  color: #0369a1;
}

.thumbnail-status-indicator.offline {
  background-color: #fef3c7;
  color: #d97706;
}

.thumbnail-status-indicator.offline svg {
  font-size: 24px;
  color: #d97706;
}

.thumbnail-status-indicator.placeholder {
  background-color: #f3f4f6;
  color: #6b7280;
}

.thumbnail-status-indicator.placeholder svg {
  font-size: 24px;
  color: #6b7280;
}

.audio-icon-container,
.document-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.audio-icon,
.document-icon {
  padding: 20px;
  border-radius: 50%;
  background-color: rgba(59, 130, 246, 0.08);
  color: #3b82f6;
  transition: all 0.2s ease;
}

.grid-item:hover .audio-icon,
.grid-item:hover .document-icon {
  background-color: rgba(59, 130, 246, 0.12);
  transform: scale(1.02);
}

.item-header {
  padding: 12px 16px 16px 16px;
  background-color: white;
  border-top: none;
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

.item-metadata {
  font-size: 13px;
  color: #6b7280;
  font-weight: 400;
  margin: 0;
  line-height: 1.2;
}

/* List view styles */
.list-view {
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  overflow: hidden;
  margin: 1rem;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 0.75rem 1rem;
  text-align: left;
}

th {
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  border-bottom: 1px solid #e5e7eb;
}

td {
  font-size: 0.875rem;
  border-bottom: 1px solid #e5e7eb;
}

tr:last-child td {
  border-bottom: none;
}

.list-row {
  cursor: pointer;
}

.list-row:hover {
  background-color: #f9fafb;
}

.list-item-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.list-item-thumbnail {
  width: 2.5rem;
  height: 2.5rem;
  background-color: #f3f4f6;
  border-radius: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.list-thumbnail-wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.list-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.list-icon {
  color: #6b7280;
}

/* List view status indicators */
.list-status-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 16px;
}

.list-status-indicator.processing {
  color: #0369a1;
}

.list-status-indicator.offline {
  color: #d97706;
}

.list-item-title {
  font-weight: 500;
  color: #111827;
}

.status-badge.success {
  background-color: #ecfdf5;
  color: #065f46;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .hero-title {
    font-size: 1.5rem;
  }

  .list-view {
    overflow-x: auto;
  }
}

/* Breadcrumb Navigation */
.breadcrumb-nav {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  padding: 12px 16px;
}

@media (min-width: 640px) {
  .breadcrumb-nav {
    padding: 12px 20px;
  }
}

@media (min-width: 1024px) {
  .breadcrumb-nav {
    padding: 12px 24px;
  }
}

.breadcrumb-container {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  overflow-x: auto;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: none;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  color: #64748b;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.breadcrumb-item:hover {
  background: #e2e8f0;
  color: #334155;
}

.breadcrumb-item.root {
  color: #3b82f6;
  font-weight: 500;
}

.breadcrumb-item.current {
  color: #1e293b;
  font-weight: 600;
  cursor: default;
}

.breadcrumb-item.current:hover {
  background: none;
}

.breadcrumb-separator {
  color: #cbd5e1;
  font-size: 14px;
  margin: 0 4px;
}
</style>