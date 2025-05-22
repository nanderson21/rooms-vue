<template>
  <div class="content-detail-view">
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner">
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
          <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
          <path
            opacity="0.75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
      <span>Loading content...</span>
    </div>

    <div v-else-if="contentNotFound" class="not-found-container">
      <div class="not-found-icon">
        <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="2" fill="none">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h2>Content Not Found</h2>
      <p>The requested content could not be found in this room.</p>
      <router-link :to="`/room/${roomId || ''}`" class="back-link">
        Return to Room
      </router-link>
    </div>

    <template v-else>
      <!-- Header section with back button and title -->
      <div class="header-container" v-view-transition-name="'header-background'">
        <div class="item-header-container" v-if="mediaItem && mediaItem.id" v-view-transition-name="`item-header-${roomId || 'default'}-${mediaItem.id || 'default'}`">
          <div class="item-header-content">
            <div class="back-nav">
              <router-link :to="`/room/${roomId || ''}`" class="back-button">
                <svg width="1em" height="1em" viewBox="0 0 24 24" class="back-icon">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                Back
              </router-link>
            </div>
            <h1 class="item-title" v-view-transition-name="`item-title-${roomId || 'default'}-${mediaItem.id || 'default'}`">
              {{ mediaItem.title }}
            </h1>
            <p class="item-type" v-view-transition-name="`item-type-${roomId || 'default'}-${mediaItem.id || 'default'}`">
              {{ mediaItem.filetype || mediaItem.mimetype }}
            </p>
            <div class="item-actions" v-view-transition-name="'detail-header-actions'">
              <button class="action-button download-button">
                <svg viewBox="0 0 24 24" width="1em" height="1em" stroke="currentColor" stroke-width="2" fill="none">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download
              </button>
              <button class="action-button share-button">
                <svg viewBox="0 0 24 24" width="1em" height="1em" stroke="currentColor" stroke-width="2" fill="none">
                  <circle cx="18" cy="5" r="3"></circle>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="19" r="3"></circle>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
                Share
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Media content display -->
      <div class="content-container detail-element" :class="{ 'animated': pageLoaded }">
        <!-- Image content -->
        <div v-if="isImage(mediaItem)" class="image-container">
          <div class="image-wrapper" v-view-transition-name="`image-${roomId || 'default'}-${mediaItem.id || 'default'}`">
            <img :src="mediaItem.url || mediaItem.thumbnail" :alt="mediaItem.title" class="full-image" />
          </div>
        </div>

        <!-- Video content -->
        <div v-else-if="isVideo(mediaItem)" class="video-container">
          <div class="video-wrapper" v-view-transition-name="`video-image-${roomId || 'default'}-${mediaItem.id || 'default'}`">
            <video
              ref="videoPlayer"
              :src="mediaItem.url"
              controls
              class="video-player"
              preload="metadata"
              @canplay="onVideoLoad"
            >
              Your browser does not support the video tag.
            </video>
            <div
              v-if="!videoLoaded"
              class="video-thumbnail"
            >
              <img :src="mediaItem.thumbnail" :alt="mediaItem.title" class="thumbnail-image" />
              <div 
                class="play-button"
                v-view-transition-name="`play-button-${roomId || 'default'}-${mediaItem.id || 'default'}`"
              >
                <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="2" fill="none">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Audio content -->
        <div v-else-if="isAudio(mediaItem)" class="audio-container">
          <div class="audio-thumbnail-wrapper" v-view-transition-name="`image-${roomId || 'default'}-${mediaItem.id || 'default'}`">
            <img :src="mediaItem.thumbnail" :alt="mediaItem.title" class="audio-thumbnail" />
            <div class="audio-icon">
              <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="2" fill="none">
                <path d="M9 18V5l12-2v13"></path>
                <circle cx="6" cy="18" r="3"></circle>
                <circle cx="18" cy="16" r="3"></circle>
              </svg>
            </div>
          </div>
          <audio controls :src="mediaItem.url" class="audio-player">
            Your browser does not support the audio element.
          </audio>
        </div>

        <!-- Document content -->
        <div v-else class="document-container">
          <div class="document-preview">
            <div class="document-icon">
              <svg viewBox="0 0 24 24" width="64" height="64" stroke="currentColor" stroke-width="2" fill="none">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <div class="document-info">
              <p class="document-type">{{ mediaItem.filetype || 'Document' }}</p>
              <p class="document-size">{{ formatFileSize(mediaItem.size) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Metadata and details -->
      <div class="metadata-container detail-element" :class="{ 'animated': pageLoaded }">
        <div class="metadata-section">
          <h3 class="metadata-title">Details</h3>
          <div class="metadata-grid">
            <div class="metadata-item">
              <div class="metadata-label">Added</div>
              <div class="metadata-value">{{ formatDate(mediaItem.dateAdded) }}</div>
            </div>
            <div class="metadata-item">
              <div class="metadata-label">Size</div>
              <div class="metadata-value">{{ formatFileSize(mediaItem.size) }}</div>
            </div>
            <div class="metadata-item">
              <div class="metadata-label">Type</div>
              <div class="metadata-value">{{ mediaItem.filetype || mediaItem.mimetype }}</div>
            </div>
            <div class="metadata-item" v-if="mediaItem.dimensions">
              <div class="metadata-label">Dimensions</div>
              <div class="metadata-value">{{ mediaItem.dimensions }}</div>
            </div>
            <div class="metadata-item" v-if="mediaItem.duration">
              <div class="metadata-label">Duration</div>
              <div class="metadata-value">{{ mediaItem.duration }}</div>
            </div>
          </div>
        </div>

        <div class="metadata-section">
          <h3 class="metadata-title">Description</h3>
          <p class="description-text">{{ mediaItem.description || 'No description available.' }}</p>
        </div>

        <div class="metadata-section">
          <h3 class="metadata-title">Tags</h3>
          <div class="tags-container">
            <div v-if="mediaItem.tags && mediaItem.tags.length" class="tags-list">
              <span v-for="(tag, index) in mediaItem.tags" :key="`tag-${index}`" class="tag">
                {{ tag }}
              </span>
            </div>
            <div v-else class="no-tags">No tags</div>
          </div>
        </div>
      </div>

      <!-- Related content -->
      <div class="related-container detail-element" :class="{ 'animated': pageLoaded }">
        <h3 class="related-title">Related Content</h3>
        <div class="related-items">
          <div v-if="relatedItems.length === 0" class="no-related">
            No related content found.
          </div>
          <div v-else class="related-grid">
            <router-link
              v-for="item in relatedItems"
              :key="item.id"
              :to="`/room/${roomId}/content/${item.id}`"
              class="related-item"
            >
              <div class="related-thumbnail">
                <img :src="item.thumbnail" :alt="item.title" class="related-image" />
                <div v-if="isVideo(item)" class="related-play">
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </div>
              </div>
              <div class="related-info">
                <h4 class="related-title">{{ item.title }}</h4>
                <p class="related-type">{{ item.filetype || item.mimetype }}</p>
              </div>
            </router-link>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getRoomContent, getRoomContents } from '@/utils/mockData';

// State
const route = useRoute();
const router = useRouter();
const loading = ref(true);
const contentNotFound = ref(false);
const mediaItem = ref({});
const relatedItems = ref([]);
const videoLoaded = ref(false);
const pageLoaded = ref(false);
const videoPlayer = ref(null);

// Computed
const roomId = computed(() => route.params.id);
const contentId = computed(() => route.params.itemId);

// Methods
const loadContent = () => {
  loading.value = true;
  contentNotFound.value = false;
  
  // Load the content data
  const content = getRoomContent(roomId.value, contentId.value);
  console.log('Loaded content:', content);
  
  if (content) {
    mediaItem.value = content;
    
    // Find related content (simplified for demo - just get some other items)
    const allItems = getRoomContents(roomId.value);
    relatedItems.value = allItems
      .filter(item => item.id !== contentId.value)
      .slice(0, 4);
  } else {
    contentNotFound.value = true;
  }
  
  loading.value = false;
  
  // Trigger animation of detail elements after a short delay
  setTimeout(() => {
    pageLoaded.value = true;
  }, 200);
};

// Helper methods
const isImage = (item) => {
  return item?.mimetype?.includes('image') || item?.filetype?.includes('image');
};

const isVideo = (item) => {
  return item?.mimetype?.includes('video') || item?.filetype?.includes('video');
};

const isAudio = (item) => {
  return item?.mimetype?.includes('audio') || item?.filetype?.includes('audio');
};

const formatDate = (dateString) => {
  if (!dateString) return 'Unknown';
  
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatFileSize = (sizeInBytes) => {
  if (!sizeInBytes) return 'Unknown';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = sizeInBytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const onVideoLoad = () => {
  videoLoaded.value = true;
};

// Watch for route changes
watch(
  () => route.params.itemId,
  (newItemId, oldItemId) => {
    if (newItemId !== oldItemId) {
      loadContent();
    }
  }
);

// Load data
onMounted(() => {
  console.log('RoomContentDetail mounted');
  console.log('Room ID:', roomId.value);
  console.log('Content ID:', contentId.value);
  loadContent();
});
</script>

<style scoped>
.content-detail-view {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 80px);
  background-color: #f9fafb;
}

/* Loading state */
.loading-container,
.not-found-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 80px);
  gap: 1rem;
  text-align: center;
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.not-found-icon {
  color: #6b7280;
}

.not-found-container h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
}

