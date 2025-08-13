/**
 * Room Filesystem Service - Manages .room folders and their contents
 * Handles reading/writing SQLite databases and configuration files to the filesystem
 */

import { RoomDatabase, DEFAULT_ROOM_CONFIG, DEFAULT_HANDLERS } from './roomDatabase.js';

/**
 * Room filesystem management class
 */
export class RoomFileSystem {
  constructor() {
    this.databases = new Map(); // roomId -> RoomDatabase instance
    this.directoryHandles = new Map(); // roomId -> FileSystemDirectoryHandle
  }

  /**
   * Initialize or load a room from a directory
   * @param {FileSystemDirectoryHandle} directoryHandle - Root directory handle
   * @param {Object} options - Options for room initialization
   */
  async initializeRoom(directoryHandle, options = {}) {
    const roomId = this.generateRoomId(directoryHandle.name);
    
    try {
      // Check if .room folder exists
      let roomDirHandle;
      try {
        roomDirHandle = await directoryHandle.getDirectoryHandle('.room');
      } catch (error) {
        // Create .room folder if it doesn't exist
        roomDirHandle = await directoryHandle.getDirectoryHandle('.room', { create: true });
      }

      // Load or create the database
      const database = await this.loadOrCreateDatabase(roomDirHandle, roomId, options);
      
      // Store references
      this.databases.set(roomId, database);
      this.directoryHandles.set(roomId, directoryHandle);

      // Initialize default room configuration if new
      const existingRoom = database.getRoom(roomId);
      if (!existingRoom) {
        await this.createDefaultRoomConfiguration(database, roomId, directoryHandle.name, options);
      }

      return {
        roomId,
        database,
        directoryHandle,
        roomDirHandle
      };

    } catch (error) {
      console.error('Error initializing room:', error);
      throw error;
    }
  }

  /**
   * Load existing database or create new one
   * @param {FileSystemDirectoryHandle} roomDirHandle - .room directory handle
   * @param {string} roomId - Room ID
   * @param {Object} options - Options
   */
  async loadOrCreateDatabase(roomDirHandle, roomId, options = {}) {
    const database = new RoomDatabase();
    
    try {
      // Try to load existing database
      const dbFileHandle = await roomDirHandle.getFileHandle('room.db');
      const dbFile = await dbFileHandle.getFile();
      const dbData = new Uint8Array(await dbFile.arrayBuffer());
      
      await database.initialize(dbData);
      console.log(`Loaded existing database for room ${roomId}`);
      
    } catch (error) {
      // Create new database
      await database.initialize();
      console.log(`Created new database for room ${roomId}`);
      
      // Initialize with default handlers
      if (options.includeDefaultHandlers !== false) {
        await this.initializeDefaultHandlers(database);
      }
    }
    
    return database;
  }

  /**
   * Save database to filesystem
   * @param {string} roomId - Room ID
   */
  async saveDatabaseToFilesystem(roomId) {
    const database = this.databases.get(roomId);
    const directoryHandle = this.directoryHandles.get(roomId);
    
    if (!database || !directoryHandle) {
      throw new Error(`Room ${roomId} not found`);
    }

    try {
      // Get .room directory
      const roomDirHandle = await directoryHandle.getDirectoryHandle('.room');
      
      // Export database
      const dbData = database.export();
      
      // Save to filesystem
      const dbFileHandle = await roomDirHandle.getFileHandle('room.db', { create: true });
      const writable = await dbFileHandle.createWritable();
      await writable.write(dbData);
      await writable.close();
      
      console.log(`Saved database for room ${roomId}`);
      return true;
      
    } catch (error) {
      console.error('Error saving database:', error);
      throw error;
    }
  }

  /**
   * Create default room configuration
   * @param {RoomDatabase} database - Database instance
   * @param {string} roomId - Room ID
   * @param {string} roomName - Room name
   * @param {Object} options - Options
   */
  async createDefaultRoomConfiguration(database, roomId, roomName, options = {}) {
    const config = {
      ...DEFAULT_ROOM_CONFIG,
      ...options.config
    };

    database.createRoom({
      id: roomId,
      name: roomName,
      path: '/',
      parentRoomId: options.parentRoomId || null,
      config
    });

    console.log(`Created default room configuration for ${roomName}`);
  }

