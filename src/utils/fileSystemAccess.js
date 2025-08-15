/**
 * File System Access API Utilities
 * Provides functions for directory picking, file scanning, and metadata extraction
 * with proper error handling and browser compatibility checks
 */

// Supported file types for different media categories
export const SUPPORTED_FILE_TYPES = {
  images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.tiff', '.ico', '.heic', '.heif', '.psd', '.xcf', '.raw', '.cr2', '.nef', '.arw', '.dng'],
  videos: ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.m4v', '.3gp', '.mxf', '.ts', '.m2ts', '.mts', '.mpg', '.mpeg', '.vob', '.asf', '.f4v', '.swf'],
  professional_video: ['.r3d', '.rdc', '.rdm', '.braw', '.arriraw', '.ari', '.dpx', '.exr', '.cin', '.mxf', '.gxf', '.lxf'],
  audio: ['.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a', '.wma', '.opus', '.aiff', '.au', '.pcm', '.dts', '.ac3', '.amr'],
  documents: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.pages', '.md', '.tex', '.docm', '.dotx'],
  project_files: ['.drp', '.drb', '.drt', '.drx', '.aep', '.prproj', '.fcpxml', '.xml', '.edl', '.omf', '.aaf'],
  archives: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.lzma', '.cab', '.ace', '.arj'],
  data: ['.json', '.xml', '.csv', '.xlsx', '.xls', '.yaml', '.yml', '.toml', '.ini', '.cfg'],
  metadata: ['.xmp', '.iptc', '.exif', '.sidecar', '.thm', '.lut', '.cube', '.3dl', '.ccc', '.cdl'],
  hash_files: ['.mhl', '.md5', '.sha1', '.sha256', '.sha512', '.crc32', '.sfv', '.par2']
};

// All supported extensions flattened
export const ALL_SUPPORTED_EXTENSIONS = Object.values(SUPPORTED_FILE_TYPES).flat();

/**
 * Check if the File System Access API is supported in the current browser
 * @returns {boolean} True if supported, false otherwise
 */
export function isFileSystemAccessSupported() {
  return 'showDirectoryPicker' in window && 
         'FileSystemDirectoryHandle' in window &&
         'FileSystemFileHandle' in window;
}

/**
 * Check if the current page is served over HTTPS or localhost
 * File System Access API requires secure context
 * @returns {boolean} True if secure context, false otherwise
 */
export function isSecureContext() {
  return window.isSecureContext || location.hostname === 'localhost';
}

// Track if a picker is currently active to prevent concurrent requests
let isPickerActive = false;

/**
 * Show directory picker and return directory handle
 * @param {Object} options - Options for the directory picker
 * @returns {Promise<FileSystemDirectoryHandle|null>} Directory handle or null if canceled
 * @throws {Error} If API not supported or permission denied
 */
export async function pickDirectory(options = {}) {
  if (!isFileSystemAccessSupported()) {
    throw new Error('File System Access API is not supported in this browser. Please use Chrome 86+, Edge 86+, or another compatible browser.');
  }

  if (!isSecureContext()) {
    throw new Error('File System Access API requires HTTPS or localhost. Please ensure the page is served over a secure connection.');
  }

  // Prevent multiple concurrent picker requests
  if (isPickerActive) {
    console.warn('Directory picker is already active, ignoring request');
    return null;
  }

  try {
    isPickerActive = true;
    
    const directoryHandle = await window.showDirectoryPicker({
      mode: 'read',
      startIn: 'documents',
      ...options
    });

    return directoryHandle;
  } catch (error) {
    if (error.name === 'AbortError') {
      // User canceled the picker
      return null;
    }
    throw new Error(`Failed to access directory: ${error.message}`);
  } finally {
    isPickerActive = false;
  }
}

/**
 * Get file extension from filename
 * @param {string} filename - The filename to extract extension from
 * @returns {string} The file extension (lowercase, with dot)
 */
export function getFileExtension(filename) {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === 0) return '';
  return filename.substring(lastDotIndex).toLowerCase();
}

