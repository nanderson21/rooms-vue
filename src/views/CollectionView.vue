<template>
  <div class="collection-view">
    <div class="hero-section" v-if="collection.id" v-view-transition-name="`collection-card-${collection.id}`">
      <div class="hero-background" v-view-transition-name="`collection-thumb-${collection.id}`">
        <img 
          :src="collection.thumbnail || ''" 
          :alt="collection.title || 'Collection'"
          class="hero-image"
        />
        <div class="hero-overlay"></div>
      </div>
      
      <div class="hero-content">
        <h1 class="hero-title" v-view-transition-name="`collection-title-${collection.id}`">
          {{ collection.title || 'Collection' }}
        </h1>
        
        <div class="hero-meta">
          <span class="hero-meta-text" v-view-transition-name="`collection-meta-${collection.id}`">
            {{ filteredItems.length }} items with video preview • {{ collection.totalSize || '0 KB' }}
          </span>
          <div v-if="collection.status !== 'default' && collection.statusText" 
               :class="getStatusClass(collection.status)"
               class="status-badge">
            <span class="status-icon">
              <svg v-if="collection.status === 'secure'" viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none">
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
            {{ collection.statusText }}
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="content-area">
      <!-- View toggles -->
      <div class="view-controls" v-view-transition-name="'header-background'">
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
          <router-link 
            v-for="(item, index) in filteredItems" 
            :key="item.id"
            :to="`/collection/${collection.id}/item/${item.id}`"
            class="grid-item"
            :class="{ 'selected': selectedItemId === item.id }"
            @click="setSelectedItem(item.id)">
            <div class="item-header" v-view-transition-name="`item-header-${collection.id}-${item.id}`">
              <h3 class="item-title" v-view-transition-name="`item-title-${collection.id}-${item.id}`">{{ item.title }}</h3>
              <p class="item-type" v-view-transition-name="`item-type-${collection.id}-${item.id}`">{{ item.filetype || item.mimetype }}</p>
            </div>
            <div class="item-media">
              <!-- Image items -->
              <div v-if="isImage(item)" class="item-thumbnail-container">
                <div class="thumbnail-wrapper" v-view-transition-name="`image-${collection.id}-${item.id}`">
                  <img 
                    :src="item.thumbnail" 
                    :alt="item.title" 
                    class="item-thumbnail"
                  />
                </div>
              </div>
              
              <!-- Video items -->
              <div v-else-if="isVideo(item)" class="item-thumbnail-container">
                <div class="thumbnail-wrapper" v-view-transition-name="`video-image-${collection.id}-${item.id}`">
                  <ScrubbableImage
                    v-if="item.spriteUrl"
                    :spriteUrl="item.spriteUrl"
                    :width="300"
                    :height="200"
                    :rows="5"
                    :columns="10"
                  >
                    <template #overlay>
                      <div class="play-button-container">
                        <div 
                          class="play-button"
                          v-view-transition-name="`play-button-${collection.id}-${item.id}`">
                          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                          </svg>
                        </div>
                      </div>
                      <div v-if="item.duration" class="duration-badge">{{ item.duration }}</div>
                    </template>
                  </ScrubbableImage>
                  <img 
                    v-else
                    :src="item.thumbnail" 
                    :alt="item.title" 
                    class="item-thumbnail"
                  />
                </div>
                <div v-if="!item.spriteUrl" class="play-button-container">
                  <div 
                    class="play-button"
                    v-view-transition-name="`play-button-${collection.id}-${item.id}`">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                  </div>
                </div>
                <div v-if="!item.spriteUrl && item.duration" class="duration-badge">{{ item.duration }}</div>
              </div>
              
              <!-- Audio items -->
              <div v-else-if="isAudio(item)" class="item-thumbnail-container">
                <div class="thumbnail-wrapper" v-view-transition-name="`image-${collection.id}-${item.id}`">
                  <img 
                    :src="item.thumbnail" 
                    :alt="item.title" 
                    class="item-thumbnail"
                  />
                </div>
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
                <div class="document-icon">
                  <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="2" fill="none">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                </div>
              </div>
            </div>
          </router-link>
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
              <tr v-for="(item, index) in filteredItems" :key="item.id">
                <td>
                  <router-link 
                    :to="`/collection/${collection.id}/item/${item.id}`"
                    class="list-item-link">
                    <div class="list-item-thumbnail">
                      <div 
                        v-if="isImage(item)"
                        class="list-thumbnail-wrapper"
                        v-view-transition-name="`image-${collection.id}-${item.id}`"
                      >
                        <img 
                          :src="item.thumbnail" 
                          :alt="item.title" 
                          class="list-thumbnail"
                        />
                      </div>
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
                  </router-link>
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
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getCollection, getCollectionItems } from '@/utils/mockData';
import ScrubbableImage from '@/components/scrubbable/ScrubbableImage.vue';
import { checkCollectionData, checkRouterSetup } from '@/utils/diagnostic';

