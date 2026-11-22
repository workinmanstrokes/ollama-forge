import { h, render } from "preact";
import { useState } from "preact/hooks";
import { Button, Card, Tabs } from "forge-ui";
import { createStore } from "forge-kit";
import { STARTER_TASKS } from "./tasks.js";

const TITLE = "Hearth List";
const store = createStore(TITLE);

function App() {
  const saved = store.load() || { tasks: STARTER_TASKS, note: "Saturday bake table.", screen: "tasks" };
  const [screen, setScreen] = useState(saved.screen || "tasks");
  const [tasks, setTasks] = useState(saved.tasks || STARTER_TASKS);
  const [note, setNote] = useState(saved.note || "");
  const [draft, setDraft] = useState("");
  function persist(next) { store.save(next); }
  function addTask() {
    if (!draft.trim()) return;
    const next = tasks.concat(draft.trim());
    setTasks(next);
    setDraft("");
    persist({ tasks: next, note, screen });
  }
  return h("div", { class: "shell" },
    h("p", { class: "eyebrow" }, "Productivity"),
    h("h1", { id: "title" }, TITLE),
    h(Tabs, {
      current: screen,
      onChange: (id) => { setScreen(id); persist({ tasks, note, screen: id }); },
      items: [{ id: "tasks", label: "Tasks" }, { id: "note", label: "Note" }, { id: "settings", label: "Settings" }],
    }),
    screen === "tasks" ? h(Card, { title: "Today" },
      h("ul", null, tasks.map((task) => h("li", { key: task }, task))),
      h("input", { value: draft, onInput: (event) => setDraft(event.currentTarget.value), placeholder: "Add a task" }),
      h(Button, { onClick: addTask }, "Add"),
    ) : null,
    screen === "note" ? h(Card, { title: "Note" },
      h("textarea", { value: note, onInput: (event) => { setNote(event.currentTarget.value); persist({ tasks, note: event.currentTarget.value, screen }); } }),
    ) : null,
    screen === "settings" ? h(Card, { title: "Settings" }, h("p", null, "Saved on this device. Nothing is sent away.")) : null,
  );
}

render(h(App), document.getElementById("app"));
