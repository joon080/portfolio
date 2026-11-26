(() => {
  const scene = document.querySelector(".character-cards");
  const left = document.querySelector(".paper--left");
  const right = document.querySelector(".paper--right");
  if (!scene || !left || !right) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = null;

  function updatePapers() {
    frame = null;
    const { top, width } = scene.getBoundingClientRect();
    if (!width) return;
    const scale = width / scene.viewBox.baseVal.width;
    const travel = (window.innerWidth + width) / (2 * scale);
    const progress = reducedMotion.matches
      ? 1
      : Math.min(1, Math.max(0, (window.innerHeight * .78 - top) / (window.innerHeight * .55)));

    [left, right].forEach((paper, index) => {
      const direction = index ? 1 : -1;
      const phase = index * Math.PI;
      const t = Math.min(1, Math.max(0, (progress - index * .06) / (1 - index * .06)));
      const remaining = 1 - t;
      const x = direction * travel * remaining ** 3;
      const y = Math.sin(t * Math.PI * 4 + phase) * 60 * remaining;
      const rotation = direction * (Math.sin(t * Math.PI * 5 + phase) * 25 + 15 * remaining) * remaining;
      const flex = Math.sin(t * Math.PI * 6 + phase) * 8 * remaining;
      paper.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg) skewY(${flex}deg)`;
      paper.style.opacity = Math.min(1, t * 8);
    });
  }

  function scheduleUpdate() {
    if (frame === null) frame = window.requestAnimationFrame(updatePapers);
  }

  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  window.addEventListener("pageshow", scheduleUpdate);
  reducedMotion.addEventListener("change", scheduleUpdate);
  updatePapers();
})();
