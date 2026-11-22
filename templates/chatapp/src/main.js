import { replyTo } from "./replies.js";

const TITLE = "Courtyard Chat";
const messages = [{ who: "guide", text: "Ask about the bake table." }];
const root = document.getElementById("app");

function render() {
  root.innerHTML = `<div class="shell"><header><p class="eyebrow">Chat</p><h1 id="title"></h1></header><div class="log" id="log"></div><form id="form"><input id="text" placeholder="Say hello" /><button type="submit">Send</button></form></div>`;
  document.getElementById("title").textContent = TITLE;
  const log = document.getElementById("log");
  for (const message of messages) {
    const bubble = document.createElement("p");
    bubble.className = "bubble" + (message.who === "me" ? " me" : "");
    bubble.textContent = message.text;
    log.append(bubble);
  }
  document.getElementById("form").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("text");
    const text = input.value.trim();
    if (!text) return;
    messages.push({ who: "me", text });
    messages.push({ who: "guide", text: replyTo(text) });
    render();
  });
}
render();
