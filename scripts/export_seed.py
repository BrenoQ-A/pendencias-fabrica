# -*- coding: utf-8 -*-
"""Exporta os registros da planilha para JSON (seed do app)."""
import json, datetime
from openpyxl import load_workbook

SRC = '/home/z/my-project/upload/Pendências - Instalações da fábrica.xlsx'
OUT = '/home/z/my-project/scripts/seed_data.json'

wb = load_workbook(SRC, data_only=True)
ws = wb['Reportes']
rows = list(ws.iter_rows(values_only=True))
header = [str(h).strip() if h is not None else '' for h in rows[0]]
print('COLUNAS:', json.dumps(header, ensure_ascii=False))

def s(v):
    if v is None:
        return ''
    if isinstance(v, datetime.datetime):
        return v.date().isoformat()
    if isinstance(v, datetime.date):
        return v.isoformat()
    if isinstance(v, str):
        return v.strip()
    return str(v)

records = []
for r in rows[1:]:
    rec = {header[i]: s(r[i]) if i < len(r) else '' for i in range(len(header))}
    # pula linhas totalmente vazias (sem descrição e sem local)
    vals = [v for k, v in rec.items() if k not in ('Imagem exibida',)]
    if any(vals):
        records.append(rec)

print('TOTAL REGISTROS:', len(records))
# mostra 3 exemplos completos
for rec in records[:3]:
    print(json.dumps(rec, ensure_ascii=False, indent=1))

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(records, f, ensure_ascii=False, indent=1)
print('salvo em', OUT)
