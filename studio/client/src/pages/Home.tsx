import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  canvasPresets,
  createSvgMarkup,
  decodeSettings,
  defaultSettings,
  downloadPng,
  downloadSvg,
  encodeSettings,
  IconName,
  palettes,
  sanitizeSvgCode,
  StudioSettings,
} from "@/lib/svgStudio";
import {
  Bot,
  Check,
  Code2,
  Copy,
  Download,
  FileImage,
  FolderOpen,
  Link2,
  Loader2,
  LogIn,
  Palette,
  RotateCw,
  Save,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Suggestion = {
  name: string;
  rationale: string;
  paletteName: string;
  textColor: string;
  accentColor: string;
  backgroundColor: string;
  fontWeight: number;
  letterSpacing: number;
  icon: IconName;
  layout: StudioSettings["layout"];
};

const localStorageKey = "svg-studio-current-v1";

function toSlug(value: string) {
  const result = value.trim().replace(/\s+/g, "-").replace(/[^\w\-ぁ-んァ-ン一-龠]/g, "");
  return result || "svg-logo";
}

function SectionTitle({ number, title, description }: { number: string; title: string; description?: string }) {
  return <div className="mb-4 flex gap-3"><span className="pt-1 font-mono text-[10px] font-semibold tracking-widest text-[#E4572E]">{number}</span><div><h2 className="font-display text-base font-bold tracking-tight text-[#1C282C]">{title}</h2>{description ? <p className="mt-0.5 text-xs leading-5 text-[#627176]">{description}</p> : null}</div></div>;
}

function RangeControl({ label, value, min, max, step = 1, suffix = "", onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (value: number) => void }) {
  return <label className="block"><span className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-[#415257]"><span>{label}</span><output className="font-mono font-medium text-[#E4572E]">{value}{suffix}</output></span><input className="studio-range" type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))} /></label>;
}

function ColorControl({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-[#415257]">{label}</span><span className="flex h-10 overflow-hidden rounded-md border border-[#D6D1C6] bg-[#FFFDF9]"><input aria-label={label} className="h-full w-12 border-0 bg-transparent p-1" type="color" value={value} onChange={event => onChange(event.target.value.toUpperCase())} /><span className="flex items-center px-2.5 font-mono text-[11px] font-medium text-[#415257]">{value}</span></span></label>;
}

/** Full-featured SVG workspace with client-side editing plus server-backed save, share, and AI suggestion flows. */
export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [settings, setSettings] = useState<StudioSettings>(defaultSettings);
  const [savedId, setSavedId] = useState<number | undefined>();
  const [savedShareId, setSavedShareId] = useState<string | undefined>();
  const [isPublic, setIsPublic] = useState(true);
  const [rawCode, setRawCode] = useState("");
  const [aiIndustry, setAiIndustry] = useState("");
  const [aiMood, setAiMood] = useState("洗練・親しみやすい");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const remoteShareId = query.get("share") ?? "";
  const sharedQuery = trpc.svgProjects.shared.useQuery({ shareId: remoteShareId }, { enabled: Boolean(remoteShareId) });
  const projectsQuery = trpc.svgProjects.mine.useQuery(undefined, { enabled: isAuthenticated });
  const saveMutation = trpc.svgProjects.save.useMutation();
  const suggestMutation = trpc.svgProjects.suggest.useMutation();

  const update = <K extends keyof StudioSettings>(key: K, value: StudioSettings[K]) => setSettings(previous => ({ ...previous, [key]: value }));
  const svg = useMemo(() => createSvgMarkup({ ...settings, rawSvgCode: rawCode || settings.rawSvgCode }), [settings, rawCode]);

  useEffect(() => {
    const sharedData = remoteShareId ? sharedQuery.data?.projectData : null;
    if (!sharedData) return;
    try {
      const parsed = JSON.parse(sharedData) as Partial<StudioSettings>;
      setSettings(previous => ({ ...previous, ...parsed, sourceMode: "generated" }));
      setRawCode(parsed.rawSvgCode ?? "");
      toast.success("共有されたデザインを読み込みました。");
    } catch {
      toast.error("共有デザインを読み込めませんでした。");
    }
  }, [remoteShareId, sharedQuery.data?.projectData]);

  useEffect(() => {
    if (remoteShareId) return;
    const encoded = query.get("design");
    const decoded = encoded ? decodeSettings(encoded) : null;
    if (decoded) {
      setSettings(previous => ({ ...previous, ...decoded }));
      setRawCode(decoded.rawSvgCode ?? "");
      return;
    }
    try {
      const stored = window.localStorage.getItem(localStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<StudioSettings>;
        setSettings(previous => ({ ...previous, ...parsed }));
        setRawCode(parsed.rawSvgCode ?? "");
      }
    } catch {
      // Local persistence is optional and should never block the editor.
    }
  }, [query, remoteShareId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(localStorageKey, JSON.stringify({ ...settings, rawSvgCode: rawCode }));
    } catch {
      // Storage can be unavailable in strict browser settings.
    }
  }, [settings, rawCode]);

  function applyPalette(palette: typeof palettes[number]) {
    setSettings(previous => ({ ...previous, textColor: palette.textColor, accentColor: palette.accentColor, backgroundColor: palette.backgroundColor }));
    toast.success(`「${palette.name}」を適用しました。`);
  }

  function applySuggestion(suggestion: Suggestion) {
    setSettings(previous => ({
      ...previous,
      textColor: suggestion.textColor,
      accentColor: suggestion.accentColor,
      backgroundColor: suggestion.backgroundColor,
      fontWeight: suggestion.fontWeight,
      letterSpacing: suggestion.letterSpacing,
      icon: suggestion.icon,
      layout: suggestion.layout,
      sourceMode: "generated",
    }));
    toast.success(`「${suggestion.name}」を適用しました。`);
  }

  function applyPreset(preset: typeof canvasPresets[number]) {
    setSettings(previous => ({ ...previous, width: preset.width, height: preset.height }));
  }

  function applyCode() {
    const safeCode = sanitizeSvgCode(rawCode);
    if (!/^<svg[\s>]/i.test(safeCode)) {
      toast.error("<svg> から始まるSVGコードを入力してください。");
      return;
    }
    setRawCode(safeCode);
    setSettings(previous => ({ ...previous, rawSvgCode: safeCode, sourceMode: "code" }));
    toast.success("SVGコードをプレビューへ反映しました。");
  }

  async function copyText(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(message);
    } catch {
      toast.error("コピーできませんでした。HTTPS環境でお試しください。");
    }
  }

  function shareLocally() {
    const encoded = encodeSettings({ ...settings, rawSvgCode: rawCode });
    const url = `${window.location.origin}${window.location.pathname}?design=${encoded}`;
    void copyText(url, "再編集できる共有URLをコピーしました。");
  }

  function saveToCloud() {
    if (!isAuthenticated) {
      startLogin();
      return;
    }
    saveMutation.mutate({
      id: savedId,
      name: settings.projectName,
      projectData: JSON.stringify({ ...settings, rawSvgCode: rawCode }),
      svgCode: svg,
      isPublic,
    }, {
      onSuccess: project => {
        setSavedId(project.id);
        setSavedShareId(project.shareId);
        toast.success("クラウドに保存しました。");
        void projectsQuery.refetch();
      },
      onError: error => toast.error(error.message),
    });
  }

  function shareSavedProject() {
    if (!savedId) {
      toast.message("先にクラウド保存すると、固定の共有URLを作成できます。");
      shareLocally();
      return;
    }
    if (!savedShareId) {
      shareLocally();
      return;
    }
    void copyText(`${window.location.origin}${window.location.pathname}?share=${savedShareId}`, "公開共有URLをコピーしました。");
  }

  function loadProject(project: NonNullable<typeof projectsQuery.data>[number]) {
    try {
      const parsed = JSON.parse(project.projectData) as Partial<StudioSettings>;
      setSettings(previous => ({ ...previous, ...parsed, sourceMode: parsed.sourceMode ?? "generated" }));
      setRawCode(parsed.rawSvgCode ?? "");
      setSavedId(project.id);
      setSavedShareId(project.shareId);
      setIsPublic(project.isPublic);
      setShowLibrary(false);
      toast.success(`「${project.name}」を開きました。`);
    } catch {
      toast.error("保存デザインを読み込めませんでした。");
    }
  }

  function askAi() {
    if (!settings.text.trim()) {
      toast.error("先にロゴの文字を入力してください。");
      return;
    }
    suggestMutation.mutate({ brand: settings.text, industry: aiIndustry, mood: aiMood, locale: "ja" }, {
      onSuccess: data => setSuggestions(data.suggestions as Suggestion[]),
      onError: error => toast.error(error.message),
    });
  }

  const currentPreset = canvasPresets.find(preset => preset.width === settings.width && preset.height === settings.height)?.id ?? "custom";
  const iconOptions: { id: IconName; label: string }[] = [
    { id: "none", label: "なし" }, { id: "circle", label: "丸" }, { id: "square", label: "四角" },
    { id: "star", label: "星" }, { id: "spark", label: "スパーク" }, { id: "leaf", label: "リーフ" }, { id: "custom", label: "カスタムパス" },
  ];

  return (
    <div className="min-h-screen bg-[#F4F0E8] text-[#1C282C]">
      <header className="sticky top-0 z-30 border-b border-[#D6D1C6] bg-[#FFFDF9]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1640px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-md bg-[#E4572E] text-white shadow-[3px_3px_0_#1C282C]"><svg width="19" height="19" viewBox="0 0 48 48" aria-hidden="true"><path d="M9 8h25l5 5v26H9zM27 8v12h12M17 31h14" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></svg></div><div><p className="font-display text-base font-black tracking-tight">SVG Generator</p><p className="font-mono text-[9px] tracking-[0.1em] text-[#627176]">ブラウザの制作机</p></div></div>
          <div className="hidden items-center gap-2 md:flex"><span className="rounded-full border border-[#D6D1C6] px-2.5 py-1 font-mono text-[10px] text-[#627176]">{settings.width} × {settings.height}</span><span className="rounded-full border border-[#BFD8C8] bg-[#EFF8F1] px-2.5 py-1 text-[10px] font-bold text-[#2D7051]">ローカル保存</span></div>
          <div className="flex items-center gap-2">
            {isAuthenticated ? <button onClick={() => setShowLibrary(value => !value)} className="studio-button-secondary hidden sm:inline-flex"><FolderOpen size={14} />保存済み</button> : <button onClick={startLogin} className="studio-button-secondary hidden sm:inline-flex"><LogIn size={14} />保存・共有</button>}
            <button onClick={() => void copyText(svg, "SVGコードをコピーしました。")} className="studio-button-secondary"><Copy size={14} /><span className="hidden sm:inline">コードコピー</span></button>
            <button onClick={() => downloadSvg(svg, toSlug(settings.projectName || settings.text))} className="studio-button-primary"><Download size={15} />SVGを書き出す</button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1640px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[360px_minmax(0,1fr)_330px] lg:px-8">
        <aside className="space-y-5 lg:sticky lg:top-[76px] lg:max-h-[calc(100vh-96px)] lg:overflow-y-auto lg:pr-1">
          <section className="studio-card"><SectionTitle number="01" title="文字とレイアウト" description="ロゴの言葉、書体、配置をつくります。" />
            <label className="studio-field"><span>プロジェクト名</span><input value={settings.projectName} onChange={event => update("projectName", event.target.value)} /></label>
            <label className="studio-field mt-3"><span>ロゴの文字</span><textarea rows={3} value={settings.text} onChange={event => update("text", event.target.value)} placeholder="例：風のロゴ" /></label>
            <label className="studio-field mt-3"><span>サブテキスト <em>任意</em></span><input value={settings.subtext} onChange={event => update("subtext", event.target.value)} placeholder="例：MAKE IT DISTINCT" /></label>
            <div className="mt-3 grid grid-cols-2 gap-3"><label className="studio-field"><span>フォント</span><select value={settings.fontFamily} onChange={event => update("fontFamily", event.target.value)}><option>Noto Sans JP</option><option>Inter</option><option>Zen Kaku Gothic New</option><option>serif</option><option>monospace</option></select></label><label className="studio-field"><span>配置</span><select value={settings.layout} onChange={event => update("layout", event.target.value as StudioSettings["layout"])}><option value="left">左寄せ</option><option value="center">中央</option><option value="right">右寄せ</option></select></label></div>
            <div className="mt-4 space-y-3"><RangeControl label="文字サイズ" value={settings.fontSize} min={18} max={240} suffix=" px" onChange={value => update("fontSize", value)} /><RangeControl label="太さ" value={settings.fontWeight} min={300} max={900} step={100} onChange={value => update("fontWeight", value)} /><RangeControl label="文字間隔" value={settings.letterSpacing} min={-8} max={30} suffix=" px" onChange={value => update("letterSpacing", value)} /><RangeControl label="行間" value={settings.lineHeight} min={0.8} max={2} step={0.05} onChange={value => update("lineHeight", value)} /></div>
          </section>

          <section className="studio-card"><SectionTitle number="02" title="キャンバスと背景" description="用途に合わせてサイズと背景を選びます。" />
            <label className="studio-field"><span>用途別サイズ</span><select value={currentPreset} onChange={event => { const preset = canvasPresets.find(item => item.id === event.target.value); if (preset) applyPreset(preset); }}><option value="custom">カスタム</option>{canvasPresets.map(preset => <option key={preset.id} value={preset.id}>{preset.label} — {preset.width} × {preset.height}</option>)}</select></label>
            <div className="mt-3 grid grid-cols-2 gap-3"><label className="studio-field"><span>幅</span><input type="number" min={64} max={4096} value={settings.width} onChange={event => update("width", Number(event.target.value))} /></label><label className="studio-field"><span>高さ</span><input type="number" min={64} max={4096} value={settings.height} onChange={event => update("height", Number(event.target.value))} /></label></div>
            <div className="mt-4 flex items-center justify-between rounded-md border border-[#E6E0D6] bg-[#FBF8F2] p-3"><div><p className="text-xs font-bold">透明背景</p><p className="mt-0.5 text-[10px] leading-4 text-[#627176]">重ねて使えるSVG・PNGにします。</p></div><button aria-pressed={settings.transparent} onClick={() => update("transparent", !settings.transparent)} className={`studio-switch ${settings.transparent ? "is-on" : ""}`}><span /></button></div>
            <div className="mt-3 grid grid-cols-2 gap-3"><ColorControl label="文字色" value={settings.textColor} onChange={value => update("textColor", value)} /><ColorControl label="背景色" value={settings.backgroundColor} onChange={value => update("backgroundColor", value)} /></div>
          </section>

          <section className="studio-card"><SectionTitle number="03" title="書き出しと共有" description="使う場所に合わせて書き出し、設定を共有します。" />
            <div className="grid grid-cols-2 gap-2"><button onClick={() => downloadSvg(svg, toSlug(settings.projectName || settings.text))} className="studio-button-secondary justify-center"><Download size={14} />SVG</button><button onClick={() => void downloadPng(svg, toSlug(settings.projectName || settings.text)).catch(error => toast.error(error.message))} className="studio-button-secondary justify-center"><FileImage size={14} />PNG</button></div>
            <button onClick={shareLocally} className="studio-button-secondary mt-2 w-full justify-center"><Link2 size={14} />再編集URLをコピー</button>
            <div className="mt-3 flex items-center justify-between rounded-md border border-[#E6E0D6] p-3"><div><p className="text-xs font-bold">公開共有を許可</p><p className="mt-0.5 text-[10px] text-[#627176]">保存後に固定URLを発行します。</p></div><button aria-pressed={isPublic} onClick={() => setIsPublic(value => !value)} className={`studio-switch ${isPublic ? "is-on" : ""}`}><span /></button></div>
            <div className="mt-3 grid grid-cols-2 gap-2"><button disabled={saveMutation.isPending} onClick={saveToCloud} className="studio-button-primary justify-center">{saveMutation.isPending ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}保存</button><button onClick={shareSavedProject} className="studio-button-secondary justify-center"><Copy size={14} />共有URL</button></div>
          </section>
        </aside>

        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#E4572E]">ライブプレビュー</p><h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">文字を入れたら、すぐに仕上がりを確認。</h1></div><div className="flex gap-2"><button onClick={() => { setSettings(defaultSettings); setRawCode(""); setSavedId(undefined); setSavedShareId(undefined); toast.success("初期値に戻しました。"); }} className="studio-button-secondary"><RotateCw size={14} />リセット</button><button onClick={() => void copyText(svg, "SVGコードをコピーしました。")} className="studio-button-secondary"><Code2 size={14} />コード</button></div></div>
          <div className={`studio-canvas ${settings.transparent ? "studio-checker" : ""}`}><span className="studio-crop-mark top-3 left-3 border-l-2 border-t-2" /><span className="studio-crop-mark right-3 top-3 border-r-2 border-t-2" /><span className="studio-crop-mark bottom-3 left-3 border-b-2 border-l-2" /><span className="studio-crop-mark bottom-3 right-3 border-b-2 border-r-2" /><div className="relative z-10 w-full overflow-hidden rounded-[2px] shadow-[0_16px_36px_rgba(28,40,44,0.14)]" dangerouslySetInnerHTML={{ __html: svg }} /></div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[#627176]">編集内容はブラウザへ自動保存されます。SVGの文字は必要に応じてアウトライン化してください。</p><button onClick={() => void downloadPng(svg, toSlug(settings.projectName || settings.text)).catch(error => toast.error(error.message))} className="studio-button-secondary"><FileImage size={14} />PNGを書き出す</button></div>

          <details className="studio-card mt-5 group"><summary className="flex cursor-pointer list-none items-center justify-between gap-3"><div><span className="font-mono text-[10px] font-bold tracking-widest text-[#E4572E]">04</span><h2 className="mt-0.5 font-display text-base font-bold tracking-tight">SVGコードを編集 <span className="ml-1 text-xs font-normal text-[#627176]">技術設定</span></h2><p className="mt-0.5 text-xs leading-5 text-[#627176]">生成後のマークアップを直接調整したい場合のみ開きます。</p></div><span className="rounded-md border border-[#D6D1C6] px-2 py-1 text-xs font-bold text-[#415257] group-open:bg-[#1C282C] group-open:text-white">開く</span></summary><div className="mt-4 border-t border-[#E6E0D6] pt-4"><div className="mb-3 flex flex-wrap justify-end gap-2"><button onClick={() => { setRawCode(svg); toast.success("現在のSVGコードを読み込みました。"); }} className="studio-button-secondary"><Code2 size={14} />生成コードを読む</button><button onClick={applyCode} className="studio-button-primary"><Check size={14} />反映</button></div><textarea className="studio-code-area" rows={10} value={rawCode} onChange={event => setRawCode(event.target.value)} placeholder={'<svg xmlns="http://www.w3.org/2000/svg" ...>...</svg>'} /><div className="mt-3 flex flex-wrap gap-3 border-t border-[#E6E0D6] pt-3"><button onClick={() => update("sourceMode", "generated")} className="text-xs font-bold text-[#415257] underline decoration-[#E4572E] decoration-2 underline-offset-4">生成モードへ戻る</button><span className="text-[11px] text-[#627176]">スクリプトとイベント属性はプレビュー前に除去されます。</span></div></div></details>
        </section>

        <aside className="space-y-5 lg:sticky lg:top-[76px] lg:max-h-[calc(100vh-96px)] lg:overflow-y-auto lg:pr-1">
          <section className="studio-card"><SectionTitle number="05" title="カラーセット" description="配色を選び、出発点を作ります。" />
            <div className="space-y-2">{palettes.map(palette => <button key={palette.name} onClick={() => applyPalette(palette)} className="group flex w-full items-center gap-3 rounded-md border border-[#E6E0D6] p-2 text-left transition hover:border-[#B8AFA1] hover:bg-[#FBF8F2]"><span className="flex -space-x-1">{[palette.textColor, palette.accentColor, palette.backgroundColor].map(color => <span key={color} style={{ backgroundColor: color }} className="h-5 w-5 rounded-full border border-white" />)}</span><span className="text-xs font-bold">{palette.name}</span></button>)}</div>
          </section>

          <section className="studio-card"><SectionTitle number="06" title="シンボルとパス" description="ロゴマークの種類と位置を調整します。" />
            <label className="studio-field"><span>シンボル</span><select value={settings.icon} onChange={event => update("icon", event.target.value as IconName)}>{iconOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
            <div className="mt-4 space-y-3"><RangeControl label="シンボルの大きさ" value={settings.iconScale} min={0.25} max={2.5} step={0.05} onChange={value => update("iconScale", value)} /><RangeControl label="回転" value={settings.iconRotation} min={-180} max={180} suffix="°" onChange={value => update("iconRotation", value)} /><RangeControl label="横移動" value={settings.pathOffsetX} min={-150} max={150} suffix=" px" onChange={value => update("pathOffsetX", value)} /><RangeControl label="縦移動" value={settings.pathOffsetY} min={-150} max={150} suffix=" px" onChange={value => update("pathOffsetY", value)} /></div>
            {settings.icon === "custom" ? <label className="studio-field mt-4"><span>カスタムパス <em>d 属性</em></span><textarea rows={4} value={settings.customPath} onChange={event => update("customPath", event.target.value)} /></label> : null}
          </section>

          <section className="studio-card"><SectionTitle number="07" title="円弧テキスト" description="バッジやスタンプ風のロゴにも対応します。" />
            <div className="grid grid-cols-2 gap-2"><button onClick={() => update("textMode", "straight")} className={`studio-segment ${settings.textMode === "straight" ? "is-active" : ""}`}>直線</button><button onClick={() => update("textMode", "arc")} className={`studio-segment ${settings.textMode === "arc" ? "is-active" : ""}`}>円弧</button></div>
            {settings.textMode === "arc" ? <div className="mt-4"><RangeControl label="円弧の深さ" value={settings.arcHeight} min={10} max={Math.max(12, Math.floor(settings.height * 0.42))} suffix=" px" onChange={value => update("arcHeight", value)} /></div> : null}
          </section>

          <section className="relative overflow-hidden rounded-lg border border-[#E6C5B8] bg-[#FFF6F0] p-5"><div className="absolute -right-4 -top-4 text-[#E4572E]/10"><Sparkles size={96} /></div><div className="relative"><div className="mb-3 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-md bg-[#E4572E] text-white"><Bot size={15} /></span><div><p className="font-display text-sm font-bold">AIスタイル提案</p><p className="text-[10px] text-[#8B5A4C]">言葉から3つの方向性を作成</p></div></div>
            <label className="studio-field"><span>業種・用途 <em>任意</em></span><input value={aiIndustry} onChange={event => setAiIndustry(event.target.value)} placeholder="例：カフェ、設計事務所" /></label><label className="studio-field mt-2"><span>求める雰囲気</span><input value={aiMood} onChange={event => setAiMood(event.target.value)} /></label>
            <button disabled={suggestMutation.isPending} onClick={askAi} className="studio-button-primary mt-3 w-full justify-center">{suggestMutation.isPending ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}3案を提案する</button>
            {suggestions.length ? <div className="mt-4 space-y-2">{suggestions.map(suggestion => <button key={suggestion.name} onClick={() => applySuggestion(suggestion)} className="w-full rounded-md border border-[#E6C5B8] bg-white/75 p-3 text-left transition hover:border-[#E4572E]"><div className="flex items-center justify-between gap-2"><span className="text-xs font-bold">{suggestion.name}</span><span className="flex -space-x-1">{[suggestion.textColor, suggestion.accentColor, suggestion.backgroundColor].map(color => <i key={color} className="h-3.5 w-3.5 rounded-full border border-white" style={{ backgroundColor: color }} />)}</span></div><p className="mt-1 text-[10px] leading-4 text-[#627176]">{suggestion.rationale}</p></button>)}</div> : null}</div>
          </section>

          {showLibrary ? <section className="studio-card"><div className="mb-3 flex items-center justify-between"><SectionTitle number="08" title="保存済み" description={user?.name ? `${user.name} さんのデザイン` : ""} /><button onClick={() => setShowLibrary(false)} className="text-xs text-[#627176]">閉じる</button></div>{projectsQuery.isLoading ? <div className="flex items-center gap-2 py-4 text-xs text-[#627176]"><Loader2 className="animate-spin" size={14} />読み込み中</div> : projectsQuery.data?.length ? <div className="space-y-2">{projectsQuery.data.map(project => <button key={project.id} onClick={() => loadProject(project)} className="w-full rounded-md border border-[#E6E0D6] p-3 text-left hover:border-[#E4572E]"><p className="text-xs font-bold">{project.name}</p><p className="mt-1 text-[10px] text-[#627176]">更新 {new Date(project.updatedAt).toLocaleDateString()}</p></button>)}</div> : <p className="rounded-md border border-dashed border-[#D6D1C6] p-4 text-center text-xs text-[#627176]">まだ保存したデザインはありません。</p>}</section> : null}
        </aside>
      </main>
    </div>
  );
}
