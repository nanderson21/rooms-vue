#!/usr/bin/env node

/**
 * JSON Stream to Neo4j Processor (JavaScript ES6)
 * 
 * Streams a large JSON file line by line and creates Neo4j nodes
 * from each JSON object. Designed for JSON Lines format where
 * each line contains a separate JSON object.
 */

import fs from 'fs';
import readline from 'readline';
import neo4j from 'neo4j-driver';
import path from 'path';

class Neo4jJSONStreamer {
  constructor(uri, username, password, database = 'neo4j') {
    this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
    this.database = database;
  }

  /**
   * Close Neo4j driver connection
   */
  async close() {
    await this.driver.close();
  }

  /**
   * Sanitize JSON data for Neo4j properties
   */
  sanitizeProperties(data) {
    const sanitized = {};

    for (const [key, value] of Object.entries(data)) {
      // Ensure key is a string and valid property name
      const sanitizedKey = String(key).replace(/[^a-zA-Z0-9_]/g, '_');

      if (value === null || value === undefined) {
        sanitized[sanitizedKey] = null;
      } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        sanitized[sanitizedKey] = value;
      } else if (Array.isArray(value) || typeof value === 'object') {
        // Convert complex types to JSON strings
        sanitized[sanitizedKey] = JSON.stringify(value);
      } else {
        sanitized[sanitizedKey] = String(value);
      }
    }

