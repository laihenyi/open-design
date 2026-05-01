# Translations

> **Status: living document.** Maintainers refine this as the project's i18n
> needs evolve. Contributions welcome.

For general contribution flow, see [CONTRIBUTING.md](CONTRIBUTING.md). The
"Localization maintenance" section there documents what gets translated
(UI chrome, core docs, display metadata) and what does **not** (skills,
design systems, prompt bodies). This file covers **how** to add and
maintain a locale.

## Maintained locales

UI dictionary lives in [`apps/web/src/i18n/locales/`](apps/web/src/i18n/locales/).
README translations live at the repo root.

| Code    | Language             | UI dict       | README                |
| ------- | -------------------- | ------------- | --------------------- |
| `en`    | English              | `en.ts`       | `README.md`           |
| `de`    | Deutsch              | `de.ts`       | `README.de.md`        |
| `es-ES` | Español (España)     | `es-ES.ts`    | —                     |
| `fa`    | فارسی                | `fa.ts`       | —                     |
| `ja`    | 日本語               | —             | `README.ja-JP.md`     |
| `ko`    | 한국어               | —             | `README.ko.md`        |
| `pt-BR` | Português (Brasil)   | `pt-BR.ts`    | —                     |
| `ru`    | Русский              | `ru.ts`       | —                     |
| `zh-CN` | 简体中文             | `zh-CN.ts`    | `README.zh-CN.md`     |
| `zh-TW` | 繁體中文             | `zh-TW.ts`    | `README.zh-TW.md`     |

> The English locale is the source of truth. Other locales fall back to
> English per-key when a translation is missing — adding a partial locale
> is fine, untranslated keys render in English at runtime.

A README and a UI dict are independent: you may ship one without the
other. The language switcher only shows variants that have a README.

## Adding a new locale

1. **Pick a BCP-47 code.** Use the regional form (`pt-BR`, `es-ES`,
   `zh-TW`) when the variant matters; the bare code (`fr`, `ru`) when it
   doesn't. `pt-BR` and the hypothetical `pt-PT` would coexist as
   separate locales — same precedent applies to `en-US` / `en-GB` if a
   contributor cares enough to maintain both.
2. **Update [`apps/web/src/i18n/types.ts`](apps/web/src/i18n/types.ts):**
   - extend the `Locale` union
   - append your code to `LOCALES`
   - add a `LOCALE_LABEL[<code>]` entry — use the **native name** of the
     language (`Deutsch`, `日本語`, not `de`, `ja`)
3. **Create the dictionary** at
   `apps/web/src/i18n/locales/<code>.ts` — copy from `en.ts` and
   translate the values. Keys must match `en.ts` exactly; missing keys
   fall back to English.
4. **Register** your dictionary in
   [`apps/web/src/i18n/index.tsx`](apps/web/src/i18n/index.tsx)'s
   `DICTS` map.
5. **(Optional) Translate the README** — copy `README.md` to
   `README.<code>.md`. Use OpenCC `s2twp.json` for zh-CN ↔ zh-TW; use
   your judgment elsewhere.
6. **Update the language switcher in every existing README**
   (line ~27 of each `README*.md`). Add a link to your new file in the
   same order as `LOCALES`. This is the easiest step to forget — the
   switchers must stay synchronized or one becomes a dead end.
7. **Run `pnpm typecheck`** to confirm the union and `DICTS` map agree.

## Backport policy

When the English README or UI dict gains new sections/keys, contributors
are **not required** to backport. The fallback handles missing keys
gracefully. Locale maintainers (volunteers, often the original author)
are encouraged to refresh in a follow-up PR.

Keep refresh PRs focused: **one locale per PR**, no mixed feature work.

## Stale locales

We don't delete locales. If a locale hasn't been refreshed in 6+ months
and has visible drift, it moves to a soft "needs maintainer" status —
documented here, but kept compiling and rendering. A new contributor
can always pick it up.

## Regional terminology

Translations follow the conventions of the target region's tech writing
community. Maintainers trust contributors to make idiomatic choices and
will not gate-keep on style.

### zh-CN ↔ zh-TW starter glossary

When converting between Simplified and Traditional Chinese, prefer
Taiwan-specific phrasing in zh-TW rather than character-only conversion.
This list grew out of [PR #194](https://github.com/nexu-io/open-design/pull/194)
and is meant as a starting point, not a rulebook.

| English      | zh-CN  | zh-TW   |
| ------------ | ------ | ------- |
| screen       | 屏幕   | 螢幕    |
| stack        | 栈     | 堆疊    |
| project      | 项目   | 專案    |
| software     | 软件   | 軟體    |
| video        | 视频   | 影片    |
| file         | 文件   | 檔案    |
| document     | 文档   | 文件    |
| message      | 信息   | 訊息    |
| network      | 网络   | 網路    |
| database     | 数据库 | 資料庫  |
| user         | 用户   | 使用者  |
| default      | 默认   | 預設    |
| real-time    | 实时   | 即時    |
| install      | 安装   | 安裝    |
| settings     | 设置   | 設定    |
| menu         | 菜单   | 選單    |
| compatible   | 兼容   | 相容    |
| fallback     | 兜底   | 備援    |
| go viral     | 出圈   | 爆紅    |
| bind         | 绑定   | 綁定    |
| desktop      | 桌面端 | 桌面版  |
| mobile       | 移动端 | 行動版  |

**Tooling:** [OpenCC](https://github.com/BYVoid/OpenCC) with `s2twp.json`
handles ~80% of zh-CN → zh-TW automatically. The rest is human review,
particularly idioms and tech jargon.

Other CJK / RTL glossaries can extend this section as locales mature.
Don't pre-emptively fill empty tables — add a row when a contributor
hits a real terminology choice that future PRs will face.

## Native-speaker review

**Strongly preferred but not blocking.** Maintainers may merge a locale
PR with a `nit` label if no native speaker has reviewed within ~7 days
and CI passes. Subsequent fixes are welcome as separate PRs.

## Open questions

These are intentionally undecided — the doc tracks them so contributors
know they're live design discussions:

- **Translation memory tooling.** Worth evaluating once we hit ~12-15
  locales or see contributors duplicating effort across PRs. Not urgent
  at the current count.
- **Source-of-truth drift detection.** Today, English keys can drift
  ahead of locale dicts silently. A simple key-diff CI check (warn,
  not fail) is a possible follow-up.
- **README freshness signal.** A small badge or front-matter timestamp
  on each `README.<code>.md` could help readers gauge how current a
  translation is.

If you have an opinion on any of the above, open an issue or comment on
[#195](https://github.com/nexu-io/open-design/issues/195).
