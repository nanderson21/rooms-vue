<template>
  <div class="content-review-popover-container">
    <!-- Overlay & Popover: Show the expanded review UI -->
    <transition name="fade">
      <div class="review-overlay" @click.self="closeReview">
        <div class="backdrop-blur"></div>
        
        <transition name="zoom">
          <div class="threaded-video-review" ref="reviewContainer">
            <!-- Video title bar -->
            <div class="video-title-bar">
              <div class="title-text">{{ videoTitle }}</div>
              <div class="title-actions">
                <button class="minimize-button">
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
                <button class="close-button" @click="closeReview">
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
            
            <!-- Main container with video and threads -->
            <div class="review-container">
              <!-- Left column with video player and comment box -->
              <div class="video-column">
                <!-- Video player area -->
                <div class="video-player-container">
                  <video 
                    ref="videoElement" 
                    class="video-player" 
                    :src="videoSrc"
                    @timeupdate="onTimeUpdate"
                    @loadedmetadata="onVideoLoaded"
                  ></video>
                  
                  <!-- Video controls -->
                  <div class="video-controls">
                    <button class="play-button" @click="togglePlayback">
                      <svg v-if="isPlaying" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
                        <rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>
                      </svg>
                      <svg v-else viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                    </button>
                    
                    <div class="volume-button">
                      <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                      </svg>
                    </div>
                    
                    <div class="time-display">{{ formatTime(currentTime) }}</div>
                    
                    <!-- Timeline with markers -->
                    <div class="timeline-container" @click="seekToPosition">
                      <div class="timeline-track">
                        <div class="timeline-progress" :style="{ width: `${progressPercentage}%` }"></div>
                        
                        <!-- Timeline markers -->
                        <div 
                          v-for="thread in threads" 
                          :key="thread.timecode"
                          class="timeline-marker"
                          :class="{ 
                            'marker-approved': thread.status === 'approved',
                            'marker-rejected': thread.status === 'rejected',
                            'marker-reviewing': thread.status === 'reviewing'
                          }"
                          :style="{ left: `${getMarkerPosition(thread.timecode)}%` }"
                          @click.stop="seekToTimecode(thread.timecode)"
                        >
                          <div class="marker-tooltip">{{ formatTimecode(thread.timecode) }}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div class="duration-display">{{ formatTime(duration) }}</div>
                    
                    <div class="video-info">
                      {{ videoWidth }} x {{ videoHeight }} | AVC | AAC LC | {{ formatFileSize(fileSize) }}
                    </div>
                    
                    <button class="fullscreen-button">
                      <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                      </svg>
                    </button>
                  </div>
                </div>
                
                <!-- New thread form - moved under the video player for desktop -->
                <div class="vjs-new-thread-container desktop-only">
                  <div class="vjs-comment-input">
                    <textarea placeholder="Add comment to new thread..." class="" v-model="newThreadComment"></textarea>
                  </div>
                  <div class="button-container">
                    <button class="vjs-create-thread" @click="createNewThread">Create New Thread</button>
                  </div>
                </div>
              </div>
              
              <!-- Threads panel (right sidebar) -->
              <div class="threads-panel">
                <div class="threads-header">
                  <h3>Threads</h3>
                  <div class="header-actions">
                    <button class="action-button search-button" @click="toggleSearchBox">
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                    </button>
                    <div class="export-button" :class="{ 'icon-only': isMobileView }">
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      <span v-if="!isMobileView">Export Markers</span>
                    </div>
                  </div>
                </div>
                
                <div class="user-info">
                  User: {{ currentUser }}
                </div>
                
                <!-- Search box that appears when search button is clicked -->
                <div class="thread-search" v-if="showSearch">
                  <input type="text" placeholder="Search threads..." class="search-input" ref="searchInput" />
                </div>
                
                <div class="user-filter">
                  <span class="user-tag active">{{ currentUser }}</span>
                </div>
                
                <!-- Thread list -->
                <div class="threads-list">
                  <div 
                    v-for="thread in threads" 
                    :key="thread.timecode"
                    class="vjs-thread"
                    :class="{ 
                      'active': selectedThread === thread.timecode,
                      'approved': thread.status === 'approved',
                      'rejected': thread.status === 'rejected',
                      'reviewing': thread.status === 'reviewing'
                    }"
                    @click="selectThread(thread.timecode)"
                    :data-thread-id="thread.timecode"
                  >
                    <div class="thread-header">
                      <div class="thread-range">
                        <div class="thread-time-info">
                          <button class="thread-timestamp jump-to-time" @click.stop="seekToTimecode(thread.timecode)">
                            {{ formatTimecode(thread.timecode) }}
                          </button>
                        </div>
                        <div class="thread-actions">
                          <button class="thread-approval-status">
                            {{ thread.status === 'reviewing' ? 'Reviewing' : thread.status }}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div class="thread-approval-buttons" v-if="thread.status === 'reviewing'">
                      <button class="approve-thread" @click.stop="approveThread(thread)">Approve</button>
                      <button class="reject-thread" @click.stop="rejectThread(thread)">Reject</button>
                    </div>
                    
                    <div class="thread-comments">
                      <div class="vjs-comment" :data-comment-id="thread.timecode">
                        <div class="vjs-comment-meta">
                          <strong>{{ thread.author }}</strong>{{ thread.date }}
                        </div>
                        <p class="comment-text">{{ thread.comment }}</p>
                        <div class="comment-actions">
                          <button class="edit-comment" @click.stop>Edit</button>
                          <button class="delete-comment" @click.stop>Delete</button>
                          <button class="reply-comment" @click.stop>Reply</button>
                        </div>
                      </div>
                    </div>
                    
                    <div class="thread-add-comment">
                      <button class="add-comment-btn" @click.stop>Add Comment to this Thread</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Mobile floating new thread form -->
            <div class="vjs-new-thread-container mobile-overlay" v-if="isMobileView">
              <div class="vjs-comment-input">
                <textarea placeholder="Add comment to new thread..." class="" v-model="newThreadComment"></textarea>
              </div>
              <div class="button-container">
                <button class="vjs-create-thread" @click="createNewThread">Create New Thread</button>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';

