// Набор команд. Каждая команда — объект { name, aliases, description, hidden?, run(term, args) }.
import { MatrixRain, SnakeGame } from "./effects.js";

const GITHUB_USER = "PeanTaster";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const FORTUNES = [
  "Работает — не трогай. Не работает — Get-Help.",
  "Есть два типа людей: те, кто делает бэкапы, и те, кто ещё начнёт.",
  "Ошибка между стулом и клавиатурой — самая частая в продакшене.",
  "Сначала напиши тест. Потом код. Потом объясни коллегам, зачем был тест.",
  "uv sync быстрее, чем ты успеешь сказать «pip install».",
  "Не храни секреты в коде. Даже если репозиторий приватный. Особенно если приватный.",
  "Set-StrictMode -Version Latest — лучший друг PowerShell-разработчика.",
  "Любую проблему можно решить ещё одним уровнем абстракции. Кроме проблемы слишком большого числа абстракций.",
  "Принцип наименьших привилегий: и для сервисов, и для кота на клавиатуре.",
  "В пятницу не деплоим. В понедельник тоже лучше не надо.",
];

const COFFEE = String.raw`
      ( (
       ) )
    ........
    |      |]
    \      /
     '----'   Get-Coffee: кофе готов ☕`;

const LOGO = String.raw`
   ____                  _____         _
  |  _ \ ___  __ _ _ __ |_   _|_ _ ___| |_ ___ _ __
  | |_) / _ \/ _' | '_ \  | |/ _' / __| __/ _ \ '__|
  |  __/  __/ (_| | | | | | | (_| \__ \ ||  __/ |
  |_|   \___|\__,_|_| |_| |_|\__,_|___/\__\___|_|`;

class GitHubClient {
  constructor(user, storage) {
    this.user = user;
    this.storage = storage;
  }

  async repos() {
    const cached = this.storage.get("repos", null, sessionStorage);
    if (cached && Date.now() - cached.at < 10 * 60 * 1000) return cached.data;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(
        `https://api.github.com/users/${encodeURIComponent(this.user)}/repos?sort=updated&per_page=20`,
        { signal: ctrl.signal, headers: { Accept: "application/vnd.github+json" }, credentials: "omit" },
      );
      if (!res.ok) throw new Error(`GitHub API ответил ${res.status}`);
      const json = await res.json();
      const data = json
        .filter((r) => !r.fork)
        .map((r) => ({
          name: String(r.name),
          description: r.description ? String(r.description) : "",
          url: String(r.html_url),
          stars: Number(r.stargazers_count) || 0,
          language: r.language ? String(r.language) : "",
        }));
      this.storage.set("repos", { at: Date.now(), data }, sessionStorage);
      return data;
    } finally {
      clearTimeout(timer);
    }
  }
}

