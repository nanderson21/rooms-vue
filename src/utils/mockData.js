// Mock data for rooms and media items (collections maintained for backward compatibility)
// Example sprite URL for video scrubbing (5x10 grid of frames)
const exampleSpriteUrl = 'https://i.imgur.com/qX5VT3S.jpg'; // Sample sprite sheet

export const collections = [
  {
    id: 'nab-demo',
    title: 'NAB 2025 Demo',
    description: 'Collection of NAB 2025 demo materials',
    thumbnail: 'https://placehold.co/600x400',
    totalSize: '2.3 GB',
    status: 'active',
    statusText: 'Active',
  }
];

// Mock media items within the collection
export const mediaItems = [
  {
    id: '1',
    projectId: 'nab-demo',
    title: 'Intro Video',
    description: 'Introduction to the NAB 2025 Demo',
    thumbnail: 'https://placehold.co/600x400',
    spriteUrl: exampleSpriteUrl,
    previewVideo: 'https://vjs.zencdn.net/v/oceans.mp4',
    mimetype: 'video/mp4',
    filetype: 'video',
    filesize: '52.3 MB',
    duration: '0:32',
    width: 1920,
    height: 1080,
    createdDate: '2025-03-15',
    modifiedDate: '2025-03-18',
  },
  {
    id: '2',
    projectId: 'nab-demo',
    title: 'Product Overview',
    description: 'Overview of the new product line',
    thumbnail: 'https://placehold.co/600x400',
    spriteUrl: exampleSpriteUrl,
    previewVideo: 'https://vjs.zencdn.net/v/oceans.mp4',
    mimetype: 'video/mp4',
    filetype: 'video',
    filesize: '78.6 MB',
    duration: '1:15',
    width: 1920,
    height: 1080,
    createdDate: '2025-03-16',
    modifiedDate: '2025-03-18',
  },
  {
    id: '3',
    projectId: 'nab-demo',
    title: 'Feature Highlights',
    description: 'Highlights of key features',
    thumbnail: 'https://placehold.co/600x400',
    spriteUrl: exampleSpriteUrl,
    previewVideo: 'https://vjs.zencdn.net/v/oceans.mp4',
    mimetype: 'video/mp4',
    filetype: 'video',
    filesize: '64.2 MB',
    duration: '0:45',
    width: 1920,
    height: 1080,
    createdDate: '2025-03-17',
    modifiedDate: '2025-03-18',
  },
  {
    id: '4',
    projectId: 'nab-demo',
    title: 'Presentation Slides',
    description: 'Presentation slides for the NAB 2025 Demo',
    thumbnail: 'https://placehold.co/600x400',
    mimetype: 'application/pdf',
    filetype: 'pdf',
    filesize: '3.2 MB',
    createdDate: '2025-03-18',
    modifiedDate: '2025-03-18',
  },
  {
    id: '5',
    projectId: 'nab-demo',
    title: 'Demo Audio',
    description: 'Audio track for the NAB 2025 Demo',
    thumbnail: 'https://placehold.co/600x400',
    mimetype: 'audio/mp3',
    filetype: 'audio',
    filesize: '8.7 MB',
    duration: '3:22',
    createdDate: '2025-03-14',
    modifiedDate: '2025-03-18',
  },
  {
    id: '6',
    projectId: 'nab-demo',
    title: 'Booth Photo',
    description: 'Photo of the NAB 2025 booth',
    thumbnail: 'https://placehold.co/600x400',
    mimetype: 'image/jpeg',
    filetype: 'image',
    filesize: '1.5 MB',
    width: 3000,
    height: 2000,
    createdDate: '2025-03-19',
    modifiedDate: '2025-03-19',
  }
];

// Mock comments for the media items
export const commentsStorage = {
  'nab-demo-1': [
    {
      id: 'comment-1',
      content: 'Great intro sequence!',
      timestamp: 5.5,
      author: {
        id: 'user-1',
        name: 'John Doe',
        avatar: 'https://randomuser.me/api/portraits/men/32.jpg'
      },
      createdAt: '2025-03-19T10:23:45Z'
    },
    {
      id: 'comment-2',
      content: 'The logo animation needs to be a bit faster here',
      timestamp: 12.8,
      author: {
        id: 'user-2',
        name: 'Jane Smith',
        avatar: 'https://randomuser.me/api/portraits/women/44.jpg'
      },
      createdAt: '2025-03-19T10:25:12Z'
    }
  ],
  'nab-demo-2': [
    {
      id: 'comment-3',
      content: 'Can we highlight this feature more prominently?',
      timestamp: 20.5,
      author: {
        id: 'user-1',
        name: 'John Doe',
        avatar: 'https://randomuser.me/api/portraits/men/32.jpg'
      },
      createdAt: '2025-03-19T11:15:22Z'
    }
  ]
};

