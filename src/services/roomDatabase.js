/**
 * Room Database Service
 * Manages SQLite databases for .room folders with all metadata, analysis, and thumbnails
 */

import initSqlJs from 'sql.js';

// SQLite database schema for .room folders
const ROOM_DATABASE_SCHEMA = `
  -- Room metadata and configuration
  CREATE TABLE IF NOT EXISTS room_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    directory_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    total_files INTEGER DEFAULT 0,
    total_size INTEGER DEFAULT 0,
    has_video BOOLEAN DEFAULT 0,
    has_images BOOLEAN DEFAULT 0,
    has_audio BOOLEAN DEFAULT 0,
    has_documents BOOLEAN DEFAULT 0,
    thumbnail_path TEXT,
    index_version INTEGER DEFAULT 1
  );

  -- File metadata and analysis results
  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    full_path TEXT NOT NULL,
    size INTEGER NOT NULL,
    type TEXT,
    category TEXT,
    extension TEXT,
    last_modified INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- Analysis results
    thumbnail_path TEXT,
    duration REAL,
    width INTEGER,
    height INTEGER,
    bitrate INTEGER,
    metadata_json TEXT, -- JSON blob for additional metadata
    analysis_complete BOOLEAN DEFAULT 0,
    processing_error TEXT
  );

  -- Comments on files
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id TEXT NOT NULL,
    timestamp REAL DEFAULT 0,
    content TEXT NOT NULL,
    author_name TEXT DEFAULT 'User',
    author_avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES files(file_id)
  );

  -- Folder hierarchy and organization
  CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    parent_path TEXT,
    file_count INTEGER DEFAULT 0,
    total_size INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Room activity log
  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES room_metadata (room_id)
  );

  -- Room settings and preferences
  CREATE TABLE IF NOT EXISTS room_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    type TEXT DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES room_metadata (room_id),
    UNIQUE (room_id, key)
  );

  -- Create indexes for performance
  CREATE INDEX IF NOT EXISTS idx_files_category ON files (category);
  CREATE INDEX IF NOT EXISTS idx_files_path ON files (path);
  CREATE INDEX IF NOT EXISTS idx_files_full_path ON files (full_path);
  CREATE INDEX IF NOT EXISTS idx_folders_path ON folders (path);
  CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders (parent_path);
  CREATE INDEX IF NOT EXISTS idx_activity_room_id ON activity_log (room_id);
  CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_log (timestamp);
  CREATE INDEX IF NOT EXISTS idx_settings_room_key ON room_settings (room_id, key);
`;

let SQL = null;

/**
 * Initialize SQL.js
 * @returns {Promise<void>}
 */
async function initializeSQL() {
  if (!SQL) {
    try {
      SQL = await initSqlJs({
        // Use CDN for WASM file
        locateFile: file => `https://sql.js.org/dist/${file}`
      });
      console.log('SQL.js initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SQL.js:', error);
      throw new Error('SQLite initialization failed');
    }
  }
}

/**
 * Create a new SQLite database for a room
 * @returns {Object} SQL.js database instance
 */
function createRoomDatabase() {
  if (!SQL) {
    throw new Error('SQL.js not initialized');
  }
  
  const db = new SQL.Database();
  
  // Execute schema creation
  db.exec(ROOM_DATABASE_SCHEMA);
  
  return db;
}

/**
 * Load SQLite database from file data
 * @param {Uint8Array} data - Database file data
 * @returns {Object} SQL.js database instance
 */
function loadRoomDatabase(data) {
  if (!SQL) {
    throw new Error('SQL.js not initialized');
  }
  
  return new SQL.Database(data);
}

/**
 * Room Database Manager Class
 */
