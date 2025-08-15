/**
 * Handle Persistence Service
 * Manages storage and retrieval of FileSystem handles using IndexedDB
 * Enables URL sharing by persisting directory access across browser sessions
 */

const DB_NAME = 'CreativeSpaceHandles';
const DB_VERSION = 1;
const ROOMS_STORE = 'rooms';

/**
 * Initialize IndexedDB database
 * @returns {Promise<IDBDatabase>} Database instance
 */
async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(new Error(`Failed to open IndexedDB: ${request.error}`));
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create rooms store if it doesn't exist
      if (!db.objectStoreNames.contains(ROOMS_STORE)) {
        const roomsStore = db.createObjectStore(ROOMS_STORE, { keyPath: 'id' });
        roomsStore.createIndex('dateCreated', 'dateCreated', { unique: false });
        roomsStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
      }
    };
  });
}

/**
 * Store room data with directory handle in IndexedDB
 * @param {Object} roomData - Room data object
 * @returns {Promise<void>}
 */
export async function storeRoomHandle(roomData) {
  try {
    const db = await initDB();
    const transaction = db.transaction([ROOMS_STORE], 'readwrite');
    const store = transaction.objectStore(ROOMS_STORE);
    
    // Create persistence data (excluding reactive properties and large data)
    const persistenceData = {
      id: roomData.id,
      title: roomData.title,
      description: roomData.description,
      directoryHandle: roomData.directoryHandle, // This is the key - persisting the actual handle
      dateCreated: roomData.dateCreated,
      lastAccessed: roomData.lastAccessed || new Date().toISOString(),
      type: 'filesystem',
      // Store metadata but not the full file array to save space
      totalFiles: roomData.totalFiles || 0,
      totalSize: roomData.totalSize || '0 B',
      hasVideo: roomData.hasVideo || false,
      hasImages: roomData.hasImages || false,
      hasAudio: roomData.hasAudio || false,
      hasDocuments: roomData.hasDocuments || false,
      status: 'stored' // Mark as stored in IndexedDB
    };
    
    await new Promise((resolve, reject) => {
      const request = store.put(persistenceData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to store room: ${request.error}`));
    });
    
    console.log(`Room ${roomData.id} stored in IndexedDB`);
  } catch (error) {
    console.error('Error storing room handle:', error);
    throw error;
  }
}

/**
 * Retrieve room data with directory handle from IndexedDB
 * @param {string} roomId - Room ID
 * @returns {Promise<Object|null>} Room data or null if not found
 */
export async function retrieveRoomHandle(roomId) {
  try {
    const db = await initDB();
    const transaction = db.transaction([ROOMS_STORE], 'readonly');
    const store = transaction.objectStore(ROOMS_STORE);
    
    const roomData = await new Promise((resolve, reject) => {
      const request = store.get(roomId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to retrieve room: ${request.error}`));
    });
    
    if (roomData) {
      console.log(`Room ${roomId} retrieved from IndexedDB`);
      return roomData;
    }
    
    return null;
  } catch (error) {
    console.error('Error retrieving room handle:', error);
    return null;
  }
}

/**
 * Get all stored room handles from IndexedDB
 * @returns {Promise<Array>} Array of room data objects
 */
export async function getAllStoredRooms() {
  try {
    const db = await initDB();
    const transaction = db.transaction([ROOMS_STORE], 'readonly');
    const store = transaction.objectStore(ROOMS_STORE);
    
    const rooms = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to get all rooms: ${request.error}`));
    });
    
    console.log(`Retrieved ${rooms.length} rooms from IndexedDB`);
    return rooms.sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed));
  } catch (error) {
    console.error('Error getting all stored rooms:', error);
    return [];
  }
}

/**
 * Remove room handle from IndexedDB
 * @param {string} roomId - Room ID
 * @returns {Promise<boolean>} True if successfully removed
 */
export async function removeRoomHandle(roomId) {
  try {
    const db = await initDB();
    const transaction = db.transaction([ROOMS_STORE], 'readwrite');
    const store = transaction.objectStore(ROOMS_STORE);
    
    await new Promise((resolve, reject) => {
      const request = store.delete(roomId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to remove room: ${request.error}`));
    });
    
    console.log(`Room ${roomId} removed from IndexedDB`);
    return true;
  } catch (error) {
    console.error('Error removing room handle:', error);
    return false;
  }
}

/**
 * Update room's last accessed time in IndexedDB
 * @param {string} roomId - Room ID
 * @returns {Promise<void>}
 */
export async function updateRoomAccess(roomId) {
  try {
    const roomData = await retrieveRoomHandle(roomId);
    if (roomData) {
      roomData.lastAccessed = new Date().toISOString();
      await storeRoomHandle(roomData);
    }
  } catch (error) {
    console.error('Error updating room access:', error);
  }
}

/**
 * Validate that a stored directory handle still has permission and is accessible
 * @param {FileSystemDirectoryHandle} handle - Directory handle
 * @returns {Promise<{isValid: boolean, needsPermission: boolean, error?: string}>}
 */
export async function validateStoredHandle(handle) {
  try {
    if (!handle || !(handle instanceof FileSystemDirectoryHandle)) {
      return { isValid: false, needsPermission: false, error: 'Invalid handle' };
    }
    
    // Check current permission status
    const permission = await handle.queryPermission({ mode: 'read' });
    
    if (permission === 'granted') {
      // Test actual access
      try {
        const entries = handle.entries();
        await entries.next(); // Try to read the first entry
        return { isValid: true, needsPermission: false };
      } catch (error) {
        return { isValid: false, needsPermission: true, error: 'Access denied' };
      }
    } else if (permission === 'prompt') {
      return { isValid: false, needsPermission: true, error: 'Permission needed' };
    } else {
      return { isValid: false, needsPermission: true, error: 'Permission denied' };
    }
  } catch (error) {
    return { isValid: false, needsPermission: true, error: error.message };
  }
}

/**
 * Request permission for a stored directory handle
 * @param {FileSystemDirectoryHandle} handle - Directory handle
 * @returns {Promise<boolean>} True if permission granted
 */
export async function requestStoredHandlePermission(handle) {
  try {
    if (!handle || !(handle instanceof FileSystemDirectoryHandle)) {
      return false;
    }
    
    const permission = await handle.requestPermission({ mode: 'read' });
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting handle permission:', error);
    return false;
  }
}

/**
 * Clean up invalid or inaccessible room handles from storage
 * @returns {Promise<Array>} Array of cleaned room IDs
 */
export async function cleanupInvalidHandles() {
  try {
    const storedRooms = await getAllStoredRooms();
    const invalidRooms = [];
    
    for (const room of storedRooms) {
      const validation = await validateStoredHandle(room.directoryHandle);
      if (!validation.isValid && !validation.needsPermission) {
        // Handle is completely invalid, remove it
        await removeRoomHandle(room.id);
        invalidRooms.push(room.id);
        console.log(`Removed invalid room: ${room.id}`);
      }
    }
    
    return invalidRooms;
  } catch (error) {
    console.error('Error cleaning up invalid handles:', error);
    return [];
  }
}

/**
 * Export all handle persistence functions
 */
export const handlePersistence = {
  storeRoomHandle,
  retrieveRoomHandle,
  getAllStoredRooms,
  removeRoomHandle,
  updateRoomAccess,
  validateStoredHandle,
  requestStoredHandlePermission,
  cleanupInvalidHandles
};

export default handlePersistence;