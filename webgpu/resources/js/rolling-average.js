// See https://webgpufundamentals.org/webgpu/lessons/webgpu-timing.html
export default class RollingAverage {
  #total = 0;
  #samples = [];
  #cursor = 0;
  #numSamples;
  constructor(numSamples = 30) {
    this.#numSamples = numSamples;
  }
  addSample(v) {
    if (!Number.isNaN(v) && Number.isFinite(v)) {
      this.#total += v - (this.#samples[this.#cursor] || 0);
      this.#samples[this.#cursor] = v;
      this.#cursor = (this.#cursor + 1) % this.#numSamples;
    }
  }
  get() {
    return this.#total / this.#samples.length;
  }
}