export function createCommands({ storage, themes, canvas }) {
  const github = new GitHubClient(GITHUB_USER, storage);

  return [
    {
      name: "Get-Help",
      aliases: ["help", "man", "?"],
      description: "Список команд",
      run(term) {
        term.print("ДОСТУПНЫЕ КОМАНДЫ", "accent");
        const visible = term.registry.all.filter((c) => !c.hidden);
        const width = Math.max(...visible.map((c) => c.name.length)) + 2;
        for (const c of visible) {
          const alias = c.aliases?.length ? `  (${c.aliases.join(", ")})` : "";
          term.print(`  ${c.name.padEnd(width)}${c.description}${alias}`);
        }
        term.print("");
        term.print("Tab — автодополнение, ↑/↓ — история, Ctrl+L — очистка.", "muted");
        term.print("Говорят, тут есть скрытые команды… 👀", "muted");
      },
    },
    {
      name: "Get-About",
      aliases: ["about", "whoami"],
      description: "Кто я такой",
      async run(term) {
        term.print(LOGO, "accent ascii");
        term.print("");
        await term.type(term.vfs.read("~/about.txt").split("\n")[0], "", 20);
        term.printLines(term.vfs.read("~/about.txt").split("\n").slice(1));
        term.print("");
        term.printLink(`github.com/${GITHUB_USER}`, `https://github.com/${GITHUB_USER}`, "GitHub: ");
      },
    },
    {
      name: "Get-Projects",
      aliases: ["projects", "repos"],
      description: "Мои репозитории (живые данные с GitHub)",
      async run(term) {
        term.print("Запрашиваю api.github.com…", "muted");
        let repos;
        try {
          repos = await github.repos();
        } catch (err) {
          term.print(`Не удалось получить список: ${err.message}`, "error");
          return;
        }
        if (!repos.length) {
          term.print("Публичных репозиториев пока нет — всё самое интересное впереди 🚀");
          return;
        }
        for (const r of repos) {
          const meta = [r.language, r.stars ? `★ ${r.stars}` : ""].filter(Boolean).join(" · ");
          term.printLink(r.name, r.url, "  📦 ");
          if (r.description || meta) term.print(`     ${[r.description, meta].filter(Boolean).join(" — ")}`, "muted");
        }
      },
    },
    {
      name: "Get-ChildItem",
      aliases: ["ls", "dir", "gci"],
      description: "Содержимое каталога (-Force — скрытые)",
      run(term, args) {
        const force = args.some((a) => /^-(force|a|la)$/i.test(a));
        const path = args.find((a) => !a.startsWith("-")) ?? ".";
        const entries = term.vfs.list(path, force);
        term.print("");
        term.print("Mode          Length  Name", "muted");
        term.print("----          ------  ----", "muted");
        for (const e of entries) {
          const mode = e.dir ? "d-----" : "-a----";
          const len = e.dir ? "" : String(e.size);
          term.print(`${mode}  ${len.padStart(12)}  ${e.name}`, e.dir ? "accent" : "");
        }
        term.print("");
      },
    },
    {
      name: "Get-Content",
      aliases: ["cat", "type", "gc"],
      description: "Показать файл",
      run(term, args) {
        if (!args[0]) throw new Error("Укажите путь: Get-Content about.txt");
        term.printLines(term.vfs.read(args[0]).split("\n"));
      },
    },
    {
      name: "Set-Location",
      aliases: ["cd", "sl"],
      description: "Сменить каталог",
      run(term, args) {
        term.vfs.change(args[0] ?? "~");
      },
    },
    {
      name: "Get-Fortune",
      aliases: ["fortune"],
      description: "Мудрость дня",
      run(term) {
        term.print(`💡 ${pick(FORTUNES)}`, "accent");
      },
    },
    {
      name: "Get-SystemInfo",
      aliases: ["neofetch", "systeminfo"],
      description: "Информация о «системе»",
      run(term) {
        const nav = window.navigator;
        const info = [
          ["OS", "PeanTasterOS 11 (Web Edition)"],
          ["Host", window.location.host || "localhost"],
          ["Shell", "PowerShell 7.5 (почти)"],
          ["Resolution", `${window.screen.width}x${window.screen.height}`],
          ["Theme", themes.current],
          ["Language", nav.language],
          ["CPU cores", String(nav.hardwareConcurrency ?? "?")],
          ["Uptime", `${Math.round(performance.now() / 1000)} с`],
        ];
        const logo = [
          "  ██████████  ",
          "  ██      ██  ",
          "  ██ >_   ██  ",
          "  ██      ██  ",
          "  ██████████  ",
          "              ",
          "              ",
          "              ",
        ];
        info.forEach(([k, v], i) => term.print(`${logo[i]}  ${k.padEnd(11)}: ${v}`, i === 0 ? "accent ascii" : "ascii"));
      },
    },
    {
      name: "Set-Theme",
      aliases: ["theme"],
      description: `Сменить тему: ${themes.names.join(" | ")}`,
      run(term, args) {
        if (!args[0]) {
          term.print(`Текущая тема: ${themes.current}. Доступно: ${themes.names.join(", ")}`);
          return;
        }
        themes.apply(args[0]);
        term.print(`Тема изменена на «${themes.current}».`, "ok");
      },
    },
    {
      name: "Get-Date",
      aliases: ["date"],
      description: "Текущая дата",
      run(term) {
        term.print(new Date().toLocaleString("ru-RU", { dateStyle: "full", timeStyle: "medium" }));
      },
    },
    {
      name: "Get-History",
      aliases: ["history", "h"],
      description: "История команд",
      run(term) {
        storage.get("history", []).forEach((cmd, i) => term.print(`${String(i + 1).padStart(4)}  ${cmd}`));
      },
    },
    {
      name: "Write-Host",
      aliases: ["echo"],
      description: "Вывести текст",
      run(term, args) {
        term.print(args.join(" "));
      },
    },
    {
      name: "Start-Matrix",
      aliases: ["matrix"],
      description: "Wake up, Neo…",
      async run(term) {
        await term.type("Wake up, Neo…", "ok", 60);
        await sleep(500);
        await new MatrixRain(canvas).run();
        term.print("Ты вернулся из Матрицы. Или нет?", "muted");
      },
    },
    {
      name: "Start-Snake",
      aliases: ["snake"],
      description: "Змейка (стрелки/WASD, Esc — выход)",
      async run(term) {
        const score = await new SnakeGame(canvas).run();
        const best = Math.max(score ?? 0, storage.get("snake-best", 0));
        storage.set("snake-best", best);
        term.print(`🐍 Счёт: ${score ?? 0}. Рекорд: ${best}.`, score >= best && score > 0 ? "ok" : "");
      },
    },
    {
      name: "Clear-Host",
      aliases: ["cls", "clear"],
      description: "Очистить экран",
      run(term) {
        term.clear();
      },
    },
    // ---- Скрытые пасхалки ----
    {
      name: "Get-Coffee",
      aliases: ["coffee"],
      hidden: true,
      run(term) {
        term.print(COFFEE, "accent ascii");
      },
    },
    {
      name: "sudo",
      hidden: true,
      run(term) {
        term.print("Это же Windows 😏 Попробуй: Start-Process pwsh -Verb RunAs", "accent");
        term.print("…хотя нет, не пробуй. Принцип наименьших привилегий!", "muted");
      },
    },
    {
      name: "rm",
      aliases: ["Remove-Item", "del"],
      hidden: true,
      run(term) {
        term.print("Remove-Item : Отказано в доступе. Эта файловая система только для чтения. И слава богу.", "error");
      },
    },
    {
      name: "Invoke-Hack",
      aliases: ["hack"],
      hidden: true,
      async run(term) {
        const steps = [
          "Подключаюсь к мейнфрейму",
          "Обхожу файрвол (вежливо)",
          "Расшифровываю RSA-4096 силой мысли",
          "Скачиваю больше оперативки",
          "Заметаю следы",
        ];
        for (const s of steps) {
          const line = term.print("");
          for (let p = 0; p <= 20; p++) {
            line.textContent = `${s.padEnd(36)} [${"█".repeat(p)}${"░".repeat(20 - p)}] ${p * 5}%`;
            await sleep(25 + Math.random() * 40);
          }
        }
        term.print("ACCESS GRANTED ✔", "ok");
        await sleep(400);
        term.print("Шучу. Этичный хакинг — только с письменного разрешения 😉", "muted");
      },
    },
    {
      name: "exit",
      aliases: ["Stop-Process", "logout"],
      hidden: true,
      async run(term) {
        await term.type("Закрываю окно…", "muted", 30);
        await sleep(600);
        term.print("Не-а. Отсюда не уходят 😈 Попробуй Get-Fortune.", "accent");
      },
    },
    {
      name: "pip",
      hidden: true,
      run(term) {
        term.print("pip? У нас тут uv. Попробуй: uv add <package> ⚡", "accent");
      },
    },
    {
      name: "uv",
      hidden: true,
      async run(term, args) {
        await term.type(`Resolved ${args.length || 42} packages in 0.42ms`, "ok", 8);
        term.print("Installed everything. Быстро, правда?", "muted");
      },
    },
  ];
}
