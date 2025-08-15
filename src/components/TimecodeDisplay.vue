<template>
  <div class="timecode-display" :class="{ 'clickable': clickable }" @click="handleClick">
    <div class="timecode-value" :title="getTooltip()">
      {{ displayValue }}
    </div>
    <div v-if="showFormatSelector" class="timecode-format-selector">
      <button 
        v-for="format in availableFormats" 
        :key="format.key"
        :class="{ 'active': currentFormat === format.key }"
        @click.stop="setFormat(format.key)"
        :title="format.description"
      >
        {{ format.label }}
      </button>
    </div>
    <button 
      v-if="showCopyButton" 
      class="copy-button" 
      @click.stop="copyToClipboard"
      :title="'Copy ' + currentFormatLabel + ' to clipboard'"
    >
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    </button>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';

export default {
  name: 'TimecodeDisplay',
  
  props: {
    // Current time in seconds
    currentTime: {
      type: Number,
      default: 0
    },
    // Total duration in seconds
    duration: {
      type: Number,
      default: 0
    },
    // Video framerate (fps) - can be extracted dynamically via MediaInfo
    framerate: {
      type: Number,
      default: 30 // Default to 30fps, will be overridden by MediaInfo when available
    },
    // Framerate format information (from MediaInfo service)
    framerateInfo: {
      type: Object,
      default: null
    },
    // Default format to display
    format: {
      type: String,
      default: 'smpte',
      validator: value => ['smpte', 'seconds', 'frames', 'percentage'].includes(value)
    },
    // Show format selector buttons
    showFormatSelector: {
      type: Boolean,
      default: false
    },
    // Show copy to clipboard button
    showCopyButton: {
      type: Boolean,
      default: true
    },
    // Make the component clickable (emits click event)
    clickable: {
      type: Boolean,
      default: false
    },
    // Precision for seconds display
    precision: {
      type: Number,
      default: 2
    }
  },

  emits: ['format-changed', 'copied', 'click'],

  setup(props, { emit }) {
    const currentFormat = ref(props.format);
    
    // Available timecode formats
    const availableFormats = [
      {
        key: 'smpte',
        label: 'TC',
        description: 'SMPTE Timecode (HH:MM:SS:FF)'
      },
      {
        key: 'seconds',
        label: 'SEC',
        description: 'Seconds with decimal'
      },
      {
        key: 'frames',
        label: 'FR',
        description: 'Frame count'
      },
      {
        key: 'percentage',
        label: '%',
        description: 'Percentage of total duration'
      }
    ];

    // Current format label for display
    const currentFormatLabel = computed(() => {
      return availableFormats.find(f => f.key === currentFormat.value)?.description || 'Timecode';
    });

    // Calculate frame number from time
    const currentFrame = computed(() => {
      return Math.floor(props.currentTime * props.framerate);
    });

    // Calculate total frames
    const totalFrames = computed(() => {
      return Math.floor(props.duration * props.framerate);
    });

    // Format time as SMPTE timecode (HH:MM:SS:FF)
    const formatSMPTE = (seconds) => {
      if (!isFinite(seconds) || seconds < 0) return "00:00:00:00";
      
      const totalFrames = Math.floor(seconds * props.framerate);
      const frames = totalFrames % props.framerate;
      const totalSeconds = Math.floor(totalFrames / props.framerate);
      const secs = totalSeconds % 60;
      const mins = Math.floor(totalSeconds / 60) % 60;
      const hours = Math.floor(totalSeconds / 3600);
      
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
    };

    // Format time as seconds with decimal
    const formatSeconds = (seconds) => {
      if (!isFinite(seconds) || seconds < 0) return "0.00";
      return seconds.toFixed(props.precision);
    };

    // Format as frame count
    const formatFrames = (seconds) => {
      if (!isFinite(seconds) || seconds < 0) return "0";
      return Math.floor(seconds * props.framerate).toString();
    };

    // Format as percentage of total duration
    const formatPercentage = (seconds) => {
      if (!isFinite(seconds) || seconds < 0 || !props.duration) return "0%";
      const percentage = (seconds / props.duration) * 100;
      return `${percentage.toFixed(1)}%`;
    };

    // Main display value computed property
    const displayValue = computed(() => {
      switch (currentFormat.value) {
        case 'smpte':
          return formatSMPTE(props.currentTime);
        case 'seconds':
          return formatSeconds(props.currentTime) + 's';
        case 'frames':
          return formatFrames(props.currentTime) + 'f';
        case 'percentage':
          return formatPercentage(props.currentTime);
        default:
          return formatSMPTE(props.currentTime);
      }
    });

    // Tooltip with additional information including MediaInfo data
    const getTooltip = () => {
      const smpte = formatSMPTE(props.currentTime);
      const seconds = formatSeconds(props.currentTime);
      const frames = formatFrames(props.currentTime);
      const percentage = formatPercentage(props.currentTime);
      
      let tooltip = `SMPTE: ${smpte}\nSeconds: ${seconds}s\nFrames: ${frames}f\nProgress: ${percentage}\nFramerate: ${props.framerate}fps`;
      
      // Add MediaInfo framerate information if available
      if (props.framerateInfo) {
        tooltip += `\nFormat: ${props.framerateInfo.format?.name || 'Unknown'}`;
        if (props.framerateInfo.format?.description) {
          tooltip += `\nStandard: ${props.framerateInfo.format.description}`;
        }
        if (props.framerateInfo.isAccurate) {
          tooltip += '\nSource: MediaInfo (Accurate)';
        } else {
          tooltip += '\nSource: HTML5 (Fallback)';
        }
      }
      
      return tooltip;
    };

    // Set format and emit change
    const setFormat = (format) => {
      currentFormat.value = format;
      emit('format-changed', format);
    };

    // Copy current value to clipboard
    const copyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(displayValue.value);
        emit('copied', {
          value: displayValue.value,
          format: currentFormat.value,
          timestamp: props.currentTime
        });
        
        // Provide visual feedback (you could emit an event for a toast)
        console.log(`Copied to clipboard: ${displayValue.value}`);
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = displayValue.value;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        emit('copied', {
          value: displayValue.value,
          format: currentFormat.value,
          timestamp: props.currentTime
        });
      }
    };

    // Handle component click
    const handleClick = () => {
      if (props.clickable) {
        emit('click', {
          timestamp: props.currentTime,
          format: currentFormat.value,
          value: displayValue.value
        });
      }
    };

    // Watch for format prop changes
    watch(() => props.format, (newFormat) => {
      if (availableFormats.some(f => f.key === newFormat)) {
        currentFormat.value = newFormat;
      }
    });

    return {
      currentFormat,
      availableFormats,
      currentFormatLabel,
      displayValue,
      currentFrame,
      totalFrames,
      formatSMPTE,
      formatSeconds,
      formatFrames,
      formatPercentage,
      getTooltip,
      setFormat,
      copyToClipboard,
      handleClick
    };
  }
};
</script>

<style scoped>
.timecode-display {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: monospace;
  font-size: 0.75rem;
  color: #6b7280;
  user-select: none;
}

.timecode-display.clickable {
  cursor: pointer;
}

.timecode-display.clickable:hover {
  color: #111827;
}

.timecode-value {
  font-family: monospace;
  white-space: nowrap;
}

.timecode-format-selector {
  display: flex;
  gap: 2px;
  margin-left: 4px;
}

.timecode-format-selector button {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  color: #6b7280;
  padding: 2px 6px;
  border-radius: 2px;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.timecode-format-selector button:hover {
  background: #e5e7eb;
  color: #374151;
}

.timecode-format-selector button.active {
  background: #3b82f6;
  color: #ffffff;
  border-color: #3b82f6;
}

.copy-button {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  color: #6b7280;
  padding: 2px 4px;
  border-radius: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.copy-button:hover {
  background: #e5e7eb;
  color: #374151;
}

.copy-button:active {
  transform: scale(0.95);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .timecode-format-selector {
    flex-direction: column;
    gap: 1px;
  }
  
  .timecode-format-selector button {
    font-size: 9px;
    padding: 1px 4px;
  }
}
</style>