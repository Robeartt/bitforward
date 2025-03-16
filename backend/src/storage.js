import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSITIONS_FILE = path.join(__dirname, '..', 'data', 'positions.json');

class Storage {
  constructor() {
    this.positions = [];
    this.isDirty = false;
  }

  async initialize() {
    const dataDir = path.join(__dirname, '..', 'data');
    try {
      await fs.mkdir(dataDir, { recursive: true });

      try {
        const positionsData = await fs.readFile(POSITIONS_FILE, 'utf8');
        this.positions = JSON.parse(positionsData);
      } catch {
        await fs.writeFile(POSITIONS_FILE, JSON.stringify([], null, 2));
      }
    } catch (error) {
      console.error('Error initializing data files:', error);
      throw error;
    }
  }

  async persist() {
    if (!this.isDirty) return;

    try {
      await fs.writeFile(POSITIONS_FILE, JSON.stringify(this.positions, null, 2));
      this.isDirty = false;
    } catch (error) {
      console.error('Error persisting changes:', error);
      throw error;
    }
  }

  addPosition(position) {
    const existingIndex = this.positions.findIndex(p => p.contractId === position.contractId);

    if (existingIndex !== -1) {
      // Update existing position
      this.positions[existingIndex] = position;
    } else {
      // Add new position
      this.positions.push(position);
    }

    this.isDirty = true;
  }

  setPositions(positions) {
    this.positions = positions;
    this.isDirty = true;
  }

  removePosition(contractId) {
    this.positions = this.positions.filter(p => p.contractId !== contractId);
    this.isDirty = true;
  }

  getPositions() {
    return this.positions;
  }
}

export const storage = new Storage();