import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const script = readFileSync(new URL("../src/home/interaction.js", import.meta.url), "utf8");

function browser({ reduced = false, missingOpening = false, missingCanvas = false, noContext = false, dpr = 1 } = {}) {
  const events = new Map();
  const frames = [];
  const calls = [];
  const rect = { top: 800 };
  const stage = { clientWidth: 1200, clientHeight: 600 };
  const context = {};
  for (const name of ["save", "restore", "translate", "setTransform", "clearRect", "beginPath", "moveTo", "lineTo", "closePath"]) {
    context[name] = (...args) => calls.push([name, args]);
  }
  context.fill = () => calls.push(["fill", [context.fillStyle]]);
  context.createLinearGradient = (...args) => {
    calls.push(["createLinearGradient", args]);
    return { addColorStop() {} };
  };
  const canvas = { width: 300, height: 150, parentElement: stage, getContext: () => noContext ? null : context };
  const preference = {
    matches: reduced,
    addEventListener: (name, handler) => events.set(`motion:${name}`, handler),
  };
  const window = {
    innerHeight: 800,
    devicePixelRatio: dpr,
    matchMedia: () => preference,
    addEventListener: (name, handler) => events.set(name, handler),
    requestAnimationFrame(handler) { frames.push(handler); return frames.length; },
  };
  vm.runInNewContext(script, {
    document: {
      querySelector: (selector) => selector === "#opening"
        ? missingOpening ? null : { getBoundingClientRect: () => rect }
        : missingCanvas ? null : canvas,
    },
    window,
  });
  const paintCalls = () => calls.slice(calls.findLastIndex(([name]) => name === "clearRect"));
  return {
    rect, stage, canvas, window, preference, events, frames, calls,
    travel: () => paintCalls().find(([name]) => name === "translate")[1][0],
    vertices: () => paintCalls().filter(([name]) => name === "moveTo" || name === "lineTo").map(([, args]) => args),
    fills: () => paintCalls().filter(([name]) => name === "fill").map(([, args]) => args[0]),
    dispatch(name) { events.get(name)(); frames.splice(0).forEach((frame) => frame()); },
  };
}

function closeTo(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} should equal ${expected}`);
}

test("canvas beam follows scroll, clamps at both ends, and reverses", () => {
  const page = browser();
  for (const [top, travel] of [[800, 1198], [400, 599], [0, 0], [-800, 0], [400, 599], [1600, 1198]]) {
    page.rect.top = top;
    page.dispatch("scroll");
    closeTo(page.travel(), travel);
  }
});

test("bright gray beam polygon changes continuously across the midpoint and reverses", () => {
  const page = browser();
  const width = 600 * 130 / 237;
  for (const progress of [0, .25, .49, .5, .51, .75, 1, .51, .49, 0]) {
    page.rect.top = (1 - progress) * page.window.innerHeight;
    page.dispatch("scroll");
    const left = width * .26 * progress;
    const right = width * (.74 + .26 * progress);
    const expected = [[0, 0], [width, 0], [right, 42], [right, 558], [width, 600], [0, 600], [left, 558], [left, 42]];
    const vertices = page.vertices();
    assert.equal(vertices.length, 8);
    vertices.forEach((point, index) => point.forEach((value, axis) => closeTo(value, expected[index][axis])));
    assert.equal(page.fills().length, 2);
    assert.equal(page.fills()[0], "#b8b8b8");
  }
});

test("canvas backing dimensions use DPR capped at two and resize with its stage", () => {
  const page = browser({ dpr: 3 });
  assert.equal(page.canvas.width, 2400);
  assert.equal(page.canvas.height, 1200);
  assert.deepEqual(page.calls.find(([name]) => name === "setTransform")[1], [2, 0, 0, 2, 0, 0]);
  page.stage.clientWidth = 390;
  page.stage.clientHeight = 420;
  page.window.devicePixelRatio = 1.25;
  page.window.innerHeight = 600;
  page.rect.top = 300;
  page.dispatch("resize");
  assert.equal(page.canvas.width, 488);
  assert.equal(page.canvas.height, 525);
  assert.deepEqual(page.calls.findLast(([name]) => name === "setTransform")[1], [1.25, 0, 0, 1.25, 0, 0]);
  closeTo(page.travel(), 194);
  page.rect.top = 0;
  page.dispatch("pageshow");
  assert.equal(page.travel(), 0);
});

test("reduced motion draws the final beam, including live preference changes", () => {
  const page = browser({ reduced: true });
  assert.equal(page.travel(), 0);
  closeTo(page.vertices()[6][0], 600 * 130 / 237 * .26);
  page.preference.matches = false;
  page.dispatch("motion:change");
  assert.equal(page.travel(), 1198);
  assert.equal(page.vertices()[6][0], 0);
  page.preference.matches = true;
  page.dispatch("motion:change");
  assert.equal(page.travel(), 0);
  closeTo(page.vertices()[6][0], 600 * 130 / 237 * .26);
});

test("multiple scroll events share one paint frame and later scrolls can repaint", () => {
  const page = browser();
  const initialPaints = page.calls.filter(([name]) => name === "clearRect").length;
  page.events.get("scroll")();
  page.events.get("scroll")();
  page.events.get("scroll")();
  assert.equal(page.frames.length, 1);
  page.dispatch("scroll");
  assert.equal(page.calls.filter(([name]) => name === "clearRect").length, initialPaints + 1);
  page.events.get("scroll")();
  assert.equal(page.frames.length, 1);
});

test("missing Opening, canvas, or drawing context attaches no listeners", () => {
  for (const option of ["missingOpening", "missingCanvas", "noContext"]) {
    const page = browser({ [option]: true });
    assert.equal(page.events.size, 0);
    assert.equal(page.calls.length, 0);
  }
});
