import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSITIONS_FILE = path.join(__dirname, '..', 'data', 'positions.json');
const HISTORY_FILE = path.join(__dirname, '..', 'data', 'history.json');

class Storage {
  constructor() {
    this.positions = [];
    this.history = [];
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
      
      try {
        const historyData = await fs.readFile(HISTORY_FILE, 'utf8');
        this.history = JSON.parse(historyData);
      } catch {
        await fs.writeFile(HISTORY_FILE, JSON.stringify([], null, 2));
      }
    } catch (error) {
      console.error('Error initializing data files:', error);
      throw error;
    }
  }

  async persist() {
    if (!this.isDirty) return;

    try {
      await Promise.all([
        fs.writeFile(POSITIONS_FILE, JSON.stringify(this.positions, null, 2)),
        fs.writeFile(HISTORY_FILE, JSON.stringify(this.history, null, 2))
      ]);
      this.isDirty = false;
    } catch (error) {
      console.error('Error persisting changes:', error);
      throw error;
    }
  }

  addPosition(position) {
    this.positions.push(position);
    this.isDirty = true;
  }

  removePosition(address) {
    this.positions = this.positions.filter(p => p.address !== address);
    this.isDirty = true;
  }

  addToHistory(position) {
    this.history.push(position);
    this.isDirty = true;
  }

  getPositions() {
    return this.positions;
  }

  getHistory() {
    return this.history;
  }
}

export const storage = new Storage();