// Helper function to get a room by ID
export function getRoom(id) {
  return collections.find(collection => collection.id === id) || null;
}

// Backward compatibility alias
export function getCollection(id) {
  return getRoom(id);
}

// Helper function to get media items for a room
export function getRoomItems(roomId) {
  return mediaItems.filter(item => item.projectId === roomId);
}

// Backward compatibility alias
export function getCollectionItems(collectionId) {
  return getRoomItems(collectionId);
}

// Helper function to get a media item by its ID and collection ID
export function getMediaItem(collectionId, itemId) {
  return mediaItems.find(item => item.projectId === collectionId && item.id === itemId) || null;
}

// Helper function to get all media items
export function getMediaItems() {
  return mediaItems;
}

// Helper function to get comments for a media item
export function getComments(collectionId, itemId) {
  const storageKey = `${collectionId}-${itemId}`;
  return commentsStorage[storageKey] || [];
}

// Helper function to add a comment to a media item
export function addComment(collectionId, itemId, comment) {
  const storageKey = `${collectionId}-${itemId}`;
  if (!commentsStorage[storageKey]) {
    commentsStorage[storageKey] = [];
  }
  commentsStorage[storageKey].push(comment);
  return comment;
}

// Mock data for room example
const rooms = [
  {
    id: 'room-demo',
    title: 'Demo Room',
    thumbnail: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&h=500&q=80',
    description: 'A demo room with various media types',
    dateCreated: '2023-09-15T12:00:00Z',
    totalSize: '1.2 GB',
    status: 'active',
    statusText: 'Active'
  },
  {
    id: 'room-design',
    title: 'Design Project',
    thumbnail: 'https://images.unsplash.com/photo-1595514535215-9a5e0e8e468f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&h=500&q=80',
    description: 'Design assets and mockups',
    dateCreated: '2023-08-10T15:30:00Z',
    totalSize: '850 MB',
    status: 'team',
    statusText: 'Team Access'
  },
  {
    id: 'room-secure',
    title: 'Secure Documents',
    thumbnail: 'https://images.unsplash.com/photo-1639322537504-6427a16b0a28?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&h=500&q=80',
    description: 'Encrypted documents with restricted access',
    dateCreated: '2023-07-22T09:15:00Z',
    totalSize: '450 MB',
    status: 'secure',
    statusText: 'End-to-end Encrypted'
  }
];