/**
 * Determine file category based on extension
 * @param {string} filename - The filename to categorize
 * @returns {string} The file category ('image', 'video', 'professional_video', 'audio', 'document', 'project_files', 'archive', 'data', 'metadata', 'hash_files', 'other')
 */
export function getFileCategory(filename) {
  const extension = getFileExtension(filename);
  
  if (SUPPORTED_FILE_TYPES.images.includes(extension)) return 'image';
  if (SUPPORTED_FILE_TYPES.videos.includes(extension)) return 'video';
  if (SUPPORTED_FILE_TYPES.professional_video.includes(extension)) return 'professional_video';
  if (SUPPORTED_FILE_TYPES.audio.includes(extension)) return 'audio';
  if (SUPPORTED_FILE_TYPES.documents.includes(extension)) return 'document';
  if (SUPPORTED_FILE_TYPES.project_files.includes(extension)) return 'project_files';
  if (SUPPORTED_FILE_TYPES.archives.includes(extension)) return 'archive';
  if (SUPPORTED_FILE_TYPES.data.includes(extension)) return 'data';
  if (SUPPORTED_FILE_TYPES.metadata.includes(extension)) return 'metadata';
  if (SUPPORTED_FILE_TYPES.hash_files.includes(extension)) return 'hash_files';
  
  return 'other';
}

/**
 * Get MIME type for a file based on its extension
 * @param {string} filename - The filename to get MIME type for
 * @returns {string} The MIME type
 */
export function getMimeType(filename) {
  const extension = getFileExtension(filename);
  
  const mimeTypes = {
    // Images
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
    '.tiff': 'image/tiff',
    '.ico': 'image/x-icon',
    '.heic': 'image/heic',
    '.heif': 'image/heif',
    '.psd': 'image/vnd.adobe.photoshop',
    '.xcf': 'image/x-xcf',
    '.raw': 'image/x-canon-crw',
    '.cr2': 'image/x-canon-cr2',
    '.nef': 'image/x-nikon-nef',
    '.arw': 'image/x-sony-arw',
    '.dng': 'image/x-adobe-dng',
    
    // Videos
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.wmv': 'video/x-ms-wmv',
    '.flv': 'video/x-flv',
    '.mkv': 'video/x-matroska',
    '.m4v': 'video/x-m4v',
    '.3gp': 'video/3gpp',
    '.mxf': 'application/mxf',
    '.ts': 'video/mp2t',
    '.m2ts': 'video/mp2t',
    '.mts': 'video/mp2t',
    '.mpg': 'video/mpeg',
    '.mpeg': 'video/mpeg',
    '.vob': 'video/dvd',
    '.asf': 'video/x-ms-asf',
    '.f4v': 'video/x-f4v',
    '.swf': 'application/x-shockwave-flash',
    
    // Professional Video
    '.r3d': 'video/x-red-r3d',
    '.rdc': 'application/x-red-rdc',
    '.rdm': 'application/x-red-rdm',
    '.braw': 'video/x-blackmagic-braw',
    '.arriraw': 'video/x-arri-arriraw',
    '.ari': 'video/x-arri-ari',
    '.dpx': 'image/x-dpx',
    '.exr': 'image/x-exr',
    '.cin': 'image/x-cineon',
    '.gxf': 'application/gxf',
    '.lxf': 'application/lxf',
    
    // Audio
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.aac': 'audio/aac',
    '.flac': 'audio/flac',
    '.m4a': 'audio/mp4',
    '.wma': 'audio/x-ms-wma',
    '.opus': 'audio/opus',
    '.aiff': 'audio/x-aiff',
    '.au': 'audio/basic',
    '.pcm': 'audio/L16',
    '.dts': 'audio/vnd.dts',
    '.ac3': 'audio/ac3',
    '.amr': 'audio/amr',
    
    // Documents
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
    '.rtf': 'application/rtf',
    '.odt': 'application/vnd.oasis.opendocument.text',
    '.pages': 'application/x-iwork-pages-sffpages',
    '.md': 'text/markdown',
    '.tex': 'application/x-tex',
    '.docm': 'application/vnd.ms-word.document.macroEnabled.12',
    '.dotx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
    
    // Project Files
    '.drp': 'application/x-davinci-project',
    '.drb': 'application/x-davinci-bin',
    '.drt': 'application/x-davinci-timeline',
    '.drx': 'application/x-davinci-look',
    '.aep': 'application/x-after-effects-project',
    '.prproj': 'application/x-premiere-project',
    '.fcpxml': 'application/x-finalcut-xml',
    '.edl': 'application/x-edit-decision-list',
    '.omf': 'application/x-omf',
    '.aaf': 'application/x-aaf',
    
    // Archives
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip',
    '.bz2': 'application/x-bzip2',
    '.xz': 'application/x-xz',
    '.lzma': 'application/x-lzma',
    '.cab': 'application/vnd.ms-cab-compressed',
    '.ace': 'application/x-ace-compressed',
    '.arj': 'application/x-arj',
    
    // Data
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.csv': 'text/csv',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.yaml': 'application/x-yaml',
    '.yml': 'application/x-yaml',
    '.toml': 'application/toml',
    '.ini': 'text/plain',
    '.cfg': 'text/plain',
    
    // Metadata
    '.xmp': 'application/rdf+xml',
    '.iptc': 'application/x-iptc',
    '.exif': 'application/x-exif',
    '.sidecar': 'application/x-sidecar',
    '.thm': 'image/jpeg',
    '.lut': 'application/x-lut',
    '.cube': 'application/x-cube-lut',
    '.3dl': 'application/x-3dl-lut',
    '.ccc': 'application/x-ccc',
    '.cdl': 'application/x-cdl',
    
    // Hash Files
    '.mhl': 'application/x-mhl',
    '.md5': 'text/plain',
    '.sha1': 'text/plain',
    '.sha256': 'text/plain',
    '.sha512': 'text/plain',
    '.crc32': 'text/plain',
    '.sfv': 'text/plain',
    '.par2': 'application/x-par2'
  };

  return mimeTypes[extension] || 'application/octet-stream';
}

