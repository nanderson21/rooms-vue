/**
 * MediaInfo Service
 * Browser-based video metadata extraction using MediaInfo.js WebAssembly
 * Provides framerate detection and other video properties for frame-accurate timecode calculations
 */

let mediaInfoInstance = null;
let isInitializing = false;

/**
 * Initialize MediaInfo.js with WebAssembly support
 * @returns {Promise<Object>} MediaInfo instance
 */
async function initializeMediaInfo() {
  if (mediaInfoInstance) {
    return mediaInfoInstance;
  }
  
  if (isInitializing) {
    // Wait for existing initialization to complete
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return mediaInfoInstance;
  }
  
  isInitializing = true;
  
  try {
    console.log('Initializing MediaInfo.js...');
    
    // Load MediaInfo from CDN
    if (!window.MediaInfo && !window.MediaInfoFactory) {
      await loadMediaInfoScript();
    }
    
    // Try different MediaInfo API patterns
    let MediaInfoConstructor = null;
    
    if (window.MediaInfoFactory) {
      console.log('Using MediaInfoFactory API');
      MediaInfoConstructor = window.MediaInfoFactory;
    } else if (window.MediaInfo) {
      console.log('Using MediaInfo API');
      MediaInfoConstructor = window.MediaInfo;
    } else {
      throw new Error('Neither MediaInfo nor MediaInfoFactory is available');
    }
    
    // Initialize MediaInfo with WebAssembly
    if (typeof MediaInfoConstructor === 'function') {
      try {
        mediaInfoInstance = await MediaInfoConstructor({
          locateFile: (path, prefix) => {
            // Use CDN for WASM file
            if (path.endsWith('.wasm')) {
              return `https://cdn.jsdelivr.net/npm/mediainfo.js@${getMediaInfoVersion()}/dist/${path}`;
            }
            return prefix + path;
          }
        });
      } catch (error) {
        console.log('Failed with function call, trying direct instantiation');
        // Some versions might need direct instantiation
        mediaInfoInstance = new MediaInfoConstructor();
      }
    } else {
      throw new Error('MediaInfo constructor is not a function');
    }
    
    console.log('MediaInfo.js initialized successfully');
    return mediaInfoInstance;
    
  } catch (error) {
    console.error('Failed to initialize MediaInfo.js:', error);
    throw new Error('MediaInfo initialization failed: ' + error.message);
  } finally {
    isInitializing = false;
  }
}

/**
 * Load MediaInfo.js script from CDN
 * @returns {Promise<void>}
 */
function loadMediaInfoScript() {
  return new Promise((resolve, reject) => {
    if (window.MediaInfoFactory || window.MediaInfo) {
      resolve();
      return;
    }
    
    // Remove any existing failed scripts
    const existingScripts = document.querySelectorAll('script[src*="mediainfo"]');
    existingScripts.forEach(script => script.remove());
    
    console.log('Loading MediaInfo.js from CDN...');
    
    const script = document.createElement('script');
    // Try jsdelivr CDN instead of unpkg
    script.src = `https://cdn.jsdelivr.net/npm/mediainfo.js@${getMediaInfoVersion()}/dist/mediainfo.min.js`;
    script.type = 'text/javascript';
    
    script.onload = () => {
      console.log('MediaInfo.js script loaded, checking for MediaInfoFactory...');
      
      // Immediate check
      if (window.MediaInfoFactory || window.MediaInfo) {
        console.log('MediaInfo API available immediately');
        resolve();
        return;
      }
      
      // Wait for potential async initialization
      let attempts = 0;
      const maxAttempts = 20; // 1 second max
      
      const checkFactory = () => {
        attempts++;
        console.log(`Checking for MediaInfo API (attempt ${attempts}/${maxAttempts})`);
        
        if (window.MediaInfoFactory || window.MediaInfo) {
          console.log('MediaInfo API found after', attempts * 50, 'ms');
          resolve();
        } else if (attempts < maxAttempts) {
          setTimeout(checkFactory, 50);
        } else {
          console.error('MediaInfo API not available after', attempts * 50, 'ms');
          console.log('Available globals:', Object.keys(window).filter(k => k.toLowerCase().includes('media')));
          console.log('Checking window.MediaInfo type:', typeof window.MediaInfo);
          console.log('MediaInfo value:', window.MediaInfo);
          reject(new Error('MediaInfo.js script loaded but no valid API found'));
        }
      };
      
      setTimeout(checkFactory, 50);
    };
    
    script.onerror = (error) => {
      console.error('MediaInfo.js script failed to load from CDN:', error);
      reject(new Error('Failed to load MediaInfo.js script from CDN'));
    };
    
    document.head.appendChild(script);
  });
}

/**
 * Get MediaInfo.js version (use latest stable)
 * @returns {string} Version string
 */
function getMediaInfoVersion() {
  return '0.1.6'; // Use known stable version
}

/**
 * Extract comprehensive video metadata from file
 * @param {File|Blob} file - Video file to analyze
 * @returns {Promise<Object>} Video metadata including framerate
 */
