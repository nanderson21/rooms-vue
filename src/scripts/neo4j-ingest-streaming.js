import neo4j from 'neo4j-driver';
import fs from 'fs';
import readline from 'readline';

const driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', 'password123'));

async function ingestDatasetStreaming(filePath, datasetName) {
  const session = driver.session();
  let processedCount = 0;
  let errorCount = 0;
  
  try {
    console.log(`\n📁 Starting streaming ingestion of ${datasetName}...`);
    
    // Create dataset node
    await session.run(
      'MERGE (d:Dataset {name: $name}) SET d.created = datetime()',
      { name: datasetName }
    );
    
    // Create read stream
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    
    let jsonBuffer = '';
    let inArray = false;
    let bracketCount = 0;
    
    for await (const line of rl) {
      const trimmed = line.trim();
      
      // Skip empty lines
      if (!trimmed) continue;
      
      // Detect start of array
      if (trimmed.startsWith('[')) {
        inArray = true;
        jsonBuffer = '';
        continue;
      }
      
      // Detect end of array
      if (trimmed === ']' || trimmed === '],') {
        break;
      }
      
      if (inArray) {
        jsonBuffer += trimmed;
        
        // Count brackets to detect complete JSON objects
        for (const char of trimmed) {
          if (char === '{') bracketCount++;
          if (char === '}') bracketCount--;
        }
        
        // If we have a complete object (bracketCount = 0)
        if (bracketCount === 0 && jsonBuffer.endsWith('}')) {
          try {
            // Remove trailing comma if present
            const cleanJson = jsonBuffer.replace(/,\s*$/, '');
            const item = JSON.parse(cleanJson);
            
            // Process the item
            await processItem(session, item, datasetName);
            processedCount++;
            
            if (processedCount % 1000 === 0) {
              console.log(`✅ Processed ${processedCount} items`);
            }
            
          } catch (parseError) {
            console.error(`❌ Parse error at item ${processedCount + 1}:`, parseError.message);
            errorCount++;
          }
          
          // Reset buffer
          jsonBuffer = '';
          bracketCount = 0;
        }
      }
    }
    
    console.log(`\n🎉 Completed ${datasetName}:`);
    console.log(`   ✅ Successfully processed: ${processedCount} items`);
    console.log(`   ❌ Errors encountered: ${errorCount} items`);
    
    // Verify ingestion by counting nodes
    const verifyResult = await session.run(
      'MATCH (d:Dataset {name: $name})-[:CONTAINS]->(item) RETURN count(item) as total',
      { name: datasetName }
    );
    const dbCount = verifyResult.records[0].get('total').toNumber();
    console.log(`   🔍 Database verification: ${dbCount} items stored`);
    
    if (dbCount !== processedCount - errorCount) {
      console.error(`⚠️  MISMATCH: Expected ${processedCount - errorCount}, found ${dbCount}`);
    } else {
      console.log(`   ✅ Verification successful: All items properly stored`);
    }
    
  } catch (error) {
    console.error(`❌ Fatal error processing ${datasetName}:`, error);
    throw error;
  } finally {
    await session.close();
  }
}

async function processItem(session, item, datasetName) {
  try {
    // Create file/folder node with proper error handling
    const nodeType = item.isDir ? 'Folder' : 'File';
    
    await session.run(`
      MERGE (d:Dataset {name: $datasetName})
      MERGE (f:${nodeType} {path: $path})
      SET f.name = $name,
          f.size = $size,
          f.mtime = datetime($mtime),
          f.isDir = $isDir
      MERGE (d)-[:CONTAINS]->(f)
    `, {
      datasetName,
      path: item.path || '',
      name: item.name || '',
      size: item.size || 0,
      mtime: item.mtime || '1970-01-01T00:00:00.000Z',
      isDir: item.isDir || false
    });
    
    // Create parent-child relationships for directory structure
    if (item.path && item.path.includes('/')) {
      const pathParts = item.path.split('/').filter(p => p);
      if (pathParts.length > 1) {
        const parentPath = '/' + pathParts.slice(0, -1).join('/');
        
        await session.run(`
          MATCH (parent {path: $parentPath})
          MATCH (child {path: $childPath})
          MERGE (parent)-[:CONTAINS]->(child)
        `, {
          parentPath,
          childPath: item.path
        });
      }
    }
    
  } catch (itemError) {
    console.error(`Error processing item ${item.path}:`, itemError.message);
    throw itemError;
  }
}

async function main() {
  try {
    console.log('🚀 Starting Neo4j streaming data ingestion...');
    
    // Test connection
    console.log('Testing Neo4j connection...');
    const session = driver.session();
    await session.run('RETURN 1 as test');
    console.log('✅ Neo4j connection successful');
    
    // Clear existing data
    console.log('Clearing existing data...');
    await session.run('MATCH (n) DETACH DELETE n');
    await session.close();
    console.log('✅ Database cleared');
    
    // Process the specific file
    const filePath = './src/datasets/Wasabi-transfer.json';
    const datasetName = 'Wasabi-transfer';
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const stats = fs.statSync(filePath);
    console.log(`📊 File size: ${(stats.size / (1024 * 1024)).toFixed(1)}MB`);
    
    await ingestDatasetStreaming(filePath, datasetName);
    
    console.log('\n🎉 INGESTION COMPLETED SUCCESSFULLY!');
    
    // Final verification and summary
    const summarySession = driver.session();
    const summary = await summarySession.run(`
      MATCH (n) 
      RETURN labels(n)[0] as type, count(n) as count
      ORDER BY count DESC
    `);
    
    console.log('\n📊 Final Database Summary:');
    summary.records.forEach(record => {
      console.log(`   ${record.get('type')}: ${record.get('count').toNumber()}`);
    });
    
    // Check for any orphaned nodes
    const orphanCheck = await summarySession.run(`
      MATCH (f) WHERE NOT (f:Dataset) AND NOT ()-[:CONTAINS]->(f)
      RETURN count(f) as orphans
    `);
    const orphanCount = orphanCheck.records[0].get('orphans').toNumber();
    
    if (orphanCount > 0) {
      console.log(`⚠️  Found ${orphanCount} orphaned nodes (no incoming relationships)`);
    } else {
      console.log('✅ No orphaned nodes detected');
    }
    
    await summarySession.close();
    
  } catch (error) {
    console.error('💥 FATAL ERROR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await driver.close();
  }
}

// Run the streaming ingestion
console.log('🎯 Streaming JSON ingestion script started...');
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

export { ingestDatasetStreaming, processItem, driver };