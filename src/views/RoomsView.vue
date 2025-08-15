<template>
  <div class="rooms-view" @click="handleBackgroundClick">
    <!-- Secondary tabs navigation -->
    <div class="secondary-nav">
      <div class="tab-container">
        <div class="tab">Spaces</div>
        <div class="tab">Ingest</div>
        <div class="tab">Templates</div>
        <div class="tab">Snapshots</div>
        <div class="tab">Libraries</div>
        <div class="tab active" @click.stop="deselectRoom">Files</div>
      </div>
    </div>
    
    <!-- Main content with grey backdrop -->
    <div class="main-container">
      <!-- Left Sidebar (Rooms list) -->
      <div class="rooms-sidebar">
        <div class="sidebar-header">
          <h3>Rooms</h3>
          <div class="header-actions">
            <button 
              class="toggle-inactive-btn" 
              :class="{ 'active': showInactiveRooms }" 
              @click="toggleInactiveRooms" 
              title="Toggle inactive rooms"
            >
              <font-awesome-icon :icon="['fas', showInactiveRooms ? 'door-open' : 'door-closed']" :style="{ color: showInactiveRooms ? '#3c5a9b' : '#626262' }" />
            </button>
            <button 
              class="add-btn" 
              @click="createNewRoom"
              :disabled="isCreatingRoom"
              :title="isFileSystemAccessSupported ? 'Create room from folder' : 'File System Access API not supported in this browser'"
            >
              <font-awesome-icon v-if="!isCreatingRoom" :icon="['fas', 'plus']" />
              <font-awesome-icon v-else :icon="['fas', 'spinner']" spin />
            </button>
          </div>
        </div>
        <div class="sidebar-content">
          <!-- Room items with inline folder trees -->
          <div>
            <template v-for="room in visibleRooms" :key="room.id">
              <!-- Room item -->
              <div 
                class="room-item" 
                :class="{ active: selectedRoom === room.id }"
                @click.stop="selectRoom(room.id)"
              >
                <div class="room-icon">
                  <font-awesome-icon 
                    v-if="room.type === 'filesystem' && room.status === 'loading'"
                    :icon="['fas', 'spinner']"
                    spin
                    :style="{ color: '#3c5a9b' }"
                  />
                  <font-awesome-icon 
                    v-else-if="room.type === 'filesystem' && room.status === 'processing'"
                    :icon="['fas', 'sync-alt']"
                    spin
                    :style="{ color: '#3c5a9b' }"
                  />
                  <font-awesome-icon 
                    v-else-if="room.type === 'filesystem' && room.status === 'error'"
                    :icon="['fas', 'exclamation-triangle']"
                    :style="{ color: '#dc2626' }"
                  />
                  <font-awesome-icon 
                    v-else-if="room.status === 'permission_needed'"
                    :icon="['fas', 'lock']"
                    :style="{ color: '#f59e0b' }"
                    :title="'Permission required for ' + room.title"
                  />
                  <font-awesome-icon 
                    v-else
                    :icon="['fas', room.isActive ? 'door-open' : 'door-closed']" 
                    :style="{ color: room.isActive ? '#3c5a9b' : '#626262' }" 
                  />
                </div>
                <div class="room-info">
                  <div class="room-name">{{ room.name }}</div>
                  <div v-if="room.type === 'filesystem'" class="room-status">
                    <span v-if="room.status === 'loading' || room.status === 'processing'">
                      {{ room.loadingMessage || 'Processing...' }}
                    </span>
                    <span v-else-if="room.status === 'error'" class="status-error">
                      {{ room.loadingMessage || 'Error loading' }}
                    </span>
                    <span v-else-if="room.status === 'permission_needed'" class="status-warning">
                      Permission required - click to grant access
                    </span>
                    <span v-else>
                      {{ room.itemCount }} files • {{ room.size }}
                    </span>
                  </div>
                  <div v-else class="room-path">{{ room.itemCount }} files</div>
                </div>
                <div class="room-options" @click.stop="toggleRoomMenu(room.id, $event)" ref="roomOptionsButton">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="1"></circle>
                    <circle cx="19" cy="12" r="1"></circle>
                    <circle cx="5" cy="12" r="1"></circle>
                  </svg>
                </div>
                
                <!-- Room Context Menu -->
                <div 
                  v-if="contextMenu.visible && contextMenu.roomId === room.id" 
                  class="room-context-menu"
                  :style="contextMenuStyle"
                  @click.stop
                >
                  <ul class="context-menu-list">
                    <li class="context-menu-item" @click="openRoomSettings(room)">
                      <font-awesome-icon :icon="['fas', 'cog']" />
                      <span>Settings</span>
                    </li>
                    <li class="context-menu-item" @click="toggleRoomActiveStatus(room)">
                      <font-awesome-icon :icon="['fas', room.isActive ? 'door-closed' : 'door-open']" />
                      <span>{{ room.isActive ? 'Deactivate' : 'Activate' }} Room</span>
                    </li>
                    <li class="context-menu-item" @click="refreshRoom(room)">
                      <font-awesome-icon :icon="['fas', 'sync-alt']" />
                      <span>Refresh</span>
                    </li>
                    <li class="context-menu-item warning" @click="wipeAndReindexRoom(room)">
                      <font-awesome-icon :icon="['fas', 'database']" />
                      <span>Wipe & Re-index</span>
                    </li>
                    <li class="context-menu-divider"></li>
                    <li class="context-menu-item danger" @click="removeRoom(room)">
                      <font-awesome-icon :icon="['fas', 'trash']" />
                      <span>Remove Room</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <!-- Inline folder tree for selected filesystem room -->
              <Transition name="folder-tree-slide">
                <div 
                  v-if="selectedRoom === room.id && room.type === 'filesystem' && room.status === 'ready'"
                  class="inline-folder-tree"
                >
                  <div v-if="folderTree.length === 0" class="tree-empty-state">
                    <span class="text-gray-500">No folders found</span>
                  </div>
                  <div v-else class="tree-content">
                    <TreeNode 
                      v-for="node in folderTree" 
                      :key="node.path || node.name"
                      :node="node"
                      :level="0"
                      :show-files="false"
                      @select-item="selectTreeItem"
                      @toggle-folder="toggleFolder"
                    />
                  </div>
                </div>
              </Transition>
            </template>
          </div>

        </div>
      </div>
      
      <!-- Right Content Viewport -->
      <div class="content-viewport" @click="handleBackgroundClick">
        <!-- No room selected - show all rooms -->
        <div v-if="selectedRoom === null" class="room-detail">
          <div class="room-header">
            <div class="header-left">
              <h1 class="room-title">All Rooms</h1>
              <span class="room-count">{{ visibleRoomCount }} rooms available</span>
            </div>
            
            <!-- View controls moved inside room header -->
            <div class="view-controls">
              <div class="view-toggle">
                <button 
                  class="view-button" 
                  :class="{ 'active': viewMode === 'grid' }" 
                  @click="viewMode = 'grid'"
                >
                  <font-awesome-icon :icon="['fas', 'th']" />
                </button>
                <button 
                  class="view-button" 
                  :class="{ 'active': viewMode === 'list' }" 
                  @click="viewMode = 'list'"
                >
                  <font-awesome-icon :icon="['fas', 'list']" />
                </button>
              </div>
            </div>
          </div>
          
          <!-- Room cards grid with original design -->
          <div class="rooms-container">
            <!-- Grid view -->
            <div v-if="viewMode === 'grid'" class="rooms-grid">
              <div 
                v-for="room in visibleRooms" 
                :key="room.id"
                class="room-card" 
                @click.stop="selectRoom(room.id)"
                :style="room.thumbnail ? { backgroundImage: `url(${room.thumbnail})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}"
              >
                <div class="room-card-header">
                  <div class="room-icon">
                    <font-awesome-icon 
                      :icon="['fas', room.isActive ? 'door-open' : 'door-closed']" 
                      :style="{ color: room.isActive ? '#3c5a9b' : '#626262' }" 
                    />
                  </div>
                  <div class="room-options">•••</div>
                </div>
                <div class="room-card-content" :class="{ 'has-thumbnail': room.thumbnail }">
                  <h3 class="room-card-title">{{ room.name }}</h3>
                  <p class="room-card-stats">
                    {{ room.itemCount }} {{ room.itemCount === 1 ? 'item' : 'items' }}
                    <span v-if="room.hasVideo"> with video preview</span>
                    • {{ room.size }}
                  </p>
                  <div class="room-card-status">
                    <span class="status-badge" :class="{ 'active': room.isActive, 'inactive': !room.isActive }">
                      {{ room.type === 'filesystem' ? 'Local Folder' : (room.isActive ? 'Active' : 'Inactive') }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- List view -->
            <div v-else class="rooms-list">
              <div 
                v-for="room in visibleRooms" 
                :key="room.id"
                class="room-list-item" 
                @click.stop="selectRoom(room.id)"
              >
                <div class="room-list-icon">
                  <font-awesome-icon 
                    :icon="['fas', room.isActive ? 'door-open' : 'door-closed']" 
                    :style="{ color: room.isActive ? '#3c5a9b' : '#626262' }" 
                  />
                </div>
                <div class="room-list-info">
                  <h3 class="room-title">{{ room.name }}</h3>
                  <p class="room-stats">
                    {{ room.itemCount }} {{ room.itemCount === 1 ? 'item' : 'items' }}
                    <span v-if="room.hasVideo"> with video preview</span>
                    • {{ room.size }}
                  </p>
                </div>
                <span class="status-badge" :class="{ 'status-inactive': !room.isActive }">
                  {{ room.type === 'filesystem' ? 'Local Folder' : (room.isActive ? 'Active' : 'Inactive') }}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Room is selected -->
        <div v-else class="room-detail">
          <div class="room-header">
            <div class="header-left">
              <button v-if="currentFolderPath" @click="navigateUpFolder" class="back-button">
                <font-awesome-icon :icon="['fas', 'arrow-left']" />
                <span>Back</span>
              </button>
              <h1 class="room-title">{{ selectedRoomData?.name }}</h1>
              <span v-if="currentFolderPath" class="room-path">{{ currentFolderPath }}</span>
            </div>
            
            <!-- View controls moved inside room header -->
            <div class="view-controls">
              <div class="view-toggle">
                <button 
                  class="view-button" 
                  :class="{ 'active': viewMode === 'grid' }" 
                  @click="viewMode = 'grid'"
                >
                  <font-awesome-icon :icon="['fas', 'th']" />
                </button>
                <button 
                  class="view-button" 
                  :class="{ 'active': viewMode === 'list' }" 
                  @click="viewMode = 'list'"
                >
                  <font-awesome-icon :icon="['fas', 'list']" />
                </button>
              </div>
            </div>
          </div>

          <!-- Static demo rooms -->
          <EmbeddedRoomView 
            v-if="selectedRoom === 'nab-2025-demo'" 
            :collectionId="'nab-demo'"
            class="embedded-view" 
            @click.stop
          />
          <RoomView v-else-if="selectedRoom === 'demo-room'" class="embedded-view" @click.stop />
          
          <!-- Filesystem rooms -->
          <FileSystemRoomAdapter 
            v-else-if="getRoomById(selectedRoom)?.type === 'filesystem'" 
            :roomId="selectedRoom" 
            :currentFolderPath="currentFolderPath"
            :selectedFileId="selectedFile?.id || route.query.file"
            class="embedded-view"
            @click.stop
            @folder-selected="handleFolderSelected"
            @folder-settings="handleFolderSettings"
            @item-selected="handleItemSelected"
          />
          
          <!-- Fallback for unknown room types -->
          <div v-else class="room-not-found">
            <h2>Room not found</h2>
            <p>The selected room could not be loaded.</p>
            <button @click="deselectRoom" class="btn-primary">Back to Rooms</button>
          </div>
          
        </div>
      </div>
    </div>
    
    <!-- Room Settings Wizard Modal -->
    <RoomSettingsWizard 
      v-if="settingsModal.visible"
      :roomId="settingsModal.roomId"
      @close="closeSettingsModal"
      @template-applied="onTemplateApplied"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import RoomView from './RoomView.vue';
import FileSystemRoomView from './FileSystemRoomView.vue';
import EmbeddedRoomView from '../components/EmbeddedRoomView.vue';
import EmbeddedFileSystemRoomView from '../components/EmbeddedFileSystemRoomView.vue';
import FileSystemRoomAdapter from '../components/FileSystemRoomAdapter.vue';
import TreeNode from '../components/TreeNode.vue';
import RoomSettingsWizard from '../components/RoomSettingsWizard.vue';
import { roomService } from '../services/roomService.js';
import { isFileSystemAccessSupported } from '../utils/fileSystemAccess.js';

export default {
  name: 'RoomsView',
  components: {
    RoomView,
    FileSystemRoomView,
    EmbeddedRoomView,
    EmbeddedFileSystemRoomView,
    FileSystemRoomAdapter,
    TreeNode,
    RoomSettingsWizard
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    
    const selectedRoom = ref(null);
    const viewMode = ref('grid');
    const showInactiveRooms = ref(true);
    const isCreatingRoom = ref(false);
    const createRoomError = ref(null);
    const createRoomProgress = ref(null);
    const showFileTree = ref(true);
    const selectedFile = ref(null);
    const selectedVideoData = ref(null); // Store video data for inline playback
    const currentFolderPath = ref(null); // New state for current folder path
    
    // Context menu state
    const contextMenu = ref({
      visible: false,
      roomId: null,
      x: 0,
      y: 0
    });
    
    // Settings modal state
    const settingsModal = ref({
      visible: false,
      roomId: null
    });
    
    // Static rooms (existing demo data)
    const staticRooms = ref([
      { id: 'nab-2025-demo', name: 'NAB 2025 Demo', isActive: true, itemCount: 6, hasVideo: true, size: '2.3 GB', type: 'static' },
      { id: 'demo-room', name: 'Demo Room', isActive: false, itemCount: 3, hasVideo: false, size: '1.5 GB', type: 'static' }
    ]);

    // Combine static rooms with file system rooms
    const rooms = computed(() => {
      const fileSystemRooms = roomService.getAllRooms().map(room => ({
        id: room.id,
        name: room.title,
        isActive: room.isActive !== undefined ? room.isActive : (room.status === 'ready' || room.status === 'active'),
        itemCount: room.totalFiles,
        hasVideo: room.hasVideo,
        size: room.totalSize,
        type: 'filesystem',
        thumbnail: room.thumbnail,
        dateCreated: room.dateCreated,
        status: room.status,
        loadingMessage: room.loadingMessage
      }));
      
      return [...staticRooms.value, ...fileSystemRooms];
    });

    const isFileSystemAccessApiSupported = computed(() => {
      return isFileSystemAccessSupported();
    });

    const visibleRooms = computed(() => {
      return rooms.value.filter(room => showInactiveRooms.value || room.isActive);
    });

    const visibleRoomCount = computed(() => {
      return visibleRooms.value.length;
    });

    const totalRoomCount = computed(() => {
      return rooms.value.length;
    });

    // File tree computed properties
    const selectedRoomData = computed(() => {
      if (!selectedRoom.value) return null;
      return rooms.value.find(room => room.id === selectedRoom.value);
    });

    const selectedRoomName = computed(() => {
      return selectedRoomData.value?.name || '';
    });

    const selectedRoomFiles = ref([]);
    const isLoadingFiles = ref(false);
    
    // Function to load files for selected room
    const loadSelectedRoomFiles = async () => {
      const roomData = selectedRoomData.value;
      if (!roomData || roomData.type !== 'filesystem') {
        selectedRoomFiles.value = [];
        return;
      }
      
      isLoadingFiles.value = true;
      try {
        const files = await roomService.getLiveRoomFiles(selectedRoom.value);
        selectedRoomFiles.value = files;
      } catch (error) {
        console.error('Error loading room files:', error);
        selectedRoomFiles.value = [];
      } finally {
        isLoadingFiles.value = false;
      }
    };

    const folderTree = computed(() => {
      const files = selectedRoomFiles.value;
      if (!files || !files.length) return [];
      
      try {
        // Add a limit to prevent runaway computation
        if (files.length > 10000) {
          console.warn('Too many files for folder tree, limiting to first 10000');
          return buildFolderTree(files.slice(0, 10000));
        }
        return buildFolderTree(files);
      } catch (error) {
        console.error('Error building folder tree:', error);
        return [];
      }
    });

    // Context menu style positioning
    const contextMenuStyle = computed(() => ({
      position: 'fixed',
      top: `${contextMenu.value.y}px`,
      left: `${contextMenu.value.x}px`,
      zIndex: 1000
    }));

    // URL State Management
    const updateUrlFromState = () => {
      const params = { roomId: selectedRoom.value };
      const query = {};
      
      // Add folder path if present
      if (currentFolderPath.value) {
        params.folderPath = currentFolderPath.value;
      }
      
      // Add file selection to query
      if (selectedFile.value) {
        query.file = typeof selectedFile.value === 'string' ? selectedFile.value : (selectedFile.value.id || selectedFile.value.name);
      }
      
      // Determine the correct route name
      let routeName = 'spaces';
      if (selectedRoom.value) {
        routeName = currentFolderPath.value ? 'spaces-folder' : 'spaces-room';
      }
      
      // Only update if the URL would actually change
      const currentParams = route.params;
      const currentQuery = route.query;
      const shouldUpdate = (
        currentParams.roomId !== params.roomId ||
        currentParams.folderPath !== params.folderPath ||
        JSON.stringify(currentQuery) !== JSON.stringify(query)
      );
      
      if (shouldUpdate || route.name !== routeName) {
        router.replace({ name: routeName, params, query });
      }
    };

    const loadStateFromUrl = async () => {
      // Load room selection from URL
      if (route.params.roomId) {
        let room = roomService.getRoom(route.params.roomId);
        
        // If exact room not found, try to find by partial match (handle room ID changes)
        if (!room) {
          const allRooms = roomService.getAllRooms();
          room = allRooms.find(r => 
            r.id.includes(route.params.roomId) || 
            route.params.roomId.includes(r.id) ||
            (r.title && route.params.roomId.includes(r.title.toLowerCase().replace(/[^a-z0-9]/g, '-')))
          );
          
          // If we found a matching room, update the URL to use the correct ID
          if (room) {
            console.log(`Room ID mismatch: URL has ${route.params.roomId}, found ${room.id}`);
            router.replace({ 
              name: route.name, 
              params: { ...route.params, roomId: room.id }, 
              query: route.query 
            });
          }
        }
        
        if (room) {
          if (room.status === 'permission_needed') {
            // Room exists but needs permission - show prompt
            await handleRoomPermissionRequest(room);
          } else {
            selectedRoom.value = room.id; // Use the actual room ID
          }
        } else {
          // Room not found - might need to wait for initialization
          console.warn(`Room ${route.params.roomId} not found`);
          // Try again after a short delay to allow for initialization
          setTimeout(() => {
            let retryRoom = roomService.getRoom(route.params.roomId);
            
            // Try partial match again on retry
            if (!retryRoom) {
              const allRooms = roomService.getAllRooms();
              retryRoom = allRooms.find(r => 
                r.id.includes(route.params.roomId) || 
                route.params.roomId.includes(r.id)
              );
            }
            
            if (retryRoom) {
              if (retryRoom.status === 'permission_needed') {
                handleRoomPermissionRequest(retryRoom);
              } else {
                selectedRoom.value = retryRoom.id;
                // Update URL with correct room ID
                router.replace({ 
                  name: route.name, 
                  params: { ...route.params, roomId: retryRoom.id }, 
                  query: route.query 
                });
              }
            }
          }, 1000);
        }
      }
      
      // Load folder path from URL
      if (route.params.folderPath) {
        currentFolderPath.value = route.params.folderPath;
      }
      
      // Load file selection from query
      if (route.query.file) {
        // We'll need to find the actual file object later
        // For now, just store the file identifier
        selectedFile.value = { id: route.query.file };
      }
    };

    const handleRoomPermissionRequest = async (room) => {
      // Show user-friendly prompt for permission
      const userWantsAccess = confirm(
        `This shared link requires access to the folder "${room.title}". ` +
        'Would you like to grant permission to view this content?'
      );
      
      if (userWantsAccess) {
        const granted = await roomService.requestRoomPermission(room.id);
        if (granted) {
          selectedRoom.value = room.id;
          // Refresh the room to load files
          await roomService.refreshRoom(room.id);
        } else {
          alert('Permission was denied. Cannot access the shared content.');
        }
      } else {
        console.log('User declined permission request');
      }
    };

    const buildFolderTree = (files) => {
      if (!files || files.length === 0) {
        return [];
      }
      
      const tree = new Map();
      
      files.forEach(file => {
        // Handle both fullPath and path+name patterns
        let fullPath = '';
        if (file.fullPath) {
          fullPath = file.fullPath;
        } else if (file.path && file.name) {
          // If path is empty, just use name
          fullPath = file.path ? `${file.path}/${file.name}` : file.name;
        } else if (file.name) {
          fullPath = file.name;
        } else {
          console.warn('File missing path information:', file);
          return;
        }
        
        const pathParts = fullPath.split('/').filter(p => p); // Remove empty parts
        let currentLevel = tree;
        let currentPath = '';
        
        // Build folder structure
        for (let i = 0; i < pathParts.length; i++) {
          const part = pathParts[i];
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          const isLastPart = i === pathParts.length - 1;
          
          if (!currentLevel.has(part)) {
            currentLevel.set(part, {
              name: part,
              path: currentPath,
              isFolder: !isLastPart,
              children: isLastPart ? null : new Map(),
              // File properties (only for files)
              ...(isLastPart ? {
                id: file.id,
                type: file.type || file.mimetype,
                size: file.size,
                blobUrl: file.blobUrl,
                handle: file.handle
              } : {})
            });
          } else if (!isLastPart) {
            // Ensure intermediate folders exist
            const existing = currentLevel.get(part);
            if (!existing.children) {
              existing.children = new Map();
              existing.isFolder = true;
            }
          }
          
          if (!isLastPart) {
            currentLevel = currentLevel.get(part).children;
          }
        }
      });
      
      return convertMapToArray(tree);
    };
    
    const convertMapToArray = (map) => {
      return Array.from(map.values())
        .sort((a, b) => {
          // Folders first, then files
          if (a.isFolder && !b.isFolder) return -1;
          if (!a.isFolder && b.isFolder) return 1;
          return a.name.localeCompare(b.name);
        })
        .map(node => ({
          ...node,
          children: node.children ? convertMapToArray(node.children) : null
        }));
    };
    
    const selectTreeItem = (item) => {
      if (!item.isFolder) {
        selectedFile.value = item;
        console.log('Selected file from tree:', item);
        // TODO: Navigate to file detail view or emit event
      }
    };
    
    const toggleFolder = (folderData) => {
      console.log('Toggled folder:', folderData.path, 'expanded:', folderData.expanded);
    };

    const createNewRoom = async () => {
      if (!isFileSystemAccessApiSupported.value) {
        alert('File System Access API is not supported in this browser. Please use Chrome 86+, Edge 86+, or another compatible browser.');
        return;
      }

      // Prevent double-clicks or multiple simultaneous requests
      if (isCreatingRoom.value) {
        console.log('Room creation already in progress');
        return;
      }

      isCreatingRoom.value = true;
      createRoomError.value = null;
      createRoomProgress.value = null;

      try {
        const room = await roomService.createRoomFromDirectory((progress) => {
          createRoomProgress.value = progress;
          console.log('Progress update:', progress.type, progress.message);
          
          // You could show a toast notification or progress indicator here
          switch (progress.type) {
            case 'directory_picker':
              console.log(progress.message);
              break;
            case 'scanning_progress':
              console.log(`Scanning: ${progress.totalFound} files found`);
              break;
            case 'thumbnail_progress':
              if (progress.progress) {
                console.log(`Processing thumbnails: ${progress.progress}%`);
              }
              break;
            case 'room_created':
              console.log(progress.message);
              break;
            case 'error':
              console.error(progress.message);
              break;
          }
        });

        if (room) {
          // Automatically select the new room
          selectedRoom.value = room.id;
          console.log('New room created:', room.title, 'ID:', room.id);
        } else {
          console.log('Room creation returned null (user canceled or error)');
        }

      } catch (error) {
        createRoomError.value = error.message;
        console.error('Failed to create room:', error);
        alert(`Failed to create room: ${error.message}`);
      } finally {
        isCreatingRoom.value = false;
        createRoomProgress.value = null;
      }
    };

    const selectRoom = async (roomId) => {
      const room = roomService.getRoom(roomId);
      
      if (room && room.status === 'permission_needed') {
        // Room needs permission, request it
        await handleRoomPermissionRequest(room);
        return;
      }
      
      selectedRoom.value = roomId;
      currentFolderPath.value = null; // Reset folder path when selecting different room
      selectedFile.value = null; // Reset file selection
      
      // Load files for the selected room
      await loadSelectedRoomFiles();
      
      // Update access time for filesystem rooms
      if (room) {
        roomService.updateRoomAccess(roomId);
      }
      
      // Update URL
      updateUrlFromState();
    };

    const deselectRoom = () => {
      selectedRoom.value = null;
      currentFolderPath.value = null;
      selectedFile.value = null;
      
      // Update URL
      updateUrlFromState();
    };

    const handleBackgroundClick = (event) => {
      // Only deselect if clicking directly on the content area
      if (event.target.classList.contains('content-viewport')) {
        deselectRoom();
      }
      // Close context menu when clicking elsewhere
      if (contextMenu.value.visible) {
        contextMenu.value.visible = false;
        contextMenu.value.roomId = null;
      }
    };

    const toggleInactiveRooms = () => {
      showInactiveRooms.value = !showInactiveRooms.value;
    };

    // Context menu methods
    const toggleRoomMenu = (roomId, event) => {
      event.preventDefault();
      event.stopPropagation();
      
      if (contextMenu.value.visible && contextMenu.value.roomId === roomId) {
        // Close if same room menu is already open
        contextMenu.value.visible = false;
        contextMenu.value.roomId = null;
      } else {
        // Open menu at click position
        const rect = event.target.getBoundingClientRect();
        contextMenu.value.x = rect.right + 8; // Offset from the button
        contextMenu.value.y = rect.top;
        contextMenu.value.roomId = roomId;
        contextMenu.value.visible = true;
      }
    };

    const openRoomSettings = (room) => {
      contextMenu.value.visible = false;
      contextMenu.value.roomId = null;
      
      settingsModal.value.visible = true;
      settingsModal.value.roomId = room.id;
    };
    
    const closeSettingsModal = () => {
      settingsModal.value.visible = false;
      settingsModal.value.roomId = null;
    };
    
    const onTemplateApplied = (data) => {
      console.log('Template applied:', data);
      // TODO: Update room data with new workflow template
      // Refresh the room to show updated folder classifications
      const room = roomService.getRoom(data.roomId);
      if (room) {
        roomService.updateRoomAccess(data.roomId);
      }
    };
    
    const handleFolderSettings = (folder) => {
      settingsModal.value.visible = true;
      settingsModal.value.roomId = selectedRoom.value;
      // Note: The new wizard will handle folder selection internally
    };

    const handleFolderSelected = (folder) => {
      console.log('Folder selected in viewport:', folder);
      currentFolderPath.value = folder.path; // Set the current folder path
      selectedFile.value = null; // Reset file selection when changing folders
      
      // Update URL
      updateUrlFromState();
    };
    
    const handleItemSelected = async (item) => {
      console.log('INLINE VIDEO PLAYER - Item selected in viewport:', item);
      
      // PREVENT ALL NAVIGATION - stay on current page
      console.log('Preventing navigation - keeping video inline');
      
      // Handle video files specifically
      if (item.filetype === 'video' && item.fileHandle) {
        console.log('Processing video file for INLINE playback only');
        try {
          // Create blob URL from file handle for video playback
          const file = await item.fileHandle.getFile();
          const videoUrl = URL.createObjectURL(file);
          
          // Create video playback data
          const videoData = {
            ...item,
            src: videoUrl,
            poster: item.thumbnail || null
          };
          
          console.log('INLINE VIDEO PLAYER - Video data ready:', videoData);
          
          // Store video data for inline playback ONLY - NO NAVIGATION
          selectedVideoData.value = videoData;
          selectedFile.value = item.id;
          
        } catch (error) {
          console.error('Error preparing video for playback:', error);
        }
      } else {
        // For non-video files, clear video data
        console.log('Non-video file selected, clearing video data');
        selectedVideoData.value = null;
        selectedFile.value = item.id;
      }
      
      // Update URL to reflect selected file
      updateUrlFromState();
    };
    
    const closeVideoPlayer = () => {
      if (selectedVideoData.value?.src) {
        URL.revokeObjectURL(selectedVideoData.value.src);
      }
      selectedVideoData.value = null;
      selectedFile.value = null;
      updateUrlFromState();
    };
    
    const onVideoLoaded = () => {
      console.log('Video loaded successfully');
    };

    const navigateUpFolder = () => {
      if (currentFolderPath.value) {
        const pathParts = currentFolderPath.value.split('/');
        if (pathParts.length > 1) {
          currentFolderPath.value = pathParts.slice(0, -1).join('/');
        } else {
          currentFolderPath.value = null; // Go to root of the room
        }
        selectedFile.value = null; // Reset file selection when navigating
        
        // Update URL
        updateUrlFromState();
      }
    };

    const refreshRoom = (room) => {
      contextMenu.value.visible = false;
      contextMenu.value.roomId = null;
      console.log('Refreshing room:', room.name);
      // TODO: Implement room refresh logic
    };

    const toggleRoomActiveStatus = async (room) => {
      contextMenu.value.visible = false;
      contextMenu.value.roomId = null;
      
      const newStatus = !room.isActive;
      const action = newStatus ? 'activate' : 'deactivate';
      
      if (confirm(`Are you sure you want to ${action} "${room.name}"?`)) {
        try {
          const success = await roomService.setRoomActiveStatus(room.id, newStatus);
          if (success) {
            // Status updated successfully
            console.log(`Room ${room.name} ${action}d successfully`);
          } else {
            alert(`Failed to ${action} room "${room.name}"`);
          }
        } catch (error) {
          console.error(`Error ${action}ing room:`, error);
          alert(`Error ${action}ing room: ${error.message}`);
        }
      }
    };

    const wipeAndReindexRoom = async (room) => {
      contextMenu.value.visible = false;
      contextMenu.value.roomId = null;
      
      const confirmMessage = `This will wipe ALL stored data for "${room.name}" including:\n` +
                           `• Database records\n` +
                           `• Thumbnails\n` +
                           `• Analysis results\n\n` +
                           `The room will be re-indexed with current features.\n\n` +
                           `This action cannot be undone. Continue?`;
      
      if (confirm(confirmMessage)) {
        try {
          room.status = 'processing';
          room.loadingMessage = 'Wiping and re-indexing...';
          
          await roomService.wipeAndReindexRoom(room.id, (progress) => {
            console.log('Re-index progress:', progress.message);
            room.loadingMessage = progress.message;
          });
          
          console.log(`Room ${room.name} wiped and re-indexed successfully`);
        } catch (error) {
          console.error('Error wiping and re-indexing room:', error);
          alert(`Error wiping room: ${error.message}`);
          room.status = 'error';
          room.loadingMessage = 'Error during wipe/re-index';
        }
      }
    };

    const removeRoom = (room) => {
      contextMenu.value.visible = false;
      contextMenu.value.roomId = null;
      
      if (confirm(`Are you sure you want to remove "${room.name}"?`)) {
        console.log('Removing room:', room.name);
        if (room.type === 'filesystem') {
          roomService.removeRoom(room.id);
        }
        // If this was the selected room, deselect it
        if (selectedRoom.value === room.id) {
          selectedRoom.value = null;
        }
      }
    };

    // File tree functions
    const toggleFileTree = () => {
      showFileTree.value = !showFileTree.value;
    };

    const selectFile = (file) => {
      selectedFile.value = file;
      // TODO: Could emit an event or navigate to file detail view
      console.log('Selected file:', file);
    };

    const getFileIcon = (file) => {
      const type = file.type || file.mimetype || '';
      
      if (type.startsWith('image/')) return 'image';
      if (type.startsWith('video/')) return 'video';
      if (type.startsWith('audio/')) return 'music';
      if (type.includes('pdf')) return 'file-pdf';
      
      return 'file';
    };

    const getFileIconColor = (file) => {
      const type = file.type || file.mimetype || '';
      
      if (type.startsWith('image/')) return '#10b981'; // green
      if (type.startsWith('video/')) return '#3b82f6'; // blue
      if (type.startsWith('audio/')) return '#f59e0b'; // yellow
      if (type.includes('pdf')) return '#ef4444'; // red
      
      return '#6b7280'; // gray
    };

    const formatFileSize = (bytes) => {
      if (!bytes) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const isActiveRoom = (roomId) => {
      const room = rooms.value.find(r => r.id === roomId);
      return room ? room.isActive : false;
    };

    const getRoomById = (roomId) => {
      return rooms.value.find(r => r.id === roomId) || null;
    };

    // Initialize room service and validate access on mount
    onMounted(async () => {
      // Initialize room service first (loads from IndexedDB)
      await roomService.initializeRoomService();
      
      const fileSystemRooms = roomService.getAllRooms();
      for (const room of fileSystemRooms) {
        await roomService.validateRoomAccess(room.id);
      }
      
      // Load initial state from URL after initialization
      await loadStateFromUrl();
    });

    // Watch for route changes to sync state
    watch(() => route.params, () => {
      loadStateFromUrl();
    }, { deep: true });

    watch(() => route.query, () => {
      if (route.query.file && route.query.file !== selectedFile.value?.id) {
        selectedFile.value = { id: route.query.file };
      }
    }, { deep: true });

    // Watch for room selection changes to load files
    watch(selectedRoom, async (newRoomId, oldRoomId) => {
      if (newRoomId && newRoomId !== oldRoomId) {
        await loadSelectedRoomFiles();
        
        // If room is still processing, set up a watcher to refresh when done
        const room = roomService.getRoom(newRoomId);
        if (room && (room.status === 'loading' || room.status === 'scanning' || room.status === 'processing')) {
          console.log(`Room ${newRoomId} is processing, will refresh files when complete`);
          const refreshWatcher = watch(() => room.status, async (newStatus) => {
            if (newStatus === 'ready') {
              console.log(`Room ${newRoomId} processing complete, refreshing files`);
              await loadSelectedRoomFiles();
              refreshWatcher(); // Stop watching
            }
          });
        }
      }
    });

    return {
      selectedRoom,
      viewMode,
      showInactiveRooms,
      rooms,
      visibleRooms,
      visibleRoomCount,
      totalRoomCount,
      isCreatingRoom,
      createRoomError,
      createRoomProgress,
      isFileSystemAccessSupported: isFileSystemAccessApiSupported,
      createNewRoom,
      selectRoom,
      deselectRoom,
      handleBackgroundClick,
      toggleInactiveRooms,
      isActiveRoom,
      getRoomById,
      // File tree
      showFileTree,
      selectedFile,
      selectedRoomData,
      selectedRoomName,
      selectedRoomFiles,
      isLoadingFiles,
      loadSelectedRoomFiles,
      folderTree,
      toggleFileTree,
      selectFile,
      selectTreeItem,
      toggleFolder,
      getFileIcon,
      getFileIconColor,
      formatFileSize,
      // Context menu
      contextMenu,
      contextMenuStyle,
      toggleRoomMenu,
      openRoomSettings,
      refreshRoom,
      toggleRoomActiveStatus,
      wipeAndReindexRoom,
      removeRoom,
      // Settings modal
      settingsModal,
      closeSettingsModal,
      onTemplateApplied,
      handleFolderSettings,
      handleFolderSelected,
      handleItemSelected,
      closeVideoPlayer,
      onVideoLoaded,
      selectedVideoData,
      navigateUpFolder,
      currentFolderPath,
      // URL State Management
      updateUrlFromState,
      loadStateFromUrl,
      handleRoomPermissionRequest
    };
  }
}
</script>

<style scoped>
.rooms-view {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px);
  width: 100%;
  background-color: #f8f9fa;
}

/* Secondary navigation tabs */
.secondary-nav {
  height: 48px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.tab-container {
  display: flex;
  height: 100%;
}

.tab {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 16px;
  font-weight: 500;
  color: #6c757d;
  font-size: 14px;
  cursor: pointer;
  position: relative;
}

.tab:hover {
  color: #343a40;
}

.tab.active {
  color: #3c5a9b;
  font-weight: 600;
}

.tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background-color: #3c5a9b;
}

/* Main container layout */
.main-container {
  display: flex;
  flex: 1;
  padding: 24px;
  gap: 24px;
  min-height: 0;
}

/* Left sidebar styles */
.rooms-sidebar {
  flex: 0 0 240px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e9ecef;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.toggle-inactive-btn, .add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background: none;
  border: none;
  color: #6c757d;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.toggle-inactive-btn:hover, .add-btn:hover {
  background-color: #f1f5f9;
  color: #3c5a9b;
}

.toggle-inactive-btn.active {
  background-color: #e7f0fd;
  border: 1px solid #d1e4fc;
}

.sidebar-content {
  padding: 8px 0;
  overflow-y: auto;
  flex: 1;
}

.room-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  position: relative;
}

