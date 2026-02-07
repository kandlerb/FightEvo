/**
 * Lightweight custom NEAT implementation for Fight EVO.
 * Supports variable topology neural networks with structural mutations.
 *
 * Key concepts:
 * - Genomes are directed acyclic graphs of nodes + weighted connections
 * - Innovation numbers track homologous genes across genomes
 * - NEAT adds complexity gradually: starts input→output, adds hidden nodes
 * - Speciation groups similar topologies so innovations have time to optimize
 */

let _innovationCounter = 0;
const _innovationHistory = new Map(); // "from_to" → innovation number

function getInnovation(fromId, toId) {
    const key = `${fromId}_${toId}`;
    if (_innovationHistory.has(key)) return _innovationHistory.get(key);
    const inn = _innovationCounter++;
    _innovationHistory.set(key, inn);
    return inn;
}

// ─── Node ──────────────────────────────────────────────────────────

export class Node {
    constructor(id, type) {
        this.id = id;
        this.type = type; // 'input', 'output', 'hidden'
        this.bias = type === 'input' ? 0 : (Math.random() - 0.5) * 2;
        this.value = 0;
        this.depth = type === 'input' ? 0 : (type === 'output' ? 1 : 0.5);
    }

    clone() {
        const n = new Node(this.id, this.type);
        n.bias = this.bias;
        n.depth = this.depth;
        return n;
    }
}

// ─── Connection ────────────────────────────────────────────────────

export class Connection {
    constructor(from, to, weight, innovation) {
        this.from = from;
        this.to = to;
        this.weight = weight;
        this.enabled = true;
        this.innovation = innovation;
    }

    clone() {
        const c = new Connection(this.from, this.to, this.weight, this.innovation);
        c.enabled = this.enabled;
        return c;
    }
}

// ─── Genome ────────────────────────────────────────────────────────

function sigmoid(x) {
    return 1 / (1 + Math.exp(-4.9 * x));
}

export class Genome {
    constructor() {
        this.nodes = [];
        this.connections = [];
        this.fitness = 0;
        this.adjustedFitness = 0;
        this.inputCount = 0;
        this.outputCount = 0;
        this._nextNodeId = 0;
    }

    /**
     * Create a minimal genome with direct input→output connections.
     */
    static create(inputCount, outputCount) {
        const g = new Genome();
        g.inputCount = inputCount;
        g.outputCount = outputCount;

        // Input nodes (ids 0..inputCount-1)
        for (let i = 0; i < inputCount; i++) {
            const n = new Node(i, 'input');
            n.depth = 0;
            g.nodes.push(n);
        }

        // Output nodes (ids inputCount..inputCount+outputCount-1)
        for (let i = 0; i < outputCount; i++) {
            const n = new Node(inputCount + i, 'output');
            n.depth = 1;
            g.nodes.push(n);
        }

        g._nextNodeId = inputCount + outputCount;

        // Connect each input to each output with small random weights
        for (let i = 0; i < inputCount; i++) {
            for (let j = 0; j < outputCount; j++) {
                const outId = inputCount + j;
                const inn = getInnovation(i, outId);
                const w = (Math.random() - 0.5) * 2;
                g.connections.push(new Connection(i, outId, w, inn));
            }
        }

        return g;
    }

    /**
     * Feed-forward activation. Returns output array.
     */
    activate(inputs) {
        const nodeMap = new Map();
        for (const n of this.nodes) {
            nodeMap.set(n.id, n);
            n.value = 0;
        }

        // Set inputs
        for (let i = 0; i < this.inputCount; i++) {
            this.nodes[i].value = inputs[i] || 0;
        }

        // Sort nodes by depth for feedforward propagation
        const sorted = [...this.nodes].sort((a, b) => a.depth - b.depth);

        // Group connections by target
        const incoming = new Map();
        for (const c of this.connections) {
            if (!c.enabled) continue;
            if (!incoming.has(c.to)) incoming.set(c.to, []);
            incoming.get(c.to).push(c);
        }

        // Propagate
        for (const node of sorted) {
            if (node.type === 'input') continue;

            let sum = node.bias;
            const conns = incoming.get(node.id);
            if (conns) {
                for (const c of conns) {
                    const src = nodeMap.get(c.from);
                    if (src) sum += src.value * c.weight;
                }
            }
            node.value = sigmoid(sum);
        }

        // Collect outputs
        const outputs = new Float64Array(this.outputCount);
        for (let i = 0; i < this.outputCount; i++) {
            outputs[i] = this.nodes[this.inputCount + i].value;
        }
        return outputs;
    }

