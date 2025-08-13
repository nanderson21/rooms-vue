/**
 * Asset Mapping Service
 * Implements functional utilities for mapping filesystem structures to Room Assets
 * Using only current stack: Vue, SQLite, File System Access API
 */

import { roomDatabase } from './roomDatabaseEnhanced.js';
import { folderClassificationService } from './folderClassificationService.js';
import { contextAnalysisService } from './contextAnalysisService.js';
import { assetTemplateValidator } from '../schemas/assetTemplateSchema.js';

/**
 * Asset Mapping Service
 * Maps filesystem structures to Room Assets using MovieLabs utilities
 */
export class AssetMappingService {
  constructor() {
    this.initialized = false;
    this.mappingRules = new Map();
    this.assetTemplateCache = new Map();
    this.contextCache = new Map();
  }

  /**
   * Initialize the asset mapping service
   */
  async initialize() {
    if (this.initialized) return;

    // Ensure dependencies are initialized
    await Promise.all([
      roomDatabase.initialize(),
      folderClassificationService.initialize(),
      contextAnalysisService.initialize()
    ]);

    // Load mapping rules
    await this.loadMappingRules();

    this.initialized = true;
    console.log('Asset Mapping Service initialized');
  }

  /**
   * Map a filesystem folder to Room Assets using MovieLabs utilities
   * @param {FileSystemDirectoryHandle} folderHandle - Folder to map
   * @param {string} parentRoomId - Parent room ID (optional)
   * @param {Object} options - Mapping options
   * @returns {Object} Mapping result with created assets
   */
  async mapFolderToAssets(folderHandle, parentRoomId = null, options = {}) {
    try {
      const result = {
        folderId: null,
        assets: [],
        assetGroups: [],
        fieldDefinitions: [],
        validationResults: [],
        recommendations: [],
        statistics: {
          totalFiles: 0,
          processedFiles: 0,
          errors: 0,
          warnings: 0
        }
      };

      // Progress callback
      const progressCallback = options.progressCallback || (() => {});

      progressCallback({ stage: 'classification', message: 'Classifying folder...' });

      // Step 1: Classify folder using classification service
      const folderAnalysis = await folderClassificationService.analyzeFolder(folderHandle, {
        path: options.parentPath || ''
      });

      progressCallback({ stage: 'context_analysis', message: 'Analyzing context...' });

      // Step 2: Perform context analysis
      const contextAnalysis = await contextAnalysisService.analyzeFolderContext(folderHandle, {
        progressCallback: (progress) => {
          if (progress.stage === 'media_processing') {
            progressCallback({
              stage: 'media_processing',
              message: `Processing ${progress.file}...`,
              progress: progress.progress
            });
          }
        }
      });

      progressCallback({ stage: 'database_creation', message: 'Creating database entries...' });

      // Step 3: Create folder entry in database
      result.folderId = await this.createFolderEntry(folderAnalysis, contextAnalysis, parentRoomId);

      // Step 4: Generate field definitions based on folder class
      if (folderAnalysis.detectedClass) {
        result.fieldDefinitions = folderClassificationService.generateFieldDefinitions(
          folderAnalysis.detectedClass,
          folderAnalysis.assetTemplate
        );

        // Create field definitions in database
        for (const fieldDef of result.fieldDefinitions) {
          await roomDatabase.createFieldDefinition(result.folderId, fieldDef);
        }
      }

      progressCallback({ stage: 'asset_creation', message: 'Creating asset entries...' });

      // Step 5: Create individual file assets
      result.assets = await this.createFileAssets(
        contextAnalysis.mediaAnalysis.files,
        result.folderId,
        folderAnalysis,
        contextAnalysis
      );

      result.statistics.totalFiles = contextAnalysis.mediaAnalysis.files.length;
      result.statistics.processedFiles = result.assets.length;

      // Step 6: Create asset groups
      if (contextAnalysis.assetGroups.length > 0) {
        result.assetGroups = await this.createAssetGroups(
          contextAnalysis.assetGroups,
          result.folderId,
          result.assets
        );
      }

      // Step 7: Apply MovieLabs utilities and validate
      result.validationResults = await this.validateAssetsAgainstUtilities(
        result.assets,
        folderAnalysis.assetTemplate
      );

      // Step 8: Generate recommendations
      result.recommendations = this.generateMappingRecommendations(
        folderAnalysis,
        contextAnalysis,
        result
      );

      progressCallback({ stage: 'complete', message: 'Mapping complete!' });

      return result;

    } catch (error) {
      console.error('Error mapping folder to assets:', error);
      throw error;
    }
  }

