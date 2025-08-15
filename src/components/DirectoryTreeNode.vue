<template>
  <div class="directory-tree-node">
    <div 
      class="tree-node-item"
      :class="{ 
        'selected': selectedPath === node.path,
        'has-role': node.assignedRole
      }"
      :style="{ paddingLeft: `${level * 20 + 12}px` }"
      @click="selectFolder"
    >
      <div class="node-expand" @click.stop="toggleExpansion" v-if="hasChildren">
        <font-awesome-icon 
          :icon="['fas', node.isExpanded ? 'chevron-down' : 'chevron-right']" 
          class="expand-icon"
        />
      </div>
      <div class="node-expand placeholder" v-else></div>
      
      <div class="node-icon">
        <font-awesome-icon 
          :icon="['fas', 'folder']" 
          :style="{ color: getFolderColor() }"
        />
      </div>
      
      <div class="node-content">
        <span class="node-name">{{ node.name }}</span>
        <div class="node-info">
          <span class="file-count">{{ node.fileCount || 0 }} files</span>
          <span v-if="node.assignedRole" class="role-indicator">
            {{ getRoleLabel() }}
          </span>
        </div>
      </div>
      
      <div class="node-status">
        <div v-if="node.assignedRole" class="role-badge assigned">
          <font-awesome-icon :icon="['fas', 'check-circle']" />
        </div>
        <div v-else-if="node.classification" class="confidence-badge" :class="getConfidenceClass()">
          {{ Math.round((node.classification.confidence || 0) * 100) }}%
        </div>
      </div>
    </div>
    
    <!-- Recursively render children if expanded -->
    <div v-if="node.isExpanded && hasChildren" class="tree-children">
      <DirectoryTreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :level="level + 1"
        :selectedPath="selectedPath"
        @select-folder="$emit('select-folder', $event)"
        @toggle-folder="$emit('toggle-folder', $event)"
      />
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';

export default {
  name: 'DirectoryTreeNode',
  
  emits: ['select-folder', 'toggle-folder'],
  
  props: {
    node: {
      type: Object,
      required: true
    },
    level: {
      type: Number,
      default: 0
    },
    selectedPath: {
      type: String,
      default: null
    }
  },
  
  setup(props, { emit }) {
    const hasChildren = computed(() => {
      return props.node.children && props.node.children.length > 0;
    });
    
    const selectFolder = () => {
      emit('select-folder', props.node);
    };
    
    const toggleExpansion = () => {
      emit('toggle-folder', props.node);
    };
    
    const getFolderColor = () => {
      if (props.node.assignedRole) {
        // Color based on assigned role type
        return '#10b981'; // Green for assigned roles
      } else if (props.node.classification) {
        const classId = props.node.classification.id;
        const confidence = props.node.classification.confidence || 0;
        
        // Color scheme based on classification confidence
        if (confidence >= 0.8) {
          return '#3b82f6'; // Blue for high confidence
        } else if (confidence >= 0.6) {
          return '#f59e0b'; // Yellow for medium confidence
        } else {
          return '#6b7280'; // Gray for low confidence
        }
      }
      return '#6b7280'; // Default gray
    };
    
    const getConfidenceClass = () => {
      const confidence = props.node.classification?.confidence || 0;
      if (confidence >= 0.8) return 'high-confidence';
      if (confidence >= 0.6) return 'medium-confidence';
      return 'low-confidence';
    };
    
    const getRoleLabel = () => {
      if (!props.node.assignedRole) return '';
      
      // This would look up the role label from the role hierarchy
      // For now, return a simple indicator
      return props.node.assignedRole.childId || props.node.assignedRole.parentId || 'Assigned';
    };
    
    return {
      hasChildren,
      selectFolder,
      toggleExpansion,
      getFolderColor,
      getConfidenceClass,
      getRoleLabel
    };
  }
};
</script>

<style scoped>
.directory-tree-node {
  user-select: none;
}

.tree-node-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 4px;
  margin: 1px 8px;
  min-height: 32px;
}

.tree-node-item:hover {
  background-color: #f9fafb;
}

.tree-node-item.selected {
  background-color: #eff6ff;
  border: 1px solid #dbeafe;
}

.tree-node-item.has-role {
  border-left: 3px solid #10b981;
}

.node-expand {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
  cursor: pointer;
  border-radius: 2px;
  transition: background-color 0.2s;
}

.node-expand:hover {
  background-color: #f3f4f6;
}

.node-expand.placeholder {
  cursor: default;
}

.expand-icon {
  font-size: 10px;
  color: #6b7280;
}

.node-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  font-size: 14px;
}

.node-content {
  flex: 1;
  min-width: 0;
}

.node-name {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}

.file-count {
  font-size: 11px;
  color: #9ca3af;
}

.role-indicator {
  font-size: 10px;
  color: #059669;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.node-status {
  margin-left: 8px;
  display: flex;
  align-items: center;
}

.role-badge {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.role-badge.assigned {
  color: #10b981;
  font-size: 14px;
}

.confidence-badge {
  font-size: 9px;
  font-weight: 600;
  padding: 2px 4px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  line-height: 1;
}

.confidence-badge.high-confidence {
  background-color: #dbeafe;
  color: #1e40af;
}

.confidence-badge.medium-confidence {
  background-color: #fef3c7;
  color: #92400e;
}

.confidence-badge.low-confidence {
  background-color: #fee2e2;
  color: #991b1b;
}

.tree-children {
  position: relative;
}

.tree-children::before {
  content: '';
  position: absolute;
  left: calc(var(--level, 0) * 20px + 20px);
  top: 0;
  bottom: 0;
  width: 1px;
  background-color: #e5e7eb;
}
</style>