.room-item:hover {
  background-color: #f1f5f9;
}

.room-item.active {
  background-color: #e7f0fd;
}

.room-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 4px;
  background-color: rgba(60, 90, 155, 0.1);
  margin-right: 12px;
}

.room-info {
  flex: 1;
}

.room-name {
  font-size: 14px;
  font-weight: 500;
  color: #2c3e50;
}

.room-path {
  font-size: 11px;
  color: #6c757d;
  margin-top: 2px;
}

.room-options {
  color: #6c757d;
}

.room-status {
  font-size: 12px;
  color: #6c757d;
  margin-top: 2px;
}

.status-error {
  color: #dc2626;
}

.status-warning {
  color: #f59e0b;
  font-weight: 500;
}

/* Inline folder tree styles */
.inline-folder-tree {
  background-color: #f8fafc;
  border-left: 3px solid #3b82f6;
  margin-left: 1rem;
  margin-right: 0.5rem;
  margin-top: 0.25rem;
  margin-bottom: 0.5rem;
  border-radius: 0 0.375rem 0.375rem 0;
  overflow: hidden;
}

.tree-empty-state {
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: #6b7280;
  font-style: italic;
}

.tree-content {
  padding: 0.5rem 0;
  max-height: 300px;
  overflow-y: auto;
}

