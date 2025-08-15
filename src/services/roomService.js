/**
 * Room Service for File System Access API Integration
 * Manages room creation, file system handles, and room data persistence
 */

import { reactive, ref, computed } from 'vue';
import { 
  pickDirectory, 
  scanDirectory, 
  calculateDirectoryStats,
  validateDirectoryHandle,
  formatFileSize
} from '../utils/fileSystemAccess.js';
import { processMediaFiles } from '../utils/mediaProcessor.js';
import { handlePersistence } from './handlePersistence.js';
import { RoomDatabaseManager } from './roomDatabase.js';

// Global reactive state
const rooms = reactive(new Map());
const activeRoom = ref(null);
const isLoading = ref(false);
const error = ref(null);
const isInitialized = ref(false);

/**
 * Generate a unique room ID
 * @param {string} directoryName - Name of the directory
 * @returns {string} Unique room ID
 */
function generateRoomId(directoryName) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const cleanName = directoryName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `room-${cleanName}-${timestamp}-${random}`;
}

/**
 * Load room thumbnail from the first available image with a stored thumbnail
 * @param {Object} room - Room object
 * @param {Array} storedFiles - Array of stored file objects
 */
async function loadRoomThumbnail(room, storedFiles) {
  try {
    // Find the first image file with a thumbnail path
    const firstImageWithThumbnail = storedFiles.find(file => 
      file.category === 'image' && file.thumbnailPath && !file.placeholder
    );
    
    if (firstImageWithThumbnail && room.dbManager) {
      const thumbnailsHandle = await room.dbManager.roomFolderHandle.getDirectoryHandle('thumbnails');
      const thumbnailFileName = firstImageWithThumbnail.thumbnailPath.split('/').pop();
      const thumbnailFileHandle = await thumbnailsHandle.getFileHandle(thumbnailFileName);
      const thumbnailFile = await thumbnailFileHandle.getFile();
      room.thumbnail = URL.createObjectURL(thumbnailFile);
      console.log(`Loaded room thumbnail from ${thumbnailFileName}`);
    }
  } catch (error) {
    console.warn('Could not load room thumbnail:', error);
  }
}

/**
 * Check if room database needs processing and trigger if needed
 * @param {string} roomId - Room ID
 */
async function checkAndProcessRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  try {
    // Initialize database manager
    await room.dbManager.initialize();
    
    // Check if database has files
    const storedFiles = await room.dbManager.getAllFiles();
    
    if (storedFiles.length === 0) {
      console.log(`Database empty for room ${roomId}, starting background processing`);
      // Database is empty, trigger background processing
      processRoomInBackground(roomId, room.directoryHandle);
    } else {
      console.log(`Database has ${storedFiles.length} files for room ${roomId}, marking as ready`);
      // Database has files, mark as ready
      room.status = 'ready';
      room.statusText = 'Local Folder';
      
      // Load room thumbnail from the first image with a stored thumbnail
      await loadRoomThumbnail(room, storedFiles);
    }
  } catch (error) {
    console.error(`Error checking room database for ${roomId}:`, error);
    room.status = 'error';
    room.statusText = 'Database Error';
  }
}

/**
 * Initialize room service by loading stored rooms from IndexedDB
 * @returns {Promise<void>}
 */
