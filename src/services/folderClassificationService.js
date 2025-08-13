/**
 * MovieLabs 2030 Folder Classification Service
 * Implements folder class system with intelligent context analysis
 * Maps filesystem structures to Room Assets using MovieLabs ontology
 */

import { processMediaFile } from '../utils/mediaProcessor.js';

// MovieLabs 2030 compliant folder classes
export const FOLDER_CLASSES = {
  // Camera Originals
  RED_CAMERA_ROLL: {
    id: 'red_camera_roll',
    label: 'RED Camera Roll',
    pattern: /\.R[D3]M$/i,
    description: 'RED camera magazine containing .RDC clip folders',
    assetType: 'camera_roll',
    expectedChildren: ['red_clip'],
    utilities: ['identifier', 'composition', 'location', 'measurements'],
    fieldDefinitions: [
      { name: 'reel_name', type: 'text', label: 'Reel Name', required: true },
      { name: 'camera_id', type: 'text', label: 'Camera ID', required: true },
      { name: 'shoot_date', type: 'date', label: 'Shoot Date', required: true },
      { name: 'fps', type: 'number', label: 'Frame Rate', required: true },
      { name: 'resolution', type: 'select', label: 'Resolution', 
        config: { options: [
          { value: '8K', label: '8K (8192x4320)' },
          { value: '6K', label: '6K (6144x3456)' },
          { value: '5K', label: '5K (5120x2700)' },
          { value: '4K', label: '4K (4096x2160)' }
        ]}
      }
    ]
  },

  RED_CLIP: {
    id: 'red_clip',
    label: 'RED Clip',
    pattern: /\.R[D3]C$/i,
    description: 'Individual RED clip folder containing multiple media files',
    assetType: 'clip_group',
    expectedFiles: ['.R3D', '.RMD', '.RSX'],
    utilities: ['identifier', 'composition', 'measurements', 'file_details'],
    fieldDefinitions: [
      { name: 'clip_name', type: 'text', label: 'Clip Name', required: true },
      { name: 'timecode_start', type: 'text', label: 'Start Timecode', 
        config: { pattern: '\\d{2}:\\d{2}:\\d{2}:\\d{2}' }
      },
      { name: 'duration_frames', type: 'number', label: 'Duration (frames)', required: true },
      { name: 'iso', type: 'number', label: 'ISO', required: true },
      { name: 'white_balance', type: 'number', label: 'White Balance (K)' },
      { name: 'lens', type: 'text', label: 'Lens' },
      { name: 'notes', type: 'textarea', label: 'Shot Notes' }
    ]
  },

  ARRI_CAMERA_ROLL: {
    id: 'arri_camera_roll',
    label: 'ARRI Camera Roll',
    pattern: /^[A-Z]\d{3}_[C]\d{3}_\d{8}$/i,
    description: 'ARRI camera roll structure',
    assetType: 'camera_roll',
    expectedFiles: ['.MXF', '.ARI'],
    utilities: ['identifier', 'composition', 'location'],
    fieldDefinitions: [
      { name: 'roll_id', type: 'text', label: 'Roll ID', required: true },
      { name: 'camera_id', type: 'text', label: 'Camera ID', required: true },
      { name: 'date_shot', type: 'date', label: 'Date Shot', required: true }
    ]
  },

  VFX_SEQUENCE: {
    id: 'vfx_sequence',
    label: 'VFX Sequence',
    pattern: /^(seq|sequence)_?\d+/i,
    description: 'Visual effects sequence folder',
    assetType: 'sequence',
    expectedFiles: ['.EXR', '.DPX', '.TIF', '.PNG'],
    utilities: ['identifier', 'composition', 'measurements'],
    fieldDefinitions: [
      { name: 'sequence_name', type: 'text', label: 'Sequence Name', required: true },
      { name: 'shot_count', type: 'number', label: 'Shot Count' },
      { name: 'frame_range', type: 'text', label: 'Frame Range', 
        config: { pattern: '\\d+[-]\\d+' }
      },
      { name: 'resolution', type: 'text', label: 'Resolution', required: true },
      { name: 'color_space', type: 'select', label: 'Color Space',
        config: { options: [
          { value: 'ACES2065-1', label: 'ACES2065-1' },
          { value: 'ACEScg', label: 'ACEScg' },
          { value: 'Rec.709', label: 'Rec.709' },
          { value: 'Rec.2020', label: 'Rec.2020' }
        ]}
      }
    ]
  },

  VFX_SHOT: {
    id: 'vfx_shot',
    label: 'VFX Shot',
    pattern: /^(shot|sh)_?\d+/i,
    description: 'Individual VFX shot folder',
    assetType: 'shot',
    expectedChildren: ['image_sequence', 'reference_media'],
    utilities: ['identifier', 'composition', 'measurements'],
    fieldDefinitions: [
      { name: 'shot_name', type: 'text', label: 'Shot Name', required: true },
      { name: 'frame_count', type: 'number', label: 'Frame Count', required: true },
      { name: 'start_frame', type: 'number', label: 'Start Frame', required: true },
      { name: 'end_frame', type: 'number', label: 'End Frame', required: true },
      { name: 'vfx_complexity', type: 'select', label: 'VFX Complexity',
        config: { options: [
          { value: 'A', label: 'A - Simple' },
          { value: 'B', label: 'B - Medium' },
          { value: 'C', label: 'C - Complex' }
        ]}
      }
    ]
  },

  IMAGE_SEQUENCE: {
    id: 'image_sequence',
    label: 'Image Sequence',
    pattern: /\.(exr|dpx|tif{1,2}|png)$/i,
    description: 'Numbered image sequence',
    assetType: 'image_sequence',
    utilities: ['identifier', 'measurements', 'file_details'],
    fieldDefinitions: [
      { name: 'sequence_name', type: 'text', label: 'Sequence Name', required: true },
      { name: 'frame_padding', type: 'number', label: 'Frame Padding', required: true },
      { name: 'first_frame', type: 'number', label: 'First Frame', required: true },
      { name: 'last_frame', type: 'number', label: 'Last Frame', required: true },
      { name: 'bit_depth', type: 'number', label: 'Bit Depth' }
    ]
  },

  PROXIES: {
    id: 'proxies',
    label: 'Proxy Media',
    pattern: /^(prox|proxy|proxies)/i,
    description: 'Lower resolution proxy files for editing',
    assetType: 'proxy_media',
    expectedFiles: ['.MOV', '.MP4', '.MXF'],
    utilities: ['identifier', 'composition', 'measurements'],
    fieldDefinitions: [
      { name: 'proxy_resolution', type: 'select', label: 'Proxy Resolution',
        config: { options: [
          { value: '1080p', label: '1080p' },
          { value: '720p', label: '720p' },
          { value: '540p', label: '540p' }
        ]}
      },
      { name: 'codec', type: 'text', label: 'Codec', required: true },
      { name: 'linked_original', type: 'file_reference', label: 'Original Media' }
    ]
  },

  DELIVERABLES: {
    id: 'deliverables',
    label: 'Final Deliverables',
    pattern: /^(final|deliver|output)/i,
    description: 'Final output media for delivery',
    assetType: 'deliverable',
    utilities: ['identifier', 'composition', 'measurements', 'file_details'],
    fieldDefinitions: [
      { name: 'delivery_format', type: 'text', label: 'Delivery Format', required: true },
      { name: 'delivery_date', type: 'date', label: 'Delivery Date', required: true },
      { name: 'client', type: 'text', label: 'Client', required: true },
      { name: 'version', type: 'text', label: 'Version', required: true },
      { name: 'approved', type: 'boolean', label: 'Client Approved' }
    ]
  },

  AUDIO_STEMS: {
    id: 'audio_stems',
    label: 'Audio Stems',
    pattern: /^(audio|stems|sound)/i,
    description: 'Audio stems and tracks',
    assetType: 'audio_group',
    expectedFiles: ['.WAV', '.AIFF', '.BWF'],
    utilities: ['identifier', 'composition', 'measurements'],
    fieldDefinitions: [
      { name: 'stem_type', type: 'select', label: 'Stem Type',
        config: { options: [
          { value: 'dialogue', label: 'Dialogue' },
          { value: 'music', label: 'Music' },
          { value: 'sfx', label: 'Sound Effects' },
          { value: 'mix', label: 'Final Mix' }
        ]}
      },
      { name: 'channels', type: 'number', label: 'Channel Count', required: true },
      { name: 'sample_rate', type: 'number', label: 'Sample Rate (Hz)', required: true },
      { name: 'bit_depth', type: 'number', label: 'Bit Depth', required: true }
    ]
  }
};

