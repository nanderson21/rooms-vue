<template>
  <div class="video-player-with-comments">
    <video
      ref="videoElement"
      class="video-element"
      :poster="poster"
     
      @play="onPlay"
      @pause="onPause"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onMetadataLoaded"
      @ended="onEnded"
      crossorigin="anonymous"
    ></video>
    
    <!-- Video Controls -->
    <div 
      class="video-controls"
      :class="{ 'controls-hidden': !controlsVisible && isPlaying }"
      @mouseenter="showControls"
      @mouseleave="hideControlsDebounced"
    >
      <div class="progress-container" @click="seekToPosition">
        <div class="progress-bar">
          <div 
            class="progress-fill"
            :style="{ width: `${progressPercentage}%` }"
          ></div>
          
          <!-- Comment markers on progress bar -->
          <div 
            v-for="comment in comments" 
            :key="comment.id"
            class="progress-marker"
            :style="{ left: `${getMarkerPosition(comment.timestamp)}%` }"
            :title="comment.content"
            @click.stop="seekToTimestamp(comment.timestamp)"
          ></div>
        </div>
      </div>
      
      <div class="controls-row">
        <div class="controls-left">
          <button 
            class="control-button play-button" 
            @click="togglePlayback"
            :title="isPlaying ? 'Pause' : 'Play'"
          >
            <svg v-if="isPlaying" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
            <svg v-else viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </button>
          
          <div class="time-display">
            <span class="current-time">{{ formatTime(currentTime) }}</span>
            <span class="time-separator">/</span>
            <span class="duration">{{ formatTime(duration) }}</span>
          </div>
        </div>
        
        <div class="controls-right">
          <button class="control-button volume-button" @click="toggleMute" :title="isMuted ? 'Unmute' : 'Mute'">
            <svg v-if="isMuted" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <line x1="23" y1="9" x2="17" y2="15"></line>
              <line x1="17" y1="9" x2="23" y2="15"></line>
            </svg>
            <svg v-else viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
          </button>
          
          <div class="video-resolution" v-if="videoWidth && videoHeight">
            {{ videoWidth }} x {{ videoHeight }}
          </div>
          
          <button class="control-button fullscreen-button" @click="toggleFullscreen" title="Fullscreen">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';