/* Slide animation for folder tree */
.folder-tree-slide-enter-active,
.folder-tree-slide-leave-active {
  transition: all 0.3s ease;
  transform-origin: top;
}

.folder-tree-slide-enter-from {
  opacity: 0;
  transform: translateY(-10px) scaleY(0.8);
  max-height: 0;
}

.folder-tree-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px) scaleY(0.8);
  max-height: 0;
}

.folder-tree-slide-enter-to,
.folder-tree-slide-leave-from {
  opacity: 1;
  transform: translateY(0) scaleY(1);
  max-height: 300px;
}

.simple-file-item:hover {
  background-color: #f3f4f6;
}

.simple-file-item span {
  flex: 1;
  font-size: 0.875rem;
  color: #374151;
}

.simple-file-item .file-size {
  flex: 0;
  font-size: 0.75rem;
  color: #9ca3af;
}

.empty-state {
  padding: 2rem 1rem;
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
}

.empty-state p {
  margin: 0.25rem 0;
}

.file-tree-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1rem;
  margin-bottom: 0.5rem;
}

.file-tree-header h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.collapse-button {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s;
}

.collapse-button:hover {
  background-color: #f3f4f6;
  color: #111827;
}

.file-tree {
  max-height: 300px;
  overflow-y: auto;
}

