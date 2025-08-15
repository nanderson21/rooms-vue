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

  // --- Tagging & Grouping & Folder Roles ---

  async createTag(name, color) {
    const records = await this.query(`
      MERGE (t:Tag {name: $name})
      ON CREATE SET t.color = $color
      ON MATCH SET t.color = COALESCE($color, t.color)
      RETURN t.name as name, t.color as color
    `, { name, color });
    return records[0] || null;
  }

  async tagItemsByPaths(paths, tagName, color) {
    if (!paths || paths.length === 0) return [];
    return await this.query(`
      MERGE (t:Tag {name: $tagName})
      ON CREATE SET t.color = $color
      WITH t
      UNWIND $paths as p
      MATCH (f:FileSystemItem {path: p})
      MERGE (f)-[r:TAGGED_WITH]->(t)
      RETURN f.path as path, t.name as tag, t.color as color
    `, { paths, tagName, color });
  }

  async tagItemsByExtension(extension, tagName, color) {
    return await this.query(`
      MERGE (t:Tag {name: $tagName})
      ON CREATE SET t.color = $color
      WITH t
      MATCH (f:FileSystemItem)
      WHERE f.isDir = false AND f.name CONTAINS '.' AND toLower(split(f.name, '.')[-1]) = toLower($extension)
      MERGE (f)-[:TAGGED_WITH]->(t)
      RETURN count(f) as taggedCount, t.name as tag, t.color as color
    `, { extension, tagName, color });
  }

  async getTagsForPath(path) {
    return await this.query(`
      MATCH (f:FileSystemItem {path: $path})-[:TAGGED_WITH]->(t:Tag)
      RETURN t.name as name, t.color as color
    `, { path });
  }

  async setFolderColor(path, color) {
    return await this.query(`
      MATCH (d:FileSystemItem {path: $path})
      WHERE d.isDir = true
      SET d.folderColor = $color
      RETURN d.path as path, d.folderColor as color
    `, { path, color });
  }

  async createGroup(name, color = null) {
    const records = await this.query(`
      MERGE (g:Group {name: $name})
      ON CREATE SET g.color = $color, g.createdAt = datetime()
      RETURN g.name as name, g.color as color
    `, { name, color });
    return records[0] || null;
  }

  async addItemsToGroup(groupName, paths) {
    if (!paths || paths.length === 0) return [];
    return await this.query(`
      MERGE (g:Group {name: $groupName})
      WITH g
      UNWIND $paths as p
      MATCH (f:FileSystemItem {path: p})
      MERGE (g)-[:HAS_MEMBER]->(f)
      RETURN g.name as group, collect(f.path) as members
    `, { groupName, paths });
  }

  async removeItemsFromGroup(groupName, paths) {
    if (!paths || paths.length === 0) return 0;
    return await this.query(`
      MATCH (g:Group {name: $groupName})-[r:HAS_MEMBER]->(f:FileSystemItem)
      WHERE f.path IN $paths
      DELETE r
      RETURN count(r) as removed
    `, { groupName, paths });
  }

  async addRelationship(sourcePath, targetPath, relationshipType, properties = {}) {
    // Requires APOC to create dynamic relationship types
    return await this.query(`
      MATCH (s:FileSystemItem {path: $sourcePath})
      MATCH (t:FileSystemItem {path: $targetPath})
      CALL apoc.create.relationship(s, $relType, $props, t) YIELD rel
      RETURN type(rel) as type
    `, { sourcePath, targetPath, relType: relationshipType, props: properties });
  }

  async getGroupsForPath(path) {
    return await this.query(`
      MATCH (g:Group)-[:HAS_MEMBER]->(f:FileSystemItem {path: $path})
      RETURN g.name as name, g.color as color
    `, { path });
  }

  async getAllTags(limit = 100) {
    return await this.query(`
      MATCH (t:Tag)
      RETURN t.name as name, t.color as color
      ORDER BY t.name
      LIMIT $limit
    `, { limit });
  }

  async getAllGroups(limit = 100) {
    return await this.query(`
      MATCH (g:Group)
      RETURN g.name as name, g.color as color
      ORDER BY g.name
      LIMIT $limit
    `, { limit });
  }

  async getFolderColor(path) {
    const rows = await this.query(`
      MATCH (d:FileSystemItem {path: $path})
      WHERE d.isDir = true AND d.folderColor IS NOT NULL
      RETURN d.folderColor as color
    `, { path });
    return rows[0]?.color || null;
  }

  async getTagsForPaths(paths) {
    if (!paths || paths.length === 0) return [];
    return await this.query(`
      UNWIND $paths as p
      MATCH (f:FileSystemItem {path: p})-[:TAGGED_WITH]->(t:Tag)
      RETURN f.path as path, collect({name: t.name, color: t.color}) as tags
    `, { paths });
  }

  async getDescendantPaths(directoryPath, limit = 1000) {
    return await this.query(`
      MATCH (f:FileSystemItem)
      WHERE f.path STARTS WITH $dir AND f.path <> $dir
      RETURN f.path as path
      LIMIT $limit
    `, { dir: directoryPath, limit });
  }

  async close() {
    return this.driver.close();
  }
}

export default new Neo4jService();