export default {
  name: 'CollectionView',
  
  components: {
    ScrubbableImage
  },
  
  setup() {
    const route = useRoute();
    const router = useRouter();
    const viewType = ref('grid');
    const collection = ref({});
    const items = ref([]);
    const selectedItemId = ref(null);
    const isTransitioning = ref(false);
    
    const collectionId = computed(() => {
      return route.params.id || 'nab-demo'; // Default to nab-demo if no ID provided
    });
    
    // Filter to only show items with video previews
    const filteredItems = computed(() => {
      return items.value.filter(item => 
        item.previewVideo || isImage(item) || isAudio(item) || isDocument(item)
      );
    });
    
    const isGridView = computed(() => viewType.value === 'grid');
    
    // Set the view type and update the URL
    const setViewType = (type) => {
      viewType.value = type;
      
      // Update URL query parameter
      const query = { ...route.query, view: type };
      router.replace({ query });
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
    
    // Load collection data on component mount
    onMounted(() => {
      console.log('CollectionView mounted');
      
      // Run diagnostics
      const diagnosticResults = checkCollectionData();
      checkRouterSetup();
      console.log('Diagnostic results:', diagnosticResults);
      
      // Get collection data
      collection.value = getCollection(collectionId.value) || { 
        id: 'not-found',
        title: 'Collection Not Found'
      };
      console.log('Loaded collection:', collection.value);
      
      // Get items for the collection
      items.value = getCollectionItems(collectionId.value);
      console.log('Loaded items:', items.value.length);
      
      // Set view type from URL or default to grid
      viewType.value = route.query.view || 'grid';
    });
    
    return {
      collection,
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
      isTransitioning,
      setSelectedItem
    };
  }
};
</script>

<style scoped>
/* Hero section styles */
.collection-view {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 80px);
}

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
  padding: 2.5rem 1rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
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
}

.view-controls {
  padding: 1.5rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  background-color: white;
  transition: background-color 0.4s ease-in-out;
}

.view-toggles {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  max-width: 1200px;
  margin: 0 auto;
  margin-bottom: 1.5rem;
}

.view-toggle-btn {
  padding: 0.5rem;
  border-radius: 0.375rem;
  background-color: transparent;
  color: #6b7280;
  transition: all 0.2s;
}

.view-toggle-btn:hover {
  background-color: #f3f4f6;
}

.view-toggle-btn.active {
  background-color: #f3f4f6;
  color: #111827;
}

.content-container {
  max-width: 1200px;
  margin: 0 auto;
}

/* Grid view styles */
.grid-view {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1rem;
  padding: 1rem;
}

@media (min-width: 640px) {
  .grid-view {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 768px) {
  .grid-view {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .grid-view {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.grid-item {
  display: block;
  background-color: white;
  border-radius: 0.75rem;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  transition: all 0.3s;
  transform: translateY(0);
}

.grid-item:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  transform: translateY(-0.25rem);
}

.grid-item.selected {
  z-index: 10;
}

.grid-view.transitioning .grid-item {
  transition: opacity 0.3s ease-out, transform 0.3s ease-out;
}

.item-media {
  aspect-ratio: 16 / 9;
  background-color: #f3f4f6;
  position: relative;
  overflow: hidden;
}

.item-thumbnail-container {
  width: 100%;
  height: 100%;
  transition: transform 0.3s;
}

.grid-item:hover .item-thumbnail-container {
  transform: scale(1.05);
}

.thumbnail-wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #000;
  position: relative;
  z-index: 1;
  view-transition-name: initial;
  contain: paint;
}

.item-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.play-button-container {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-button {
  width: 3rem;
  height: 3rem;
  background-color: rgba(0, 0, 0, 0.75);
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.duration-badge {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  background-color: rgba(0, 0, 0, 0.75);
  color: white;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.audio-icon-container,
.document-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.audio-icon,
.document-icon {
  padding: 1.5rem;
  border-radius: 9999px;
  background-color: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.item-header {
  padding: 0.75rem;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.item-title {
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #111827;
  transform-origin: left top;
  transition: transform 0.3s ease, font-size 0.3s ease;
  will-change: transform;
}

.item-type {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
  transform-origin: left top;
  transition: transform 0.3s ease, font-size 0.3s ease;
  will-change: transform;
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

tr:hover {
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
</style>