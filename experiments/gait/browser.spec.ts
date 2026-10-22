import { test, expect, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

/** Capture only the continuous route, at the canvas's native 1200×820 pixels. */
async function startContinuousCapture(page: Page, route: string) {
  return page.evaluate(({ route }) => {
    const harness = (window as any).gaitHarness;
    harness.render({ route, time: 0 });
    harness.startRecording();
    const canvas = document.querySelector('canvas')!;
    const stream = canvas.captureStream(60);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9' : 'video/webm';
    const recorder = new MediaRecorder(stream, {
      mimeType, videoBitsPerSecond: 8_000_000,
    });
    const chunks: Blob[] = [];
    recorder.addEventListener('dataavailable', event => {
      if (event.data.size) chunks.push(event.data);
    });
    const done = new Promise<string>(resolve => {
      recorder.addEventListener('stop', () => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result).split(',')[1]);
        reader.readAsDataURL(new Blob(chunks, { type: mimeType }));
      });
    });
    (window as any).__gaitCapture = { stream, recorder, done };
    const { width, height, frameRate } = stream.getVideoTracks()[0].getSettings();
    recorder.start(100);
    harness.play();
    return { width, height, frameRate, mimeType };
  }, { route });
}

async function stopContinuousCapture(page: Page) {
  return page.evaluate(async () => {
    const harness = (window as any).gaitHarness;
    harness.pause();
    const recording = harness.stopRecording();
    const capture = (window as any).__gaitCapture;
    capture.recorder.stop();
    const videoBase64 = await capture.done;
    capture.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    delete (window as any).__gaitCapture;
    return { recording, videoBase64 };
  });
}

for (const route of ['east', 'northeast', 'southeast', 'turns']) {
  test(`controlled Phaser gait ${route}`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/gait.html');
    await page.waitForFunction(() => !!(window as any).gaitHarness?.ready);
    for (const time of [.15, .32, .48, .8, 1.2, 1.7, 2.2, 2.7, 3.5]) {
      const snapshot = await page.evaluate(({ route, time }) =>
        (window as any).gaitHarness.render({ route, time, markers: true, follow: true }),
      { route, time });
      expect(snapshot.metrics.gameplayDefaultChanged).toBe(false);
      expect(snapshot.metrics.newMaxSupportSlidePxPerSecond).toBeLessThan(1e-6);
      expect(snapshot.metrics.maxReachError).toBeLessThan(1e-6);
      expect(snapshot.metrics.maxLegLengthError).toBeLessThan(1e-6);
      expect(snapshot.actors).toHaveLength(4);
      for (const actor of snapshot.actors) {
        expect(actor.layers).toHaveLength(15);
        expect(actor.layers.every((part: any) => part.visible)).toBe(true);
        expect(actor.rig.texture).toBe('ordinary-weapon-sword');
        expect(actor.rig.visible).toBe(true);
      }
      if ([.48, 1.2, 2.7].includes(time)) {
        const file = testInfo.outputPath(`${route}-${time.toFixed(2)}.png`);
        await page.screenshot({ path: file, fullPage: true });
        await testInfo.attach(`${route}-${time}`, { path: file, contentType: 'image/png' });
      }
    }
    const captureSettings = await startContinuousCapture(page, route);
    expect(captureSettings.width).toBe(1200);
    expect(captureSettings.height).toBe(820);
    await page.waitForTimeout(4100);
    const { recording, videoBase64 } = await stopContinuousCapture(page);
    const videoFile = testInfo.outputPath(`${route}-continuous-native.webm`);
    await writeFile(videoFile, Buffer.from(videoBase64, 'base64'));
    await testInfo.attach(`${route}-continuous-native`, {
      path: videoFile, contentType: 'video/webm',
    });
    const metricsFile = testInfo.outputPath(`${route}-render-metrics.json`);
    await writeFile(metricsFile, JSON.stringify({ ...recording, captureSettings }, null, 2));
    await testInfo.attach(`${route}-render-metrics`, {
      path: metricsFile, contentType: 'application/json',
    });
    expect(recording.metrics.samples).toBeGreaterThan(30);
    expect(recording.metrics.maxRenderedAnkleError).toBeLessThan(1e-4);
    // Float32 screen-coordinate rounding is amplified when divided by frame dt.
    expect(recording.metrics.maxRenderedSupportFrameDelta).toBeLessThan(.0005);
    expect(recording.metrics.maxRenderedSupportDriftPxPerSecond).toBeLessThan(.02);
    expect(errors).toEqual([]);
  });
}
