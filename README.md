# peantaster.github.io

Личная страница в виде **интерактивного терминала PowerShell** прямо в браузере.

🔗 https://peantaster.github.io

## Что умеет

| Команда | Что делает |
|---|---|
| `Get-Help` / `help` | список команд |
| `Get-About` / `whoami` | обо мне |
| `Get-Projects` | репозитории, вживую из GitHub API |
| `ls`, `cd`, `cat` | прогулка по виртуальной файловой системе |
| `Get-SystemInfo` / `neofetch` | «системная» информация |
| `Set-Theme matrix\|amber\|light\|powershell` | темы оформления |
| `Get-Fortune` | мудрость дня |
| `Start-Matrix` | цифровой дождь |
| `Start-Snake` | змейка с рекордом |

Плюс несколько скрытых пасхалок 👀 (подсказка: `ls -Force`).

Tab — автодополнение, ↑/↓ — история, Ctrl+L — очистка.
Ссылка вида `/?cmd=Start-Snake` сразу запускает команду.

## Устройство

Чистый HTML/CSS/JS (ES-модули), без сборки и зависимостей:

- `assets/js/terminal.js` — `Terminal` (ввод/вывод, история, автодополнение) и `CommandRegistry`
- `assets/js/commands.js` — команды (объекты с единым интерфейсом `run(term, args)`) и `GitHubClient`
- `assets/js/vfs.js` — `VirtualFileSystem`, только чтение
- `assets/js/effects.js` — `MatrixRain`, `SnakeGame` (наследники `FullscreenEffect`)
- `assets/js/main.js` — композиция: `SafeStorage`, `ThemeManager`, загрузка

## Безопасность

- Строгая CSP: только свои скрипты/стили, сеть — только `api.github.com`.
- Пользовательский ввод выводится исключительно через `textContent`, `innerHTML` не используется.
- Ссылки — только `https:`, с `rel="noopener noreferrer"`.
- Запрос к GitHub без cookies (`credentials: "omit"`), с таймаутом и кэшем в `sessionStorage`.
- Доступ к `localStorage` обёрнут в try/catch (приватный режим не ломает сайт).

## Локальный запуск

ES-модули не работают через `file://`, поэтому нужен локальный сервер:

```powershell
uv run python -m http.server 8000
# затем откройте http://localhost:8000
```