export async function extractVideoMetadata(file) {
  if (!file) {
    throw new Error('No file provided for metadata extraction');
  }
  
  const mediaInfo = await initializeMediaInfo();
  
  // Verify mediaInfo instance is valid
  if (!mediaInfo || typeof mediaInfo.analyzeData !== 'function') {
    console.error('MediaInfo instance is invalid:', mediaInfo);
    throw new Error('MediaInfo instance is not properly initialized');
  }
  
  try {
    console.log(`Extracting metadata from: ${file.name || 'video file'}`);
    
    // Prepare file data for MediaInfo
    const fileData = await file.arrayBuffer();
    const uint8Array = new Uint8Array(fileData);
    
    console.log(`Analyzing ${fileData.byteLength} bytes with MediaInfo...`);
    
    // Analyze file with MediaInfo
    const mediaInfoResult = await mediaInfo.analyzeData(
      () => fileData.byteLength,
      (size, offset) => {
        const end = Math.min(offset + size, uint8Array.length);
        return uint8Array.slice(offset, end);
      }
    );
    
    console.log('Raw MediaInfo result:', mediaInfoResult);
    
    // Parse the result to extract video metadata
    const metadata = parseMediaInfoResult(mediaInfoResult, file);
    
    console.log('Extracted video metadata:', metadata);
    return metadata;
    
  } catch (error) {
    console.error('MediaInfo extraction failed:', error);
    
    // Fallback to HTML5 video element metadata
    console.log('Falling back to HTML5 video metadata extraction...');
    return await extractFallbackMetadata(file);
  }
}

/**
 * Parse MediaInfo result to extract relevant video properties
 * @param {Object} mediaInfoResult - Raw MediaInfo analysis result
 * @param {File} file - Original file for fallback data
 * @returns {Object} Parsed video metadata
 */
function parseMediaInfoResult(mediaInfoResult, file) {
  const metadata = {
    filename: file.name,
    filesize: file.size,
    // Default values
    framerate: 30,
    framerateString: '30.000',
    framerateMode: 'CFR',
    duration: 0,
    width: 0,
    height: 0,
    codec: 'Unknown',
    profile: '',
    colorSpace: '',
    bitrate: 0,
    // MediaInfo extraction status
    mediaInfoAvailable: true,
    extractionMethod: 'mediainfo.js',
    extractionError: null
  };
  
  try {
    // MediaInfo.js returns results in media.track array format
    if (mediaInfoResult?.media?.track) {
      const tracks = mediaInfoResult.media.track;
      
      // Find video track (usually track[0] or track[1])
      const videoTrack = tracks.find(track => 
        track['@type'] === 'Video' || track.StreamKind === 'Video'
      );
      
      if (videoTrack) {
        // Extract framerate - MediaInfo provides multiple framerate fields
        if (videoTrack.FrameRate) {
          metadata.framerate = parseFloat(videoTrack.FrameRate);
          metadata.framerateString = videoTrack.FrameRate;
        } else if (videoTrack.FrameRate_Original) {
          metadata.framerate = parseFloat(videoTrack.FrameRate_Original);
          metadata.framerateString = videoTrack.FrameRate_Original;
        } else if (videoTrack.FrameRate_Nominal) {
          metadata.framerate = parseFloat(videoTrack.FrameRate_Nominal);
          metadata.framerateString = videoTrack.FrameRate_Nominal;
        }
        
        // Framerate mode (CFR/VFR)
        if (videoTrack.FrameRate_Mode) {
          metadata.framerateMode = videoTrack.FrameRate_Mode;
        }
        
        // Video dimensions
        if (videoTrack.Width) {
          metadata.width = parseInt(videoTrack.Width);
        }
        if (videoTrack.Height) {
          metadata.height = parseInt(videoTrack.Height);
        }
        
        // Duration (in seconds)
        if (videoTrack.Duration) {
          metadata.duration = parseFloat(videoTrack.Duration) / 1000; // Convert ms to seconds
        }
        
        // Codec information
        if (videoTrack.Format) {
          metadata.codec = videoTrack.Format;
        }
        if (videoTrack.Format_Profile) {
          metadata.profile = videoTrack.Format_Profile;
        }
        
        // Color space
        if (videoTrack.ColorSpace) {
          metadata.colorSpace = videoTrack.ColorSpace;
        }
        
        // Bitrate
        if (videoTrack.BitRate) {
          metadata.bitrate = parseInt(videoTrack.BitRate);
        }
      }
      
      // Also check general track for duration if not found in video track
      const generalTrack = tracks.find(track => 
        track['@type'] === 'General' || track.StreamKind === 'General'
      );
      
      if (generalTrack && !metadata.duration && generalTrack.Duration) {
        metadata.duration = parseFloat(generalTrack.Duration) / 1000;
      }
    }
    
    console.log('MediaInfo extraction successful:', {
      framerate: metadata.framerate,
      duration: metadata.duration,
      dimensions: `${metadata.width}x${metadata.height}`,
      codec: metadata.codec
    });
    
  } catch (error) {
    console.error('Error parsing MediaInfo result:', error);
    metadata.extractionError = error.message;
  }
  
  return metadata;
}

