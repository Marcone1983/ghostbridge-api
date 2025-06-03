/**
 * Incremental Dijkstra implementation for <200ms propagation
 * Optimized for real-time mesh network updates
 */

class IncrementalDijkstra {
  constructor() {
    this.graph = new Map(); // nodeId -> {neighbors: Map<nodeId, weight>}
    this.distances = new Map(); // nodeId -> Map<targetId, distance>
    this.previous = new Map(); // nodeId -> Map<targetId, previousNode>
    this.updateQueue = [];
    this.lastUpdateTime = Date.now();
    this.metrics = {
      totalUpdates: 0,
      averageUpdateTime: 0,
      maxUpdateTime: 0
    };
  }

  /**
   * Add or update an edge in the graph
   * Triggers incremental update only for affected paths
   */
  updateEdge(fromNode, toNode, weight) {
    const startTime = Date.now();
    
    // Initialize nodes if not exist
    if (!this.graph.has(fromNode)) {
      this.graph.set(fromNode, { neighbors: new Map() });
    }
    if (!this.graph.has(toNode)) {
      this.graph.set(toNode, { neighbors: new Map() });
    }
    
    // Get old weight for comparison
    const oldWeight = this.graph.get(fromNode).neighbors.get(toNode) || Infinity;
    
    // Update edge
    this.graph.get(fromNode).neighbors.set(toNode, weight);
    
    // If weight decreased, we need to propagate improvements
    if (weight < oldWeight) {
      this.propagateImprovement(fromNode, toNode, weight);
    }
    // If weight increased, affected paths need recalculation
    else if (weight > oldWeight) {
      this.propagateDeterioration(fromNode, toNode, oldWeight, weight);
    }
    
    // Update metrics
    const updateTime = Date.now() - startTime;
    this.metrics.totalUpdates++;
    this.metrics.averageUpdateTime = 
      (this.metrics.averageUpdateTime * (this.metrics.totalUpdates - 1) + updateTime) / this.metrics.totalUpdates;
    this.metrics.maxUpdateTime = Math.max(this.metrics.maxUpdateTime, updateTime);
    
    if (updateTime > 200) {
      console.warn(`⚠️ Incremental update took ${updateTime}ms (target: <200ms)`);
    }
    
    return updateTime;
  }

  /**
   * Propagate improvement when edge weight decreases
   * Uses Ramalingam-Reps algorithm for efficiency
   */
  propagateImprovement(fromNode, toNode, newWeight) {
    const queue = [[fromNode, toNode, newWeight]];
    const processed = new Set();
    
    while (queue.length > 0) {
      const [source, target, weight] = queue.shift();
      const key = `${source}->${target}`;
      
      if (processed.has(key)) continue;
      processed.add(key);
      
      // Get current distances from source
      if (!this.distances.has(source)) {
        this.distances.set(source, new Map());
      }
      const sourceDistances = this.distances.get(source);
      
      // Calculate new distance through this edge
      const distToSource = sourceDistances.get(source) || 0;
      const newDistance = distToSource + weight;
      const oldDistance = sourceDistances.get(target) || Infinity;
      
      // If we found a better path
      if (newDistance < oldDistance) {
        sourceDistances.set(target, newDistance);
        
        // Update previous node tracking
        if (!this.previous.has(source)) {
          this.previous.set(source, new Map());
        }
        this.previous.get(source).set(target, source);
        
        // Propagate to neighbors of target
        const targetNode = this.graph.get(target);
        if (targetNode) {
          for (const [neighbor, edgeWeight] of targetNode.neighbors) {
            queue.push([target, neighbor, edgeWeight]);
          }
        }
      }
    }
  }

  /**
   * Handle edge weight increase - more complex than decrease
   */
  propagateDeterioration(fromNode, toNode, oldWeight, newWeight) {
    // Find all affected paths that used this edge
    const affectedPaths = this.findPathsUsingEdge(fromNode, toNode);
    
    // Recalculate distances for affected destinations
    for (const [source, destinations] of affectedPaths) {
      for (const dest of destinations) {
        this.recalculateDistance(source, dest);
      }
    }
  }

  /**
   * Find all source-destination pairs using a specific edge
   */
  findPathsUsingEdge(fromNode, toNode) {
    const affected = new Map();
    
    for (const [source, prevMap] of this.previous) {
      for (const [dest, prev] of prevMap) {
        if (prev === fromNode && dest === toNode) {
          if (!affected.has(source)) {
            affected.set(source, new Set());
          }
          affected.get(source).add(dest);
        }
      }
    }
    
    return affected;
  }

  /**
   * Recalculate shortest path for a specific source-destination pair
   */
  recalculateDistance(source, destination) {
    // Mini-Dijkstra for single pair
    const distances = new Map();
    const previous = new Map();
    const unvisited = new Set(this.graph.keys());
    
    distances.set(source, 0);
    
    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      let current = null;
      let minDist = Infinity;
      
      for (const node of unvisited) {
        const dist = distances.get(node) || Infinity;
        if (dist < minDist) {
          minDist = dist;
          current = node;
        }
      }
      
      if (current === null || current === destination) break;
      
      unvisited.delete(current);
      
      // Update neighbors
      const currentNode = this.graph.get(current);
      if (currentNode) {
        for (const [neighbor, weight] of currentNode.neighbors) {
          if (unvisited.has(neighbor)) {
            const alt = minDist + weight;
            const currentDist = distances.get(neighbor) || Infinity;
            
            if (alt < currentDist) {
              distances.set(neighbor, alt);
              previous.set(neighbor, current);
            }
          }
        }
      }
    }
    
    // Update global distance/previous maps
    this.distances.get(source).set(destination, distances.get(destination) || Infinity);
    this.previous.get(source).set(destination, previous.get(destination) || null);
  }

  /**
   * Get shortest path between two nodes
   */
  getPath(source, destination) {
    if (!this.previous.has(source) || !this.previous.get(source).has(destination)) {
      return null;
    }
    
    const path = [];
    let current = destination;
    
    while (current !== null && current !== source) {
      path.unshift(current);
      current = this.previous.get(source).get(current);
    }
    
    if (current === source) {
      path.unshift(source);
      return path;
    }
    
    return null;
  }

  /**
   * Get distance between two nodes
   */
  getDistance(source, destination) {
    if (!this.distances.has(source)) {
      return Infinity;
    }
    return this.distances.get(source).get(destination) || Infinity;
  }

  /**
   * Batch update multiple edges efficiently
   */
  batchUpdateEdges(updates) {
    const startTime = Date.now();
    
    // Sort updates by weight increase/decrease
    const improvements = [];
    const deteriorations = [];
    
    for (const { from, to, weight } of updates) {
      const oldWeight = this.graph.get(from)?.neighbors.get(to) || Infinity;
      if (weight < oldWeight) {
        improvements.push({ from, to, weight });
      } else if (weight > oldWeight) {
        deteriorations.push({ from, to, weight, oldWeight });
      }
    }
    
    // Process improvements first (they're simpler)
    for (const update of improvements) {
      this.updateEdge(update.from, update.to, update.weight);
    }
    
    // Then process deteriorations
    for (const update of deteriorations) {
      this.updateEdge(update.from, update.to, update.weight);
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`📊 Batch updated ${updates.length} edges in ${totalTime}ms`);
    
    return totalTime;
  }

  /**
   * Get algorithm metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      graphSize: this.graph.size,
      totalEdges: Array.from(this.graph.values())
        .reduce((sum, node) => sum + node.neighbors.size, 0)
    };
  }
}

export default IncrementalDijkstra;