// Local, on-device speech-to-text via transformers.js (Whisper tiny, WASM).
// No API key, no account, no network call per use — only a one-time model
// weight download on first use, cached by the browser afterward. Everything
// else (the library code, the ONNX runtime WASM binaries) ships locally in
// node_modules so it works without depending on a CDN staying up.

import { pipeline, env } from '../node_modules/@huggingface/transformers/dist/transformers.web.js';

// Point directly at the exact local files (as absolute file:// URLs) rather
// than a directory prefix — the bundled loader's own relative-path math
// double-nests the directory when given a prefix under file://.
const wasmDir = new URL('../node_modules/onnxruntime-web/dist/', import.meta.url).href;
env.backends.onnx.wasm.wasmPaths = {
  'ort-wasm-simd-threaded.asyncify.mjs': `${wasmDir}ort-wasm-simd-threaded.asyncify.mjs`,
  'ort-wasm-simd-threaded.asyncify.wasm': `${wasmDir}ort-wasm-simd-threaded.asyncify.wasm`
};

let transcriberPromise = null;

function getTranscriber() {
  if (!transcriberPromise) {
    // fp32 for both sub-models: the quantized (q8/q4) decoder variants throw
    // "Missing required scale" from onnxruntime-web's MatMulNBits op with this
    // build — a real incompatibility, not a config mistake. fp32 means a
    // larger one-time download, but it's the combination that actually works.
    transcriberPromise = pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny.en', {
      dtype: { encoder_model: 'fp32', decoder_model_merged: 'fp32' }
    });
  }
  return transcriberPromise;
}

async function transcribe(float32Audio) {
  const transcriber = await getTranscriber();
  const result = await transcriber(float32Audio, { sampling_rate: 16000 });
  return ((result && result.text) || '').trim();
}

window.buddySTT = {
  preload: getTranscriber,
  transcribe
};
window.dispatchEvent(new Event('buddystt-ready'));
