#!/usr/bin/env node

import neo4j from 'neo4j-driver';
import fs from 'fs';
import path from 'path';

const driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', 'password123'));

async function ingestDataset(filePath, datasetName) {
  const session = driver.session();
  
  try {
    console.log(`Processing ${datasetName}...`);
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Create dataset node
    await session.run(
      'MERGE (d:Dataset {name: $name}) SET d.created = datetime()',
      { name: datasetName }
    );
    
    // Process each file/folder entry
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      
      // Create file/folder node
      await session.run(`
        MERGE (d:Dataset {name: $datasetName})
        MERGE (f:${item.isDir ? 'Folder' : 'File'} {path: $path})
        SET f.name = $name,
            f.size = $size,
            f.mtime = datetime($mtime),
            f.isDir = $isDir
        MERGE (d)-[:CONTAINS]->(f)
      `, {
        datasetName,
        path: item.path,
        name: item.name,
        size: item.size || 0,
        mtime: item.mtime,
        isDir: item.isDir
      });
      
      // Create parent-child relationships for directory structure
      const pathParts = item.path.split('/').filter(p => p);
      if (pathParts.length > 1) {
        const parentPath = pathParts.slice(0, -1).join('/');
        if (parentPath) {
          await session.run(`
            MATCH (parent {path: $parentPath})
            MATCH (child {path: $childPath})
            MERGE (parent)-[:CONTAINS]->(child)
          `, {
            parentPath: '/' + parentPath,
            childPath: item.path
          });
        }
      }
      
      if (i % 100 === 0) {
        console.log(`Processed ${i}/${data.length} items`);
      }
    }
    
    console.log(`✅ Completed ${datasetName}: ${data.length} items`);
    
  } catch (error) {
    console.error(`Error processing ${datasetName}:`, error);
  } finally {
    await session.close();
  }
}

async function main() {
  try {
    console.log('🚀 Starting Neo4j data ingestion...');
    
    // Test connection first
    console.log('Testing Neo4j connection...');
    const session = driver.session();
    const result = await session.run('RETURN 1 as test');
    console.log('✅ Neo4j connection successful');
    
    // Clear existing data
    await session.run('MATCH (n) DETACH DELETE n');
    await session.close();
    console.log('Cleared existing data');
    
    const datasetsDir = './src/datasets';
    console.log(`Reading datasets from: ${datasetsDir}`);
    const allFiles = fs.readdirSync(datasetsDir).filter(f => f.endsWith('.json'));
    
    // Check file sizes and exclude very large files
    const files = allFiles.filter(file => {
      const filePath = path.join(datasetsDir, file);
      const stats = fs.statSync(filePath);
      const sizeMB = stats.size / (1024 * 1024);
      if (sizeMB > 100) {
        console.log(`⚠️  Skipping ${file} (${sizeMB.toFixed(1)}MB - too large)`);
        return false;
      }
      return true;
    });
    
    console.log(`Found ${allFiles.length} JSON files, processing ${files.length}:`, files);
    
    for (const file of files) {
      const filePath = path.join(datasetsDir, file);
      const datasetName = file.replace('.json', '');
      console.log(`\n📁 Starting ingestion of ${file}...`);
      await ingestDataset(filePath, datasetName);
    }
    
    console.log('\n🎉 Data ingestion completed!');
    
    // Show summary
    const summarySession = driver.session();
    const summary = await summarySession.run('MATCH (n) RETURN labels(n)[0] as type, count(n) as count');
    console.log('\n📊 Database Summary:');
    summary.records.forEach(record => {
      console.log(`${record.get('type')}: ${record.get('count')}`);
    });
    await summarySession.close();
    
  } catch (error) {
    console.error('Fatal error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await driver.close();
  }
}

async function runIngest() {
	const session = driver.session();
	try {
		// Example: augment existing FileSystemItem nodes with sidecar-derived tags and folder colors
		// 1) Create constraints for Tag and Group
		await session.run(`CREATE CONSTRAINT tag_name_unique IF NOT EXISTS FOR (t:Tag) REQUIRE t.name IS UNIQUE`);
		await session.run(`CREATE CONSTRAINT group_name_unique IF NOT EXISTS FOR (g:Group) REQUIRE g.name IS UNIQUE`);

		// 2) Derive extension-based tags
		await session.run(`
			MATCH (f:FileSystemItem)
			WHERE f.isDir = false AND f.name CONTAINS '.'
			WITH f, toLower(split(f.name, '.')[-1]) as ext
			MERGE (t:Tag {name: ext})
			ON CREATE SET t.color = CASE ext
			  WHEN 'mov' THEN '#1F77B4'
			  WHEN 'mp4' THEN '#1F77B4'
			  WHEN 'wav' THEN '#FF7F0E'
			  WHEN 'mp3' THEN '#FF7F0E'
			  WHEN 'jpg' THEN '#2CA02C'
			  WHEN 'jpeg' THEN '#2CA02C'
			  WHEN 'png' THEN '#2CA02C'
			  WHEN 'pdf' THEN '#9467BD'
			  ELSE '#7F7F7F' END
			MERGE (f)-[:TAGGED_WITH]->(t)
		`);

		// 3) Set folder color property for directories based on heuristic or sidecar if present
		// If a sidecar JSON exists next to the folder (e.g., /path/.room.meta.json), read color
		const rootSidecarDir = './src/datasets/sidecars';
		if (fs.existsSync(rootSidecarDir)) {
			const files = fs.readdirSync(rootSidecarDir);
			for (const file of files) {
				if (!file.endsWith('.json')) continue;
				const full = path.join(rootSidecarDir, file);
				try {
					const data = JSON.parse(fs.readFileSync(full, 'utf-8'));
					if (data && data.path && data.color) {
						await session.run(`
							MATCH (d:FileSystemItem {path: $path})
							WHERE d.isDir = true
							SET d.folderColor = $color, d.role = COALESCE($role, d.role)
						`, { path: data.path, color: data.color, role: data.role || null });
					}
					// tags for the folder
					if (data && data.path && Array.isArray(data.tags) && data.tags.length) {
						for (const tag of data.tags) {
							await session.run(`
								MERGE (t:Tag {name: $name})
								ON CREATE SET t.color = $color
								WITH t
								MATCH (d:FileSystemItem {path: $path})
								MERGE (d)-[:TAGGED_WITH]->(t)
							`, { name: tag.name, color: tag.color || '#7F7F7F', path: data.path });
						}
					}
				} catch (e) {
					console.warn('Failed reading sidecar', full, e.message);
				}
			}
		}

		console.log('Ingest augmentation complete.');
	} finally {
		await session.close();
		await driver.close();
	}
}

// Always run when script is executed
console.log('Script started...');
main().catch(console.error);

export { ingestDataset, driver };