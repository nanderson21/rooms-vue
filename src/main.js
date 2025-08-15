import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { ViewTransitionsPlugin } from 'vue-view-transitions'
import App from './App.vue'
// Legacy CollectionView import removed - using RoomView instead
import RoomItemDetail from './views/RoomItemDetail.vue'
import RoomView from './views/RoomView.vue'
import RoomContentDetail from './views/RoomContentDetail.vue'
import RoomsView from './views/RoomsView.vue'
import FileSystemRoomView from './views/FileSystemRoomView.vue'
import FilmStripDemoView from './views/FilmStripDemoView.vue'
import DataAnalysisView from './views/DataAnalysisView.vue'
import './assets/main.css'

// Font Awesome
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { 
  faDoorOpen, 
  faDoorClosed,
  faFolder, 
  faPlus, 
  faSearch,
  faVideo,
  faTh,
  faList,
  faPlay,
  faFilePdf,
  faMusic,
  faImage,
  faSyncAlt,
  faSpinner,
  faExclamationTriangle,
  faDownload,
  faFile,
  faArrowLeft,
  faChevronDown,
  faChevronRight,
  faCog,
  faLock,
  faDatabase,
  faTrash
} from '@fortawesome/free-solid-svg-icons'

// Add icons to the library
library.add(
  faDoorOpen,
  faDoorClosed,
  faFolder, 
  faPlus, 
  faSearch, 
  faVideo, 
  faTh, 
  faList, 
  faPlay, 
  faFilePdf, 
  faMusic,
  faImage,
  faSyncAlt,
  faSpinner,
  faExclamationTriangle,
  faDownload,
  faFile,
  faArrowLeft,
  faChevronDown,
  faChevronRight,
  faCog,
  faLock,
  faDatabase,
  faTrash
)

// Define a proper polyfill for browsers that don't support View Transitions API
if (!document.startViewTransition) {
  document.startViewTransition = (callback) => {
    const transition = {
      ready: Promise.resolve(),
      finished: Promise.resolve(),
    };
    
    // Execute the callback immediately
    callback();
    
    return transition;
  };
}

// Make sure the document includes the proper meta tag
if (!document.querySelector('meta[name="view-transition"]')) {
  const meta = document.createElement('meta');
  meta.name = 'view-transition';
  meta.content = 'same-origin';
  document.head.appendChild(meta);
}

const routes = [
  { 
    path: '/', 
    redirect: '/files/rooms',
    meta: { transition: 'view' }
  },
  { 
    path: '/collection/:id', 
    component: RoomView, 
    name: 'collection',
    meta: { transition: 'view' }
  },
  { 
    path: '/collection/:id/item/:itemId', 
    component: RoomItemDetail, 
    name: 'item',
    meta: { transition: 'view' }
  },
  // Room routes (legacy)
  { 
    path: '/room', 
    component: RoomView, 
    name: 'rooms-legacy',
    meta: { transition: 'view' }
  },
  { 
    path: '/room/:id', 
    component: RoomView, 
    name: 'room-legacy',
    meta: { transition: 'view' }
  },
  { 
    path: '/room/:id/content/:itemId', 
    component: RoomContentDetail, 
    name: 'room-content',
    meta: { transition: 'view' }
  },
  // Spaces routes (new primary routes)
  {
    path: '/files/rooms',
    component: RoomsView,
    name: 'spaces',
    meta: { transition: 'view' }
  },
  {
    path: '/files/rooms/:roomId',
    component: RoomsView,
    name: 'spaces-room',
    meta: { transition: 'view' }
  },
  {
    path: '/files/rooms/:roomId/:folderPath(.*)',
    component: RoomsView,
    name: 'spaces-folder',
    meta: { transition: 'view' }
  },
  // Legacy redirects
  {
    path: '/spaces',
    redirect: '/files/rooms',
    meta: { transition: 'view' }
  },
  {
    path: '/spaces/filesystem-room/:roomId',
    redirect: to => `/files/rooms/${to.params.roomId}`,
    meta: { transition: 'view' }
  },
  {
    path: '/spaces/filesystem-room/:roomId/file/:fileId',
    redirect: to => `/files/rooms/${to.params.roomId}?file=${to.params.fileId}`,
    meta: { transition: 'view' }
  },
  // Film Strip Demo route
  {
    path: '/film-strip-demo',
    component: FilmStripDemoView,
    name: 'film-strip-demo',
    meta: { transition: 'view' }
  },
  // Data Analysis route
  {
    path: '/data-analysis',
    component: DataAnalysisView,
    name: 'data-analysis',
    meta: { transition: 'view' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Initialize app
const app = createApp(App)

// Register the FontAwesomeIcon component
app.component('font-awesome-icon', FontAwesomeIcon)

// Register the router first
app.use(router)

// Register ViewTransitionsPlugin with explicit configuration
app.use(ViewTransitionsPlugin, {
  // Enable the directive for named transitions
  enableDirective: true,
  // Use router integration mode
  router: true,
  // Explicitly enable the transition root (whole page transitions)
  enableTransitionRoot: true
})

app.mount('#app')