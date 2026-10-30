# -*- coding: utf-8 -*-
"""Gera os 4 graficos do relatorio (regras: typesetting/charts.md)."""
import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

# Paleta cascade (seed 7)
ACCENT   = '#87702a'
ACCENT_2 = '#3a95b4'
BORDER   = '#cfcab8'
HEADER   = '#504933'
MUTED    = '#78766f'
TEXTP    = '#1c1c1a'
SEM_OK   = '#46875c'
SEM_ERR  = '#92453e'
SEM_INFO = '#466a8e'
CARD     = '#e8e7e4'

plt.rcParams['font.sans-serif'] = ['DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False
plt.rcParams['text.color'] = TEXTP
plt.rcParams['axes.labelcolor'] = TEXTP
plt.rcParams['xtick.color'] = MUTED
plt.rcParams['ytick.color'] = MUTED

with open('/home/z/my-project/scripts/stats.json', encoding='utf-8') as f:
    S = json.load(f)

OUT = '/home/z/my-project/scripts/'

def clean_axes(ax, keep_left=False):
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    if not keep_left:
        ax.spines['left'].set_visible(False)
    ax.spines['bottom'].set_color(BORDER)
    ax.spines['left'].set_color(BORDER)

# ============ Grafico 1: Donut - composicao do peso do arquivo ============
# eixo do donut em posicao explicita (metade esquerda) + legenda desenhada a mao
fig = plt.figure(figsize=(7.2, 3.0))
ax = fig.add_axes([0.02, 0.05, 0.42, 0.90])
vals = [S['media_total_mb'], S['data_other_mb']]
colors_ = [ACCENT, BORDER]
wedges, _ = ax.pie(vals, colors=colors_, startangle=90, counterclock=False,
                   wedgeprops=dict(width=0.35, edgecolor='white', linewidth=2))
ax.text(0, 0.06, '22,5 MB', ha='center', va='center', fontsize=17,
        fontweight='bold', color=TEXTP)
ax.text(0, -0.22, 'arquivo atual', ha='center', va='center', fontsize=8.5, color=MUTED)
# area da legenda: segundo eixo sem contorno, tudo dentro da figura
axl = fig.add_axes([0.47, 0.0, 0.53, 1.0])
axl.set_xlim(0, 1)
axl.set_ylim(0, 1)
axl.axis('off')
rows = [
    (0.62, ACCENT, 'Imagens embutidas', '22,44 MB (99,8%)'),
    (0.38, BORDER, 'Dados, fórmulas e estrutura', '0,05 MB (0,2%)'),
]
for y, col, name, val in rows:
    axl.add_patch(plt.Rectangle((0.02, y - 0.035), 0.045, 0.07,
                                facecolor=col, edgecolor='none'))
    axl.text(0.10, y + 0.035, name, fontsize=11.5, color=TEXTP,
             fontweight='bold', va='center')
    axl.text(0.10, y - 0.075, val, fontsize=10, color=MUTED, va='center')
fig.savefig(OUT + 'chart_peso.png', dpi=200, facecolor='white')
plt.close(fig)

# ============ Grafico 2: Barras horizontais - status das pendencias ============
fig, ax = plt.subplots(figsize=(7.2, 2.6), constrained_layout=True)
status = [('Atrasada', S['status']['Atrasada'], SEM_ERR),
          ('Concluído', S['status']['Concluído'], SEM_OK),
          ('Em andamento', S['status']['Em andamento'], SEM_INFO)]
status.sort(key=lambda x: x[1])
names = [x[0] for x in status]
vals = [x[1] for x in status]
cols = [x[2] for x in status]
bars = ax.barh(names, vals, color=cols, height=0.58, edgecolor='none')
total = sum(vals)
for b, v in zip(bars, vals):
    pct = v / total * 100
    ax.text(v + 0.35, b.get_y() + b.get_height() / 2,
            f'{v}  ({pct:.0f}%)'.replace('.', ','),
            va='center', ha='left', fontsize=10.5, color=TEXTP, fontweight='bold')
ax.set_xlim(0, max(vals) * 1.32)
ax.xaxis.set_visible(False)
clean_axes(ax)
ax.tick_params(axis='y', labelsize=11, length=0)
fig.savefig(OUT + 'chart_status.png', dpi=200, facecolor='white')
plt.close(fig)

# ============ Grafico 3: Linha - projecao do tamanho do arquivo ============
fig, ax = plt.subplots(figsize=(7.2, 3.3), constrained_layout=True)
months = np.arange(0, 13)
per_month_mb = (S['n_embedded_images'] / S['n_records']) * S['records_per_month'] * S['avg_image_mb']
atual = S['file_mb'] + months * per_month_mb
otim = np.full_like(months, 0.3, dtype=float)
otim[0] = S['file_mb']
# otimizado: apos 1 mes ja esta sem imagens embutidas
otim = np.where(months == 0, S['file_mb'], 0.3)
ax.plot(months, atual, color=SEM_ERR, linewidth=2.5, solid_capstyle='round')
ax.fill_between(months, atual, color=SEM_ERR, alpha=0.08)
ax.plot(months, otim, color=SEM_OK, linewidth=2.5, solid_capstyle='round')
# rotulos: primeiro e ultimo ponto de cada serie
ax.annotate(f'{atual[0]:.0f} MB'.replace('.', ','), (0, atual[0]), textcoords='offset points',
            xytext=(-4, 10), fontsize=9.5, color=SEM_ERR, fontweight='bold')
ax.annotate(f'~{atual[-1]:.0f} MB'.replace('.', ','), (12, atual[-1]), textcoords='offset points',
            xytext=(-6, 8), fontsize=10, color=SEM_ERR, fontweight='bold')
ax.annotate('0,3 MB', (12, 0.3), textcoords='offset points', xytext=(-6, 8),
            fontsize=10, color=SEM_OK, fontweight='bold')
ax.set_xlabel('Meses à frente', fontsize=10.5)
ax.set_ylabel('Tamanho do arquivo (MB)', fontsize=10.5)
ax.set_xlim(-0.4, 12.6)
ax.set_ylim(0, atual[-1] * 1.12)
ax.set_xticks([0, 3, 6, 9, 12])
ax.grid(True, axis='y', linestyle='--', alpha=0.2, linewidth=0.5)
clean_axes(ax, keep_left=True)
leg = ax.legend(['Prática atual: imagens embutidas na planilha',
                 'Otimizado: apenas links das fotos'],
                loc='upper left', frameon=False, fontsize=10, handlelength=1.6)
fig.savefig(OUT + 'chart_projecao.png', dpi=200, facecolor='white')
plt.close(fig)

# ============ Grafico 4: Barras agrupadas - matriz de decisao antes/depois ============
# valores verificados por scripts/matrix_calc.py (Decimal ROUND_HALF_UP)
fig, ax = plt.subplots(figsize=(7.2, 3.2), constrained_layout=True)
groups = ['A - Planilha\notimizada', 'B - Power Apps', 'C - App próprio\n(MVP)']
antes = [3.2, 4.5, 3.3]   # primeira edição (9 critérios)
depois = [3.2, 4.3, 4.2]  # cenário atualizado (11 critérios)
x = np.arange(3)
bw = 0.36
b1 = ax.bar(x - bw / 2, antes, bw, color=BORDER, edgecolor='none')
b2 = ax.bar(x + bw / 2, depois, bw, color=ACCENT, edgecolor='none')
for bars in (b1, b2):
    for b in bars:
        ax.text(b.get_x() + b.get_width() / 2, b.get_height() + 0.10,
                ('%.1f' % b.get_height()).replace('.', ','), ha='center', va='bottom',
                fontsize=10.5, color=TEXTP, fontweight='bold')
ax.set_xticks(x)
ax.set_xticklabels(groups, fontsize=10.5)
ax.set_ylim(0, 5.35)
ax.set_ylabel('Nota final ponderada (0-5)', fontsize=10.5)
ax.set_yticks([1, 2, 3, 4, 5])
ax.grid(True, axis='y', linestyle='--', alpha=0.2, linewidth=0.5)
clean_axes(ax, keep_left=True)
ax.legend([b1, b2], ['Cenário original', 'Cenário atualizado'], loc='upper left',
          frameon=False, fontsize=10, handlelength=1.4)
fig.savefig(OUT + 'chart_matriz.png', dpi=200, facecolor='white')
plt.close(fig)

print('per_month_mb =', round(per_month_mb, 1))
print('projecao 6m =', round(S['file_mb'] + 6 * per_month_mb), 'MB | 12m =', round(S['file_mb'] + 12 * per_month_mb), 'MB')
print('ok - 4 charts saved')
