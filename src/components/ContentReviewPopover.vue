<template>
  <div class="content-review-popover-container">
    <!-- Trigger: Show the collection item/thumbnail as normal when not expanded -->
    <div 
      v-if="!isOpen" 
      ref="triggerCard" 
      class="trigger-card"
      @click="open"
    >
      <slot name="trigger"></slot>
    </div>

    <!-- Overlay & Popover: Show the expanded review UI when clicked -->
    <transition name="fade">
      <div 
        v-if="isOpen" 
        class="review-overlay"
        @click.self="close"
      >
        <div class="backdrop-blur"></div>
        
        <transition name="zoom">
          <div 
            v-if="isOpen" 
            class="review-popover"
            ref="popoverContent"
            :style="{ maxWidth: width, maxHeight: height }"
          >
            <!-- Header with close button -->
            <div class="review-header">
              <h2 class="review-title">{{ title }}</h2>
              <button @click="close" class="close-button">
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <!-- Success view -->
            <transition name="fade-slide" mode="out-in">
              <div
                v-if="showSuccess"
                key="success-view"
                class="review-success-view"
              >
                <slot name="success">
                  <div class="default-success">
                    <svg
                      width="64"
                      height="64"
                      viewBox="0 0 32 32"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M27.6 16C27.6 17.5234 27.3 19.0318 26.717 20.4392C26.1341 21.8465 25.2796 23.1253 24.2025 24.2025C23.1253 25.2796 21.8465 26.1341 20.4392 26.717C19.0318 27.3 17.5234 27.6 16 27.6C14.4767 27.6 12.9683 27.3 11.5609 26.717C10.1535 26.1341 8.87475 25.2796 7.79759 24.2025C6.72043 23.1253 5.86598 21.8465 5.28302 20.4392C4.70007 19.0318 4.40002 17.5234 4.40002 16C4.40002 12.9235 5.62216 9.97301 7.79759 7.79759C9.97301 5.62216 12.9235 4.40002 16 4.40002C19.0765 4.40002 22.027 5.62216 24.2025 7.79759C26.3779 9.97301 27.6 12.9235 27.6 16Z"
                        fill="#2090FF"
                        fillOpacity="0.16"
                      />
                      <path
                        d="M12.1334 16.9667L15.0334 19.8667L19.8667 13.1M27.6 16C27.6 17.5234 27.3 19.0318 26.717 20.4392C26.1341 21.8465 25.2796 23.1253 24.2025 24.2025C23.1253 25.2796 21.8465 26.1341 20.4392 26.717C19.0318 27.3 17.5234 27.6 16 27.6C14.4767 27.6 12.9683 27.3 11.5609 26.717C10.1535 26.1341 8.87475 25.2796 7.79759 24.2025C6.72043 23.1253 5.86598 21.8465 5.28302 20.4392C4.70007 19.0318 4.40002 17.5234 4.40002 16C4.40002 12.9235 5.62216 9.97301 7.79759 7.79759C9.97301 5.62216 12.9235 4.40002 16 4.40002C19.0765 4.40002 22.027 5.62216 24.2025 7.79759C26.3779 9.97301 27.6 12.9235 27.6 16Z"
                        stroke="#2090FF"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <h3 class="success-title">{{ successTitle }}</h3>
                    <p class="success-message">{{ successMessage }}</p>
                  </div>
                </slot>
              </div>
              <div
                v-else
                key="content-view"
                class="review-content"
              >
                <slot></slot>
              </div>
            </transition>
          </div>
        </transition>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

// Props
const props = defineProps({
  modelValue: { 
    type: Boolean, 
    default: false 
  },
  title: { 
    type: String, 
    default: 'Review Content' 
  },
  width: { 
    type: String, 
    default: '90vw'
  },
  maxWidth: {
    type: String,
    default: '1200px'
  },
  height: { 
    type: String, 
    default: '85vh'
  },
  showSuccess: { 
    type: Boolean, 
    default: false 
  },
  successTitle: {
    type: String,
    default: 'Submitted Successfully'
  },
  successMessage: {
    type: String,
    default: 'Thank you for your review. The content has been processed.'
  }
});

// Emits
const emit = defineEmits(['update:modelValue']);

// Refs
const triggerCard = ref(null);
const popoverContent = ref(null);

// Computed
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

// Methods
const open = () => {
  isOpen.value = true;
  // Prevent body scrolling when popover is open
  document.body.classList.add('overflow-hidden');
};

const close = () => {
  isOpen.value = false;
  // Restore scrolling
  document.body.classList.remove('overflow-hidden');
};
</script>

<style scoped>
.content-review-popover-container {
  position: relative;
}

.trigger-card {
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
}

.trigger-card:hover {
  transform: scale(1.02);
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

.review-popover {
  position: relative;
  background-color: white;
  border-radius: 0.5rem;
  width: 100%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  max-height: v-bind('props.height');
  max-width: v-bind('props.maxWidth');
  width: v-bind('props.width');
  overflow: hidden;
  z-index: 51;
}

.review-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.review-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.close-button {
  background-color: transparent;
  border: none;
  color: #6b7280;
  padding: 0.25rem;
  border-radius: 0.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  background-color: #f3f4f6;
  color: #111827;
}

.review-content {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.review-success-view {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 300px;
}

.default-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 400px;
}

.success-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.success-message {
  color: #6b7280;
  line-height: 1.5;
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

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(-1rem);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(1rem);
}
</style> 