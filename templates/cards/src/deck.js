const FACES = ["🌟", "🔥", "🌙", "🌟", "🔥", "🌙"];
export function shuffled() {
  const cards = FACES.map((face, index) => ({ id: index, face, open: false, done: false }));
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = cards[i];
    cards[i] = cards[j];
    cards[j] = swap;
  }
  return cards;
}
