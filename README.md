# Rooms Vue - Data Analysis Dashboard

A Vue.js application featuring interactive data visualization and analysis capabilities powered by Neo4j graph database.

## Features

### Core Application
- **Collection Management**: Grid and detail views with smooth transitions
- **Room System**: Interactive room-based content organization  
- **Video Players**: Advanced video playback with scrubbing controls
- **Responsive Design**: Mobile-friendly interface

### Data Analysis Dashboard (NEW)
- **Neo4j Integration**: Graph database for complex data relationships
- **Interactive Visualizations**: D3.js-powered charts and graphs
- **Multiple View Types**:
  - Tree structure visualization of directory hierarchies
  - Statistical analysis with file distribution charts
  - File explorer with real-time search
  - Large files analysis and identification
- **Dataset Management**: Support for multiple JSON datasets

## Quick Start

### Prerequisites
- Node.js 16+ 
- Docker (for Neo4j database)

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Start Neo4j database:**
```bash
docker-compose up -d
```

3. **Ingest your datasets:**
```bash
npm run ingest
```

4. **Start development server:**
```bash
npm run dev
```

5. **Access the application:**
- Main app: http://localhost:5173
- Data Analysis: http://localhost:5173/data-analysis
- Neo4j Browser: http://localhost:7474 (neo4j/password123)

## Project Structure

```
src/
├── components/
│   ├── DataVisualizer.vue     # Main data visualization component
│   └── scrubbable/            # Video scrubbing components
├── datasets/                  # JSON datasets for analysis
├── scripts/
│   └── neo4j-ingest.js       # Data ingestion script
├── services/
│   └── neo4jService.js       # Neo4j database service
├── views/
│   ├── DataAnalysisView.vue   # Data analysis dashboard
│   └── ...                   # Other application views
└── main.js                   # Application entry point
```

## Original Features

### Media Browsing & Review
- Collection Grid/List View with toggle between grid and list views
- Media Item Detail View with video player and comment markers
- Video Player with Comments including custom timeline scrubbing
- View transitions for smooth navigation
- Tabbed interface for comments and file info

## Data Analysis Features

### Dataset Support
The application can analyze JSON files containing file system metadata with the following structure:
```json
[
  {
    "name": "filename.ext",
    "isDir": false,
    "path": "/full/path/to/file", 
    "size": 1024,
    "mtime": "2024-01-01T00:00:00.000Z"
  }
]
```

### Visualization Types

1. **Tree View**: Hierarchical visualization of directory structures
2. **Statistics Dashboard**: File counts, sizes, and distribution analysis
3. **File Explorer**: Search and browse files with real-time filtering
4. **Large Files Analysis**: Identify space-consuming files and directories

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run ingest` - Ingest JSON datasets into Neo4j

## Technology Stack

- **Frontend**: Vue 3, Vue Router, D3.js
- **Database**: Neo4j 5.15 with APOC plugins
- **Build Tool**: Vite
- **Styling**: CSS3 with modern features
- **Icons**: FontAwesome

## Neo4j Database Schema

The application models file system data as a graph:

- **Dataset nodes**: Represent individual JSON datasets
- **File/Folder nodes**: Represent files and directories
- **CONTAINS relationships**: Model directory hierarchies
- **Properties**: Store metadata (size, modification time, etc.)

### Example Cypher Queries

```cypher
// Find largest files in a dataset
MATCH (d:Dataset {name: 'my-dataset'})-[:CONTAINS]->(f:File)
WHERE f.size > 0
RETURN f.name, f.size, f.path
ORDER BY f.size DESC
LIMIT 10

// Get directory structure depth
MATCH (d:Dataset {name: 'my-dataset'})-[:CONTAINS*]->(item)
WHERE item.isDir = true
RETURN item.path, length(split(item.path, '/')) as depth
ORDER BY depth DESC
```

## Docker Configuration

The included `docker-compose.yml` sets up Neo4j with:
- HTTP interface on port 7474
- Bolt protocol on port 7687
- APOC plugins enabled
- Persistent data volumes

## Folder roles, tags, and sidecars

- Sidecar files can be placed in `src/datasets/sidecars/*.json` to define folder roles, colors, and tags for specific paths.
- Example sidecar (`src/datasets/sidecars/demo-room.json`):
```json
{
  "path": "/Demo",
  "role": "room",
  "color": "#3c5a9b",
  "tags": [
    { "name": "room", "color": "#3c5a9b" },
    { "name": "demo", "color": "#1f77b4" }
  ]
}
```
- After main ingestion, run the augmentation step to apply sidecars and auto-tags by extension:
```bash
node src/scripts/neo4j-ingest.js && node -e "import('./src/scripts/neo4j-ingest.js').then(m=>m.driver && process.exit(0))"
```

- Explorer view supports multi-select, bulk tagging, grouping, and folder flattening.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details