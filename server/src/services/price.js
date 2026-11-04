import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Linear regression model trained in Python (ml/train_price_model.py).
// The coefficients are exported to price_model.json and evaluated here.
const modelPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'ml', 'price_model.json');

function loadModel() {
  return JSON.parse(fs.readFileSync(modelPath, 'utf8'));
}

export function estimatePrice(input) {
  const m = loadModel();
  let y = m.intercept;
  for (const [feature, coef] of Object.entries(m.numeric)) {
    y += coef * Number(input[feature] || 0);
  }
  for (const [feature, values] of Object.entries(m.categorical)) {
    y += values[String(input[feature] || '').toLowerCase()] || 0;
  }
  const price = Math.max(m.minPrice, Math.round(y / 5) * 5);
  return { price, low: Math.round(price * 0.85), high: Math.round(price * 1.15) };
}