// Context analysis patterns
export const CONTEXT_PATTERNS = {
  // File patterns for detection
  FILE_PATTERNS: {
    red: /\.(r3d|rdm|rdc|rmd|rsx)$/i,
    arri: /\.(ari|mxf)$/i,
    sony: /\.(mxf|mp4)$/i,
    image_sequence: /\.(exr|dpx|tiff?|png|jpg)$/i,
    video: /\.(mov|mp4|mxf|avi|mkv)$/i,
    audio: /\.(wav|aiff?|bwf|mp3|flac)$/i
  },

  // Folder naming patterns
  FOLDER_PATTERNS: {
    camera_roll: /^([A-Z]\d{3}|reel|roll|mag)/i,
    sequence: /^(seq|sequence)[\W_]?\d+/i,
    shot: /^(shot|sh)[\W_]?\d+/i,
    take: /^(take|tk)[\W_]?\d+/i,
    version: /[vV]\d+/,
    proxy: /^(prox|proxy|offline)/i,
    deliverable: /^(final|deliver|output|master)/i
  },

  // Workflow indicators
  WORKFLOW_INDICATORS: {
    vfx: ['comp', 'render', 'cg', 'fx', 'matte', 'roto'],
    editorial: ['cut', 'edit', 'assembly', 'rough', 'fine'],
    color: ['grade', 'color', 'cc', 'lut', 'cdl'],
    audio: ['mix', 'stem', 'dialogue', 'music', 'sfx', 'adr']
  }
};