/**
 * Fallback metadata extraction using HTML5 video element
 * @param {File} file - Video file
 * @returns {Promise<Object>} Basic video metadata
 */
async function extractFallbackMetadata(file) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    
    const metadata = {
      filename: file.name,
      filesize: file.size,
      framerate: 30, // Default fallback
      framerateString: '30.000',
      framerateMode: 'Unknown',
      duration: 0,
      width: 0,
      height: 0,
      codec: 'Unknown',
      profile: '',
      colorSpace: '',
      bitrate: 0,
      mediaInfoAvailable: false,
      extractionMethod: 'html5-fallback',
      extractionError: 'MediaInfo.js not available'
    };
    
    video.onloadedmetadata = () => {
      metadata.duration = video.duration || 0;
      metadata.width = video.videoWidth || 0;
      metadata.height = video.videoHeight || 0;
      
      // Clean up
      URL.revokeObjectURL(objectUrl);
      
      console.log('Fallback metadata extraction:', metadata);
      resolve(metadata);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      console.log('Fallback metadata extraction failed, using defaults');
      resolve(metadata);
    };
    
    video.src = objectUrl;
  });
}

/**
 * Get framerate for a specific video file handle (FileSystem API)
 * @param {FileSystemFileHandle} fileHandle - FileSystem API file handle
 * @returns {Promise<number>} Video framerate
 */
export async function getFramerateFromHandle(fileHandle) {
  try {
    const file = await fileHandle.getFile();
    const metadata = await extractVideoMetadata(file);
    return metadata.framerate;
  } catch (error) {
    console.error('Failed to extract framerate from file handle:', error);
    return 30; // Default fallback
  }
}

/**
 * Extract framerate with common format detection
 * @param {File|FileSystemFileHandle} source - Video source
 * @returns {Promise<Object>} Framerate info with format detection
 */
export async function getFramerateInfo(source) {
  try {
    let metadata;
    
    if (source instanceof File) {
      metadata = await extractVideoMetadata(source);
    } else if (source.getFile) {
      // FileSystem API handle
      const file = await source.getFile();
      metadata = await extractVideoMetadata(file);
    } else {
      throw new Error('Unsupported source type');
    }
    
    // Detect common framerates and provide format info
    const framerate = metadata.framerate;
    const formatInfo = detectFramerateFormat(framerate);
    
    return {
      framerate,
      framerateString: metadata.framerateString,
      framerateMode: metadata.framerateMode,
      format: formatInfo,
      metadata,
      isAccurate: metadata.mediaInfoAvailable
    };
    
  } catch (error) {
    console.error('Failed to get framerate info:', error);
    
    return {
      framerate: 30,
      framerateString: '30.000',
      framerateMode: 'Unknown',
      format: detectFramerateFormat(30),
      metadata: null,
      isAccurate: false,
      error: error.message
    };
  }
}

/**
 * Detect common video framerate formats
 * @param {number} framerate - Framerate value
 * @returns {Object} Format information
 */
function detectFramerateFormat(framerate) {
  const commonRates = [
    { rate: 23.976, name: '23.976 fps', description: 'Film (NTSC pulldown)', standard: 'NTSC' },
    { rate: 24, name: '24 fps', description: 'Cinema/Film', standard: 'Cinema' },
    { rate: 25, name: '25 fps', description: 'PAL Standard', standard: 'PAL' },
    { rate: 29.97, name: '29.97 fps', description: 'NTSC Standard', standard: 'NTSC' },
    { rate: 30, name: '30 fps', description: 'NTSC Progressive', standard: 'NTSC' },
    { rate: 50, name: '50 fps', description: 'PAL Progressive', standard: 'PAL' },
    { rate: 59.94, name: '59.94 fps', description: 'NTSC High Frame Rate', standard: 'NTSC' },
    { rate: 60, name: '60 fps', description: 'Progressive High Frame Rate', standard: 'Progressive' }
  ];
  
  // Find closest match (within 0.1 fps tolerance)
  const match = commonRates.find(rate => Math.abs(rate.rate - framerate) < 0.1);
  
  if (match) {
    return {
      detected: true,
      name: match.name,
      description: match.description,
      standard: match.standard,
      isStandard: true
    };
  }
  
  return {
    detected: false,
    name: `${framerate.toFixed(3)} fps`,
    description: 'Non-standard framerate',
    standard: 'Custom',
    isStandard: false
  };
}

/**
 * Check if MediaInfo.js is available and working
 * @returns {Promise<boolean>} Availability status
 */
export async function isMediaInfoAvailable() {
  try {
    await initializeMediaInfo();
    return true;
  } catch (error) {
    console.log('MediaInfo not available:', error.message);
    return false;
  }
}

export default {
  extractVideoMetadata,
  getFramerateFromHandle,
  getFramerateInfo,
  isMediaInfoAvailable
};