async function initializeRoomService() {
  if (isInitialized.value) return;
  
  try {
    console.log('Initializing room service...');
    const storedRooms = await handlePersistence.getAllStoredRooms();
    
    // Load stored rooms into memory
    for (const storedRoom of storedRooms) {
      // Validate the stored handle
      const validation = await handlePersistence.validateStoredHandle(storedRoom.directoryHandle);
      
      if (validation.isValid) {
        // Handle is still valid, load the room
        const dbManager = new RoomDatabaseManager(storedRoom.id, storedRoom.directoryHandle);
        const roomData = {
          ...storedRoom,
          status: 'loading', // Start as loading to check database
          statusText: 'Checking database...',
          files: [], // Will be populated when room is accessed
          isActive: true,
          dbManager: dbManager // Add database manager
        };
        rooms.set(storedRoom.id, roomData);
        console.log(`Loaded room ${storedRoom.id} from storage`);
        
        // Check if database needs to be populated
        checkAndProcessRoom(storedRoom.id);
      } else if (validation.needsPermission) {
        // Handle needs permission, create room but mark as needing permission
        const dbManager = new RoomDatabaseManager(storedRoom.id, storedRoom.directoryHandle);
        const roomData = {
          ...storedRoom,
          status: 'permission_needed',
          statusText: 'Permission Required',
          files: [],
          isActive: false,
          dbManager: dbManager // Add database manager
        };
        rooms.set(storedRoom.id, roomData);
        console.log(`Room ${storedRoom.id} needs permission`);
      } else {
        // Handle is invalid, remove it
        console.log(`Removing invalid room ${storedRoom.id}`);
        await handlePersistence.removeRoomHandle(storedRoom.id);
      }
    }
    
    console.log(`Room service initialized with ${rooms.size} rooms`);
    isInitialized.value = true;
  } catch (error) {
    console.error('Error initializing room service:', error);
    isInitialized.value = true; // Set to true to prevent retry loops
  }
}

/**
 * Create room metadata object
 * @param {string} id - Room ID
 * @param {string} directoryName - Directory name
 * @param {FileSystemDirectoryHandle} handle - Directory handle
 * @param {Array} files - Array of file metadata
 * @param {Object} stats - Directory statistics
 * @returns {Object} Room metadata object
 */
function createRoomMetadata(id, directoryName, handle, files, stats) {
  return {
    id,
    title: directoryName,
    description: `Local folder: ${directoryName}`,
    thumbnail: null, // Will be set to the first image found
    directoryHandle: handle,
    files: files,
    stats: stats,
    totalSize: stats.formattedTotalSize,
    status: 'active',
    statusText: 'Local Folder',
    dateCreated: new Date().toISOString(),
    lastAccessed: new Date().toISOString(),
    type: 'filesystem',
    // Compatibility with existing room structure
    totalFiles: stats.totalFiles,
    hasVideo: stats.categories.video.count > 0,
    hasImages: stats.categories.image.count > 0,
    hasAudio: stats.categories.audio.count > 0,
    hasDocuments: stats.categories.document.count > 0
  };
}

/**
 * Create a new room from a file system directory
 * @param {Function} progressCallback - Optional progress callback
 * @returns {Promise<Object|null>} Created room object or null if canceled
 */
export async function createRoomFromDirectory(progressCallback = null) {
  try {
    isLoading.value = true;
    error.value = null;

    if (progressCallback) {
      progressCallback({
        type: 'directory_picker',
        message: 'Opening directory picker...'
      });
    }

    // Show directory picker
    const directoryHandle = await pickDirectory();
    
    if (!directoryHandle) {
      // User canceled
      console.log('User canceled directory picker or picker returned null');
      isLoading.value = false;
      return null;
    }
    
    console.log('Directory selected:', directoryHandle.name);

    // Create room immediately with loading state
    const roomId = generateRoomId(directoryHandle.name);
    
    // Initialize room database manager
    const dbManager = new RoomDatabaseManager(roomId, directoryHandle);
    
    const initialRoom = {
      id: roomId,
      title: directoryHandle.name,
      description: `Local folder: ${directoryHandle.name}`,
      thumbnail: null,
      directoryHandle: directoryHandle,
      dbManager: dbManager, // Add database manager
      files: [],
      totalFiles: 0,
      totalSize: '0 B',
      processedFiles: 0,
      dateCreated: new Date().toISOString(),
      status: 'loading', // loading, processing, ready, error
      isActive: true, // Start as active
      hasVideo: false,
      type: 'filesystem',
      loadingMessage: 'Initializing room database...'
    };

    // Store room immediately
    rooms.set(roomId, initialRoom);
    
    // Store handle in IndexedDB for persistence
    try {
      await handlePersistence.storeRoomHandle(initialRoom);
    } catch (error) {
      console.warn('Failed to store room handle in IndexedDB:', error);
    }
    
    isLoading.value = false;

    if (progressCallback) {
      progressCallback({
        type: 'room_created_initial',
        message: `Room "${directoryHandle.name}" created! Starting scan...`,
        room: initialRoom
      });
    }

    // Start background processing
    processRoomInBackground(roomId, directoryHandle, progressCallback);

    return initialRoom;

  } catch (err) {
    console.error('Error creating room from directory:', err);
    error.value = err.message;
    isLoading.value = false;
    
    if (progressCallback) {
      progressCallback({
        type: 'error',
        message: err.message,
        error: err
      });
    }
    
    throw err;
  }
}