// Props
const props = defineProps({
  videoSrc: {
    type: String,
    default: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  },
  videoTitle: {
    type: String,
    default: '01 - H264 - BTS REDirect Surf.mp4'
  },
  initialThreads: {
    type: Array,
    default: () => [
      {
        timecode: '00:00:14',
        status: 'reviewing',
        author: 'nab2025',
        comment: 'Comment',
        date: '5/7/2025, 4:55:43 PM'
      },
      {
        timecode: '00:36:04',
        status: 'approved',
        author: 'nab2025',
        comment: 'Here',
        date: '5/9/2025, 11:03:38 AM'
      },
      {
        timecode: '01:03:19',
        status: 'rejected',
        author: 'nab2025',
        comment: 'Here\'s a bike',
        date: '5/8/2025, 11:03:51 AM'
      },
      {
        timecode: '01:32:02',
        status: 'approved',
        author: 'nab2025',
        comment: 'Surfing',
        date: '5/9/2025, 11:03:57 AM'
      },
      {
        timecode: '01:58:01',
        status: 'reviewing',
        author: 'nab2025',
        comment: 'Riley',
        date: '5/9/2025, 11:04:02 AM'
      }
    ]
  }
});

// State
const reviewContainer = ref(null);
const videoElement = ref(null);
const searchInput = ref(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const videoWidth = ref(1920);
const videoHeight = ref(1080);
const fileSize = ref(45.3 * 1024 * 1024); // 45.3 MB
const threads = ref(props.initialThreads);
const selectedThread = ref(null);
const newThreadComment = ref('');
const currentUser = ref('nicktanderson');
const isMobileView = ref(false);
const showSearch = ref(false);

// Computed
const progressPercentage = computed(() => {
  if (!duration.value) return 0;
  return (currentTime.value / duration.value) * 100;
});

// Search related methods
const toggleSearchBox = () => {
  showSearch.value = !showSearch.value;
  if (showSearch.value) {
    nextTick(() => {
      if (searchInput.value) {
        searchInput.value.focus();
      }
    });
  }
};

// Methods
const togglePlayback = () => {
  if (!videoElement.value) return;
  
  if (isPlaying.value) {
    videoElement.value.pause();
    isPlaying.value = false;
  } else {
    videoElement.value.play();
    isPlaying.value = true;
  }
};

const onTimeUpdate = () => {
  if (!videoElement.value) return;
  currentTime.value = videoElement.value.currentTime;
};

const onVideoLoaded = () => {
  if (!videoElement.value) return;
  duration.value = videoElement.value.duration;
  videoWidth.value = videoElement.value.videoWidth || 1920;
  videoHeight.value = videoElement.value.videoHeight || 1080;
};

const seekToPosition = (event) => {
  if (!videoElement.value || !duration.value) return;
  
  const trackRect = event.currentTarget.getBoundingClientRect();
  const clickPosition = event.clientX - trackRect.left;
  const trackWidth = trackRect.width;
  const seekPercentage = clickPosition / trackWidth;
  const seekTime = seekPercentage * duration.value;
  
  videoElement.value.currentTime = seekTime;
};

const seekToTimecode = (timecode) => {
  if (!videoElement.value) return;
  
  const seconds = convertTimecodeToSeconds(timecode);
  videoElement.value.currentTime = seconds;
  selectedThread.value = timecode;
};

const getMarkerPosition = (timecode) => {
  const totalSeconds = duration.value;
  if (!totalSeconds) return 0;
  
  const seconds = convertTimecodeToSeconds(timecode);
  return (seconds / totalSeconds) * 100;
};

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatTimecode = (timecode) => {
  // Already in the correct format "00:00:00:00"
  return timecode;
};

const formatDate = (dateString) => {
  // Already in the correct format
  return dateString;
};

const formatFileSize = (bytes) => {
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes.toFixed(1)} MB/s`;
};

const convertTimecodeToSeconds = (timecode) => {
  // Format expected: "00:00:00" or "00:00:00:00" (ignoring frames)
  const parts = timecode.split(':');
  
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  
  if (parts.length >= 3) {
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10);
    seconds = parseInt(parts[2], 10);
  } else if (parts.length === 2) {
    minutes = parseInt(parts[0], 10);
    seconds = parseInt(parts[1], 10);
  } else {
    seconds = parseInt(parts[0], 10);
  }
  
  return hours * 3600 + minutes * 60 + seconds;
};

const selectThread = (timecode) => {
  selectedThread.value = timecode;
  seekToTimecode(timecode);
};

const createNewThread = () => {
  if (!newThreadComment.value.trim()) return;
  
  // Format current time as timecode
  const time = currentTime.value;
  const hours = Math.floor(time / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((time % 3600) / 60).toString().padStart(2, '0');
  const seconds = Math.floor(time % 60).toString().padStart(2, '0');
  const frames = Math.floor((time % 1) * 24).toString().padStart(2, '0'); // Assuming 24fps
  
  const timecode = `${hours}:${minutes}:${seconds}:${frames}`;
  
  // Add new thread
  threads.value.push({
    timecode,
    status: 'reviewing',
    author: currentUser.value,
    comment: newThreadComment.value,
    date: new Date().toLocaleString()
  });
  
  // Sort threads by timecode
  threads.value.sort((a, b) => {
    return convertTimecodeToSeconds(a.timecode) - convertTimecodeToSeconds(b.timecode);
  });
  
  // Reset input and select the new thread
  newThreadComment.value = '';
  selectedThread.value = timecode;
};

// New methods for approving and rejecting threads
const approveThread = (thread) => {
  const index = threads.value.findIndex(t => t.timecode === thread.timecode);
  if (index !== -1) {
    threads.value[index].status = 'approved';
  }
};

const rejectThread = (thread) => {
  const index = threads.value.findIndex(t => t.timecode === thread.timecode);
  if (index !== -1) {
    threads.value[index].status = 'rejected';
  }
};

// Emits
const emit = defineEmits(['close']);

// Close method
const closeReview = () => {
  emit('close');
};

// Method to adjust the comments panel height
const adjustCommentsPanelHeight = () => {
  if (reviewContainer.value) {
    // This is a placeholder for the adjustment logic
    // In a real implementation, this would calculate heights based on elements
    console.log('Adjusting panel height for container:', reviewContainer.value);
  }
};

// Lifecycle hooks
onMounted(() => {
  console.log('ThreadedVideoReview component mounted');
  console.log('Video source:', props.videoSrc);
  console.log('Video title:', props.videoTitle);
  console.log('Initial threads:', threads.value);
  
  if (videoElement.value) {
    console.log('Video element found in DOM');
    videoElement.value.addEventListener('ended', () => {
      isPlaying.value = false;
    });
  } else {
    console.warn('Video element not found in DOM');
  }
  
  // Select first thread by default
  if (threads.value.length > 0) {
    selectedThread.value = threads.value[0].timecode;
    console.log('Selected thread:', selectedThread.value);
  }
  
  // Adjust panel height initially
  setTimeout(adjustCommentsPanelHeight, 100);
  
  // Add window resize listener to adjust panel height
  window.addEventListener('resize', adjustCommentsPanelHeight);
  
  checkMobileView();
  window.addEventListener('resize', checkMobileView);
  
  // Clean up function
  return () => {
    window.removeEventListener('resize', adjustCommentsPanelHeight);
    window.removeEventListener('resize', checkMobileView);
  };
});

const checkMobileView = () => {
  isMobileView.value = window.innerWidth <= 768;
};
</script>

<style scoped>
*, ::after, ::before {
  margin: 0;
  padding: 0;
}

::after, ::before {
  box-sizing: border-box;
  margin-bottom: 0;
}

.inherited-styles-for-exported-element {
  color: #e5e5e5;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
  font-size: 16px;
  line-height: 1.6;
}

button {
  font-family: inherit;
  outline: 0;
}

:root {
  --font-body: "Inter", "Open Sans", sans-serif;
  --elevation-1: 0px 1px 2px rgba(0, 0, 0, .1);
  --color-light: white;
}

.content-review-popover-container {
  position: relative;
}

.review-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 1rem;
}

.backdrop-blur {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.zoom-enter-active,
.zoom-leave-active {
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.zoom-enter-from {
  opacity: 0;
  transform: scale(0.9);
}

.zoom-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.threaded-video-review {
  display: flex;
  flex-direction: column;
  width: 90%;
  max-width: 1200px;
  height: 90vh;
  max-height: 800px;
  background-color: #1a1a1a;
  color: #e5e5e5;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
  font-size: 16px;
  line-height: 1.6;
  border-radius: 8px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  position: relative;
  overflow: hidden;
  z-index: 51;
}

.video-title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #000;
  padding: 8px 16px;
  border-bottom: 1px solid #333;
}

.title-text {
  font-size: 14px;
  font-weight: 500;
}

.title-actions {
  display: flex;
  gap: 12px;
}

.minimize-button,
.close-button {
  background: none;
  border: none;
  color: #aaa;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}

.minimize-button:hover,
.close-button:hover {
  color: white;
}

.review-container {
  display: flex;
  flex: 1;
  height: calc(100% - 40px);
}

.video-column {
  flex: 3;
  display: flex;
  flex-direction: column;
}

.video-player-container {
  position: relative;
  background-color: #000;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.video-player {
  flex: 1;
  width: 100%;
  height: calc(100% - 40px);
  background-color: #000;
}

.video-controls {
  height: 40px;
  background-color: #111;
  display: flex;
  align-items: center;
  padding: 0 10px;
  gap: 10px;
}

.play-button,
.volume-button,
.fullscreen-button {
  background: none;
  border: none;
  color: #ccc;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
}

.play-button:hover,
.volume-button:hover,
.fullscreen-button:hover {
  color: white;
}

.time-display,
.duration-display {
  font-size: 12px;
  color: #ccc;
  min-width: 40px;
}

.timeline-container {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  cursor: pointer;
  position: relative;
}

.timeline-track {
  position: relative;
  width: 100%;
  height: 6px;
  background-color: #333;
  border-radius: 3px;
}

.timeline-progress {
  position: absolute;
  height: 100%;
  background-color: #2090FF;
  border-radius: 3px;
}

.timeline-marker {
  position: absolute;
  top: -7px;
  width: 8px;
  height: 20px;
  transform: translateX(-50%);
  z-index: 2;
  cursor: pointer;
  border-radius: 2px;
  transition: transform 0.2s;
}

.timeline-marker:hover {
  transform: translateX(-50%) scale(1.2);
}

.timeline-marker .marker-tooltip {
  position: absolute;
  bottom: 25px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.timeline-marker:hover .marker-tooltip {
  opacity: 1;
}

.marker-approved {
  background-color: #029032;
  box-shadow: 0 0 5px rgba(2, 144, 50, 0.6);
}

.marker-rejected {
  background-color: #e70821;
  box-shadow: 0 0 5px rgba(231, 8, 33, 0.6);
}

.marker-reviewing {
  background-color: #f39c12;
  box-shadow: 0 0 5px rgba(243, 156, 18, 0.6);
}

.video-info {
  font-size: 11px;
  color: #999;
  margin-left: auto;
  margin-right: 10px;
}

.threads-panel {
  flex: 1;
  min-width: 320px;
  max-width: 380px;
  background-color: #f5f5f5;
  color: #333;
  border-left: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.threads-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #ddd;
  background-color: #fff;
}

.threads-header h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-button {
  background: none;
  border: none;
  color: #333;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 4px;
}

.action-button:hover {
  background-color: #f0f0f0;
}

.search-button svg {
  width: 16px;
  height: 16px;
}

.export-button {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #333;
  padding: 5px 10px;
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.export-button:hover {
  background-color: #e8e8e8;
}

.user-info {
  padding: 8px 16px;
  font-size: 12px;
  color: #666;
  border-bottom: 1px solid #eaeaea;
}

.thread-search {
  padding: 8px 16px;
  border-bottom: 1px solid #eaeaea;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
}

.user-filter {
  padding: 8px 16px;
  border-bottom: 1px solid #eaeaea;
  display: flex;
}

.user-tag {
  background-color: #eee;
  padding: 4px 10px;
  border-radius: 99px;
  font-size: 12px;
  cursor: pointer;
}

.user-tag.active {
  background-color: #2090FF;
  color: white;
}

/* Thread List Styling */
.threads-list {
  height: calc(100% - 120px);
  max-height: none;
  overflow-y: auto;
  padding: 10px;
}

/* Thread Item Styling */
.vjs-thread {
  background: var(--color-light);
  background-repeat: repeat;
  border-radius: 4px;
  box-shadow: var(--elevation-1);
  margin-bottom: 15px;
  padding: 8px;
}

.vjs-thread.approved {
  border: 2px solid #029032;
}

.vjs-thread.rejected {
  border: 2px solid #e70821;
}

.vjs-thread.reviewing {
  border: 2px solid #f39c12;
}

.thread-header, .thread-range {
  display: flex;
  justify-content: space-between;
}

.thread-header {
  border-bottom: 1px solid rgba(255, 255, 255, .1);
  margin-bottom: 5px;
  padding-bottom: 3px;
}

.thread-range {
  align-items: center;
  column-gap: 15px;
  row-gap: 15px;
  width: 100%;
}

.thread-timestamp {
  align-items: center;
  background: var(--color-light);
  background-repeat: repeat;
  border: 1px solid #165997;
  border-radius: 4px;
  color: #000;
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 600;
  justify-content: center;
  transition: all 0s cubic-bezier(.23, 1, .32, 1);
  padding: 2px 6px;
}

.thread-timestamp:hover,
.comment-actions button:hover,
.add-comment-btn:hover,
.approve-thread:hover,
.reject-thread:hover,
.export-button:hover {
  background-color: #165997;
  color: #fff !important;
}

.approve-thread:hover {
  background-color: #029032;
  color: #fff !important;
}

.reject-thread:hover {
  background-color: #e70821;
  color: #fff !important;
}

.thread-actions, .thread-approval-buttons {
  align-items: center;
  column-gap: 5px;
  display: flex;
  row-gap: 5px;
}

.thread-approval-buttons {
  margin-bottom: 5px;
  width: 100%;
}

.thread-approval-status {
  align-items: center;
  background: var(--color-light);
  background-repeat: repeat;
  border: 1px solid #f39c12;
  border-radius: 4px;
  color: #000;
  display: flex;
  font-family: var(--font-body);
  font-weight: 600;
  justify-content: center;
  transition: all 0s cubic-bezier(.23, 1, .32, 1);
  font-size: 12px;
  padding: 2px 7px;
  flex-shrink: 0;
  text-transform: capitalize;
}

.vjs-thread.approved .thread-approval-status {
  border: 1px solid #029032;
}

.vjs-thread.rejected .thread-approval-status {
  border: 1px solid #e70821;
}

.approve-thread, .reject-thread {
  border-radius: 4px;
  border-style: solid;
  border-width: 1px;
  align-items: center;
  background: var(--color-light);
  background-repeat: repeat;
  color: #000;
  cursor: pointer;
  display: flex;
  flex: 1 1 0;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  justify-content: center;
  padding: 6px 10px;
  transition: all 0s cubic-bezier(.23, 1, .32, 1);
  width: 100%;
}

.approve-thread {
  border-color: #029032;
}

.approve-thread:hover {
  background-color: #029032;
  color: var(--color-light);
}

.reject-thread {
  border-color: #e70821;
}

.reject-thread:hover {
  background-color: #e70821;
  color: var(--color-light);
}

.vjs-thread.approved .thread-approval-buttons, 
.vjs-thread.rejected .thread-approval-buttons {
  display: none;
}

/* Comment styling */
.vjs-comment {
  border-radius: 4px;
  border-style: solid;
  border-width: 1px;
  border-color: rgba(0, 0, 0, .1);
  padding: 6px 6px 4px;
}

.vjs-comment-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 3px;
}

.comment-text {
  margin-bottom: 1px;
  margin-top: 1px;
}

.thread-comments {
  column-gap: 5px;
  display: flex;
  flex-direction: column;
  row-gap: 5px;
}

.thread-add-comment {
  margin-top: 5px;
}

.add-comment-btn, .comment-actions button {
  align-items: center;
  background: var(--color-light);
  background-repeat: repeat;
  border: 1px solid #165997;
  border-radius: 4px;
  color: #000;
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
  font-family: var(--font-body);
  font-weight: 600;
  justify-content: center;
  transition: all 0s cubic-bezier(.23, 1, .32, 1);
}

.add-comment-btn {
  font-size: 14px;
  padding: 6px 10px;
  width: 100%;
}

.add-comment-btn:hover {
  background-color: #165997;
  color: var(--color-light);
}

.comment-actions {
  column-gap: 8px;
  display: flex;
  margin-top: 6px;
  row-gap: 8px;
}

.comment-actions button {
  font-size: 11px;
  padding: 2px 6px;
}

.thread-time-info {
  display: flex;
  flex-direction: column;
}

/* New thread form - moved under the video player for desktop */
.vjs-new-thread-container.desktop-only {
  align-items: center;
  background-color: #f0f0f0;
  color: #000;
  display: flex;
  flex-direction: column;
  padding: 14px;
}

.vjs-comment-input textarea, .vjs-create-thread {
  background: var(--color-light);
  background-repeat: repeat;
  border-radius: 4px;
  border-style: solid;
  border-width: 1px;
  font-family: var(--font-body);
  font-size: 14px;
  transition: all 0s cubic-bezier(.23, 1, .32, 1);
  transition-behavior: normal;
  width: 100%;
}

.vjs-comment-input textarea {
  border-color: rgba(0, 0, 0, .1);
  box-shadow: var(--elevation-1);
  box-sizing: border-box;
  max-height: 150px;
  padding: 8px 12px;
  resize: none;
}

.vjs-create-thread {
  align-items: center;
  border-color: #165997;
  color: #000;
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
  font-weight: 600;
  justify-content: center;
  padding: 6px 10px;
}

.vjs-create-thread:hover {
  background-color: #165997;
  color: #fff;
}

.vjs-comment-input {
  margin-bottom: 10px;
  width: 100%;
}

* {
  box-sizing: border-box;
}

:focus {
  outline: 0;
}

.inherited-styles-for-exported-element {
  cursor: initial;
  font-family: "Inter", "Open Sans", sans-serif;
  font-size: 14px;
  font-weight: 400;
}

textarea {
  color: inherit;
  line-height: normal;
  margin: 0;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .threaded-video-review {
    width: 100%;
    height: 100%;
    max-height: none;
    border-radius: 0;
  }
  
  .review-overlay {
    padding: 0;
  }
  
  .review-container {
    flex-direction: column;
    height: calc(100% - 40px);
  }
  
  .video-column {
    flex: none;
    height: 50%;
  }
  
  .threads-panel {
    flex: 1;
    max-width: none;
    min-width: 0;
    width: 100%;
    height: 50%;
    position: relative;
    padding-bottom: 70px; /* Make space for the fixed overlay */
  }
  
  .video-controls {
    gap: 5px;
  }
  
  .video-info {
    display: none;
  }
  
  .timeline-container {
    width: 100%;
  }
  
  /* When on mobile, move the new thread container out of the video-column */
  .video-column .vjs-new-thread-container {
    display: none;
  }
  
  .threads-list {
    height: calc(100% - 120px);
    padding-bottom: 10px;
  }
  
  .threads-header {
    display: flex;
    justify-content: space-between;
    padding: 10px 16px;
  }
  
  .user-info {
    padding: 6px 16px;
    font-size: 11px;
  }
  
  .user-filter {
    padding: 6px 16px;
  }
  
  /* Optimize space by making buttons smaller */
  .thread-timestamp, 
  .thread-approval-status,
  .comment-actions button {
    padding: 1px 5px;
    font-size: 11px;
  }
  
  .approve-thread, 
  .reject-thread {
    padding: 5px 8px;
    font-size: 13px;
  }
}

/* Very small devices */
@media (max-width: 480px) {
  .comment-actions {
    flex-wrap: wrap;
    gap: 4px;
  }
  
  .thread-approval-buttons {
    gap: 6px;
  }
  
  /* Make thread items more compact */
  .vjs-thread {
    padding: 6px;
    margin-bottom: 10px;
  }
  
  .thread-timestamp, 
  .thread-approval-status {
    font-size: 10px;
  }
  
  .vjs-comment {
    padding: 4px;
  }
  
  .vjs-comment-meta {
    font-size: 11px;
  }
  
  .comment-text {
    font-size: 12px;
  }
}

/* New styles for mobile view */
.vjs-new-thread-container.mobile-overlay {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 55;
  border-top: 1px solid #ddd;
  padding: 10px;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  background-color: #f0f0f0; /* Ensure background color is visible */
}

.export-button.icon-only {
  width: 36px;
  height: 36px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.export-button.icon-only svg {
  width: 20px;
  height: 20px;
}

.thread-search.icon-only {
  position: relative;
  padding: 0 16px;
}

.thread-search.icon-only .search-icon {
  position: absolute;
  left: 24px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  color: #666;
}

.thread-search.icon-only input {
  padding-left: 32px;
}

.search-icon {
  display: flex;
  align-items: center;
}

.vjs-new-thread-container .button-container {
  width: 100%;
}

/* Export button styles */
.export-button.icon-only {
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0;
}

.export-button.icon-only svg {
  width: 20px;
  height: 20px;
}

/* Media queries */
@media (max-width: 768px) {
  .threaded-video-review {
    width: 100%;
    height: 100%;
    max-height: none;
    border-radius: 0;
  }
  
  .review-overlay {
    padding: 0;
  }
  
  .review-container {
    flex-direction: column;
    height: calc(100% - 40px);
  }
  
  .video-column {
    flex: none;
    height: 50%;
  }
  
  .threads-panel {
    flex: 1;
    max-width: none;
    min-width: 0;
    width: 100%;
    height: 50%;
    position: relative;
  }
  
  .vjs-new-thread-container.desktop-only {
    display: none;
  }
  
  .video-controls {
    gap: 5px;
  }
  
  .video-info {
    display: none;
  }
  
  .timeline-container {
    width: 100%;
  }
  
  .threads-list {
    height: calc(100% - 120px);
    padding-bottom: 80px; /* Extra space for the mobile comment box */
  }
  
  .threads-header {
    display: flex;
    justify-content: space-between;
    padding: 10px 16px;
  }
  
  .user-info {
    padding: 6px 16px;
    font-size: 11px;
  }
  
  .user-filter {
    padding: 6px 16px;
  }
  
  /* Optimize space by making buttons smaller */
  .thread-timestamp, 
  .thread-approval-status,
  .comment-actions button {
    padding: 1px 5px;
    font-size: 11px;
  }
  
  .approve-thread, 
  .reject-thread {
    padding: 5px 8px;
    font-size: 13px;
  }
}

@media (min-width: 769px) {
  .vjs-new-thread-container.mobile-overlay {
    display: none;
  }
}

/* Very small devices */
@media (max-width: 480px) {
  .comment-actions {
    flex-wrap: wrap;
    gap: 4px;
  }
  
  .thread-approval-buttons {
    gap: 6px;
  }
  
  /* Make thread items more compact */
  .vjs-thread {
    padding: 6px;
    margin-bottom: 10px;
  }
  
  .thread-timestamp, 
  .thread-approval-status {
    font-size: 10px;
  }
  
  .vjs-comment {
    padding: 4px;
  }
  
  .vjs-comment-meta {
    font-size: 11px;
  }
  
  .comment-text {
    font-size: 12px;
  }
}
</style> 