// Mock data for room contents
const roomContents = {
  'room-demo': [
    {
      id: 'room-content-1',
      title: 'Product Demo Video',
      description: 'New product line demonstration',
      thumbnail: 'https://images.unsplash.com/photo-1626544827763-d516dce335e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=450&q=80',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      spriteUrl: exampleSpriteUrl,
      mimetype: 'video/mp4',
      filetype: 'video',
      filesize: '158.3 MB',
      duration: '9:56',
      width: 1920,
      height: 1080,
      createdDate: '2023-09-10',
      modifiedDate: '2023-09-12',
      status: 'review',
      comments: [
        {
          id: 'comment-1',
          content: 'Great opening sequence',
          timestamp: 15.5,
          author: {
            id: 'user-1',
            name: 'Alex Designer',
            avatar: 'https://randomuser.me/api/portraits/women/12.jpg'
          },
          createdAt: '2023-09-11T14:30:00Z'
        },
        {
          id: 'comment-2',
          content: 'The transition here needs work',
          timestamp: 65.2,
          author: {
            id: 'user-2',
            name: 'Jordan Producer',
            avatar: 'https://randomuser.me/api/portraits/men/32.jpg'
          },
          createdAt: '2023-09-11T15:10:00Z'
        }
      ]
    },
    {
      id: 'room-content-2',
      title: 'Marketing Teaser',
      description: 'Short teaser for social media',
      thumbnail: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=450&q=80',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      spriteUrl: exampleSpriteUrl,
      mimetype: 'video/mp4',
      filetype: 'video',
      filesize: '85.6 MB',
      duration: '10:54',
      width: 1920,
      height: 1080,
      createdDate: '2023-09-14',
      modifiedDate: '2023-09-15',
      status: 'pending',
      comments: [
        {
          id: 'comment-3',
          content: 'Audio levels need adjusting here',
          timestamp: 45.0,
          author: {
            id: 'user-3',
            name: 'Sam Editor',
            avatar: 'https://randomuser.me/api/portraits/women/22.jpg'
          },
          createdAt: '2023-09-15T09:45:00Z'
        }
      ]
    },
    {
      id: 'room-content-3',
      title: 'Project Overview',
      description: 'Project presentation slides',
      thumbnail: 'https://images.unsplash.com/photo-1606857521015-7f9fcf423740?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=450&q=80',
      mimetype: 'application/pdf',
      filetype: 'pdf',
      filesize: '3.8 MB',
      createdDate: '2023-09-05',
      modifiedDate: '2023-09-06',
      status: 'approved',
      comments: []
    },
    {
      id: 'room-content-4',
      title: 'Brand Assets',
      description: 'Logo and brand guidelines',
      thumbnail: 'https://images.unsplash.com/photo-1614332287897-cdc485fa562d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=450&q=80',
      mimetype: 'image/png',
      filetype: 'image',
      filesize: '4.2 MB',
      width: 3000,
      height: 2000,
      createdDate: '2023-08-28',
      modifiedDate: '2023-08-28',
      status: 'approved',
      comments: []
    },
    {
      id: 'room-content-5',
      title: 'Promotional Sizzle',
      description: 'High-energy promotional video',
      thumbnail: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=450&q=80',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      spriteUrl: exampleSpriteUrl,
      mimetype: 'video/mp4',
      filetype: 'video',
      filesize: '74.2 MB',
      duration: '0:15',
      width: 1920,
      height: 1080,
      createdDate: '2023-09-15',
      modifiedDate: '2023-09-15',
      status: 'review',
      comments: []
    },
    {
      id: 'room-content-6',
      title: 'Product Showcase',
      description: 'Interactive product demo',
      thumbnail: 'https://images.unsplash.com/photo-1593642532400-2682810df593?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=450&q=80',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      spriteUrl: exampleSpriteUrl,
      mimetype: 'video/mp4',
      filetype: 'video',
      filesize: '98.7 MB',
      duration: '15:01',
      width: 1920,
      height: 1080,
      createdDate: '2023-09-02',
      modifiedDate: '2023-09-03',
      status: 'pending',
      comments: []
    }
  ],
  'room-design': [
    {
      id: 'design-item-1',
      title: 'Logo Variations',
      description: 'Different color variations of the logo',
      filetype: 'SVG Image',
      mimetype: 'image/svg+xml',
      thumbnail: 'https://images.unsplash.com/photo-1545235617-9465d2a55698?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=800&q=80',
      url: 'https://images.unsplash.com/photo-1545235617-9465d2a55698?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&h=900&q=80',
      size: 1200000,
      dateAdded: '2023-08-05T14:20:00Z',
      tags: ['logo', 'design', 'brand']
    },
    {
      id: 'design-item-2',
      title: 'Website Wireframes',
      description: 'Low-fidelity wireframes for the website redesign',
      filetype: 'PDF Document',
      mimetype: 'application/pdf',
      thumbnail: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=800&q=80',
      url: '#',
      size: 3800000,
      dateAdded: '2023-08-03T11:10:00Z',
      tags: ['wireframe', 'website', 'ux']
    }
  ],
  'room-secure': [
    {
      id: 'secure-item-1',
      title: 'Financial Report',
      description: 'Q3 financial report for stakeholders',
      filetype: 'PDF Document',
      mimetype: 'application/pdf',
      thumbnail: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=800&q=80',
      url: '#',
      size: 5200000,
      dateAdded: '2023-07-20T10:45:00Z',
      tags: ['financial', 'report', 'confidential']
    }
  ]
};

// Export room data getters and rooms data
export function getRooms() {
  return rooms;
}

export function getRoomData(roomId) {
  return rooms.find(room => room.id === roomId);
}

export function getRoomContents(roomId) {
  return roomContents[roomId] || [];
}

export function getRoomContent(roomId, contentId) {
  const contents = roomContents[roomId] || [];
  return contents.find(item => item.id === contentId);
}

// Export rooms and roomContents directly to allow direct access in diagnostic utilities
export { rooms, roomContents };