/**
 * Folder Role Persistence Service
 * Handles saving and loading folder role assignments to localStorage
 */

const STORAGE_KEY_PREFIX = 'room-folder-roles-';

export class FolderRolePersistenceService {
  
  /**
   * Save folder role assignments for a room
   * @param {string} roomId - Room identifier
   * @param {Object} folderRoles - Folder role assignments
   */
  saveFolderRoles(roomId, folderRoles) {
    try {
      const storageKey = `${STORAGE_KEY_PREFIX}${roomId}`;
      const serialized = this.serializeFolderRoles(folderRoles);
      localStorage.setItem(storageKey, JSON.stringify({
        roomId,
        folderRoles: serialized,
        savedAt: new Date().toISOString(),
        version: '1.0'
      }));
      console.log(`Folder roles saved for room ${roomId}:`, serialized);
      return true;
    } catch (error) {
      console.error('Error saving folder roles:', error);
      return false;
    }
  }
  
  /**
   * Load folder role assignments for a room
   * @param {string} roomId - Room identifier
   * @returns {Object|null} Folder role assignments or null if not found
   */
  loadFolderRoles(roomId) {
    try {
      const storageKey = `${STORAGE_KEY_PREFIX}${roomId}`;
      const stored = localStorage.getItem(storageKey);
      
      if (!stored) {
        console.log(`No stored folder roles found for room ${roomId}`);
        return null;
      }
      
      const data = JSON.parse(stored);
      const folderRoles = this.deserializeFolderRoles(data.folderRoles);
      
      console.log(`Folder roles loaded for room ${roomId}:`, folderRoles);
      return folderRoles;
    } catch (error) {
      console.error('Error loading folder roles:', error);
      return null;
    }
  }
  
  /**
   * Get all saved folder roles
   * @returns {Array} Array of room folder role data
   */
  getAllFolderRoles() {
    const allRoles = [];
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
          const roomId = key.replace(STORAGE_KEY_PREFIX, '');
          const roles = this.loadFolderRoles(roomId);
          if (roles) {
            allRoles.push({ roomId, roles });
          }
        }
      }
    } catch (error) {
      console.error('Error getting all folder roles:', error);
    }
    
    return allRoles;
  }
  
  /**
   * Delete folder role assignments for a room
   * @param {string} roomId - Room identifier
   */
  deleteFolderRoles(roomId) {
    try {
      const storageKey = `${STORAGE_KEY_PREFIX}${roomId}`;
      localStorage.removeItem(storageKey);
      console.log(`Folder roles deleted for room ${roomId}`);
      return true;
    } catch (error) {
      console.error('Error deleting folder roles:', error);
      return false;
    }
  }
  
  /**
   * Apply folder roles to directory tree
   * @param {Array} directoryTree - Directory tree nodes
   * @param {Object} folderRoles - Saved folder roles
   * @returns {Array} Directory tree with applied roles
   */
  applyFolderRolesToTree(directoryTree, folderRoles) {
    if (!folderRoles) return directoryTree;
    
    const applyToNode = (node) => {
      const roleData = folderRoles[node.path];
      if (roleData) {
        node.assignedRole = roleData.assignedRole;
        node.metadata = { ...node.metadata, ...roleData.metadata };
        node.lastModified = roleData.lastModified;
      }
      
      if (node.children && node.children.length > 0) {
        node.children = node.children.map(applyToNode);
      }
      
      return node;
    };
    
    return directoryTree.map(applyToNode);
  }
  
  /**
   * Extract folder roles from directory tree
   * @param {Array} directoryTree - Directory tree nodes
   * @returns {Object} Folder roles keyed by path
   */
  extractFolderRolesFromTree(directoryTree) {
    const folderRoles = {};
    
    const extractFromNode = (node) => {
      if (node.assignedRole) {
        folderRoles[node.path] = {
          path: node.path,
          name: node.name,
          assignedRole: node.assignedRole,
          metadata: node.metadata || {},
          lastModified: new Date().toISOString()
        };
      }
      
      if (node.children && node.children.length > 0) {
        node.children.forEach(extractFromNode);
      }
    };
    
    directoryTree.forEach(extractFromNode);
    return folderRoles;
  }
  
  /**
   * Serialize folder roles for storage
   * @private
   */
  serializeFolderRoles(folderRoles) {
    const serialized = {};
    
    for (const [path, roleData] of Object.entries(folderRoles)) {
      serialized[path] = {
        path: roleData.path,
        name: roleData.name,
        assignedRole: roleData.assignedRole,
        metadata: roleData.metadata || {},
        lastModified: roleData.lastModified || new Date().toISOString()
      };
    }
    
    return serialized;
  }
  
  /**
   * Deserialize folder roles from storage
   * @private
   */
  deserializeFolderRoles(serialized) {
    if (!serialized || typeof serialized !== 'object') {
      return {};
    }
    
    const folderRoles = {};
    
    for (const [path, roleData] of Object.entries(serialized)) {
      folderRoles[path] = {
        path: roleData.path,
        name: roleData.name,
        assignedRole: roleData.assignedRole || null,
        metadata: roleData.metadata || {},
        lastModified: roleData.lastModified
      };
    }
    
    return folderRoles;
  }
  
  /**
   * Clear all folder role data (for testing/cleanup)
   */
  clearAll() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`Cleared ${keysToRemove.length} folder role entries`);
      return true;
    } catch (error) {
      console.error('Error clearing folder roles:', error);
      return false;
    }
  }
}

// Export singleton instance
export const folderRolePersistence = new FolderRolePersistenceService();
export default folderRolePersistence;