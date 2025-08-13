/**
 * Room Database Service - Manages SQLite databases for room configurations
 * Uses sql.js for in-browser SQLite support
 */

import initSqlJs from 'sql.js';

// SQLite instance
let SQL = null;

/**
 * Initialize SQL.js
 */
async function initSQL() {
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: file => `https://sql.js.org/dist/${file}`
    });
  }
  return SQL;
}

/**
 * Room database schema
 */
const DATABASE_SCHEMA = `
  -- Room configuration table
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    parent_room_id TEXT,
    config TEXT, -- JSON configuration
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_room_id) REFERENCES rooms(id)
  );

  -- File metadata table
  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    type TEXT,
    format TEXT,
    size INTEGER,
    checksum TEXT,
    metadata TEXT, -- JSON metadata
    handler_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (handler_id) REFERENCES handlers(id)
  );

  -- File format handlers table
  CREATE TABLE IF NOT EXISTS handlers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    file_extensions TEXT, -- JSON array of extensions
    component_name TEXT,
    ingest_script TEXT,
    config TEXT, -- JSON configuration
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Custom components table
  CREATE TABLE IF NOT EXISTS components (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    component_code TEXT, -- Vue component code
    props_schema TEXT, -- JSON schema for props
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Ingest scripts table
  CREATE TABLE IF NOT EXISTS scripts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    script_code TEXT, -- JavaScript code
    handler_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (handler_id) REFERENCES handlers(id)
  );

  -- Room hierarchy and relationships
  CREATE TABLE IF NOT EXISTS room_hierarchy (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    parent_room_id TEXT,
    path_depth INTEGER,
    is_managed BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (parent_room_id) REFERENCES rooms(id)
  );
`;

/**
 * Room database class
 */
export class RoomDatabase {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the database
   * @param {Uint8Array} existingData - Existing database data (optional)
   */
  async initialize(existingData = null) {
    await initSQL();
    
    if (existingData) {
      this.db = new SQL.Database(existingData);
    } else {
      this.db = new SQL.Database();
      // Create schema for new database
      this.db.exec(DATABASE_SCHEMA);
    }
    
    this.isInitialized = true;
  }

  /**
   * Export database as Uint8Array for saving to filesystem
   */
  export() {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.export();
  }

  /**
   * Execute a query
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   */
  query(query, params = []) {
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      const stmt = this.db.prepare(query);
      const results = [];
      
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      
      stmt.free();
      return results;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  /**
   * Execute a query that doesn't return results (INSERT, UPDATE, DELETE)
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   */
  exec(query, params = []) {
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      const stmt = this.db.prepare(query);
      stmt.run(params);
      stmt.free();
      return true;
    } catch (error) {
      console.error('Database exec error:', error);
      throw error;
    }
  }

  // Room management methods
  
