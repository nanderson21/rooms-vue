/**
 * Media Processing Utilities
 * Handles thumbnail generation, media metadata extraction, and file processing
 * for images, videos, and audio files accessed through File System Access API
 */

/**
 * Create a thumbnail from an image file
 * @param {File} file - The image file
 * @param {number} maxWidth - Maximum thumbnail width (default: 600)
 * @param {number} maxHeight - Maximum thumbnail height (default: 400)
 * @param {number} quality - JPEG quality (0-1, default: 0.8)
 * @returns {Promise<Object>} Object with thumbnail data URL, width, and height
 */
export async function createImageThumbnail(file, maxWidth = 600, maxHeight = 400, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      try {
        // Calculate thumbnail dimensions maintaining aspect ratio
        const { width, height } = calculateThumbnailSize(img.width, img.height, maxWidth, maxHeight);
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw the image on canvas
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to data URL
        const thumbnailDataURL = canvas.toDataURL('image/jpeg', quality);
        
        resolve({
          thumbnail: thumbnailDataURL,
          width: img.width,
          height: img.height,
          thumbnailWidth: width,
          thumbnailHeight: height
        });
        
        // Clean up with delay to prevent race conditions
        setTimeout(() => {
          URL.revokeObjectURL(img.src);
        }, 5000);
      } catch (error) {
        reject(new Error(`Failed to create image thumbnail: ${error.message}`));
      }
    };
    
    img.onerror = () => {
      // Delay revocation to prevent race conditions
      setTimeout(() => {
        URL.revokeObjectURL(img.src);
      }, 5000);
      reject(new Error('Failed to load image for thumbnail generation'));
    };
    
    // Create object URL for the image
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Create a thumbnail from a video file
 * @param {File} file - The video file
 * @param {number} seekTime - Time in seconds to capture frame (default: 1)
 * @param {number} maxWidth - Maximum thumbnail width (default: 600)
 * @param {number} maxHeight - Maximum thumbnail height (default: 400)
 * @returns {Promise<Object>} Object with thumbnail data URL, video dimensions, and duration
 */
export async function createVideoThumbnail(file, seekTime = 1, maxWidth = 600, maxHeight = 400) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    let resolved = false;
    
    video.onloadedmetadata = () => {
      try {
        // Ensure seek time doesn't exceed video duration
        const actualSeekTime = Math.min(seekTime, video.duration);
        video.currentTime = actualSeekTime;
      } catch (error) {
        if (!resolved) {
          resolved = true;
          reject(new Error(`Failed to seek video: ${error.message}`));
        }
      }
    };
    
    video.onseeked = () => {
      try {
        if (resolved) return;
        
        // Calculate thumbnail dimensions maintaining aspect ratio
        const { width, height } = calculateThumbnailSize(video.videoWidth, video.videoHeight, maxWidth, maxHeight);
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw the video frame on canvas
        ctx.drawImage(video, 0, 0, width, height);
        
        // Convert to data URL
        const thumbnailDataURL = canvas.toDataURL('image/jpeg', 0.8);
        
        // Format duration
        const formattedDuration = formatDuration(video.duration);
        
        resolved = true;
        resolve({
          thumbnail: thumbnailDataURL,
          width: video.videoWidth,
          height: video.videoHeight,
          thumbnailWidth: width,
          thumbnailHeight: height,
          duration: video.duration,
          formattedDuration: formattedDuration
        });
        
        // Clean up with delay to prevent race conditions
        setTimeout(() => {
          URL.revokeObjectURL(video.src);
        }, 5000);
      } catch (error) {
        if (!resolved) {
          resolved = true;
          reject(new Error(`Failed to create video thumbnail: ${error.message}`));
        }
      }
    };
    
    video.onerror = () => {
      if (!resolved) {
        resolved = true;
        // Delay revocation to prevent race conditions
        setTimeout(() => {
          URL.revokeObjectURL(video.src);
        }, 5000);
        reject(new Error('Failed to load video for thumbnail generation'));
      }
    };
    
    // Set up video element
    video.muted = true;
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    video.load();
    
    // Fallback timeout
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('Video thumbnail generation timed out'));
      }
    }, 10000);
  });
}

/**
 * Extract audio metadata and create a waveform thumbnail
 * @param {File} file - The audio file
 * @param {number} maxWidth - Maximum waveform width (default: 600)
 * @param {number} maxHeight - Maximum waveform height (default: 200)
 * @returns {Promise<Object>} Object with waveform data URL and duration
 */