    // ─── Mutations ─────────────────────────────────────────────────

    mutate(config) {
        if (Math.random() < 0.8) this.mutateWeights();
        if (Math.random() < config.mutationRate * 0.5) this.mutateAddConnection();
        if (Math.random() < config.mutationRate * 0.2) this.mutateAddNode();
        if (Math.random() < 0.1) this.mutateBias();
        if (Math.random() < 0.05) this.mutateToggleConnection();
    }

    mutateWeights() {
        for (const c of this.connections) {
            if (Math.random() < 0.9) {
                // Perturb
                c.weight += (Math.random() - 0.5) * 0.4;
                c.weight = Math.max(-4, Math.min(4, c.weight));
            } else {
                // Reset
                c.weight = (Math.random() - 0.5) * 4;
            }
        }
    }

    mutateBias() {
        for (const n of this.nodes) {
            if (n.type === 'input') continue;
            if (Math.random() < 0.3) {
                n.bias += (Math.random() - 0.5) * 0.4;
                n.bias = Math.max(-4, Math.min(4, n.bias));
            }
        }
    }

    mutateAddConnection() {
        // Find two unconnected nodes where from.depth < to.depth
        const existingPairs = new Set();
        for (const c of this.connections) {
            existingPairs.add(`${c.from}_${c.to}`);
        }

        const candidates = [];
        for (const a of this.nodes) {
            for (const b of this.nodes) {
                if (a.id === b.id) continue;
                if (a.depth >= b.depth) continue;
                if (existingPairs.has(`${a.id}_${b.id}`)) continue;
                candidates.push([a.id, b.id]);
            }
        }

        if (candidates.length === 0) return;

        const [from, to] = candidates[Math.floor(Math.random() * candidates.length)];
        const inn = getInnovation(from, to);
        this.connections.push(new Connection(from, to, (Math.random() - 0.5) * 2, inn));
    }

    mutateAddNode() {
        const enabled = this.connections.filter(c => c.enabled);
        if (enabled.length === 0) return;

        const conn = enabled[Math.floor(Math.random() * enabled.length)];
        conn.enabled = false;

        const newId = this._nextNodeId++;
        const fromNode = this.nodes.find(n => n.id === conn.from);
        const toNode = this.nodes.find(n => n.id === conn.to);

        const newNode = new Node(newId, 'hidden');
        newNode.depth = (fromNode.depth + toNode.depth) / 2;
        this.nodes.push(newNode);

        // Connection from original source to new node (weight 1.0)
        const inn1 = getInnovation(conn.from, newId);
        this.connections.push(new Connection(conn.from, newId, 1.0, inn1));

        // Connection from new node to original target (original weight)
        const inn2 = getInnovation(newId, conn.to);
        this.connections.push(new Connection(newId, conn.to, conn.weight, inn2));
    }

    mutateToggleConnection() {
        if (this.connections.length === 0) return;
        const c = this.connections[Math.floor(Math.random() * this.connections.length)];
        c.enabled = !c.enabled;
    }

    // ─── Crossover ─────────────────────────────────────────────────

