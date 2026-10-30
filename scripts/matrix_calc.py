# -*- coding: utf-8 -*-
"""Verifica os totais da matriz de decisão (primeira edição vs cenário atualizado)."""
from decimal import Decimal, ROUND_HALF_UP

def fmt(x):
    return str(Decimal(str(x)).quantize(Decimal('0.1'), rounding=ROUND_HALF_UP)).replace('.', ',')

# Matriz ORIGINAL (9 critérios, primeira edição do relatório)
orig_w = [5, 4, 4, 3, 3, 3, 2, 2, 1]
orig = {'A': [2, 2, 4, 5, 5, 5, 2, 1, 2],
        'B': [5, 5, 4, 5, 3, 4, 5, 5, 4],
        'C': [5, 5, 2, 2, 1, 1, 4, 5, 5]}

# Matriz REVISADA (11 critérios, cenário atualizado)
# Ordem: Leveza(5), Fotos(4), Progresso(3), Manutenção(4), Volume(3),
#        Esforço(3), Custo(3), Colaboração(2), Alertas(2), Autonomia(2), Escalabilidade(1)
rev_w = [5, 4, 3, 4, 3, 3, 3, 2, 2, 2, 1]
rev = {'A': [2, 2, 2, 4, 5, 5, 5, 2, 1, 5, 2],
       'B': [5, 5, 3, 4, 5, 3, 4, 5, 5, 3, 4],
       'C': [5, 5, 5, 3, 3, 3, 4, 4, 5, 5, 5]}

for name, w, m in [('ORIGINAL (9 criterios)', orig_w, orig), ('REVISADA (11 criterios)', rev_w, rev)]:
    tot = sum(w)
    print(name, '| peso total =', tot)
    for k in 'ABC':
        s = sum(a * b for a, b in zip(w, m[k]))
        print('  %s: %d/%d = %.4f -> %s' % (k, s, tot, s / tot, fmt(s / tot)))
