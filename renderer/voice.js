// Mic capture + resampling to the 16kHz mono Float32 format Whisper expects.
// Plain browser Web Audio APIs — no Node, no network, works under
// contextIsolation/nodeIntegration:false as-is.

let mediaStream = null;
let mediaRecorder = null;
let audioChunks = [];

async function startListening() {
  audioChunks = [];
  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(mediaStream);
  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) audioChunks.push(e.data);
  };
  mediaRecorder.start();
}

function stopListening() {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder) {
      resolve(null);
      return;
    }
    mediaRecorder.onstop = async () => {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
      try {
        const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
        const float32 = await blobToMonoFloat32(blob, 16000);
        resolve(float32);
      } catch (err) {
        reject(err);
      }
    };
    mediaRecorder.stop();
  });
}

async function blobToMonoFloat32(blob, targetSampleRate) {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const decoded = await audioCtx.decodeAudioData(arrayBuffer);
  await audioCtx.close();

  const offlineCtx = new OfflineAudioContext(
    1,
    Math.ceil(decoded.duration * targetSampleRate),
    targetSampleRate
  );
  const source = offlineCtx.createBufferSource();
  source.buffer = decoded;
  source.connect(offlineCtx.destination);
  source.start(0);
  const rendered = await offlineCtx.startRendering();
  return rendered.getChannelData(0);
}

window.buddyVoice = { startListening, stopListening };
