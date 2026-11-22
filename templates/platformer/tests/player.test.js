window.__forgeTests = window.__forgeTests || [];
window.__forgeTests.push(function () {
  const state = window.__forgeGame && window.__forgeGame.state();
  if (!state || !(state.speed > 0)) throw new Error("player speed missing");
});
