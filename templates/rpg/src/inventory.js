export function createBag() {
  const items = [];
  return {
    items,
    add(item) { items.push(item.name); },
    has(name) { return items.includes(name); },
  };
}
