<template>
  <div class="review-form">
    <div class="content-preview">
      <div class="preview-container" :class="{ 'is-image': isImage, 'is-video': isVideo, 'is-audio': isAudio, 'is-document': isDocument }">
        <!-- Image preview -->
        <img 
          v-if="isImage" 
          :src="contentItem.url || contentItem.thumbnail" 
          :alt="contentItem.title" 
          class="content-image" 
        />
        
        <!-- Video preview -->
        <div v-else-if="isVideo" class="video-container">
          <div class="video-wrapper">
            <button 
              class="main-play-button"
              @click="startPlayback"
              v-if="!isPlaying"
            >
              <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" stroke-width="2" fill="none">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </button>
            
            <VideoPlayerWithComments
              ref="videoPlayer"
              :src="contentItem.url"
              :poster="contentItem.thumbnail"
              :comments="timelineComments"
              :autoPlay="false"
              @play="onVideoPlay"
              @pause="onVideoPause"
              @timeupdate="onVideoTimeUpdate"
            />
          </div>
          
          <!-- Timeline comments section -->
          <div class="video-comments-section">
            <h4 class="comments-section-title">Timeline Comments</h4>
            <div class="timeline-comments-list">
              <div v-if="timelineComments.length === 0" class="no-comments">
                No timeline comments yet
              </div>
              <div 
                v-for="comment in timelineComments" 
                :key="comment.id"
                class="timeline-comment"
                @click="seekToTimestamp(comment.timestamp)"
              >
                <div class="comment-timestamp">{{ formatTime(comment.timestamp) }}</div>
                <div class="comment-content">{{ comment.content }}</div>
              </div>
            </div>
            
            <!-- Add comment at current timestamp -->
            <div class="add-timeline-comment">
              <div class="timestamp-label">Add comment at {{ formatTime(currentTime) }}</div>
              <div class="timeline-comment-input">
                <input 
                  type="text" 
                  v-model="newTimelineComment" 
                  placeholder="Add a comment at this timestamp..." 
                  class="timeline-comment-field"
                />
                <button 
                  @click="addTimelineComment" 
                  class="add-comment-btn"
                  :disabled="!newTimelineComment.trim()"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Audio preview -->
        <div v-else-if="isAudio" class="audio-preview">
          <img 
            :src="contentItem.thumbnail" 
            :alt="contentItem.title" 
            class="audio-thumbnail" 
          />
          <audio 
            controls 
            :src="contentItem.url" 
            class="audio-player"
          ></audio>
        </div>
        
        <!-- Document preview -->
        <div v-else class="document-preview">
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
            <p class="document-filename">{{ contentItem.title }}</p>
            <p class="document-filetype">{{ contentItem.filetype }}</p>
          </div>
        </div>
      </div>
    </div>
    
    <div class="review-form-content">
      <h3 class="review-section-title">Content Review</h3>
      
      <!-- Rating stars -->
      <div class="rating-container">
        <p class="rating-label">Rating:</p>
        <div class="stars">
          <button 
            v-for="star in 5" 
            :key="star" 
            type="button" 
            class="star-button" 
            :class="{ 'active': rating >= star }"
            @click="setRating(star)"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" :stroke="rating >= star ? 'none' : 'currentColor'" stroke-width="2" :fill="rating >= star ? 'currentColor' : 'none'">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Comments textarea -->
      <div class="comments-container">
        <label for="review-comments" class="comments-label">Comments:</label>
        <textarea 
          id="review-comments" 
          v-model="comments" 
          placeholder="Enter your feedback about this content..." 
          class="comments-textarea"
          rows="4"
        ></textarea>
      </div>
      
      <!-- Approval options -->
      <div class="approval-container">
        <p class="approval-label">Approval Status:</p>
        <div class="approval-options">
          <div 
            class="approval-card"
            :class="{ 'selected': approvalStatus === 'approved' }"
            @click="approvalStatus = 'approved'"
          >
            <div class="approval-icon approved">
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div class="approval-content">
              <h4 class="approval-title">Approved</h4>
              <p class="approval-description">Content is ready for distribution or publication</p>
            </div>
          </div>
          
          <div 
            class="approval-card"
            :class="{ 'selected': approvalStatus === 'needs_changes' }"
            @click="approvalStatus = 'needs_changes'"
          >
            <div class="approval-icon pending">
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </div>
            <div class="approval-content">
              <h4 class="approval-title">Needs Changes</h4>
              <p class="approval-description">Content requires revisions before approval</p>
            </div>
          </div>
          
          <div 
            class="approval-card"
            :class="{ 'selected': approvalStatus === 'rejected' }"
            @click="approvalStatus = 'rejected'"
          >
            <div class="approval-icon rejected">
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>
            <div class="approval-content">
              <h4 class="approval-title">Rejected</h4>
              <p class="approval-description">Content is unsuitable or does not meet standards</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Form actions -->
      <div class="form-actions">
        <button 
          type="button" 
          class="cancel-button" 
          @click="cancel"
        >
          Cancel
        </button>
        <button 
          type="button" 
          class="submit-button" 
          :disabled="!isValid || isSubmitting"
          @click="submitReview"
        >
          <span v-if="!isSubmitting">Submit Review</span>
          <div v-else class="spinner"></div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import VideoPlayerWithComments from './VideoPlayerWithComments.vue';