.not-found-container p {
  color: #6b7280;
  margin-bottom: 1rem;
}

.back-link {
  display: inline-block;
  padding: 0.5rem 1rem;
  background-color: #2090FF;
  color: white;
  border-radius: 0.375rem;
  text-decoration: none;
  font-weight: 500;
  transition: background-color 0.2s;
}

.back-link:hover {
  background-color: #1a7ad4;
}

/* Header section */
.header-container {
  background-color: white;
  border-bottom: 1px solid #e5e7eb;
  z-index: 10;
}

.item-header-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}

.item-header-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.back-nav {
  margin-bottom: 0.5rem;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: #6b7280;
  text-decoration: none;
  font-size: 0.875rem;
  transition: color 0.2s;
}

.back-button:hover {
  color: #111827;
}

.back-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.item-title {
  font-size: 1.125rem;
  font-weight: 500;
  color: #111827;
  margin-bottom: 0.25rem;
  transform-origin: left top;
  transition: transform 0.3s ease, font-size 0.3s ease;
  will-change: transform;
}

.item-type {
  font-size: 0.875rem;
  color: #6b7280;
  transform-origin: left top;
  transition: transform 0.3s ease, font-size 0.3s ease;
  will-change: transform;
}

.item-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.action-button {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  background-color: white;
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
}

