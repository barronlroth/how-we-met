import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  ACESFilmicToneMapping, AgXToneMapping, Color, CustomBlending, HalfFloatType,
  PerspectiveCamera, Scene, SRGBColorSpace, Texture, WebGLRenderTarget,
} from 'three';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputShader} from 'three/addons/shaders/OutputShader.js';
import {SSAOBlurShader} from 'three/addons/shaders/SSAOShader.js';
import {CopyShader} from 'three/addons/shaders/CopyShader.js';
import {makeCombinedOutputPass} from '../florida/postprocessing.js';

function rendererRecorder() {
  let target = null, alpha = 1;
  const color = new Color();
  return {
    draws: [], targets: [], autoClear: true, outputColorSpace: SRGBColorSpace,
    toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.1,
    getClearColor(out) { return out.copy(color); }, getClearAlpha() { return alpha; },
    setClearColor(value) { color.set(value); }, setClearAlpha(value) { alpha = value; },
    setRenderTarget(value) { target = value; this.targets.push(value); }, clear() {},
    render(object) { this.draws.push({target, material: object.material || object.overrideMaterial}); },
  };
}
function pass() { return new SSAOPass(new Scene(), new PerspectiveCamera(), 800, 450, 12); }

test('pinned shader contract preserves the complete output transform and copies RGBA AO before tone mapping', async () => {
  const pkg = JSON.parse(await readFile(new URL('../node_modules/three/package.json', import.meta.url)));
  assert.equal(pkg.version, '0.185.1', 'audit the narrow SSAOPass hook when upgrading Three');
  const ao = pass(), output = makeCombinedOutputPass(ao), shader = output.material.fragmentShader;
  assert.equal(ao.copyMaterial.uniforms.opacity.value, 1);
  assert.match(CopyShader.fragmentShader, /gl_FragColor = opacity \* texel;/);
  assert.match(SSAOBlurShader.fragmentShader, /gl_FragColor = vec4\( vec3\( result \/ \( 5\.0 \* 5\.0 \) \), 1\.0 \);/);
  assert.match(shader, /uniform highp sampler2D tAmbientOcclusion;/, 'retain the original ShaderMaterial AO sampler precision in RawShaderMaterial');
  assert.ok(shader.indexOf('gl_FragColor *= texture2D( tAmbientOcclusion, vUv )') < shader.indexOf('// tone mapping'));
  assert.equal(shader.slice(shader.indexOf('// tone mapping')), OutputShader.fragmentShader.slice(OutputShader.fragmentShader.indexOf('// tone mapping')));
  assert.equal(output.material.vertexShader, OutputShader.vertexShader);
  assert.equal(output.material.uniforms, output.uniforms);
  output.dispose(); ao.dispose();
});

test('real SSAOPass dispatch loses only its final beauty write and retains scene visibility wrappers', () => {
  const ao = pass(), read = new WebGLRenderTarget(1600, 900, {type: HalfFloatType, samples: 4});
  const old = rendererRecorder(); ao.render(old, null, read);
  assert.deepEqual(old.draws.map(draw => draw.target), [ao.normalRenderTarget, ao.ssaoRenderTarget, ao.blurRenderTarget, read]);
  assert.equal(old.draws.at(-1).material, ao.copyMaterial);
  assert.equal(ao.copyMaterial.blending, CustomBlending);
  const render = ao.render.bind(ao); let enter = 0, exit = 0;
  const wrapped = (...args) => { enter++; try { return render(...args); } finally { exit++; } };
  ao.render = wrapped;
  const kernel = ao.kernel, noise = ao.noiseTexture, ssaoShader = ao.ssaoMaterial.fragmentShader, blurShader = ao.blurMaterial.fragmentShader;
  const output = makeCombinedOutputPass(ao), renderer = rendererRecorder(); output.renderToScreen = true;
  ao.render(renderer, null, read); output.render(renderer, null, read);
  assert.equal(ao.render, wrapped); assert.deepEqual([enter, exit], [1, 1]);
  assert.deepEqual(renderer.draws.map(draw => draw.target), [ao.normalRenderTarget, ao.ssaoRenderTarget, ao.blurRenderTarget, null]);
  assert.equal(renderer.targets.includes(read), false, 'there is no second write/resolve of the multisampled beauty target');
  assert.equal(ao.kernel, kernel); assert.equal(ao.kernel.length, 12); assert.equal(ao.noiseTexture, noise);
  assert.equal(ao.ssaoMaterial.fragmentShader, ssaoShader); assert.equal(ao.blurMaterial.fragmentShader, blurShader);
  assert.deepEqual([ao.width, ao.height, read.samples], [800, 450, 4]);
  assert.equal(output.uniforms.tDiffuse.value, read.texture);
  assert.equal(output.uniforms.tAmbientOcclusion.value, ao.blurRenderTarget.texture);
  assert.equal(output.uniforms.ambientOcclusionEnabled.value, true);
  assert.equal(output.material.defines.ACES_FILMIC_TONE_MAPPING, '');
  assert.equal(output.material.defines.SRGB_TRANSFER, '');
  output.dispose(); ao.dispose(); read.dispose();
});

