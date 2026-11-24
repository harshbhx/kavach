"""Build the Kavach "Guardrail K" brand assets. Usage: python3 scripts/build_brand.py docs/assets/brand

The mark is the letter K drawn as "|<": a guardrail bar (cyan) with an attack chevron (rose) striking it.
Needs: uharfbuzz, fonttools, rsvg-convert, ffmpeg (for the intro clip), Inter + Inter Display fonts.
"""
import math
import pathlib
import shutil
import subprocess
import sys
import tempfile

import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

OUT = pathlib.Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "agents").mkdir(exist_ok=True)
FONT = "/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf"

# ── palette (keep in sync with brand-tokens.css) ──
INK = "#0A0A16"
SURFACE = "#12121F"
SURFACE2 = "#1A1A2B"
TEXT = "#F5F5FA"
MUTED = "#A1A1B5"
ROSE = "#FF4D6D"      # attack / breach
CYAN = "#22D3EE"      # guardrail / defence / blocked
GOLD = "#FFB020"      # referee / verdicts / impact spark
MINT = "#34D399"      # secured / approved
VIOLET = "#7C5CFF"    # brand accent (buttons, links)


def text_path(text, size, tracking=-0.02):
    blob = hb.Blob.from_file_path(FONT)
    font = hb.Font(hb.Face(blob))
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf, {"kern": True})
    tt = TTFont(FONT)
    upem = tt["head"].unitsPerEm
    gs, order = tt.getGlyphSet(), tt.getGlyphOrder()
    s = size / upem
    pen = SVGPathPen(gs)
    cur = 0.0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        gs[order[info.codepoint]].draw(TransformPen(pen, (s, 0, 0, -s, (cur + pos.x_offset) * s, -pos.y_offset * s)))
        cur += pos.x_advance + tracking * upem
    return pen.getCommands(), (cur - tracking * upem) * s


# Mark geometry in a 128x128 box (content centred).
BAR = dict(x=25.5, y=22, w=18, h=84, rx=9)
CHEV = "93.5,24 55.5,64 93.5,104"
STROKE = 18
CONTACT = (46.5, 64)


def mark(chev_dx=0.0, chev_opacity=1.0, bar_fill=CYAN, spark_r=0.0, spark_opacity=0.0,
         chev_color=ROSE, shake=0.0) -> str:
    """Mark drawn in a 128x128 box. Parameters let the clip renderer pose each frame."""
    spark = ""
    if spark_opacity > 0:
        spark = (f'<circle cx="{CONTACT[0]}" cy="{CONTACT[1]}" r="{spark_r:.2f}" fill="none" stroke="{GOLD}" '
                 f'stroke-width="3.5" opacity="{spark_opacity:.3f}"/>')
    return (f'<g transform="translate({shake:.2f} 0)">'
            f'<rect x="{BAR["x"]}" y="{BAR["y"]}" width="{BAR["w"]}" height="{BAR["h"]}" rx="{BAR["rx"]}" fill="{bar_fill}"/>'
            f'<g transform="translate({chev_dx:.2f} 0)" opacity="{chev_opacity:.3f}">'
            f'<polyline points="{CHEV}" fill="none" stroke="{chev_color}" stroke-width="{STROKE}" '
            f'stroke-linecap="round" stroke-linejoin="round"/></g>{spark}</g>')


def svg(w, h, body, extra_attrs=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"{extra_attrs}>'
            f'{body}</svg>\n')


def render(src, dst, width):
    subprocess.run(["rsvg-convert", "-w", str(width), "-o", str(dst), str(src)], check=True)


def write(name, content):
    p = OUT / name
    p.write_text(content, encoding="utf-8")
    return p


# 1. static mark (transparent)
p = write("kavach-mark.svg", svg(128, 128, mark()))
render(p, OUT / "kavach-mark-512.png", 512)

# 2. animated mark (CSS keyframes inside the SVG; plays in <img>, GitHub README and browsers)
ANIM = f"""<style>
.kv-chev{{animation:kvStrike 2.8s cubic-bezier(.3,.7,.2,1) infinite}}
.kv-bar{{animation:kvFlash 2.8s ease infinite}}
.kv-spark{{transform-origin:{CONTACT[0]}px {CONTACT[1]}px;animation:kvSpark 2.8s ease-out infinite}}
@keyframes kvStrike{{0%{{transform:translateX(34px);opacity:0}}28%{{transform:translateX(0);opacity:1}}36%{{transform:translateX(7px)}}46%,82%{{transform:translateX(0);opacity:1}}100%{{transform:translateX(34px);opacity:0}}}}
@keyframes kvFlash{{0%,26%{{fill:{CYAN}}}30%{{fill:#FFFFFF}}44%,100%{{fill:{CYAN}}}}}
@keyframes kvSpark{{0%,26%{{transform:scale(0);opacity:0}}30%{{transform:scale(1);opacity:1}}50%,100%{{transform:scale(1.9);opacity:0}}}}
@media (prefers-reduced-motion:reduce){{.kv-chev,.kv-bar,.kv-spark{{animation:none}}.kv-spark{{opacity:0}}}}
</style>
<rect class="kv-bar" x="{BAR['x']}" y="{BAR['y']}" width="{BAR['w']}" height="{BAR['h']}" rx="{BAR['rx']}" fill="{CYAN}"/>
<g class="kv-chev"><polyline points="{CHEV}" fill="none" stroke="{ROSE}" stroke-width="{STROKE}" stroke-linecap="round" stroke-linejoin="round"/></g>
<circle class="kv-spark" cx="{CONTACT[0]}" cy="{CONTACT[1]}" r="9" fill="none" stroke="{GOLD}" stroke-width="3.5"/>"""
write("kavach-mark-animated.svg", svg(128, 128, ANIM))

