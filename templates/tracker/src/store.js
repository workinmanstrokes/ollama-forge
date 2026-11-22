import { createStore } from "forge-kit";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export function createTracker(title) {
  const store = createStore(title);
  const saved = store.load();
  const counts = saved && saved.counts ? saved.counts : [1, 2, 2, 3, 1, 4, 2];
  return {
    days: DAYS,
    counts,
    add(index) {
      counts[index] += 1;
      store.save({ counts });
    },
  };
}
