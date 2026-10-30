# -*- coding: utf-8 -*-
"""Analisa a planilha 'Pendencias - Instalacoes da fabrica.xlsx' e gera estatisticas."""
import json, zipfile, os, re
from collections import Counter
from openpyxl import load_workbook

SRC = '/home/z/my-project/upload/Pendências - Instalações da fábrica.xlsx'
OUT = '/home/z/my-project/scripts/stats.json'

# ---------- Peso do arquivo ----------
file_bytes = os.path.getsize(SRC)
z = zipfile.ZipFile(SRC)
media = [(i.filename, i.file_size) for i in z.infolist() if i.filename.startswith('xl/media/')]
media_total = sum(s for _, s in media)
n_media = len(media)

# ---------- Registros (valores calculados) ----------
wb = load_workbook(SRC, data_only=True)
ws = wb['Reportes']
rows = list(ws.iter_rows(values_only=True))
header = list(rows[0])
records = []
for r in rows[1:]:
    rec = dict(zip(header, r))
    records.append(rec)

# fórmulas cruas (para inspecionar colunas calculadas)
wb_raw = load_workbook(SRC, data_only=False)
rows_raw = list(wb_raw['Reportes'].iter_rows(values_only=True))

# normaliza
def s(v):
    return '' if v is None or (isinstance(v, str) and v.strip() == '') else str(v).strip()

n_total = len(records)

status_final = Counter()
for r in records:
    st = s(r.get('Status'))
    if not st:
        st = 'Concluído' if s(r.get('Resolvido?')).lower() == 'true' else '(vazio)'
    status_final[st] += 1

prio_cnt = Counter(s(r.get('Nível de prioridade')) for r in records)
resp_cnt = Counter(s(r.get('Responsável - Execução')) for r in records)
local_cnt = Counter(s(r.get('Onde o problema foi identificado?')) for r in records)
sol_cnt = Counter(s(r.get('Solução necessária')) for r in records)

# datas
import datetime
def to_dt(v):
    if isinstance(v, datetime.datetime):
        return v
    if isinstance(v, datetime.date):
        return datetime.datetime(v.year, v.month, v.day)
    try:
        return datetime.datetime.strptime(str(v).split(' ')[0], '%Y-%m-%d')
    except Exception:
        return None

dts = [to_dt(r.get('Data')) for r in records if to_dt(r.get('Data'))]
d_min, d_max = min(dts), max(dts)
span_days = (d_max - d_min).days + 1
per_month = n_total / span_days * 30

# imagens: link vs vazio
com_link = sum(1 for r in records if 'http' in s(r.get('Imagem')))
sem_link = n_total - com_link

# fórmula na coluna 'Imagem exibida' (crua e calculada)
col_img_exib = header.index('Imagem exibida')
formulas, errors = 0, 0
sample_formula = ''
for i in range(1, len(rows_raw)):
    raw = rows_raw[i][col_img_exib] if col_img_exib < len(rows_raw[i]) else None
    val = rows[i][col_img_exib]
    if isinstance(raw, str) and raw.startswith('='):
        formulas += 1
        if not sample_formula:
            sample_formula = raw[:200]
    if isinstance(val, str) and '#VALUE' in val:
        errors += 1

avg_img = media_total / n_media if n_media else 0

result = {
    'file_bytes': file_bytes,
    'file_mb': round(file_bytes / 1024 / 1024, 2),
    'media_total_bytes': media_total,
    'media_total_mb': round(media_total / 1024 / 1024, 2),
    'media_share_pct': round(media_total / file_bytes * 100, 1),
    'data_other_mb': round((file_bytes - media_total) / 1024 / 1024, 3),
    'n_embedded_images': n_media,
    'avg_image_mb': round(avg_img / 1024 / 1024, 2),
    'n_records': n_total,
    'status': dict(status_final),
    'priority': dict(prio_cnt),
    'responsible': dict(resp_cnt),
    'solution': dict(sol_cnt),
    'locations': dict(local_cnt),
    'date_min': str(d_min.date()), 'date_max': str(d_max.date()),
    'span_days': span_days,
    'records_per_month': round(per_month, 1),
    'records_with_image_link': com_link,
    'records_without_image': sem_link,
    'image_formula_cells': formulas,
    'image_formula_errors': errors,
    'sample_formula': sample_formula,
}
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
print(json.dumps(result, ensure_ascii=False, indent=2))
