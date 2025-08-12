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

// Always run when script is executed
console.log('Script started...');
main().catch(console.error);

export { ingestDataset, driver };