export async function createAudioThumbnail(file, maxWidth = 600, maxHeight = 200) {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    
    let resolved = false;
    
    audio.onloadedmetadata = () => {
      try {
        if (resolved) return;
        
        // Create a simple waveform visualization
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = maxWidth;
        canvas.height = maxHeight;
        
        // Create a simple waveform pattern (placeholder)
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, maxWidth, maxHeight);
        
        ctx.fillStyle = '#3c5a9b';
        ctx.strokeStyle = '#3c5a9b';
        ctx.lineWidth = 2;
        
        // Draw a simple audio waveform pattern
        const barCount = 50;
        const barWidth = maxWidth / barCount;
        
        for (let i = 0; i < barCount; i++) {
          const barHeight = Math.random() * maxHeight * 0.8 + maxHeight * 0.1;
          const x = i * barWidth;
          const y = (maxHeight - barHeight) / 2;
          
          ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
        }
        
        const thumbnailDataURL = canvas.toDataURL('image/png');
        const formattedDuration = formatDuration(audio.duration);
        
        resolved = true;
        resolve({
          thumbnail: thumbnailDataURL,
          duration: audio.duration,
          formattedDuration: formattedDuration,
          waveform: true
        });
        
        // Clean up with delay to prevent race conditions
        setTimeout(() => {
          URL.revokeObjectURL(audio.src);
        }, 5000);
      } catch (error) {
        if (!resolved) {
          resolved = true;
          reject(new Error(`Failed to create audio thumbnail: ${error.message}`));
        }
      }
    };
    
    audio.onerror = () => {
      if (!resolved) {
        resolved = true;
        reject(new Error('Failed to load audio for thumbnail generation'));
      }
    };
    
    audio.src = URL.createObjectURL(file);
    
    // Fallback timeout
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('Audio thumbnail generation timed out'));
      }
    }, 5000);
  });
}

/**
 * Create a document thumbnail (placeholder icon)
 * @param {File} file - The document file
 * @param {string} fileType - The file type/extension
 * @param {number} width - Thumbnail width (default: 600)
 * @param {number} height - Thumbnail height (default: 400)
 * @returns {Promise<Object>} Object with thumbnail data URL
 */