/**
 * Process room files in the background
 * @param {string} roomId - Room ID
 * @param {FileSystemDirectoryHandle} directoryHandle - Directory handle
 * @param {Function} progressCallback - Progress callback
 */
async function processRoomInBackground(roomId, directoryHandle, progressCallback = null) {
  console.log('Starting background processing for room:', roomId);
  
  try {
    const room = rooms.get(roomId);
    if (!room) {
      console.error('Room not found in rooms map:', roomId);
      return;
    }

    // Initialize room database first
    room.loadingMessage = 'Initializing room database...';
    await room.dbManager.initialize();
    
    // Initialize room metadata in database
    await room.dbManager.initializeRoomMetadata(room);

    // Update room status
    room.status = 'scanning';
    room.loadingMessage = 'Scanning directory...';
    console.log('Room status updated to scanning');

    if (progressCallback) {
      progressCallback({
        type: 'scanning_start',
        message: `Scanning directory: ${directoryHandle.name}`,
        directory: directoryHandle.name
      });
    }

    // Scan directory for files
    const files = await scanDirectory(directoryHandle, (scanProgress) => {
      // Update room with scan progress
      room.totalFiles = scanProgress.totalFound;
      room.loadingMessage = `Found ${scanProgress.totalFound} files...`;
      
      if (progressCallback) {
        progressCallback({
          type: 'scanning_progress',
          ...scanProgress,
          message: `Found ${scanProgress.totalFound} files...`
        });
      }
    });

    if (files.length === 0) {
      room.status = 'error';
      room.loadingMessage = 'No supported media files found';
      throw new Error('No supported media files found in the selected directory.');
    }

    // Calculate statistics
    const stats = calculateDirectoryStats(files);
    room.totalSize = formatFileSize(stats.totalSize);
    room.totalFiles = files.length;
    room.status = 'processing';
    room.loadingMessage = 'Processing media files...';
    
    if (progressCallback) {
      progressCallback({
        type: 'processing_thumbnails',
        message: 'Processing thumbnails and metadata...',
        totalFiles: files.length
      });
    }

    // Process media files (generate thumbnails, etc.)
    const processedFiles = await processMediaFiles(files, async (progress) => {
      // Update room with processing progress
      room.processedFiles = progress.processed || 0;
      room.loadingMessage = `Processing thumbnails... ${progress.progress || 0}%`;
      
      // Store processed file in database (regardless of thumbnail success)
      if (progress.file) {
        try {
          if (progress.file.thumbnail) {
            // Store thumbnail in .room/thumbnails/ folder if generation succeeded
            const thumbnailBlob = await fetch(progress.file.thumbnail).then(r => r.blob());
            const thumbnailPath = await room.dbManager.storeThumbnail(progress.file.id, thumbnailBlob);
            progress.file.thumbnailPath = thumbnailPath;
            console.log(`Successfully stored thumbnail for ${progress.file.name}: ${thumbnailPath}`);
          } else {
            console.log(`No thumbnail generated for ${progress.file.name}, storing file without thumbnail`);
          }
          
          // Always store file metadata (with or without thumbnail)
          progress.file.analysisComplete = true;
          await room.dbManager.storeFileMetadata(progress.file);
          
        } catch (error) {
          console.error('Error storing file data:', error);
          progress.file.processingError = error.message;
          // Still try to store the file even if there was an error
          try {
            await room.dbManager.storeFileMetadata(progress.file);
          } catch (dbError) {
            console.error('Failed to store file metadata after error:', dbError);
          }
        }
      }
      
      if (progressCallback) {
        progressCallback({
          type: 'thumbnail_progress',
          ...progress
        });
      }
    });

    // Update room with final data
    room.files = processedFiles;
    room.hasVideo = processedFiles.some(file => file.category === 'video');
    room.hasImages = processedFiles.some(file => file.category === 'image');
    room.hasAudio = processedFiles.some(file => file.category === 'audio');
    room.hasDocuments = processedFiles.some(file => file.category === 'document');
    room.status = 'ready';
    room.loadingMessage = null;

    // Set thumbnail to first image found
    const firstImage = processedFiles.find(file => 
      file.category === 'image' && file.thumbnail && !file.placeholder
    );
    if (firstImage) {
      room.thumbnail = firstImage.thumbnail;
    }

    // Update room statistics in database
    const finalStats = calculateDirectoryStats(processedFiles);
    await room.dbManager.updateRoomStats({
      totalFiles: finalStats.totalFiles,
      totalSize: finalStats.totalSize,
      hasVideo: room.hasVideo,
      hasImages: room.hasImages,
      hasAudio: room.hasAudio,
      hasDocuments: room.hasDocuments
    });

    // Store files that weren't processed during the loop
    for (const file of processedFiles) {
      if (!file.analysisComplete) {
        await room.dbManager.storeFileMetadata({
          ...file,
          analysisComplete: true
        });
      }
    }

    // Update stored room handle for IndexedDB persistence  
    try {
      await handlePersistence.storeRoomHandle(room);
    } catch (error) {
      console.warn('Failed to update stored room handle:', error);
    }

    if (progressCallback) {
      progressCallback({
        type: 'room_completed',
        message: `Room "${directoryHandle.name}" ready! ${processedFiles.length} files processed.`,
        room: room
      });
    }

  } catch (err) {
    console.error('Error processing room in background:', err);
    const room = rooms.get(roomId);
    if (room) {
      room.status = 'error';
      room.loadingMessage = err.message;
    }
    
    if (progressCallback) {
      progressCallback({
        type: 'error',
        message: error.message,
        error: err
      });
    }
  }
}

