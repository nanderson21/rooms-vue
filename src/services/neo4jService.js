import neo4j from 'neo4j-driver';

class Neo4jService {
  constructor() {
    this.driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', 'password123'));
  }

  async query(cypher, params = {}) {
    const session = this.driver.session();
    try {
      const result = await session.run(cypher, params);
      return result.records.map(record => record.toObject());
    } finally {
      await session.close();
    }
  }

  // Get all datasets (since we only have one dataset, return it)
  async getDatasets() {
    return [{ name: 'Wasabi-transfer', created: new Date().toISOString() }];
  }

  // Get directory structure 
  async getDirectoryStructure(datasetName, maxDepth = 3) {
    return await this.query(`
      MATCH (item:FileSystemItem)
      WHERE item.isDir = true AND size(split(item.path, '/')) <= $maxDepth
      RETURN item.path as path, item.name as name, item.size as size, item.mtime as mtime
      ORDER BY item.path
      LIMIT 500
    `, { maxDepth: maxDepth + 2 });
  }

  // Get file statistics
  async getFileStats(datasetName) {
    return await this.query(`
      MATCH (item:FileSystemItem)
      RETURN 
        item.isDir as isDir,
        count(*) as count,
        sum(item.size) as totalSize,
        avg(item.size) as avgSize,
        max(item.size) as maxSize
      ORDER BY item.isDir DESC
    `);
  }

  // Get largest files
  async getLargestFiles(datasetName, limit = 10) {
    return await this.query(`
      MATCH (f:FileSystemItem)
      WHERE f.isDir = false AND f.size > 0
      RETURN f.name as name, f.path as path, f.size as size, f.mtime as mtime
      ORDER BY f.size DESC
      LIMIT $limit
    `, { limit });
  }

  // Get tree structure for visualization (simplified for performance)
  async getTreeStructure(datasetName, rootPath = null) {
    if (rootPath) {
      return await this.query(`
        MATCH (item:FileSystemItem)
        WHERE item.path STARTS WITH $rootPath AND size(split(item.path, '/')) <= $maxDepth
        RETURN item, [] as children
        ORDER BY item.isDir DESC, item.name
        LIMIT 100
      `, { rootPath, maxDepth: rootPath.split('/').length + 2 });
    } else {
      // Get root level items
      return await this.query(`
        MATCH (item:FileSystemItem)
        WHERE item.path =~ '^/[^/]+/?[^/]*$' OR item.path = '/'
        RETURN item, [] as children
        ORDER BY item.isDir DESC, item.name
        LIMIT 50
      `);
    }
  }

  // Search files by name pattern
  async searchFiles(datasetName, pattern) {
    return await this.query(`
      MATCH (item:FileSystemItem)
      WHERE toLower(item.name) CONTAINS toLower($pattern)
      RETURN item.name as name, item.path as path, item.isDir as isDir, item.size as size
      ORDER BY item.isDir DESC, item.name
      LIMIT 100
    `, { pattern });
  }

  // Get file type distribution
  async getFileTypeDistribution(datasetName) {
    return await this.query(`
      MATCH (f:FileSystemItem)
      WHERE f.isDir = false AND f.name CONTAINS '.'
      WITH f.name as name, split(f.name, '.')[-1] as extension
      RETURN extension, count(*) as count
      ORDER BY count DESC
      LIMIT 20
    `);
  }

  // Get timeline of file modifications
  async getModificationTimeline(datasetName) {
    return await this.query(`
      MATCH (item:FileSystemItem)
      WHERE item.mtime IS NOT NULL
      WITH date(datetime(item.mtime)) as date
      RETURN date, count(*) as fileCount
      ORDER BY date DESC
      LIMIT 30
    `);
  }

  // Get basic statistics for dashboard
  async getBasicStats() {
    return await this.query(`
      MATCH (item:FileSystemItem)
      RETURN 
        count(CASE WHEN item.isDir = false THEN 1 END) as totalFiles,
        count(CASE WHEN item.isDir = true THEN 1 END) as totalDirs,
        sum(CASE WHEN item.isDir = false THEN item.size ELSE 0 END) as totalSize,
        count(*) as totalItems
    `);
  }

  // Get directory depth analysis
  async getDirectoryDepthStats() {
    return await this.query(`
      MATCH (item:FileSystemItem)
      WHERE item.isDir = true
      WITH size(split(item.path, '/')) - 1 as depth
      RETURN depth, count(*) as count
      ORDER BY depth
      LIMIT 10
    `);
  }

  close() {
    return this.driver.close();
  }
}

export default new Neo4jService();