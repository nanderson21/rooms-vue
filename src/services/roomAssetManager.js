/**
 * Room Asset Manager
 * Integrates folder classification with Room database for intelligent asset management
 * Maps filesystem structures to MovieLabs-compliant Room Assets
 */

import roomDatabase from './roomDatabaseEnhanced.js';
import folderClassificationService from './folderClassificationService.js';

class RoomAssetManager {
  constructor() {
    this.processingState = new Map();
    this.assetCache = new Map();
  }

  /**
   * Create Room from folder with intelligent asset analysis
   */
  async createRoomFromFolder(folderHandle, roomConfig = {}, options = {}) {
    const { progressCallback } = options;
    
    try {
      // Initialize database
      await roomDatabase.initialize();

      const roomId = this.generateRoomId(folderHandle.name);
      
      if (progressCallback) {
        progressCallback({
          type: 'room_creation_start',
          message: `Creating Room: ${folderHandle.name}`,
          roomId
        });
      }

      // Analyze folder structure with classification
      if (progressCallback) {
        progressCallback({
          type: 'analysis_start',
          message: 'Analyzing folder structure...'
        });
      }

      const folderAnalysis = await folderClassificationService.analyzeFolder(
        folderHandle, 
        { maxDepth: 3 }
      );

      // Create room entry in database
      const roomData = {
        path: folderHandle.name,
        name: roomConfig.name || folderHandle.name,
        type: folderAnalysis.assetType || 'mixed_media',
        status: 'processing',
        purpose: folderAnalysis.folderClass?.description || 'Media workflow folder',
        expectedFormats: this.extractExpectedFormats(folderAnalysis),
        metadata: {
          classification: {
            folderClass: folderAnalysis.folderClass?.id,
            confidence: folderAnalysis.confidence,
            utilities: folderAnalysis.utilities
          },
          analysis: {
            fileCount: folderAnalysis.files.length,
            childCount: folderAnalysis.children.length,
            mediaSpecs: folderAnalysis.context.mediaSpecs,
            recommendations: folderAnalysis.recommendations
          },
          compliance: folderAnalysis.compliance
        }
      };

      const folderId = await roomDatabase.createFolder(roomData);

      if (progressCallback) {
        progressCallback({
          type: 'field_definitions',
          message: 'Creating field definitions...'
        });
      }

      // Create field definitions based on classification
      await this.createFieldDefinitions(folderId, folderAnalysis.fieldDefinitions);

      if (progressCallback) {
        progressCallback({
          type: 'asset_processing',
          message: 'Processing assets...'
        });
      }

      // Process assets hierarchically
      const assets = await this.processAssetsHierarchically(
        folderHandle, 
        folderId, 
        folderAnalysis,
        progressCallback
      );

      // Update room status
      await roomDatabase.db.run(
        'UPDATE folders SET status = ?, modified_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['ready', folderId]
      );

      const result = {
        roomId: folderId,
        room: roomData,
        analysis: folderAnalysis,
        assets: assets,
        fieldDefinitions: folderAnalysis.fieldDefinitions
      };

      if (progressCallback) {
        progressCallback({
          type: 'room_creation_complete',
          message: `Room "${folderHandle.name}" created successfully`,
          result
        });
      }

      return result;

    } catch (error) {
      console.error('Error creating room from folder:', error);
      
      if (progressCallback) {
        progressCallback({
          type: 'error',
          message: `Error creating room: ${error.message}`,
          error
        });
      }
      
      throw error;
    }
  }

  /**
   * Process assets hierarchically based on folder structure
   */
  async processAssetsHierarchically(folderHandle, folderId, analysis, progressCallback) {
    const assets = [];
    let processedCount = 0;
    const totalItems = analysis.files.length + analysis.children.length;

    // Process direct files
    for (const fileInfo of analysis.files) {
      try {
        const asset = await this.createAssetFromFile(fileInfo, folderId, analysis);
        if (asset) {
          assets.push(asset);
        }
        
        processedCount++;
        if (progressCallback) {
          progressCallback({
            type: 'asset_progress',
            message: `Processed ${processedCount}/${totalItems} items`,
            progress: Math.round((processedCount / totalItems) * 100)
          });
        }
      } catch (error) {
        console.warn('Error processing file:', fileInfo.name, error);
      }
    }

    // Process child folders
    for (const childInfo of analysis.children) {
      try {
        const childAssets = await this.processChildFolder(
          childInfo, 
          folderId, 
          analysis,
          progressCallback
        );
        assets.push(...childAssets);
        
        processedCount++;
        if (progressCallback) {
          progressCallback({
            type: 'asset_progress',
            message: `Processed ${processedCount}/${totalItems} items`,
            progress: Math.round((processedCount / totalItems) * 100)
          });
        }
      } catch (error) {
        console.warn('Error processing child folder:', childInfo.name, error);
      }
    }

    return assets;
  }