# 3. app icon + favicon (mark on a dark rounded tile so it reads on any background)
icon = f'<rect width="128" height="128" rx="28" fill="{INK}"/><g transform="translate(64 64) scale(0.78) translate(-64 -64)">{mark()}</g>'
p = write("kavach-app-icon.svg", svg(128, 128, icon))
render(p, OUT / "kavach-app-icon-512.png", 512)
render(p, OUT / "kavach-app-icon-1024.png", 1024)
fav = f'<rect width="128" height="128" rx="30" fill="{INK}"/><g transform="translate(64 64) scale(0.86) translate(-64 -64)">{mark()}</g>'
p = write("kavach-favicon.svg", svg(128, 128, fav))
render(p, OUT / "kavach-favicon-64.png", 64)
render(p, OUT / "kavach-favicon-180.png", 180)

# 4. horizontal lockups
WM = 112
wm_d, wm_w = text_path("Kavach", WM)
MH = 128
gap = 22
lw = int(MH + gap + wm_w + 16)
baseline = 64 + WM * 0.36
for variant, colour in (("dark", TEXT), ("light", INK)):
    body = f'{mark()}<path transform="translate({MH + gap} {baseline:.1f})" d="{wm_d}" fill="{colour}"/>'
    p = write(f"kavach-logo-{variant}.svg", svg(lw, MH, body))
    render(p, OUT / f"kavach-logo-{variant}.png", lw * 3)

# animated lockup (for the dashboard header / README dark)
anim_lock = ANIM + f'<path transform="translate({MH + gap} {baseline:.1f})" d="{wm_d}" fill="{TEXT}"/>'
write("kavach-logo-dark-animated.svg", svg(lw, MH, anim_lock))


def chip(x, y, dot, label, size):
    w = 48 + len(label) * size * 0.56
    h = size + 22
    return (f'<g transform="translate({x:.1f} {y})"><rect width="{w:.0f}" height="{h}" rx="{h / 2}" fill="{SURFACE2}" '
            f'stroke="#FFFFFF" stroke-opacity="0.08"/><circle cx="20" cy="{h / 2}" r="6" fill="{dot}"/>'
            f'<text x="34" y="{h / 2 + size * 0.36:.1f}" font-family="Inter" font-weight="600" font-size="{size}" '
            f'fill="#E6E6F0">{label}</text></g>'), w


def bg(w, h, pid):
    grid = "".join(f'<line x1="{x}" y1="0" x2="{x}" y2="{h}"/>' for x in range(0, w + 1, 40))
    grid += "".join(f'<line x1="0" y1="{y}" x2="{w}" y2="{y}"/>' for y in range(0, h + 1, 40))
    return (f'<defs><radialGradient id="{pid}a" cx="0.18" cy="0.45" r="0.5"><stop offset="0" stop-color="{VIOLET}" stop-opacity="0.30"/>'
            f'<stop offset="1" stop-color="{VIOLET}" stop-opacity="0"/></radialGradient>'
            f'<radialGradient id="{pid}b" cx="0.85" cy="0.6" r="0.55"><stop offset="0" stop-color="{CYAN}" stop-opacity="0.16"/>'
            f'<stop offset="1" stop-color="{CYAN}" stop-opacity="0"/></radialGradient></defs>'
            f'<rect width="{w}" height="{h}" fill="{INK}"/><g stroke="#FFFFFF" stroke-opacity="0.035">{grid}</g>'
            f'<rect width="{w}" height="{h}" fill="url(#{pid}a)"/><rect width="{w}" height="{h}" fill="url(#{pid}b)"/>')


# 5-6. The social card and Devpost thumbnail moved to apps/web/scripts/make-brand-cards.mjs (security-paper style).


# 7. agent avatars: dark disc, squad-colour ring and icon
def S(col, w=14):
    return f'fill="none" stroke="{col}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"'


