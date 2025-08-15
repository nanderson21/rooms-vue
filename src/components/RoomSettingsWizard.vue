<template>
  <div class="settings-wizard-overlay" @click="handleOverlayClick">
    <div class="settings-wizard-modal" @click.stop>
      <!-- Header -->
      <div class="wizard-header">
        <div class="header-content">
          <h2 class="wizard-title">MovieLabs 2030 Workflow Setup</h2>
          <p class="wizard-subtitle">{{ roomData?.name || 'Configure software-defined production workflow' }}</p>
        </div>
        <button class="close-button" @click="$emit('close')">
          <font-awesome-icon :icon="['fas', 'times']" />
        </button>
      </div>

      <!-- Tab Navigation -->
      <div class="wizard-nav">
        <div class="nav-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="selectTab(tab.id)"
            :class="[
              'nav-tab',
              { 'active': activeTab === tab.id },
              { 'completed': completedTabs.includes(tab.id) },
              { 'disabled': tab.disabled }
            ]"
            :disabled="tab.disabled"
          >
            <div class="tab-icon">
              <font-awesome-icon 
                v-if="completedTabs.includes(tab.id)"
                :icon="['fas', 'check']" 
              />
              <font-awesome-icon 
                v-else
                :icon="tab.icon" 
              />
            </div>
            <div class="tab-content">
              <span class="tab-title">{{ tab.title }}</span>
              <span class="tab-subtitle">{{ tab.subtitle }}</span>
            </div>
          </button>
        </div>
        
        <!-- Progress Bar -->
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
        </div>
      </div>

      <!-- Tab Content -->
      <div class="wizard-content">
        <!-- Analysis Tab -->
        <div v-if="activeTab === 'analysis'" class="tab-panel analysis-panel">
          <div class="panel-header">
            <h3>Folder & File Analysis</h3>
            <p>Analyze directory structure against MovieLabs utilities and naming conventions</p>
          </div>

          <div class="analysis-controls">
            <button @click="startAnalysis" :disabled="isAnalyzing" class="analyze-button">
              <font-awesome-icon :icon="['fas', isAnalyzing ? 'spinner' : 'play']" :spin="isAnalyzing" />
              {{ isAnalyzing ? 'Analyzing...' : 'Start Analysis' }}
            </button>
            
            <div class="analysis-options">
              <label class="checkbox-option">
                <input type="checkbox" v-model="analysisOptions.includeMediaInfo">
                <span>Include MediaInfo analysis</span>
              </label>
              <label class="checkbox-option">
                <input type="checkbox" v-model="analysisOptions.includeExifTool">
                <span>Include ExifTool analysis</span>
              </label>
            </div>
          </div>

          <div v-if="analysisResults.length > 0" class="analysis-results">
            <h4>Analysis Results</h4>
            
            <!-- Folder-based Analysis Summary -->
            <div v-if="directoryTree.length > 0" class="folder-analysis-summary">
              <h5>{{ directoryTree.length }} folders analyzed • {{ analysisResults.length }} files processed</h5>
              
              <div class="folder-results">
                <div 
                  v-for="folder in directoryTree" 
                  :key="folder.path"
                  class="folder-result-item"
                  :class="{ 'expanded': folder.isExpanded }"
                >
                  <div class="folder-header" @click="handleToggleFolder(folder)">
                    <div class="folder-info">
                      <font-awesome-icon :icon="['fas', folder.isExpanded ? 'folder-open' : 'folder']" />
                      <span class="folder-name">{{ folder.name }}</span>
                      <span class="folder-path">{{ folder.path }}</span>
                      <span class="file-count">({{ getFolderFileCount(folder) }} files)</span>
                    </div>
                    <div v-if="folder.classification" class="folder-classification">
                      <span class="classification-label">{{ folder.classification.label || 'Generic Folder' }}</span>
                      <span 
                        class="confidence-badge" 
                        :class="getConfidenceClass(folder.classification.confidence)"
                      >
                        {{ Math.round((folder.classification.confidence || 0) * 100) }}%
                      </span>
                    </div>
                  </div>
                  
                  <!-- Expanded folder details -->
                  <div v-if="folder.isExpanded" class="folder-contents">
                    <div class="folder-files">
                      <div 
                        v-for="result in getFolderFiles(folder)" 
                        :key="result.path"
                        class="file-result-item"
                        :class="{ 'selected': selectedAnalysisItem === result.path }"
                        @click="selectAnalysisItem(result)"
                      >
                <div class="result-header">
                  <div class="file-info">
                    <font-awesome-icon :icon="['fas', result.type && result.type.startsWith('video') ? 'video' : result.type && result.type.startsWith('image') ? 'image' : result.type && result.type.startsWith('audio') ? 'music' : 'file']" />
                    <span class="file-name">{{ result.name }}</span>
                    <span class="file-path">{{ result.path }}</span>
                  </div>
                  <div class="file-details">
                    <span class="file-type">{{ result.type }}</span>
                    <span class="file-size">{{ (result.size / (1024 * 1024)).toFixed(2) }} MB</span>
                  </div>
                </div>

                <div class="result-details">
                  <div v-if="result.classification" class="classification-info">
                    <span class="classification-label">Classified as: {{ result.classification.label }}</span>
                    <span class="confidence-indicator">
                      <span 
                        class="confidence-badge" 
                        :class="getConfidenceClass(result.classification.confidence)"
                      >
                        {{ Math.round(result.classification.confidence * 100) }}%
                      </span>
                    </span>
                  </div>
                  <div v-else class="classification-info">
                    <span class="classification-label">No specific classification</span>
                  </div>

                        <div v-if="result.mediaInfo" class="mediainfo-details">
                          <h6>MediaInfo Analysis:</h6>
                          <div class="technical-specs">
                            <div v-if="result.mediaInfo.media && result.mediaInfo.media.track" class="track-info">
                              <div v-for="track in result.mediaInfo.media.track" :key="track['@type']" class="track-details">
                                <strong>{{ track['@type'] }}:</strong>
                                <span v-if="track.Format">{{ track.Format }}</span>
                                <span v-if="track.Width && track.Height">{{ track.Width }}x{{ track.Height }}</span>
                                <span v-if="track.FrameRate">{{ track.FrameRate }} fps</span>
                                <span v-if="track.Duration">{{ track.Duration }}s</span>
                              </div>
                            </div>
                            <details class="raw-mediainfo">
                              <summary>View Raw MediaInfo</summary>
                              <pre>{{ JSON.stringify(result.mediaInfo, null, 2) }}</pre>
                            </details>
                          </div>
                        </div>
                        <div v-else-if="result.error" class="analysis-error">
                          Error: {{ result.error }}
                        </div>
                        <div v-else class="no-mediainfo">
                          No MediaInfo analysis (non-media file)
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Folder Summary -->
                  <div class="folder-summary">
                    <div class="specs-summary">
                      <span class="format-summary">
                        Formats: {{ getFolderFormats(folder).join(', ') || 'None detected' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>
            
            <!-- Raw file list for debugging -->
            <details class="raw-results">
              <summary>View All Files ({{ analysisResults.length }})</summary>
              <div class="raw-file-list">
                <div 
                  v-for="result in analysisResults" 
                  :key="result.path"
                  class="raw-file-item"
                >
                  <span class="file-name">{{ result.name }}</span>
                  <span class="file-path">{{ result.path }}</span>
                  <span class="file-type">{{ result.type }}</span>
                </div>
              </div>
            </details>
          </div>

          <div v-else-if="!isAnalyzing" class="no-results">
            <font-awesome-icon :icon="['fas', 'search']" />
            <p>Run analysis to discover folder structure and classify assets</p>
          </div>
        </div>

        <!-- Asset Classes Tab -->
        <div v-if="activeTab === 'asset-classes'" class="tab-panel asset-classes-panel">
          <div class="panel-header">
            <h3>Asset Classes Configuration</h3>
            <p>Define validation criteria and utility requirements for each asset type</p>
          </div>

          <div class="asset-classes-content">
            <div class="asset-class-list">
              <div 
                v-for="assetClass in assetClasses" 
                :key="assetClass.id"
                class="asset-class-item"
                :class="{ 'selected': selectedAssetClass === assetClass.id }"
                @click="selectAssetClass(assetClass.id)"
              >
                <div class="asset-class-header">
                  <h4>{{ assetClass.name }}</h4>
                  <span class="asset-type-badge">{{ assetClass.assetType }}</span>
                </div>
                <p class="asset-class-description">{{ assetClass.description }}</p>
                
                <div class="validation-criteria">
                  <span class="criteria-count">{{ assetClass.validationCriteria.length }} criteria</span>
                </div>
              </div>
            </div>

            <div v-if="selectedAssetClassData" class="asset-class-editor">
              <h4>{{ selectedAssetClassData.name }} Configuration</h4>
              
              <div class="validation-criteria-editor">
                <h5>Validation Criteria</h5>
                
                <div 
                  v-for="(criteria, index) in selectedAssetClassData.validationCriteria" 
                  :key="index"
                  class="criteria-item"
                >
                  <div class="criteria-header">
                    <select v-model="criteria.type" class="criteria-type">
                      <option value="has_mediainfo_property">Has MediaInfo Property</option>
                      <option value="matches_naming_convention">Matches Naming Convention</option>
                      <option value="has_file_extension">Has File Extension</option>
                      <option value="has_matching_variable">Has Matching Variable</option>
                      <option value="file_count_range">File Count Range</option>
                    </select>
                    
                    <button @click="removeCriteria(index)" class="remove-criteria">
                      <font-awesome-icon :icon="['fas', 'trash']" />
                    </button>
                  </div>
                  
                  <div class="criteria-config">
                    <input 
                      v-if="criteria.type === 'has_mediainfo_property'"
                      v-model="criteria.property"
                      placeholder="MediaInfo property name"
                      class="criteria-input"
                    >
                    <input 
                      v-if="criteria.type === 'matches_naming_convention'"
                      v-model="criteria.pattern"
                      placeholder="RegEx pattern"
                      class="criteria-input"
                    >
                    <input 
                      v-if="criteria.type === 'has_file_extension'"
                      v-model="criteria.extensions"
                      placeholder="Extensions (.r3d, .mxf)"
                      class="criteria-input"
                    >
                    <input 
                      v-if="criteria.type === 'has_matching_variable'"
                      v-model="criteria.variable"
                      placeholder="Variable name"
                      class="criteria-input"
                    >
                    <div v-if="criteria.type === 'file_count_range'" class="range-inputs">
                      <input 
                        v-model.number="criteria.min"
                        type="number"
                        placeholder="Min"
                        class="criteria-input range-input"
                      >
                      <input 
                        v-model.number="criteria.max"
                        type="number"
                        placeholder="Max"
                        class="criteria-input range-input"
                      >
                    </div>
                  </div>
                </div>
                
                <button @click="addValidationCriteria" class="add-criteria-button">
                  <font-awesome-icon :icon="['fas', 'plus']" />
                  Add Validation Criteria
                </button>
              </div>

              <div class="utilities-section">
                <h5>Required Utilities</h5>
                <div class="utilities-list">
                  <label v-for="utility in availableUtilities" :key="utility" class="utility-checkbox">
                    <input 
                      type="checkbox" 
                      :checked="selectedAssetClassData.utilities.includes(utility)"
                      @change="toggleUtility(utility)"
                    >
                    <span>{{ utility }}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Role Assignment Tab -->
        <div v-if="activeTab === 'role-assignment'" class="tab-panel role-assignment-panel">
          <div class="panel-header">
            <h3>Folder Role Assignment</h3>
            <p>Assign MovieLabs roles with inheritance relationships</p>
          </div>

          <div class="role-assignment-content">
            <!-- Directory Tree (left side) -->
            <div class="directory-section">
              <div class="section-header">
                <h4>Directory Structure</h4>
                <button @click="refreshDirectoryTree" class="refresh-button">
                  <font-awesome-icon :icon="['fas', 'sync-alt']" />
                </button>
              </div>
              
              <div class="directory-tree" v-if="directoryTree.length > 0">
                <DirectoryTreeNode
                  v-for="node in directoryTree"
                  :key="node.path"
                  :node="node"
                  :level="0"
                  :selectedPath="selectedAnalysisItem"
                  @select-folder="selectAnalysisItem"
                  @toggle-folder="handleToggleFolder"
                />
              </div>
            </div>

            <!-- Role Assignment (right side) -->
            <div class="role-section">
              <div v-if="selectedFolder" class="role-assignment-form">
                <div class="selected-folder-header">
                  <h4>{{ selectedFolder.name }}</h4>
                  <span class="folder-path">{{ selectedFolder.path }}</span>
                </div>

                <!-- Current Analysis Results -->
                <div v-if="selectedFolder.analysisResult" class="current-analysis">
                  <h5>Analysis Result</h5>
                  <div class="analysis-summary">
                    <span class="classification-label">{{ selectedFolder.analysisResult.classification?.label || 'Unclassified' }}</span>
                    <span class="confidence-score">{{ Math.round((selectedFolder.analysisResult.confidence || 0) * 100) }}% confidence</span>
                  </div>
                </div>

                <!-- Role Selection -->
                <div class="role-selection-form">
                  <div class="form-group">
                    <label>Parent Role:</label>
                    <select v-model="selectedParentRole" @change="onParentRoleChange" class="form-select">
                      <option value="">Select parent role...</option>
                      <optgroup v-for="category in folderRoleHierarchy" :key="category.name" :label="category.name">
                        <option v-for="role in category.roles" :key="role.id" :value="role.id">
                          {{ role.name }}
                        </option>
                      </optgroup>
                    </select>
                  </div>

                  <div v-if="selectedParentRole && availableChildRoles.length > 0" class="form-group">
                    <label>Child Role:</label>
                    <select v-model="selectedChildRole" class="form-select">
                      <option value="">Select child role...</option>
                      <option v-for="role in availableChildRoles" :key="role.id" :value="role.id">
                        {{ role.name }}
                      </option>
                    </select>
                  </div>

                  <button @click="applyRoleAssignment" :disabled="!selectedParentRole" class="apply-role-button">
                    Apply Role Assignment
                  </button>
                </div>

                <!-- Inheritance Settings -->
                <div class="inheritance-section">
                  <h5>Inheritance Configuration</h5>
                  <label class="checkbox-option">
                    <input type="checkbox" v-model="selectedFolder.inheritFromParent">
                    <span>Inherit context from parent folder</span>
                  </label>
                  <label class="checkbox-option">
                    <input type="checkbox" v-model="selectedFolder.propagateToChildren">
                    <span>Propagate context to child folders</span>
                  </label>
                </div>
              </div>

              <div v-else class="no-folder-selected">
                <font-awesome-icon :icon="['fas', 'arrow-left']" />
                <p>Select a folder from the directory tree</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Context Mapping Tab -->
        <div v-if="activeTab === 'context-mapping'" class="tab-panel context-mapping-panel">
          <div class="panel-header">
            <h3>Context Mapping</h3>
            <p>Define workflow relationships and context inheritance</p>
          </div>

          <div class="context-mapping-content">
            <div class="context-diagram">
              <div class="workflow-stages">
                <div 
                  v-for="stage in workflowStages" 
                  :key="stage.id"
                  class="workflow-stage"
                  :class="{ 'selected': selectedWorkflowStage === stage.id }"
                  @click="selectWorkflowStage(stage.id)"
                >
                  <h4>{{ stage.name }}</h4>
                  <div class="stage-folders">
                    <div 
                      v-for="folder in getFoldersForStage(stage.id)" 
                      :key="folder.path"
                      class="stage-folder"
                    >
                      <span>{{ folder.name }}</span>
                      <span class="folder-role">{{ getRoleLabel(folder.assignedRole) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="context-relationships">
                <h4>Context Relationships</h4>
                <div class="relationship-list">
                  <div v-for="relationship in contextRelationships" :key="relationship.id" class="relationship-item">
                    <div class="relationship-source">{{ relationship.source }}</div>
                    <font-awesome-icon :icon="['fas', 'arrow-right']" class="relationship-arrow" />
                    <div class="relationship-target">{{ relationship.target }}</div>
                    <span class="relationship-type">{{ relationship.type }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Review & Approve Tab -->
        <div v-if="activeTab === 'review-approve'" class="tab-panel review-approve-panel">
          <div class="panel-header">
            <h3>Review & Approve Template</h3>
            <p>Review your configuration and generate the workflow template</p>
          </div>

          <div class="review-content">
            <div class="review-summary">
              <div class="summary-section">
                <h4>Analysis Summary</h4>
                <div class="summary-stats">
                  <div class="stat-item">
                    <span class="stat-value">{{ analysisResults.length }}</span>
                    <span class="stat-label">Folders Analyzed</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-value">{{ assignedRolesCount }}</span>
                    <span class="stat-label">Roles Assigned</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-value">{{ assetClasses.length }}</span>
                    <span class="stat-label">Asset Classes</span>
                  </div>
                </div>
              </div>

              <div class="summary-section">
                <h4>Validation Issues</h4>
                <div v-if="validationIssues.length > 0" class="issues-list">
                  <div v-for="issue in validationIssues" :key="issue.id" class="issue-item">
                    <font-awesome-icon :icon="['fas', issue.severity === 'error' ? 'exclamation-circle' : 'exclamation-triangle']" />
                    <span>{{ issue.message }}</span>
                  </div>
                </div>
                <div v-else class="no-issues">
                  <font-awesome-icon :icon="['fas', 'check-circle']" />
                  <span>No validation issues found</span>
                </div>
              </div>

              <div class="summary-section">
                <h4>Generated Template</h4>
                <div class="template-preview">
                  <pre>{{ JSON.stringify(generatedTemplate, null, 2) }}</pre>
                </div>
              </div>
            </div>

            <div class="approval-actions">
              <button @click="exportTemplate" class="export-button">
                <font-awesome-icon :icon="['fas', 'download']" />
                Export Template
              </button>
              <button @click="approveTemplate" :disabled="validationIssues.some(i => i.severity === 'error')" class="approve-button">
                <font-awesome-icon :icon="['fas', 'check']" />
                Approve & Apply Template
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="wizard-footer">
        <div class="footer-left">
          <button 
            v-if="activeTabIndex > 0" 
            @click="previousTab" 
            class="nav-button secondary"
          >
            <font-awesome-icon :icon="['fas', 'arrow-left']" />
            Previous
          </button>
        </div>
        <div class="footer-right">
          <button @click="$emit('close')" class="nav-button secondary">Cancel</button>
          <button 
            v-if="activeTabIndex < tabs.length - 1" 
            @click="nextTab" 
            :disabled="!canProceedToNextTab"
            class="nav-button primary"
          >
            Next
            <font-awesome-icon :icon="['fas', 'arrow-right']" />
          </button>
          <button 
            v-else
            @click="finishWizard"
            :disabled="!canFinishWizard"
            class="nav-button primary"
          >
            <font-awesome-icon :icon="['fas', 'check']" />
            Finish Setup
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import DirectoryTreeNode from './DirectoryTreeNode.vue';
import { roomService } from '../services/roomService.js';
import { folderRolePersistence } from '../services/folderRolePersistence.js';
import * as folderClassificationService from '../services/folderClassificationService.js';
import MediaInfoFactory from 'mediainfo.js';

export default {
  name: 'RoomSettingsWizard',
  
  components: {
    DirectoryTreeNode
  },
  
  props: {
    roomId: {
      type: String,
      required: true
    }
  },
  
  emits: ['close', 'template-applied'],
  
  setup(props, { emit }) {
    // State
    const activeTab = ref('analysis');
    const completedTabs = ref([]);
    const roomData = ref(null);
    const mediaInfo = ref(null);
    const mediaInfoReady = ref(false);

    onMounted(async () => {
      try {
        mediaInfo.value = await MediaInfoFactory();
        mediaInfoReady.value = true;
        console.log('MediaInfo.js loaded successfully');
      } catch (error) {
        console.error('Failed to load MediaInfo.js:', error);
      }
    });

    onUnmounted(() => {
      if (mediaInfo.value) {
        mediaInfo.value.close();
        console.log('MediaInfo.js closed');
      }
    });
    const directoryTree = ref([]);
    const selectedFolder = ref(null);
    const selectedFolderPath = ref(null);
    const isAnalyzing = ref(false);
    const analysisResults = ref([]);
    const selectedAnalysisItem = ref(null);
    
    // Analysis options
    const analysisOptions = ref({
      includeMediaInfo: true,
      includeExifTool: false
    });

    // Asset Classes
    const selectedAssetClass = ref(null);
    const assetClasses = ref([
      {
        id: 'red_camera_roll',
        name: 'RED Camera Roll',
        assetType: 'camera_roll',
        description: 'RED camera magazine containing .RDC clip folders',
        validationCriteria: [
          { type: 'matches_naming_convention', pattern: '\\.R[D3]M$' },
          { type: 'has_file_extension', extensions: '.RDC' }
        ],
        utilities: ['identifier', 'composition', 'location', 'measurements']
      },
      {
        id: 'red_clip',
        name: 'RED Clip',
        assetType: 'clip_group',
        description: 'Individual RED clip folder containing multiple media files',
        validationCriteria: [
          { type: 'matches_naming_convention', pattern: '\\.R[D3]C$' },
          { type: 'has_file_extension', extensions: '.R3D,.RMD,.RSX' },
          { type: 'file_count_range', min: 1, max: 100 }
        ],
        utilities: ['identifier', 'composition', 'measurements', 'file_details']
      },
      {
        id: 'image_sequence',
        name: 'Image Sequence',
        assetType: 'image_sequence',
        description: 'Numbered image sequence for VFX or animation',
        validationCriteria: [
          { type: 'has_file_extension', extensions: '.exr,.dpx,.tiff,.png' },
          { type: 'file_count_range', min: 3, max: 10000 }
        ],
        utilities: ['identifier', 'measurements', 'file_details']
      }
    ]);

    // Role Assignment
    const selectedParentRole = ref('');
    const selectedChildRole = ref('');
    const folderRoleHierarchy = ref([
      {
        name: 'Media Assets',
        roles: [
          {
            id: 'video_source',
            name: 'Video - Source',
            description: 'Source assets from production directly from camera media',
            expectedFormats: ['.R3D', '.MXF', '.MP4', '.MOV', '.CINE', '.MTS'],
            children: [
              { id: 'red_camera_roll', name: 'RED Camera Roll', description: 'RED camera magazine containing .RDC clip folders' },
              { id: 'red_clip', name: 'RED Clip', description: 'Individual RED clip folder with .R3D files' },
              { id: 'red_clip_standalone', name: 'RED Clip (Standalone)', description: 'Standalone .RDC folder outside magazine structure' },
              { id: 'arri_camera_roll', name: 'ARRI Camera Roll', description: 'ARRI camera roll structure' },
              { id: 'sony_xavc', name: 'Sony XAVC', description: 'Sony XAVC format captures' }
            ]
          },
          {
            id: 'video_master',
            name: 'Video - Master',
            description: 'Master assets created from source clips for final master',
            expectedFormats: ['.MXF', '.MOV', '.DPX', '.EXR', '.TIFF'],
            children: []
          },
          {
            id: 'video_proxy',
            name: 'Video - Proxy',
            description: 'Lower quality proxy versions for reference',
            expectedFormats: ['.MP4', '.MOV'],
            children: []
          },
          {
            id: 'vfx_shots',
            name: 'VFX - Shots',
            description: 'Visual effects sequence and shot folders',
            expectedFormats: ['.EXR', '.DPX', '.TIFF', '.PNG'],
            children: [
              { id: 'vfx_sequence', name: 'VFX Sequence', description: 'VFX sequence folder' },
              { id: 'vfx_shot', name: 'VFX Shot', description: 'Individual VFX shot folder' },
              { id: 'image_sequence', name: 'Image Sequence', description: 'Numbered image sequence' }
            ]
          },
          {
            id: 'audio_source',
            name: 'Audio - Source',
            description: 'Audio files captured during production',
            expectedFormats: ['.WAV', '.AIFF', '.BWF'],
            children: [
              { id: 'audio_stems', name: 'Audio Stems', description: 'Audio stems and tracks' }
            ]
          }
        ]
      },
      {
        name: 'Project Files',
        roles: [
          {
            id: 'editorial',
            name: 'Editorial',
            description: 'Adobe Premiere project files and editorial assets',
            expectedFormats: ['.PRPROJ', '.AAF', '.XML'],
            children: []
          },
          {
            id: 'vfx_projects',
            name: 'VFX Projects',
            description: 'VFX project files and scripts',
            expectedFormats: ['.NUK', '.AEP', '.FLAME'],
            children: []
          }
        ]
      },
      {
        name: 'Exports',
        roles: [
          {
            id: 'deliverables',
            name: 'Deliverables',
            description: 'Final output media for delivery',
            expectedFormats: ['.MOV', '.MXF'],
            children: []
          },
          {
            id: 'proxies',
            name: 'Proxies',
            description: 'Lower resolution proxy files for editing',
            expectedFormats: ['.MOV', '.MP4'],
            children: []
          }
        ]
      }
    ]);

    // Context Mapping
    const selectedWorkflowStage = ref(null);
    const workflowStages = ref([
      { id: 'acquisition', name: 'Acquisition' },
      { id: 'editorial', name: 'Editorial' },
      { id: 'vfx', name: 'VFX' },
      { id: 'color', name: 'Color' },
      { id: 'audio', name: 'Audio' },
      { id: 'finishing', name: 'Finishing' },
      { id: 'delivery', name: 'Delivery' }
    ]);

    const contextRelationships = ref([]);

    // Validation and Review
    const validationIssues = ref([]);
    const generatedTemplate = ref({});

    // Tab Configuration
    const tabs = ref([
      {
        id: 'analysis',
        title: 'Analysis',
        subtitle: 'Analyze folders & files',
        icon: ['fas', 'search'],
        disabled: false
      },
      {
        id: 'asset-classes',
        title: 'Asset Classes',
        subtitle: 'Configure validation criteria',
        icon: ['fas', 'layer-group'],
        disabled: false
      },
      {
        id: 'role-assignment',
        title: 'Role Assignment',
        subtitle: 'Assign folder roles',
        icon: ['fas', 'tags'],
        disabled: false
      },
      {
        id: 'context-mapping',
        title: 'Context Mapping',
        subtitle: 'Define relationships',
        icon: ['fas', 'project-diagram'],
        disabled: false
      },
      {
        id: 'review-approve',
        title: 'Review & Approve',
        subtitle: 'Finalize template',
        icon: ['fas', 'check-circle'],
        disabled: false
      }
    ]);

    // Computed
    const activeTabIndex = computed(() => 
      tabs.value.findIndex(tab => tab.id === activeTab.value)
    );

    const progressPercentage = computed(() =>
      (completedTabs.value.length / tabs.value.length) * 100
    );

    const availableChildRoles = computed(() => {
      if (!selectedParentRole.value) return [];
      
      for (const category of folderRoleHierarchy.value) {
        const role = category.roles.find(r => r.id === selectedParentRole.value);
        if (role) return role.children || [];
      }
      return [];
    });

    const selectedAssetClassData = computed(() => 
      assetClasses.value.find(ac => ac.id === selectedAssetClass.value)
    );

    const availableUtilities = ref([
      'identifier', 'composition', 'location', 'measurements', 
      'file_details', 'technical_metadata', 'workflow_status'
    ]);

    const assignedRolesCount = computed(() =>
      directoryTree.value.filter(folder => folder.assignedRole).length
    );

    const canProceedToNextTab = computed(() => {
      switch (activeTab.value) {
        case 'analysis':
          return analysisResults.value.length > 0;
        case 'asset-classes':
          return true;
        case 'role-assignment':
          return assignedRolesCount.value > 0;
        case 'context-mapping':
          return true;
        default:
          return true;
      }
    });

    const canFinishWizard = computed(() =>
      validationIssues.value.every(issue => issue.severity !== 'error')
    );

    // Methods
    const handleOverlayClick = (event) => {
      if (event.target.classList.contains('settings-wizard-overlay')) {
        emit('close');
      }
    };

    const selectTab = (tabId) => {
      activeTab.value = tabId;
    };

    const nextTab = () => {
      const currentIndex = activeTabIndex.value;
      if (currentIndex < tabs.value.length - 1) {
        if (!completedTabs.value.includes(activeTab.value)) {
          completedTabs.value.push(activeTab.value);
        }
        activeTab.value = tabs.value[currentIndex + 1].id;
      }
    };

    const previousTab = () => {
      const currentIndex = activeTabIndex.value;
      if (currentIndex > 0) {
        activeTab.value = tabs.value[currentIndex - 1].id;
      }
    };

    // Analysis Methods
    const startAnalysis = async () => {
      isAnalyzing.value = true;
      analysisResults.value = []; // Clear previous results
      if (!mediaInfoReady.value) {
        console.error('MediaInfo.js is not ready.');
        isAnalyzing.value = false;
        return;
      }

      try {
        roomData.value = roomService.getRoom(props.roomId);
        if (!roomData.value || !roomData.value.files) {
          console.warn('No room data or files found for analysis.');
          isAnalyzing.value = false;
          return;
        }

        // Perform deep analysis on each file
        for (const file of roomData.value.files) {
          if (file.kind === 'file') { // Only analyze actual files
            try {
              const fileHandle = file.handle; // Assuming file.handle is available and is a FileSystemFileHandle
              const fileData = await fileHandle.getFile(); // Get the File object from the handle

              const result = await mediaInfo.value.analyzeData(
                () => fileData.size,
                (chunkSize, offset) => new Promise((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = (event) => resolve(new Uint8Array(event.target.result));
                  reader.onerror = (event) => reject(event.target.error);
                  reader.readAsArrayBuffer(fileData.slice(offset, offset + chunkSize));
                })
              );

              analysisResults.value.push({
                path: file.fullPath,
                name: file.name,
                type: file.type,
                size: file.size,
                mediaInfo: result,
                classification: folderClassificationService.classifyFile(file.name, result) // Use file classification
              });

            } catch (fileError) {
              console.warn(`Could not analyze file ${file.fullPath}:`, fileError);
              analysisResults.value.push({
                path: file.fullPath,
                name: file.name,
                type: file.type,
                size: file.size,
                mediaInfo: null,
                classification: null,
                error: fileError.message
              });
            }
          }
        }

        // After file analysis, classify folders based on their contents
        directoryTree.value = await buildDirectoryTree(roomData.value.files);
        for (const folder of directoryTree.value) {
          const folderFiles = analysisResults.value.filter(ar => ar.path.startsWith(folder.path + '/') || ar.path === folder.path);
          const classification = folderClassificationService.classifyFolder(folder.name, folderFiles);
          folder.classification = classification;
        }


        if (!completedTabs.value.includes('analysis')) {
          completedTabs.value.push('analysis');
        }
      } catch (error) {
        console.error('Error during analysis:', error);
      } finally {
        isAnalyzing.value = false;
      }
    };

    

    const selectAnalysisItem = (result) => {
          selectedAnalysisItem.value = result.path;
        };

        const handleToggleFolder = (nodeToToggle) => {
          const findAndToggleNode = (nodes) => {
            for (const node of nodes) {
              if (node.path === nodeToToggle.path) {
                node.isExpanded = !node.isExpanded;
                return true;
              }
              if (node.children && node.children.length > 0) {
                if (findAndToggleNode(node.children)) {
                  return true;
                }
              }
            }
            return false;
          };
          findAndToggleNode(directoryTree.value);
        };

    const getConfidenceClass = (confidence) => {
      if (confidence >= 0.8) return 'high-confidence';
      if (confidence >= 0.6) return 'medium-confidence';
      return 'low-confidence';
    };

    // Helper functions for folder analysis display
    const getFolderFileCount = (folder) => {
      return analysisResults.value.filter(result => 
        result.path.startsWith(folder.path + '/') || result.path === folder.path
      ).length;
    };

    const getFolderFiles = (folder) => {
      return analysisResults.value.filter(result => 
        result.path.startsWith(folder.path + '/') || result.path === folder.path
      );
    };

    const getFolderFormats = (folder) => {
      const folderFiles = getFolderFiles(folder);
      const formats = new Set();
      
      folderFiles.forEach(file => {
        if (file.mediaInfo?.media?.track) {
          file.mediaInfo.media.track.forEach(track => {
            if (track.Format) {
              formats.add(track.Format);
            }
          });
        }
      });
      
      return Array.from(formats);
    };

    // Asset Classes Methods
    const selectAssetClass = (assetClassId) => {
      selectedAssetClass.value = assetClassId;
    };

    const addValidationCriteria = () => {
      if (selectedAssetClassData.value) {
        selectedAssetClassData.value.validationCriteria.push({
          type: 'has_mediainfo_property',
          property: ''
        });
      }
    };

    const removeCriteria = (index) => {
      if (selectedAssetClassData.value) {
        selectedAssetClassData.value.validationCriteria.splice(index, 1);
      }
    };

    const toggleUtility = (utility) => {
      if (selectedAssetClassData.value) {
        const utilities = selectedAssetClassData.value.utilities;
        const index = utilities.indexOf(utility);
        if (index > -1) {
          utilities.splice(index, 1);
        } else {
          utilities.push(utility);
        }
      }
    };

    // Role Assignment Methods
    const buildDirectoryTree = async (files) => {
      // Implementation similar to original RoomSettings
      const folderMap = new Map();
      
      files.forEach(file => {
        const fullPath = file.fullPath || file.name;
        const pathParts = fullPath.split('/').filter(p => p);
        if (pathParts.length <= 1) return;
        
        for (let i = 0; i < pathParts.length - 1; i++) {
          const folderPath = pathParts.slice(0, i + 1).join('/');
          const folderName = pathParts[i];
          
          if (!folderMap.has(folderPath)) {
            folderMap.set(folderPath, {
              name: folderName,
              path: folderPath,
              children: [],
              isExpanded: false,
              fileCount: 0,
              assignedRole: null,
              inheritFromParent: false,
              propagateToChildren: false
            });
          }
          
          folderMap.get(folderPath).fileCount++;
        }
      });
      
      const rootFolders = [];
      folderMap.forEach((folder) => {
        const pathParts = folder.path.split('/');
        if (pathParts.length === 1) {
          rootFolders.push(folder);
        }
      });
      
      return rootFolders;
    };

    const refreshDirectoryTree = async () => {
      roomData.value = roomService.getRoom(props.roomId);
      directoryTree.value = await buildDirectoryTree(roomData.value?.files || []);
    };

    const selectFolder = (folder) => {
      selectedFolder.value = folder;
      selectedFolderPath.value = folder.path;
      
      if (folder.assignedRole) {
        selectedParentRole.value = folder.assignedRole.parentId || '';
        selectedChildRole.value = folder.assignedRole.childId || '';
      } else {
        selectedParentRole.value = '';
        selectedChildRole.value = '';
      }
    };

    const toggleFolder = (folder) => {
      folder.isExpanded = !folder.isExpanded;
    };

    const onParentRoleChange = () => {
      selectedChildRole.value = '';
    };

    const applyRoleAssignment = () => {
      if (!selectedFolder.value || !selectedParentRole.value) return;
      
      selectedFolder.value.assignedRole = {
        parentId: selectedParentRole.value,
        childId: selectedChildRole.value,
        assignedAt: new Date().toISOString()
      };
      
      console.log('Applied role assignment:', selectedFolder.value.assignedRole);
    };

    const getRoleLabel = (assignedRole) => {
      if (!assignedRole) return 'Unassigned';
      return selectedChildRole.value || selectedParentRole.value;
    };

    // Context Mapping Methods
    const selectWorkflowStage = (stageId) => {
      selectedWorkflowStage.value = stageId;
    };

    const getFoldersForStage = (stageId) => {
      return directoryTree.value.filter(folder => 
        folder.assignedRole && folder.workflowStage === stageId
      );
    };

    // Review & Approve Methods
    const exportTemplate = () => {
      const template = {
        roomId: props.roomId,
        analysisResults: analysisResults.value,
        assetClasses: assetClasses.value,
        folderRoles: directoryTree.value.filter(f => f.assignedRole),
        contextRelationships: contextRelationships.value,
        generatedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(template, null, 2)], 
        { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `movielabs-workflow-${props.roomId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    };

    const approveTemplate = () => {
      console.log('Approving template...');
      
      // Save configuration
      const folderRoles = folderRolePersistence.extractFolderRolesFromTree(directoryTree.value);
      folderRolePersistence.saveFolderRoles(props.roomId, folderRoles);
      
      emit('template-applied', {
        roomId: props.roomId,
        template: generatedTemplate.value
      });
      
      emit('close');
    };

    const finishWizard = () => {
      approveTemplate();
    };

    // Generate template on review tab
    watch(activeTab, (newTab) => {
      if (newTab === 'review-approve') {
        generatedTemplate.value = {
          version: '1.0',
          roomId: props.roomId,
          workflow: {
            analysisResults: analysisResults.value.length,
            assetClasses: assetClasses.value.length,
            assignedRoles: assignedRolesCount.value,
            contextRelationships: contextRelationships.value.length
          },
          configuration: {
            analysisOptions: analysisOptions.value,
            assetClasses: assetClasses.value,
            folderRoles: directoryTree.value.filter(f => f.assignedRole)
          }
        };
        
        // Validate configuration
        validationIssues.value = [];
        if (analysisResults.value.length === 0) {
          validationIssues.value.push({
            id: 'no-analysis',
            severity: 'error',
            message: 'No analysis results found. Run analysis first.'
          });
        }
        if (assignedRolesCount.value === 0) {
          validationIssues.value.push({
            id: 'no-roles',
            severity: 'warning',
            message: 'No folder roles assigned. Consider assigning roles for better organization.'
          });
        }
      }
    });

    // Lifecycle
    onMounted(() => {
      refreshDirectoryTree();
    });

    return {
      // State
      activeTab,
      completedTabs,
      tabs,
      roomData,
      directoryTree,
      selectedFolder,
      selectedFolderPath,
      isAnalyzing,
      analysisResults,
      selectedAnalysisItem,
      analysisOptions,
      selectedAssetClass,
      assetClasses,
      selectedParentRole,
      selectedChildRole,
      folderRoleHierarchy,
      selectedWorkflowStage,
      workflowStages,
      contextRelationships,
      validationIssues,
      generatedTemplate,
      
      // Computed
      activeTabIndex,
      progressPercentage,
      availableChildRoles,
      selectedAssetClassData,
      availableUtilities,
      assignedRolesCount,
      canProceedToNextTab,
      canFinishWizard,
      
      // Methods
      handleOverlayClick,
      selectTab,
      nextTab,
      previousTab,
      startAnalysis,
      selectAnalysisItem,
      getConfidenceClass,
      getFolderFileCount,
      getFolderFiles,
      getFolderFormats,
      handleToggleFolder,
      selectAssetClass,
      addValidationCriteria,
      removeCriteria,
      toggleUtility,
      refreshDirectoryTree,
      selectFolder,
      toggleFolder,
      onParentRoleChange,
      applyRoleAssignment,
      getRoleLabel,
      selectWorkflowStage,
      getFoldersForStage,
      exportTemplate,
      approveTemplate,
      finishWizard
    };
  }
};
</script>

<style scoped>
/* Base Modal Styles */
.settings-wizard-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.settings-wizard-modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  width: 100%;
  max-width: 1400px;
  max-height: 95vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.wizard-header {
  padding: 24px 24px 16px 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-content {
  flex: 1;
}

.wizard-title {
  font-size: 24px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 4px 0;
}

.wizard-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.close-button {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-button:hover {
  background-color: #f3f4f6;
  color: #374151;
}

/* Tab Navigation */
.wizard-nav {
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.nav-tabs {
  display: flex;
  overflow-x: auto;
}

.nav-tab {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border: none;
  background: none;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 200px;
  flex-shrink: 0;
  gap: 12px;
  border-bottom: 3px solid transparent;
}

.nav-tab:hover:not(.disabled) {
  background: #f3f4f6;
}

.nav-tab.active {
  background: white;
  border-bottom-color: #3b82f6;
}

.nav-tab.completed .tab-icon {
  color: #10b981;
}

.nav-tab.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tab-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e5e7eb;
  border-radius: 50%;
  color: #6b7280;
  flex-shrink: 0;
}

.nav-tab.active .tab-icon {
  background: #3b82f6;
  color: white;
}

.tab-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.tab-title {
  font-weight: 600;
  color: #111827;
  font-size: 14px;
}

.tab-subtitle {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

.progress-bar {
  height: 3px;
  background: #e5e7eb;
}

.progress-fill {
  height: 100%;
  background: #10b981;
  transition: width 0.3s ease;
}

/* Content Area */
.wizard-content {
  flex: 1;
  overflow: hidden;
}

.tab-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 24px 24px 16px 24px;
  border-bottom: 1px solid #f3f4f6;
  flex-shrink: 0;
}

.panel-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 4px 0;
}

.panel-header p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

/* Analysis Panel */
.analysis-panel {
  padding: 0;
}

.analysis-controls {
  padding: 20px 24px;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  align-items: center;
  gap: 20px;
}

.analyze-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.analyze-button:hover:not(:disabled) {
  background: #2563eb;
}

.analyze-button:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.analysis-options {
  display: flex;
  gap: 16px;
}

.checkbox-option {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  cursor: pointer;
}

.analysis-results {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.analysis-results h4 {
  padding: 20px 24px 12px 24px;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.results-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 24px 24px 24px;
}

.result-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.result-item:hover {
  border-color: #d1d5db;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.result-item.selected {
  border-color: #3b82f6;
  background: #f8fafc;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.folder-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.folder-name {
  font-weight: 600;
  color: #111827;
}

.folder-path {
  font-size: 12px;
  color: #6b7280;
  font-family: monospace;
}

.confidence-badge {
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.confidence-badge.high-confidence {
  background: #dcfce7;
  color: #166534;
}

.confidence-badge.medium-confidence {
  background: #fef3c7;
  color: #92400e;
}

.confidence-badge.low-confidence {
  background: #fee2e2;
  color: #991b1b;
}

.result-details {
  margin-bottom: 8px;
}

.classification-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.classification-label {
  font-weight: 500;
  color: #111827;
}

.asset-type {
  font-size: 12px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
}

.utilities-matched {
  display: flex;
  align-items: center;
  gap: 8px;
}

.utilities-label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
}

.utility-tag {
  font-size: 11px;
  background: #e0e7ff;
  color: #3730a3;
  padding: 2px 6px;
  border-radius: 4px;
}

.media-specs .specs-summary {
  font-size: 12px;
  color: #6b7280;
}

.no-results {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  gap: 12px;
}

.no-results .fa-icon {
  font-size: 48px;
  opacity: 0.5;
}

/* Asset Classes Panel */
.asset-classes-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.asset-class-list {
  width: 400px;
  border-right: 1px solid #e5e7eb;
  overflow-y: auto;
  padding: 20px;
}

.asset-class-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.asset-class-item:hover {
  border-color: #d1d5db;
}

.asset-class-item.selected {
  border-color: #3b82f6;
  background: #f8fafc;
}

.asset-class-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.asset-class-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.asset-type-badge {
  font-size: 11px;
  background: #f3f4f6;
  color: #6b7280;
  padding: 3px 8px;
  border-radius: 12px;
  text-transform: uppercase;
  font-weight: 500;
}

.asset-class-description {
  font-size: 13px;
  color: #6b7280;
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.validation-criteria .criteria-count {
  font-size: 12px;
  color: #3b82f6;
  font-weight: 500;
}

.asset-class-editor {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.asset-class-editor h4 {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.validation-criteria-editor h5 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.criteria-item {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
}

.criteria-header {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.criteria-type {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 13px;
}

.remove-criteria {
  padding: 6px 8px;
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.remove-criteria:hover {
  background: #fecaca;
}

.criteria-config {
  display: flex;
  gap: 8px;
}

.criteria-input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 13px;
}

.range-inputs {
  display: flex;
  gap: 8px;
  width: 100%;
}

.range-input {
  flex: 1;
}

.add-criteria-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 12px;
}

.add-criteria-button:hover {
  background: #e5e7eb;
}

.utilities-section {
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.utilities-section h5 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.utilities-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
}

.utility-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;
}

/* Role Assignment Panel */
.role-assignment-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.directory-section {
  width: 350px;
  border-right: 1px solid #e5e7eb;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.section-header {
  padding: 20px;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.section-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.refresh-button {
  padding: 6px 8px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-button:hover {
  background: #e5e7eb;
}

.directory-tree {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.role-section {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.role-assignment-form {
  max-width: 500px;
}

.selected-folder-header h4 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.folder-path {
  font-size: 12px;
  color: #6b7280;
  font-family: monospace;
}

.current-analysis {
  margin: 16px 0 24px 0;
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.current-analysis h5 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.analysis-summary {
  display: flex;
  align-items: center;
  gap: 12px;
}

.classification-label {
  font-weight: 500;
  color: #111827;
}

.confidence-score {
  font-size: 12px;
  color: #6b7280;
}

.role-selection-form {
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.form-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
}

.form-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.apply-role-button {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.apply-role-button:hover:not(:disabled) {
  background: #2563eb;
}

.apply-role-button:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.inheritance-section {
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.inheritance-section h5 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.inheritance-section .checkbox-option {
  display: block;
  margin-bottom: 8px;
}

.no-folder-selected {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #9ca3af;
  gap: 12px;
}

/* Context Mapping Panel */
.context-mapping-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.context-diagram {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.workflow-stages {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.workflow-stage {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.workflow-stage:hover {
  border-color: #d1d5db;
}

.workflow-stage.selected {
  border-color: #3b82f6;
  background: #f8fafc;
}

.workflow-stage h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.stage-folders {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stage-folder {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  background: #f3f4f6;
  border-radius: 4px;
  font-size: 13px;
}

.folder-role {
  font-size: 11px;
  color: #6b7280;
}

.context-relationships h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.relationship-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.relationship-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.relationship-source,
.relationship-target {
  font-weight: 500;
  color: #111827;
}

.relationship-arrow {
  color: #6b7280;
}

.relationship-type {
  font-size: 12px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
}

/* Review & Approve Panel */
.review-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.review-summary {
  margin-bottom: 32px;
}

.summary-section {
  margin-bottom: 24px;
}

.summary-section h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.summary-stats {
  display: flex;
  gap: 24px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #3b82f6;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
  text-align: center;
}

.issues-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.issue-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
}

.issue-item .fa-exclamation-circle {
  color: #dc2626;
}

.issue-item .fa-exclamation-triangle {
  color: #d97706;
}

.no-issues {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #10b981;
  font-weight: 500;
}

.template-preview {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 16px;
  max-height: 300px;
  overflow-y: auto;
}

.template-preview pre {
  font-size: 12px;
  margin: 0;
  color: #374151;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
}

.approval-actions {
  display: flex;
  gap: 12px;
}

.export-button,
.approve-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.export-button {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
}

.export-button:hover {
  background: #e5e7eb;
}

.approve-button {
  background: #10b981;
  color: white;
}

.approve-button:hover:not(:disabled) {
  background: #059669;
}

.approve-button:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

/* Footer */
.wizard-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.footer-left,
.footer-right {
  display: flex;
  gap: 12px;
}

.nav-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-button.primary {
  background: #3b82f6;
  color: white;
  border: none;
}

.nav-button.primary:hover:not(:disabled) {
  background: #2563eb;
}

.nav-button.primary:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.nav-button.secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
}

.nav-button.secondary:hover {
  background: #e5e7eb;
}
</style>