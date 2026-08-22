# SVG Generator

[![Version](https://img.shields.io/badge/version-v0.3.0-E4572E?style=flat-square)](https://github.com/watanabe3tipapa/svg-generator/releases)
[![License](https://img.shields.io/badge/license-MIT-0F6673?style=flat-square)](LICENSE)
[![Classic Demo](https://img.shields.io/badge/Classic_Demo-GitHub_Pages-1C282C?style=flat-square)](https://watanabe3tipapa.github.io/svg-generator/)

短い概要

SVG Generator は、文字・シンボル・配色・レイアウト設定を組み合わせてSVGロゴを制作するブラウザベースのツールです。本リポジトリには依存不要で動作する静的版と、保存・共有・AI提案機能を備えたフルスタック版が含まれます。

Classic Demo: https://watanabe3tipapa.github.io/svg-generator/

[日本語](#日本語) ｜ [English](#english)

---

## 日本語

### 主要な内容

- 静的版（docs/）: 依存関係を必要としないクラシックなエディタ。GitHub Pagesでの公開を想定しています。
- フルスタック版（studio/）: React、Express、tRPC、Drizzle 等を用いたサーバー・DB対応のスタジオ。保存・共有・AI提案など実務的な機能を含みます。
- 学習用サンプル（app/、app2/）: SVG DOM操作や図形操作の最小サンプル。

リポジトリは非アーカイブ状態で、最終更新: 2026-08-19T21:35:35Z。

### ディレクトリ構成（概要）

| ディレクトリ | 内容 | 想定される配信先 |
| --- | --- | --- |
| docs/ | 文字、色、アイコン、配置、アウトライン化、フォント埋め込み、SVG書き出しを扱う静的版 | GitHub Pages 等の静的ホスティング |
| studio/ | SVG制作、PNG/SVG出力、保存、共有、コード編集、AI提案を統合したフルスタック版 | サーバー・データベース対応のホスティング |
| app/ | SVG DOM操作の基礎を扱う最小サンプル | 学習・実験用 |
| app2/ | 図形の追加、移動、リサイズ、レイヤー管理を扱うサンプル | 学習・実験用 |

### フルスタック版（studio/）の主な機能（要約）

- テキスト編集: 複数行、サイズ、太さ、文字間隔、行間、配置（和文・英文対応）
- レイアウト: 直線・円弧テキスト、用途別キャンバスサイズ（横長、正方形、プロフィール等）
- スタイル: カラープリセット、シンボル、カスタムSVGパス編集
- 出力: 透明背景対応のSVG/PNG書き出し、SVGコードのコピー
- 再利用: ブラウザ内自動保存、再編集用URL、アカウント保存、公開共有URL
- 高度な編集: 生のSVGマークアップを安全にプレビュー（スクリプトや危険な属性を除去）
- AI提案: サーバー側AIが業種・用途・雰囲気に基づくスタイル提案を行う（サーバー実行）

### ローカルでの確認・起動方法（README に記載されている手順）

注意: 以下は既存の README に記載されている手順です。studio/ を動かすにはサーバー、データベース、認証・AI 実行環境が必要です。

フルスタック版（studio/）をローカルで起動する手順（リポジトリの説明に基づく）:

```bash
cd studio
pnpm install
pnpm dev
```

初回は studio/drizzle/0000_bouncy_harpoon.sql に含まれる `users` と `svgProjects` テーブルを作成してください。`svgProjects` にはユーザーID、共有ID、制作設定、生成SVG、公開可否などを保存します。AI提案はサーバー側から呼び出す構成で、資格情報をフロントエンドに埋め込まないでください。

静的版（docs/）をローカルで確認する手順（README に記載されている方法）:

```bash
python3 -m http.server 8000
# ブラウザで http://localhost:8000/docs/ を開く
```

### プライバシーとライセンス

- 静的版でアップロードしたフォントファイルはブラウザ内で処理されます。使用するフォントの商用利用や配布条件は利用者自身で確認してください。
- 本リポジトリは MIT License の下で公開されています。詳細は LICENSE を参照してください。

---

## English

Overview

SVG Generator is a browser-based tool for creating SVG logos from text, symbols, colors, and layout settings. This repository includes a dependency-free static editor and a full-stack studio with saving, sharing, and AI suggestion features.

Directory summary

| Directory | Purpose | Intended hosting |
| --- | --- | --- |
| docs/ | Classic editor handling text, colors, icons, layout, outline, font embedding, and SVG export | Static hosting (e.g. GitHub Pages) |
| studio/ | React/Express/tRPC/Drizzle-based studio with exports, persistence, sharing, and AI suggestions | Server + database hosting |

Studio notes

- The studio requires a server, a MySQL/TiDB-compatible database, authentication, and an AI execution environment. It cannot run as a GitHub Pages site alone.
- Local startup commands mentioned in this README:

```bash
cd studio
pnpm install
pnpm dev
```

- Database tables `users` and `svgProjects` are provided in studio/drizzle/0000_bouncy_harpoon.sql and should be created before using saved projects.

References / 参考

- Classic demo: https://watanabe3tipapa.github.io/svg-generator/
- See LICENSE for license terms (MIT)
- Related resources mentioned in the original README:
  - opentype.js — font parsing and path generation for the classic editor
  - MDN Web Docs — FontFace API
