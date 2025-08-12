<template>
  <div class="data-analysis-view">
    <header class="page-header">
      <h1>Data Analysis Dashboard</h1>
      <p>Analyze your Neo4j datasets with interactive visualizations</p>
    </header>
    
    <DataVisualizer />
  </div>
</template>

<script>
import DataVisualizer from '../components/DataVisualizer.vue';

export default {
  name: 'DataAnalysisView',
  components: {
    DataVisualizer
  }
};
</script>

<style scoped>
.data-analysis-view {
  min-height: 100vh;
  background: #f8f9fa;
}

.page-header {
  background: linear-gradient(135deg, #007cba 0%, #0056b3 100%);
  color: white;
  padding: 40px 20px;
  text-align: center;
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0 0 10px 0;
  font-size: 2.5rem;
}

.page-header p {
  margin: 0;
  font-size: 1.1rem;
  opacity: 0.9;
}
</style>