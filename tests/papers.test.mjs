import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const script = readFileSync(new URL("../src/home/papers.js", import.meta.url), "utf8");

function browser({ reduced = false, missing, width = 300, viewport = 1440 } = {}) {
  const events = new Map();
  const frames = [];
  const rect = { top: 624, width };
  let reads = 0;
  const scene = {
    getBoundingClientRect() { reads++; return rect; },
    viewBox: { baseVal: { width: 300 } },
  };
  const papers = [{ style: {} }, { style: {} }];
  const elements = { ".character-cards": scene, ".paper--left": papers[0], ".paper--right": papers[1] };
  const preference = {
    matches: reduced,
    addEventListener: (name, handler) => events.set(`motion:${name}`, handler),
  };
  const window = {
    innerWidth: viewport,
    innerHeight: 800,
    matchMedia: () => preference,
    addEventListener: (name, handler) => events.set(name, handler),
    requestAnimationFrame(handler) { frames.push(handler); return frames.length; },
  };
  vm.runInNewContext(script, {
    document: { querySelector: (selector) => selector === missing ? null : elements[selector] },
    window,
  });
  function dispatch(name) { events.get(name)(); frames.splice(0).forEach((frame) => frame()); }
  return {
    rect, window, preference, events, frames, papers,
    reads: () => reads,
    poses: () => papers.map((paper) => ({ ...paper.style })),
    dispatch,
    progress(value) { rect.top = window.innerHeight * (.78 - .55 * value); dispatch("scroll"); },
    motion(value) { preference.matches = value; dispatch("motion:change"); },
  };
}

function transform(style) {
  return style.transform.match(/translate\(([-\d.e]+)px, ([-\d.e]+)px\) rotate\(([-\d.e]+)deg\) skewY\(([-\d.e]+)deg\)/).slice(1).map(Number);
}

function closeTo(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} should equal ${expected}`);
}

function assertSettled(page) {
  page.poses().forEach((pose) => {
    transform(pose).forEach((value) => closeTo(value, 0));
    closeTo(pose.opacity, 1);
  });
}

test("papers enter from opposite sides, flutter, stagger, and settle", () => {
  const page = browser({ width: 150, viewport: 390 });
  assert.equal(transform(page.poses()[0])[0], -540);
  assert.equal(transform(page.poses()[1])[0], 540);
  assert.ok(page.poses().every((pose) => pose.opacity === 0));
  page.progress(.03);
  assert.ok(page.poses()[0].opacity > 0);
  assert.equal(page.poses()[1].opacity, 0);
  const samples = [[], []];
  for (let step = 1; step < 60; step++) {
    page.progress(step / 60);
    page.poses().forEach((pose, index) => samples[index].push(transform(pose)));
  }
  samples.forEach((poses, index) => {
    assert.ok(poses.every(([x]) => index ? x >= 0 : x <= 0));
    for (const axis of [1, 2, 3]) {
      assert.ok(poses.some((pose) => pose[axis] > 0) && poses.some((pose) => pose[axis] < 0));
    }
  });
  page.progress(1);
  assertSettled(page);
  page.progress(2);
  assertSettled(page);
});

test("scrolling up exactly reverses paper positions and opacity", () => {
  const page = browser();
  const forward = new Map();
  for (const progress of [0, .25, .5, .75, 1]) {
    page.progress(progress);
    forward.set(progress, page.poses());
  }
  for (const progress of [.75, .5, .25, 0]) {
    page.progress(progress);
    assert.deepEqual(page.poses(), forward.get(progress));
  }
  page.progress(-1);
  assert.deepEqual(page.poses(), forward.get(0));
});

test("resize recalibrates viewport travel and SVG scale, and pageshow restores the current pose", () => {
  const page = browser({ width: 150, viewport: 390 });
  page.rect.width = 300;
  page.window.innerWidth = 1440;
  page.window.innerHeight = 900;
  page.rect.top = 702;
  page.dispatch("resize");
  closeTo(transform(page.poses()[0])[0], -870);
  closeTo(transform(page.poses()[1])[0], 870);
  page.rect.width = 195;
  page.window.innerWidth = 390;
  page.window.innerHeight = 844;
  page.rect.top = 844 * .78;
  page.dispatch("resize");
  closeTo(transform(page.poses()[0])[0], -450);
  page.rect.top = 0;
  page.dispatch("pageshow");
  assertSettled(page);
});

test("reduced motion shows final papers and restores the scroll pose when disabled", () => {
  const page = browser({ reduced: true });
  assertSettled(page);
  page.motion(false);
  assert.equal(transform(page.poses()[0])[0], -870);
  page.progress(.5);
  const middle = page.poses();
  page.motion(true);
  assertSettled(page);
  page.motion(false);
  assert.deepEqual(page.poses(), middle);
});

test("multiple scroll events share one frame and later events can update again", () => {
  const page = browser();
  const initialReads = page.reads();
  page.events.get("scroll")();
  page.events.get("scroll")();
  page.events.get("scroll")();
  assert.equal(page.frames.length, 1);
  assert.equal(page.reads(), initialReads);
  page.dispatch("scroll");
  assert.equal(page.reads(), initialReads + 1);
  page.events.get("scroll")();
  assert.equal(page.frames.length, 1);
});

test("missing elements return early and zero-width scenes recover on resize", () => {
  for (const missing of [".character-cards", ".paper--left", ".paper--right"]) {
    const page = browser({ missing });
    assert.equal(page.events.size, 0);
    assert.equal(page.reads(), 0);
  }
  const page = browser({ width: 0 });
  assert.ok(page.poses().every((pose) => pose.transform === undefined));
  page.rect.width = 300;
  page.dispatch("resize");
  assert.equal(transform(page.poses()[0])[0], -870);
});