ICONS = {
    "recon": (ROSE, lambda c: f'<circle cx="128" cy="128" r="58" {S(c)}/><circle cx="128" cy="128" r="28" {S(c)}/>'
                              f'<line x1="128" y1="128" x2="172" y2="90" {S(c)}/><circle cx="128" cy="128" r="9" fill="{c}"/>'),
    "injection": (ROSE, lambda c: f'<polyline points="100,88 60,128 100,168" {S(c)}/><polyline points="156,88 196,128 156,168" {S(c)}/>'
                                  f'<line x1="140" y1="76" x2="116" y2="180" {S(c)}/>'),
    "social": (ROSE, lambda c: f'<path d="M74 84 h108 a18 18 0 0 1 18 18 v48 a18 18 0 0 1 -18 18 h-58 l-32 26 v-26 h-18 '
                               f'a18 18 0 0 1 -18 -18 v-48 a18 18 0 0 1 18 -18 z" {S(c)}/>'
                               f'<circle cx="104" cy="126" r="9" fill="{c}"/><circle cx="128" cy="126" r="9" fill="{c}"/><circle cx="152" cy="126" r="9" fill="{c}"/>'),
    "monitor": (CYAN, lambda c: f'<path d="M48 128 C78 82 178 82 208 128 C178 174 78 174 48 128 Z" {S(c)}/><circle cx="128" cy="128" r="22" fill="{c}"/>'),
    "patcher": (CYAN, lambda c: f'<g transform="rotate(-45 128 128)"><rect x="56" y="100" width="144" height="56" rx="28" {S(c)}/>'
                                f'<line x1="106" y1="100" x2="106" y2="156" {S(c)}/><line x1="150" y1="100" x2="150" y2="156" {S(c)}/></g>'),
    "auditor": (CYAN, lambda c: f'<polyline points="78,132 114,168 180,92" {S(c, 18)}/>'),
    "referee": (GOLD, lambda c: f'<line x1="128" y1="64" x2="128" y2="188" {S(c)}/><line x1="74" y1="82" x2="182" y2="82" {S(c)}/>'
                                f'<line x1="94" y1="188" x2="162" y2="188" {S(c)}/><path d="M74 82 L52 136 H96 Z" {S(c)}/><path d="M182 82 L160 136 H204 Z" {S(c)}/>'),
}
for name, (col, draw) in ICONS.items():
    body = (f'<circle cx="128" cy="128" r="128" fill="{SURFACE}"/>'
            f'<circle cx="128" cy="128" r="120" fill="none" stroke="{col}" stroke-width="8"/>{draw(col)}')
    p = OUT / "agents" / f"{name}.svg"
    p.write_text(svg(256, 256, body), encoding="utf-8")
    render(p, OUT / "agents" / f"{name}.png", 256)

# 8. intro clip (logo strike + wordmark fade) as MP4 + GIF, for the video opening
def ease_out(t):
    return 1 - (1 - t) ** 3


def lerp(a, b, t):
    return a + (b - a) * t


def mix(c1, c2, t):
    a = [int(c1[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(c2[i:i + 2], 16) for i in (1, 3, 5)]
    return "#" + "".join(f"{round(lerp(x, y, t)):02X}" for x, y in zip(a, b))


FPS, DUR = 30, 3.0
CW, CH = 1280, 720
clip_wm, clip_ww = text_path("Kavach", 150)
block_w = 128 * 2.2 + 40 + clip_ww
bx = (CW - block_w) / 2
tmp = pathlib.Path(tempfile.mkdtemp())
for i in range(int(FPS * DUR)):
    t = i / FPS
    if t < 0.8:  # strike in
        k = ease_out(t / 0.8)
        dx, op = lerp(60, 0, k), k
    elif t < 1.0:  # recoil
        k = (t - 0.8) / 0.2
        dx, op = 10 * math.sin(k * math.pi), 1
    else:
        dx, op = 0, 1
    flash = max(0.0, 1 - abs(t - 0.82) / 0.12) if 0.7 < t < 0.94 else 0.0
    sp_t = (t - 0.8) / 0.5
    sp_r, sp_op = (lerp(6, 22, sp_t), 1 - sp_t) if 0 <= sp_t <= 1 else (0, 0)
    wm_op = min(1.0, max(0.0, (t - 1.0) / 0.5))
    wm_dx = lerp(-24, 0, ease_out(wm_op))
    body = (bg(CW, CH, "c") + f'<g transform="translate({bx:.1f} {CH / 2 - 128 * 2.2 / 2:.1f}) scale(2.2)">'
            f'{mark(chev_dx=dx, chev_opacity=op, bar_fill=mix(CYAN, "#FFFFFF", flash), spark_r=sp_r, spark_opacity=sp_op)}</g>'
            f'<path transform="translate({bx + 128 * 2.2 + 40 + wm_dx:.1f} {CH / 2 + 150 * 0.36:.1f})" d="{clip_wm}" '
            f'fill="{TEXT}" opacity="{wm_op:.3f}"/>')
    f = tmp / f"f{i:03d}.svg"
    f.write_text(svg(CW, CH, body), encoding="utf-8")
    render(f, tmp / f"f{i:03d}.png", CW)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(tmp / "f%03d.png"),
                "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-crf", "18",
                str(OUT / "kavach-logo-intro.mp4")], check=True)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(tmp / "f%03d.png"),
                "-vf", "scale=640:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse",
                str(OUT / "kavach-logo-intro.gif")], check=True)
shutil.rmtree(tmp)
print("built", sorted(str(x.relative_to(OUT)) for x in OUT.rglob("*") if x.is_file()))
