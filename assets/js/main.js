import { Terminal, CommandRegistry } from "./terminal.js";
import { VirtualFileSystem } from "./vfs.js";
import { createCommands } from "./commands.js";

/** Обёртка над Web Storage: в приватном режиме хранилище может быть недоступно. */
class SafeStorage {
  #prefix = "pt:";

  get(key, fallback, area = localStorage) {
    try {
      const raw = area.getItem(this.#prefix + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  set(key, value, area = localStorage) {
    try {
      area.setItem(this.#prefix + key, JSON.stringify(value));
    } catch {
      /* хранилище недоступно — работаем без него */
    }
  }
}

class ThemeManager {
  names = ["powershell", "matrix", "amber", "light"];

  constructor(storage) {
    this.storage = storage;
    this.current = "powershell";
    this.apply(storage.get("theme", "powershell"));
  }

  apply(name) {
    const theme = String(name).toLowerCase();
    if (!this.names.includes(theme)) throw new Error(`Неизвестная тема "${name}". Доступно: ${this.names.join(", ")}`);
    this.current = theme;
    document.documentElement.dataset.theme = theme;
    this.storage.set("theme", theme);
  }
}

async function boot(term) {
  const hour = new Date().getHours();
  const greeting = hour < 6 ? "Доброй ночи" : hour < 12 ? "Доброе утро" : hour < 18 ? "Добрый день" : "Добрый вечер";
  term.print("Windows PowerShell", "muted");
  term.print("(C) PeanTaster. Все права защищены.", "muted");
  term.print("");
  await term.type(`${greeting}! Добро пожаловать в мой терминал.`, "accent", 25);
  term.print("Введите Get-Help (или просто help), чтобы начать. Или нажмите кнопку внизу.", "");
  term.print("");
}

document.addEventListener("DOMContentLoaded", async () => {
  const storage = new SafeStorage();
  const themes = new ThemeManager(storage);
  const registry = new CommandRegistry();
  const canvas = document.getElementById("fx");
  createCommands({ storage, themes, canvas }).forEach((c) => registry.register(c));

  const term = new Terminal({
    root: document.getElementById("terminal"),
    output: document.getElementById("output"),
    input: document.getElementById("input"),
    prompt: document.getElementById("prompt"),
    registry,
    vfs: new VirtualFileSystem(),
    storage,
  });

  document.querySelectorAll(".quick button").forEach((btn) =>
    btn.addEventListener("click", () => {
      if (!term.input.disabled) term.execute(btn.dataset.cmd);
    }),
  );

  await boot(term);
  term.focus();

  const params = new URLSearchParams(window.location.search);
  const cmd = params.get("cmd");
  if (cmd && registry.resolve(cmd.split(" ")[0])) term.execute(cmd.slice(0, 200));
});
