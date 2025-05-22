<template>
  <div class="thread-review-test">
    <h1>Thread Review Component Test</h1>
    <button @click="showThreadReview = true" class="test-button">
      Show Thread Review Component
    </button>
    
    <!-- ThreadedVideoReview Component -->
    <div v-if="showThreadReview" class="threaded-review-container">
      <ThreadedVideoReview 
        videoSrc="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
        videoTitle="Big Buck Bunny - Test Video"
        @close="showThreadReview = false"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import ThreadedVideoReview from '@/components/ThreadedVideoReview.vue';

const showThreadReview = ref(false);
</script>

<style scoped>
.thread-review-test {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
}

h1 {
  margin-bottom: 2rem;
}

.test-button {
  padding: 1rem 2rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
}

.threaded-review-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.9);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style> 