export class RoomDatabaseManager {
  constructor(roomId, directoryHandle) {
    this.roomId = roomId;
    this.directoryHandle = directoryHandle;
    this.db = null;
    this.roomFolderHandle = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the room database (create .room folder and database)
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      await initializeSQL();
      
      // Create or get .room folder
      this.roomFolderHandle = await this.directoryHandle.getDirectoryHandle('.room', { create: true });
      
      // Try to load existing database
      try {
        const dbFileHandle = await this.roomFolderHandle.getFileHandle('room.db');
        const dbFile = await dbFileHandle.getFile();
        const dbData = new Uint8Array(await dbFile.arrayBuffer());
        this.db = loadRoomDatabase(dbData);
        console.log(`Loaded existing database for room ${this.roomId}`);
        
        // Ensure all required tables exist (migration)
        await this.ensureTablesExist();
      } catch (error) {
        // Database doesn't exist, create new one
        this.db = createRoomDatabase();
        await this.saveDatabase();
        console.log(`Created new database for room ${this.roomId}`);
      }

      this.isInitialized = true;
      await this.logActivity('database_initialized', 'Room database initialized');

    } catch (error) {
      console.error('Failed to initialize room database:', error);
      throw error;
    }
  }

  /**
   * Ensure all required tables exist in the database (migration)
   * @returns {Promise<void>}
   */
  async ensureTablesExist() {
    if (!this.db) return;

    try {
      // Check if comments table exists
      const result = this.db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='comments'");
      
      if (result.length === 0) {
        // Comments table doesn't exist, create it
        console.log(`Creating missing comments table for room ${this.roomId}`);
        
        const commentsTableSQL = `
          CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_id TEXT NOT NULL,
            timestamp REAL DEFAULT 0,
            content TEXT NOT NULL,
            author_name TEXT DEFAULT 'User',
            author_avatar TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (file_id) REFERENCES files(file_id)
          );
        `;
        
        this.db.exec(commentsTableSQL);
        await this.saveDatabase();
        console.log(`Comments table created for room ${this.roomId}`);
      }
    } catch (error) {
      console.error('Error ensuring tables exist:', error);
    }
  }

  /**
   * Save database to .room/room.db file
   * @returns {Promise<void>}
   */
  async saveDatabase() {
    if (!this.db || !this.roomFolderHandle) return;

    try {
      const dbData = this.db.export();
      const dbFileHandle = await this.roomFolderHandle.getFileHandle('room.db', { create: true });
      const writable = await dbFileHandle.createWritable();
      await writable.write(dbData);
      await writable.close();
      
      console.log(`Database saved for room ${this.roomId}`);
    } catch (error) {
      console.error('Failed to save database:', error);
      throw error;
    }
  }

  /**
   * Initialize room metadata
   * @param {Object} roomData - Room data object
   * @returns {Promise<void>}
   */
  async initializeRoomMetadata(roomData) {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO room_metadata (
        room_id, name, description, directory_path, created_at, updated_at,
        is_active, total_files, total_size, has_video, has_images, has_audio, has_documents
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      this.roomId,
      roomData.title || roomData.name,
      roomData.description || '',
      roomData.directoryHandle?.name || '',
      new Date().toISOString(),
      new Date().toISOString(),
      1, // Always start as active
      roomData.totalFiles || 0,
      roomData.totalSize || 0,
      roomData.hasVideo ? 1 : 0,
      roomData.hasImages ? 1 : 0,
      roomData.hasAudio ? 1 : 0,
      roomData.hasDocuments ? 1 : 0
    ]);

    stmt.free();
    await this.saveDatabase();
    await this.logActivity('room_metadata_initialized', 'Room metadata created');
  }

  /**
   * Store file metadata in database
   * @param {Object} file - File metadata object
   * @returns {Promise<void>}
   */
  async storeFileMetadata(file) {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO files (
        file_id, name, path, full_path, size, type, category, extension,
        last_modified, thumbnail_path, duration, width, height, metadata_json, analysis_complete
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      file.id,
      file.name,
      file.path || '',
      file.fullPath || file.name,
      file.size || 0,
      file.type || file.mimetype,
      file.category,
      file.extension,
      file.lastModified || Date.now(),
      file.thumbnailPath || null,
      file.duration || null,
      file.width || null,
      file.height || null,
      JSON.stringify(file.metadata || {}),
      file.analysisComplete ? 1 : 0
    ]);

    stmt.free();
  }

  /**
   * Store thumbnail file to .room/thumbnails/ folder
   * @param {string} fileId - File ID
   * @param {Blob} thumbnailBlob - Thumbnail image blob
   * @returns {Promise<string>} Path to stored thumbnail
   */
  async storeThumbnail(fileId, thumbnailBlob) {
    if (!this.roomFolderHandle) throw new Error('Room folder not initialized');

    try {
      // Create thumbnails subdirectory
      const thumbnailsHandle = await this.roomFolderHandle.getDirectoryHandle('thumbnails', { create: true });
      
      // Generate thumbnail filename
      const thumbnailFilename = `${fileId}.webp`;
      const thumbnailFileHandle = await thumbnailsHandle.getFileHandle(thumbnailFilename, { create: true });
      
      // Write thumbnail data
      const writable = await thumbnailFileHandle.createWritable();
      await writable.write(thumbnailBlob);
      await writable.close();
      
      const thumbnailPath = `thumbnails/${thumbnailFilename}`;
      console.log(`Thumbnail stored: ${thumbnailPath}`);
      return thumbnailPath;
      
    } catch (error) {
      console.error('Failed to store thumbnail:', error);
      throw error;
    }
  }

  /**
   * Get room active status
   * @returns {Promise<boolean>}
   */
  async getRoomActiveStatus() {
    if (!this.db) return true; // Default to active

    const stmt = this.db.prepare('SELECT is_active FROM room_metadata WHERE room_id = ?');
    const result = stmt.get([this.roomId]);
    stmt.free();
    
    return result ? Boolean(result.is_active) : true;
  }

  /**
   * Set room active status
   * @param {boolean} isActive - Active status
   * @returns {Promise<void>}
   */
  async setRoomActiveStatus(isActive) {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      UPDATE room_metadata 
      SET is_active = ?, updated_at = ?
      WHERE room_id = ?
    `);

    stmt.run([isActive ? 1 : 0, new Date().toISOString(), this.roomId]);
    stmt.free();
    
    await this.saveDatabase();
    await this.logActivity('status_changed', `Room ${isActive ? 'activated' : 'deactivated'}`);
  }

  /**
   * Get all files from database
   * @returns {Promise<Array>} Array of file objects
   */
  async getAllFiles() {
    if (!this.db) return [];

    const stmt = this.db.prepare('SELECT * FROM files ORDER BY full_path');
    const files = [];
    
    while (stmt.step()) {
      const row = stmt.getAsObject();
      files.push({
        id: row.file_id,
        name: row.name,
        path: row.path,
        fullPath: row.full_path,
        size: row.size,
        type: row.type,
        category: row.category,
        extension: row.extension,
        lastModified: row.last_modified,
        thumbnailPath: row.thumbnail_path,
        duration: row.duration,
        width: row.width,
        height: row.height,
        metadata: row.metadata_json ? JSON.parse(row.metadata_json) : {},
        analysisComplete: Boolean(row.analysis_complete)
      });
    }
    
    stmt.free();
    return files;
  }

  /**
   * Update room statistics
   * @param {Object} stats - Room statistics
   * @returns {Promise<void>}
   */
  async updateRoomStats(stats) {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      UPDATE room_metadata 
      SET total_files = ?, total_size = ?, has_video = ?, has_images = ?, 
          has_audio = ?, has_documents = ?, updated_at = ?
      WHERE room_id = ?
    `);

    stmt.run([
      stats.totalFiles || 0,
      stats.totalSize || 0,
      stats.hasVideo ? 1 : 0,
      stats.hasImages ? 1 : 0,
      stats.hasAudio ? 1 : 0,
      stats.hasDocuments ? 1 : 0,
      new Date().toISOString(),
      this.roomId
    ]);

    stmt.free();
    await this.saveDatabase();
  }

  /**
   * Log activity
   * @param {string} action - Action name
   * @param {string} details - Action details
   * @returns {Promise<void>}
   */
  async logActivity(action, details) {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT INTO activity_log (room_id, action, details, timestamp)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run([this.roomId, action, details, new Date().toISOString()]);
    stmt.free();
    
    // Don't save database for every log entry to avoid performance issues
  }

  /**
   * Wipe all data and re-index
   * @returns {Promise<void>}
   */
  async wipeAndReindex() {
    if (!this.db) throw new Error('Database not initialized');

    // Clear all data tables
    this.db.exec(`
      DELETE FROM files;
      DELETE FROM folders;
      DELETE FROM activity_log;
      UPDATE room_metadata SET 
        total_files = 0, total_size = 0, 
        has_video = 0, has_images = 0, has_audio = 0, has_documents = 0,
        updated_at = '${new Date().toISOString()}',
        index_version = index_version + 1;
    `);

    // Remove thumbnail files
    try {
      const thumbnailsHandle = await this.roomFolderHandle.getDirectoryHandle('thumbnails');
      for await (const [name, fileHandle] of thumbnailsHandle.entries()) {
        if (fileHandle.kind === 'file') {
          await thumbnailsHandle.removeEntry(name);
        }
      }
    } catch (error) {
      // Thumbnails folder might not exist
      console.log('No thumbnails to clean up');
    }

    await this.saveDatabase();
    await this.logActivity('wiped_reindexed', 'All data wiped for re-indexing');
    
    console.log(`Room ${this.roomId} wiped and ready for re-indexing`);
  }

  /**
   * Add a comment to a file
   * @param {string} fileId - File ID
   * @param {Object} comment - Comment data
   * @returns {Promise<number>} Comment ID
   */
  async addComment(fileId, comment) {
    if (!this.db) await this.initialize();
    
    const sql = `
      INSERT INTO comments (file_id, timestamp, content, author_name, author_avatar)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const result = this.db.run(sql, [
      fileId,
      comment.timestamp || 0,
      comment.content,
      comment.author?.name || 'User',
      comment.author?.avatar || null
    ]);
    
    await this.saveDatabase();
    console.log(`Comment added to file ${fileId}`);
    
    // Return the inserted comment ID
    const idResult = this.db.exec('SELECT last_insert_rowid() as id');
    return idResult[0]?.values[0][0];
  }
  
  /**
   * Get comments for a file
   * @param {string} fileId - File ID
   * @returns {Promise<Array>} Array of comments
   */
  async getComments(fileId) {
    if (!this.db) await this.initialize();
    
    const sql = `
      SELECT id, timestamp, content, author_name, author_avatar, created_at
      FROM comments
      WHERE file_id = ?
      ORDER BY timestamp ASC
    `;
    
    const result = this.db.exec(sql, [fileId]);
    
    if (result.length === 0) return [];
    
    return result[0].values.map(row => ({
      id: row[0],
      timestamp: row[1],
      content: row[2],
      author: {
        name: row[3],
        avatar: row[4]
      },
      createdAt: row[5]
    }));
  }
  
  /**
   * Delete a comment
   * @param {number} commentId - Comment ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteComment(commentId) {
    if (!this.db) await this.initialize();
    
    const sql = 'DELETE FROM comments WHERE id = ?';
    this.db.run(sql, [commentId]);
    await this.saveDatabase();
    
    console.log(`Comment ${commentId} deleted`);
    return true;
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.isInitialized = false;
  }
}

/**
 * Initialize SQL.js on module load
 */
export const initializeRoomDatabase = initializeSQL;

export default RoomDatabaseManager;