/**
 * Format file size in human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted file size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Extract file metadata from FileSystemFileHandle
 * @param {FileSystemFileHandle} fileHandle - The file handle
 * @param {string} relativePath - The relative path from the root directory
 * @returns {Promise<Object>} File metadata object
 */
export async function extractFileMetadata(fileHandle, relativePath = '') {
  try {
    const file = await fileHandle.getFile();
    const category = getFileCategory(file.name);
    const extension = getFileExtension(file.name);
    
    const metadata = {
      id: generateFileId(relativePath, file.name),
      name: file.name,
      path: relativePath,
      fullPath: relativePath ? `${relativePath}/${file.name}` : file.name,
      size: file.size,
      formattedSize: formatFileSize(file.size),
      type: file.type || getMimeType(file.name),
      category: category,
      extension: extension,
      lastModified: file.lastModified,
      lastModifiedDate: new Date(file.lastModified),
      formattedDate: new Date(file.lastModified).toLocaleDateString(),
      handle: fileHandle
    };

    // Add category-specific metadata
    if (category === 'image') {
      metadata.filetype = 'image';
      // We'll add image dimensions later when we create thumbnails
    } else if (category === 'video') {
      metadata.filetype = 'video';
      metadata.duration = null; // Will be populated when creating thumbnails
    } else if (category === 'professional_video') {
      metadata.filetype = 'professional_video';
      metadata.duration = null; // Will be populated when creating thumbnails
      metadata.codec = null; // Professional video codec info
      metadata.colorSpace = null; // Color space information
      metadata.frameRate = null; // Frame rate information
    } else if (category === 'audio') {
      metadata.filetype = 'audio';
      metadata.duration = null; // Will be populated when processing audio
    } else if (category === 'document') {
      metadata.filetype = 'document';
    } else if (category === 'project_files') {
      metadata.filetype = 'project_files';
      metadata.projectType = getProjectFileType(extension);
    } else if (category === 'metadata') {
      metadata.filetype = 'metadata';
      metadata.metadataType = getMetadataType(extension);
    } else if (category === 'hash_files') {
      metadata.filetype = 'hash_files';
      metadata.hashType = getHashType(extension);
    } else {
      metadata.filetype = category;
    }

    return metadata;
  } catch (error) {
    console.error('Error extracting file metadata:', error);
    throw new Error(`Failed to extract metadata for ${fileHandle.name}: ${error.message}`);
  }
}

