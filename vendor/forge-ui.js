import { h } from "preact";

export function Button(props) {
  return h("button", { type: "button", class: "fk-btn", onClick: props.onClick }, props.children);
}

export function Card(props) {
  return h("section", { class: "fk-card" }, props.title ? h("h2", null, props.title) : null, props.children);
}

export function Tabs(props) {
  return h("nav", { class: "fk-tabs" }, props.items.map((item) => h("button", {
    type: "button",
    class: item.id === props.current ? "on" : "",
    onClick: () => props.onChange(item.id),
  }, item.label)));
}

export function createHashRouter(host, routes) {
  function draw() {
    const path = (location.hash || "#/").replace("#", "") || "/";
    const screen = routes[path] || routes["/"];
    host.replaceChildren();
    const view = screen();
    if (view) host.append(view);
  }
  window.addEventListener("hashchange", draw);
  draw();
  return { draw };
}
