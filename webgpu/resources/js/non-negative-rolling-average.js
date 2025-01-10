// See https://webgpufundamentals.org/webgpu/lessons/webgpu-timing.html
// Note: We disallow negative values as this is used for timestamp queries
// where it's possible for a query to return a beginning time greater than the
// end time. See: https://gpuweb.github.io/gpuweb/#timestamp
export default class NonNegativeRollingAverage {
  #total = 0;
  #samples = [];
  #cursor = 0;
  #numSamples;
  constructor(numSamples = 30) {
    this.#numSamples = numSamples;
  }
  addSample(v) {
    if (!Number.isNaN(v) && Number.isFinite(v) && v >= 0) {
      this.#total += v - (this.#samples[this.#cursor] || 0);
      this.#samples[this.#cursor] = v;
      this.#cursor = (this.#cursor + 1) % this.#numSamples;
    }
  }
  get() {
    return this.#total / this.#samples.length;
  }
}
