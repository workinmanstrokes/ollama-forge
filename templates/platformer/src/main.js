import { createGame } from "./game.js";

const TITLE = "Moss Run";
const game = createGame(document.getElementById("app"), TITLE);
window.__forgeGame = game;
window.__forgePlay = {
  start() { game.start(); },
  act(name) { game.act(name); },
  state() { return game.state(); },
};
