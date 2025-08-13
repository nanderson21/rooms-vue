<template>
  <div class="room-view">
    <!-- Hero section with room information -->
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
            {{ filteredItems.length }} content items • {{ room.totalSize || '0 KB' }}
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

    <!-- Main Content Area with PopoverForm -->
    <div class="content-area">
      <!-- View toggles and PopoverForm -->
      <div class="view-controls">
        <div class="view-toggles">
          <!-- PopoverForm integration -->
          <div class="popover-container">
            <popover-form
              v-model="popoverOpen"
              title="Feedback"
              show-close-button
              :show-success="formSuccess"
              width="400px"
              height="250px"
            >
              <div class="form-content">
                <textarea 
                  v-model="feedbackText" 
                  placeholder="Share your feedback about this room..."
                  class="feedback-textarea"
                ></textarea>
                <div class="form-actions">
                  <popover-form-button 
                    :loading="formLoading" 
                    text="Submit" 
                    @click="submitFeedback"
                  />
                </div>
              </div>
            </popover-form>
          </div>

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
          <div 
            v-for="(item, index) in filteredItems" 
            :key="item.id"
            class="grid-item-wrapper"
          >
            <content-review-popover
              v-model="selectedItemId[item.id]"
              :title="item.title"
              :show-success="reviewSuccess[item.id]"
              :width="isVideo(item) ? '90vw' : '800px'"
              :max-width="isVideo(item) ? '1200px' : '800px'"
              successTitle="Review Submitted"
              successMessage="Thank you for reviewing this content. Your feedback has been recorded."
            >
              <!-- Card/Thumbnail for trigger -->
              <template #trigger>
                <div 
                  class="grid-item"
                  :class="{ 'selected': selectedItemId[item.id] }"
                >
                  <div class="item-header">
                    <h3 class="item-title">{{ item.title }}</h3>
                    <p class="item-type">{{ item.filetype || item.mimetype }}</p>
                  </div>
                  
                  <!-- Image content -->
                  <div v-if="isImage(item)" class="item-thumbnail-container">
                    <div class="thumbnail-wrapper">
                      <img 
                        :src="item.thumbnail" 
                        :alt="item.title" 
                        class="item-thumbnail"
                      />
                    </div>
                  </div>
                  
                  <!-- Video content -->
                  <div v-else-if="isVideo(item)" class="item-thumbnail-container">
                    <div class="thumbnail-wrapper">
                      <img 
                        :src="item.thumbnail" 
                        :alt="item.title" 
                        class="item-thumbnail"
                      />
                      <div class="play-button-container">
                        <div 
                          class="play-button"
                         >
                          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                          </svg>
                        </div>
                      </div>
                      <div v-if="item.duration" class="duration-badge">{{ item.duration }}</div>
                    </div>
                  </div>
                  
                  <!-- Audio content -->
                  <div v-else-if="isAudio(item)" class="item-thumbnail-container">
                    <div class="thumbnail-wrapper">
                      <img 
                        :src="item.thumbnail" 
                        :alt="item.title" 
                        class="item-thumbnail"
                      />
                      <div class="audio-icon-container">
                        <div class="audio-icon">
                          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                            <path d="M9 18V5l12-2v13"></path>
                            <circle cx="6" cy="18" r="3"></circle>
                            <circle cx="18" cy="16" r="3"></circle>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Document content -->
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
                  
                  <!-- Add action buttons for video content -->
                  <div v-if="isVideo(item)" class="item-actions" style="display: flex; justify-content: center; gap: 8px; padding: 8px; background-color: rgba(0, 0, 0, 0.7); position: absolute; bottom: 0; left: 0; right: 0; z-index: 10;">
                    <button 
                      @click.stop="openThreadedReview(item)"
                      class="item-action-btn thread-review-btn"
                      style="display: flex; align-items: center; gap: 4px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; padding: 8px 12px; font-size: 14px; cursor: pointer; font-weight: bold;"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      Thread Review
                    </button>
                  </div>
                </div>
              </template>
              
              <!-- Review form inside popover -->
              <content-review-form 
                :content-item="item"
                @submit="handleReviewSubmit(item, $event)"
                @cancel="selectedItemId[item.id] = false"
              />
            </content-review-popover>
          </div>
        </div>
        
        <!-- List View -->
        <div v-else class="list-view">
          <!-- List view content would go here similar to CollectionView -->
          <!-- Condensed for brevity - will expand later -->
        </div>
      </div>
    </div>

    <!-- Threaded Video Review Component -->
    <div v-if="showThreadedReview" class="threaded-review-overlay" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0, 0, 0, 0.9); z-index: 9999; display: flex; justify-content: center; align-items: center;">
      <ThreadedVideoReview 
        :videoSrc="selectedVideoForReview?.url" 
        :videoTitle="selectedVideoForReview?.title"
        @close="showThreadedReview = false"
        style="width: 100%; height: 100%;"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getRoom, getRoomContents, getComments } from '@/utils/mockData';
import ScrubbableImage from '@/components/scrubbable/ScrubbableImage.vue';
import { checkCollectionData, checkRouterSetup, checkRoomData } from '@/utils/diagnostic';
import PopoverForm from '@/components/PopoverForm.vue';
import PopoverFormButton from '@/components/PopoverFormButton.vue';
import ContentReviewPopover from '@/components/ContentReviewPopover.vue';
import ContentReviewForm from '@/components/ContentReviewForm.vue';
import ThreadedVideoReview from '@/components/ThreadedVideoReview.vue';