class FolderClassificationService {
  constructor() {
    this.mediaInfoCache = new Map();
    this.classificationCache = new Map();
  }

  /**
   * Analyze folder and classify based on MovieLabs patterns
   */
  async analyzeFolder(folderHandle, options = {}) {
    const cacheKey = `${folderHandle.name}_${Date.now()}`;
    
    if (this.classificationCache.has(cacheKey)) {
      return this.classificationCache.get(cacheKey);
    }

    const analysis = {
      folderName: folderHandle.name,
      folderClass: null,
      confidence: 0,
      assetType: null,
      utilities: [],
      fieldDefinitions: [],
      children: [],
      files: [],
      context: {},
      recommendations: [],
      compliance: {
        isCompliant: false,
        issues: [],
        suggestions: []
      }
    };

    try {
      // Scan folder contents
      const contents = await this.scanFolderContents(folderHandle);
      analysis.files = contents.files;
      analysis.children = contents.children;

      // Classify based on folder name and contents
      const classification = await this.classifyFolder(folderHandle.name, contents);
      Object.assign(analysis, classification);

      // Analyze media files for technical specs
      const mediaAnalysis = await this.analyzeMediaFiles(contents.files);
      analysis.context.mediaSpecs = mediaAnalysis;

      // Generate recommendations
      analysis.recommendations = this.generateRecommendations(analysis);

      // Validate MovieLabs compliance
      analysis.compliance = await this.validateCompliance(analysis);

      this.classificationCache.set(cacheKey, analysis);
      return analysis;

    } catch (error) {
      console.error('Error analyzing folder:', error);
      analysis.error = error.message;
      return analysis;
    }
  }

  /**
   * Scan folder contents recursively
   */
  async scanFolderContents(folderHandle, depth = 0, maxDepth = 3) {
    const contents = {
      files: [],
      children: []
    };

    if (depth > maxDepth) return contents;

    try {
      for await (const [name, handle] of folderHandle.entries()) {
        if (handle.kind === 'file') {
          const file = await handle.getFile();
          contents.files.push({
            name: name,
            handle: handle,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            extension: this.getFileExtension(name)
          });
        } else if (handle.kind === 'directory') {
          const childContents = await this.scanFolderContents(handle, depth + 1, maxDepth);
          contents.children.push({
            name: name,
            handle: handle,
            ...childContents
          });
        }
      }
    } catch (error) {
      console.error('Error scanning folder contents:', error);
    }

    return contents;
  }

  /**
   * Classify folder based on patterns and contents
   */
  async classifyFolder(folderName, contents) {
    let bestMatch = null;
    let highestConfidence = 0;

    // Test against each folder class
    for (const [classId, folderClass] of Object.entries(FOLDER_CLASSES)) {
      const confidence = this.calculateClassificationConfidence(folderName, contents, folderClass);
      
      if (confidence > highestConfidence) {
        highestConfidence = confidence;
        bestMatch = folderClass;
      }
    }

    if (bestMatch && highestConfidence > 0.6) {
      return {
        folderClass: bestMatch,
        confidence: highestConfidence,
        assetType: bestMatch.assetType,
        utilities: bestMatch.utilities,
        fieldDefinitions: [...bestMatch.fieldDefinitions] // Clone array
      };
    }

    // If no strong match, try to infer from file types
    return this.inferClassFromFiles(contents);
  }

