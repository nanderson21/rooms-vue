<template>
  <div class="spaces-view" @click="handleBackgroundClick">
    <!-- Secondary tabs navigation -->
    <div class="secondary-nav">
      <div class="tab-container">
        <div class="tab">Spaces</div>
        <div class="tab">Ingest</div>
        <div class="tab">Templates</div>
        <div class="tab">Snapshots</div>
        <div class="tab">Libraries</div>
        <div class="tab active" @click.stop="deselectRoom">Rooms</div>
      </div>
    </div>
    
    <!-- Main content with grey backdrop -->
    <div class="main-container">
      <!-- Left Sidebar (Rooms list) -->
      <div class="spaces-sidebar">
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
            <button class="add-btn">
              <font-awesome-icon :icon="['fas', 'plus']" />
            </button>
          </div>
        </div>
        <div class="sidebar-content">
          <!-- Room items -->
          <div 
            v-if="showInactiveRooms || isActiveRoom('nab-2025-demo')"
            class="room-item" 
            :class="{ active: selectedRoom === 'nab-2025-demo' }"
            @click.stop="selectRoom('nab-2025-demo')"
          >
            <div class="room-icon">
              <font-awesome-icon :icon="['fas', 'door-open']" style="color: #3c5a9b;" />
            </div>
            <div class="room-info">
              <div class="room-name">NAB 2025 Demo</div>
            </div>
            <div class="room-options">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="19" cy="12" r="1"></circle>
                <circle cx="5" cy="12" r="1"></circle>
              </svg>
            </div>
          </div>
          
          <!-- Other room item -->
          <div 
            v-if="showInactiveRooms || isActiveRoom('demo-room')"
            class="room-item" 
            :class="{ active: selectedRoom === 'demo-room' }"
            @click.stop="selectRoom('demo-room')"
          >
            <div class="room-icon">
              <font-awesome-icon :icon="['fas', 'door-closed']" style="color: #626262;" />
            </div>
            <div class="room-info">
              <div class="room-name">Demo Room</div>
            </div>
            <div class="room-options">•••</div>
          </div>
        </div>
      </div>
      
      <!-- Right Content Viewport -->
      <div class="content-viewport" @click.stop="deselectRoom">
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
              <div v-if="showInactiveRooms || isActiveRoom('nab-2025-demo')" class="room-card" @click.stop="selectRoom('nab-2025-demo')">
                <div class="room-card-header">
                  <div class="room-icon">
                    <font-awesome-icon :icon="['fas', 'door-open']" />
                  </div>
                  <div class="room-options">•••</div>
                </div>
                <div class="room-card-content">
                  <h3 class="room-card-title">NAB 2025 Demo</h3>
                  <p class="room-card-stats">6 items with video preview • 2.3 GB</p>
                  <div class="room-card-status">
                    <span class="status-badge active">Active</span>
                  </div>
                </div>
              </div>
              
              <div v-if="showInactiveRooms || isActiveRoom('demo-room')" class="room-card" @click.stop="selectRoom('demo-room')">
                <div class="room-card-header">
                  <div class="room-icon">
                    <font-awesome-icon :icon="['fas', 'door-closed']" style="color: #626262;" />
                  </div>
                  <div class="room-options">•••</div>
                </div>
                <div class="room-card-content">
                  <h3 class="room-card-title">Demo Room</h3>
                  <p class="room-card-stats">3 items • 1.5 GB</p>
                  <div class="room-card-status">
                    <span class="status-badge inactive">Inactive</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- List view -->
            <div v-else class="rooms-list">
              <div v-if="showInactiveRooms || isActiveRoom('nab-2025-demo')" class="room-list-item" @click.stop="selectRoom('nab-2025-demo')">
                <div class="room-list-icon">
                  <font-awesome-icon :icon="['fas', 'door-open']" />
                </div>
                <div class="room-list-info">
                  <h3 class="room-title">NAB 2025 Demo</h3>
                  <p class="room-stats">6 items with video preview • 2.3 GB</p>
                </div>
                <span class="status-badge">Active</span>
              </div>
              
              <div v-if="showInactiveRooms || isActiveRoom('demo-room')" class="room-list-item" @click.stop="selectRoom('demo-room')">
                <div class="room-list-icon">
                  <font-awesome-icon :icon="['fas', 'door-closed']" style="color: #626262;" />
                </div>
                <div class="room-list-info">
                  <h3 class="room-title">Demo Room</h3>
                  <p class="room-stats">3 items • 1.5 GB</p>
                </div>
                <span class="status-badge status-inactive">Inactive</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- NAB 2025 Demo is selected -->
        <div v-else-if="selectedRoom === 'nab-2025-demo'" class="room-detail">
          <CollectionView class="embedded-view" />
        </div>
        
        <!-- Demo Room content -->
        <div v-else-if="selectedRoom === 'demo-room'" class="room-detail">
          <RoomView class="embedded-view" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import CollectionView from './CollectionView.vue';
import RoomView from './RoomView.vue';

export default {
  name: 'SpacesView',
  components: {
    CollectionView,
    RoomView
  },
  data() {
    return {
      selectedRoom: null,
      viewMode: 'grid',
      showInactiveRooms: true,
      rooms: [
        { id: 'nab-2025-demo', name: 'NAB 2025 Demo', isActive: true, itemCount: 6, hasVideo: true, size: '2.3 GB' },
        { id: 'demo-room', name: 'Demo Room', isActive: false, itemCount: 3, hasVideo: false, size: '1.5 GB' }
      ]
    }
  },
  computed: {
    visibleRooms() {
      return this.rooms.filter(room => this.showInactiveRooms || room.isActive);
    },
    visibleRoomCount() {
      return this.visibleRooms.length;
    },
    totalRoomCount() {
      return this.rooms.length;
    }
  },
  methods: {
    selectRoom(roomId) {
      this.selectedRoom = roomId;
    },
    deselectRoom() {
      this.selectedRoom = null;
    },
    handleBackgroundClick(event) {
      // Only deselect if clicking directly on the content area
      if (event.target.classList.contains('content-viewport')) {
        this.deselectRoom();
      }
    },
    toggleInactiveRooms() {
      this.showInactiveRooms = !this.showInactiveRooms;
    },
    isActiveRoom(roomId) {
      const room = this.rooms.find(r => r.id === roomId);
      return room ? room.isActive : false;
    },
    getRoomById(roomId) {
      return this.rooms.find(r => r.id === roomId) || null;
    }
  }
}
</script>

<style scoped>
.spaces-view {
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
  overflow: hidden;
  gap: 24px;
}

/* Left sidebar styles */
.spaces-sidebar {
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

.room-options {
  color: #6c757d;
}

/* Content viewport styles */
.content-viewport {
  flex: 1;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
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