  /**
   * Process child folder based on its classification
   */
  async processChildFolder(childInfo, parentFolderId, parentAnalysis, progressCallback) {
    const assets = [];

    // Analyze child folder
    const childAnalysis = await folderClassificationService.analyzeFolder(childInfo.handle);

    // Create child folder entry
    const childFolderData = {
      path: `${parentAnalysis.folderName}/${childInfo.name}`,
      name: childInfo.name,
      type: childAnalysis.assetType || 'subfolder',
      status: 'active',
      purpose: childAnalysis.folderClass?.description || 'Subfolder',
      expectedFormats: this.extractExpectedFormats(childAnalysis),
      metadata: {
        classification: {
          folderClass: childAnalysis.folderClass?.id,
          confidence: childAnalysis.confidence,
          utilities: childAnalysis.utilities
        },
        parent: parentFolderId
      }
    };

    const childFolderId = await roomDatabase.createFolder(childFolderData);

    // Handle different asset types
    switch (childAnalysis.assetType) {
      case 'clip_group':
        // RED clip folder - create single grouped asset
        const clipAsset = await this.createClipGroupAsset(childInfo, childFolderId, childAnalysis);
        if (clipAsset) assets.push(clipAsset);
        break;

      case 'image_sequence':
        // Image sequence - create single sequence asset
        const sequenceAsset = await this.createImageSequenceAsset(childInfo, childFolderId, childAnalysis);
        if (sequenceAsset) assets.push(sequenceAsset);
        break;

      case 'camera_roll':
        // Process clips within camera roll
        for (const subChild of childInfo.children || []) {
          const clipAssets = await this.processChildFolder(subChild, childFolderId, childAnalysis, progressCallback);
          assets.push(...clipAssets);
        }
        break;

      default:
        // Process individual files in generic folder
        for (const fileInfo of childInfo.files || []) {
          const asset = await this.createAssetFromFile(fileInfo, childFolderId, childAnalysis);
          if (asset) assets.push(asset);
        }
        break;
    }

    return assets;
  }

  /**
   * Create clip group asset (e.g., RED clip)
   */
  async createClipGroupAsset(folderInfo, folderId, analysis) {
    const fileData = {
      folderId: folderId,
      path: folderInfo.name,
      name: folderInfo.name,
      size: folderInfo.files?.reduce((sum, f) => sum + (f.size || 0), 0) || 0,
      type: 'clip_group',
      status: 'active',
      metadata: {
        assetType: 'clip_group',
        fileCount: folderInfo.files?.length || 0,
        files: folderInfo.files?.map(f => ({
          name: f.name,
          type: f.type,
          size: f.size,
          extension: f.extension
        })) || [],
        classification: analysis
      }
    };

    const fileId = await roomDatabase.createFile(fileData);

    // Set field values based on analysis
    await this.setAssetFieldValues(fileId, folderId, analysis, {
      clip_name: folderInfo.name.replace(/\.(R[D3]C|rdc)$/i, ''),
      // Additional fields can be extracted from media analysis
    });

    return {
      id: fileId,
      type: 'clip_group',
      name: folderInfo.name,
      files: folderInfo.files?.length || 0
    };
  }

