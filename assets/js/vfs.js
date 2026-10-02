// Виртуальная файловая система: только чтение, всё хранится в памяти.

const HOME = ["C:", "Users", "PeanTaster"];

const TREE = {
  "about.txt": [
    "Привет! Я PeanTaster.",
    "Пишу на PowerShell и Python, люблю ООП, архитектурные паттерны",
    "и безопасный код без лишних рисков.",
    "",
    "Этот сайт — терминал. Попробуй: Get-Help",
  ].join("\n"),
  "stack.txt": [
    "PowerShell  ████████████████████ 100%",
    "Python      ██████████████████░░  90%",
    "uv          █████████████████░░░  85%",
    "ООП/SOLID   ████████████████░░░░  80%",
    "Безопасность████████████████████ always",
  ].join("\n"),
  Projects: {
    "README.md": "Мои публичные проекты подтягиваются вживую: Get-Projects",
    "peantaster.github.io": {
      "index.html": "<!-- Ты сейчас смотришь на этот файл :) -->",
    },
  },
  Documents: {
    "todo.txt": "[x] Сделать сайт-терминал\n[ ] Победить в Snake со счётом 50+\n[ ] Выпить кофе (Get-Coffee)",
  },
  ".secret": "Ты нашёл скрытый файл! Секретная команда: Invoke-Hack 🕵️",
};

export class VirtualFileSystem {
  #cwd = [];

  get promptPath() {
    return [...HOME, ...this.#cwd].join("\\");
  }

  #resolve(path) {
    const parts = path.replace(/\//g, "\\").split("\\").filter(Boolean);
    let stack = [...this.#cwd];
    if (path.startsWith("~")) {
      stack = [];
      parts.shift();
    }
    for (const part of parts) {
      if (part === ".") continue;
      if (part === "..") stack.pop();
      else stack.push(part);
    }
    let node = TREE;
    const canonical = [];
    for (const part of stack) {
      if (typeof node !== "object") return null;
      const key = Object.keys(node).find((k) => k.toLowerCase() === part.toLowerCase());
      if (key === undefined) return null;
      canonical.push(key);
      node = node[key];
    }
    return { node, path: canonical };
  }

  list(path = ".", showHidden = false) {
    const res = this.#resolve(path);
    if (!res) throw new Error(`Не удаётся найти путь "${path}", так как он не существует.`);
    if (typeof res.node !== "object") return [{ name: res.path.at(-1), dir: false }];
    return Object.entries(res.node)
      .filter(([name]) => showHidden || !name.startsWith("."))
      .map(([name, value]) => ({ name, dir: typeof value === "object", size: typeof value === "string" ? value.length : 0 }))
      .sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name));
  }

  read(path) {
    const res = this.#resolve(path);
    if (!res) throw new Error(`Не удаётся найти путь "${path}", так как он не существует.`);
    if (typeof res.node === "object") throw new Error(`"${path}" — это каталог.`);
    return res.node;
  }

  change(path = "~") {
    const res = this.#resolve(path);
    if (!res) throw new Error(`Не удаётся найти путь "${path}", так как он не существует.`);
    if (typeof res.node !== "object") throw new Error(`"${path}" — это файл, а не каталог.`);
    this.#cwd = res.path;
  }

  /** Имена в текущем каталоге — для автодополнения. */
  names() {
    return this.list(".", true).map((e) => e.name);
  }
}