export default {
  name: 'VideoPlayerWithComments',
  
  props: {
    src: {
      type: String,
      required: true
    },
    
    poster: {
      type: String,
      default: ''
    },
    
    comments: {
      type: Array,
      default: () => []
    },
    
    autoPlay: {
      type: Boolean,
      default: false
    },
    
    transitionName: {
      type: String,
      default: ''
    }
  },
  
  emits: ['play', 'pause', 'timeupdate', 'ended'],
  
  setup(props, { emit }) {
    const videoElement = ref(null);
    const isPlaying = ref(false);
    const currentTime = ref(0);
    const duration = ref(0);
    const isMuted = ref(false);
    const videoWidth = ref(0);
    const videoHeight = ref(0);
    const controlsVisible = ref(true);
    const controlsTimeout = ref(null);
    
    // Computed properties
    const progressPercentage = computed(() => {
      if (!duration.value) return 0;
      return (currentTime.value / duration.value) * 100;
    });
    
    // Event handlers
    const onPlay = () => {
      isPlaying.value = true;
      emit('play');
      hideControlsDebounced();
    };
    
    const onPause = () => {
      isPlaying.value = false;
      emit('pause');
      showControls();
    };
    
    const onTimeUpdate = () => {
      if (!videoElement.value) return;
      
      currentTime.value = videoElement.value.currentTime;
      emit('timeupdate', currentTime.value, duration.value);
    };
    
    const onMetadataLoaded = () => {
      if (!videoElement.value) return;
      
      duration.value = videoElement.value.duration;
      videoWidth.value = videoElement.value.videoWidth;
      videoHeight.value = videoElement.value.videoHeight;
    };
    
    const onEnded = () => {
      isPlaying.value = false;
      emit('ended');
      showControls();
    };
    
    // Control functions
    const play = () => {
      if (!videoElement.value) return;
      
      videoElement.value.play()
        .catch(error => {
          console.error("Failed to play video:", error);
        });
    };
    
    const pause = () => {
      if (!videoElement.value) return;
      
      videoElement.value.pause();
    };
    
    const togglePlayback = () => {
      if (isPlaying.value) {
        pause();
      } else {
        play();
      }
    };
    
    const seekTo = (time) => {
      if (!videoElement.value) return;
      
      videoElement.value.currentTime = time;
    };
    
    const seekToPosition = (event) => {
      if (!videoElement.value || !duration.value) return;
      
      const progressContainer = event.currentTarget;
      const rect = progressContainer.getBoundingClientRect();
      const position = (event.clientX - rect.left) / rect.width;
      const seekTime = position * duration.value;
      
      seekTo(seekTime);
    };
    
    const seekToTimestamp = (timestamp) => {
      seekTo(timestamp);
    };
    
    const toggleMute = () => {
      if (!videoElement.value) return;
      
      videoElement.value.muted = !videoElement.value.muted;
      isMuted.value = videoElement.value.muted;
    };
    
    const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
        videoElement.value.parentElement.requestFullscreen()
          .catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
          });
      } else {
        document.exitFullscreen();
      }
    };
    
    // Controls visibility
    const showControls = () => {
      controlsVisible.value = true;
      
      // Clear any existing timeout
      if (controlsTimeout.value) {
        clearTimeout(controlsTimeout.value);
      }
    };
    
    const hideControls = () => {
      if (isPlaying.value) {
        controlsVisible.value = false;
      }
    };
    
    const hideControlsDebounced = () => {
      if (controlsTimeout.value) {
        clearTimeout(controlsTimeout.value);
      }
      
      controlsTimeout.value = setTimeout(() => {
        hideControls();
      }, 3000);
    };
    
    // Helper functions
    const formatTime = (seconds) => {
      if (!isFinite(seconds)) return "00:00";
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    
    const getMarkerPosition = (timestamp) => {
      if (!duration.value) return 0;
      return (timestamp / duration.value) * 100;
    };
    
    // Watch for src changes
    watch(() => props.src, (newSrc) => {
      if (!videoElement.value) return;
      
      if (newSrc && newSrc.trim() !== '') {
        videoElement.value.src = newSrc;
      } else {
        // Clear the src if it's empty or null
        videoElement.value.src = '';
        videoElement.value.load();
      }
    });

    // Lifecycle hooks
    onMounted(() => {
      if (!videoElement.value) return;
      
      // Only set video source if we have a valid src
      if (props.src && props.src.trim() !== '') {
        videoElement.value.src = props.src;
        
        // Set up autoplay if enabled
        if (props.autoPlay) {
          play();
        }
      }
      
      // Add mouse movement listener for controls
      document.addEventListener('mousemove', showControls);
    });
    
    onBeforeUnmount(() => {
      // Clean up event listeners
      document.removeEventListener('mousemove', showControls);
      
      if (controlsTimeout.value) {
        clearTimeout(controlsTimeout.value);
      }
      
      // Pause and clean up video
      if (videoElement.value) {
        videoElement.value.pause();
        videoElement.value.src = '';
        videoElement.value.load();
      }
    });
    
    // Expose methods and properties
    return {
      videoElement,
      isPlaying,
      currentTime,
      duration,
      isMuted,
      videoWidth,
      videoHeight,
      controlsVisible,
      progressPercentage,
      onPlay,
      onPause,
      onTimeUpdate,
      onMetadataLoaded,
      onEnded,
      play,
      pause,
      togglePlayback,
      seekTo,
      seekToPosition,
      seekToTimestamp,
      toggleMute,
      toggleFullscreen,
      showControls,
      hideControls,
      hideControlsDebounced,
      formatTime,
      getMarkerPosition
    };
  }
};
</script>

<style scoped>
.video-player-with-comments {
  width: 100%;
  height: 100%;
  position: relative;
  background-color: black;
  overflow: hidden;
}

.video-element {
  width: 100%;
  height: 100%;
  object-fit: cover; /* Changed from contain to cover to match thumbnails */
  background-color: black;
}

/* Video controls styles */
.video-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0) 100%);
  padding: 1rem;
  transition: opacity 0.3s ease;
  opacity: 1;
}

.controls-hidden {
  opacity: 0;
}

.progress-container {
  width: 100%;
  height: 1rem;
  padding: 0.5rem 0;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.progress-bar {
  width: 100%;
  height: 0.25rem;
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 9999px;
  position: relative;
}

.progress-fill {
  height: 100%;
  background-color: #3b82f6;
  border-radius: 9999px;
  position: absolute;
  left: 0;
  top: 0;
}

.progress-marker {
  position: absolute;
  top: -0.25rem;
  width: 0.75rem;
  height: 0.75rem;
  background-color: #ec4899;
  border-radius: 50%;
  transform: translateX(-50%);
  border: 2px solid white;
  transition: transform 0.15s ease;
  z-index: 10;
}

.progress-marker:hover {
  transform: translateX(-50%) scale(1.2);
}

.controls-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
}

.controls-left,
.controls-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.control-button {
  background: transparent;
  color: white;
  border: none;
  padding: 0;
  cursor: pointer;
  opacity: 0.9;
  transition: opacity 0.15s ease;
}

.control-button:hover {
  opacity: 1;
}

.time-display {
  font-size: 0.875rem;
  color: white;
  font-family: monospace;
}

.time-separator {
  margin: 0 0.25rem;
}

.video-resolution {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  font-family: monospace;
}

@media (max-width: 768px) {
  .video-controls {
    padding: 0.5rem;
  }
  
  .controls-row {
    margin-top: 0.25rem;
  }
  
  .controls-left,
  .controls-right {
    gap: 0.5rem;
  }
  
  .video-resolution {
    display: none;
  }
}
</style>