/**
 * Get all rooms
 * @returns {Array} Array of room objects
 */
export function getAllRooms() {
  // Initialize if not done already
  if (!isInitialized.value) {
    initializeRoomService();
  }
  
  return Array.from(rooms.values()).sort((a, b) => 
    new Date(b.dateCreated) - new Date(a.dateCreated)
  );
}

/**
 * Get room by ID
 * @param {string} roomId - Room ID
 * @returns {Object|null} Room object or null if not found
 */
export function getRoom(roomId) {
  return rooms.get(roomId) || null;
}

/**
 * Get live files from filesystem with database metadata
 * @param {string} roomId - Room ID
 * @returns {Promise<Array>} Array of file objects with metadata
 */
export async function getLiveRoomFiles(roomId) {
  const room = rooms.get(roomId);
  if (!room || !room.directoryHandle) {
    return [];
  }

  try {
    // Get stored metadata from database first (faster)
    let storedFiles = [];
    if (room.dbManager) {
      try {
        // Initialize database manager if not already done
        if (!room.dbManager.isInitialized) {
          await room.dbManager.initialize();
        }
        storedFiles = await room.dbManager.getAllFiles();
        console.log(`Found ${storedFiles.length} stored files in database for room ${roomId}`);
      } catch (error) {
        console.warn('Could not load stored file metadata:', error);
      }
    }
    
    // If we have stored files, use them as primary source (much faster)
    if (storedFiles.length > 0) {
      // Get file handles by navigating the directory structure
      const fileHandleMap = new Map();
      
      // Recursively traverse directory to get file handles
      const traverseDirectory = async (dirHandle, currentPath = '') => {
        for await (const [name, handle] of dirHandle.entries()) {
          const fullPath = currentPath ? `${currentPath}/${name}` : name;
          
          if (handle.kind === 'file') {
            fileHandleMap.set(fullPath, handle);
          } else if (handle.kind === 'directory') {
            await traverseDirectory(handle, fullPath);
          }
        }
      };
      
      try {
        await traverseDirectory(room.directoryHandle);
      } catch (error) {
        console.warn('Could not traverse directory for file handles:', error);
      }
      
      return await Promise.all(storedFiles.map(async (storedFile) => {
        let thumbnailUrl = null;
        
        // Load stored thumbnail if available
        if (storedFile.thumbnailPath && room.dbManager) {
          try {
            if (room.dbManager.roomFolderHandle) {
              const thumbnailsHandle = await room.dbManager.roomFolderHandle.getDirectoryHandle('thumbnails');
              const thumbnailFileName = storedFile.thumbnailPath.split('/').pop();
              const thumbnailFileHandle = await thumbnailsHandle.getFileHandle(thumbnailFileName);
              const thumbnailFile = await thumbnailFileHandle.getFile();
              thumbnailUrl = URL.createObjectURL(thumbnailFile);
            }
          } catch (error) {
            console.warn(`Could not load stored thumbnail for ${storedFile.name}:`, error);
          }
        }
        
        // Get the file handle for this stored file
        const filePath = storedFile.fullPath || storedFile.name;
        const fileHandle = fileHandleMap.get(filePath);
        
        return {
          ...storedFile,
          thumbnail: thumbnailUrl,
          handle: fileHandle, // Add the file handle for video playback
          isOnline: !!fileHandle, // File is online if we have a handle
          isOffline: !fileHandle
        };
      }));
    }
    
    // Fallback to filesystem scan only if no stored files (first time load)
    console.log(`No stored files found, scanning filesystem for room ${roomId}`);
    const liveFiles = await scanDirectory(room.directoryHandle);
    
    // Create a map of stored files by file path for quick lookup
    const storedFileMap = new Map();
    storedFiles.forEach(file => {
      const key = file.fullPath || file.name;
      storedFileMap.set(key, file);
    });
    
    // Merge live files with stored metadata
    const mergedFiles = await Promise.all(liveFiles.map(async (liveFile) => {
      const key = liveFile.fullPath || liveFile.name;
      const storedData = storedFileMap.get(key);
      
      let thumbnailUrl = liveFile.thumbnail; // Use generated thumbnail if available
      
      // If we have a stored thumbnail path, load it from the .room folder
      if (storedData?.thumbnailPath && room.dbManager) {
        try {
          // Initialize database manager if not already done
          if (!room.dbManager.isInitialized) {
            await room.dbManager.initialize();
          }
          
          if (room.dbManager.roomFolderHandle) {
            const thumbnailsHandle = await room.dbManager.roomFolderHandle.getDirectoryHandle('thumbnails');
            const thumbnailFileName = storedData.thumbnailPath.split('/').pop(); // Get filename from path
            const thumbnailFileHandle = await thumbnailsHandle.getFileHandle(thumbnailFileName);
            const thumbnailFile = await thumbnailFileHandle.getFile();
            thumbnailUrl = URL.createObjectURL(thumbnailFile);
            console.log(`Loaded thumbnail for ${key}: ${thumbnailUrl}`);
          }
        } catch (error) {
          console.warn(`Could not load stored thumbnail for ${key}:`, error);
          // Keep the original thumbnail if stored one fails to load
        }
      }
      
      return {
        ...liveFile,
        // Merge stored metadata if available
        ...(storedData && {
          thumbnailPath: storedData.thumbnailPath,
          duration: storedData.duration,
          width: storedData.width,
          height: storedData.height,
          metadata: storedData.metadata,
          analysisComplete: storedData.analysisComplete
        }),
        thumbnail: thumbnailUrl, // Use loaded thumbnail URL
        isOnline: true // File exists in filesystem
      };
    }));
    
    // Add offline files (in database but not in filesystem)
    const liveFileSet = new Set(liveFiles.map(f => f.fullPath || f.name));
    const offlineFiles = await Promise.all(
      storedFiles
        .filter(storedFile => {
          const key = storedFile.fullPath || storedFile.name;
          return !liveFileSet.has(key);
        })
        .map(async (offlineFile) => {
          let thumbnailUrl = null;
          
          // Load stored thumbnail for offline files
          if (offlineFile.thumbnailPath && room.dbManager) {
            try {
              // Initialize database manager if not already done
              if (!room.dbManager.isInitialized) {
                await room.dbManager.initialize();
              }
              
              if (room.dbManager.roomFolderHandle) {
                const thumbnailsHandle = await room.dbManager.roomFolderHandle.getDirectoryHandle('thumbnails');
                const thumbnailFileName = offlineFile.thumbnailPath.split('/').pop();
                const thumbnailFileHandle = await thumbnailsHandle.getFileHandle(thumbnailFileName);
                const thumbnailFile = await thumbnailFileHandle.getFile();
                thumbnailUrl = URL.createObjectURL(thumbnailFile);
                console.log(`Loaded thumbnail for offline file ${offlineFile.name}: ${thumbnailUrl}`);
              }
            } catch (error) {
              console.warn(`Could not load stored thumbnail for offline file ${offlineFile.name}:`, error);
            }
          }
          
          return {
            ...offlineFile,
            thumbnail: thumbnailUrl,
            isOnline: false, // File missing from filesystem
            isOffline: true
          };
        })
    );
    
    return [...mergedFiles, ...offlineFiles];
    
  } catch (error) {
    console.error('Error getting live room files:', error);
    // Fallback to stored files only
    if (room.dbManager && room.dbManager.isInitialized) {
      try {
        const storedFiles = await room.dbManager.getAllFiles();
        return await Promise.all(storedFiles.map(async (file) => {
          let thumbnailUrl = null;
          
          // Load stored thumbnail for fallback files
          if (file.thumbnailPath && room.dbManager) {
            try {
              // Initialize database manager if not already done
              if (!room.dbManager.isInitialized) {
                await room.dbManager.initialize();
              }
              
              if (room.dbManager.roomFolderHandle) {
                const thumbnailsHandle = await room.dbManager.roomFolderHandle.getDirectoryHandle('thumbnails');
                const thumbnailFileName = file.thumbnailPath.split('/').pop();
                const thumbnailFileHandle = await thumbnailsHandle.getFileHandle(thumbnailFileName);
                const thumbnailFile = await thumbnailFileHandle.getFile();
                thumbnailUrl = URL.createObjectURL(thumbnailFile);
                console.log(`Loaded thumbnail for fallback file ${file.name}: ${thumbnailUrl}`);
              }
            } catch (error) {
              console.warn(`Could not load stored thumbnail for fallback file ${file.name}:`, error);
            }
          }
          
          return {
            ...file,
            thumbnail: thumbnailUrl,
            isOnline: false,
            isOffline: true
          };
        }));
      } catch (dbError) {
        console.error('Error loading stored files as fallback:', dbError);
      }
    }
    return [];
  }
}

