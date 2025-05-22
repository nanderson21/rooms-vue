// Diagnostic utilities to help debug the application
import { collections, mediaItems, rooms, roomContents } from './mockData';

export function checkCollectionData() {
  // Use imported mock data
  
  // Log diagnostic information
  console.log('=== DIAGNOSTIC INFORMATION ===');
  console.log('Collections:', collections.length);
  console.log('Collection sample:', collections[0]);
  console.log('Media items:', mediaItems.length);
  console.log('Media items sample:', mediaItems[0]);
  
  // Check for data validity
  const hasValidCollections = collections && collections.length > 0;
  const hasValidMediaItems = mediaItems && mediaItems.length > 0;
  
  return {
    hasValidCollections,
    hasValidMediaItems,
    collectionsCount: collections.length,
    mediaItemsCount: mediaItems.length
  };
}

export function checkRoomData(roomId) {
  console.log('=== ROOM DIAGNOSTIC ===');
  
  // Check if rooms data is available
  const hasRooms = rooms && rooms.length > 0;
  console.log('Rooms available:', hasRooms);
  if (hasRooms) {
    console.log('Room count:', rooms.length);
    console.log('Room IDs:', rooms.map(r => r.id));
  }
  
  // Check if the specific room exists
  const room = rooms.find(r => r.id === roomId);
  console.log('Room found:', !!room, room ? room.id : 'not found');
  
  // Check if room has content
  const contents = roomContents[roomId] || [];
  console.log('Room contents count:', contents.length);
  
  // Log video content specifically
  const videoContents = contents.filter(item => 
    item.mimetype?.includes('video') || item.filetype?.includes('video')
  );
  console.log('Video content count:', videoContents.length);
  if (videoContents.length > 0) {
    console.log('Video content sample:', videoContents[0]);
  }
  
  return {
    hasRooms,
    roomFound: !!room,
    contentCount: contents.length,
    videoContentCount: videoContents.length
  };
}

export function checkRouterSetup() {
  const currentRoute = window.location.pathname;
  console.log('Current route:', currentRoute);
  return { currentRoute };
}