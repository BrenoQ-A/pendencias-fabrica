# -*- coding: utf-8 -*-
# Merge: capa (page 0) + corpo -> PDF final único, normalizado para A4
from pypdf import PdfReader, PdfWriter

A4_W, A4_H = 595.28, 841.89

def normalize(page):
    w, h = float(page.mediabox.width), float(page.mediabox.height)
    if abs(w - A4_W) > 0.1 or abs(h - A4_H) > 0.1:
        page.scale_to(A4_W, A4_H)
    return page

cover = '/home/z/my-project/scripts/capa-arquitetura.pdf'
body = '/home/z/my-project/scripts/corpo-arquitetura.pdf'
out = '/home/z/my-project/download/Arquitetura-e-Plano-de-Publicacao-Pendencias-da-Fabrica.pdf'

writer = PdfWriter()
writer.add_page(normalize(PdfReader(cover).pages[0]))
for p in PdfReader(body).pages:
    writer.add_page(normalize(p))
writer.add_metadata({
    '/Title': 'Arquitetura e Plano de Publicação — Pendências da Fábrica',
    '/Author': 'Z.ai',
    '/Creator': 'Z.ai',
    '/Subject': 'Arquitetura de publicação, hospedagem, backup e custos do aplicativo de pendências da fábrica',
})
with open(out, 'wb') as f:
    writer.write(f)
print('PDF final:', out, '| páginas:', len(writer.pages))
