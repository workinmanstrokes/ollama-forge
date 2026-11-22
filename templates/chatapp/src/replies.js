export function replyTo(text) {
  const line = text.toLowerCase();
  if (line.includes("hello") || line.includes("hi")) return "Hello. The courtyard table opens at nine.";
  if (line.includes("bread")) return "The cinnamon tin is packed. The first one is for the neighbors.";
  return "I can talk about the bake table, the bread, or when we open.";
}