.file-tree-item {
  cursor: pointer;
  transition: background-color 0.2s;
}

.file-tree-item:hover {
  background-color: #f9fafb;
}

.file-tree-item.active {
  background-color: #e7f0fd;
}

.file-tree-item-content {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  gap: 0.75rem;
}

.file-tree-item .file-icon {
  width: 1rem;
  height: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-tree-item .file-info {
  flex: 1;
  min-width: 0;
}

.file-tree-item .file-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-tree-item .file-size {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.125rem;
}

/* Content viewport styles */
.content-viewport {
  flex: 1;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Room hero section */
.room-hero {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.hero-image-container {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #343a40;
}

.hero-image {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: rgba(255, 255, 255, 0.6);
  font-size: 24px;
  font-weight: 300;
}

.hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.7));
}

.hero-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px;
  color: #ffffff;
}

.room-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px;
}

.room-meta {
  display: flex;
  align-items: center;
  flex-grow: 1;
  margin-left: 16px;
}

.status-badge {
  display: inline-flex;
  margin-left: 12px;
  background-color: rgba(52, 211, 153, 0.2);
  color: #ffffff;
  padding: 2px 8px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}

/* View controls */
.view-controls {
  margin-left: auto;
}

.view-toggle {
  display: flex;
  background-color: #f8f9fa;
  border-radius: 4px;
  overflow: hidden;
}

