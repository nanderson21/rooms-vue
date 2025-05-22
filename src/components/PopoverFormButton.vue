<template>
  <button
    type="submit"
    class="ml-auto flex h-6 w-26 items-center justify-center overflow-hidden rounded-md bg-gradient-to-b from-primary/90 to-primary px-3 text-xs font-semibold text-primary-foreground shadow-[0_0_1px_1px_rgba(255,255,255,0.08)_inset,0_1px_1.5px_0_rgba(0,0,0,0.32),0_0_0_0.5px_#1a94ff]"
  >
    <transition name="slide-y" mode="out-in">
      <div 
        v-if="loading" 
        :key="'loading'"
        class="flex w-full items-center justify-center"
      >
        <loader-icon class="animate-spin size-3" />
      </div>
      <div 
        v-else 
        :key="'text'"
        class="flex w-full items-center justify-center"
      >
        <span>{{ text }}</span>
      </div>
    </transition>
  </button>
</template>

<script setup>
import { defineProps } from 'vue';
import LoaderIcon from './icons/LoaderIcon.vue';

defineProps({
  loading: {
    type: Boolean,
    default: false
  },
  text: {
    type: String,
    default: 'Submit'
  }
});
</script>

<style scoped>
.ml-auto {
  margin-left: auto;
}

.flex {
  display: flex;
}

.h-6 {
  height: 1.5rem;
}

.w-26 {
  width: 6.5rem;
}

.items-center {
  align-items: center;
}

.justify-center {
  justify-content: center;
}

.overflow-hidden {
  overflow: hidden;
}

.rounded-md {
  border-radius: 0.375rem;
}

.bg-gradient-to-b {
  background-image: linear-gradient(to bottom, var(--tw-gradient-stops));
}

.from-primary\/90 {
  --tw-gradient-from: rgba(32, 144, 255, 0.9);
  --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(32, 144, 255, 0));
}

.to-primary {
  --tw-gradient-to: #2090FF;
}

.px-3 {
  padding-left: 0.75rem;
  padding-right: 0.75rem;
}

.text-xs {
  font-size: 0.75rem;
}

.font-semibold {
  font-weight: 600;
}

.text-primary-foreground {
  color: white;
}

.shadow-\[0_0_1px_1px_rgba\(255\,255\,255\,0\.08\)_inset\,0_1px_1\.5px_0_rgba\(0\,0\,0\,0\.32\)\,0_0_0_0\.5px_\#1a94ff\] {
  box-shadow: 0 0 1px 1px rgba(255, 255, 255, 0.08) inset, 0 1px 1.5px 0 rgba(0, 0, 0, 0.32), 0 0 0 0.5px #1a94ff;
}

.w-full {
  width: 100%;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

.size-3 {
  width: 0.75rem;
  height: 0.75rem;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Transition for the loading/text states */
.slide-y-enter-active,
.slide-y-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.slide-y-enter-from {
  opacity: 0;
  transform: translateY(-25px);
}

.slide-y-leave-to {
  opacity: 0;
  transform: translateY(25px);
}
</style> 