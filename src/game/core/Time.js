// Relógio do jogo: delta time + acumulador para passos fixos de simulação.
// Passos fixos garantem física estável independente do FPS.

export class Time {
  constructor(fixedStep = 1 / 60, maxStepsPerFrame = 5) {
    this.fixedStep = fixedStep;
    this.maxStepsPerFrame = maxStepsPerFrame;
    this.accumulator = 0;
    this.delta = 0;
    this.elapsed = 0;
    this.last = 0;
    this.started = false;
  }

  start(now) {
    this.last = now;
    this.accumulator = 0;
    this.delta = 0;
    this.started = true;
  }

  // Atualiza o delta a partir do timestamp do requestAnimationFrame.
  update(now) {
    if (!this.started) {
      this.start(now);
      return 0;
    }
    let frameTime = (now - this.last) / 1000;
    this.last = now;
    // Evita "saltos" enormes quando a aba fica em segundo plano.
    if (frameTime > 0.25) frameTime = 0.25;
    if (frameTime < 0) frameTime = 0;
    this.delta = frameTime;
    this.elapsed += frameTime;
    this.accumulator += frameTime;
    return frameTime;
  }

  // Executa o callback em passos fixos enquanto houver acumulador.
  consumeFixedSteps(callback) {
    let steps = 0;
    while (this.accumulator >= this.fixedStep && steps < this.maxStepsPerFrame) {
      callback(this.fixedStep);
      this.accumulator -= this.fixedStep;
      steps += 1;
    }
    return steps;
  }
}