const props = defineProps({
  contentItem: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['submit', 'cancel']);

// Form state
const rating = ref(0);
const comments = ref('');
const approvalStatus = ref('needs_changes');
const isSubmitting = ref(false);

// Video player state
const videoPlayer = ref(null);
const videoLoaded = ref(false);
const videoDuration = ref(0);
const currentTime = ref(0);
const videoProgress = ref(0);
const timelineComments = ref(props.contentItem.comments || []);
const newTimelineComment = ref('');
const isPlaying = ref(false);

// Computed properties
const isImage = computed(() => {
  return props.contentItem.mimetype?.includes('image') || 
         props.contentItem.filetype?.includes('image');
});

const isVideo = computed(() => {
  return props.contentItem.mimetype?.includes('video') || 
         props.contentItem.filetype?.includes('video');
});

const isAudio = computed(() => {
  return props.contentItem.mimetype?.includes('audio') || 
         props.contentItem.filetype?.includes('audio');
});

const isDocument = computed(() => {
  return !isImage.value && !isVideo.value && !isAudio.value;
});

const isValid = computed(() => {
  return rating.value > 0 && comments.value.trim().length > 0;
});

// Methods
const setRating = (value) => {
  rating.value = value;
};

// Video methods
const startPlayback = () => {
  if (videoPlayer.value) {
    videoPlayer.value.play();
  }
};

const onVideoPlay = () => {
  isPlaying.value = true;
};

const onVideoPause = () => {
  isPlaying.value = false;
};

const onVideoTimeUpdate = (time) => {
  currentTime.value = time || 0;
  if (videoDuration.value > 0) {
    videoProgress.value = (currentTime.value / videoDuration.value) * 100;
  }
};

const seekToTimestamp = (timestamp) => {
  if (videoPlayer.value) {
    videoPlayer.value.currentTime = timestamp;
    videoPlayer.value.play();
  }
};

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const addTimelineComment = () => {
  if (!newTimelineComment.value.trim()) return;
  
  const newComment = {
    id: `comment-${Date.now()}`,
    content: newTimelineComment.value,
    timestamp: currentTime.value,
    author: {
      id: 'current-user',
      name: 'You',
      avatar: 'https://randomuser.me/api/portraits/men/1.jpg'
    },
    createdAt: new Date().toISOString()
  };
  
  timelineComments.value.push(newComment);
  newTimelineComment.value = '';
};

const submitReview = () => {
  if (!isValid.value) return;
  
  isSubmitting.value = true;
  
  // Prepare review data
  const reviewData = {
    rating: rating.value,
    comments: comments.value,
    status: approvalStatus.value,
    contentId: props.contentItem.id,
    timestamp: new Date().toISOString(),
    timelineComments: isVideo.value ? timelineComments.value : []
  };
  
  // Simulate API call
  setTimeout(() => {
    isSubmitting.value = false;
    emit('submit', reviewData);
  }, 1000);
};

const cancel = () => {
  emit('cancel');
};
</script>

<style scoped>
.review-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.content-preview {
  border-radius: 0.5rem;
  overflow: hidden;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
}

.preview-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  min-height: 200px;
}

.preview-container.is-image,
.preview-container.is-video {
  padding: 0;
}

.preview-container.is-video {
  padding: 0;
  height: auto;
}

.content-image,
.content-video {
  width: 100%;
  max-height: 400px;
  object-fit: contain;
  display: block;
}

.audio-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
}

.audio-thumbnail {
  width: 200px;
  height: 200px;
  object-fit: cover;
  border-radius: 0.25rem;
}

.audio-player {
  width: 100%;
}

.document-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.document-icon {
  color: #6b7280;
}

.document-info {
  text-align: center;
}

.document-filename {
  font-weight: 500;
  color: #111827;
}

.document-filetype {
  color: #6b7280;
  font-size: 0.875rem;
}

.review-form-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.review-section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.rating-container,
.comments-container,
.approval-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rating-label,
.comments-label,
.approval-label {
  font-weight: 500;
  color: #374151;
}

.stars {
  display: flex;
  gap: 0.25rem;
}

.star-button {
  background: transparent;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  color: #d1d5db;
  transition: transform 0.1s ease;
}

.star-button:hover {
  transform: scale(1.1);
}

.star-button.active {
  color: #fbbf24;
}