.view-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: none;
  color: #6c757d;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-button.active {
  background-color: #e7f0fd;
  color: #3c5a9b;
}

/* Content grid */
.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  padding: 24px;
  overflow-y: auto;
}

.content-item {
  background-color: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  border: 1px solid #e9ecef;
}

.content-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.content-header {
  padding: 12px 16px;
}

.content-header h3 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 500;
  color: #2c3e50;
}

.content-header p {
  margin: 0;
  font-size: 12px;
  color: #6c757d;
}

.content-thumbnail {
  position: relative;
  background-color: #1a1a1a;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.content-thumbnail.video {
  background-color: #1a1a1a;
}

.content-thumbnail.document,
.content-thumbnail.audio,
.content-thumbnail.image {
  background-color: #f1f5f9;
}

.play-button {
  width: 48px;
  height: 48px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
}

.document-icon,
.audio-icon {
  color: #6c757d;
  font-size: 48px;
}

.image-placeholder {
  color: #6c757d;
  font-size: 20px;
  font-weight: 300;
}

/* Room cards for the "all rooms" view */
.rooms-container {
  padding: 24px;
}

.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  column-gap: 24px;
  row-gap: 24px;
}

.room-card {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: rgba(0, 0, 0, .1) 0 1px 3px;
  cursor: pointer;
  overflow: hidden;
  transition: transform .2s, box-shadow .2s;
  position: relative;
}

