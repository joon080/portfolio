(() => {
  const opening = document.querySelector("#opening");
  const canvas = document.querySelector(".opening__beam");
  if (!opening || !canvas) return;
  const context = canvas.getContext("2d");
  if (!context) return;
  const stage = canvas.parentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = null;

  function paint() {
    frame = null;
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (!width || !height) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * pixelRatio);
    const pixelHeight = Math.round(height * pixelRatio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    const progress = reducedMotion.matches
      ? 1
      : Math.min(1, Math.max(0, 1 - opening.getBoundingClientRect().top / window.innerHeight));
    const beamWidth = Math.min(width, height * 130 / 237);
    const left = beamWidth * .26 * progress;
    const right = beamWidth * (.74 + .26 * progress);

    context.save();
    context.translate((1 - progress) * Math.max(0, width - 2), 0);
    context.filter = `blur(${beamWidth * .045}px)`;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(beamWidth, 0);
    context.lineTo(right, height * .07);
    context.lineTo(right, height * .93);
    context.lineTo(beamWidth, height);
    context.lineTo(0, height);
    context.lineTo(left, height * .93);
    context.lineTo(left, height * .07);
    context.closePath();
    context.fillStyle = "#b8b8b8";
    context.fill();

    const highlightX = beamWidth * (.08 + .84 * progress);
    const highlight = context.createLinearGradient(highlightX - beamWidth * .13, 0, highlightX + beamWidth * .13, 0);
    highlight.addColorStop(0, "rgba(255, 255, 255, 0)");
    highlight.addColorStop(.5, "rgba(255, 255, 255, .85)");
    highlight.addColorStop(1, "rgba(255, 255, 255, 0)");
    context.fillStyle = highlight;
    context.fill();
    context.restore();
  }

  function schedulePaint() {
    if (frame === null) frame = window.requestAnimationFrame(paint);
  }

  window.addEventListener("scroll", schedulePaint, { passive: true });
  window.addEventListener("resize", schedulePaint);
  window.addEventListener("pageshow", schedulePaint);
  reducedMotion.addEventListener("change", schedulePaint);
  paint();
})();
