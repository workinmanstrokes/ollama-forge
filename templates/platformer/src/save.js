import { createStore } from "forge-kit";

export function createSave(title) {
  const store = createStore(title);
  return {
    best() {
      const data = store.load();
      return data && data.best ? data.best : 0;
    },
    keep(score) {
      const best = Math.max(score, this.best());
      store.save({ best });
      return best;
    },
  };
}