.room-card:hover {
  box-shadow: rgba(0, 0, 0, .1) 0 4px 6px;
  transform: translateY(-4px);
}

.room-card-header {
  align-items: center;
  background-color: #f9fafb;
  display: flex;
  justify-content: space-between;
  padding: 16px;
}

.room-icon {
  align-items: center;
  background-color: rgba(60, 90, 155, .1);
  border-radius: 8px;
  color: #3c5a9b;
  display: flex;
  font-size: 20px;
  height: 40px;
  justify-content: center;
  width: 40px;
}

.room-options {
  color: #6b7280;
  font-weight: 700;
}

.room-card-content {
  padding: 16px;
  position: relative;
  z-index: 1;
}

.room-card-content.has-thumbnail {
  background: linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.8));
  color: white;
}

.room-card-content.has-thumbnail .room-card-title {
  color: white;
}

.room-card-content.has-thumbnail .room-card-stats {
  color: rgba(255, 255, 255, 0.9);
}

.room-card-title {
  color: #111827;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px;
}

.room-card-stats {
  color: #6b7280;
  font-size: 14px;
  margin: 0 0 12px;
}

.room-card-status {
  display: flex;
  margin-top: 8px;
}

.status-badge {
  background-color: #ecfdf5;
  border-radius: 9999px;
  color: #065f46;
  display: inline-block;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 8px;
  margin-left: 0;
}

