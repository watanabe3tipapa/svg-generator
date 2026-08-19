# SVG Generator

[![Version](https://img.shields.io/badge/version-v0.3.0-E4572E?style=flat-square)](https://github.com/watanabe3tipapa/svg-generator/releases)
[![License](https://img.shields.io/badge/license-MIT-0F6673?style=flat-square)](LICENSE)
[![Classic Demo](https://img.shields.io/badge/Classic_Demo-GitHub_Pages-1C282C?style=flat-square)](https://watanabe3tipapa.github.io/svg-generator/)

**SVG Generator は、文字、シンボル、配色を組み合わせてSVGロゴを制作するブラウザベースのツールです。** 既存の静的版に加え、v0.3.0からは保存・共有・AI提案に対応するフルスタック版を同梱しています。

> **Classic Demo**: [GitHub Pagesで静的版を開く](https://watanabe3tipapa.github.io/svg-generator/)

[日本語](#日本語) ｜ [English](#english)

---

## 日本語

### v0.3.0の位置づけ

このリポジトリには、用途の異なる二つのアプリケーションがあります。`docs/` はGitHub Pagesで公開する、依存関係を必要としない静的版です。`studio/` は、AIスタイル提案、アカウントごとの保存、公開共有URLを扱うためのフルスタック版です。AI提案やクラウド保存はサーバーとデータベースを必要とするため、`studio/` はGitHub Pages単体では実行できません。

| ディレクトリ | 内容 | 配信先の想定 |
| --- | --- | --- |
| [`docs/`](docs/) | 文字、色、アイコン、配置、アウトライン化、フォント埋め込み、SVG書き出しを扱う静的版 | GitHub Pages |
| [`studio/`](studio/) | SVG制作、PNG/SVG出力、保存、共有、コード編集、AI提案を統合したフルスタック版 | サーバー・データベース対応のホスティング |
| [`app/`](app/) | SVG DOM操作の基礎を扱う最小サンプル | 学習・実験用 |
| [`app2/`](app2/) | 図形の追加、移動、リサイズ、レイヤー管理を扱うサンプル | 学習・実験用 |

### フルスタック版でできること

`studio/` は「文字を入れる、見た目を整える、すぐに書き出す」という制作の順序を保ちながら、実務で使える出力・再利用機能を追加しています。

| 分類 | 機能 | 内容 |
| --- | --- | --- |
| 文字編集 | 複数行、文字サイズ、太さ、文字間隔、行間、配置 | 和文・英文を含むロゴ文字を、ライブプレビューで調整できます。 |
| レイアウト | 直線・円弧テキスト、サブテキスト、用途別サイズ | 横長ロゴ、正方形投稿、プロフィール、Webヘッダー、名刺横のキャンバスを選べます。 |
| スタイル | ブランド配色、シンボル、カスタムSVGパス | 丸、四角、星、スパーク、リーフに加え、`d` 属性を直接編集したシンボルを扱えます。 |
| 出力 | 透明背景、SVG、PNG、SVGコードコピー | 使用先に合わせ、背景を透明にしたSVGまたはPNGを書き出せます。 |
| 再利用 | ブラウザ内の自動保存、再編集URL、アカウント保存、公開共有URL | ログインなしでも設定をURLへ含めて共有でき、ログイン後は保存済みのデザインを再利用できます。 |
| 高度な編集 | SVGマークアップの直接編集と安全なプレビュー | スクリプト、イベント属性、危険なリンクを除去してからプレビューします。 |
| AI提案 | 業種・用途・雰囲気から3つのスタイルを提案 | サーバー側のAI提案を使い、配色、シンボル、太さ、文字間隔、配置の出発点を得られます。 |

### フルスタック版をローカルで起動する

`studio/` はReact、Express、tRPC、Drizzleを使うアプリケーションです。Node.jsと、MySQL/TiDB互換のデータベースおよび認証・AI実行環境を用意したうえで、以下を実行してください。

```bash
cd studio
pnpm install
pnpm dev
```

初回は `studio/drizzle/0000_bouncy_harpoon.sql` に含まれる `users` と `svgProjects` テーブルを作成してください。`svgProjects` には、ユーザーID、共有ID、制作設定、生成SVG、公開可否を保存します。AI提案はクライアントではなくサーバー側から呼び出す構成です。資格情報をフロントエンドコードへ記述しないでください。

### 静的版をローカルで確認する

`docs/` は依存関係を追加せずに確認できます。リポジトリのルートで次を実行し、ブラウザから `http://localhost:8000/docs/` を開いてください。

```bash
python3 -m http.server 8000
```

### プライバシーとライセンス

静的版でアップロードしたフォントファイルはブラウザ内でのみ処理されます。使用するフォントの商用利用、改変、再配布、帰属表示に関する条件は、必ず利用者自身で確認してください。

このリポジトリは [MIT License](LICENSE) の下で公開されています。

---

## English

### Overview

**SVG Generator** is a browser-based tool for creating SVG logos from text, symbols, colors, and layout settings. The repository includes both a static editor and a full-stack studio.

| Directory | Purpose | Intended hosting |
| --- | --- | --- |
| [`docs/`](docs/) | A dependency-free classic editor for GitHub Pages. | Static hosting |
| [`studio/`](studio/) | A React, Express, tRPC, and database-backed studio with AI suggestions, saved designs, and permanent share links. | Server and database hosting |

### Studio features

The full-stack studio supports multiline text, typography controls, arc text, palette presets, symbols, custom SVG paths, transparent SVG/PNG export, safe raw-SVG previewing, local persistence, account-based saving, shareable links, and server-side AI style suggestions.

> The `studio/` app requires a server, a MySQL/TiDB-compatible database, authentication, and an AI execution environment. It cannot run as a GitHub Pages site alone.

### Run the studio locally

```bash
cd studio
pnpm install
pnpm dev
```

Create the `users` and `svgProjects` tables from `studio/drizzle/0000_bouncy_harpoon.sql` before using saved projects. Keep AI credentials on the server side only.

### References / 参考

[1] [opentype.js — font parsing and path generation for the classic editor](https://github.com/opentypejs/opentype.js)
[2] [MDN Web Docs — FontFace API](https://developer.mozilla.org/en-US/docs/Web/API/FontFace)