/**
 * Get room files by ID (legacy function - now uses live files)
 * @param {string} roomId - Room ID
 * @returns {Promise<Array>} Array of file objects
 */
export async function getRoomFiles(roomId) {
  return await getLiveRoomFiles(roomId);
}

/**
 * Get specific file from room
 * @param {string} roomId - Room ID
 * @param {string} fileId - File ID
 * @returns {Object|null} File object or null if not found
 */
export function getRoomFile(roomId, fileId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  
  return room.files.find(file => file.id === fileId) || null;
}

/**
 * Update room's last accessed time
 * @param {string} roomId - Room ID
 */
export function updateRoomAccess(roomId) {
  const room = rooms.get(roomId);
  if (room) {
    room.lastAccessed = new Date().toISOString();
    // Also update in IndexedDB
    handlePersistence.updateRoomAccess(roomId).catch(error => 
      console.warn('Failed to update room access in storage:', error)
    );
  }
}

/**
 * Request permission for a room that needs it
 * @param {string} roomId - Room ID
 * @returns {Promise<boolean>} True if permission granted
 */
export async function requestRoomPermission(roomId) {
  const room = rooms.get(roomId);
  if (!room || !room.directoryHandle) {
    return false;
  }

  try {
    const granted = await handlePersistence.requestStoredHandlePermission(room.directoryHandle);
    
    if (granted) {
      // Update room status
      room.status = 'ready';
      room.statusText = 'Local Folder';
      room.isActive = true;
      
      // Update stored room
      await handlePersistence.storeRoomHandle(room);
      
      console.log(`Permission granted for room ${roomId}`);
      return true;
    } else {
      console.log(`Permission denied for room ${roomId}`);
      return false;
    }
  } catch (error) {
    console.error(`Error requesting permission for room ${roomId}:`, error);
    return false;
  }
}