  /**
   * Initialize default file format handlers
   * @param {RoomDatabase} database - Database instance
   */
  async initializeDefaultHandlers(database) {
    for (const handler of DEFAULT_HANDLERS) {
      try {
        database.createHandler(handler);
      } catch (error) {
        // Handler might already exist, continue
        console.warn(`Handler ${handler.id} already exists or failed to create:`, error.message);
      }
    }
  }

  /**
   * Scan directory and update database with file information
   * @param {string} roomId - Room ID
   * @param {Function} progressCallback - Progress callback
   */
  async scanAndUpdateFiles(roomId, progressCallback = null) {
    const database = this.databases.get(roomId);
    const directoryHandle = this.directoryHandles.get(roomId);
    
    if (!database || !directoryHandle) {
      throw new Error(`Room ${roomId} not found`);
    }

    const files = [];
    const subdirectories = [];

    if (progressCallback) {
      progressCallback({ type: 'scan_start', message: 'Starting directory scan...' });
    }

    // Recursively scan directory
    await this.scanDirectoryRecursive(directoryHandle, '/', files, subdirectories, progressCallback);

    if (progressCallback) {
      progressCallback({ 
        type: 'scan_complete', 
        message: `Found ${files.length} files in ${subdirectories.length} directories`,
        fileCount: files.length,
        directoryCount: subdirectories.length
      });
    }

    // Update database with file information
    let processedCount = 0;
    for (const file of files) {
      try {
        // Check if file already exists in database
        const existingFiles = database.query(
          'SELECT id FROM files WHERE room_id = ? AND path = ?',
          [roomId, file.path]
        );

        if (existingFiles.length === 0) {
          // Find appropriate handler
          const extension = this.getFileExtension(file.name);
          const handler = database.getHandlerByExtension(extension);

          // Add file to database
          database.addFile({
            id: this.generateFileId(file.path),
            roomId,
            name: file.name,
            path: file.path,
            type: file.type,
            format: extension,
            size: file.size,
            checksum: await this.calculateFileChecksum(file.handle),
            metadata: await this.extractFileMetadata(file.handle, handler),
            handlerId: handler?.id || null
          });
        }

        processedCount++;
        if (progressCallback) {
          progressCallback({
            type: 'file_processed',
            message: `Processed ${processedCount}/${files.length} files`,
            progress: Math.round((processedCount / files.length) * 100)
          });
        }

      } catch (error) {
        console.warn(`Error processing file ${file.path}:`, error);
      }
    }

    // Save updated database
    await this.saveDatabaseToFilesystem(roomId);

    return { files, subdirectories };
  }

