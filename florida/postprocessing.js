import {
  AddEquation, DstAlphaFactor, DstColorFactor, REVISION, ZeroFactor,
} from 'three';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';

const configured = new WeakSet();
const SAMPLE = 'gl_FragColor = texture2D( tDiffuse, vUv );';
const DECLARATION = 'uniform sampler2D tDiffuse;';

function requireContract(condition, detail) {
  if (!condition) throw new Error(`Combined AO output requires the pinned Three.js SSAOPass contract: ${detail}`);
}

/**
 * Use immediately after the supplied SSAOPass in RenderPass -> SSAOPass -> output.
 * SSAO still renders its original normals, kernel and blur at its configured size.
 * Only the final destination-color multiply moves into OutputPass, in linear light
 * before tone mapping. This avoids another beauty-buffer write and MSAA resolve.
 *
 * SSAOPass has no public "compute only" output. The sole internal adaptation is
 * its _renderPass dispatch: Default-mode copy is skipped, all other draws delegate.
 * In particular, an existing ao.render wrapper and diagnostic outputs still work.
 */
export function makeCombinedOutputPass(ao) {
  requireContract(REVISION === '185', `revision ${REVISION}`);
  requireContract(ao instanceof SSAOPass && ao.needsSwap === false, 'expected an SSAOPass without buffer swapping');
  requireContract(typeof ao._renderPass === 'function' && ao.blurRenderTarget?.texture?.isTexture, 'missing blur target or render dispatch');
  const copy = ao.copyMaterial;
  requireContract(copy?.blendSrc === DstColorFactor && copy.blendDst === ZeroFactor && copy.blendEquation === AddEquation &&
    copy.blendSrcAlpha === DstAlphaFactor && copy.blendDstAlpha === ZeroFactor && copy.blendEquationAlpha === AddEquation &&
    typeof copy.uniforms?.opacity?.value === 'number', 'copy blending is no longer a component-wise destination multiply');
  requireContract(!configured.has(ao), 'this SSAOPass already has a combined output');

  const output = new OutputPass(), shader = output.material.fragmentShader;
  requireContract(shader.split(SAMPLE).length === 2 && shader.split(DECLARATION).length === 2 &&
    shader.indexOf(SAMPLE) < shader.indexOf('// tone mapping'), 'OutputShader sampling/tone-mapping layout changed');
  output.uniforms.tAmbientOcclusion = {value: ao.blurRenderTarget.texture};
  output.uniforms.ambientOcclusionEnabled = {value: false};
  output.uniforms.ambientOcclusionOpacity = {value: copy.uniforms.opacity.value};
  output.material.fragmentShader = shader
    .replace(DECLARATION, `${DECLARATION}
    uniform highp sampler2D tAmbientOcclusion;
    uniform bool ambientOcclusionEnabled;
    uniform float ambientOcclusionOpacity;`)
    .replace(SAMPLE, `${SAMPLE}
    if ( ambientOcclusionEnabled ) {
      gl_FragColor *= texture2D( tAmbientOcclusion, vUv ) * ambientOcclusionOpacity;
    }`);

  const renderAOStage = ao._renderPass;
  function renderAOStageWithoutComposite(renderer, material, ...args) {
    if (ao.output === SSAOPass.OUTPUT.Default && material === copy) return;
    return renderAOStage.call(this, renderer, material, ...args);
  }
  ao._renderPass = renderAOStageWithoutComposite;
  configured.add(ao);

  const renderOutput = output.render;
  output.render = function(renderer, writeBuffer, readBuffer, ...args) {
    // Read these per frame: graphics mode can change and render targets can resize.
    output.uniforms.ambientOcclusionEnabled.value = ao.enabled && ao.output === SSAOPass.OUTPUT.Default;
    output.uniforms.tAmbientOcclusion.value = ao.blurRenderTarget.texture;
    output.uniforms.ambientOcclusionOpacity.value = copy.uniforms.opacity.value;
    return renderOutput.call(this, renderer, writeBuffer, readBuffer, ...args);
  };
  const disposeOutput = output.dispose;
  output.dispose = function() {
    if (ao._renderPass === renderAOStageWithoutComposite) ao._renderPass = renderAOStage;
    configured.delete(ao);
    return disposeOutput.call(this);
  };
  return output;
}
