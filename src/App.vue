<template>
  <div class="app" :class="{ 'debug-view-transitions': isDebugMode }">
    <header class="header">
      <h1>creative.space</h1>
      <nav class="nav-links">
        <router-link to="/" class="nav-link">Collections</router-link>
        <router-link to="/room" class="nav-link">Rooms</router-link>
        <router-link to="/spaces" class="nav-link">
          <font-awesome-icon v-if="hasFontAwesome" :icon="['fas', 'door-open']" style="color: #3c5a9b; margin-right: 6px;" />
          Spaces
        </router-link>
        <router-link to="/film-strip-demo" class="nav-link">Film Strip Demo</router-link>
      </nav>
      <div class="header-actions">
        <button class="debug-toggle" @click="toggleDebugMode" v-if="isDebugVisible">Debug</button>
      </div>
    </header>
    <main>
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </main>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      isDebugMode: false,
      isDebugVisible: process.env.NODE_ENV === 'development',
      hasFontAwesome: false
    }
  },
  methods: {
    toggleDebugMode() {
      this.isDebugMode = !this.isDebugMode;
      console.log('Debug mode:', this.isDebugMode);
    }
  },
  mounted() {
    // Fix view transitions meta tag - correct property name
    if (!document.querySelector('meta[name="view-transition"]')) {
      const meta = document.createElement('meta');
      meta.name = 'view-transition';
      meta.content = 'same-origin';
      document.head.appendChild(meta);
    }
    
    // Check if FontAwesome is available
    this.hasFontAwesome = typeof this.$root.$options?.components?.FontAwesomeIcon !== 'undefined';
    
    console.log('App mounted');
    console.log('View transitions supported:', !!document.startViewTransition);

    // Add some debug logs to help diagnose issues
    document.addEventListener('startViewTransition', (e) => {
      console.log('View transition started');
    });

    if (window.matchMedia) {
      console.log('Reduced motion preference:', 
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
  }
}
</script>

<style>
.app {
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
    Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  margin: 0;
  padding: 0;
}

.header {
  padding: 0 16px;
  height: 60px;
  background-color: #fff;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  align-items: center;
}

h1 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  margin-right: 32px;
  color: #3c5a9b;
}

.nav-links {
  display: flex;
  gap: 16px;
  margin-right: auto;
}

.nav-link {
  text-decoration: none;
  color: #6c757d;
  font-weight: 500;
  padding: 8px 12px;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  font-size: 14px;
}

.nav-link:hover {
  background-color: #f8f9fa;
  color: #3c5a9b;
}

.nav-link.router-link-active {
  color: #3c5a9b;
  background-color: #e7f0fd;
}

.header-actions {
  display: flex;
  align-items: center;
}

.debug-toggle {
  background-color: #f1f5f9;
  color: #6c757d;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.debug-toggle:hover {
  background-color: #e5e9f0;
}

main {
  height: calc(100vh - 60px);
  overflow: hidden;
}

/* Core view transitions overrides */
::view-transition-group(image),
::view-transition-group(video-image) {
  height: 100% !important;
  width: 100% !important;
  overflow: hidden;
  contain: paint;
}

/* Text transition overrides */
::view-transition-group(item-title),
::view-transition-group(item-type) {
  width: 100% !important;
  contain: paint;
}

::view-transition-old(item-title),
::view-transition-new(item-title),
::view-transition-old(item-type),
::view-transition-new(item-type) {
  height: 100% !important;
  object-fit: cover !important;
  font-kerning: none !important;
  font-synthesis: none !important;
}
</style>