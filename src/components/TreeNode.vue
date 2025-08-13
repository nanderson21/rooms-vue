<template>
  <div v-if="shouldShowNode" class="tree-node" :style="{ paddingLeft: `${level * 1.5}rem` }">
    <div 
      class="tree-item" 
      :class="{ 'is-folder': node.isFolder, 'is-expanded': isExpanded }"
      @click="handleClick"
    >
      <div class="tree-item-icon">
        <font-awesome-icon 
          v-if="node.isFolder"
          :icon="['fas', isExpanded ? 'chevron-down' : 'chevron-right']" 
          class="chevron-icon"
        />
        <font-awesome-icon 
          :icon="['fas', node.isFolder ? 'folder' : getFileIcon(node)]" 
          class="item-icon"
          :class="{ 'folder-icon': node.isFolder }"
        />
      </div>
      <span class="tree-item-name">{{ node.name }}</span>
      <span v-if="!node.isFolder" class="tree-item-size">{{ formatFileSize(node.size) }}</span>
    </div>
    
    <!-- Recursively render children if folder is expanded -->
    <div v-if="node.isFolder && isExpanded && visibleChildren.length > 0" class="tree-children">
      <TreeNode
        v-for="child in visibleChildren"
        :key="child.path"
        :node="child"
        :level="level + 1"
        :show-files="showFiles"
        @select-item="$emit('select-item', $event)"
        @toggle-folder="$emit('toggle-folder', $event)"
      />
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';

export default {
  name: 'TreeNode',
  
  emits: ['select-item', 'toggle-folder'],
  
  props: {
    node: {
      type: Object,
      required: true
    },
    level: {
      type: Number,
      default: 0
    },
    showFiles: {
      type: Boolean,
      default: true
    }
  },
  
  setup(props, { emit }) {
    const isExpanded = ref(false);
    
    // Filter children based on showFiles prop
    const visibleChildren = computed(() => {
      if (!props.node.children) return [];
      
      return props.showFiles 
        ? props.node.children 
        : props.node.children.filter(child => child.isFolder);
    });
    
    // Check if this node should be visible
    const shouldShowNode = computed(() => {
      return props.showFiles || props.node.isFolder;
    });
    
    const handleClick = () => {
      if (props.node.isFolder) {
        isExpanded.value = !isExpanded.value;
        emit('toggle-folder', {
          path: props.node.path,
          expanded: isExpanded.value
        });
      } else {
        emit('select-item', props.node);
      }
    };
    
    const getFileIcon = (node) => {
      if (node.isFolder) return 'folder';
      
      const type = node.type || '';
      if (type.startsWith('image/')) return 'image';
      if (type.startsWith('video/')) return 'video';
      if (type.startsWith('audio/')) return 'music';
      if (type.includes('pdf')) return 'file-pdf';
      
      return 'file';
    };
    
    const formatFileSize = (bytes) => {
      if (!bytes) return '';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };
    
    return {
      isExpanded,
      visibleChildren,
      shouldShowNode,
      handleClick,
      getFileIcon,
      formatFileSize
    };
  }
};
</script>

<style scoped>
.tree-node {
  user-select: none;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background-color 0.2s;
  min-height: 2rem;
}

.tree-item:hover {
  background-color: #f3f4f6;
}

.tree-item.is-folder {
  font-weight: 500;
}

.tree-item-icon {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.chevron-icon {
  width: 0.75rem;
  height: 0.75rem;
  color: #6b7280;
  transition: transform 0.2s;
}

.item-icon {
  width: 1rem;
  height: 1rem;
  color: #6b7280;
}

.folder-icon {
  color: #3b82f6;
}

.tree-item-name {
  flex: 1;
  font-size: 0.875rem;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-item-size {
  font-size: 0.75rem;
  color: #9ca3af;
  flex-shrink: 0;
}

.tree-children {
  margin-left: 0.5rem;
}

.is-folder .tree-item-name {
  color: #111827;
}
</style>