  /**
   * Create a new room
   * @param {Object} roomData - Room configuration
   */
  createRoom(roomData) {
    const { id, name, path, parentRoomId = null, config = {} } = roomData;
    
    return this.exec(
      `INSERT INTO rooms (id, name, path, parent_room_id, config, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [id, name, path, parentRoomId, JSON.stringify(config)]
    );
  }

  /**
   * Get room by ID
   * @param {string} roomId - Room ID
   */
  getRoom(roomId) {
    const results = this.query(
      'SELECT * FROM rooms WHERE id = ?',
      [roomId]
    );
    
    if (results.length > 0) {
      const room = results[0];
      room.config = JSON.parse(room.config || '{}');
      return room;
    }
    
    return null;
  }

  /**
   * Get all rooms
   */
  getAllRooms() {
    const results = this.query(
      'SELECT * FROM rooms ORDER BY created_at DESC'
    );
    
    return results.map(room => {
      room.config = JSON.parse(room.config || '{}');
      return room;
    });
  }

  /**
   * Update room configuration
   * @param {string} roomId - Room ID
   * @param {Object} updates - Updates to apply
   */
  updateRoom(roomId, updates) {
    const fields = [];
    const values = [];
    
    Object.keys(updates).forEach(key => {
      if (key === 'config') {
        fields.push('config = ?');
        values.push(JSON.stringify(updates[key]));
      } else {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });
    
    fields.push('updated_at = datetime(\'now\')');
    values.push(roomId);
    
    return this.exec(
      `UPDATE rooms SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * Delete a room
   * @param {string} roomId - Room ID
   */
  deleteRoom(roomId) {
    return this.exec('DELETE FROM rooms WHERE id = ?', [roomId]);
  }

  // File management methods

  /**
   * Add file to room
   * @param {Object} fileData - File metadata
   */
  addFile(fileData) {
    const { id, roomId, name, path, type, format, size, checksum, metadata = {}, handlerId = null } = fileData;
    
    return this.exec(
      `INSERT INTO files (id, room_id, name, path, type, format, size, checksum, metadata, handler_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [id, roomId, name, path, type, format, size, checksum, JSON.stringify(metadata), handlerId]
    );
  }

  /**
   * Get files for a room
   * @param {string} roomId - Room ID
   */
  getRoomFiles(roomId) {
    const results = this.query(
      'SELECT * FROM files WHERE room_id = ? ORDER BY name',
      [roomId]
    );
    
    return results.map(file => {
      file.metadata = JSON.parse(file.metadata || '{}');
      return file;
    });
  }

  /**
   * Update file metadata
   * @param {string} fileId - File ID
   * @param {Object} updates - Updates to apply
   */
  updateFile(fileId, updates) {
    const fields = [];
    const values = [];
    
    Object.keys(updates).forEach(key => {
      if (key === 'metadata') {
        fields.push('metadata = ?');
        values.push(JSON.stringify(updates[key]));
      } else {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });
    
    fields.push('updated_at = datetime(\'now\')');
    values.push(fileId);
    
    return this.exec(
      `UPDATE files SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  // Handler management methods

  /**
   * Create a file format handler
   * @param {Object} handlerData - Handler configuration
   */
  createHandler(handlerData) {
    const { id, name, description, fileExtensions, componentName, ingestScript, config = {} } = handlerData;
    
    return this.exec(
      `INSERT INTO handlers (id, name, description, file_extensions, component_name, ingest_script, config, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [id, name, description, JSON.stringify(fileExtensions), componentName, ingestScript, JSON.stringify(config)]
    );
  }

  /**
   * Get all handlers
   */
  getAllHandlers() {
    const results = this.query(
      'SELECT * FROM handlers ORDER BY name'
    );
    
    return results.map(handler => {
      handler.file_extensions = JSON.parse(handler.file_extensions || '[]');
      handler.config = JSON.parse(handler.config || '{}');
      return handler;
    });
  }

  /**
   * Get handler by file extension
   * @param {string} extension - File extension
   */
  getHandlerByExtension(extension) {
    const handlers = this.getAllHandlers();
    return handlers.find(handler => 
      handler.file_extensions.includes(extension.toLowerCase())
    );
  }

  // Component management methods

  /**
   * Create a custom component
   * @param {Object} componentData - Component data
   */
  createComponent(componentData) {
    const { id, name, description, componentCode, propsSchema = {} } = componentData;
    
    return this.exec(
      `INSERT INTO components (id, name, description, component_code, props_schema, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [id, name, description, componentCode, JSON.stringify(propsSchema)]
    );
  }

  /**
   * Get all components
   */
  getAllComponents() {
    const results = this.query(
      'SELECT * FROM components ORDER BY name'
    );
    
    return results.map(component => {
      component.props_schema = JSON.parse(component.props_schema || '{}');
      return component;
    });
  }

  // Room hierarchy methods

  /**
   * Set room hierarchy relationship
   * @param {string} roomId - Room ID
   * @param {string} parentRoomId - Parent room ID
   * @param {number} pathDepth - Depth in hierarchy
   * @param {boolean} isManaged - Whether this room is managed by parent
   */
  setRoomHierarchy(roomId, parentRoomId, pathDepth, isManaged = true) {
    // Remove existing hierarchy entry
    this.exec('DELETE FROM room_hierarchy WHERE room_id = ?', [roomId]);
    
    // Add new hierarchy entry
    return this.exec(
      `INSERT INTO room_hierarchy (id, room_id, parent_room_id, path_depth, is_managed, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [`${roomId}-hierarchy`, roomId, parentRoomId, pathDepth, isManaged]
    );
  }

  /**
   * Get room hierarchy
   * @param {string} roomId - Room ID
   */
  getRoomHierarchy(roomId) {
    return this.query(
      `SELECT rh.*, r.name as room_name, pr.name as parent_name
       FROM room_hierarchy rh
       LEFT JOIN rooms r ON r.id = rh.room_id
       LEFT JOIN rooms pr ON pr.id = rh.parent_room_id
       WHERE rh.room_id = ?`,
      [roomId]
    );
  }

  /**
   * Get child rooms
   * @param {string} parentRoomId - Parent room ID
   */
  getChildRooms(parentRoomId) {
    return this.query(
      `SELECT r.*, rh.is_managed, rh.path_depth
       FROM rooms r
       LEFT JOIN room_hierarchy rh ON r.id = rh.room_id
       WHERE rh.parent_room_id = ?
       ORDER BY rh.path_depth, r.name`,
      [parentRoomId]
    );
  }
}

/**
 * Default room configuration
 */
export const DEFAULT_ROOM_CONFIG = {
  version: "1.0.0",
  features: {
    fileManagement: true,
    customHandlers: true,
    customComponents: true,
    ingestScripts: true
  },
  ui: {
    theme: "default",
    layout: "grid",
    showHidden: false
  },
  security: {
    allowCustomScripts: true,
    sandboxMode: false
  }
};

/**
 * Default file format handlers
 */
export const DEFAULT_HANDLERS = [
  {
    id: "image-handler",
    name: "Image Handler",
    description: "Handles common image formats",
    fileExtensions: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"],
    componentName: "ImageViewer",
    ingestScript: "image-ingest.js",
    config: {
      generateThumbnails: true,
      maxThumbnailSize: 300,
      extractMetadata: true
    }
  },
  {
    id: "video-handler",
    name: "Video Handler", 
    description: "Handles video files with preview generation",
    fileExtensions: [".mp4", ".webm", ".ogg", ".avi", ".mov", ".wmv"],
    componentName: "VideoPlayer",
    ingestScript: "video-ingest.js",
    config: {
      generateThumbnails: true,
      generateSpriteSheets: true,
      extractMetadata: true
    }
  },
  {
    id: "audio-handler",
    name: "Audio Handler",
    description: "Handles audio files with waveform generation",
    fileExtensions: [".mp3", ".wav", ".ogg", ".aac", ".flac"],
    componentName: "AudioPlayer",
    ingestScript: "audio-ingest.js",
    config: {
      generateWaveforms: true,
      extractMetadata: true
    }
  },
  {
    id: "document-handler",
    name: "Document Handler",
    description: "Handles document files",
    fileExtensions: [".pdf", ".doc", ".docx", ".txt", ".rtf"],
    componentName: "DocumentViewer",
    ingestScript: "document-ingest.js",
    config: {
      extractText: true,
      generateThumbnails: true
    }
  }
];

export default RoomDatabase;