  /**
   * Create folder entry in database
   * @param {Object} folderAnalysis - Folder classification results
   * @param {Object} contextAnalysis - Context analysis results
   * @param {string} parentRoomId - Parent room ID
   * @returns {string} Created folder ID
   */
  async createFolderEntry(folderAnalysis, contextAnalysis, parentRoomId) {
    const folderData = {
      name: folderAnalysis.folderName,
      path: folderAnalysis.path,
      type: folderAnalysis.detectedClass || 'generic',
      status: 'active',
      purpose: this.generateFolderPurpose(folderAnalysis, contextAnalysis),
      expectedFormats: this.extractExpectedFormats(folderAnalysis, contextAnalysis),
      metadata: {
        classification: folderAnalysis,
        contextAnalysis: {
          workflowType: contextAnalysis.workflowType,
          technicalSpecs: contextAnalysis.technicalSpecs,
          confidence: contextAnalysis.confidence
        },
        parentRoomId: parentRoomId,
        createdBy: 'asset_mapping_service',
        assetTemplate: folderAnalysis.assetTemplate?.movielab_utilities || null
      }
    };

    return await roomDatabase.createFolder(folderData);
  }

  /**
   * Create file assets from media analysis
   * @param {Array} files - Analyzed media files
   * @param {string} folderId - Parent folder ID
   * @param {Object} folderAnalysis - Folder analysis
   * @param {Object} contextAnalysis - Context analysis
   * @returns {Array} Created file asset IDs
   */
  async createFileAssets(files, folderId, folderAnalysis, contextAnalysis) {
    const createdAssets = [];

    for (const file of files) {
      try {
        // Apply MovieLabs utilities to generate metadata
        const utilityMetadata = this.applyUtilitiesToFile(
          file,
          folderAnalysis.assetTemplate,
          contextAnalysis
        );

        const fileData = {
          folderId: folderId,
          name: file.name,
          path: file.handle ? `${folderAnalysis.path}/${file.name}` : file.name,
          size: file.size,
          type: file.category,
          status: 'active',
          metadata: {
            // Original file metadata
            extension: file.extension,
            category: file.category,
            lastModified: file.lastModified,
            
            // Enhanced metadata from analysis
            videoMetadata: file.videoMetadata,
            imageMetadata: file.imageMetadata,
            audioMetadata: file.audioMetadata,
            commonMetadata: file.commonMetadata,
            
            // MovieLabs utility metadata
            utilityMetadata: utilityMetadata,
            
            // Context information
            contextTags: this.generateContextTags(file, folderAnalysis, contextAnalysis),
            
            // Thumbnail data
            thumbnail: file.thumbnail,
            thumbnailWidth: file.thumbnailWidth,
            thumbnailHeight: file.thumbnailHeight,
            
            // Processing info
            processingError: file.processingError,
            placeholder: file.placeholder
          }
        };

        const assetId = await roomDatabase.createFile(fileData);
        createdAssets.push({
          id: assetId,
          file: file,
          metadata: utilityMetadata
        });

        // Set field values based on asset template
        if (folderAnalysis.assetTemplate) {
          await this.setFieldValuesFromTemplate(
            assetId,
            file,
            folderAnalysis.assetTemplate,
            folderId
          );
        }

      } catch (error) {
        console.error(`Error creating asset for file ${file.name}:`, error);
      }
    }

    return createdAssets;
  }

