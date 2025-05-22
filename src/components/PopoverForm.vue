<template>
  <div class="flex min-h-[300px] w-full items-center justify-center">
    <!-- Trigger button that morphs into form -->
    <transition
      @before-enter="setTransitionName"
      @after-leave="clearTransitionName"
    >
      <button 
        v-if="!isOpen"
        ref="triggerButton"
        class="flex h-9 items-center rounded-lg border bg-white dark:bg-[#121212] px-3 text-sm font-medium outline-none"
        :style="{ borderRadius: '8px' }"
        v-view-transition-name="formTransitionName"
        @click="open"
      >
        <span v-view-transition-name="titleTransitionName">{{ title }}</span>
      </button>
    </transition>

    <!-- Popover Form -->
    <transition
      name="fade"
      @before-enter="setTransitionName"
      @after-leave="clearTransitionName"
    >
      <div
        v-if="isOpen"
        ref="formContainer"
        v-view-transition-name="formTransitionName"
        class="absolute p-1 overflow-hidden bg-muted shadow-[0_0_0_1px_rgba(0,0,0,0.08),0px_1px_2px_rgba(0,0,0,0.04)] outline-none"
        :style="{ borderRadius: '10px', width, height }"
        v-click-outside="handleClickOutside"
      >
        <span
          v-if="!showSuccess"
          v-view-transition-name="titleTransitionName"
          class="absolute left-4 top-[17px] text-sm text-muted-foreground"
          :class="{ 'text-transparent': showSuccess }"
        >
          {{ title }}
        </span>

        <!-- Optional close button -->
        <div v-if="showCloseButton" class="absolute -top-[5px] left-1/2 transform -translate-x-1/2 w-[12px] h-[26px] flex items-center justify-center z-20">
          <button
            @click="close"
            class="absolute z-10 -mt-1 flex items-center justify-center w-[10px] h-[6px] text-muted-foreground hover:text-foreground focus:outline-none rounded-full"
            aria-label="Close"
          >
            <chevron-up-icon class="text-muted-foreground/80" />
          </button>
          <popover-form-cut-out-top-icon />
        </div>

        <!-- Success view -->
        <transition name="fade-slide" mode="out-in">
          <div
            v-if="showSuccess"
            key="success-view"
            class="flex h-full flex-col items-center justify-center"
          >
            <slot name="success">
              <popover-form-success />
            </slot>
          </div>
          <div
            v-else
            key="content-view"
            class="h-full border bg-white dark:bg-[#121212] z-20 rounded-lg"
          >
            <slot></slot>
          </div>
        </transition>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';

// Components
import ChevronUpIcon from './icons/ChevronUpIcon.vue';
import PopoverFormCutOutTopIcon from './icons/PopoverFormCutOutTopIcon.vue';
import PopoverFormSuccess from './PopoverFormSuccess.vue';

// Props
const props = defineProps({
  modelValue: { 
    type: Boolean, 
    default: false 
  },
  title: { 
    type: String, 
    default: 'Feedback' 
  },
  width: { 
    type: String, 
    default: '364px' 
  },
  height: { 
    type: String, 
    default: '192px' 
  },
  showSuccess: { 
    type: Boolean, 
    default: false 
  },
  showCloseButton: { 
    type: Boolean, 
    default: false 
  }
});

// Emits
const emit = defineEmits(['update:modelValue']);

// Refs
const triggerButton = ref(null);
const formContainer = ref(null);
const formTransitionName = ref('');
const titleTransitionName = ref('');

// Computed
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

// Methods
const open = () => {
  isOpen.value = true;
};

const close = () => {
  isOpen.value = false;
};

const setTransitionName = () => {
  formTransitionName.value = `${props.title}-wrapper`;
  titleTransitionName.value = `${props.title}-title`;
};

const clearTransitionName = () => {
  formTransitionName.value = '';
  titleTransitionName.value = '';
};

const handleClickOutside = (event) => {
  if (isOpen.value && formContainer.value && !formContainer.value.contains(event.target)) {
    close();
  }
};

// Custom directive for detecting clicks outside
const vClickOutside = {
  mounted(el, binding) {
    el._clickOutside = (event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value(event);
      }
    };
    document.addEventListener('mousedown', el._clickOutside);
    document.addEventListener('touchstart', el._clickOutside);
  },
  unmounted(el) {
    document.removeEventListener('mousedown', el._clickOutside);
    document.removeEventListener('touchstart', el._clickOutside);
  }
};
</script>

<style scoped>
/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(-32px);
  filter: blur(4px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(8px);
  filter: blur(4px);
}

/* Utility classes (you'll need to add these to your CSS) */
.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.justify-center {
  justify-content: center;
}

.min-h-\[300px\] {
  min-height: 300px;
}

.w-full {
  width: 100%;
}

.absolute {
  position: absolute;
}

.relative {
  position: relative;
}

.transform {
  transform: translateX(-50%);
}

.h-9 {
  height: 2.25rem;
}

.bg-white {
  background-color: white;
}

.dark\:bg-\[\#121212\] {
  background-color: #121212;
}

.border {
  border: 1px solid #e5e7eb;
}

.outline-none {
  outline: none;
}

.text-sm {
  font-size: 0.875rem;
}

.font-medium {
  font-weight: 500;
}

.px-3 {
  padding-left: 0.75rem;
  padding-right: 0.75rem;
}

.p-1 {
  padding: 0.25rem;
}

.overflow-hidden {
  overflow: hidden;
}

.z-20 {
  z-index: 20;
}

.bg-muted {
  background-color: #f3f4f6;
}

.text-muted-foreground {
  color: #6b7280;
}

.text-transparent {
  color: transparent;
}

.left-4 {
  left: 1rem;
}

.top-\[17px\] {
  top: 17px;
}

.h-full {
  height: 100%;
}

.flex-col {
  flex-direction: column;
}

/* These classes handle the cut-out top button alignment */
.-top-\[5px\] {
  top: -5px;
}

.left-1\/2 {
  left: 50%;
}

.-translate-x-1\/2 {
  transform: translateX(-50%);
}

.w-\[12px\] {
  width: 12px;
}

.h-\[26px\] {
  height: 26px;
}

.-mt-1 {
  margin-top: -0.25rem;
}

.w-\[10px\] {
  width: 10px;
}

.h-\[6px\] {
  height: 6px;
}

.rounded-full {
  border-radius: 9999px;
}

.hover\:text-foreground:hover {
  color: #111827;
}

.rounded-lg {
  border-radius: 0.5rem;
}
</style> 