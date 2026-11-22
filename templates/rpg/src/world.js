export function createWorld() {
  return {
    cols: 5,
    rows: 5,
    items: [
      { id: "map", name: "Map", x: 3, y: 1 },
      { id: "key", name: "Key", x: 1, y: 3 },
      { id: "lamp", name: "Lamp", x: 4, y: 4 },
    ],
  };
}
