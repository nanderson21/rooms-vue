<template>
  <div
    class="scrubbable-image"
    :style="containerStyle"
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
    ref="containerRef"
  >
    <div
      v-if="isHovering && showScrubBar"
      class="vertical-bar"
      :style="barStyle"
    ></div>
    <slot name="overlay"></slot>
  </div>
</template>

<script>
import { ref, computed } from 'vue';

export default {
  name: 'ScrubbableImage',
  
  props: {
    spriteUrl: {
      type: String,
      required: true
    },
    rows: {
      type: Number,
      default: 10
    },
    columns: {
      type: Number,
      default: 10
    },
    width: {
      type: Number,
      default: 300
    },
    height: {
      type: Number,
      default: 200
    },
    showScrubBar: {
      type: Boolean,
      default: true
    },
    // For integration with view transitions
    transitionName: {
      type: String,
      default: ''
    }
  },
  
  setup(props) {
    const containerRef = ref(null);
    const isHovering = ref(false);
    const mouseX = ref(0);
    const frameIndex = ref(0);
    
    const totalFrames = computed(() => props.rows * props.columns);
    
    const containerStyle = computed(() => ({
      width: props.width + 'px',
      height: props.height + 'px',
      backgroundImage: `url(${props.spriteUrl})`,
      backgroundSize: `${props.columns * 100}% ${props.rows * 100}%`,
      backgroundPosition: getBackgroundPosition(),
      position: 'relative',
      overflow: 'hidden',
      cursor: 'pointer'
    }));
    
    function getBackgroundPosition() {
      const row = Math.floor(frameIndex.value / props.columns);
      const col = frameIndex.value % props.columns;
      const x = (col / (props.columns - 1)) * 100;
      const y = (row / (props.rows - 1)) * 100;
      return `${x}% ${y}%`;
    }
    
    const barStyle = computed(() => ({
      left: mouseX.value + 'px',
      height: '100%',
      width: '2px',
      background: 'rgba(255,255,255,0.8)',
      position: 'absolute',
      top: 0,
      pointerEvents: 'none'
    }));
    
    function onMouseMove(e) {
      if (!containerRef.value) return;
      
      const rect = containerRef.value.getBoundingClientRect();
      const x = e.clientX - rect.left;
      
      // Clamp x between 0 and width
      mouseX.value = Math.max(0, Math.min(x, props.width));
      isHovering.value = true;
      
      // Map x to frame index
      const percent = mouseX.value / props.width;
      frameIndex.value = Math.min(Math.floor(percent * totalFrames.value), totalFrames.value - 1);
    }
    
    function onMouseLeave() {
      isHovering.value = false;
    }
    
    return {
      containerRef,
      isHovering,
      mouseX,
      frameIndex,
      containerStyle,
      barStyle,
      onMouseMove,
      onMouseLeave
    };
  }
};
</script>

<style scoped>
/* Styles moved to main.css to ensure proper view transitions */
</style>