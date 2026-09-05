export function graphicsProfile(mode, deviceDpr = 1) {
  const smooth = mode === 'smooth';
  return { pixelRatio: Math.min(deviceDpr, smooth ? 1 : 1.25), samples: smooth ? 2 : 4, shadowSize: smooth ? 1024 : 2048, ao: !smooth };
}
