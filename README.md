# SVG Generator

[![Version](https://img.shields.io/badge/version-v0.2.0-E4572E?style=flat-square)](https://github.com/watanabe3tipapa/svg-generator/releases)
[![License](https://img.shields.io/badge/license-MIT-0F6673?style=flat-square)](LICENSE)
[![Live Demo](https://img.shields.io/badge/Live_Demo-GitHub_Pages-1C282C?style=flat-square)](https://watanabe3tipapa.github.io/svg-generator/)

**ブラウザだけで、ロゴ用の文字を実用的なSVGに仕立てる制作ツールです。** 文字、フォント、色、アイコン、出力サイズを調整し、プレビューを見ながらSVGとして書き出せます。

> **公開アプリ**: [SVG Generator を開く](https://watanabe3tipapa.github.io/svg-generator/)

日本語を主な利用言語とし、下部に英語の簡易ガイドを用意しています。
[日本語](#日本語) ｜ [English](#english)

---

## 日本語

### SVG Generator でできること

SVG Generator は、ロゴ文字をゼロから作り直すのではなく、**文字を入力してから見た目を整え、必要な場合のみ出力設定を追加する**流れに対応したツールです。入力内容はライブプレビューへ自動反映されるため、仕上がりを確かめながら調整できます。

| 機能 | 内容 | 向いている場面 |
| --- | --- | --- |
| 文字とWebフォント | `Noto Sans JP` または `Inter` を使い、文字、色、サイズ、線幅を設定できます。 | まずロゴ文字の基本形をつくるとき |
| フォントの追加 | `.ttf`、`.otf`、`.woff`、`.woff2` をブラウザ内で読み込めます。 | 手元のブランドフォントを使いたいとき |
| アイコンと配置 | 丸・角丸の四角と、中央・左右寄せを選べます。 | シンボル付きの横長ロゴをつくるとき |
| アウトライン化 | 文字をSVGパスへ変換します。 | 表示環境のフォントに依存したくないとき |
| フォント埋め込み | アップロードしたフォントのデータをSVG内に含めます。 | 編集可能な文字のまま共有したいとき |
| SVGコードのコピー | 生成したSVGマークアップをクリップボードへコピーします。 | HTMLやデザインツールへ直接貼り付けたいとき |

### はじめ方

1. **「ロゴの文字」**へ、ロゴにしたい言葉を入力します。改行は使用せず、一行で入力してください。
2. フォント、文字サイズ、色、アイコン、配置を調整します。迷った場合は「シンプル」「アイコン付き」「横長ロゴ」のプリセットから始めると、設定の出発点を素早く作れます。
3. 右側のライブプレビューで仕上がりを確認し、**「SVGを書き出す」**を選びます。SVGソースが必要な場合は、**「SVGコードをコピー」**を選びます。

### 設定の使い分け

| 設定 | 何が変わるか | 推奨する使い方 |
| --- | --- | --- |
| アウトライン化 | 文字をパスデータに変換します。利用先にフォントがなくても、文字の形を保ちやすくなります。 | ロゴを画像素材として配布する場合や、環境差を減らしたい場合に有効にしてください。アップロードしたフォントで使うと、より確実です。 |
| フォント埋め込み | アップロード済みのフォントデータをSVGに含めます。 | 文字としての編集可能性を保ちたい場合に検討してください。ファイルサイズが大きくなるため、画像用途ではアウトライン化を優先します。 |
| 背景色 | SVG自体に背景の矩形を含めます。 | 透過背景が必要な場合は、書き出したSVGから背景要素を取り除くか、今後の拡張をお待ちください。 |

### プライバシーとフォントライセンス

アップロードしたフォントファイルは**ブラウザ内でのみ処理**され、アプリケーションのサーバーへ送信されません。フォントの商用利用、改変、再配布、帰属表示に関する条件はフォントごとに異なります。書き出し前に、必ず利用するフォントのライセンスを確認してください。

### ローカルで確認する

依存関係を追加せずに、静的ファイルとして確認できます。リポジトリのルートで次を実行し、ブラウザから `http://localhost:8000/docs/` を開いてください。

```bash
python3 -m http.server 8000
```

### プロジェクト構成

| ディレクトリ | 役割 |
| --- | --- |
| [`docs/`](docs/) | **公開アプリ本体**です。GitHub Pagesで配信するロゴSVGジェネレーターを格納しています。 |
| [`app/`](app/) | SVG DOM操作の基礎を扱う、最小構成の学習用サンプルです。 |
| [`app2/`](app2/) | 図形の追加、移動、リサイズ、レイヤー管理を扱う学習用エディターです。 |

公開アプリはHTML、CSS、バニラJavaScriptで構成されています。フォント解析とアウトライン化には [opentype.js][1] を、アップロードフォントのプレビューにはブラウザ標準の [FontFace API][2] を使います。

### v0.2.0 の主な更新

v0.2.0では、ロゴを作り始める際の迷いを減らすことを主眼に、アプリとドキュメントの導線を整理しました。編集画面は「文字とフォント」「見た目を整える」「出力サイズ」の3段階へ再編し、ライブプレビュー、プリセット、リセット、SVGコードコピー、完了メッセージを追加しています。詳細設定にはアウトライン化とフォント埋め込みの説明を添え、初回利用者でも用途を判断しやすくしました。

READMEも公開アプリを起点に組み直し、使い方、設定の使い分け、プライバシー、ローカル確認方法、各ディレクトリの役割を明確にしています。

### ライセンス

このリポジトリは [MIT License](LICENSE) の下で公開されています。

---

## English

### Overview

**SVG Generator** is a browser-based tool for turning logo text into practical SVG files. Adjust the text, font, colors, icon, alignment, and canvas size while checking the live preview, then download the SVG or copy its markup.

> **Live app**: [Open SVG Generator](https://watanabe3tipapa.github.io/svg-generator/)

### Quick guide

1. Enter your logo text in **Logo text**. Keep the text on a single line.
2. Adjust the font, size, colors, icon, and alignment. The **Simple**, **With icon**, and **Wide logo** presets provide useful starting points.
3. Review the live preview, then choose **Export SVG** to download the file or **Copy SVG code** to copy the markup.

| Option | Purpose | When to use it |
| --- | --- | --- |
| Outline text | Converts text to SVG paths. | Use it when the target environment may not have the chosen font installed. |
| Embed font | Includes an uploaded font in the SVG. | Use it when editable text is required; be aware that this increases the file size. |
| Upload font | Loads `.ttf`, `.otf`, `.woff`, or `.woff2` files in the browser. | Use it for a custom or brand font. |

Uploaded fonts are processed locally in the browser and are not sent to an application server. Please verify the license terms of every font you use.

### Project folders

| Folder | Description |
| --- | --- |
| [`docs/`](docs/) | The production web app published through GitHub Pages. |
| [`app/`](app/) | A minimal learning sample for SVG DOM manipulation. |
| [`app2/`](app2/) | A learning sample with interactive shape editing and layer management. |

## References / 参考

[1] [opentype.js — font parsing and path generation](https://github.com/opentypejs/opentype.js)
[2] [MDN Web Docs — FontFace API](https://developer.mozilla.org/en-US/docs/Web/API/FontFace)
