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

// Global reactive state
const rooms = reactive(new Map());
const activeRoom = ref(null);
const isLoading = ref(false);
const error = ref(null);

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
    const initialRoom = {
      id: roomId,
      title: directoryHandle.name,
      description: `Local folder: ${directoryHandle.name}`,
      thumbnail: null,
      directoryHandle: directoryHandle,
      files: [],
      totalFiles: 0,
      totalSize: '0 B',
      processedFiles: 0,
      dateCreated: new Date().toISOString(),
      status: 'loading', // loading, processing, ready, error
      isActive: true,
      hasVideo: false,
      type: 'filesystem',
      loadingMessage: 'Scanning directory...'
    };

    // Store room immediately
    rooms.set(roomId, initialRoom);
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
    const processedFiles = await processMediaFiles(files, (progress) => {
      // Update room with processing progress
      room.processedFiles = progress.processed || 0;
      room.loadingMessage = `Processing thumbnails... ${progress.progress || 0}%`;
      
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
    room.status = 'ready';
    room.loadingMessage = null;

    // Set thumbnail to first image found
    const firstImage = processedFiles.find(file => 
      file.category === 'image' && file.thumbnail && !file.placeholder
    );
    if (firstImage) {
      room.thumbnail = firstImage.thumbnail;
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
 * Get room files by ID
 * @param {string} roomId - Room ID
 * @returns {Array} Array of file objects
 */
export function getRoomFiles(roomId) {
  const room = rooms.get(roomId);
  return room ? room.files : [];
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
 * Delete a room
 * @param {string} roomId - Room ID
 * @returns {boolean} True if room was deleted
 */
export function deleteRoom(roomId) {
  return rooms.delete(roomId);
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
  getRoomFile,
  updateRoomAccess,
  validateRoomAccess,
  deleteRoom,
  refreshRoom,
  getFileBlob,
  getFileUrl,
  state: roomState
};

export default roomService;