export async function createDocumentThumbnail(file, fileType, width = 600, height = 400) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = width;
    canvas.height = height;
    
    // Background
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, width, height);
    
    // Document icon background
    const iconSize = Math.min(width, height) * 0.6;
    const iconX = (width - iconSize) / 2;
    const iconY = (height - iconSize) / 2;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(iconX, iconY, iconSize, iconSize * 0.8);
    
    // Document icon details
    ctx.fillStyle = '#3c5a9b';
    ctx.font = `${iconSize * 0.15}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(fileType.toUpperCase(), width / 2, height / 2 + iconSize * 0.05);
    
    // Border
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(iconX, iconY, iconSize, iconSize * 0.8);
    
    const thumbnailDataURL = canvas.toDataURL('image/png');
    
    resolve({
      thumbnail: thumbnailDataURL,
      placeholder: true
    });
  });
}

/**
 * Calculate thumbnail dimensions maintaining aspect ratio
 * @param {number} originalWidth - Original image/video width
 * @param {number} originalHeight - Original image/video height
 * @param {number} maxWidth - Maximum allowed width
 * @param {number} maxHeight - Maximum allowed height
 * @returns {Object} Object with calculated width and height
 */
function calculateThumbnailSize(originalWidth, originalHeight, maxWidth, maxHeight) {
  let width = originalWidth;
  let height = originalHeight;
  
  // Scale down if necessary
  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }
  
  if (height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }
  
  return { width: Math.round(width), height: Math.round(height) };
}

/**
 * Format duration in seconds to human readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

/**
 * Process a file and create appropriate thumbnail based on its type
 * @param {Object} fileMetadata - File metadata object from fileSystemAccess.js
 * @param {Function} progressCallback - Optional progress callback
 * @returns {Promise<Object>} Enhanced metadata with thumbnail and media-specific data
 */
export async function processMediaFile(fileMetadata, progressCallback = null) {
  try {
    if (progressCallback) {
      progressCallback({
        type: 'processing_start',
        file: fileMetadata.name,
        category: fileMetadata.category
      });
    }

    // Get the actual file from the handle
    const file = await fileMetadata.handle.getFile();
    let enhancedMetadata = { ...fileMetadata };
    
    switch (fileMetadata.category) {
      case 'image':
        try {
          const imageData = await createImageThumbnail(file);
          enhancedMetadata.thumbnail = imageData.thumbnail;
          enhancedMetadata.width = imageData.width;
          enhancedMetadata.height = imageData.height;
          enhancedMetadata.thumbnailWidth = imageData.thumbnailWidth;
          enhancedMetadata.thumbnailHeight = imageData.thumbnailHeight;
        } catch (error) {
          console.warn(`Failed to create image thumbnail for ${file.name}:`, error);
          // Create a placeholder thumbnail
          const placeholder = await createDocumentThumbnail(file, 'IMG');
          enhancedMetadata.thumbnail = placeholder.thumbnail;
          enhancedMetadata.placeholder = true;
        }
        break;
        
      case 'video':
        try {
          const videoData = await createVideoThumbnail(file);
          enhancedMetadata.thumbnail = videoData.thumbnail;
          enhancedMetadata.width = videoData.width;
          enhancedMetadata.height = videoData.height;
          enhancedMetadata.thumbnailWidth = videoData.thumbnailWidth;
          enhancedMetadata.thumbnailHeight = videoData.thumbnailHeight;
          enhancedMetadata.duration = videoData.duration;
          enhancedMetadata.formattedDuration = videoData.formattedDuration;
        } catch (error) {
          console.warn(`Failed to create video thumbnail for ${file.name}:`, error);
          // Create a placeholder thumbnail
          const placeholder = await createDocumentThumbnail(file, 'VID');
          enhancedMetadata.thumbnail = placeholder.thumbnail;
          enhancedMetadata.placeholder = true;
        }
        break;
        
      case 'audio':
        try {
          const audioData = await createAudioThumbnail(file);
          enhancedMetadata.thumbnail = audioData.thumbnail;
          enhancedMetadata.duration = audioData.duration;
          enhancedMetadata.formattedDuration = audioData.formattedDuration;
          enhancedMetadata.waveform = audioData.waveform;
        } catch (error) {
          console.warn(`Failed to create audio thumbnail for ${file.name}:`, error);
          // Create a placeholder thumbnail
          const placeholder = await createDocumentThumbnail(file, 'AUD');
          enhancedMetadata.thumbnail = placeholder.thumbnail;
          enhancedMetadata.placeholder = true;
        }
        break;
        
      default:
        // For documents and other file types, create a placeholder thumbnail
        const placeholder = await createDocumentThumbnail(file, enhancedMetadata.extension.replace('.', ''));
        enhancedMetadata.thumbnail = placeholder.thumbnail;
        enhancedMetadata.placeholder = true;
        break;
    }

    if (progressCallback) {
      progressCallback({
        type: 'processing_complete',
        file: fileMetadata.name,
        category: fileMetadata.category,
        hasThumbnail: !!enhancedMetadata.thumbnail
      });
    }

    return enhancedMetadata;
  } catch (error) {
    console.error(`Error processing media file ${fileMetadata.name}:`, error);
    
    // Return original metadata with error indication
    return {
      ...fileMetadata,
      processingError: error.message
    };
  }
}

/**
 * Process multiple files with progress tracking
 * @param {Array} fileList - Array of file metadata objects
 * @param {Function} progressCallback - Progress callback function
 * @param {number} concurrency - Number of files to process concurrently (default: 3)
 * @returns {Promise<Array>} Array of enhanced file metadata objects
 */
export async function processMediaFiles(fileList, progressCallback = null, concurrency = 3) {
  const results = [];
  const total = fileList.length;
  let completed = 0;

  if (progressCallback) {
    progressCallback({
      type: 'batch_start',
      total: total
    });
  }

  // Process files in batches to avoid overwhelming the browser
  for (let i = 0; i < fileList.length; i += concurrency) {
    const batch = fileList.slice(i, i + concurrency);
    const batchPromises = batch.map(async (fileMetadata) => {
      try {
        const processed = await processMediaFile(fileMetadata, progressCallback);
        completed++;
        
        if (progressCallback) {
          progressCallback({
            type: 'batch_progress',
            completed: completed,
            total: total,
            progress: Math.round((completed / total) * 100)
          });
        }
        
        return processed;
      } catch (error) {
        completed++;
        console.error(`Failed to process file ${fileMetadata.name}:`, error);
        
        if (progressCallback) {
          progressCallback({
            type: 'batch_progress',
            completed: completed,
            total: total,
            progress: Math.round((completed / total) * 100)
          });
        }
        
        return {
          ...fileMetadata,
          processingError: error.message
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches to prevent browser freezing
    if (i + concurrency < fileList.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  if (progressCallback) {
    progressCallback({
      type: 'batch_complete',
      total: total,
      successful: results.filter(r => !r.processingError).length,
      errors: results.filter(r => r.processingError).length
    });
  }

  return results;
}