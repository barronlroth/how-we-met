// F2 diagnostics measure the same real demo route before and after rendering changes.
// No browser telemetry leaves the device. The first five race seconds warm shaders.
export function createFrameProfile() {
  const sections = new Map();
  return {
    reset() { sections.clear(); },
    sample(section, frameMs, renderMs, calls, triangles) {
      let row = sections.get(section);
      if (!row) sections.set(section, row = { frames: [], time: 0, render: 0, calls: 0, triangles: 0 });
      row.frames.push(frameMs); row.time += frameMs; row.render += renderMs;
      row.calls += calls; row.triangles += triangles;
    },
    summary() {
      return [...sections].map(([name, row]) => {
        const n = row.frames.length, sorted = [...row.frames].sort((a, b) => a - b);
        return `${name}: ${(n * 1000 / row.time).toFixed(1)} fps | p95 ${sorted[Math.ceil(n * .95) - 1].toFixed(1)}ms | render ${(row.render / n).toFixed(1)}ms | ${Math.round(row.calls / n)} draws | ${(row.triangles / n / 1e6).toFixed(2)}M tris`;
      }).join('\n');
    }
  };
}