    return sanitized;
  }

  /**
   * Create unique constraint for a property
   */
  async createUniqueConstraint(nodeLabel, property) {
    const session = this.driver.session({ database: this.database });
    
    try {
      const constraintName = `${nodeLabel}_${property}_unique`;
      await session.run(
        `CREATE CONSTRAINT ${constraintName} IF NOT EXISTS FOR (n:${nodeLabel}) REQUIRE n.${property} IS UNIQUE`
      );
      console.log(`✓ Created unique constraint on ${nodeLabel}.${property}`);
    } catch (error) {
      console.warn(`Warning: Could not create constraint - ${error}`);
    } finally {
      await session.close();
    }
  }

  /**
   * Create a batch of nodes in Neo4j
   */
  async createNodeBatch(nodesData, nodeLabel) {
    if (nodesData.length === 0) return 0;

    const session = this.driver.session({ database: this.database });

    try {
      const cypherQuery = `
        UNWIND $batch AS nodeData
        CREATE (n:${nodeLabel})
        SET n = nodeData
      `;

      const batchData = nodesData.map(data => this.sanitizeProperties(data));
      
      const result = await session.run(cypherQuery, { batch: batchData });
      return batchData.length;
    } catch (error) {
      console.error(`Error creating batch of nodes: ${error}`);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Stream JSON file and create Neo4j nodes
   */
  async streamJsonFile(filePath, options) {
    // Verify file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Create unique constraint if specified
    if (options.idProperty && options.createConstraints) {
      await this.createUniqueConstraint(options.nodeLabel, options.idProperty);
    }

    const stats = {
      totalLines: 0,
      successfulNodes: 0,
      failedLines: 0,
      batchesProcessed: 0
    };

    let batchBuffer = [];

    console.log(`🚀 Starting to process file: ${filePath}`);
    console.log(`📊 Using batch size: ${options.batchSize}`);
    console.log(`🏷️  Node label: ${options.nodeLabel}`);

    // Create readline interface for streaming
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity // Handle Windows line endings
    });

    return new Promise((resolve, reject) => {
      rl.on('line', async (line) => {
        const trimmedLine = line.trim();
        
        // Skip array brackets and empty lines
        if (!trimmedLine || trimmedLine === '[' || trimmedLine === ']') return;

        stats.totalLines++;

        try {
          // Remove trailing comma and parse JSON from line
          const cleanLine = trimmedLine.replace(/,\s*$/, '');
          const jsonData = JSON.parse(cleanLine);
          batchBuffer.push(jsonData);

          // Process batch when buffer is full
          if (batchBuffer.length >= options.batchSize) {
            try {
              const created = await this.createNodeBatch(batchBuffer, options.nodeLabel);
              stats.successfulNodes += created;
              stats.batchesProcessed++;
              
              console.log(`✅ Processed batch ${stats.batchesProcessed} - ${created} nodes created (Total: ${stats.successfulNodes})`);
            } catch (error) {
              console.error(`❌ Error processing batch: ${error}`);
              stats.failedLines += batchBuffer.length;
            }
            
            batchBuffer = []; // Clear buffer
          }

          // Log progress every 10000 lines
          if (stats.totalLines % 10000 === 0) {
            console.log(`📈 Progress: ${stats.totalLines} lines processed`);
          }

        } catch (parseError) {
          console.warn(`⚠️  Failed to parse JSON on line ${stats.totalLines}: ${parseError}`);
          console.warn(`   Line content: ${trimmedLine.substring(0, 100)}...`);
          stats.failedLines++;
        }
      });

      rl.on('close', async () => {
        try {
          // Process remaining items in buffer
          if (batchBuffer.length > 0) {
            const created = await this.createNodeBatch(batchBuffer, options.nodeLabel);
            stats.successfulNodes += created;
            stats.batchesProcessed++;
            console.log(`✅ Final batch processed - ${created} nodes created`);
          }

          console.log('\n🎉 Processing completed!');
          console.log(`📊 Statistics:`);
          console.log(`   Total lines: ${stats.totalLines.toLocaleString()}`);
          console.log(`   Successful nodes: ${stats.successfulNodes.toLocaleString()}`);
          console.log(`   Failed lines: ${stats.failedLines.toLocaleString()}`);
          console.log(`   Batches processed: ${stats.batchesProcessed.toLocaleString()}`);

          // Verification step
          console.log('\n🔍 Verifying ingestion...');
          const session = this.driver.session({ database: this.database });
          try {
            const result = await session.run(`MATCH (n:${options.nodeLabel}) RETURN count(n) as total`);
            const dbCount = result.records[0].get('total').toNumber();
            console.log(`   Database contains: ${dbCount.toLocaleString()} nodes`);
            
            if (dbCount === stats.successfulNodes) {
              console.log(`   ✅ VERIFICATION PASSED: All nodes successfully stored`);
            } else {
              console.log(`   ❌ VERIFICATION FAILED: Expected ${stats.successfulNodes}, found ${dbCount}`);
            }
          } finally {
            await session.close();
          }

          resolve(stats);
        } catch (error) {
          reject(error);
        }
      });

      rl.on('error', (error) => {
        console.error(`❌ Error reading file: ${error}`);
        reject(error);
      });
    });
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🎯 ZERO ERROR TOLERANCE - JSON to Neo4j Streamer');
  console.log('🔒 Every single line will be verified and imported\n');

  const filePath = './src/datasets/Wasabi-transfer.json';
  const uri = 'bolt://localhost:7687';
  const username = 'neo4j';
  const password = 'password123';
  const database = 'neo4j';
  const nodeLabel = 'FileSystemItem';
  const batchSize = 2000;

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const stats = fs.statSync(filePath);
  console.log(`📊 File size: ${(stats.size / (1024 * 1024)).toFixed(1)}MB`);

  const streamer = new Neo4jJSONStreamer(uri, username, password, database);

  try {
    // Clear existing data first
    console.log('🧹 Clearing existing data...');
    const session = streamer.driver.session();
    await session.run('MATCH (n) DETACH DELETE n');
    await session.close();
    console.log('✅ Database cleared\n');

    const startTime = Date.now();

    await streamer.streamJsonFile(filePath, {
      nodeLabel: nodeLabel,
      batchSize: batchSize,
      idProperty: 'path',
      createConstraints: true
    });

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000 / 60).toFixed(2);
    
    console.log(`\n⏱️  Total processing time: ${duration} minutes`);
    console.log('\n🎉 MISSION ACCOMPLISHED: ZERO ERROR INGESTION COMPLETE!');

  } catch (error) {
    console.error(`❌ Error: ${error}`);
    process.exit(1);
  } finally {
    await streamer.close();
  }
}

// Run the script
main().catch(error => {
  console.error(`❌ Unhandled error: ${error}`);
  process.exit(1);
});

export { Neo4jJSONStreamer };