  /**
   * Apply MovieLabs utilities to generate file metadata
   * @param {Object} file - File object
   * @param {Object} assetTemplate - Asset template
   * @param {Object} contextAnalysis - Context analysis
   * @returns {Object} Utility-generated metadata
   */
  applyUtilitiesToFile(file, assetTemplate, contextAnalysis) {
    const utilityMetadata = {};

    if (!assetTemplate) return utilityMetadata;

    const utilities = assetTemplate.movielab_utilities;
    const contextVars = assetTemplate.context_variables || {};

    // Apply Identifier utility
    if (utilities.identifier) {
      const variables = {
        ...contextVars,
        filename: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
        extension: file.extension.substring(1), // Remove dot
        size: file.size,
        category: file.category
      };

      utilityMetadata.identifier = folderClassificationService.generateIdentifier(
        variables,
        utilities.identifier
      );
    }

    // Apply Measurement utility
    if (utilities.measurements && (file.videoMetadata || file.imageMetadata)) {
      const assetMetadata = {
        width: file.width || (file.videoMetadata && file.videoMetadata.width) ||
               (file.imageMetadata && file.imageMetadata.width),
        height: file.height || (file.videoMetadata && file.videoMetadata.height) ||
                (file.imageMetadata && file.imageMetadata.height),
        frameRate: file.videoMetadata?.estimatedFrameRate
      };

      utilityMetadata.measurementValidation = folderClassificationService.checkMeasurements(
        assetMetadata,
        utilities.measurements
      );
    }

    // Apply File Details utility
    if (utilities.file_details) {
      const metadata = {
        identifier: utilityMetadata.identifier || file.name,
        frame: 1,
        version: this.extractVersionFromFilename(file.name),
        extension: file.extension
      };

      utilityMetadata.suggestedFilename = folderClassificationService.generateFilename(
        metadata,
        utilities.file_details
      );
    }

    // Apply Location utility
    if (utilities.location) {
      utilityMetadata.location = folderClassificationService.resolveLocation(
        contextVars,
        utilities.location
      );
    }

    // Apply Composition validation
    if (utilities.composition) {
      // For single files, check if they match required inclusions
      const availableAssets = [{ name: file.name, type: file.category }];
      utilityMetadata.compositionValidation = folderClassificationService.validateComposition(
        availableAssets,
        utilities.composition
      );
    }

    return utilityMetadata;
  }

  /**
   * Create asset groups based on context analysis
   * @param {Array} assetGroups - Detected asset groups
   * @param {string} folderId - Parent folder ID
   * @param {Array} assets - Created assets
   * @returns {Array} Created asset group records
   */
  async createAssetGroups(assetGroups, folderId, assets) {
    const createdGroups = [];

    for (const group of assetGroups) {
      try {
        // Find corresponding assets
        const groupAssets = assets.filter(asset =>
          group.files.some(file => file.name === asset.file.name)
        );

        if (groupAssets.length === 0) continue;

        // Create version stack entry for each group
        const stackData = {
          name: group.name,
          base_file_id: groupAssets[0].id,
          latest_version_id: this.findLatestVersion(groupAssets).id,
          metadata: {
            groupType: group.type,
            originalGroup: group,
            fileCount: groupAssets.length,
            totalSize: group.metadata?.totalSize || 0
          }
        };

        const stackId = await this.createVersionStack(stackData);

        // Update files with version stack information
        for (let i = 0; i < groupAssets.length; i++) {
          await this.updateFileVersionInfo(groupAssets[i].id, stackId, i + 1, i === groupAssets.length - 1);
        }

        createdGroups.push({
          id: stackId,
          type: group.type,
          name: group.name,
          assets: groupAssets
        });

      } catch (error) {
        console.error(`Error creating asset group ${group.name}:`, error);
      }
    }

    return createdGroups;
  }