  /**
   * Calculate classification confidence score
   */
  calculateClassificationConfidence(folderName, contents, folderClass) {
    let score = 0;

    // Name pattern matching (40% weight)
    if (folderClass.pattern && folderClass.pattern.test(folderName)) {
      score += 0.4;
    }

    // Expected file types (30% weight)
    if (folderClass.expectedFiles) {
      const fileExtensions = contents.files.map(f => f.extension.toLowerCase());
      const expectedExtensions = folderClass.expectedFiles.map(ext => ext.toLowerCase());
      
      const matchCount = expectedExtensions.filter(ext => 
        fileExtensions.some(fileExt => fileExt === ext)
      ).length;
      
      if (expectedExtensions.length > 0) {
        score += (matchCount / expectedExtensions.length) * 0.3;
      }
    }

    // Expected children (20% weight)
    if (folderClass.expectedChildren) {
      const childrenScore = this.calculateChildrenScore(contents.children, folderClass.expectedChildren);
      score += childrenScore * 0.2;
    }

    // Workflow indicators (10% weight)
    const workflowScore = this.calculateWorkflowScore(folderName, contents);
    score += workflowScore * 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Calculate children folder classification score
   */
  calculateChildrenScore(children, expectedChildren) {
    if (!children || children.length === 0) return 0;

    let matches = 0;
    for (const child of children) {
      for (const expectedType of expectedChildren) {
        const childClass = FOLDER_CLASSES[expectedType.toUpperCase()];
        if (childClass && childClass.pattern && childClass.pattern.test(child.name)) {
          matches++;
          break;
        }
      }
    }

    return children.length > 0 ? matches / children.length : 0;
  }

  /**
   * Calculate workflow context score
   */
  calculateWorkflowScore(folderName, contents) {
    let score = 0;
    const folderLower = folderName.toLowerCase();

    for (const [workflow, keywords] of Object.entries(CONTEXT_PATTERNS.WORKFLOW_INDICATORS)) {
      const keywordMatches = keywords.filter(keyword => 
        folderLower.includes(keyword)
      ).length;
      
      if (keywordMatches > 0) {
        score += keywordMatches / keywords.length;
        break; // Only count the best matching workflow
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Infer classification from file types when name patterns don't match
   */
  inferClassFromFiles(contents) {
    const fileExtensions = contents.files.map(f => f.extension.toLowerCase());
    
    // Check for specific file patterns
    if (fileExtensions.some(ext => CONTEXT_PATTERNS.FILE_PATTERNS.red.test(ext))) {
      return {
        folderClass: FOLDER_CLASSES.RED_CLIP,
        confidence: 0.8,
        assetType: 'clip_group',
        utilities: ['identifier', 'composition', 'measurements'],
        fieldDefinitions: [...FOLDER_CLASSES.RED_CLIP.fieldDefinitions]
      };
    }

    if (this.isImageSequence(contents.files)) {
      return {
        folderClass: FOLDER_CLASSES.IMAGE_SEQUENCE,
        confidence: 0.9,
        assetType: 'image_sequence',
        utilities: ['identifier', 'measurements', 'file_details'],
        fieldDefinitions: [...FOLDER_CLASSES.IMAGE_SEQUENCE.fieldDefinitions]
      };
    }

    // Default to generic folder
    return {
      folderClass: null,
      confidence: 0,
      assetType: 'generic_folder',
      utilities: ['identifier', 'location'],
      fieldDefinitions: [
        { name: 'description', type: 'textarea', label: 'Description' },
        { name: 'category', type: 'text', label: 'Category' }
      ]
    };
  }

  /**
   * Check if files form an image sequence
   */
  isImageSequence(files) {
    const imageFiles = files.filter(f => 
      CONTEXT_PATTERNS.FILE_PATTERNS.image_sequence.test(f.extension)
    );

    if (imageFiles.length < 3) return false;

    // Check for sequential numbering
    const numbers = imageFiles
      .map(f => f.name.match(/(\d+)/g))
      .filter(matches => matches && matches.length > 0)
      .map(matches => parseInt(matches[matches.length - 1]));

    if (numbers.length < 3) return false;

    numbers.sort((a, b) => a - b);
    
    // Check if numbers are mostly sequential
    let sequentialCount = 0;
    for (let i = 1; i < numbers.length; i++) {
      if (numbers[i] - numbers[i-1] <= 2) {
        sequentialCount++;
      }
    }

    return sequentialCount / (numbers.length - 1) > 0.7;
  }

  /**
   * Analyze media files for technical specifications
   */
  async analyzeMediaFiles(files, maxFiles = 5) {
    const mediaSpecs = {
      formats: new Set(),
      resolutions: new Set(),
      frameRates: new Set(),
      codecs: new Set(),
      colorSpaces: new Set(),
      totalSize: 0,
      averageFileSize: 0,
      fileCount: files.length
    };

    // Sample files to avoid processing too many
    const sampleFiles = files.slice(0, maxFiles);

    for (const fileInfo of sampleFiles) {
      try {
        // Use existing media processor if available
        if (typeof processMediaFile === 'function') {
          const mediaInfo = await processMediaFile(fileInfo);
          
          if (mediaInfo.format) mediaSpecs.formats.add(mediaInfo.format);
          if (mediaInfo.resolution) mediaSpecs.resolutions.add(mediaInfo.resolution);
          if (mediaInfo.frameRate) mediaSpecs.frameRates.add(mediaInfo.frameRate);
          if (mediaInfo.codec) mediaSpecs.codecs.add(mediaInfo.codec);
          if (mediaInfo.colorSpace) mediaSpecs.colorSpaces.add(mediaInfo.colorSpace);
        }

        mediaSpecs.totalSize += fileInfo.size || 0;
      } catch (error) {
        console.warn('Error analyzing media file:', fileInfo.name, error);
      }
    }

    // Convert Sets to Arrays and calculate averages
    mediaSpecs.formats = Array.from(mediaSpecs.formats);
    mediaSpecs.resolutions = Array.from(mediaSpecs.resolutions);
    mediaSpecs.frameRates = Array.from(mediaSpecs.frameRates);
    mediaSpecs.codecs = Array.from(mediaSpecs.codecs);
    mediaSpecs.colorSpaces = Array.from(mediaSpecs.colorSpaces);
    mediaSpecs.averageFileSize = files.length > 0 ? 
      files.reduce((sum, f) => sum + (f.size || 0), 0) / files.length : 0;

    return mediaSpecs;
  }

  /**
   * Generate recommendations for optimization
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.confidence < 0.6) {
      recommendations.push({
        type: 'classification',
        priority: 'medium',
        message: 'Folder classification confidence is low. Consider renaming folder to match standard patterns.',
        action: 'rename_folder'
      });
    }

    if (analysis.context.mediaSpecs?.formats.length > 3) {
      recommendations.push({
        type: 'organization',
        priority: 'low',
        message: 'Multiple media formats detected. Consider organizing by format.',
        action: 'organize_by_format'
      });
    }

    if (analysis.assetType === 'image_sequence' && analysis.files.length > 100) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'Large image sequence detected. Consider creating proxy versions.',
        action: 'create_proxies'
      });
    }

    return recommendations;
  }

  /**
   * Validate MovieLabs compliance
   */
  async validateCompliance(analysis) {
    const compliance = {
      isCompliant: true,
      issues: [],
      suggestions: []
    };

    // Check for required utilities
    if (!analysis.utilities || analysis.utilities.length === 0) {
      compliance.isCompliant = false;
      compliance.issues.push('No MovieLabs utilities defined for this folder class');
    }

    // Check for required fields based on asset type
    const requiredFields = analysis.fieldDefinitions.filter(field => field.required);
    if (requiredFields.length === 0 && analysis.assetType !== 'generic_folder') {
      compliance.suggestions.push('Consider adding required fields for better asset tracking');
    }

    // Check naming conventions
    if (analysis.confidence < 0.8) {
      compliance.suggestions.push('Folder naming does not follow standard conventions');
    }

    return compliance;
  }

  /**
   * Get file extension from filename
   */
  getFileExtension(filename) {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === 0) return '';
    return filename.substring(lastDotIndex).toLowerCase();
  }

  /**
   * Clear classification cache
   */
  clearCache() {
    this.classificationCache.clear();
    this.mediaInfoCache.clear();
  }
}

// Export singleton instance
export const folderClassificationService = new FolderClassificationService();
export default folderClassificationService;