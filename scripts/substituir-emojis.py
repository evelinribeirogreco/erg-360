# -*- coding: utf-8 -*-
"""
Substitui emojis por SVGs inline elegantes nos arquivos do ERG.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

# SVGs compactos no estilo feather/lucide, 14px
def svg(path):
    return ('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" '
            'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" '
            'stroke-linejoin="round" style="vertical-align:-2px;">' + path + '</svg>')

def dot(color):
    return ('<svg width="10" height="10" viewBox="0 0 24 24" '
            'style="vertical-align:-1px;"><circle cx="12" cy="12" r="6" '
            'fill="' + color + '"/></svg>')

ICONS = {
    'check':         svg('<polyline points="20 6 9 17 4 12"/>'),
    'check-circle':  svg('<circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 10"/>'),
    'x':             svg('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'),
    'x-circle':      svg('<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'),
    'alert':         svg('<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'),
    'eye':           svg('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'),
    'lightbulb':     svg('<path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>'),
    'zap':           svg('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'),
    'utensils':      svg('<path d="M3 2v7c0 1.1.9 2 2 2h2v11"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z"/>'),
    'running':       svg('<circle cx="13" cy="4" r="2"/><path d="M4 22 7 17 11 13 14 16 17 14 19 11"/><path d="M11 13 9 6 13 5 17 8"/>'),
    'calendar':      svg('<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
    'moon':          svg('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'),
    'flex':          svg('<path d="M4 12h6l2-3 2 3h6"/><path d="M14 9V5a2 2 0 1 0-4 0v4"/><path d="M5 19l3-7"/><path d="M19 19l-3-7"/>'),
    'droplet':       svg('<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>'),
    'star':          svg('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'),
    'gift':          svg('<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>'),
    'clipboard':     svg('<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>'),
    'leaf':          svg('<path d="M6 3 21 3v15a3 3 0 0 1-3 3 3 3 0 0 1-3-3v-1c0-1.66 1.34-3 3-3"/><path d="M3 6c0 8.94 5.06 14 14 14"/>'),
    'target':        svg('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
    'clock':         svg('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
    'sunrise':       svg('<path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="2" x2="12" y2="9"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/><line x1="23" y1="22" x2="1" y2="22"/><polyline points="8 6 12 2 16 6"/>'),
    'coffee':        svg('<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>'),
    'apple':         svg('<path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06z"/><path d="M10 2c1 .5 2 2 2 5"/>'),
    'pulse':         svg('<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>'),
    'flame':         svg('<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>'),
    'heart':         svg('<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>'),
    'arrow-right':   svg('<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>'),
    'trend-up':      svg('<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>'),
    'trend-down':    svg('<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>'),
    'female':        svg('<circle cx="12" cy="9" r="5"/><line x1="12" y1="14" x2="12" y2="22"/><line x1="9" y1="19" x2="15" y2="19"/>'),
    'male':          svg('<circle cx="10" cy="14" r="5"/><line x1="14" y1="10" x2="20" y2="4"/><polyline points="14 4 20 4 20 10"/>'),
    'bar-chart':     svg('<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>'),
    'dot-green':     dot('#3D6B4F'),
    'dot-yellow':    dot('#B8860B'),
    'dot-orange':    dot('#C26B3F'),
    'dot-red':       dot('#A04030'),
}

EMOJI_MAP = {
    '✓': ICONS['check'],         # ✓
    '✔': ICONS['check'],         # ✔
    '✗': ICONS['x'],             # ✗
    '✕': ICONS['x'],             # ✕
    '❌': ICONS['x-circle'],      # ❌
    '✅': ICONS['check-circle'],  # ✅
    '⚠️': ICONS['alert'],   # ⚠️
    '⚠': ICONS['alert'],         # ⚠
    '⚡': ICONS['zap'],           # ⚡
    '\U0001F441️': ICONS['eye'], # 👁️
    '\U0001F441': ICONS['eye'],       # 👁
    '\U0001F4CA': ICONS['bar-chart'], # 📊
    '\U0001F4A1': ICONS['lightbulb'], # 💡
    '\U0001F37D️': ICONS['utensils'], # 🍽️
    '\U0001F37D': ICONS['utensils'],  # 🍽
    '\U0001F3C3': ICONS['running'],   # 🏃
    '\U0001F4C5': ICONS['calendar'],  # 📅
    '\U0001F319': ICONS['moon'],      # 🌙
    '\U0001F634': ICONS['moon'],      # 😴
    '\U0001F4AA': ICONS['flex'],      # 💪
    '\U0001F4A7': ICONS['droplet'],   # 💧
    '⭐': ICONS['star'],          # ⭐
    '\U0001F382': ICONS['gift'],      # 🎂
    '\U0001F4CB': ICONS['clipboard'], # 📋
    '\U0001F33F': ICONS['leaf'],      # 🌿
    '\U0001F3AF': ICONS['target'],    # 🎯
    '⏰': ICONS['clock'],         # ⏰
    '\U0001F305': ICONS['sunrise'],   # 🌅
    '☕': ICONS['coffee'],        # ☕
    '\U0001F34E': ICONS['apple'],     # 🍎
    '⚖️': ICONS['pulse'],   # ⚖️
    '⚖': ICONS['pulse'],         # ⚖
    '\U0001F525': ICONS['flame'],     # 🔥
    '❤️': ICONS['heart'],   # ❤️
    '❤': ICONS['heart'],         # ❤
    '\U0001F7E2': ICONS['dot-green'], # 🟢
    '\U0001F7E1': ICONS['dot-yellow'],# 🟡
    '\U0001F7E0': ICONS['dot-orange'],# 🟠
    '\U0001F534': ICONS['dot-red'],   # 🔴
    '⬤': ICONS['dot-green'],     # ⬤
    '→': ICONS['arrow-right'],   # →
    '▲': ICONS['trend-up'],      # ▲
    '▼': ICONS['trend-down'],    # ▼
    '♀': ICONS['female'],        # ♀
    '♂': ICONS['male'],          # ♂
}

FILES = [
    'js/inteligencia-paciente.js',
    'js/score-metabolico.js',
    'js/admin.js',
    'js/relatorio-consulta.js',
    'js/admin-extras.js',
    'js/anamnese-extras.js',
    'js/anamnese.js',
    'js/plano-extras.js',
    'js/admin-plano-extras.js',
    'js/anamnese-engine.js',
    'js/app.js',
    'js/safe-save.js',
    'js/checkin.js',
    'js/diario.js',
    'js/admin-fases.js',
    'js/admin-plano.js',
    'js/admin-checkins.js',
    'js/antropometria.js',
    'js/anamnese-rastreamento.js',
    'js/gastos-energeticos.js',
]

total_subs = 0
total_files = 0
# Ordena emojis pelos mais longos primeiro pra evitar match parcial (ex: ⚠️ antes de ⚠)
emoji_keys = sorted(EMOJI_MAP.keys(), key=len, reverse=True)

for path in FILES:
    try:
        with open(path, encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        continue
    original = content
    file_subs = 0
    for emoji in emoji_keys:
        if emoji in content:
            count = content.count(emoji)
            content = content.replace(emoji, EMOJI_MAP[emoji])
            file_subs += count
    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'{path}: {file_subs} substituicoes')
        total_subs += file_subs
        total_files += 1

print(f'\nTOTAL: {total_subs} emojis substituidos em {total_files} arquivos')