test('Smooth bypasses stale AO and diagnostic modes keep their existing copy path', () => {
  const ao = pass(), output = makeCombinedOutputPass(ao), renderer = rendererRecorder(), read = new WebGLRenderTarget();
  ao.enabled = false; output.render(renderer, null, read);
  assert.equal(output.uniforms.ambientOcclusionEnabled.value, false);
  ao.enabled = true; ao.output = SSAOPass.OUTPUT.Blur; renderer.draws.length = 0;
  ao.render(renderer, null, read); output.render(renderer, null, read);
  assert.equal(renderer.draws.at(-2).target, read);
  assert.equal(renderer.draws.at(-2).material, ao.copyMaterial);
  assert.equal(output.uniforms.ambientOcclusionEnabled.value, false, 'diagnostic AO must not multiply itself');
  ao.output = SSAOPass.OUTPUT.Default; ao.setSize(500, 300); ao.blurRenderTarget.texture = new Texture();
  ao.copyMaterial.uniforms.opacity.value = .8; renderer.toneMapping = AgXToneMapping;
  output.render(renderer, null, read);
  assert.equal(output.uniforms.ambientOcclusionEnabled.value, true);
  assert.equal(output.uniforms.tAmbientOcclusion.value, ao.blurRenderTarget.texture);
  assert.equal(output.uniforms.ambientOcclusionOpacity.value, .8);
  assert.equal(output.material.defines.AGX_TONE_MAPPING, '');
  assert.equal(output.material.defines.SRGB_TRANSFER, '');
  output.dispose(); ao.dispose(); read.dispose();
});

test('invalid blending and duplicate installation fail explicitly; disposal restores the original dispatch', () => {
  const ao = pass(), original = ao._renderPass;
  const blend = ao.copyMaterial.blendSrc; ao.copyMaterial.blendSrc = 999;
  assert.throws(() => makeCombinedOutputPass(ao), /copy blending/);
  ao.copyMaterial.blendSrc = blend; const output = makeCombinedOutputPass(ao);
  assert.throws(() => makeCombinedOutputPass(ao), /already has a combined output/);
  output.dispose(); assert.equal(ao._renderPass, original);
  const replacement = makeCombinedOutputPass(ao); replacement.dispose(); ao.dispose();
});

test('linear AO multiplication commutes with MSAA resolve, preserves alpha, and precedes nonlinear output', () => {
  // Reference is the actual DstColor/DstAlpha source blend on four beauty samples.
  // The fused path samples resolved beauty once and uses the same blurred AO texel.
  const samples = [[.01, .125, 8, .25], [1, .5, 4, .5], [2, 3, 16, .75], [8, .25, 1, 1]];
  const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
  const transfer = value => { const mapped = value / (1 + value); return mapped <= .0031308 ? 12.92 * mapped : 1.055 * mapped ** (1 / 2.4) - .055; };
  for (const ao of [0, .125, .53, 1]) for (const opacity of [.4, 1]) {
    const multiplier = [ao, ao, ao, 1].map(value => value * opacity);
    const reference = multiplier.map((factor, channel) => mean(samples.map(sample => sample[channel] * factor)));
    const fused = multiplier.map((factor, channel) => mean(samples.map(sample => sample[channel])) * factor);
    for (let channel = 0; channel < 4; channel++) assert.ok(Math.abs(reference[channel] - fused[channel]) < 1e-12);
    for (let channel = 0; channel < 3; channel++) assert.ok(Math.abs(transfer(reference[channel]) - transfer(fused[channel])) < 1e-12);
    assert.equal(fused[3], .625 * opacity, 'the grayscale AO factor must not darken alpha');
  }
  assert.notEqual(transfer(2 * .5), transfer(2) * .5, 'multiplication after tone mapping would visibly change the result');
  // Exact GPU bits can differ at the removed half-float intermediate rounding;
  // this checks the unchanged color operation, not cross-driver bit identity.
});
