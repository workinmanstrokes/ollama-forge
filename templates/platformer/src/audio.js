import { createSfx } from "forge-kit";

export function createAudio() {
  const sfx = createSfx();
  return {
    jump() { sfx.jump(); },
    coin() { sfx.coin(); },
    pause() { sfx.pause(); },
    win() { sfx.win(); },
  };
}
