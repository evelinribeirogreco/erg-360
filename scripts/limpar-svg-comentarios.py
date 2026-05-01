# -*- coding: utf-8 -*-
"""
Reverte SVGs inline que ficaram dentro de comentarios JS (// ou /* */)
de volta para simbolos texto simples. Mantem SVGs em strings de codigo
funcional (template literals, innerHTML, etc).
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

# SVGs que devem ser revertidos quando aparecem em comentarios
SVG_TO_TEXT = [
    (r'<svg width="14"[^>]*?><polyline points="20 6 9 17 4 12"/></svg>',                              'OK'),
    (r'<svg width="14"[^>]*?><circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 10"/></svg>', '(OK)'),
    (r'<svg width="14"[^>]*?><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>', 'X'),
    (r'<svg width="14"[^>]*?><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>', '->'),
    (r'<svg width="14"[^>]*?><polyline points="23 6 13.5 15.5[^/]+/></svg>', 'sobe'),
    (r'<svg width="14"[^>]*?><polyline points="23 18 13.5 8.5[^/]+/></svg>', 'desce'),
    (r'<svg width="14"[^>]*?><circle cx="12" cy="12" r="10"/><line x1="12" y1="8"[^/]+/></svg>', '(!)'),
    # Tudo restante: regex genérico pra qualquer SVG inline
]
GENERIC_SVG = re.compile(r'<svg [^>]*>.*?</svg>')

def fix_file(path):
    with open(path, encoding='utf-8') as f:
        lines = f.readlines()
    changed = 0
    in_block = False
    for i, line in enumerate(lines):
        new = line
        stripped = line.lstrip()
        is_line_comment = stripped.startswith('//')
        is_block_open  = '/*' in line and '*/' not in line[line.index('/*'):]
        is_block_close = '*/' in line and '/*' not in line[:line.index('*/')]
        is_block_inside = in_block

        is_comment = is_line_comment or is_block_inside or is_block_open or is_block_close

        if is_comment and '<svg' in line:
            # Substitui por texto plain
            for pattern, replacement in SVG_TO_TEXT:
                new = re.sub(pattern, replacement, new)
            # Resto: SVGs nao mapeados viram '?'
            new = GENERIC_SVG.sub('?', new)
            if new != line:
                changed += 1
                lines[i] = new

        # Atualiza estado de block comment
        if is_block_open:  in_block = True
        if is_block_close: in_block = False

    if changed:
        with open(path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
    return changed

FILES = [
    'js/inteligencia-paciente.js','js/score-metabolico.js','js/admin.js',
    'js/relatorio-consulta.js','js/admin-extras.js','js/anamnese-extras.js',
    'js/anamnese.js','js/plano-extras.js','js/admin-plano-extras.js',
    'js/anamnese-engine.js','js/app.js','js/safe-save.js','js/checkin.js',
    'js/admin-fases.js','js/admin-plano.js','js/antropometria.js',
    'js/anamnese-rastreamento.js','js/gastos-energeticos.js',
]
total = 0
for p in FILES:
    try:
        n = fix_file(p)
        if n > 0:
            print(f'{p}: {n} linhas de comentario limpas')
            total += n
    except FileNotFoundError:
        pass
print(f'\nTOTAL: {total} comentarios revertidos')
