import { test, expect, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execute = promisify(execFile);

async function startCapture(page: Page, route: string) {
  return page.evaluate(({ route }) => {
    const harness = (window as any).cadenceHarness;
    harness.render({ route, time: 0, markers: false }); harness.startRecording();
    const canvas = document.querySelector('canvas')!, requestedFrameRate = 30;
    const stream = canvas.captureStream(requestedFrameRate);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8') ? 'video/webm;codecs=vp8' : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
    const chunks: Blob[] = [];
    recorder.addEventListener('dataavailable', event => { if (event.data.size) chunks.push(event.data); });
    const done = new Promise<string>(resolve => recorder.addEventListener('stop', () => {
      const reader = new FileReader(); reader.onloadend = () => resolve(String(reader.result).split(',')[1]);
      reader.readAsDataURL(new Blob(chunks, { type: mimeType }));
    }));
    (window as any).__cadenceCapture = { stream, recorder, done, startedAt: performance.now() };
    const settings = stream.getVideoTracks()[0].getSettings(); recorder.start(100); harness.play();
    return { width: settings.width, height: settings.height, advertisedFrameRate: settings.frameRate, requestedFrameRate, mimeType,
      encoding: 'Actual canvas capture; no interpolation or synthetic frame filling' };
  }, { route });
}
async function finishCapture(page: Page) {
  return page.evaluate(async () => {
    const harness = (window as any).cadenceHarness; harness.pause();
    const recording = harness.stopRecording(), capture = (window as any).__cadenceCapture;
    const captureSeconds = (performance.now() - capture.startedAt) / 1000;
    capture.recorder.stop(); const videoBase64 = await capture.done;
    capture.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    delete (window as any).__cadenceCapture;
    return { recording, captureSeconds, videoBase64 };
  });
}
async function encodedTiming(path: string) {
  const { stdout } = await execute('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_frames', '-show_entries',
    'frame=best_effort_timestamp_time', '-of', 'json', path], { maxBuffer: 8 * 1024 * 1024 });
  const parsed = JSON.parse(stdout), pts: number[] = parsed.frames.map((f: any) => Number(f.best_effort_timestamp_time)).filter(Number.isFinite);
  const gaps = pts.slice(1).map((t, i) => t - pts[i]), sorted = [...gaps].sort((a, b) => a - b);
  const span = pts.length > 1 ? pts.at(-1)! - pts[0] : 0;
  return { actualVideoFrames: pts.length, firstPTS: pts[0], lastPTS: pts.at(-1), firstToLastVideoPTS: span,
    achievedIntervalsPerSecond: span ? (pts.length - 1) / span : 0, framePTSSeconds: pts, frameGapsSeconds: gaps,
    medianFrameGapSeconds: sorted[Math.floor(sorted.length / 2)], p95FrameGapSeconds: sorted[Math.floor(sorted.length * .95)],
    maxFrameGapSeconds: Math.max(...gaps), gapsOver50ms: gaps.filter(g => g > .05).length,
    reviewCadence: 'Measured encoded frame PTS; requested capture rate is not achieved FPS' };
}

for (const route of ['east', 'northeast', 'southeast', 'turns']) test(`compact floor24 native ${route}`, async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/cadence.html?variant=24');
  await page.waitForFunction(() => !!(window as any).cadenceHarness?.ready);
  for (const time of [.15, .32, .48, .8, 1.2, 1.7, 2.2, 2.7, 3.5]) {
    const snapshot = await page.evaluate(({ route, time }) => (window as any).cadenceHarness.render({ route, time, markers: false }), { route, time });
    expect(snapshot.variant).toBe(24); expect(snapshot.scale).toBe(1); expect(snapshot.width).toBe(720); expect(snapshot.height).toBe(300);
    expect(snapshot.floorSurfaces).toBe(2); expect(snapshot.gameplayDefaultChanged).toBe(false);
    expect(snapshot.metrics.newMaxSupportSlidePxPerSecond).toBe(0); expect(snapshot.metrics.maxLegLengthError).toBeLessThan(1e-6);
    expect(snapshot.actors).toHaveLength(2);
    for (const actor of snapshot.actors) { expect(actor.layers).toHaveLength(15); expect(actor.layers.every((p: any) => p.visible)).toBe(true); expect(actor.rig.texture).toBe('ordinary-weapon-sword'); }
    if ([.48, 1.2, 2.7].includes(time)) await page.screenshot({ path: testInfo.outputPath(`${route}-${time.toFixed(2)}-native.png`), fullPage: true });
  }
  const captureSettings = await startCapture(page, route);
  expect(captureSettings.width).toBe(720); expect(captureSettings.height).toBe(300);
  await page.waitForFunction(() => (window as any).cadenceHarness.snapshot().time >= 4, undefined, { timeout: 15000 });
  await page.waitForTimeout(80);
  const { recording, captureSeconds, videoBase64 } = await finishCapture(page);
  const videoFile = testInfo.outputPath(`${route}-compact-native.webm`);
  await writeFile(videoFile, Buffer.from(videoBase64, 'base64'));
  const videoTiming = await encodedTiming(videoFile);
  const file = testInfo.outputPath(`${route}-compact-metrics.json`);
  await writeFile(file, JSON.stringify({ ...recording, captureSettings, captureSeconds, videoTiming,
    qualityWarning: videoTiming.achievedIntervalsPerSecond < 25 ? 'Achieved cadence below 25fps; visual judgment limited' : null }, null, 2));
  await testInfo.attach(`${route}-compact-native`, { path: videoFile, contentType: 'video/webm' });
  await testInfo.attach(`${route}-compact-metrics`, { path: file, contentType: 'application/json' });
  expect(recording.metrics.samples).toBeGreaterThan(30); expect(recording.samples.at(-1).time).toBe(4);
  expect(recording.samples.every((f: any, i: number) => !i || f.time >= recording.samples[i - 1].time)).toBe(true);
  expect(videoTiming.actualVideoFrames).toBeGreaterThan(20);
  expect(recording.metrics.maxRenderedAnkleError).toBeLessThan(1e-4);
  expect(recording.metrics.minRenderedThighDrop).toBeGreaterThanOrEqual(9.9999);
  expect(recording.metrics.minRenderedShinDrop).toBeGreaterThanOrEqual(10.9999);
  expect(recording.metrics.minRenderedAnkleDrop).toBeGreaterThanOrEqual(23.9999);
  expect(recording.metrics.maxRenderedSupportFrameDelta).toBeLessThan(.0005);
  expect(recording.metrics.maxRenderedSupportDriftPxPerSecond).toBeLessThan(.02);
  // Details are stills only: never place the enlarged views in the video.
  await page.setViewportSize({ width: 1280, height: 700 });
  await page.goto('/cadence.html?variant=24&detail=1');
  await page.waitForFunction(() => !!(window as any).cadenceHarness?.ready);
  const times = route === 'turns' ? [.48, 1.2, 1.65, 1.72, 1.8, 1.9, 2.7] : [.48, 1.2, 2.7];
  for (const time of times) {
    await page.evaluate(({ route, time }) => (window as any).cadenceHarness.render({ route, time, markers: true }), { route, time });
    await page.screenshot({ path: testInfo.outputPath(`${route}-${time.toFixed(2)}-3x-detail.png`), fullPage: true });
  }
  expect(errors).toEqual([]);
});
