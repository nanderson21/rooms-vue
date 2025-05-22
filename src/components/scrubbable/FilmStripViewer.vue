<template>
  <div
    class="film-strip-viewer"
    :style="containerStyle"
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
    ref="containerRef"
  >
    <div class="film-strip-container">
      <!-- Left sprocket holes -->
      <div class="sprocket-holes left">
        <div class="hole"></div>
        <div class="hole"></div>
        <div class="hole"></div>
      </div>
      
      <!-- Film frames area -->
      <div class="film-frames">
        <div class="frame frame-top">
          <div class="sprite-container">
            <img 
              :src="props.spriteUrl" 
              class="sprite-img" 
              :style="getFrameImageStyle(previousFrame)" 
            />
          </div>
        </div>
        <div class="frame frame-middle">
          <div class="sprite-container">
            <img 
              :src="props.spriteUrl" 
              class="sprite-img" 
              :style="getFrameImageStyle(currentFrame)" 
            />
          </div>
        </div>
        <div class="frame frame-bottom">
          <div class="sprite-container">
            <img 
              :src="props.spriteUrl" 
              class="sprite-img" 
              :style="getFrameImageStyle(nextFrame)" 
            />
          </div>
        </div>
      </div>
      
      <!-- Right sprocket holes -->
      <div class="sprocket-holes right">
        <div class="hole"></div>
        <div class="hole"></div>
        <div class="hole"></div>
      </div>
    </div>
    
    <div class="label-area">
      <slot name="label">Space Imagery</slot>
    </div>
    
    <div v-if="isHovering" class="scrub-indicator" :style="indicatorStyle"></div>
    <div class="progress-bar" :style="{ width: `${progress}%` }"></div>
    
    <slot name="overlay"></slot>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';

export default {
  name: 'FilmStripViewer',
  
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
      default: 600
    },
    height: {
      type: Number,
      default: 400
    },
    frameAspectRatio: {
      type: Number,
      default: 16/9  // Default to 16:9 aspect ratio
    },
    showScrubBar: {
      type: Boolean,
      default: true
    },
    autoAnimate: {
      type: Boolean,
      default: false
    },
    animationSpeed: {
      type: Number,
      default: 100 // ms per frame
    }
  },
  
  setup(props) {
    const containerRef = ref(null);
    const isHovering = ref(false);
    const mouseX = ref(0);
    const currentFrame = ref(0);
    let animationTimer = null;
    
    const totalFrames = computed(() => props.rows * props.columns);
    
    const containerStyle = computed(() => ({
      width: props.width + 'px',
      height: props.height + 'px',
      position: 'relative',
      overflow: 'hidden',
      cursor: 'pointer'
    }));
    
    // Calculate frames
    const previousFrame = computed(() => {
      return currentFrame.value === 0 
        ? totalFrames.value - 1 
        : currentFrame.value - 1;
    });
    
    const nextFrame = computed(() => {
      return currentFrame.value === totalFrames.value - 1 
        ? 0 
        : currentFrame.value + 1;
    });
    
    // Calculate progress
    const progress = computed(() => {
      return (currentFrame.value / (totalFrames.value - 1)) * 100;
    });
    
    // Frame image style with transform: scale and translate (Frame.io approach)
    function getFrameImageStyle(frameIndex) {
      const row = Math.floor(frameIndex / props.columns);
      const col = frameIndex % props.columns;
      
      return {
        transform: `scale(${props.columns}, ${props.rows}) translate(-${col * (100/props.columns)}%, -${row * (100/props.rows)}%)`,
        transformOrigin: '0 0'
      };
    }
    
    // Scrub indicator
    const indicatorStyle = computed(() => ({
      left: mouseX.value + 'px',
      transform: 'translateX(-50%)'
    }));
    
    function onMouseMove(e) {
      if (!containerRef.value) return;
      
      // Stop auto-animation when user interacts
      stopAnimation();
      
      const rect = containerRef.value.getBoundingClientRect();
      const x = e.clientX - rect.left;
      
      mouseX.value = Math.max(0, Math.min(x, props.width));
      isHovering.value = true;
      
      // Map x position to frame index
      const percent = mouseX.value / props.width;
      currentFrame.value = Math.min(
        Math.floor(percent * totalFrames.value), 
        totalFrames.value - 1
      );
    }
    
    function onMouseLeave() {
      isHovering.value = false;
      
      // Restart animation if enabled
      if (props.autoAnimate) {
        startAnimation();
      }
    }
    
    function startAnimation() {
      if (animationTimer) return;
      
      animationTimer = setInterval(() => {
        currentFrame.value = (currentFrame.value + 1) % totalFrames.value;
      }, props.animationSpeed);
    }
    
    function stopAnimation() {
      if (animationTimer) {
        clearInterval(animationTimer);
        animationTimer = null;
      }
    }
    
    onMounted(() => {
      if (props.autoAnimate) {
        startAnimation();
      }
    });
    
    onUnmounted(() => {
      stopAnimation();
    });
    
    return {
      containerRef,
      isHovering,
      mouseX,
      currentFrame,
      previousFrame,
      nextFrame,
      totalFrames,
      progress,
      containerStyle,
      getFrameImageStyle,
      indicatorStyle,
      onMouseMove,
      onMouseLeave,
      props
    };
  }
};
</script>

<style scoped>
.film-strip-viewer {
  border-radius: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  user-select: none;
  overflow: hidden;
  position: relative;
  margin-bottom: 60px; /* For label */
}

.film-strip-container {
  width: 100%;
  height: 100%;
  background-color: #1a1a24;
  border-radius: 20px;
  display: flex;
}

/* Sprocket holes */
.sprocket-holes {
  width: 40px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  padding: 10px 0;
}

.hole {
  width: 24px;
  height: 36px;
  background-color: #4a4a5a;
  border-radius: 12px;
  margin: 5px auto;
}

/* Film frames */
.film-frames {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.frame {
  position: relative;
  overflow: hidden;
  margin: 1px 0;
  background-color: #111;
}

/* Frame sizes */
.frame-top {
  flex: 0 0 20%;
}

.frame-middle {
  flex: 0 0 60%;
}

.frame-bottom {
  flex: 0 0 20%;
}

.sprite-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.sprite-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform-origin: 0 0;
}

.frame::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
  pointer-events: none;
  z-index: 1;
}

/* Middle frame highlight */
.frame-middle::after {
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.8), 0 0 10px rgba(255, 255, 255, 0.1);
}

/* Progress and scrubbing */
.progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 4px;
  background: linear-gradient(to right, #3c5a9b, #6a92d4);
  transition: width 0.1s linear;
  z-index: 5;
}

.scrub-indicator {
  position: absolute;
  bottom: 10px;
  height: 4px;
  width: 100px;
  background: rgba(255,255,255,0.6);
  border-radius: 2px;
  pointer-events: none;
  z-index: 5;
  transform: translateX(-50%);
}

.label-area {
  position: absolute;
  width: 100%;
  text-align: center;
  bottom: -50px;
  font-size: 36px;
  font-weight: bold;
  color: #222;
}
</style> 