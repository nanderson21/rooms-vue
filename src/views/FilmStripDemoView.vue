<template>
  <div class="film-strip-demo">
    <div class="demo-header">
      <h1>Film Strip Viewer Demo</h1>
      <p>Hover and scrub over the film strip to see the projector-like effect</p>
    </div>
    
    <div class="demo-container">
      <!-- Local sprite sheet example -->
      <h2>Local Sprite Sheet</h2>
      <FilmStripViewer
        :spriteUrl="'/assets/scrub_sheet.webp'"
        :width="600"
        :height="400"
        :rows="10"
        :columns="10"
        :autoAnimate="false"
        class="film-strip-example"
      >
        <template #overlay>
          <div class="preview-badge">Local File</div>
        </template>
        <template #label>
          Local Sprite Sheet
        </template>
      </FilmStripViewer>
      
      <!-- Remote sprite sheet example -->
      <h2 class="section-title">Remote Sprite Sheet</h2>
      <FilmStripViewer
        :spriteUrl="'https://assets.frame.io/scrub/85399b22-08ad-43af-81de-9d76c20fc7ae/scrub_sheet.jpg?v=2'"
        :width="600"
        :height="400"
        :rows="10"
        :columns="10"
        :autoAnimate="false"
        class="film-strip-example"
      >
        <template #overlay>
          <div class="preview-badge">Frame.io Example</div>
        </template>
        <template #label>
          Frame.io Sprite Sheet
        </template>
      </FilmStripViewer>
      
      <div class="instructions">
        <h3>How It Works</h3>
        <ul>
          <li>The film strip shows frames in a vertical layout like a traditional film strip</li>
          <li>The top and bottom frames are partially visible, showing the continuous nature of film</li>
          <li>Realistic sprocket holes appear on both sides of the film</li>
          <li>Hover your mouse over the viewer to scrub through the content</li>
          <li>The sprite sheet contains a 10×10 grid of 16:9 frames</li>
          <li>The middle frame is highlighted with a subtle glow effect</li>
          <li>Using Frame.io's scale/translate transform approach for accurate frame positioning</li>
        </ul>
      </div>
      
      <!-- Show original dynamic content if available -->
      <div v-if="demoItems.length > 0" class="other-examples">
        <h2>Additional Examples</h2>
        <FilmStripViewer
          v-for="item in demoItems"
          :key="item.id"
          :spriteUrl="item.spriteUrl"
          :width="600"
          :height="400"
          :rows="10"
          :columns="10"
          :autoAnimate="false"
          class="film-strip-example"
        >
          <template #overlay>
            <div class="preview-badge">{{ item.title }}</div>
          </template>
          <template #label>
            {{ item.title }}
          </template>
        </FilmStripViewer>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import FilmStripViewer from '../components/scrubbable/FilmStripViewer.vue';
import { getMediaItems } from '../utils/mockData';

export default {
  name: 'FilmStripDemoView',
  
  components: {
    FilmStripViewer
  },
  
  setup() {
    // Get media items that have sprite sheets
    const mediaItems = getMediaItems();
    const demoItems = ref(
      mediaItems
        .filter(item => item.spriteUrl)
        .slice(0, 2)
        .map(item => ({
          ...item,
          rows: 10,
          columns: 10
        }))
    );
    
    return {
      demoItems
    };
  }
};
</script>

<style scoped>
.film-strip-demo {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.demo-header {
  margin-bottom: 30px;
  text-align: center;
}

.demo-header h1 {
  font-size: 32px;
  margin-bottom: 10px;
}

.demo-header p {
  font-size: 16px;
  color: #666;
}

.section-title {
  margin-top: 40px;
  margin-bottom: 20px;
  color: #3c5a9b;
  font-size: 24px;
  text-align: center;
}

h2 {
  margin: 30px 0 20px;
  text-align: center;
  color: #3c5a9b;
}

.demo-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  padding-bottom: 60px;
}

.instructions {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  width: 600px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  margin-top: 20px;
}

.instructions h3 {
  font-size: 18px;
  margin-bottom: 15px;
  color: #3c5a9b;
}

.instructions ul {
  padding-left: 20px;
}

.instructions li {
  margin-bottom: 8px;
  line-height: 1.5;
  color: #555;
}

.other-examples {
  width: 100%;
  margin-top: 40px;
  display: flex;
  flex-direction: column;
  gap: 60px;
  align-items: center;
}

.other-examples h2 {
  font-size: 24px;
  margin-bottom: 20px;
}

.film-strip-example {
  position: relative;
  margin-bottom: 20px;
}

.preview-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: bold;
}
</style> 