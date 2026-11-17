// Tiny shared store for the trip being planned (from / to), used by the map and search screens.
import { useSyncExternalStore } from 'react';

let state = { from: null, to: null }; // null `from` = current location; places are { name, lat, lng, type }
const listeners = new Set();

export const tripStore = {
  get: () => state,
  set: (patch) => {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
  swap: () => tripStore.set({ from: state.to, to: state.from }),
  subscribe: (l) => {
    listeners.add(l);
    return () => listeners.delete(l);
  }
};

export const useTrip = () => useSyncExternalStore(tripStore.subscribe, tripStore.get, tripStore.get);
