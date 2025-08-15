<template>
  <div class="data-visualizer">
    <div class="controls">
      <select v-model="selectedDataset" @change="loadDataset" class="dataset-select">
        <option value="">Select Dataset</option>
        <option v-for="dataset in datasets" :key="dataset.name" :value="dataset.name">
          {{ dataset.name }}
        </option>
      </select>
      
      <div class="view-tabs">
        <button 
          v-for="view in views" 
          :key="view.id"
          @click="activeView = view.id"
          :class="{ active: activeView === view.id }"
          class="tab-button"
        >
          {{ view.label }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      Loading data...
    </div>

    <div v-else-if="selectedDataset" class="visualization-container">
      <!-- Overview -->
      <div v-if="activeView === 'overview'" class="overview-view">
        <h3>Database Overview</h3>
        <div class="overview-stats">
          <div class="overview-card">
            <h4>Total Items</h4>
            <div class="big-number">{{ totalItems.toLocaleString() }}</div>
          </div>
          <div class="overview-card">
            <h4>Files</h4>
            <div class="big-number">{{ totalFiles.toLocaleString() }}</div>
          </div>
          <div class="overview-card">
            <h4>Directories</h4>
            <div class="big-number">{{ totalDirs.toLocaleString() }}</div>
          </div>
          <div class="overview-card">
            <h4>Total Size</h4>
            <div class="big-number">{{ formatFileSize(totalSize) }}</div>
          </div>
        </div>
        <div class="sample-data">
          <h4>Sample Files</h4>
          <div class="sample-list">
            <div v-for="file in sampleFiles.slice(0, 10)" :key="file.path" class="sample-item">
              <span class="sample-name">{{ file.name }}</span>
              <span class="sample-path">{{ file.path.substring(0, 80) }}{{ file.path.length > 80 ? '...' : '' }}</span>
              <span class="sample-size">{{ formatFileSize(file.size) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- TreeMap Visualization -->
      <div v-if="activeView === 'treemap'" class="treemap-view">
        <h3>File Size TreeMap</h3>
        <p>Each rectangle represents a file, sized by file size. Hover for details.</p>
        <div class="controls-row">
          <button @click="loadTreeMapData('size')" class="viz-button">By File Size</button>
          <button @click="loadTreeMapData('count')" class="viz-button">By File Count</button>
          <button @click="loadTreeMapData('depth')" class="viz-button">By Directory Depth</button>
        </div>
        <div ref="treemapContainer" class="d3-container"></div>
      </div>

      <!-- Directory Hierarchy -->
      <div v-if="activeView === 'hierarchy'" class="hierarchy-view">
        <h3>Directory Hierarchy</h3>
        <p>Interactive directory tree. Click nodes to expand/collapse.</p>
        <div class="controls-row">
          <input v-model="hierarchyFilter" @input="filterHierarchy" placeholder="Filter paths..." class="filter-input">
          <button @click="loadHierarchyData" class="viz-button">Refresh</button>
        </div>
        <div ref="hierarchyContainer" class="d3-container"></div>
      </div>

      <!-- Network Graph -->
      <div v-if="activeView === 'network'" class="network-view">
        <h3>Directory Network</h3>
        <p>Network showing directory relationships. Larger nodes have more files.</p>
        <div class="controls-row">
          <button @click="loadNetworkData('shallow')" class="viz-button">Top Level</button>
          <button @click="loadNetworkData('medium')" class="viz-button">Medium Depth</button>
          <button @click="loadNetworkData('deep')" class="viz-button">Deep Structure</button>
        </div>
        <div ref="networkContainer" class="d3-container"></div>
      </div>

      <!-- Statistics View -->
      <div v-if="activeView === 'stats'" class="stats-view">
        <h3>Dataset Statistics</h3>
        <div class="stats-grid">
          <div class="stat-card" v-for="stat in stats" :key="stat.label">
            <h4>{{ stat.label }}</h4>
            <div class="stat-value">{{ stat.value }}</div>
          </div>
        </div>
        
        <div class="charts-row">
          <div class="chart-container">
            <h4>File Type Distribution</h4>
            <div ref="fileTypeChart" class="chart"></div>
          </div>
          
          <div class="chart-container">
            <h4>Modification Timeline</h4>
            <div ref="timelineChart" class="chart"></div>
          </div>
        </div>
      </div>

      <!-- File Explorer View -->
      <div v-if="activeView === 'explorer'" class="explorer-view">
        <h3>File Explorer</h3>
        <input 
          v-model="searchQuery" 
          @input="searchFiles"
          placeholder="Search files..."
          class="search-input"
        />
        <div class="controls-row" style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap;">
          <label><input type="checkbox" v-model="flattenFolders"> Flatten folders</label>
          <select v-model="bulkTagName">
            <option value="">Select tag</option>
            <option v-for="t in allTags" :key="t.name" :value="t.name">{{ t.name }}</option>
          </select>
          <input v-model="bulkTagColor" type="color" title="Tag color" />
          <button class="viz-button" @click="applyTagToSelection" :disabled="selectedPaths.length===0 || !bulkTagName">Tag Selected</button>
          <input v-model="groupName" placeholder="Group name" style="padding:6px;border:1px solid #ddd;border-radius:4px;"/>
          <button class="viz-button" @click="addSelectionToGroup" :disabled="selectedPaths.length===0 || !groupName">Add to Group</button>
        </div>
        <div class="file-list">
          <div 
            v-for="file in (flattenFolders ? flattenedResults : searchResults)" 
            :key="file.path"
            class="file-item"
            :class="{ directory: file.isDir }"
          >
            <input type="checkbox" v-model="selection[file.path]" @change="onItemCheck(file)"/>
            <span class="file-name">{{ file.name }}</span>
            <span class="file-path">{{ file.path }}</span>
            <span v-if="!file.isDir" class="file-size">{{ formatFileSize(file.size) }}</span>
          </div>
        </div>
      </div>

      <!-- Large Files View -->
      <div v-if="activeView === 'large'" class="large-files-view">
        <h3>Largest Files</h3>
        <div class="large-files-list">
          <div 
            v-for="file in largestFiles" 
            :key="file.path"
            class="large-file-item"
          >
            <div class="file-info">
              <span class="file-name">{{ file.name }}</span>
              <span class="file-path">{{ file.path }}</span>
            </div>
            <div class="file-size-large">{{ formatFileSize(file.size) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as d3 from 'd3';
import neo4jService from '../services/neo4jService.js';

export default {
  name: 'DataVisualizer',
  data() {
    return {
      datasets: [],
      selectedDataset: '',
      activeView: 'overview',
      loading: false,
      stats: [],
      searchQuery: '',
      searchResults: [],
      largestFiles: [],
      totalItems: 0,
      totalFiles: 0,
      totalDirs: 0,
      totalSize: 0,
      sampleFiles: [],
      hierarchyFilter: '',
      treemapData: null,
      hierarchyData: null,
      networkData: null,
      views: [
        { id: 'overview', label: 'Overview' },
        { id: 'treemap', label: 'TreeMap' },
        { id: 'hierarchy', label: 'Directory Tree' },
        { id: 'network', label: 'Network Graph' },
        { id: 'stats', label: 'Statistics' },
        { id: 'explorer', label: 'Explorer' },
        { id: 'large', label: 'Large Files' }
      ],
      selection: {},
      selectedPaths: [],
      flattenFolders: false,
      flattenedResults: [],
      bulkTagName: '',
      bulkTagColor: '#7F7F7F',
      groupName: '',
      allTags: []
    };
  },
  
  async mounted() {
    await this.loadDatasets();
    // Auto-select the first dataset if available
    if (this.datasets.length > 0) {
      this.selectedDataset = this.datasets[0].name;
      await this.loadDataset();
    }
    // load tags
    try {
      this.allTags = await neo4jService.getAllTags();
    } catch (e) {
      console.warn('Failed to load tags', e);
    }
  },
  
  methods: {
    async loadDatasets() {
      try {
        this.datasets = await neo4jService.getDatasets();
      } catch (error) {
        console.error('Failed to load datasets:', error);
      }
    },
    
    async loadDataset() {
      if (!this.selectedDataset) return;
      
      this.loading = true;
      try {
        // Load actual basic stats from the database
        const basicStats = await neo4jService.getBasicStats();
        if (basicStats.length > 0) {
          const stats = basicStats[0];
          this.totalItems = stats.totalItems || 0;
          this.totalFiles = stats.totalFiles || 0;
          this.totalDirs = stats.totalDirs || 0;
          this.totalSize = stats.totalSize || 0;
        }
        
        // Load actual largest files from the database
        this.sampleFiles = await neo4jService.getLargestFiles(this.selectedDataset, 20);
        
        await Promise.all([
          this.loadStats(),
          this.loadLargestFiles()
        ]);
        
      } catch (error) {
        console.error('Failed to load dataset:', error);
        console.error('Error details:', error.stack);
      } finally {
        this.loading = false;
      }
    },
    
    async loadStats() {
      const [fileStats, fileTypes, timeline] = await Promise.all([
        neo4jService.getFileStats(this.selectedDataset),
        neo4jService.getFileTypeDistribution(this.selectedDataset),
        neo4jService.getModificationTimeline(this.selectedDataset)
      ]);
      
      const totalFiles = fileStats.find(s => !s.isDir)?.count || 0;
      const totalDirs = fileStats.find(s => s.isDir)?.count || 0;
      const totalSize = fileStats.reduce((sum, s) => sum + (s.totalSize || 0), 0);
      
      this.stats = [
        { label: 'Total Files', value: totalFiles.toLocaleString() },
        { label: 'Total Directories', value: totalDirs.toLocaleString() },
        { label: 'Total Size', value: this.formatFileSize(totalSize) },
        { label: 'File Types', value: fileTypes.length }
      ];
      
      this.$nextTick(() => {
        this.renderFileTypeChart(fileTypes);
        this.renderTimelineChart(timeline);
      });
    },
    
    async loadLargestFiles() {
      this.largestFiles = await neo4jService.getLargestFiles(this.selectedDataset, 20);
    },
    
    async searchFiles() {
      if (this.searchQuery.length < 2) {
        this.searchResults = [];
        this.flattenedResults = [];
        return;
      }
      
      this.searchResults = await neo4jService.searchFiles(this.selectedDataset, this.searchQuery);
      if (this.flattenFolders) {
        await this.buildFlattenedResults();
      }
    },
    
    async renderTreeView() {
      const container = this.$refs.treeContainer;
      if (!container) return;
      
      d3.select(container).selectAll("*").remove();
      
      const treeData = await neo4jService.getTreeStructure(this.selectedDataset);
      
      // Create a hierarchical structure
      const root = { name: 'Root', children: [] };
      const pathMap = new Map();
      
      treeData.forEach(item => {
        const path = item.item.properties.path;
        const parts = path.split('/').filter(p => p);
        let current = root;
        
        parts.forEach((part, index) => {
          const currentPath = '/' + parts.slice(0, index + 1).join('/');
          if (!pathMap.has(currentPath)) {
            const node = {
              name: part,
              path: currentPath,
              isDir: item.item.properties.isDir,
              size: item.item.properties.size,
              children: []
            };
            current.children.push(node);
            pathMap.set(currentPath, node);
            current = node;
          } else {
            current = pathMap.get(currentPath);
          }
        });
      });
      
      this.renderD3Tree(container, root);
    },
    
    renderD3Tree(container, data) {
      const width = container.clientWidth || 800;
      const height = 600;
      
      const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
      
      const g = svg.append('g')
        .attr('transform', 'translate(40,0)');
      
      const tree = d3.tree().size([height, width - 160]);
      const root = d3.hierarchy(data);
      
      tree(root);
      
      // Links
      g.selectAll('.link')
        .data(root.links())
        .enter().append('path')
        .attr('class', 'link')
        .attr('d', d3.linkHorizontal()
          .x(d => d.y)
          .y(d => d.x))
        .style('fill', 'none')
        .style('stroke', '#ccc')
        .style('stroke-width', '2px');
      
      // Nodes
      const node = g.selectAll('.node')
        .data(root.descendants())
        .enter().append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.y},${d.x})`);
      
      node.append('circle')
        .attr('r', 5)
        .style('fill', d => d.data.isDir ? '#69b3a2' : '#404080');
      
      node.append('text')
        .attr('dy', '.35em')
        .attr('x', d => d.children ? -13 : 13)
        .style('text-anchor', d => d.children ? 'end' : 'start')
        .style('font-size', '12px')
        .text(d => d.data.name);
    },
    
    renderFileTypeChart(data) {
      const container = this.$refs.fileTypeChart;
      if (!container || !data.length) return;
      
      d3.select(container).selectAll("*").remove();
      
      const width = 300;
      const height = 200;
      const radius = Math.min(width, height) / 2;
      
      const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width/2},${height/2})`);
      
      const color = d3.scaleOrdinal(d3.schemeCategory10);
      const pie = d3.pie().value(d => d.count);
      const arc = d3.arc().innerRadius(0).outerRadius(radius);
      
      const arcs = svg.selectAll('.arc')
        .data(pie(data.slice(0, 8)))
        .enter().append('g')
        .attr('class', 'arc');
      
      arcs.append('path')
        .attr('d', arc)
        .style('fill', (d, i) => color(i));
      
      arcs.append('text')
        .attr('transform', d => `translate(${arc.centroid(d)})`)
        .attr('dy', '.35em')
        .style('text-anchor', 'middle')
        .style('font-size', '10px')
        .text(d => d.data.extension);
    },
    
    renderTimelineChart(data) {
      const container = this.$refs.timelineChart;
      if (!container || !data.length) return;
      
      d3.select(container).selectAll("*").remove();
      
      const margin = { top: 20, right: 30, bottom: 40, left: 40 };
      const width = 400 - margin.left - margin.right;
      const height = 200 - margin.top - margin.bottom;
      
      const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
      
      const x = d3.scaleTime()
        .domain(d3.extent(data, d => new Date(d.date)))
        .range([0, width]);
      
      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.fileCount)])
        .range([height, 0]);
      
      const line = d3.line()
        .x(d => x(new Date(d.date)))
        .y(d => y(d.fileCount));
      
      svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', '#69b3a2')
        .attr('stroke-width', 2)
        .attr('d', line);
      
      svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x));
      
      svg.append('g')
        .call(d3.axisLeft(y));
    },
    
    formatFileSize(bytes) {
      if (!bytes || bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // D3 TreeMap Visualization
    async loadTreeMapData(mode = 'size') {
      try {
        let data;
        if (mode === 'size') {
          data = await neo4jService.getLargestFiles(this.selectedDataset, 100);
        } else if (mode === 'count') {
          data = await neo4jService.getFileTypeDistribution(this.selectedDataset);
        } else if (mode === 'depth') {
          data = await neo4jService.getDirectoryDepthStats();
        }
        
        this.treemapData = data;
        this.$nextTick(() => this.renderTreeMap(mode));
      } catch (error) {
        console.error('Error loading treemap data:', error);
      }
    },

    renderTreeMap(mode) {
      const container = this.$refs.treemapContainer;
      if (!container || !this.treemapData) return;

      d3.select(container).selectAll("*").remove();

      const width = container.clientWidth || 800;
      const height = 600;

      const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

      // Process data based on mode
      let processedData;
      if (mode === 'size') {
        processedData = {
          name: 'Files',
          children: this.treemapData.map(d => ({
            name: d.name,
            value: d.size,
            path: d.path,
            size: d.size
          }))
        };
      } else {
        processedData = {
          name: 'Categories',
          children: this.treemapData.map(d => ({
            name: d.extension || d.depth || d.name,
            value: d.count,
            count: d.count
          }))
        };
      }

      const root = d3.hierarchy(processedData)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);

      const treemap = d3.treemap()
        .size([width, height])
        .padding(2);

      treemap(root);

      const color = d3.scaleOrdinal(d3.schemeCategory10);

      const leaf = svg.selectAll('g')
        .data(root.leaves())
        .enter().append('g')
        .attr('transform', d => `translate(${d.x0},${d.y0})`);

      leaf.append('rect')
        .attr('width', d => d.x1 - d.x0)
        .attr('height', d => d.y1 - d.y0)
        .attr('fill', (d, i) => color(i))
        .attr('stroke', 'white')
        .attr('opacity', 0.7)
        .on('mouseover', function(event, d) {
          d3.select(this).attr('opacity', 1);
          
          // Tooltip
          const tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0,0,0,0.8)')
            .style('color', 'white')
            .style('padding', '8px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '1000');

          if (mode === 'size') {
            tooltip.html(`${d.data.name}<br/>Size: ${this.formatFileSize(d.data.size)}<br/>Path: ${d.data.path}`);
          } else {
            tooltip.html(`${d.data.name}<br/>Count: ${d.data.count}`);
          }

          tooltip.style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
          d3.select(this).attr('opacity', 0.7);
          d3.selectAll('.tooltip').remove();
        });

      leaf.append('text')
        .attr('x', 4)
        .attr('y', 14)
        .style('font-size', '10px')
        .style('fill', 'white')
        .style('font-weight', 'bold')
        .text(d => {
          const width = d.x1 - d.x0;
          const name = d.data.name;
          return width > 60 ? (name.length > 10 ? name.substring(0, 10) + '...' : name) : '';
        });
    },

    // D3 Hierarchy Visualization
    async loadHierarchyData() {
      try {
        const data = await neo4jService.query(`
          MATCH (item:FileSystemItem)
          WHERE item.isDir = true AND size(split(item.path, '/')) <= 4
          RETURN item.path as path, item.name as name, item.size as size
          ORDER BY item.path
          LIMIT 200
        `);
        
        this.hierarchyData = this.buildHierarchy(data);
        this.$nextTick(() => this.renderHierarchy());
      } catch (error) {
        console.error('Error loading hierarchy data:', error);
      }
    },

    buildHierarchy(data) {
      const root = { name: 'Root', children: [], path: '/' };
      const pathMap = new Map();
      pathMap.set('/', root);

      data.forEach(item => {
        const pathParts = item.path.split('/').filter(p => p);
        let current = root;
        let currentPath = '';

        pathParts.forEach((part, index) => {
          currentPath += '/' + part;
          
          if (!pathMap.has(currentPath)) {
            const node = {
              name: part,
              path: currentPath,
              children: [],
              size: item.size || 0
            };
            current.children.push(node);
            pathMap.set(currentPath, node);
          }
          current = pathMap.get(currentPath);
        });
      });

      return root;
    },

    renderHierarchy() {
      const container = this.$refs.hierarchyContainer;
      if (!container || !this.hierarchyData) return;

      d3.select(container).selectAll("*").remove();

      const width = container.clientWidth || 800;
      const height = 600;

      const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

      const g = svg.append('g')
        .attr('transform', 'translate(50,50)');

      const tree = d3.tree()
        .size([height - 100, width - 200]);

      const root = d3.hierarchy(this.hierarchyData);
      tree(root);

      // Links
      g.selectAll('.link')
        .data(root.links())
        .enter().append('path')
        .attr('class', 'link')
        .attr('d', d3.linkHorizontal()
          .x(d => d.y)
          .y(d => d.x))
        .style('fill', 'none')
        .style('stroke', '#ccc')
        .style('stroke-width', '2px');

      // Nodes
      const node = g.selectAll('.node')
        .data(root.descendants())
        .enter().append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.y},${d.x})`)
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
          // Toggle children on click
          if (d.children) {
            d._children = d.children;
            d.children = null;
          } else {
            d.children = d._children;
            d._children = null;
          }
          this.renderHierarchy();
        });

      node.append('circle')
        .attr('r', 6)
        .style('fill', d => d.children ? '#69b3a2' : '#404080')
        .style('stroke', 'white')
        .style('stroke-width', '2px');

      node.append('text')
        .attr('dy', '.35em')
        .attr('x', d => d.children ? -13 : 13)
        .style('text-anchor', d => d.children ? 'end' : 'start')
        .style('font-size', '12px')
        .text(d => d.data.name);
    },

    // D3 Network Graph
    async loadNetworkData(depth = 'shallow') {
      try {
        let maxDepth = depth === 'shallow' ? 2 : depth === 'medium' ? 3 : 4;
        
        const data = await neo4jService.query(`
          MATCH (item:FileSystemItem)
          WHERE item.isDir = true AND size(split(item.path, '/')) <= $maxDepth
          WITH item, size(split(item.path, '/')) as depth
          RETURN item.path as path, item.name as name, depth, 
                 size((item.path + '/.*')) as fileCount
          ORDER BY depth, item.path
          LIMIT 100
        `, { maxDepth });
        
        this.networkData = this.buildNetworkData(data);
        this.$nextTick(() => this.renderNetwork());
      } catch (error) {
        console.error('Error loading network data:', error);
      }
    },

    buildNetworkData(data) {
      const nodes = [];
      const links = [];
      const nodeMap = new Map();

      // Add root node
      const root = { id: '/', name: 'Root', depth: 0, fileCount: 0 };
      nodes.push(root);
      nodeMap.set('/', root);

      data.forEach(item => {
        if (!nodeMap.has(item.path)) {
          const node = {
            id: item.path,
            name: item.name,
            depth: item.depth,
            fileCount: item.fileCount || 0
          };
          nodes.push(node);
          nodeMap.set(item.path, node);
        }

        // Create link to parent
        const pathParts = item.path.split('/').filter(p => p);
        if (pathParts.length > 1) {
          const parentPath = '/' + pathParts.slice(0, -1).join('/');
          if (nodeMap.has(parentPath)) {
            links.push({
              source: parentPath,
              target: item.path
            });
          }
        } else if (pathParts.length === 1) {
          links.push({
            source: '/',
            target: item.path
          });
        }
      });

      return { nodes, links };
    },

    renderNetwork() {
      const container = this.$refs.networkContainer;
      if (!container || !this.networkData) return;

      d3.select(container).selectAll("*").remove();

      const width = container.clientWidth || 800;
      const height = 600;

      const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

      const simulation = d3.forceSimulation(this.networkData.nodes)
        .force('link', d3.forceLink(this.networkData.links).id(d => d.id).distance(80))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2));

      const color = d3.scaleOrdinal(d3.schemeCategory10);

      const link = svg.append('g')
        .selectAll('line')
        .data(this.networkData.links)
        .enter().append('line')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', 2);

      const node = svg.append('g')
        .selectAll('circle')
        .data(this.networkData.nodes)
        .enter().append('circle')
        .attr('r', d => Math.max(5, Math.min(20, Math.sqrt(d.fileCount))))
        .attr('fill', d => color(d.depth))
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .call(d3.drag()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }));

      node.append('title')
        .text(d => `${d.name}\nFiles: ${d.fileCount}\nDepth: ${d.depth}`);

      simulation.on('tick', () => {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);

        node
          .attr('cx', d => d.x)
          .attr('cy', d => d.y);
      });
    },

    filterHierarchy() {
      // Implement hierarchy filtering
      this.loadHierarchyData();
    },
    async buildFlattenedResults() {
      const results = [];
      for (const file of this.searchResults) {
        if (file.isDir) {
          const descendants = await neo4jService.getDescendantPaths(file.path, 500);
          const paths = descendants.map(d => d.path);
          if (paths.length) {
            const tagged = await neo4jService.getTagsForPaths(paths);
            const tagMap = new Map(tagged.map(t => [t.path, t.tags]));
            for (const p of paths) {
              results.push({ name: p.split('/').pop(), path: p, isDir: false, size: 0, tags: tagMap.get(p) || [] });
            }
          }
        } else {
          results.push(file);
        }
      }
      this.flattenedResults = results;
    },
    syncSelected() {
      this.selectedPaths = Object.keys(this.selection).filter(p => this.selection[p]);
    },
    async onItemCheck(file) {
      const checked = !!this.selection[file.path];
      if (file.isDir) {
        try {
          const descendants = await neo4jService.getDescendantPaths(file.path, 2000);
          for (const d of descendants) {
            this.selection[d.path] = checked;
          }
        } catch (e) {
          console.warn('Failed to fetch descendants for directory', file.path, e);
        }
      }
      this.syncSelected();
    },
    async applyTagToSelection() {
      if (!this.selectedPaths.length || !this.bulkTagName) return;
      try {
        await neo4jService.tagItemsByPaths(this.selectedPaths, this.bulkTagName, this.bulkTagColor);
        this.selection = {};
        this.selectedPaths = [];
      } catch (e) {
        console.error('Failed to tag selection', e);
      }
    },
    async addSelectionToGroup() {
      if (!this.selectedPaths.length || !this.groupName) return;
      try {
        await neo4jService.addItemsToGroup(this.groupName, this.selectedPaths);
        this.selection = {};
        this.selectedPaths = [];
      } catch (e) {
        console.error('Failed to add to group', e);
      }
    }
  },
  
  watch: {
    activeView() {
      if (this.selectedDataset) {
        this.$nextTick(() => {
          if (this.activeView === 'treemap') {
            this.loadTreeMapData('size');
          } else if (this.activeView === 'hierarchy') {
            this.loadHierarchyData();
          } else if (this.activeView === 'network') {
            this.loadNetworkData('shallow');
          }
        });
      }
    }
  }
};
</script>

<style scoped>
.data-visualizer {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.controls {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  align-items: center;
}

.dataset-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.view-tabs {
  display: flex;
  gap: 5px;
}

.tab-button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  border-radius: 4px 4px 0 0;
  transition: background-color 0.2s;
}

.tab-button:hover {
  background: #f5f5f5;
}

.tab-button.active {
  background: #007cba;
  color: white;
  border-color: #007cba;
}

.loading {
  text-align: center;
  padding: 40px;
  font-size: 18px;
  color: #666;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-align: center;
}

.stat-card h4 {
  margin: 0 0 10px 0;
  color: #666;
  font-size: 14px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #007cba;
}

.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.chart-container {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.chart-container h4 {
  margin: 0 0 15px 0;
  text-align: center;
}

.tree-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  min-height: 600px;
}

.search-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 20px;
  font-size: 14px;
}

.file-list {
  max-height: 500px;
  overflow-y: auto;
}

.file-item {
  display: grid;
  grid-template-columns: auto 1fr 2fr auto;
  gap: 10px;
  padding: 8px;
  border-bottom: 1px solid #eee;
  align-items: center;
}

.file-item.directory {
  background: #f8f9fa;
}

.file-name {
  font-weight: 500;
}

.file-path {
  color: #666;
  font-size: 12px;
}

.file-size {
  color: #888;
  font-size: 12px;
}

.large-files-list {
  max-height: 500px;
  overflow-y: auto;
}

.large-file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #eee;
}

.file-info {
  display: flex;
  flex-direction: column;
}

.file-size-large {
  font-weight: bold;
  color: #007cba;
}

.overview-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.overview-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-align: center;
}

.overview-card h4 {
  margin: 0 0 10px 0;
  color: #666;
  font-size: 14px;
}

.big-number {
  font-size: 28px;
  font-weight: bold;
  color: #007cba;
}

.sample-data {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.sample-data h4 {
  margin: 0 0 15px 0;
  color: #333;
}

.sample-list {
  max-height: 400px;
  overflow-y: auto;
}

.sample-item {
  display: grid;
  grid-template-columns: 1fr 2fr auto;
  gap: 10px;
  padding: 8px;
  border-bottom: 1px solid #eee;
  align-items: center;
}

.sample-name {
  font-weight: 500;
  color: #333;
}

.sample-path {
  color: #666;
  font-size: 12px;
  font-family: monospace;
}

.sample-size {
  color: #007cba;
  font-size: 12px;
  font-weight: 500;
}
</style>