.status-badge.inactive {
  background-color: #f3f4f6;
  color: #6b7280;
}

.room-header {
  padding: 24px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  flex-direction: column;
}

.room-title {
  margin: 0;
  padding: 0;
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  line-height: 1.4;
}

.room-meta {
  margin: 4px 0 0 0;
  padding: 0;
  font-size: 14px;
  color: #6b7280;
  line-height: 1.4;
}

.view-controls {
  margin-left: auto;
}

.view-toggle {
  display: flex;
  background-color: #f8f9fa;
  border-radius: 4px;
  overflow: hidden;
}

.view-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: none;
  color: #6c757d;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-button.active {
  background-color: #e7f0fd;
  color: #3c5a9b;
}

.rooms-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.room-list-item {
  display: flex;
  align-items: center;
  padding: 20px;
  cursor: pointer;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: rgba(0, 0, 0, .1) 0 1px 3px;
  transition: transform .2s, box-shadow .2s;
}

.room-list-item:hover {
  box-shadow: rgba(0, 0, 0, .1) 0 4px 6px;
  transform: translateY(-2px);
}

.room-list-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 4px;
  background-color: rgba(60, 90, 155, .1);
  margin-right: 16px;
  color: #3c5a9b;
  font-size: 18px;
}

.room-list-info {
  flex: 1;
}