/**
 * Validate and refresh room access
 * @param {string} roomId - Room ID
 * @returns {Promise<boolean>} True if room is still accessible
 */
export async function validateRoomAccess(roomId) {
  const room = rooms.get(roomId);
  if (!room || !room.directoryHandle) {
    return false;
  }

  try {
    const isValid = await validateDirectoryHandle(room.directoryHandle);
    if (!isValid) {
      // Mark room as inaccessible
      room.status = 'inaccessible';
      room.statusText = 'Access Denied';
    } else {
      room.status = 'active';
      room.statusText = 'Local Folder';
      updateRoomAccess(roomId);
    }
    
    return isValid;
  } catch (error) {
    console.warn(`Failed to validate room access for ${roomId}:`, error);
    room.status = 'error';
    room.statusText = 'Access Error';
    return false;
  }
}

/**
 * Set room active/inactive status
 * @param {string} roomId - Room ID
 * @param {boolean} isActive - Active status
 * @returns {Promise<boolean>} True if successful
 */
export async function setRoomActiveStatus(roomId, isActive) {
  const room = rooms.get(roomId);
  if (!room || !room.dbManager) {
    return false;
  }

  try {
    await room.dbManager.setRoomActiveStatus(isActive);
    room.isActive = isActive;
    room.statusText = isActive ? 'Local Folder' : 'Inactive';
    
    console.log(`Room ${roomId} ${isActive ? 'activated' : 'deactivated'}`);
    return true;
  } catch (error) {
    console.error(`Error setting room active status:`, error);
    return false;
  }
}