  /**
   * Create image sequence asset
   */
  async createImageSequenceAsset(folderInfo, folderId, analysis) {
    const imageFiles = folderInfo.files?.filter(f => 
      /\.(exr|dpx|tiff?|png|jpg)$/i.test(f.extension)
    ) || [];

    if (imageFiles.length === 0) return null;

    // Analyze sequence properties
    const sequenceInfo = this.analyzeImageSequence(imageFiles);

    const fileData = {
      folderId: folderId,
      path: folderInfo.name,
      name: folderInfo.name,
      size: imageFiles.reduce((sum, f) => sum + (f.size || 0), 0),
      type: 'image_sequence',
      status: 'active',
      metadata: {
        assetType: 'image_sequence',
        sequence: sequenceInfo,
        fileCount: imageFiles.length,
        classification: analysis
      }
    };

    const fileId = await roomDatabase.createFile(fileData);

    // Set sequence-specific field values
    await this.setAssetFieldValues(fileId, folderId, analysis, {
      sequence_name: folderInfo.name,
      frame_padding: sequenceInfo.framePadding,
      first_frame: sequenceInfo.firstFrame,
      last_frame: sequenceInfo.lastFrame
    });

    return {
      id: fileId,
      type: 'image_sequence',
      name: folderInfo.name,
      frameRange: `${sequenceInfo.firstFrame}-${sequenceInfo.lastFrame}`,
      frameCount: imageFiles.length
    };
  }

  /**
   * Create asset from individual file
   */
  async createAssetFromFile(fileInfo, folderId, analysis) {
    const fileData = {
      folderId: folderId,
      path: fileInfo.name,
      name: fileInfo.name,
      size: fileInfo.size,
      type: fileInfo.type || 'media',
      status: 'active',
      metadata: {
        assetType: 'individual_file',
        extension: fileInfo.extension,
        lastModified: fileInfo.lastModified,
        classification: analysis
      }
    };

    const fileId = await roomDatabase.createFile(fileData);

    // Set basic field values
    await this.setAssetFieldValues(fileId, folderId, analysis, {
      // Basic metadata that can be extracted from file info
    });

    return {
      id: fileId,
      type: 'individual_file',
      name: fileInfo.name,
      size: fileInfo.size
    };
  }

  /**
   * Create field definitions in database
   */
  async createFieldDefinitions(folderId, fieldDefinitions) {
    for (const fieldDef of fieldDefinitions) {
      await roomDatabase.createFieldDefinition(folderId, {
        name: fieldDef.name,
        label: fieldDef.label,
        type: fieldDef.type,
        config: fieldDef.config || {},
        isRequired: fieldDef.required || false,
        displayOrder: fieldDefinitions.indexOf(fieldDef),
        defaultValue: fieldDef.defaultValue,
        validationRules: fieldDef.validationRules || {}
      });
    }
  }

  /**
   * Set field values for an asset
   */
  async setAssetFieldValues(fileId, folderId, analysis, values) {
    // Get field definitions for this folder
    const fieldDefinitions = await roomDatabase.getFieldDefinitions(folderId);

    for (const [fieldName, value] of Object.entries(values)) {
      const fieldDef = fieldDefinitions.find(f => f.field_name === fieldName);
      if (fieldDef && value !== undefined && value !== null) {
        await roomDatabase.setFieldValue(fileId, fieldDef.id, String(value));
      }
    }
  }

  /**
   * Analyze image sequence properties
   */
  analyzeImageSequence(imageFiles) {
    const numbers = imageFiles
      .map(f => f.name.match(/(\d+)/g))
      .filter(matches => matches && matches.length > 0)
      .map(matches => matches[matches.length - 1]);

    numbers.sort((a, b) => parseInt(a) - parseInt(b));

    return {
      firstFrame: numbers.length > 0 ? parseInt(numbers[0]) : 1,
      lastFrame: numbers.length > 0 ? parseInt(numbers[numbers.length - 1]) : 1,
      framePadding: numbers.length > 0 ? numbers[0].length : 4,
      frameCount: imageFiles.length
    };
  }

  /**
   * Extract expected formats from analysis
   */
  extractExpectedFormats(analysis) {
    const formats = new Set();

    if (analysis.folderClass?.expectedFiles) {
      analysis.folderClass.expectedFiles.forEach(format => formats.add(format));
    }

    if (analysis.context?.mediaSpecs?.formats) {
      analysis.context.mediaSpecs.formats.forEach(format => formats.add(format));
    }

    return Array.from(formats);
  }