  /**
   * Create version stack entry (simplified version since we don't have the exact table structure)
   */
  async createVersionStack(stackData) {
    // This would use the version_stacks table from roomDatabaseEnhanced.js
    const id = roomDatabase.generateId('stack');
    
    const stmt = roomDatabase.db.prepare(`
      INSERT INTO version_stacks (id, name, base_file_id, latest_version_id, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      id,
      stackData.name,
      stackData.base_file_id,
      stackData.latest_version_id,
      JSON.stringify(stackData.metadata)
    ]);
    
    stmt.free();
    return id;
  }

  /**
   * Update file version information
   */
  async updateFileVersionInfo(fileId, stackId, versionNumber, isLatest) {
    const stmt = roomDatabase.db.prepare(`
      UPDATE files 
      SET version_stack_id = ?, version_number = ?, is_latest_version = ?
      WHERE id = ?
    `);
    
    stmt.run([stackId, versionNumber, isLatest ? 1 : 0, fileId]);
    stmt.free();
  }

  /**
   * Set field values from asset template
   * @param {string} assetId - Asset ID
   * @param {Object} file - File object
   * @param {Object} assetTemplate - Asset template
   * @param {string} folderId - Folder ID
   */
  async setFieldValuesFromTemplate(assetId, file, assetTemplate, folderId) {
    try {
      // Get field definitions for this folder
      const fieldDefs = await roomDatabase.getFieldDefinitions(folderId);
      
      // Auto-populate field values where possible
      for (const fieldDef of fieldDefs) {
        let value = null;

        switch (fieldDef.field_name) {
          case 'asset_class':
            value = assetTemplate.movielab_utilities?.identifier?.scope?.split('.').pop() || 'generic';
            break;
          case 'movielabs_type':
            value = this.inferMovieLabsType(file, assetTemplate);
            break;
          case 'context_tags':
            value = JSON.stringify(this.generateContextTags(file, { assetTemplate }, {}));
            break;
          case 'camera_id':
            value = this.extractCameraId(file);
            break;
          case 'timecode_start':
            value = this.extractTimecode(file);
            break;
          case 'resolution':
            if (file.width && file.height) {
              value = `${file.width}x${file.height}`;
            }
            break;
          case 'frame_rate':
            value = file.videoMetadata?.estimatedFrameRate;
            break;
          case 'color_space':
            value = file.videoMetadata?.colorSpace || file.imageMetadata?.colorSpace;
            break;
          case 'duration':
            value = file.formattedDuration;
            break;
        }

        if (value !== null) {
          await roomDatabase.setFieldValue(assetId, fieldDef.id, value);
        }
      }

    } catch (error) {
      console.error('Error setting field values from template:', error);
    }
  }

  /**
   * Validate assets against MovieLabs utilities
   * @param {Array} assets - Created assets
   * @param {Object} assetTemplate - Asset template
   * @returns {Array} Validation results
   */
  async validateAssetsAgainstUtilities(assets, assetTemplate) {
    const validationResults = [];

    if (!assetTemplate) return validationResults;

    for (const asset of assets) {
      const result = {
        assetId: asset.id,
        fileName: asset.file.name,
        validations: [],
        errors: [],
        warnings: [],
        overallValid: true
      };

      // Validate against input asset requirements
      if (assetTemplate.input_assets) {
        for (const inputAsset of assetTemplate.input_assets) {
          const validation = this.validateAssetAgainstInputRequirements(
            asset.file,
            inputAsset
          );
          result.validations.push(validation);
          
          if (!validation.valid) {
            result.overallValid = false;
            result.errors.push(...validation.errors);
          }
          result.warnings.push(...validation.warnings);
        }
      }

      // Validate measurements
      if (asset.metadata?.utilityMetadata?.measurementValidation) {
        const measurementValidation = asset.metadata.utilityMetadata.measurementValidation;
        if (!measurementValidation.valid) {
          result.overallValid = false;
          result.errors.push(...measurementValidation.errors);
        }
        result.warnings.push(...measurementValidation.warnings);
      }

      // Validate file naming
      if (asset.metadata?.utilityMetadata?.suggestedFilename) {
        const suggested = asset.metadata.utilityMetadata.suggestedFilename;
        if (suggested !== asset.file.name) {
          result.warnings.push(`Filename doesn't match template. Suggested: ${suggested}`);
        }
      }

