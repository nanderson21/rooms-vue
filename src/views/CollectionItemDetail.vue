<template>
  <div class="item-detail">
    <!-- Item header that transitions from the grid view -->
    <div class="item-header-container" v-if="mediaItem && mediaItem.id" v-view-transition-name="`item-header-${collectionId || 'default'}-${mediaItem.id || 'default'}`">
      <div class="item-header-content">
        <div class="back-nav">
          <router-link :to="`/collection/${collectionId || ''}`" class="back-button">
            <svg width="1em" height="1em" viewBox="0 0 24 24" class="back-icon">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            Back
          </router-link>
        </div>
        <h1 class="item-title" v-view-transition-name="`item-title-${collectionId || 'default'}-${mediaItem.id || 'default'}`">
          {{ mediaItem ? mediaItem.title : 'Item Details' }}
        </h1>
        <p class="item-type" v-view-transition-name="`item-type-${collectionId || 'default'}-${mediaItem.id || 'default'}`">{{ mediaItem?.filetype || mediaItem?.mimetype || 'Unknown type' }}</p>
      </div>
      
      <div class="item-actions">
        <div class="status-select-container">
          <select class="status-select">
            <option>No Status</option>
            <option>Approved</option>
            <option>Rejected</option>
            <option>Needs Changes</option>
            <option>In Review</option>
          </select>
          <svg class="select-arrow" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
        
        <button class="download-button">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Download</span>
        </button>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="main-content">
      <!-- Content Viewer Section -->
      <div class="content-viewer">
        <!-- Video/Content area -->
        <div class="content-display">
          <template v-if="isVideo">
            <div class="video-container">
              <div class="video-wrapper">
                <button 
                  class="main-play-button"
                  @click="startPlayback"
                  v-if="!isPlaying"
                  v-view-transition-name="`play-button-${collectionId || 'default'}-${mediaItem.id || 'default'}`"
                >
                  <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" stroke-width="2" fill="none">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </button>
                
                <VideoPlayerWithComments
                  ref="videoPlayer"
                  :src="mediaItem && mediaItem.previewVideo ? mediaItem.previewVideo : ''"
                  :poster="mediaItem && mediaItem.thumbnail ? mediaItem.thumbnail : ''"
                  :comments="comments || []"
                  :autoPlay="false"
                  :transitionName="`video-image-${collectionId || 'default'}-${mediaItem.id || 'default'}`"
                  @play="onVideoPlay"
                  @pause="onVideoPause"
                  @timeupdate="onVideoTimeUpdate"
                />
              </div>
            </div>
          </template>
          
          <template v-else-if="isImage">
            <div 
              class="image-wrapper image-transition-target"
              v-view-transition-name="`image-${collectionId || 'default'}-${mediaItem.id || 'default'}`"
            >
              <img 
                :src="mediaItem && mediaItem.thumbnail ? mediaItem.thumbnail : ''" 
                :alt="mediaItem && mediaItem.title ? mediaItem.title : 'Image'"
                class="image-display"
              />
            </div>
          </template>
          
          <template v-else-if="isAudio">
            <div class="audio-player">
              <div class="audio-player-card">
                <div class="audio-header">
                  <div 
                    class="audio-thumbnail-wrapper audio-transition-target"
                    v-view-transition-name="`image-${collectionId || 'default'}-${mediaItem.id || 'default'}`"
                  >
                    <img 
                      :src="mediaItem && mediaItem.thumbnail ? mediaItem.thumbnail : ''" 
                      :alt="mediaItem && mediaItem.title ? mediaItem.title : 'Audio'"
                      class="audio-thumbnail"
                    />
                  </div>
                  <div class="audio-info">
                    <h3 class="audio-title">{{ mediaItem?.title || 'Audio Track' }}</h3>
                    <p class="audio-subtitle">{{ collection?.title || 'Collection' }}</p>
                  </div>
                </div>
                
                <div class="audio-controls">
                  <button class="audio-play-button">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                  </button>
                  
                  <div class="audio-progress">
                    <div class="audio-progress-bar">
                      <div class="audio-progress-fill" style="width: 33%"></div>
                    </div>
                  </div>
                  
                  <span class="audio-time">{{ mediaItem?.duration || "00:00 / 00:00" }}</span>
                </div>
                
                <div class="audio-footer">
                  <button class="audio-control-button">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>
                  </button>
                  
                  <button class="audio-control-button">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </template>
          
          <template v-else>
            <div class="document-viewer">
              <div class="document-container">
                <div class="document-header">
                  <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" stroke-width="2" fill="none">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  <h3 class="document-title">{{ mediaItem.title }}</h3>
                </div>
                
                <div class="document-preview">
                  <p class="document-preview-text">
                    This is a preview of document content. In a real application, you would see 
                    the actual document content or a preview of the first few pages.
                  </p>
                </div>
                
                <div class="document-actions">
                  <button class="document-download-button">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    <span>Download Document</span>
                  </button>
                </div>
              </div>
            </div>
          </template>
        </div>
        
        <!-- Comment input area below content -->
        <div class="comment-input-area detail-element">
          <div class="comment-input-container">
            <div v-if="showTimestamp" class="comment-timestamp">
              Add a comment at <span class="comment-timestamp-time">{{ formatTime(currentTime) }}</span>
            </div>
            <textarea 
              ref="commentInput"
              class="comment-textarea" 
              placeholder="Leave a comment..."
              v-model="newComment"
            ></textarea>
            <div class="comment-actions">
              <div class="comment-tools">
                <button class="comment-tool-button">
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                    <line x1="9" y1="9" x2="9.01" y2="9"></line>
                    <line x1="15" y1="9" x2="15.01" y2="9"></line>
                  </svg>
                </button>
                <button class="comment-tool-button">
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                  </svg>
                </button>
                <button class="comment-tool-button">
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                </button>
              </div>
              <button 
                class="comment-submit-button"
                @click="addComment"
              >
                Comment
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Comments Sidebar -->
      <div class="comments-sidebar detail-element">
        <!-- Tab Navigation -->
        <div class="tabs-header">
          <button 
            class="tab-button" 
            :class="{ 'active': activeTab === 'comments' }"
            @click="activeTab = 'comments'"
          >
            Comments
          </button>
          <button 
            class="tab-button" 
            :class="{ 'active': activeTab === 'info' }"
            @click="activeTab = 'info'"
          >
            Info
          </button>
        </div>
        
        <!-- Video timeline with comment markers -->
        <div v-if="isVideo" class="video-timeline-container">
          <div class="timeline-controls">
            <button 
              class="timeline-play-button"
              @click="togglePlayback"
            >
              <svg v-if="isPlaying" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
              </svg>
              <svg v-else viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </button>
            <div class="timeline-time">{{ formatTime(currentTime) }}</div>
          </div>
          
          <!-- Timeline with markers -->
          <div 
            class="comment-timeline"
            ref="commentTimeline"
            @click="seekToPosition"
          >
            <div class="timeline-track">
              <div 
                class="timeline-progress"
                :style="{ width: `${progressPercentage}%` }"
              ></div>
              
              <div 
                class="timeline-cursor"
                :style="{ left: `${progressPercentage}%` }"
              ></div>
              
              <!-- Comment markers -->
              <div class="comment-markers">
                <button 
                  v-for="comment in comments" 
                  :key="comment.id"
                  class="comment-marker"
                  :style="{ left: `${getMarkerPosition(comment.timestamp)}%` }"
                  @click.stop="seekToTimestamp(comment.timestamp)"
                  :title="comment.content"
                >
                  <div class="marker-avatar">
                    <img 
                      v-if="comment.author.avatar" 
                      :src="comment.author.avatar" 
                      :alt="comment.author.name"
                      class="avatar-image"
                    />
                    <div v-else class="avatar-fallback">
                      {{ getInitials(comment.author.name) }}
                    </div>
                  </div>
                  <div class="marker-pointer"></div>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Comments Panel -->
        <div v-if="activeTab === 'comments'" class="comments-panel">
          <div v-if="comments.length === 0" class="no-comments">
            <p>No comments yet. Add the first comment!</p>
          </div>
          <div v-else class="comments-list">
            <div v-for="comment in sortedComments" :key="comment.id" class="comment-item">
              <div class="comment-header">
                <div class="comment-avatar">
                  <img 
                    v-if="comment.author.avatar" 
                    :src="comment.author.avatar" 
                    :alt="comment.author.name"
                    class="avatar-image"
                  />
                  <div v-else class="avatar-fallback">
                    {{ getInitials(comment.author.name) }}
                  </div>
                </div>
                <div class="comment-meta">
                  <div class="comment-author-row">
                    <h4 class="comment-author">{{ comment.author.name }}</h4>
                    <span class="comment-time">{{ formatRelativeTime(comment.createdAt) }}</span>
                  </div>
                  <p class="comment-content">
                    <button 
                      v-if="isVideo"
                      class="timestamp-button"
                      @click="seekToTimestamp(comment.timestamp)"
                    >
                      {{ formatTime(comment.timestamp) }}
                    </button>
                    <span class="comment-text">{{ comment.content }}</span>
                  </p>
                  <div class="comment-actions">
                    <button class="comment-action-button">Reply</button>
                    <button class="comment-action-button">
                      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Info Panel -->
        <div v-if="activeTab === 'info'" class="info-panel">
          <h3 class="info-title">File Information</h3>
          
          <!-- General Information -->
          <div class="info-section">
            <h4 class="info-section-title">General</h4>
            <div class="info-item">
              <span class="info-label">Title</span>
              <span class="info-value">{{ mediaItem.title }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Description</span>
              <span class="info-value">{{ mediaItem.description || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Type</span>
              <span class="info-value">{{ mediaItem.filetype || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">MIME Type</span>
              <span class="info-value">{{ mediaItem.mimetype || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Size</span>
              <span class="info-value">{{ mediaItem.filesize || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Created</span>
              <span class="info-value">{{ mediaItem.createdDate || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Modified</span>
              <span class="info-value">{{ mediaItem.modifiedDate || '—' }}</span>
            </div>
          </div>

          <!-- Dimensions (for video and image) -->
          <div v-if="isVideo || isImage" class="info-section">
            <h4 class="info-section-title">Dimensions</h4>
            <div v-if="mediaItem.width && mediaItem.height" class="info-item">
              <span class="info-label">Resolution</span>
              <span class="info-value">{{ mediaItem.width }} x {{ mediaItem.height }}</span>
            </div>
            <div v-if="mediaItem.duration" class="info-item">
              <span class="info-label">Duration</span>
              <span class="info-value">{{ mediaItem.duration }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getCollection, getMediaItem, getComments, addComment as addCommentToStore } from '@/utils/mockData';
import VideoPlayerWithComments from '@/components/VideoPlayerWithComments.vue';

export default {
  name: 'CollectionItemDetail',
  
  components: {
    VideoPlayerWithComments
  },
  
  setup() {
    const route = useRoute();
    const router = useRouter();
    const videoPlayer = ref(null);
    const commentInput = ref(null);
    const commentTimeline = ref(null);
    
    // Data
    const collection = ref({});
    const mediaItem = ref({});
    const comments = ref([]);
    const activeTab = ref('comments');
    const isPlaying = ref(false);
    const currentTime = ref(0);
    const duration = ref(0);
    const newComment = ref('');
    const showTimestamp = ref(false);
    
    // Computed values
    const collectionId = computed(() => route.params.id || 'nab-demo');
    const mediaItemId = computed(() => route.params.itemId || '1');
    
    const isVideo = computed(() => {
      if (!mediaItem.value) return false;
      return mediaItem.value.mimetype?.includes('video') || mediaItem.value.filetype?.includes('video');
    });
    
    const isImage = computed(() => {
      if (!mediaItem.value) return false;
      return mediaItem.value.mimetype?.includes('image') || mediaItem.value.filetype?.includes('image');
    });
    
    const isAudio = computed(() => {
      if (!mediaItem.value) return false; 
      return mediaItem.value.mimetype?.includes('audio') || mediaItem.value.filetype?.includes('audio');
    });
    
    const isDocument = computed(() => {
      return !isVideo.value && !isImage.value && !isAudio.value;
    });
    
    const progressPercentage = computed(() => {
      if (!duration.value) return 0;
      return (currentTime.value / duration.value) * 100;
    });
    
    const sortedComments = computed(() => {
      return [...comments.value].sort((a, b) => a.timestamp - b.timestamp);
    });
    
    // Methods
    const startPlayback = () => {
      if (videoPlayer.value) {
        videoPlayer.value.play();
      }
    };
    
    const togglePlayback = () => {
      if (!videoPlayer.value) return;
      
      if (isPlaying.value) {
        videoPlayer.value.pause();
      } else {
        videoPlayer.value.play();
      }
    };
    
    const onVideoPlay = () => {
      isPlaying.value = true;
    };
    
    const onVideoPause = () => {
      isPlaying.value = false;
    };
    
    const onVideoTimeUpdate = (time, videoDuration) => {
      currentTime.value = time;
      if (videoDuration && videoDuration !== duration.value) {
        duration.value = videoDuration;
      }
      
      // Show timestamp in comment input when video is playing
      if (isPlaying.value) {
        showTimestamp.value = true;
      }
    };
    
    const seekToPosition = (event) => {
      if (!videoPlayer.value || !commentTimeline.value || !duration.value) return;
      
      const rect = commentTimeline.value.getBoundingClientRect();
      const position = (event.clientX - rect.left) / rect.width;
      const seekTime = position * duration.value;
      
      videoPlayer.value.seekTo(seekTime);
    };
    
    const seekToTimestamp = (timestamp) => {
      if (!videoPlayer.value) return;
      
      videoPlayer.value.seekTo(timestamp);
      
      // Auto-play if paused
      if (!isPlaying.value) {
        videoPlayer.value.play();
      }
    };
    
    const getMarkerPosition = (timestamp) => {
      if (!duration.value) return 0;
      return (timestamp / duration.value) * 100;
    };
    
    const formatTime = (seconds) => {
      if (!isFinite(seconds)) return "00:00";
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    
    const formatRelativeTime = (dateString) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.round(diffMs / 1000);
      const diffMins = Math.round(diffSecs / 60);
      const diffHours = Math.round(diffMins / 60);
      const diffDays = Math.round(diffHours / 24);
      
      if (diffSecs < 60) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      
      return date.toLocaleDateString();
    };
    
    const getInitials = (name) => {
      return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    };
    
    const addComment = () => {
      if (!newComment.value.trim()) return;
      
      // Create a new comment object
      const comment = {
        id: `comment-${Date.now()}`,
        content: newComment.value.trim(),
        timestamp: currentTime.value,
        author: {
          id: 'user-123',
          name: 'Current User',
          avatar: getRandomAvatar()
        },
        createdAt: new Date().toISOString()
      };
      
      // Add comment to the store
      addCommentToStore(collectionId.value, mediaItemId.value, comment);
      
      // Update local comments
      comments.value.push(comment);
      
      // Clear input
      newComment.value = '';
      
      // Switch to comments tab
      activeTab.value = 'comments';
    };
    
    const getRandomAvatar = () => {
      const avatars = [
        undefined, // some users might not have avatars
        "https://randomuser.me/api/portraits/men/32.jpg",
        "https://randomuser.me/api/portraits/women/44.jpg",
        "https://randomuser.me/api/portraits/men/86.jpg",
        "https://randomuser.me/api/portraits/women/63.jpg"
      ];
      return avatars[Math.floor(Math.random() * avatars.length)];
    };
    
    // Load data on mount
    onMounted(() => {
      console.log('CollectionItemDetail mounted');
      console.log('Route params:', route.params);
      
      // Load collection data
      collection.value = getCollection(collectionId.value) || {
        id: 'not-found',
        title: 'Collection Not Found'
      };
      console.log('Loaded collection:', collection.value);
      
      // Load media item
      mediaItem.value = getMediaItem(collectionId.value, mediaItemId.value) || {
        id: 'not-found',
        title: 'Item Not Found'
      };
      console.log('Loaded media item:', mediaItem.value);
      
      // Load comments
      comments.value = getComments(collectionId.value, mediaItemId.value) || [];
      console.log('Loaded comments:', comments.value);
      
      // Animate detail elements after transition completes
      setTimeout(() => {
        const detailElements = document.querySelectorAll('.detail-element');
        console.log('Found detail elements:', detailElements.length);
        
        detailElements.forEach((el, index) => {
          // Stagger the animations
          setTimeout(() => {
            el.classList.add('animated');
          }, index * 50);
        });
      }, 300);
    });
    
    // Watch for route changes
    watch(
      () => route.params,
      () => {
        // Load new data when route changes
        collection.value = getCollection(collectionId.value) || {
          id: 'not-found',
          title: 'Collection Not Found'
        };
        
        mediaItem.value = getMediaItem(collectionId.value, mediaItemId.value) || {
          id: 'not-found',
          title: 'Item Not Found'
        };
        
        comments.value = getComments(collectionId.value, mediaItemId.value) || [];
        
        // Reset state
        activeTab.value = 'comments';
        isPlaying.value = false;
        currentTime.value = 0;
        duration.value = 0;
        newComment.value = '';
      }
    );
    
    return {
      collection,
      mediaItem,
      comments,
      activeTab,
      isPlaying,
      currentTime,
      duration,
      newComment,
      showTimestamp,
      collectionId,
      mediaItemId,
      videoPlayer,
      commentInput,
      commentTimeline,
      isVideo,
      isImage,
      isAudio,
      isDocument,
      progressPercentage,
      sortedComments,
      startPlayback,
      togglePlayback,
      onVideoPlay,
      onVideoPause,
      onVideoTimeUpdate,
      seekToPosition,
      seekToTimestamp,
      getMarkerPosition,
      formatTime,
      formatRelativeTime,
      getInitials,
      addComment
    };
  }
};
</script>

<style scoped>
.item-detail {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 80px);
}

/* Header styles */
.item-header-container {
  background-color: #f9fafb;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: background-color 0.3s ease;
}

@media (min-width: 640px) {
  .item-header-container {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.item-header-content {
  flex: 1;
}

.back-nav {
  margin-bottom: 0.5rem;
}

.back-button {
  display: flex;
  align-items: center;
  color: #6b7280;
  font-weight: normal;
  transition: color 0.2s;
}

.back-button:hover {
  color: #111827;
}

.back-icon {
  width: 1.25rem;
  height: 1.25rem;
  margin-right: 0.25rem;
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
  align-items: center;
  gap: 0.75rem;
  opacity: 0;
  animation: fade-in 0.3s ease-in-out 0.3s forwards;
}

.status-select-container {
  position: relative;
}

.status-select {
  appearance: none;
  background-color: white;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.375rem 2rem 0.375rem 1rem;
  color: #111827;
  font-weight: normal;
}

.select-arrow {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: #6b7280;
}

.download-button {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 1rem;
  background-color: #3b82f6;
  color: white;
  border-radius: 0.375rem;
  font-weight: normal;
  transition: background-color 0.2s;
}

.download-button:hover {
  background-color: #2563eb;
}

/* Main content styles */
.main-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background-color: #f9fafb;
}

@media (min-width: 768px) {
  .main-content {
    flex-direction: row;
  }
}

/* Content viewer styles */
.content-viewer {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.content-display {
  position: relative;
  flex: 1;
  background-color: black;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

/* Video container styles */
.video-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #000;
  z-index: 1;
  view-transition-name: initial;
  contain: paint;
}

.main-play-button {
  position: absolute;
  background-color: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
  border-radius: 9999px;
  padding: 1rem;
  color: white;
  opacity: 0.8;
  transition: all 0.2s;
  z-index: 10;
}

.main-play-button:hover {
  opacity: 1;
  transform: scale(1.1);
}

/* Image display styles */
.image-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-color: #000;
  position: relative;
  z-index: 1;
  view-transition-name: initial;
  contain: paint;
}

.image-display {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* Audio player styles */
.audio-player {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 2rem;
}

.audio-player-card {
  background-color: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 32rem;
}

.audio-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.audio-thumbnail-wrapper {
  width: 4rem;
  height: 4rem;
  border-radius: 0.25rem;
  overflow: hidden;
}

.audio-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.audio-info {
  flex: 1;
}

.audio-title {
  font-weight: 500;
  color: #111827;
}

.audio-subtitle {
  font-size: 0.875rem;
  color: #6b7280;
}

.audio-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.audio-play-button {
  background-color: transparent;
  color: #111827;
  padding: 0.25rem;
}

.audio-progress {
  flex: 1;
  height: 0.375rem;
}

.audio-progress-bar {
  background-color: #e5e7eb;
  height: 100%;
  border-radius: 9999px;
  overflow: hidden;
}

.audio-progress-fill {
  background-color: #3b82f6;
  height: 100%;
}

.audio-time {
  font-size: 0.875rem;
  color: #6b7280;
}

.audio-footer {
  display: flex;
  justify-content: space-between;
}

.audio-control-button {
  background-color: transparent;
  color: #6b7280;
  padding: 0.25rem;
}

.audio-control-button:hover {
  color: #111827;
}

/* Document viewer styles */
.document-viewer {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 2rem;
}

.document-container {
  background-color: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 32rem;
}

.document-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  color: #6b7280;
}

.document-title {
  font-weight: 500;
  color: #111827;
}

.document-preview {
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  padding: 1rem;
  margin-bottom: 1rem;
}

.document-preview-text {
  font-size: 0.875rem;
  color: #6b7280;
}

.document-actions {
  display: flex;
  justify-content: flex-end;
}

.document-download-button {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  background-color: #3b82f6;
  color: white;
  border-radius: 0.375rem;
  font-weight: normal;
  transition: background-color 0.2s;
}

.document-download-button:hover {
  background-color: #2563eb;
}

/* Comment input area styles */
.comment-input-area {
  border-top: 1px solid #e5e7eb;
  padding: 0.75rem 1rem;
  background-color: white;
}

.comment-input-container {
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 0.75rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.comment-timestamp {
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.comment-timestamp-time {
  font-family: monospace;
}

.comment-textarea {
  width: 100%;
  background-color: transparent;
  color: #111827;
  border: none;
  outline: none;
  resize: none;
  min-height: 60px;
  font-family: inherit;
  font-size: 0.875rem;
}

.comment-textarea::placeholder {
  color: #9ca3af;
}

.comment-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
}

.comment-tools {
  display: flex;
  gap: 0.5rem;
}

.comment-tool-button {
  background-color: transparent;
  color: #6b7280;
  padding: 0.25rem;
}

.comment-tool-button:hover {
  color: #111827;
}

.comment-submit-button {
  background-color: #3b82f6;
  color: white;
  font-size: 0.875rem;
  padding: 0.375rem 1rem;
  border-radius: 0.375rem;
  transition: background-color 0.2s;
}

.comment-submit-button:hover {
  background-color: #2563eb;
}

/* Comments sidebar styles */
.comments-sidebar {
  display: flex;
  flex-direction: column;
  width: 100%;
  border-top: 1px solid #e5e7eb;
  background-color: white;
  max-height: 300px;
}

@media (min-width: 768px) {
  .comments-sidebar {
    width: 400px;
    border-top: none;
    border-left: 1px solid #e5e7eb;
    max-height: none;
  }
}

@media (min-width: 1024px) {
  .comments-sidebar {
    width: 450px;
  }
}

/* Tabs header styles */
.tabs-header {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
}

.tab-button {
  flex: 1;
  text-align: center;
  padding: 0.75rem 1rem;
  border-bottom: 2px solid transparent;
  font-weight: 500;
  color: #6b7280;
  background-color: transparent;
}

.tab-button.active {
  border-bottom-color: #3b82f6;
  color: #3b82f6;
}

/* Video timeline styles */
.video-timeline-container {
  padding: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.timeline-controls {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

.timeline-play-button {
  margin-right: 0.75rem;
  background-color: transparent;
  color: #6b7280;
  padding: 0;
}

.timeline-time {
  font-size: 0.75rem;
  color: #6b7280;
  font-family: monospace;
  width: 3rem;
}

.comment-timeline {
  position: relative;
  height: 1.5rem;
  width: 100%;
  cursor: pointer;
}

.timeline-track {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 0.25rem;
  margin-top: -0.125rem;
  background-color: #e5e7eb;
  border-radius: 9999px;
}

.timeline-progress {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background-color: #3b82f6;
  border-radius: 9999px;
}

.timeline-cursor {
  position: absolute;
  top: 50%;
  width: 0.75rem;
  height: 0.75rem;
  background-color: #3b82f6;
  border-radius: 9999px;
  transform: translate(-50%, -50%);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.comment-markers {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.comment-marker {
  position: absolute;
  top: -1.25rem;
  transform: translateX(-50%);
  z-index: 10;
  background-color: transparent;
  padding: 0;
  transition: transform 0.2s;
}

.comment-marker:hover {
  transform: translateX(-50%) scale(1.1);
}

.marker-avatar {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #8b5cf6;
  z-index: 1;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-fallback {
  font-size: 0.625rem;
  font-weight: 500;
  color: white;
}

.marker-pointer {
  width: 0;
  height: 0;
  border-left: 0.375rem solid transparent;
  border-right: 0.375rem solid transparent;
  border-top: 0.5rem solid white;
  margin-top: -0.25rem;
}

/* Comments panel styles */
.comments-panel {
  flex: 1;
  overflow-y: auto;
}

.no-comments {
  padding: 1.5rem;
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
}

.comments-list {
  padding: 0.75rem 0;
}

.comment-item {
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.comment-header {
  display: flex;
  gap: 0.75rem;
}

.comment-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  background-color: #8b5cf6;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.comment-meta {
  flex: 1;
}

.comment-author-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.comment-author {
  font-size: 0.875rem;
  font-weight: 500;
  color: #111827;
}

.comment-time {
  font-size: 0.75rem;
  color: #6b7280;
}

.comment-content {
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
  color: #374151;
}

.timestamp-button {
  font-size: 0.75rem;
  font-family: monospace;
  background-color: #f3f4f6;
  color: #6b7280;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  margin-right: 0.25rem;
}

.comment-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.comment-action-button {
  background-color: transparent;
  color: #6b7280;
  font-size: 0.75rem;
  padding: 0;
}

.comment-action-button:hover {
  color: #111827;
}

/* Info panel styles */
.info-panel {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.info-title {
  font-size: 1.125rem;
  font-weight: 500;
  color: #111827;
  margin-bottom: 1rem;
}

.info-section {
  margin-bottom: 1rem;
}

.info-section-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #111827;
  margin-bottom: 0.5rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  font-size: 0.875rem;
}

.info-label {
  color: #6b7280;
}

.info-value {
  color: #111827;
}
</style>