.action-button:hover {
  background-color: #f3f4f6;
  color: #111827;
}

/* Content display */
.content-container {
  max-width: 1200px;
  width: 100%;
  margin: 2rem auto;
  padding: 0 1rem;
}

.image-container,
.video-container,
.audio-container,
.document-container {
  border-radius: 0.5rem;
  overflow: hidden;
  background-color: white;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.image-wrapper,
.video-wrapper,
.audio-thumbnail-wrapper {
  position: relative;
  background-color: #000;
  width: 100%;
  overflow: hidden;
}

.full-image {
  width: 100%;
  height: auto;
  max-height: 80vh;
  object-fit: contain;
  display: block;
}

.video-player {
  width: 100%;
  height: auto;
  max-height: 80vh;
  background-color: black;
  display: block;
}

.video-thumbnail {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: black;
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.play-button {
  position: absolute;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: transform 0.2s, background-color 0.2s;
}

.play-button:hover {
  transform: scale(1.1);
  background-color: rgba(0, 0, 0, 0.7);
}

.audio-container {
  display: flex;
  flex-direction: column;
}

.audio-thumbnail-wrapper {
  position: relative;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f3f4f6;
}

.audio-thumbnail {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.audio-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.audio-player {
  width: 100%;
  margin: 1rem 0;
}

.document-container {
  padding: 2rem;
}

.document-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.document-icon {
  color: #4b5563;
}

.document-info {
  text-align: center;
}

.document-type {
  font-weight: 500;
  color: #111827;
}

.document-size {
  color: #6b7280;
  font-size: 0.875rem;
}

/* Metadata section */
.metadata-container {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto 2rem;
  padding: 0 1rem;
}

.metadata-section {
  margin-bottom: 2rem;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.metadata-title {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.metadata-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1rem;
}

@media (min-width: 640px) {
  .metadata-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 768px) {
  .metadata-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.metadata-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.metadata-label {
  font-size: 0.75rem;
  color: #6b7280;
}

.metadata-value {
  font-size: 0.875rem;
  color: #111827;
  font-weight: 500;
}

.description-text {
  font-size: 0.875rem;
  color: #4b5563;
  line-height: 1.6;
}

.tags-container {
  margin-top: 0.5rem;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  background-color: #f3f4f6;
  color: #4b5563;
  font-size: 0.75rem;
}

.no-tags {
  color: #6b7280;
  font-size: 0.875rem;
  font-style: italic;
}

/* Related content */
.related-container {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto 3rem;
  padding: 0 1rem;
}

.related-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 1.5rem;
}

.no-related {
  color: #6b7280;
  font-style: italic;
  padding: 2rem;
  text-align: center;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1rem;
}

@media (min-width: 640px) {
  .related-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .related-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.related-item {
  display: block;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  overflow: hidden;
  transition: all 0.2s;
  text-decoration: none;
}

.related-item:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transform: translateY(-0.125rem);
}

.related-thumbnail {
  position: relative;
  aspect-ratio: 16 / 9;
  background-color: #f3f4f6;
  overflow: hidden;
}

.related-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.related-play {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.related-info {
  padding: 0.75rem;
}

.related-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #111827;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.related-type {
  font-size: 0.75rem;
  color: #6b7280;
}

/* Animation for detail elements */
.detail-element {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.4s ease-out, transform 0.4s ease-out;
}

.detail-element.animated {
  opacity: 1;
  transform: translateY(0);
}

/* Transitions */
.content-container.detail-element.animated {
  transition-delay: 0.1s;
}

.metadata-container.detail-element.animated {
  transition-delay: 0.2s;
}

.related-container.detail-element.animated {
  transition-delay: 0.3s;
}
</style> 