.room-list-info .room-title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.room-list-info .room-stats {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.room-list-item .status-badge {
  margin-left: 16px;
}

.room-count {
  display: block;
  margin-top: 4px;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.4;
}

/* Room Context Menu */
.room-context-menu {
  position: fixed;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid #e5e7eb;
  padding: 4px;
  min-width: 160px;
  z-index: 1000;
}

.context-menu-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #374151;
  transition: background-color 0.2s ease;
}

.context-menu-item:hover {
  background-color: #f3f4f6;
}

.context-menu-item.danger {
  color: #dc2626;
}

.context-menu-item.danger:hover {
  background-color: #fef2f2;
}

.context-menu-item.warning {
  color: #d97706;
}

.context-menu-item.warning:hover {
  background-color: #fef3c7;
}

.context-menu-divider {
  height: 1px;
  background-color: #e5e7eb;
  margin: 4px 0;
}

/* Embedded view styles */
.room-detail {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.room-detail > .collection-view,
.room-detail > .room-view {
  flex: 1;
  border-radius: 0;
  box-shadow: none;
  margin: 0;
  padding: 0;
}

.embedded-view {
  /* Remove duplicate spacing from embedded views */
  margin-top: 0 !important;
  padding-top: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.embedded-view .hero-section {
  border-top-left-radius: 0 !important;
  border-top-right-radius: 0 !important;
}

</style> 