// Put this file at: frontend/src/utils/resultsStore.js

const STORAGE_KEY = "dairyvision_results";
const MAX_ENTRIES = 20;


// ==============================================================
// READ ALL SAVED RESULTS (newest first)
// ==============================================================

export function getResults() {

  try {

    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];

  } catch (err) {

    console.error("Could not read saved results:", err);
    return [];

  }

}


// ==============================================================
// SAVE ONE RESULT
//
// entry = {
//   source:        "upload" | "live"
//   analysisType:  "image" | "behaviour"
//   data:          the raw JSON the backend returned
// }
// ==============================================================

export function saveResult(entry) {

  try {

    const existing = getResults();

    const record = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      source: entry.source,
      analysisType: entry.analysisType,
      data: entry.data
    };

    const updated = [record, ...existing].slice(0, MAX_ENTRIES);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    return record;

  } catch (err) {

    console.error("Could not save result:", err);
    return null;

  }

}


// ==============================================================
// CLEAR ALL SAVED RESULTS
// ==============================================================

export function clearResults() {

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("Could not clear results:", err);
  }

}