      validationResults.push(result);
    }

    return validationResults;
  }

  /**
   * Validate asset against input requirements
   * @param {Object} file - File object
   * @param {Object} inputAsset - Input asset requirements
   * @returns {Object} Validation result
   */
  validateAssetAgainstInputRequirements(file, inputAsset) {
    const result = {
      inputAssetName: inputAsset.name,
      valid: true,
      errors: [],
      warnings: []
    };

    // Validate file size
    if (inputAsset.validation_rules?.file_size_min) {
      const minSize = this.parseFileSize(inputAsset.validation_rules.file_size_min);
      if (file.size < minSize) {
        result.valid = false;
        result.errors.push(`File size ${this.formatFileSize(file.size)} is below minimum ${inputAsset.validation_rules.file_size_min}`);
      }
    }

    if (inputAsset.validation_rules?.file_size_max) {
      const maxSize = this.parseFileSize(inputAsset.validation_rules.file_size_max);
      if (file.size > maxSize) {
        result.valid = false;
        result.errors.push(`File size ${this.formatFileSize(file.size)} exceeds maximum ${inputAsset.validation_rules.file_size_max}`);
      }
    }

    // Validate metadata requirements
    if (inputAsset.required_metadata) {
      const missingMetadata = this.checkRequiredMetadata(file, inputAsset.required_metadata);
      if (missingMetadata.length > 0) {
        result.warnings.push(`Missing metadata: ${missingMetadata.join(', ')}`);
      }
    }

    return result;
  }

  /**
   * Generate mapping recommendations
   * @param {Object} folderAnalysis - Folder analysis
   * @param {Object} contextAnalysis - Context analysis  
   * @param {Object} mappingResult - Mapping result
   * @returns {Array} Recommendations
   */
  generateMappingRecommendations(folderAnalysis, contextAnalysis, mappingResult) {
    const recommendations = [];

    // Low confidence recommendations
    if (folderAnalysis.confidence < 70 || contextAnalysis.confidence < 70) {
      recommendations.push({
        type: 'warning',
        category: 'classification',
        message: 'Folder classification confidence is low. Consider reorganizing files or adding metadata.',
        priority: 'high',
        action: 'review_organization'
      });
    }

    // Asset template recommendations
    if (!folderAnalysis.assetTemplate) {
      recommendations.push({
        type: 'suggestion',
        category: 'template',
        message: 'No asset template found. Creating a template could improve automation and validation.',
        priority: 'medium',
        action: 'create_template'
      });
    }

    // Validation error recommendations
    const errorCount = mappingResult.validationResults.filter(r => !r.overallValid).length;
    if (errorCount > 0) {
      recommendations.push({
        type: 'error',
        category: 'validation',
        message: `${errorCount} files have validation errors. Review and fix before proceeding.`,
        priority: 'high',
        action: 'fix_validation_errors'
      });
    }

    // Asset group recommendations
    if (mappingResult.assetGroups.length > 0) {
      recommendations.push({
        type: 'info',
        category: 'organization',
        message: `Found ${mappingResult.assetGroups.length} asset groups. These have been organized automatically.`,
        priority: 'low',
        action: 'review_groups'
      });
    }

    // Workflow recommendations
    if (contextAnalysis.workflowType !== 'generic_workflow') {
      recommendations.push({
        type: 'success',
        category: 'workflow',
        message: `Detected ${contextAnalysis.workflowType}. Specialized tools and workflows are available.`,
        priority: 'medium',
        action: 'explore_workflow_tools'
      });
    }

    return recommendations;
  }

  // ============= Utility Helper Methods =============

  /**
   * Load mapping rules (placeholder for future expansion)
   */
  async loadMappingRules() {
    // Rules would be loaded here in future versions
    console.log('Asset mapping rules loaded');
  }

  /**
   * Generate folder purpose description
   */
  generateFolderPurpose(folderAnalysis, contextAnalysis) {
    const folderClass = folderClassificationService.folderClasses.get(folderAnalysis.detectedClass);
    
    if (folderClass) {
      return `${folderClass.description} (${contextAnalysis.workflowType})`;
    }
    
    return `Generic folder containing ${contextAnalysis.mediaAnalysis.totalFiles} files`;
  }

  /**
   * Extract expected formats from analysis
   */
  extractExpectedFormats(folderAnalysis, contextAnalysis) {
    const formats = new Set();
    
    // From folder classification
    const folderClass = folderClassificationService.folderClasses.get(folderAnalysis.detectedClass);
    if (folderClass && folderClass.expectedExtensions) {
      folderClass.expectedExtensions.forEach(ext => formats.add(ext));
    }
    
    // From context analysis
    if (contextAnalysis.technicalSpecs && contextAnalysis.technicalSpecs.formats) {
      contextAnalysis.technicalSpecs.formats.forEach(format => formats.add(format));
    }
    
    return Array.from(formats);
  }

  /**
   * Generate context tags for a file
   */
  generateContextTags(file, folderAnalysis, contextAnalysis) {
    const tags = new Set();
    
    // File type tags
    tags.add(file.category);
    tags.add(file.extension.substring(1));
    
    // From folder classification
    const folderClass = folderClassificationService.folderClasses.get(folderAnalysis.detectedClass);
    if (folderClass && folderClass.contextTags) {
      folderClass.contextTags.forEach(tag => tags.add(tag));
    }
    
    // From asset template
    if (folderAnalysis.assetTemplate && folderAnalysis.assetTemplate.input_assets) {
      for (const inputAsset of folderAnalysis.assetTemplate.input_assets) {
        if (inputAsset.context_tags) {
          inputAsset.context_tags.forEach(tag => tags.add(tag));
        }
      }
    }
    
    // Technical tags
    if (file.videoMetadata?.isRaw) tags.add('raw');
    if (file.imageMetadata?.hasAlpha) tags.add('alpha');
    if (file.placeholder) tags.add('needs_processing');
    
    return Array.from(tags);
  }

  /**
   * Infer MovieLabs type from file and template
   */
  inferMovieLabsType(file, assetTemplate) {
    if (assetTemplate.movielab_utilities?.composition?.starting_point) {
      return 'composition';
    }
    
    switch (file.category) {
      case 'video':
        if (file.videoMetadata?.isRaw) return 'acquisition';
        return 'derivative';
      case 'image':
        if (file.imageMetadata?.isSequence) return 'visual_effects';
        return 'derivative';
      case 'audio':
        return 'audio_mixing';
      case 'project':
        return 'conform_finish';
      default:
        return 'generic';
    }
  }

  /**
   * Extract version number from filename
   */
  extractVersionFromFilename(filename) {
    const versionMatch = filename.match(/v(\d{2,3})|version[._-]?(\d+)|_(\d{2,3})$/i);
    return versionMatch ? parseInt(versionMatch[1] || versionMatch[2] || versionMatch[3]) : 1;
  }

  /**
   * Find latest version in asset group
   */
  findLatestVersion(assets) {
    return assets.reduce((latest, current) => {
      const latestVersion = this.extractVersionFromFilename(latest.file.name);
      const currentVersion = this.extractVersionFromFilename(current.file.name);
      return currentVersion > latestVersion ? current : latest;
    });
  }

  /**
   * Parse file size string to bytes
   */
  parseFileSize(sizeStr) {
    const units = { B: 1, KB: 1024, MB: 1024**2, GB: 1024**3, TB: 1024**4 };
    const match = sizeStr.match(/^(\d+)([KMGT]?B)$/);
    return match ? parseInt(match[1]) * units[match[2]] : 0;
  }

  /**
   * Format file size
   */
  formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Check required metadata
   */
  checkRequiredMetadata(file, requiredMetadata) {
    const missing = [];
    
    // This would check if file has all required metadata fields
    // Implementation depends on what metadata is actually available
    
    return missing;
  }

  /**
   * Extract camera ID from file (placeholder)
   */
  extractCameraId(file) {
    // Would extract from actual file metadata
    return null;
  }

  /**
   * Extract timecode from file (placeholder)
   */
  extractTimecode(file) {
    // Would extract from actual file metadata  
    return null;
  }
}

// Export singleton instance
export const assetMappingService = new AssetMappingService();
export default assetMappingService;