/**
 * Get room active status from database
 * @param {string} roomId - Room ID
 * @returns {Promise<boolean>} Active status
 */
export async function getRoomActiveStatus(roomId) {
  const room = rooms.get(roomId);
  if (!room || !room.dbManager) {
    return false;
  }

  try {
    return await room.dbManager.getRoomActiveStatus();
  } catch (error) {
    console.error('Error getting room active status:', error);
    return false;
  }
}

/**
 * Wipe room data and re-index
 * @param {string} roomId - Room ID
 * @param {Function} progressCallback - Optional progress callback
 * @returns {Promise<boolean>} True if successful
 */
export async function wipeAndReindexRoom(roomId, progressCallback = null) {
  let room = rooms.get(roomId);
  
  // If room not found, try to find it by matching any part of the ID
  if (!room) {
    const availableRooms = Array.from(rooms.values());
    room = availableRooms.find(r => r.id.includes(roomId) || roomId.includes(r.id));
  }
  
  if (!room) {
    throw new Error(`Room not found. Available rooms: ${Array.from(rooms.keys()).join(', ')}`);
  }
  
  // Initialize database manager if not present
  if (!room.dbManager) {
    room.dbManager = new RoomDatabaseManager(room.id, room.directoryHandle);
  }

  try {
    if (progressCallback) {
      progressCallback({
        type: 'wipe_start',
        message: `Wiping room data for ${room.title}...`
      });
    }

    // Wipe database and thumbnails
    await room.dbManager.wipeAndReindex();
    
    // Reset room state
    room.files = [];
    room.totalFiles = 0;
    room.totalSize = '0 B';
    room.hasVideo = false;
    room.hasImages = false;
    room.hasAudio = false;
    room.hasDocuments = false;
    room.thumbnail = null;
    room.status = 'ready';

    if (progressCallback) {
      progressCallback({
        type: 'wipe_complete',
        message: `Room ${room.title} wiped successfully. Ready for re-indexing.`
      });
    }

    // Trigger re-indexing by calling background processing again
    processRoomInBackground(room.id, room.directoryHandle, progressCallback);

    return true;
  } catch (error) {
    console.error('Error wiping and re-indexing room:', error);
    if (progressCallback) {
      progressCallback({
        type: 'error',
        message: `Failed to wipe room: ${error.message}`
      });
    }
    throw error;
  }
}

/**
 * Delete a room
 * @param {string} roomId - Room ID
 * @returns {Promise<boolean>} True if room was deleted
 */
export async function deleteRoom(roomId) {
  const room = rooms.get(roomId);
  
  // Close database connection if exists
  if (room && room.dbManager) {
    room.dbManager.close();
  }
  
  const success = rooms.delete(roomId);
  
  if (success) {
    // Also remove from IndexedDB
    try {
      await handlePersistence.removeRoomHandle(roomId);
    } catch (error) {
      console.warn('Failed to remove room from storage:', error);
    }
  }
  
  return success;
}

