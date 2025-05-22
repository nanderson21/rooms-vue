<template>
  <div class="room-video-player">
    <!-- Video Element -->
    <video
      ref="videoElement"
      class="video-element"
      :poster="poster"
      @play="onPlay"
      @pause="onPause"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onMetadataLoaded"
      @ended="onEnded"
      controls
    ></video>
    
    <!-- Timeline Comments -->
    <div class="timeline-comments">
      <h3 class="comments-heading">Timeline Comments</h3>
      
      <div v-if="comments.length === 0" class="no-comments">
        No timeline comments yet. Add the first comment!
      </div>
      
      <div v-else class="comments-list">
        <div 
          v-for="comment in comments" 
          :key="comment.id"
          class="comment-item"
          :class="{ 'active': isCommentActive(comment) }"
          @click="seekToTimestamp(comment.timestamp)"
        >
          <div class="comment-timestamp">{{ formatTime(comment.timestamp) }}</div>
          <div class="comment-content">
            <div class="comment-author">
              <img v-if="comment.author.avatar" :src="comment.author.avatar" class="author-avatar" />
              <span class="author-name">{{ comment.author.name }}</span>
            </div>
            <p class="comment-text">{{ comment.content }}</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Add Comment Area -->
    <div class="add-comment-area">
      <div class="timestamp-display">
        Add comment at <strong>{{ formatTime(currentTime) }}</strong>
      </div>
      <div class="comment-input-container">
        <input 
          type="text" 
          v-model="newComment" 
          placeholder="Add a comment..." 
          class="comment-input"
          @keyup.enter="addComment"
        />
        <button 
          @click="addComment" 
          :disabled="!newComment.trim()" 
          class="add-comment-button"
        >
          Add
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';

// Props
const props = defineProps({
  src: {
    type: String,
    required: true
  },
  poster: {
    type: String,
    default: ''
  },
  initialComments: {
    type: Array,
    default: () => []
  }
});

// Emit events
const emit = defineEmits(['update:comments', 'comment-added']);

// Refs
const videoElement = ref(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const comments = ref([...props.initialComments]);
const newComment = ref('');
const activeCommentId = ref(null);

// Methods
const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === null) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const onPlay = () => {
  isPlaying.value = true;
};

const onPause = () => {
  isPlaying.value = false;
};

const onTimeUpdate = () => {
  if (!videoElement.value) return;
  
  currentTime.value = videoElement.value.currentTime;
  checkActiveComments();
};

const onMetadataLoaded = () => {
  if (!videoElement.value) return;
  
  duration.value = videoElement.value.duration;
  
  // Set video source after metadata loaded to prevent race conditions
  videoElement.value.src = props.src;
};

const onEnded = () => {
  isPlaying.value = false;
};

const seekToTimestamp = (timestamp) => {
  if (!videoElement.value) return;
  
  videoElement.value.currentTime = timestamp;
  
  // If paused, start playing when seeking to a comment
  if (!isPlaying.value) {
    videoElement.value.play().catch(err => console.error('Error playing video:', err));
  }
};

const addComment = () => {
  if (!newComment.value.trim()) return;
  
  const newCommentObj = {
    id: `comment-${Date.now()}`,
    content: newComment.value,
    timestamp: currentTime.value,
    author: {
      id: 'current-user',
      name: 'You',
      avatar: 'https://randomuser.me/api/portraits/men/1.jpg'
    },
    createdAt: new Date().toISOString()
  };
  
  comments.value.push(newCommentObj);
  emit('update:comments', comments.value);
  emit('comment-added', newCommentObj);
  
  // Clear input
  newComment.value = '';
  
  // Sort comments by timestamp
  comments.value.sort((a, b) => a.timestamp - b.timestamp);
};

const checkActiveComments = () => {
  // Find comment that's within 2 seconds of current time
  const activeComment = comments.value.find(comment => 
    Math.abs(comment.timestamp - currentTime.value) < 2
  );
  
  activeCommentId.value = activeComment ? activeComment.id : null;
};

const isCommentActive = (comment) => {
  return comment.id === activeCommentId.value;
};

// Initialization
onMounted(() => {
  if (videoElement.value) {
    // Sort comments by timestamp
    comments.value.sort((a, b) => a.timestamp - b.timestamp);
  }
});

// Watch for changes to initialComments prop
watch(() => props.initialComments, (newComments) => {
  comments.value = [...newComments];
}, { deep: true });
</script>

<style scoped>
.room-video-player {
  display: flex;
  flex-direction: column;
  background-color: #f8fafc;
  border-radius: 0.5rem;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.video-element {
  width: 100%;
  aspect-ratio: 16 / 9;
  background-color: black;
  display: block;
}

.timeline-comments {
  padding: 1rem;
  border-top: 1px solid #e2e8f0;
}

.comments-heading {
  font-size: 1rem;
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 0.75rem;
  color: #1e293b;
}

.no-comments {
  text-align: center;
  color: #64748b;
  padding: 1rem;
  font-style: italic;
}

.comments-list {
  max-height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.comment-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  background-color: white;
  border-radius: 0.375rem;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s;
}

.comment-item:hover {
  background-color: #f1f5f9;
}

.comment-item.active {
  border-color: #3b82f6;
  background-color: rgba(59, 130, 246, 0.05);
}

.comment-timestamp {
  padding: 0.25rem 0.5rem;
  background-color: #f1f5f9;
  border-radius: 0.25rem;
  color: #475569;
  font-size: 0.75rem;
  font-weight: 500;
  height: fit-content;
  min-width: 3rem;
  text-align: center;
}

.comment-content {
  flex: 1;
}

.comment-author {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.author-avatar {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  object-fit: cover;
}

.author-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #334155;
}

.comment-text {
  margin: 0;
  color: #475569;
  font-size: 0.875rem;
  line-height: 1.5;
}

.add-comment-area {
  padding: 1rem;
  border-top: 1px solid #e2e8f0;
}

.timestamp-display {
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: #64748b;
}

.comment-input-container {
  display: flex;
  gap: 0.5rem;
}

.comment-input {
  flex: 1;
  padding: 0.625rem 0.75rem;
  border-radius: 0.375rem;
  border: 1px solid #cbd5e1;
  outline: none;
  font-size: 0.875rem;
}

.comment-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.5);
}

.add-comment-button {
  padding: 0.625rem 1rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
}

.add-comment-button:hover:not(:disabled) {
  background-color: #2563eb;
}

.add-comment-button:disabled {
  background-color: #93c5fd;
  cursor: not-allowed;
}
</style> 