    /**
     * Create offspring from two parents. parent1 should be the fitter.
     */
    static crossover(parent1, parent2) {
        const child = new Genome();
        child.inputCount = parent1.inputCount;
        child.outputCount = parent1.outputCount;

        // Map parent2 connections by innovation
        const p2Map = new Map();
        for (const c of parent2.connections) {
            p2Map.set(c.innovation, c);
        }

        // Copy nodes from fitter parent, add any from parent2 if referenced
        const nodeIds = new Set();
        const nodeMap1 = new Map();
        for (const n of parent1.nodes) nodeMap1.set(n.id, n);
        const nodeMap2 = new Map();
        for (const n of parent2.nodes) nodeMap2.set(n.id, n);

        // Process connections
        for (const c1 of parent1.connections) {
            const c2 = p2Map.get(c1.innovation);
            let chosen;

            if (c2) {
                // Matching gene — pick randomly
                chosen = (Math.random() < 0.5 ? c1 : c2).clone();
                // Disable if either parent has it disabled
                if (!c1.enabled || !c2.enabled) {
                    chosen.enabled = Math.random() > 0.25;
                }
            } else {
                // Excess/disjoint from fitter parent
                chosen = c1.clone();
            }

            child.connections.push(chosen);
            nodeIds.add(chosen.from);
            nodeIds.add(chosen.to);
        }

        // Build node list
        let maxId = 0;
        for (const id of nodeIds) {
            const n = nodeMap1.get(id) || nodeMap2.get(id);
            if (n) {
                child.nodes.push(n.clone());
                if (n.id > maxId) maxId = n.id;
            }
        }

        // Ensure all input/output nodes exist
        for (let i = 0; i < child.inputCount; i++) {
            if (!child.nodes.find(n => n.id === i)) {
                const n = new Node(i, 'input');
                n.depth = 0;
                child.nodes.push(n);
                if (i > maxId) maxId = i;
            }
        }
        for (let i = 0; i < child.outputCount; i++) {
            const outId = child.inputCount + i;
            if (!child.nodes.find(n => n.id === outId)) {
                const n = new Node(outId, 'output');
                n.depth = 1;
                child.nodes.push(n);
                if (outId > maxId) maxId = outId;
            }
        }

        child._nextNodeId = maxId + 1;
        return child;
    }

    // ─── Distance (for speciation) ─────────────────────────────────

    static distance(g1, g2, c1 = 1.0, c2 = 1.0, c3 = 0.4) {
        const map1 = new Map();
        for (const c of g1.connections) map1.set(c.innovation, c);
        const map2 = new Map();
        for (const c of g2.connections) map2.set(c.innovation, c);

        let matching = 0, disjoint = 0, excess = 0, weightDiff = 0;
        const maxInn1 = g1.connections.length > 0
            ? Math.max(...g1.connections.map(c => c.innovation)) : 0;
        const maxInn2 = g2.connections.length > 0
            ? Math.max(...g2.connections.map(c => c.innovation)) : 0;
        const maxInn = Math.max(maxInn1, maxInn2);

        const allInnovations = new Set([...map1.keys(), ...map2.keys()]);
        for (const inn of allInnovations) {
            const in1 = map1.has(inn);
            const in2 = map2.has(inn);

            if (in1 && in2) {
                matching++;
                weightDiff += Math.abs(map1.get(inn).weight - map2.get(inn).weight);
            } else if ((in1 && inn > maxInn2) || (in2 && inn > maxInn1)) {
                excess++;
            } else {
                disjoint++;
            }
        }

        const N = Math.max(g1.connections.length, g2.connections.length, 1);
        const avgW = matching > 0 ? weightDiff / matching : 0;

        return (c1 * excess / N) + (c2 * disjoint / N) + (c3 * avgW);
    }

    clone() {
        const g = new Genome();
        g.inputCount = this.inputCount;
        g.outputCount = this.outputCount;
        g._nextNodeId = this._nextNodeId;
        g.fitness = 0;
        g.nodes = this.nodes.map(n => n.clone());
        g.connections = this.connections.map(c => c.clone());
        return g;
    }
}

// ─── Species ───────────────────────────────────────────────────────

class Species {
    constructor(representative) {
        this.representative = representative;
        this.members = [representative];
        this.bestFitness = 0;
        this.stagnation = 0;
    }

    addMember(genome) {
        this.members.push(genome);
    }

    reset() {
        if (this.members.length > 0) {
            this.representative = this.members[Math.floor(Math.random() * this.members.length)].clone();
        }
        this.members = [];
    }
}

// ─── Population ────────────────────────────────────────────────────

export class Population {
    constructor(size, inputCount, outputCount, config = {}) {
        this.size = size;
        this.inputCount = inputCount;
        this.outputCount = outputCount;
        this.config = {
            mutationRate: config.mutationRate || 0.3,
            crossoverRate: config.crossoverRate || 0.5,
            elitism: config.elitism || 0.15,
            distanceThreshold: config.distanceThreshold || 3.0,
            stagnationLimit: config.stagnationLimit || 15,
        };

        this.genomes = [];
        this.species = [];
        this.generation = 0;

        // Create initial population
        for (let i = 0; i < size; i++) {
            this.genomes.push(Genome.create(inputCount, outputCount));
        }
    }