  /**
   * Recursively scan directory for files and subdirectories
   * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
   * @param {string} currentPath - Current path
   * @param {Array} files - Files array to populate
   * @param {Array} subdirectories - Subdirectories array to populate
   * @param {Function} progressCallback - Progress callback
   */
  async scanDirectoryRecursive(dirHandle, currentPath, files, subdirectories, progressCallback = null) {
    try {
      for await (const [name, handle] of dirHandle.entries()) {
        // Skip .room directories and hidden files
        if (name.startsWith('.') && name !== '.room') continue;

        const fullPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;

        if (handle.kind === 'directory') {
          if (name !== '.room') { // Don't traverse into .room directories
            subdirectories.push({
              name,
              path: fullPath,
              handle
            });

            // Recursively scan subdirectory
            await this.scanDirectoryRecursive(handle, fullPath, files, subdirectories, progressCallback);
          }
        } else if (handle.kind === 'file') {
          const file = await handle.getFile();
          files.push({
            name,
            path: fullPath,
            type: file.type || 'application/octet-stream',
            size: file.size,
            lastModified: new Date(file.lastModified),
            handle
          });

          if (progressCallback && files.length % 10 === 0) {
            progressCallback({
              type: 'scan_progress',
              message: `Scanning... found ${files.length} files`,
              fileCount: files.length
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${currentPath}:`, error);
    }
  }

  /**
   * Get all subdirectories in a room for hierarchy management
   * @param {string} roomId - Room ID
   */
  async getRoomSubdirectories(roomId) {
    const directoryHandle = this.directoryHandles.get(roomId);
    if (!directoryHandle) {
      throw new Error(`Room ${roomId} not found`);
    }

    const subdirectories = [];
    await this.collectSubdirectoriesRecursive(directoryHandle, '/', subdirectories);
    
    return subdirectories;
  }

  /**
   * Collect subdirectories recursively
   * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
   * @param {string} currentPath - Current path
   * @param {Array} subdirectories - Subdirectories array
   */
  async collectSubdirectoriesRecursive(dirHandle, currentPath, subdirectories) {
    try {
      for await (const [name, handle] of dirHandle.entries()) {
        if (handle.kind === 'directory' && !name.startsWith('.')) {
          const fullPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
          
          // Check if this subdirectory has its own .room folder
          let hasOwnRoom = false;
          try {
            await handle.getDirectoryHandle('.room');
            hasOwnRoom = true;
          } catch (error) {
            // No .room folder
          }

          subdirectories.push({
            name,
            path: fullPath,
            handle,
            hasOwnRoom,
            depth: fullPath.split('/').length - 1
          });

          // Recursively collect from subdirectories
          await this.collectSubdirectoriesRecursive(handle, fullPath, subdirectories);
        }
      }
    } catch (error) {
      console.error(`Error collecting subdirectories from ${currentPath}:`, error);
    }
  }

  /**
   * Create or update configuration files in .room folder
   * @param {string} roomId - Room ID
   * @param {string} fileName - Configuration file name
   * @param {Object} content - File content
   */
  async saveConfigurationFile(roomId, fileName, content) {
    const directoryHandle = this.directoryHandles.get(roomId);
    if (!directoryHandle) {
      throw new Error(`Room ${roomId} not found`);
    }

    try {
      const roomDirHandle = await directoryHandle.getDirectoryHandle('.room');
      const fileHandle = await roomDirHandle.getFileHandle(fileName, { create: true });
      
      const writable = await fileHandle.createWritable();
      const contentString = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      await writable.write(contentString);
      await writable.close();

      console.log(`Saved configuration file ${fileName} for room ${roomId}`);
      return true;

    } catch (error) {
      console.error(`Error saving configuration file ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Load configuration file from .room folder
   * @param {string} roomId - Room ID
   * @param {string} fileName - Configuration file name
   */
  async loadConfigurationFile(roomId, fileName) {
    const directoryHandle = this.directoryHandles.get(roomId);
    if (!directoryHandle) {
      throw new Error(`Room ${roomId} not found`);
    }

    try {
      const roomDirHandle = await directoryHandle.getDirectoryHandle('.room');
      const fileHandle = await roomDirHandle.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      const content = await file.text();

      // Try to parse as JSON, return as string if parsing fails
      try {
        return JSON.parse(content);
      } catch (parseError) {
        return content;
      }

    } catch (error) {
      console.error(`Error loading configuration file ${fileName}:`, error);
      return null;
    }
  }

  /**
   * Utility methods
   */

  generateRoomId(name) {
    const timestamp = Date.now();
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `room-${cleanName}-${timestamp}`;
  }

  generateFileId(path) {
    return `file-${path.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}`;
  }

  getFileExtension(filename) {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot).toLowerCase() : '';
  }

  async calculateFileChecksum(fileHandle) {
    // Simple checksum based on file size and name for now
    // Could be enhanced with actual hash calculation
    const file = await fileHandle.getFile();
    return `${file.size}-${file.lastModified}`;
  }

  async extractFileMetadata(fileHandle, handler) {
    const file = await fileHandle.getFile();
    const metadata = {
      size: file.size,
      lastModified: file.lastModified,
      type: file.type
    };

    // Add handler-specific metadata extraction here
    if (handler?.config?.extractMetadata) {
      // Could call handler-specific metadata extraction
      metadata.handlerProcessed = true;
    }

    return metadata;
  }

  /**
   * Get database instance for a room
   * @param {string} roomId - Room ID
   */
  getDatabase(roomId) {
    return this.databases.get(roomId);
  }

  /**
   * Get directory handle for a room
   * @param {string} roomId - Room ID
   */
  getDirectoryHandle(roomId) {
    return this.directoryHandles.get(roomId);
  }

  /**
   * Close and cleanup room
   * @param {string} roomId - Room ID
   */
  async closeRoom(roomId) {
    // Save database before closing
    await this.saveDatabaseToFilesystem(roomId);
    
    // Cleanup references
    this.databases.delete(roomId);
    this.directoryHandles.delete(roomId);
  }
}

// Global instance
export const roomFileSystem = new RoomFileSystem();

export default roomFileSystem;