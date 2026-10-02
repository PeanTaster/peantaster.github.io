// Полноэкранные эффекты на canvas. Каждый эффект — класс с методом run(),
// возвращающим Promise, который резолвится при выходе (Esc / q).

class FullscreenEffect {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.running = false;
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  run() {
    return new Promise((resolve) => {
      this.running = true;
      this.canvas.hidden = false;
      this.resize();

      const onResize = () => this.resize();
      const onKey = (e) => {
        if (e.key === "Escape" || e.key === "q") stop();
        else this.onKey?.(e);
      };
      const onTouch = (e) => this.onTouch?.(e);
      const stop = () => {
        this.running = false;
        this.canvas.hidden = true;
        window.removeEventListener("resize", onResize);
        window.removeEventListener("keydown", onKey);
        this.canvas.removeEventListener("touchstart", onTouch);
        this.canvas.removeEventListener("dblclick", stop);
        resolve(this.result);
      };
      this.stop = stop;

      window.addEventListener("resize", onResize);
      window.addEventListener("keydown", onKey);
      this.canvas.addEventListener("touchstart", onTouch, { passive: true });
      this.canvas.addEventListener("dblclick", stop);
      this.start();
    });
  }
}

export class MatrixRain extends FullscreenEffect {
  static GLYPHS = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789PSΣ{}<>$";

  start() {
    const size = 16;
    let drops = [];
    const frame = () => {
      if (!this.running) return;
      const cols = Math.ceil(this.width / size);
      if (drops.length !== cols) drops = Array.from({ length: cols }, () => Math.random() * -50);

      this.ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.font = `${size}px monospace`;

      drops.forEach((y, i) => {
        const glyph = MatrixRain.GLYPHS[Math.floor(Math.random() * MatrixRain.GLYPHS.length)];
        this.ctx.fillStyle = Math.random() > 0.975 ? "#d8ffd8" : "#33ff66";
        this.ctx.fillText(glyph, i * size, y * size);
        drops[i] = y * size > this.height && Math.random() > 0.975 ? 0 : y + 1;
      });

      this.ctx.fillStyle = "#33ff66";
      this.ctx.font = "13px monospace";
      this.ctx.fillText("Esc — выход", 10, this.height - 10);
      setTimeout(() => requestAnimationFrame(frame), 40);
    };
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, this.width, this.height);
    frame();
  }
}

export class SnakeGame extends FullscreenEffect {
  static GRID = 20;
  static DIRS = {
    ArrowUp: [0, -1], w: [0, -1], ц: [0, -1],
    ArrowDown: [0, 1], s: [0, 1], ы: [0, 1],
    ArrowLeft: [-1, 0], a: [-1, 0], ф: [-1, 0],
    ArrowRight: [1, 0], d: [1, 0], в: [1, 0],
  };

  start() {
    const n = SnakeGame.GRID;
    this.snake = [[10, 10], [9, 10], [8, 10]];
    this.dir = [1, 0];
    this.queue = [];
    this.result = 0;
    this.over = false;
    this.#placeFood();

    const tick = () => {
      if (!this.running) return;
      if (!this.over) this.#step(n);
      this.#draw(n);
      setTimeout(tick, Math.max(60, 130 - this.result * 3));
    };
    tick();
  }

  onKey(e) {
    const d = SnakeGame.DIRS[e.key] ?? SnakeGame.DIRS[e.key.toLowerCase()];
    if (d) {
      e.preventDefault();
      this.queue.push(d);
    } else if (this.over && (e.key === "Enter" || e.key === " ")) {
      this.stop();
    }
  }

  onTouch(e) {
    if (this.over) return this.stop();
    const t = e.touches[0];
    const dx = t.clientX - this.width / 2;
    const dy = t.clientY - this.height / 2;
    this.queue.push(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]);
  }

  #placeFood() {
    const n = SnakeGame.GRID;
    do {
      this.food = [Math.floor(Math.random() * n), Math.floor(Math.random() * n)];
    } while (this.snake.some(([x, y]) => x === this.food[0] && y === this.food[1]));
  }

  #step(n) {
    while (this.queue.length) {
      const next = this.queue.shift();
      if (next[0] !== -this.dir[0] || next[1] !== -this.dir[1]) {
        this.dir = next;
        break;
      }
    }
    const [hx, hy] = this.snake[0];
    const head = [(hx + this.dir[0] + n) % n, (hy + this.dir[1] + n) % n];
    if (this.snake.some(([x, y]) => x === head[0] && y === head[1])) {
      this.over = true;
      return;
    }
    this.snake.unshift(head);
    if (head[0] === this.food[0] && head[1] === this.food[1]) {
      this.result++;
      this.#placeFood();
    } else {
      this.snake.pop();
    }
  }

  #draw(n) {
    const ctx = this.ctx;
    const board = Math.min(this.width, this.height) * 0.85;
    const cell = board / n;
    const ox = (this.width - board) / 2;
    const oy = (this.height - board) / 2;

    ctx.fillStyle = "#012456";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.strokeStyle = "#2a4a80";
    ctx.strokeRect(ox, oy, board, board);

    ctx.fillStyle = "#f9f1a5";
    ctx.fillRect(ox + this.food[0] * cell + 2, oy + this.food[1] * cell + 2, cell - 4, cell - 4);

    this.snake.forEach(([x, y], i) => {
      ctx.fillStyle = i === 0 ? "#ffffff" : "#6be38a";
      ctx.fillRect(ox + x * cell + 1, oy + y * cell + 1, cell - 2, cell - 2);
    });

    ctx.fillStyle = "#eeedf0";
    ctx.font = "16px monospace";
    ctx.fillText(`Счёт: ${this.result}   Esc — выход`, ox, oy - 8);

    if (this.over) {
      ctx.fillStyle = "rgba(0,0,0,.6)";
      ctx.fillRect(ox, oy, board, board);
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "bold 28px monospace";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", this.width / 2, this.height / 2);
      ctx.font = "16px monospace";
      ctx.fillStyle = "#eeedf0";
      ctx.fillText("Enter — вернуться в терминал", this.width / 2, this.height / 2 + 30);
      ctx.textAlign = "start";
    }
  }
}