// State
const route = useRoute();
const router = useRouter();
const viewType = ref('grid');
const room = ref({});
const items = ref([]);
const selectedItemId = ref({});
const reviewSuccess = ref({});
const isTransitioning = ref(false);

// PopoverForm state
const popoverOpen = ref(false);
const feedbackText = ref('');
const formLoading = ref(false);
const formSuccess = ref(false);

// Add a ref to track if the thread review is visible
const showThreadedReview = ref(false);
const selectedVideoForReview = ref(null);

// Computed
const roomId = computed(() => {
  return route.params.id || 'room-demo'; // Default to room-demo if no ID provided
});

// Filter to show content items
const filteredItems = computed(() => {
  return items.value.filter(item => 
    (item.url || item.previewVideo) || isImage(item) || isAudio(item) || isDocument(item)
  );
});

const isGridView = computed(() => viewType.value === 'grid');

// Methods
const setViewType = (type) => {
  viewType.value = type;
  
  // Update URL query parameter
  const query = { ...route.query, view: type };
  router.replace({ query });
};

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

// Submit feedback handler
const submitFeedback = () => {
  if (!feedbackText.value.trim()) return;
  
  formLoading.value = true;
  
  // Simulate API call
  setTimeout(() => {
    formLoading.value = false;
    formSuccess.value = true;
    
    // Reset after success is shown
    setTimeout(() => {
      formSuccess.value = false;
      feedbackText.value = '';
      popoverOpen.value = false;
    }, 2000);
  }, 1500);
};

// Handle review submission
const handleReviewSubmit = (item, reviewData) => {
  console.log('Review submitted for item:', item.id, reviewData);
  
  // Show success state
  reviewSuccess.value[item.id] = true;
  
  // Hide success after a delay and close popover
  setTimeout(() => {
    reviewSuccess.value[item.id] = false;
    selectedItemId.value[item.id] = false;
  }, 2000);
};

// Update the openThreadedReview method in the script section to include debugging
const openThreadedReview = (item) => {
  console.log('Opening threaded review for item:', item);
  selectedVideoForReview.value = item;
  showThreadedReview.value = true;
  console.log('Threaded review visibility:', showThreadedReview.value);
};

// Load data on component mount
onMounted(() => {
  console.log('RoomView mounted');
  
  // Run diagnostics
  const diagnosticResults = checkCollectionData();
  checkRouterSetup();
  console.log('Diagnostic results:', diagnosticResults);
  
  // Get room data
  room.value = getRoom(roomId.value) || { 
    id: 'not-found',
    title: 'Room Not Found'
  };
  console.log('Loaded room:', room.value);
  
  // Get content items for the room
  items.value = getRoomContents(roomId.value);
  console.log('Loaded content items:', items.value.length);
  console.log('First item:', items.value[0]);
  
  // Additional room diagnostics
  checkRoomData(roomId.value);
  
  // Log video items specifically
  const videoItems = items.value.filter(item => isVideo(item));
  console.log('Video items count:', videoItems.length);
  if (videoItems.length > 0) {
    console.log('First video item:', videoItems[0]);
  }
  
  // Set view type from URL or default to grid
  viewType.value = route.query.view || 'grid';
});
</script>

<style scoped>
/* All styles from CollectionView, but with room-specific classes */
/* Hero section styles */
.room-view {
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

/* PopoverForm specific styles */
.popover-container {
  position: relative;
  margin-right: auto; /* Pushes other toggle buttons to the right */
}

.form-content {
  padding: 2rem 1rem 1rem 1rem;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.feedback-textarea {
  flex: 1;
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  padding: 0.5rem;
  resize: none;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

/* View controls */
.view-controls {
  padding: 1.5rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  background-color: white;
  transition: background-color 0.4s ease-in-out;
}

.view-toggles {
  display: flex;
  justify-content: flex-end;
  align-items: center;
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

/* Grid view */
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

/* Item header */
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

.grid-item-wrapper {
  /* Ensure proper spacing and layout for the popover container */
  width: 100%;
  position: relative;
}

.item-thumbnail-container {
  position: relative;
  height: 200px;
  overflow: hidden;
  background-color: #f3f4f6;
}

.thumbnail-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #000;
  overflow: hidden;
}

.item-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.play-button-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.play-button {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.duration-badge {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  padding: 0.25rem 0.5rem;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 4px;
  font-size: 0.75rem;
}

.audio-icon-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.audio-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.document-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.document-icon {
  color: #6b7280;
}

/* Threaded Video Review Component */
.threaded-review-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.9);
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: center;
}

.review-button {
  background-color: #2090FF;
  color: white;
  margin-right: 8px;
}

/* Item actions */
.item-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  background-color: rgba(0, 0, 0, 0.7);
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
}

.item-action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background-color: #2090FF;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.item-action-btn:hover {
  background-color: #1a7ad9;
}

.thread-review-btn {
  background-color: #4CAF50;
}

.thread-review-btn:hover {
  background-color: #3d9140;
}
</style> 