    /**
     * Run one generation of evolution using the scored genomes.
     * @param {Genome[]} scoredGenomes - genomes with fitness values set
     * @returns {Genome[]} new generation of genomes
     */
    evolve(scoredGenomes) {
        if (scoredGenomes.length === 0) return this.genomes;

        // Update genomes with scores
        this.genomes = scoredGenomes;
        this.generation++;

        // Speciate
        this._speciate();

        // Calculate adjusted fitness (fitness sharing)
        for (const sp of this.species) {
            for (const g of sp.members) {
                g.adjustedFitness = g.fitness / sp.members.length;
            }
        }

        // Sort species members by fitness
        for (const sp of this.species) {
            sp.members.sort((a, b) => b.fitness - a.fitness);
            const best = sp.members[0].fitness;
            if (best > sp.bestFitness) {
                sp.bestFitness = best;
                sp.stagnation = 0;
            } else {
                sp.stagnation++;
            }
        }

        // Remove stagnant species (keep at least 2)
        if (this.species.length > 2) {
            this.species = this.species.filter(sp =>
                sp.stagnation < this.config.stagnationLimit
            );
            if (this.species.length === 0) {
                // Fallback: keep best species
                this.species = [new Species(scoredGenomes[0].clone())];
            }
        }

        // Calculate offspring per species based on adjusted fitness
        const totalAdj = this.species.reduce((sum, sp) =>
            sum + sp.members.reduce((s, g) => s + g.adjustedFitness, 0), 0
        );

        const newGenomes = [];

        // Elitism: copy best from each species
        const eliteCount = Math.max(1, Math.floor(this.size * this.config.elitism));
        const allSorted = [...scoredGenomes].sort((a, b) => b.fitness - a.fitness);
        for (let i = 0; i < Math.min(eliteCount, allSorted.length); i++) {
            newGenomes.push(allSorted[i].clone());
        }

        // Fill remaining with offspring
        while (newGenomes.length < this.size) {
            const sp = this._selectSpecies(totalAdj);
            if (!sp || sp.members.length === 0) continue;

            let child;
            if (Math.random() < this.config.crossoverRate && sp.members.length >= 2) {
                const p1 = this._tournamentSelect(sp.members);
                const p2 = this._tournamentSelect(sp.members);
                if (p1.fitness >= p2.fitness) {
                    child = Genome.crossover(p1, p2);
                } else {
                    child = Genome.crossover(p2, p1);
                }
            } else {
                child = this._tournamentSelect(sp.members).clone();
            }

            child.mutate(this.config);
            newGenomes.push(child);
        }

        // Reset species for next gen
        for (const sp of this.species) {
            sp.reset();
        }

        this.genomes = newGenomes;
        return newGenomes;
    }

    _speciate() {
        // Clear species members
        for (const sp of this.species) {
            sp.members = [];
        }

        for (const genome of this.genomes) {
            let placed = false;
            for (const sp of this.species) {
                const dist = Genome.distance(genome, sp.representative);
                if (dist < this.config.distanceThreshold) {
                    sp.addMember(genome);
                    placed = true;
                    break;
                }
            }

            if (!placed) {
                this.species.push(new Species(genome));
            }
        }

        // Remove empty species
        this.species = this.species.filter(sp => sp.members.length > 0);
    }

    _selectSpecies(totalAdj) {
        if (totalAdj <= 0 || this.species.length === 0) {
            return this.species[Math.floor(Math.random() * this.species.length)];
        }

        let r = Math.random() * totalAdj;
        for (const sp of this.species) {
            const spAdj = sp.members.reduce((s, g) => s + g.adjustedFitness, 0);
            r -= spAdj;
            if (r <= 0) return sp;
        }
        return this.species[this.species.length - 1];
    }

    _tournamentSelect(members, k = 3) {
        let best = null;
        for (let i = 0; i < Math.min(k, members.length); i++) {
            const candidate = members[Math.floor(Math.random() * members.length)];
            if (!best || candidate.fitness > best.fitness) {
                best = candidate;
            }
        }
        return best;
    }
}