  /**
   * Generate unique room ID
   */
  generateRoomId(name) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `room-${cleanName}-${timestamp}-${random}`;
  }

  /**
   * Get room with assets and classifications
   */
  async getRoomWithAssets(roomId) {
    try {
      // Get room data
      const room = await roomDatabase.getFolder(roomId);
      if (!room) return null;

      // Get assets (files)
      const assets = await roomDatabase.getFilesByFolder(roomId);

      // Get field definitions
      const fieldDefinitions = await roomDatabase.getFieldDefinitions(roomId);

      // Enhance assets with field values
      for (const asset of assets) {
        asset.fieldValues = await roomDatabase.getFieldValues(asset.id);
      }

      return {
        ...room,
        assets,
        fieldDefinitions,
        assetCount: assets.length
      };
    } catch (error) {
      console.error('Error getting room with assets:', error);
      return null;
    }
  }

  /**
   * Update asset field values
   */
  async updateAssetFields(assetId, fieldValues, options = {}) {
    const { validateFields = true } = options;

    try {
      if (validateFields) {
        // Validate each field value
        for (const [fieldId, value] of Object.entries(fieldValues)) {
          const validation = await roomDatabase.validateFieldValue(fieldId, value);
          if (!validation.isValid) {
            throw new Error(`Validation failed for field ${fieldId}: ${validation.errors.join(', ')}`);
          }
        }
      }

      // Set field values
      for (const [fieldId, value] of Object.entries(fieldValues)) {
        await roomDatabase.setFieldValue(assetId, fieldId, value);
      }

      // Log activity
      await roomDatabase.logActivity('asset', assetId, 'fields_updated', null, null, {
        updatedFields: Object.keys(fieldValues)
      });

      return true;
    } catch (error) {
      console.error('Error updating asset fields:', error);
      throw error;
    }
  }

  /**
   * Search assets by field values
   */
  async searchAssets(roomId, searchCriteria) {
    try {
      const query = `
        SELECT DISTINCT f.*
        FROM files f
        LEFT JOIN field_values fv ON f.id = fv.file_id
        LEFT JOIN field_definitions fd ON fv.field_id = fd.id
        WHERE f.folder_id = ?
        AND (
          f.name LIKE ? OR
          fv.value LIKE ? OR
          f.metadata LIKE ?
        )
        ORDER BY f.name
      `;

      const searchTerm = `%${searchCriteria}%`;
      const stmt = roomDatabase.db.prepare(query);
      
      const results = [];
      stmt.bind([roomId, searchTerm, searchTerm, searchTerm]);
      
      while (stmt.step()) {
        const row = stmt.getAsObject();
        row.metadata = JSON.parse(row.metadata || '{}');
        results.push(row);
      }
      
      stmt.free();
      return results;
    } catch (error) {
      console.error('Error searching assets:', error);
      return [];
    }
  }

  /**
   * Generate asset report for room
   */
  async generateAssetReport(roomId) {
    try {
      const room = await this.getRoomWithAssets(roomId);
      if (!room) return null;

      const report = {
        roomId: roomId,
        roomName: room.name,
        classification: room.metadata?.classification,
        compliance: room.metadata?.compliance,
        summary: {
          totalAssets: room.assets.length,
          assetTypes: {},
          totalSize: 0,
          averageSize: 0
        },
        assets: room.assets.map(asset => ({
          id: asset.id,
          name: asset.name,
          type: asset.type,
          size: asset.size,
          assetType: asset.metadata?.assetType,
          fieldValues: asset.fieldValues || []
        })),
        fieldDefinitions: room.fieldDefinitions,
        recommendations: room.metadata?.analysis?.recommendations || []
      };

      // Calculate summary statistics
      room.assets.forEach(asset => {
        const assetType = asset.metadata?.assetType || asset.type;
        report.summary.assetTypes[assetType] = (report.summary.assetTypes[assetType] || 0) + 1;
        report.summary.totalSize += asset.size || 0;
      });

      report.summary.averageSize = report.summary.totalAssets > 0 
        ? report.summary.totalSize / report.summary.totalAssets 
        : 0;

      return report;
    } catch (error) {
      console.error('Error generating asset report:', error);
      return null;
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.assetCache.clear();
    folderClassificationService.clearCache();
  }
}

// Export singleton instance
export const roomAssetManager = new RoomAssetManager();
export default roomAssetManager;