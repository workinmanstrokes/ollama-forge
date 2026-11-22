export function createInput(canvas) {
  const keys = { left: false, right: false, jump: false };
  function setKey(event, down) {
    if (event.key === "ArrowLeft" || event.key === "a") keys.left = down;
    if (event.key === "ArrowRight" || event.key === "d") keys.right = down;
    if (event.key === " " || event.key === "ArrowUp" || event.key === "w") keys.jump = down;
  }
  window.addEventListener("keydown", (event) => setKey(event, true));
  window.addEventListener("keyup", (event) => setKey(event, false));
  canvas.addEventListener("pointerdown", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    keys.left = x < rect.width * 0.34;
    keys.right = x > rect.width * 0.66;
    keys.jump = x >= rect.width * 0.34 && x <= rect.width * 0.66;
  });
  canvas.addEventListener("pointerup", () => {
    keys.left = false;
    keys.right = false;
    keys.jump = false;
  });
  return {
    keys,
    tap(name, down) {
      if (name === "left" || name === "right" || name === "jump") keys[name] = down;
    },
  };
}
