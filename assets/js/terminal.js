// Ядро терминала: вывод, ввод, история, автодополнение.
// Весь вывод идёт через textContent — пользовательский ввод никогда не попадает в HTML.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class CommandRegistry {
  #commands = new Map();
  #aliases = new Map();

  register(command) {
    this.#commands.set(command.name.toLowerCase(), command);
    for (const alias of command.aliases ?? []) this.#aliases.set(alias.toLowerCase(), command);
    return this;
  }

  resolve(name) {
    const key = name.toLowerCase();
    return this.#commands.get(key) ?? this.#aliases.get(key) ?? null;
  }

  get all() {
    return [...this.#commands.values()];
  }

  completions(prefix) {
    const p = prefix.toLowerCase();
    return [...this.#commands.values()]
      .filter((c) => !c.hidden)
      .flatMap((c) => [c.name, ...(c.aliases ?? [])])
      .filter((n) => n.toLowerCase().startsWith(p));
  }
}

export class Terminal {
  #history = [];
  #historyIndex = 0;
  #busy = false;

  constructor({ root, output, input, prompt, registry, vfs, storage }) {
    this.root = root;
    this.output = output;
    this.input = input;
    this.promptEl = prompt;
    this.registry = registry;
    this.vfs = vfs;
    this.storage = storage;
    this.#history = storage.get("history", []);
    this.#historyIndex = this.#history.length;
    this.#bind();
    this.updatePrompt();
  }

  get promptText() {
    return `PS ${this.vfs.promptPath}> `;
  }

  updatePrompt() {
    this.promptEl.textContent = this.promptText;
  }

  print(text = "", cls = "") {
    const line = document.createElement("div");
    line.className = `line ${cls}`.trim();
    line.textContent = text;
    this.output.append(line);
    this.scroll();
    return line;
  }

  printLines(lines, cls = "") {
    for (const l of lines) this.print(l, cls);
  }

  /** Безопасная ссылка: разрешены только https-адреса. */
  printLink(label, href, prefix = "") {
    const line = this.print(prefix);
    let url;
    try {
      url = new URL(href);
    } catch {
      line.append(label);
      return;
    }
    if (url.protocol !== "https:") {
      line.append(label);
      return;
    }
    const a = document.createElement("a");
    a.href = url.href;
    a.textContent = label;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    line.append(a);
  }

  async type(text, cls = "", delay = 12) {
    const line = this.print("", cls);
    for (const ch of text) {
      line.textContent += ch;
      this.scroll();
      if (delay) await sleep(delay);
    }
  }

  clear() {
    this.output.replaceChildren();
  }

  scroll() {
    this.root.scrollTop = this.root.scrollHeight;
  }

  focus() {
    this.input.focus({ preventScroll: true });
  }

  async execute(raw) {
    const line = raw.trim();
    this.print(this.promptText + raw);
    if (!line) return;

    this.#history.push(line);
    this.#history = this.#history.slice(-100);
    this.#historyIndex = this.#history.length;
    this.storage.set("history", this.#history);

    const [name, ...args] = line.match(/"[^"]*"|\S+/g).map((t) => t.replace(/^"|"$/g, ""));
    const command = this.registry.resolve(name);
    if (!command) {
      this.print(`${name} : Имя "${name}" не распознано как имя командлета, функции или программы.`, "error");
      this.print('Подсказка: введите Get-Help, чтобы увидеть список команд.', "muted");
      return;
    }

    this.#busy = true;
    this.input.disabled = true;
    try {
      await command.run(this, args);
    } catch (err) {
      this.print(`${command.name} : ${err.message}`, "error");
    } finally {
      this.#busy = false;
      this.input.disabled = false;
      this.updatePrompt();
      this.focus();
    }
  }

  #complete() {
    const value = this.input.value;
    const parts = value.split(" ");
    const last = parts.at(-1);
    const candidates = parts.length === 1
      ? this.registry.completions(last)
      : this.vfs.names().filter((n) => n.toLowerCase().startsWith(last.toLowerCase()));
    if (candidates.length === 1) {
      parts[parts.length - 1] = candidates[0];
      this.input.value = parts.join(" ");
    } else if (candidates.length > 1) {
      this.print(this.promptText + value);
      this.print(candidates.join("   "), "muted");
    }
  }

  #bind() {
    this.input.addEventListener("keydown", (e) => {
      if (this.#busy) return;
      switch (e.key) {
        case "Enter": {
          const value = this.input.value;
          this.input.value = "";
          this.execute(value);
          break;
        }
        case "ArrowUp":
          e.preventDefault();
          if (this.#historyIndex > 0) this.input.value = this.#history[--this.#historyIndex];
          break;
        case "ArrowDown":
          e.preventDefault();
          this.#historyIndex = Math.min(this.#historyIndex + 1, this.#history.length);
          this.input.value = this.#history[this.#historyIndex] ?? "";
          break;
        case "Tab":
          e.preventDefault();
          this.#complete();
          break;
        case "l":
          if (e.ctrlKey) {
            e.preventDefault();
            this.clear();
          }
          break;
      }
    });

    this.root.addEventListener("click", () => {
      if (!window.getSelection()?.toString()) this.focus();
    });
  }
}
