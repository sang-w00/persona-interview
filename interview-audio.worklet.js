// Independent, complete PCM chunks, not MediaRecorder timeslices with missing container headers.
class InterviewAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(Math.ceil(sampleRate * 4));
    this.length = 0; this.startFrame = 0; this.voiced = 0; this.silent = 0;
    this.port.onmessage = event => {
      if (event.data === 'flush') { this.flush(); this.port.postMessage({ type: 'flushed' }); }
    };
  }
  flush() {
    if (this.length) {
      const samples = this.buffer.slice(0, this.length);
      this.port.postMessage({ type: 'audio', samples, startFrame: this.startFrame }, [samples.buffer]);
    }
    this.length = 0; this.voiced = 0; this.silent = 0;
  }
  process(inputs) {
    const data = inputs[0]?.[0];
    if (!data) return true;
    let energy = 0;
    for (const value of data) energy += value * value;
    const voiced = Math.sqrt(energy / data.length) >= .015;
    if (voiced) { this.voiced += data.length; this.silent = 0; } else this.silent += data.length;
    for (let i = 0; i < data.length; i++) {
      if (!this.length) this.startFrame = currentFrame + i;
      this.buffer[this.length++] = data[i];
      if (this.length === this.buffer.length) this.flush();
    }
    if (this.voiced >= sampleRate * .16 && this.silent >= sampleRate * .65 && this.length >= sampleRate * .8) this.flush();
    return true;
  }
}
registerProcessor('interview-audio', InterviewAudioProcessor);