// Keep the sync version for compatibility
export function removeRoom(roomId) {
  return deleteRoom(roomId);
}

/**
 * Refresh room contents (rescan directory)
 * @param {string} roomId - Room ID
 * @param {Function} progressCallback - Optional progress callback
 * @returns {Promise<boolean>} True if refresh was successful
 */
export async function refreshRoom(roomId, progressCallback = null) {
  try {
    const room = rooms.get(roomId);
    if (!room || !room.directoryHandle) {
      throw new Error('Room not found or no directory handle');
    }

    // Validate access first
    const hasAccess = await validateRoomAccess(roomId);
    if (!hasAccess) {
      throw new Error('Cannot access room directory');
    }

    if (progressCallback) {
      progressCallback({
        type: 'refresh_start',
        message: `Refreshing room: ${room.title}`
      });
    }

    // Rescan directory
    const files = await scanDirectory(room.directoryHandle, (scanProgress) => {
      if (progressCallback) {
        progressCallback({
          type: 'scanning_progress',
          ...scanProgress
        });
      }
    });

    // Process files
    const processedFiles = await processMediaFiles(files, (processProgress) => {
      if (progressCallback) {
        progressCallback({
          type: 'thumbnail_progress',
          ...processProgress
        });
      }
    });

    // Update room data
    const stats = calculateDirectoryStats(processedFiles);
    room.files = processedFiles;
    room.stats = stats;
    room.totalSize = stats.formattedTotalSize;
    room.totalFiles = stats.totalFiles;
    room.lastAccessed = new Date().toISOString();

    // Update flags
    room.hasVideo = stats.categories.video.count > 0;
    room.hasImages = stats.categories.image.count > 0;
    room.hasAudio = stats.categories.audio.count > 0;
    room.hasDocuments = stats.categories.document.count > 0;

    // Update thumbnail if needed
    const firstImage = processedFiles.find(file => 
      file.category === 'image' && file.thumbnail && !file.placeholder
    );
    if (firstImage) {
      room.thumbnail = firstImage.thumbnail;
    }

    if (progressCallback) {
      progressCallback({
        type: 'refresh_complete',
        message: `Room refreshed: ${processedFiles.length} files found`
      });
    }

    return true;

  } catch (error) {
    console.error('Error refreshing room:', error);
    
    if (progressCallback) {
      progressCallback({
        type: 'error',
        message: error.message,
        error: err
      });
    }
    
    return false;
  }
}

/**
 * Get file content as blob
 * @param {string} roomId - Room ID
 * @param {string} fileId - File ID
 * @returns {Promise<Blob>} File blob
 */
export async function getFileBlob(roomId, fileId) {
  const file = getRoomFile(roomId, fileId);
  if (!file || !file.handle) {
    throw new Error('File not found');
  }

  try {
    return await file.handle.getFile();
  } catch (error) {
    throw new Error(`Failed to access file: ${error.message}`);
  }
}

/**
 * Create object URL for file
 * @param {string} roomId - Room ID
 * @param {string} fileId - File ID
 * @returns {Promise<string>} Object URL
 */
export async function getFileUrl(roomId, fileId) {
  const blob = await getFileBlob(roomId, fileId);
  return URL.createObjectURL(blob);
}

// Computed properties for reactive state
export const roomState = {
  rooms: computed(() => getAllRooms()),
  isLoading: computed(() => isLoading.value),
  error: computed(() => error.value),
  activeRoom: computed(() => activeRoom.value),
  totalRooms: computed(() => rooms.size)
};

// Room service object with all functions
export const roomService = {
  createRoomFromDirectory,
  getAllRooms,
  getRoom,
  getRoomFiles,
  getLiveRoomFiles,
  getRoomFile,
  updateRoomAccess,
  validateRoomAccess,
  requestRoomPermission,
  setRoomActiveStatus,
  getRoomActiveStatus,
  wipeAndReindexRoom,
  deleteRoom,
  removeRoom,
  refreshRoom,
  getFileBlob,
  getFileUrl,
  initializeRoomService,
  state: roomState
};

export default roomService;