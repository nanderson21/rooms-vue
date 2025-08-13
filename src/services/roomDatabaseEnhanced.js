/**
 * Enhanced Room Database Service with SQLite
 * Manages room metadata, review/approval workflow, and custom field definitions
 */

import initSqlJs from 'sql.js';

class RoomDatabaseService {
  constructor() {
    this.db = null;
    this.SQL = null;
    this.initialized = false;
  }

  /**
   * Initialize SQL.js and create/open database
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize SQL.js
      this.SQL = await initSqlJs({
        locateFile: file => `https://sql.js.org/dist/${file}`
      });

      // Create new database
      this.db = new this.SQL.Database();
      
      // Create tables
      await this.createTables();
      
      this.initialized = true;
      console.log('Room database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Create all required tables
   */
  async createTables() {
    const schemas = [
      // Folders table
      `CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        purpose TEXT,
        expected_formats TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata JSON
      )`,

      // Files table
      `CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        folder_id TEXT REFERENCES folders(id),
        path TEXT NOT NULL,
        name TEXT NOT NULL,
        size INTEGER,
        type TEXT,
        status TEXT DEFAULT 'active',
        version_stack_id TEXT,
        version_number INTEGER,
        is_latest_version BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata JSON
      )`,

      // Review/Approval tables
      `CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        file_id TEXT REFERENCES files(id),
        reviewer_id TEXT,
        reviewer_name TEXT,
        status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected', 'needs_changes')),
        comments TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS approval_history (
        id TEXT PRIMARY KEY,
        file_id TEXT REFERENCES files(id),
        review_id TEXT REFERENCES reviews(id),
        action TEXT NOT NULL,
        actor_id TEXT,
        actor_name TEXT,
        comments TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Custom field definitions
      `CREATE TABLE IF NOT EXISTS field_definitions (
        id TEXT PRIMARY KEY,
        folder_id TEXT REFERENCES folders(id),
        field_name TEXT NOT NULL,
        field_label TEXT NOT NULL,
        field_type TEXT NOT NULL CHECK(field_type IN ('text', 'textarea', 'number', 'date', 'datetime', 'select', 'multiselect', 'boolean', 'url', 'email', 'file_reference')),
        field_config JSON,
        is_required BOOLEAN DEFAULT 0,
        is_searchable BOOLEAN DEFAULT 1,
        display_order INTEGER DEFAULT 0,
        default_value TEXT,
        validation_rules JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(folder_id, field_name)
      )`,

      // Field values for files
      `CREATE TABLE IF NOT EXISTS field_values (
        id TEXT PRIMARY KEY,
        file_id TEXT REFERENCES files(id),
        field_id TEXT REFERENCES field_definitions(id),
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(file_id, field_id)
      )`,

      // Version stacks
      `CREATE TABLE IF NOT EXISTS version_stacks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        base_file_id TEXT REFERENCES files(id),
        latest_version_id TEXT REFERENCES files(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata JSON
      )`,

      // Activity log
      `CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        actor_id TEXT,
        actor_name TEXT,
        details JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create indexes
      `CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder_id)`,
      `CREATE INDEX IF NOT EXISTS idx_reviews_file ON reviews(file_id)`,
      `CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status)`,
      `CREATE INDEX IF NOT EXISTS idx_field_values_file ON field_values(file_id)`,
      `CREATE INDEX IF NOT EXISTS idx_field_values_field ON field_values(field_id)`,
      `CREATE INDEX IF NOT EXISTS idx_activities_entity ON activities(entity_type, entity_id)`,
      `CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at)`
    ];

    for (const schema of schemas) {
      this.db.run(schema);
    }
  }

