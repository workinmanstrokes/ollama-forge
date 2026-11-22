export const PLAYER_SPEED = 170;

export function createPlayer() {
  return {
    x: 36,
    y: 120,
    vx: 0,
    vy: 0,
    w: 18,
    h: 22,
    onGround: false,
    jump() {
      if (this.onGround) {
        this.vy = -290;
        this.onGround = false;
        return true;
      }
      return false;
    },
    step(dt, keys, platforms) {
      const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      this.vx = dir * PLAYER_SPEED;
      this.vy += 760 * dt;
      this.x += this.vx * dt;
      this.x = Math.max(0, Math.min(342, this.x));
      this.y += this.vy * dt;
      this.onGround = false;
      for (const block of platforms) {
        const hit = this.x < block.x + block.w && this.x + this.w > block.x && this.y < block.y + block.h && this.y + this.h > block.y;
        if (!hit) continue;
        if (this.vy >= 0 && this.y + this.h - this.vy * dt <= block.y + 4) {
          this.y = block.y - this.h;
          this.vy = 0;
          this.onGround = true;
        }
      }
    },
  };
}