.comments-textarea {
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  width: 100%;
  resize: vertical;
  font-family: inherit;
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
}

.comments-textarea:focus {
  outline: none;
  border-color: #2090FF;
  box-shadow: 0 0 0 3px rgba(32, 144, 255, 0.1);
}

.approval-options {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  width: 100%;
}

.approval-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
  min-width: 200px;
}

.approval-card:hover {
  border-color: #d1d5db;
  background-color: #f9fafb;
}

.approval-card.selected {
  border-color: #2090FF;
  background-color: rgba(32, 144, 255, 0.05);
}

.approval-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
}

.approval-icon.approved {
  color: #16a34a;
  background-color: rgba(22, 163, 74, 0.1);
}

.approval-icon.pending {
  color: #f59e0b;
  background-color: rgba(245, 158, 11, 0.1);
}

.approval-icon.rejected {
  color: #ef4444;
  background-color: rgba(239, 68, 68, 0.1);
}

.approval-content {
  flex: 1;
  text-align: left;
}

.approval-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.25rem 0;
}

.approval-description {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.4;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.cancel-button {
  padding: 0.5rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  background-color: white;
  color: #6b7280;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.cancel-button:hover {
  background-color: #f9fafb;
  color: #111827;
}

.submit-button {
  padding: 0.5rem 1.5rem;
  border: none;
  border-radius: 0.375rem;
  background-color: #2090FF;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 120px;
}

.submit-button:hover:not(:disabled) {
  background-color: #1a7ad4;
}

.submit-button:disabled {
  background-color: #93c5fd;
  cursor: not-allowed;
}

.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.video-container {
  display: flex;
  flex-direction: column;
  background-color: #000;
  border-radius: 0.5rem;
  overflow: hidden;
  width: 100%;
  margin-bottom: 1rem;
}

@media (min-width: 768px) {
  .video-container {
    flex-direction: row;
    max-height: 60vh;
  }
  
  .video-wrapper {
    width: 65%;
    flex-shrink: 0;
  }
  
  .video-comments-section {
    width: 35%;
    flex-shrink: 0;
    max-height: 60vh;
    overflow-y: auto;
    background-color: #f9fafb;
    padding: 1rem;
  }
}

@media (max-width: 767px) {
  .video-container {
    flex-direction: column;
  }
  
  .video-wrapper {
    width: 100%;
  }
  
  .video-comments-section {
    width: 100%;
    max-height: 40vh;
    overflow-y: auto;
    background-color: #f9fafb;
    padding: 1rem;
  }
}

.video-wrapper {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
}

.main-play-button {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.5);
  border: none;
  border-radius: 50%;
  width: 64px;
  height: 64px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.content-video-player {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.video-controls-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 0.5rem;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  z-index: 10;
}

.video-timeline-container {
  width: 100%;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.video-timeline {
  position: relative;
  height: 6px;
  width: 100%;
}

.timeline-track {
  position: relative;
  height: 100%;
  width: 100%;
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  cursor: pointer;
  overflow: hidden;
}

.timeline-progress {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background-color: #2090FF;
  border-radius: 3px;
}

.comment-marker {
  position: absolute;
  width: 8px;
  height: 8px;
  background-color: #ffcc00;
  border-radius: 50%;
  top: -1px;
  transform: translateX(-4px);
  cursor: pointer;
  z-index: 2;
}

.video-time {
  color: white;
  font-size: 0.75rem;
  text-align: right;
}

.video-comments-section {
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  background-color: #f9fafb;
  padding: 1rem;
}

.comments-section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
  margin-top: 0;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.timeline-comments-list {
  max-height: 200px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.timeline-comment {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.timeline-comment:hover {
  background-color: #f3f4f6;
}

.comment-timestamp {
  font-weight: 500;
  color: #2090FF;
  font-size: 0.75rem;
  min-width: 2.5rem;
}

.comment-content {
  font-size: 0.875rem;
  color: #1f2937;
  word-break: break-word;
}

.no-comments {
  color: #6b7280;
  font-size: 0.875rem;
  padding: 1rem;
  text-align: center;
  font-style: italic;
}

.add-timeline-comment {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.timestamp-label {
  font-size: 0.75rem;
  color: #374151;
  font-weight: 500;
}

.timeline-comment-input {
  display: flex;
  gap: 0.5rem;
}

.timeline-comment-field {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.timeline-comment-field:focus {
  outline: none;
  border-color: #2090FF;
  box-shadow: 0 0 0 3px rgba(32, 144, 255, 0.1);
}

.add-comment-btn {
  padding: 0.5rem 0.75rem;
  background-color: #2090FF;
  color: white;
  border-radius: 0.375rem;
  border: none;
  font-weight: 500;
  cursor: pointer;
}

.add-comment-btn:hover:not(:disabled) {
  background-color: #1a7ad4;
}

.add-comment-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style> 