  /**
   * Generate a unique ID
   */
  generateId(prefix = '') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
  }

  // ============= Folder Management =============

  /**
   * Create a new folder entry
   */
  async createFolder(folderData) {
    const id = this.generateId('folder');
    const stmt = this.db.prepare(`
      INSERT INTO folders (id, path, name, type, status, purpose, expected_formats, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      id,
      folderData.path,
      folderData.name,
      folderData.type || 'custom',
      folderData.status || 'active',
      folderData.purpose || null,
      JSON.stringify(folderData.expectedFormats || []),
      JSON.stringify(folderData.metadata || {})
    ]);
    
    stmt.free();
    
    await this.logActivity('folder', id, 'created', null, null, folderData);
    
    return id;
  }

  /**
   * Get folder by ID
   */
  async getFolder(folderId) {
    const stmt = this.db.prepare('SELECT * FROM folders WHERE id = ?');
    const result = stmt.get([folderId]);
    stmt.free();
    
    if (result) {
      result.expected_formats = JSON.parse(result.expected_formats || '[]');
      result.metadata = JSON.parse(result.metadata || '{}');
    }
    
    return result;
  }

  // ============= File Management =============

  /**
   * Create a new file entry
   */
  async createFile(fileData) {
    const id = this.generateId('file');
    const stmt = this.db.prepare(`
      INSERT INTO files (id, folder_id, path, name, size, type, status, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      id,
      fileData.folderId,
      fileData.path,
      fileData.name,
      fileData.size || 0,
      fileData.type || null,
      fileData.status || 'active',
      JSON.stringify(fileData.metadata || {})
    ]);
    
    stmt.free();
    
    await this.logActivity('file', id, 'created', null, null, fileData);
    
    return id;
  }

  /**
   * Get files by folder
   */
  async getFilesByFolder(folderId) {
    const stmt = this.db.prepare(`
      SELECT f.*, r.status as review_status
      FROM files f
      LEFT JOIN reviews r ON f.id = r.file_id AND r.id = (
        SELECT id FROM reviews WHERE file_id = f.id ORDER BY created_at DESC LIMIT 1
      )
      WHERE f.folder_id = ?
      ORDER BY f.name
    `);
    
    const results = [];
    stmt.bind([folderId]);
    
    while (stmt.step()) {
      const row = stmt.getAsObject();
      row.metadata = JSON.parse(row.metadata || '{}');
      results.push(row);
    }
    
    stmt.free();
    return results;
  }

  // ============= Review & Approval =============

  /**
   * Create a review for a file
   */
  async createReview(fileId, reviewData) {
    const id = this.generateId('review');
    const stmt = this.db.prepare(`
      INSERT INTO reviews (id, file_id, reviewer_id, reviewer_name, status, comments)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      id,
      fileId,
      reviewData.reviewerId || 'system',
      reviewData.reviewerName || 'System',
      reviewData.status || 'pending',
      reviewData.comments || null
    ]);
    
    stmt.free();
    
    // Log to approval history
    await this.addApprovalHistory(fileId, id, reviewData.status || 'pending', reviewData);
    
    return id;
  }

  /**
   * Update review status
   */
  async updateReviewStatus(reviewId, status, comments = null) {
    const stmt = this.db.prepare(`
      UPDATE reviews 
      SET status = ?, comments = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    stmt.run([status, comments, reviewId]);
    stmt.free();
    
    // Get review details for history
    const review = await this.getReview(reviewId);
    if (review) {
      await this.addApprovalHistory(review.file_id, reviewId, status, { comments });
    }
  }

  /**
   * Get review by ID
   */
  async getReview(reviewId) {
    const stmt = this.db.prepare('SELECT * FROM reviews WHERE id = ?');
    const result = stmt.get([reviewId]);
    stmt.free();
    return result;
  }

  /**
   * Add approval history entry
   */
  async addApprovalHistory(fileId, reviewId, action, data = {}) {
    const id = this.generateId('history');
    const stmt = this.db.prepare(`
      INSERT INTO approval_history (id, file_id, review_id, action, actor_id, actor_name, comments)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      id,
      fileId,
      reviewId,
      action,
      data.reviewerId || data.actor_id || 'system',
      data.reviewerName || data.actor_name || 'System',
      data.comments || null
    ]);
    
    stmt.free();
    
    await this.logActivity('review', reviewId, action, data.reviewerId, data.reviewerName, data);
  }

  /**
   * Get approval history for a file
   */
  async getApprovalHistory(fileId) {
    const stmt = this.db.prepare(`
      SELECT * FROM approval_history 
      WHERE file_id = ? 
      ORDER BY created_at DESC
    `);
    
    const results = [];
    stmt.bind([fileId]);
    
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    
    stmt.free();
    return results;
  }

  // ============= Custom Fields =============

  /**
   * Create a field definition for a folder
   */
  async createFieldDefinition(folderId, fieldData) {
    const id = this.generateId('field');
    const stmt = this.db.prepare(`
      INSERT INTO field_definitions (
        id, folder_id, field_name, field_label, field_type, 
        field_config, is_required, is_searchable, display_order, 
        default_value, validation_rules
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      id,
      folderId,
      fieldData.name,
      fieldData.label,
      fieldData.type,
      JSON.stringify(fieldData.config || {}),
      fieldData.isRequired ? 1 : 0,
      fieldData.isSearchable !== false ? 1 : 0,
      fieldData.displayOrder || 0,
      fieldData.defaultValue || null,
      JSON.stringify(fieldData.validationRules || {})
    ]);
    
    stmt.free();
    
    await this.logActivity('field_definition', id, 'created', null, null, fieldData);
    
    return id;
  }

  /**
   * Get field definitions for a folder
   */
  async getFieldDefinitions(folderId) {
    const stmt = this.db.prepare(`
      SELECT * FROM field_definitions 
      WHERE folder_id = ? 
      ORDER BY display_order, field_label
    `);
    
    const results = [];
    stmt.bind([folderId]);
    
    while (stmt.step()) {
      const row = stmt.getAsObject();
      row.field_config = JSON.parse(row.field_config || '{}');
      row.validation_rules = JSON.parse(row.validation_rules || '{}');
      results.push(row);
    }
    
    stmt.free();
    return results;
  }

  /**
   * Set field value for a file
   */
  async setFieldValue(fileId, fieldId, value) {
    const id = this.generateId('value');
    
    // Use INSERT OR REPLACE to handle updates
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO field_values (id, file_id, field_id, value, updated_at)
      VALUES (
        COALESCE((SELECT id FROM field_values WHERE file_id = ? AND field_id = ?), ?),
        ?, ?, ?, CURRENT_TIMESTAMP
      )
    `);
    
    stmt.run([fileId, fieldId, id, fileId, fieldId, value]);
    stmt.free();
  }

  /**
   * Get field values for a file
   */
  async getFieldValues(fileId) {
    const stmt = this.db.prepare(`
      SELECT fv.*, fd.field_name, fd.field_label, fd.field_type
      FROM field_values fv
      JOIN field_definitions fd ON fv.field_id = fd.id
      WHERE fv.file_id = ?
    `);
    
    const results = [];
    stmt.bind([fileId]);
    
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    
    stmt.free();
    return results;
  }

  /**
   * Validate field value based on field definition
   */
  async validateFieldValue(fieldId, value) {
    const stmt = this.db.prepare('SELECT * FROM field_definitions WHERE id = ?');
    const field = stmt.get([fieldId]);
    stmt.free();
    
    if (!field) {
      throw new Error('Field definition not found');
    }
    
    const validationRules = JSON.parse(field.validation_rules || '{}');
    const errors = [];
    
    // Required field check
    if (field.is_required && (!value || value.trim() === '')) {
      errors.push(`${field.field_label} is required`);
    }
    
    // Type-specific validation
    switch (field.field_type) {
      case 'number':
        if (value && isNaN(value)) {
          errors.push(`${field.field_label} must be a number`);
        }
        if (validationRules.min !== undefined && Number(value) < validationRules.min) {
          errors.push(`${field.field_label} must be at least ${validationRules.min}`);
        }
        if (validationRules.max !== undefined && Number(value) > validationRules.max) {
          errors.push(`${field.field_label} must be at most ${validationRules.max}`);
        }
        break;
        
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (value && !emailRegex.test(value)) {
          errors.push(`${field.field_label} must be a valid email address`);
        }
        break;
        
      case 'url':
        try {
          if (value) new URL(value);
        } catch {
          errors.push(`${field.field_label} must be a valid URL`);
        }
        break;
        
      case 'date':
      case 'datetime':
        if (value && isNaN(Date.parse(value))) {
          errors.push(`${field.field_label} must be a valid date`);
        }
        break;
        
      case 'select':
      case 'multiselect':
        const fieldConfig = JSON.parse(field.field_config || '{}');
        const options = fieldConfig.options || [];
        const values = field.field_type === 'multiselect' ? 
          (value ? value.split(',') : []) : [value];
        
        for (const val of values) {
          if (val && !options.some(opt => opt.value === val)) {
            errors.push(`${val} is not a valid option for ${field.field_label}`);
          }
        }
        break;
        
      case 'text':
      case 'textarea':
        if (validationRules.minLength && value && value.length < validationRules.minLength) {
          errors.push(`${field.field_label} must be at least ${validationRules.minLength} characters`);
        }
        if (validationRules.maxLength && value && value.length > validationRules.maxLength) {
          errors.push(`${field.field_label} must be at most ${validationRules.maxLength} characters`);
        }
        if (validationRules.pattern) {
          const regex = new RegExp(validationRules.pattern);
          if (value && !regex.test(value)) {
            errors.push(`${field.field_label} format is invalid`);
          }
        }
        break;
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ============= Activity Logging =============

  /**
   * Log an activity
   */
  async logActivity(entityType, entityId, action, actorId = null, actorName = null, details = {}) {
    const id = this.generateId('activity');
    const stmt = this.db.prepare(`
      INSERT INTO activities (id, entity_type, entity_id, action, actor_id, actor_name, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      id,
      entityType,
      entityId,
      action,
      actorId,
      actorName,
      JSON.stringify(details)
    ]);
    
    stmt.free();
  }

  /**
   * Get activities for an entity
   */
  async getActivities(entityType, entityId, limit = 50) {
    const stmt = this.db.prepare(`
      SELECT * FROM activities 
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    
    const results = [];
    stmt.bind([entityType, entityId, limit]);
    
    while (stmt.step()) {
      const row = stmt.getAsObject();
      row.details = JSON.parse(row.details || '{}');
      results.push(row);
    }
    
    stmt.free();
    return results;
  }

  // ============= Database Management =============

  /**
   * Export database to binary
   */
  async exportDatabase() {
    if (!this.db) return null;
    return this.db.export();
  }

  /**
   * Import database from binary
   */
  async importDatabase(data) {
    this.db = new this.SQL.Database(data);
  }

  /**
   * Save database to IndexedDB for persistence
   */
  async saveToIndexedDB(roomId) {
    const data = this.exportDatabase();
    if (!data) return;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('RoomDatabases', 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('databases')) {
          db.createObjectStore('databases');
        }
      };
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['databases'], 'readwrite');
        const store = transaction.objectStore('databases');
        const putRequest = store.put(data, roomId);
        
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Load database from IndexedDB
   */
  async loadFromIndexedDB(roomId) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('RoomDatabases', 1);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['databases'], 'readonly');
        const store = transaction.objectStore('databases');
        const getRequest = store.get(roomId);
        
        getRequest.onsuccess = () => {
          const data = getRequest.result;
          if (data) {
            this.importDatabase(data);
            resolve(true);
          } else {
            resolve(false);
          }
        };
        
        getRequest.onerror = () => reject(getRequest.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }
}

// Export singleton instance
export const roomDatabase = new RoomDatabaseService();
export default roomDatabase;