/**
 * Generate a unique ID for a file based on its path and name
 * @param {string} path - The file path
 * @param {string} name - The file name
 * @returns {string} A unique file ID
 */
function generateFileId(path, name) {
  const fullPath = path ? `${path}/${name}` : name;
  // Create a simple hash from the full path
  let hash = 0;
  for (let i = 0; i < fullPath.length; i++) {
    const char = fullPath.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `file_${Math.abs(hash)}_${Date.now()}`;
}

/**
 * Determine project file type based on extension
 * @param {string} extension - The file extension
 * @returns {string} The project file type
 */
function getProjectFileType(extension) {
  const projectTypes = {
    '.drp': 'davinci_project',
    '.drb': 'davinci_bin',
    '.drt': 'davinci_timeline',
    '.drx': 'davinci_look',
    '.aep': 'after_effects',
    '.prproj': 'premiere_pro',
    '.fcpxml': 'final_cut_pro',
    '.xml': 'generic_xml',
    '.edl': 'edit_decision_list',
    '.omf': 'open_media_framework',
    '.aaf': 'advanced_authoring_format'
  };
  return projectTypes[extension] || 'unknown_project';
}

/**
 * Determine metadata file type based on extension
 * @param {string} extension - The file extension
 * @returns {string} The metadata file type
 */
function getMetadataType(extension) {
  const metadataTypes = {
    '.xmp': 'adobe_xmp',
    '.iptc': 'iptc_metadata',
    '.exif': 'exif_metadata',
    '.sidecar': 'sidecar_metadata',
    '.thm': 'thumbnail_cache',
    '.lut': 'lookup_table',
    '.cube': 'cube_lut',
    '.3dl': '3dl_lut',
    '.ccc': 'color_correction_collection',
    '.cdl': 'color_decision_list'
  };
  return metadataTypes[extension] || 'unknown_metadata';
}

/**
 * Determine hash file type based on extension
 * @param {string} extension - The file extension
 * @returns {string} The hash file type
 */
function getHashType(extension) {
  const hashTypes = {
    '.mhl': 'media_hash_list',
    '.md5': 'md5_checksum',
    '.sha1': 'sha1_checksum',
    '.sha256': 'sha256_checksum',
    '.sha512': 'sha512_checksum',
    '.crc32': 'crc32_checksum',
    '.sfv': 'simple_file_verification',
    '.par2': 'parity_archive'
  };
  return hashTypes[extension] || 'unknown_hash';
}

/**
 * Recursively scan a directory and return all supported files
 * @param {FileSystemDirectoryHandle} directoryHandle - The directory to scan
 * @param {Function} progressCallback - Optional callback to report progress
 * @param {string} currentPath - Current path for recursion (internal use)
 * @param {Array} allFiles - Accumulator for files (internal use)
 * @returns {Promise<Array>} Array of file metadata objects
 */
export async function scanDirectory(directoryHandle, progressCallback = null, currentPath = '', allFiles = []) {
  console.log('Scanning directory:', directoryHandle.name, 'Path:', currentPath || 'root');
  
  try {
    let fileCount = 0;
    
    for await (const [name, handle] of directoryHandle.entries()) {
      if (handle.kind === 'file') {
        const extension = getFileExtension(name);
        
        // Only process supported file types
        if (ALL_SUPPORTED_EXTENSIONS.includes(extension)) {
          try {
            const metadata = await extractFileMetadata(handle, currentPath);
            allFiles.push(metadata);
            fileCount++;
            
            // Report progress if callback provided
            if (progressCallback) {
              progressCallback({
                type: 'file_found',
                file: metadata,
                totalFound: allFiles.length,
                currentPath: currentPath || 'root'
              });
            }
          } catch (error) {
            console.warn(`Failed to process file ${name}:`, error);
            // Continue processing other files
          }
        }
      } else if (handle.kind === 'directory') {
        // Recursively scan subdirectories
        const subPath = currentPath ? `${currentPath}/${name}` : name;
        
        if (progressCallback) {
          progressCallback({
            type: 'directory_enter',
            directory: name,
            currentPath: subPath
          });
        }
        
        await scanDirectory(handle, progressCallback, subPath, allFiles);
      }
    }
    
    return allFiles;
  } catch (error) {
    console.error('Error scanning directory:', error);
    throw new Error(`Failed to scan directory: ${error.message}`);
  }
}

/**
 * Calculate total size and file counts by category for a directory
 * @param {Array} files - Array of file metadata objects
 * @returns {Object} Statistics object with totals and breakdowns
 */
export function calculateDirectoryStats(files) {
  const stats = {
    totalFiles: files.length,
    totalSize: 0,
    formattedTotalSize: '0 B',
    categories: {
      image: { count: 0, size: 0, formattedSize: '0 B' },
      video: { count: 0, size: 0, formattedSize: '0 B' },
      professional_video: { count: 0, size: 0, formattedSize: '0 B' },
      audio: { count: 0, size: 0, formattedSize: '0 B' },
      document: { count: 0, size: 0, formattedSize: '0 B' },
      project_files: { count: 0, size: 0, formattedSize: '0 B' },
      archive: { count: 0, size: 0, formattedSize: '0 B' },
      data: { count: 0, size: 0, formattedSize: '0 B' },
      metadata: { count: 0, size: 0, formattedSize: '0 B' },
      hash_files: { count: 0, size: 0, formattedSize: '0 B' },
      other: { count: 0, size: 0, formattedSize: '0 B' }
    }
  };

  files.forEach(file => {
    stats.totalSize += file.size;
    const category = file.category;
    
    if (stats.categories[category]) {
      stats.categories[category].count++;
      stats.categories[category].size += file.size;
    } else {
      stats.categories.other.count++;
      stats.categories.other.size += file.size;
    }
  });

  // Format sizes
  stats.formattedTotalSize = formatFileSize(stats.totalSize);
  Object.keys(stats.categories).forEach(category => {
    stats.categories[category].formattedSize = formatFileSize(stats.categories[category].size);
  });

  return stats;
}

/**
 * Check if we still have permission to access a directory handle
 * @param {FileSystemDirectoryHandle} directoryHandle - The directory handle to check
 * @returns {Promise<boolean>} True if we have permission, false otherwise
 */
export async function checkDirectoryPermission(directoryHandle) {
  try {
    if (!directoryHandle) return false;
    
    const permission = await directoryHandle.queryPermission({ mode: 'read' });
    return permission === 'granted';
  } catch (error) {
    console.warn('Failed to check directory permission:', error);
    return false;
  }
}

/**
 * Request permission for a directory handle if needed
 * @param {FileSystemDirectoryHandle} directoryHandle - The directory handle
 * @returns {Promise<boolean>} True if permission granted, false otherwise
 */
export async function requestDirectoryPermission(directoryHandle) {
  try {
    if (!directoryHandle) return false;
    
    const permission = await directoryHandle.requestPermission({ mode: 'read' });
    return permission === 'granted';
  } catch (error) {
    console.warn('Failed to request directory permission:', error);
    return false;
  }
}

/**
 * Validate and prepare a directory handle for use
 * @param {FileSystemDirectoryHandle} directoryHandle - The directory handle
 * @returns {Promise<boolean>} True if handle is valid and accessible
 */
export async function validateDirectoryHandle(directoryHandle) {
  try {
    if (!directoryHandle || !(directoryHandle instanceof FileSystemDirectoryHandle)) {
      return false;
    }

    // Check if we have permission
    let hasPermission = await checkDirectoryPermission(directoryHandle);
    
    if (!hasPermission) {
      // Try to request permission
      hasPermission = await requestDirectoryPermission(directoryHandle);
    }

    return hasPermission;
  } catch (error) {
    console.warn('Failed to validate directory handle:', error);
    return false;
  }
}