# -*- coding: utf-8 -*-
"""Gera o corpo do relatorio (ReportLab) e mescla com a capa.
Relatorio: Otimizar a planilha ou criar um app? - Pendencias da fabrica.
"""
import os, sys, hashlib

PDF_SKILL_DIR = '/home/z/my-project/skills/pdf'
sys.path.insert(0, os.path.join(PDF_SKILL_DIR, 'scripts'))

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
                                PageBreak, CondPageBreak, KeepTogether, Image, HRFlowable)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from PIL import Image as PILImage

# ---------------- Fontes ----------------
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif', f'{FONT_DIR}/truetype/freefont/FreeSerif.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Bold', f'{FONT_DIR}/truetype/freefont/FreeSerifBold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Italic', f'{FONT_DIR}/truetype/freefont/FreeSerifItalic.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-BoldItalic', f'{FONT_DIR}/truetype/freefont/FreeSerifBoldItalic.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
registerFontFamily('FreeSerif', normal='FreeSerif', bold='FreeSerif-Bold',
                   italic='FreeSerif-Italic', boldItalic='FreeSerif-BoldItalic')

from pdf import install_font_fallback
install_font_fallback()

# ---------------- Paleta cascade (gerada por palette.cascade, seed 7) ----------------
PAGE_BG       = colors.HexColor('#f1f0ef')
SECTION_BG    = colors.HexColor('#f2f1f0')
CARD_BG       = colors.HexColor('#e8e7e4')
TABLE_STRIPE  = colors.HexColor('#eeedeb')
HEADER_FILL   = colors.HexColor('#504933')
COVER_BLOCK   = colors.HexColor('#867b5a')
BORDER        = colors.HexColor('#cfcab8')
ICON          = colors.HexColor('#8c7e52')
ACCENT        = colors.HexColor('#87702a')
ACCENT_2      = colors.HexColor('#3a95b4')
TEXT_PRIMARY  = colors.HexColor('#1c1c1a')
TEXT_MUTED    = colors.HexColor('#78766f')
SEM_SUCCESS   = colors.HexColor('#46875c')
SEM_WARNING   = colors.HexColor('#a18347')
SEM_ERROR     = colors.HexColor('#92453e')

TABLE_HEADER_COLOR = HEADER_FILL
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = TABLE_STRIPE

# ---------------- Documento ----------------
MARGIN = 1.0 * inch
PAGE_W, PAGE_H = A4
AVAIL_W = PAGE_W - 2 * MARGIN
AVAIL_H = PAGE_H - 2 * MARGIN
H1_ORPHAN = AVAIL_H * 0.25
MAX_KEEP = PAGE_H * 0.4

DOC_TITLE = 'Otimizar a planilha ou criar um app?'
OUT_BODY = '/home/z/my-project/scripts/body.pdf'
CH = '/home/z/my-project/scripts/'

# ---------------- Estilos ----------------
body = ParagraphStyle('Body', fontName='FreeSerif', fontSize=10.5, leading=17,
                      alignment=TA_JUSTIFY, textColor=TEXT_PRIMARY, spaceAfter=10)
lead = ParagraphStyle('Lead', parent=body, fontSize=11, leading=18, textColor=TEXT_PRIMARY)
bullet = ParagraphStyle('Bullet', parent=body, alignment=TA_LEFT, leftIndent=16,
                        bulletIndent=4, spaceAfter=5)
numitem = ParagraphStyle('NumItem', parent=body, alignment=TA_LEFT, leftIndent=20,
                         firstLineIndent=-14, spaceAfter=6)
h1 = ParagraphStyle('H1', fontName='FreeSerif', fontSize=22, leading=27,
                    textColor=TEXT_PRIMARY, spaceBefore=6, spaceAfter=4)
h2 = ParagraphStyle('H2', fontName='FreeSerif', fontSize=15, leading=20,
                    textColor=HEADER_FILL, spaceBefore=16, spaceAfter=8)
h3 = ParagraphStyle('H3', fontName='FreeSerif', fontSize=11.5, leading=16,
                    textColor=TEXT_PRIMARY, spaceBefore=12, spaceAfter=6)
caption = ParagraphStyle('Caption', fontName='FreeSerif', fontSize=8.5, leading=12,
                         alignment=TA_CENTER, textColor=TEXT_MUTED, spaceBefore=3, spaceAfter=6)
quote = ParagraphStyle('Quote', parent=body, fontName='FreeSerif-Italic',
                       leftIndent=24, textColor=TEXT_PRIMARY, borderPadding=6)
toc_h = ParagraphStyle('TOCTitle', fontName='FreeSerif', fontSize=20, leading=26,
                       textColor=TEXT_PRIMARY, spaceAfter=14)
toc_l0 = ParagraphStyle('TOCL0', fontName='FreeSerif', fontSize=11.5, leading=20, leftIndent=6,
                        textColor=TEXT_PRIMARY)
toc_l1 = ParagraphStyle('TOCL1', fontName='FreeSerif', fontSize=10, leading=16, leftIndent=26,
                        textColor=TEXT_MUTED)

th = ParagraphStyle('TH', fontName='FreeSerif', fontSize=9.5, leading=13,
                    textColor=colors.white, alignment=TA_CENTER)
tc = ParagraphStyle('TC', fontName='FreeSerif', fontSize=9.5, leading=13.5,
                    textColor=TEXT_PRIMARY, alignment=TA_LEFT)
tcc = ParagraphStyle('TCC', parent=tc, alignment=TA_CENTER)
stat_big = ParagraphStyle('StatBig', fontName='FreeSerif', fontSize=19, leading=23,
                          textColor=ACCENT, alignment=TA_CENTER)
stat_lbl = ParagraphStyle('StatLbl', fontName='FreeSerif', fontSize=8.5, leading=11.5,
                          textColor=TEXT_MUTED, alignment=TA_CENTER)

# ---------------- Helpers ----------------
def add_heading(text, style, level=0):
    key = 'h_%s' % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph('<a name="%s"/><b>%s</b>' % (key, text), style)
    p.bookmark_name = key
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

def h1_block(text):
    """H1 com regua de acento e protecao contra titulo orfao."""
    rule = HRFlowable(width='100%', thickness=1.2, color=ACCENT,
                      spaceBefore=2, spaceAfter=14)
    return [CondPageBreak(H1_ORPHAN), KeepTogether([add_heading(text, h1, level=0), rule])]

def h2_block(text):
    return [CondPageBreak(70), add_heading(text, h2, level=1)]

def safe_keep(elements):
    total = 0
    for el in elements:
        w, hh = el.wrap(AVAIL_W, PAGE_H)
        total += hh
    if total <= MAX_KEEP:
        return [KeepTogether(elements)]
    elif len(elements) >= 2:
        return [KeepTogether(elements[:2])] + list(elements[2:])
    return list(elements)

def embed_image(path, max_width=None, max_height=None):
    if max_width is None:
        max_width = AVAIL_W
    if max_height is None:
        max_height = PAGE_H * 0.35
    pil = PILImage.open(path)
    ow, oh = pil.size
    rw = max_width / ow if ow > max_width else 1.0
    rh = max_height / oh if oh > max_height else 1.0
    r = min(rw, rh)
    return Image(path, width=ow * r, height=oh * r)

def figure(path, cap_text, max_width=None, max_height=None):
    img = embed_image(path, max_width, max_height)
    cap = Paragraph(cap_text, caption)
    return [Spacer(1, 14)] + safe_keep([img, cap]) + [Spacer(1, 12)]

def callout_strip(items):
    """items: lista de (numero_grande, rotulo). Gera faixa com 3 cartoes."""
    n = len(items)
    gap = 10
    w = (AVAIL_W - gap * (n - 1)) / n
    row_big, row_lbl = [], []
    col_widths = []
    for i, (big, lbl) in enumerate(items):
        row_big.append(Paragraph('<b>%s</b>' % big, stat_big))
        row_lbl.append(Paragraph(lbl, stat_lbl))
        col_widths.append(w)
        if i < n - 1:
            row_big.append('')
            row_lbl.append('')
            col_widths.append(gap)
    t = Table([row_big, row_lbl], colWidths=col_widths, hAlign='CENTER')
    style = [('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
             ('TOPPADDING', (0, 0), (-1, 0), 10),
             ('BOTTOMPADDING', (0, 1), (-1, 1), 10),
             ('TOPPADDING', (0, 1), (-1, 1), 2),
             ('BOTTOMPADDING', (0, 0), (-1, 0), 2),
             ('LEFTPADDING', (0, 0), (-1, -1), 6),
             ('RIGHTPADDING', (0, 0), (-1, -1), 6)]
    for i in range(n):
        c = i * 2
        style.append(('BACKGROUND', (c, 0), (c, 1), CARD_BG))
        style.append(('BOX', (c, 0), (c, 1), 1, ACCENT))
    t.setStyle(TableStyle(style))
    return [Spacer(1, 8), t, Spacer(1, 14)]

def styled_table(data_rows, ratios, header_row=True, align_center_cols=None):
    """data_rows: primeira linha = header (texto simples). Celulas viram Paragraph."""
    align_center_cols = align_center_cols or []
    col_w = [r * AVAIL_W for r in ratios]
    assert abs(sum(ratios) - 1.0) < 0.01, 'ratios must sum to 1'
    wrapped = []
    for ri, row in enumerate(data_rows):
        out_row = []
        for ci, cell in enumerate(row):
            if ri == 0 and header_row:
                out_row.append(Paragraph('<b>%s</b>' % cell, th))
            else:
                st = tcc if ci in align_center_cols else tc
                out_row.append(Paragraph(str(cell), st))
        wrapped.append(out_row)
    t = Table(wrapped, colWidths=col_w, hAlign='CENTER', repeatRows=1)
    style = [('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
             ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
             ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
             ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
             ('LEFTPADDING', (0, 0), (-1, -1), 7),
             ('RIGHTPADDING', (0, 0), (-1, -1), 7),
             ('TOPPADDING', (0, 0), (-1, -1), 5.5),
             ('BOTTOMPADDING', (0, 0), (-1, -1), 5.5)]
    for ri in range(1, len(data_rows)):
        style.append(('BACKGROUND', (0, ri), (-1, ri),
                      TABLE_ROW_EVEN if ri % 2 == 1 else TABLE_ROW_ODD))
    t.setStyle(TableStyle(style))
    return t

def table_block(title_text, tbl, cap_text=None):
    out = [Spacer(1, 16)]
    title_p = Paragraph('<b>%s</b>' % title_text, h3)
    w, hh = tbl.wrap(AVAIL_W, PAGE_H)
    if hh <= MAX_KEEP:
        out += safe_keep([title_p, tbl])
    else:
        # tabela alta: nao agrupar - deixa fluir entre paginas (repeatRows repete cabecalho)
        out += [CondPageBreak(100), title_p, tbl]
    if cap_text:
        out += [Spacer(1, 4), Paragraph(cap_text, caption)]
    out += [Spacer(1, 14)]
    return out

# ---------------- Cabecalho / rodape ----------------
def header_footer(canvas, doc):
    canvas.saveState()
    # cabecalho
    canvas.setFont('FreeSerif', 7.5)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(MARGIN, PAGE_H - 0.62 * inch,
                      'Pendências · Instalações da fábrica — Análise de solução')
    canvas.setStrokeColor(ACCENT)
    canvas.setLineWidth(1.2)
    canvas.line(MARGIN, PAGE_H - 0.70 * inch, PAGE_W - MARGIN, PAGE_H - 0.70 * inch)
    # rodape
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN, 0.62 * inch, PAGE_W - MARGIN, 0.62 * inch)
    canvas.setFont('FreeSerif', 7.5)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(MARGIN, 0.45 * inch, 'Uso interno · Facilities')
    canvas.drawRightString(PAGE_W - MARGIN, 0.45 * inch, str(doc.page))
    canvas.restoreState()

class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

# ---------------- Conteudo ----------------
story = []

# ---- Sumario (TOC) ----
toc = TableOfContents()
toc.levelStyles = [toc_l0, toc_l1]
story.append(Paragraph('<b>Sumário</b>', toc_h))
story.append(toc)
story.append(PageBreak())

# ================= 1. SUMARIO EXECUTIVO =================
story += h1_block('1. Sumário executivo')

story.append(Paragraph(
    'A planilha <b>Pendências - Instalações da fábrica</b> recebe os registros do Microsoft Forms e '
    'acompanha o tratamento de cada problema encontrado nas instalações. O processo de coleta funciona '
    'bem: o formulário é rápido no celular, salva a foto automaticamente no SharePoint e o Excel calcula '
    'prazo, responsável e status a partir de regras bem definidas. O problema declarado é o peso do '
    'arquivo, e a análise dos dados confirma: de 22,5 MB de arquivo, <b>22,44 MB (99,8%) são imagens '
    'embutidas nas células</b>. Os dados reais, incluindo todas as fórmulas e as três abas de resumo, '
    'ocupam apenas 54 KB.', lead))

story += callout_strip([
    ('22,5 MB', 'tamanho atual do arquivo, sendo 99,8% imagens embutidas'),
    ('16 de 16', 'fórmulas de exibição de imagem com erro #VALUE!'),
    ('30,5 MB/mês', 'crescimento projetado mantendo a prática atual'),
])

story.append(Paragraph(
    'A primeira conclusão permanece: o problema que motivou a avaliação não é limitação de ferramenta, '
    'é prática de armazenamento - as fotos estão sendo gravadas dentro do arquivo, quando já existem no '
    'SharePoint e podem ser abertas por link; isso se resolve com configuração, não com código. A '
    'segunda conclusão é nova e muda a recomendação: o processo de verificar e registrar pendências '
    '<b>não tem relação direta com a empresa</b>, portanto <b>dispensa liberação do T.I.</b> para '
    'desenvolver uma ferramenta própria; e essa ferramenta precisaria ajudar, sobretudo, na '
    '<b>visualização das imagens</b> e no <b>acompanhamento do progresso</b> das tarefas. Com a barreira '
    'organacional fora do caminho e um desenvolvimento enxuto possível, a aplicação web/mobile própria '
    'deixa de ser superdimensionada e passa a ser o caminho recomendado - com a plataforma Microsoft '
    'preservada como alternativa pronta e de menor manutenção.', body))

story.append(Paragraph(
    'A recomendação atualizada é um caminho em três fases, sem descartar nada do que já funciona: '
    '<b>(1)</b> esta semana, remover a coluna "Imagem exibida" e as imagens embutidas - o arquivo volta '
    'a alguns kilobytes em cerca de uma hora de trabalho; <b>(2)</b> nas próximas 1 a 2 semanas, colocar '
    'no ar um <b>aplicativo web/mobile próprio e leve</b>, desenhado em torno dos dois requisitos '
    'essenciais - galeria de fotos com visualização em tela cheia e quadro de acompanhamento do '
    'progresso (atrasadas, em andamento, concluídas) - rodando em paralelo com a planilha até validar; '
    '<b>(3)</b> opcionalmente, alertas automáticos de atraso no próprio app - hoje são 16 pendências '
    'atrasadas e ninguém recebe aviso. A Opção B (Lista do SharePoint + Power Apps) fica documentada '
    'como alternativa pronta e sem manutenção, para adotar caso o time prefira não assumir a '
    'continuidade de uma ferramenta própria.', body))

# ================= 2. DIAGNOSTICO =================
story += h1_block('2. Diagnóstico da situação atual')

story += h2_block('2.1 Como o controle funciona hoje')
story.append(Paragraph(
    'O fluxo atual tem quatro peças. O <b>Microsoft Forms</b> coleta o problema, o local, a solução '
    'necessária e a foto. As respostas caem no Excel, na aba <b>Reportes</b>, que é a base viva de '
    'acompanhamento. A aba <b>Base de dados</b> guarda as regras de negócio. As abas <b>Resumo por '
    'responsável</b> e <b>Resumo por local</b> consolidam totais por área e por ambiente. As regras são '
    'aplicadas por fórmulas: cada solução necessária aponta para uma área responsável e cada nível de '
    'prioridade define um prazo máximo, conforme a tabela abaixo.', body))

t1 = styled_table([
    ['Solução necessária', 'Ação acionada', 'Área responsável', 'Prioridade', 'Prazo máximo'],
    ['Reparo', 'Acionar manutenção', 'Manutenção', 'Crítico', '3 dias'],
    ['Substituição', 'Verificar estoque ou solicitar compra', 'Manutenção', 'Alto', '7 dias'],
    ['Higienização', 'Acionar time da limpeza', 'Limpeza', 'Moderado', '14 dias'],
    ['Instalação de peça faltante', 'Verificar estoque ou solicitar compra', 'Manutenção', 'Baixo', '30 dias'],
    ['Remoção de instalação ou material', 'Acionar manutenção ou limpeza', 'Manutenção / Limpeza', 'Conforme tipo', 'Conforme prioridade'],
    ['Correção de Facilities', 'Acionar Facilities', 'Facilities', 'Conforme caso', 'A combinar'],
], [0.24, 0.28, 0.20, 0.14, 0.14], align_center_cols=[3, 4])
story += table_block('Tabela 1 - Regras da aba Base de dados', t1,
                     'Fonte: aba "Base de dados" da planilha analisada.')

story.append(Paragraph(
    'O status de cada linha é calculado automaticamente: se "Resolvido?" é verdadeiro, vira '
    '"Concluído"; se a data limite já passou, vira "Atrasada"; caso contrário, "Em andamento". No recorte '
    'analisado (38 registros entre 30/09 e 21/10/2026), o panorama é o da Figura 1: quase metade das '
    'pendências está atrasada, concentrada nos vestiários masculinos (26 dos 38 registros) e sob '
    'responsabilidade da Manutenção (34 dos 38).', body))

story += figure(CH + 'chart_status.png',
                'Figura 1 - Situação das 38 pendências no recorte analisado (out/2026).',
                max_width=AVAIL_W * 0.92)

story += h2_block('2.2 Por que o arquivo pesa: a evidência técnica')
story.append(Paragraph(
    'O arquivo tem 22,5 MB, mas quase nada disso é dados. A decomposição do pacote interno do Excel '
    '(formato .xlsx é um arquivo compactado) mostra 14 imagens gravadas dentro dele, somando 22,44 MB - '
    '99,8% do peso total. A média é de 1,6 MB por foto, resolução típica de câmera de celular. As 38 '
    'linhas de dados, as fórmulas e todos os resumos somam 54 KB. Ou seja: <b>o conteúdo útil do arquivo '
    'é 400 vezes menor que o peso que ele carrega</b>.', body))

story += figure(CH + 'chart_peso.png',
                'Figura 2 - Composição do tamanho do arquivo. Fonte: inspeção do pacote .xlsx enviado.',
                max_width=AVAIL_W * 0.95)

story.append(Paragraph(
    'Há três mecanismos de imagem convivendo no arquivo, e é aí que nasce o problema. Primeiro, a coluna '
    '"Imagem" guarda apenas o <b>link</b> da foto no SharePoint - isso é leve e correto (34 dos 38 '
    'registros têm link). Segundo, 14 fotos foram <b>embutidas dentro das células</b> (recurso "imagem '
    'na célula"), e cada uma fica gravada integralmente no arquivo - é isso que o torna pesado. Terceiro, '
    'a coluna "Imagem exibida" tenta exibir as fotos por fórmula <b>=IMAGE(link_da_imagem)</b> - e as 16 '
    'células com essa fórmula retornam <b>#VALUE!</b>, porque os links do SharePoint/OneDrive exigem '
    'autenticação e a função não consegue baixar a imagem.', body))

story.append(Paragraph(
    'Em resumo: a foto embutida duplica o armazenamento (a imagem já existe no SharePoint), não funciona '
    'na coluna de fórmula e é a única causa relevante do peso. Vale registrar também um risco silencioso: '
    'todos os uploads do Forms estão caindo na <b>pasta pessoal do OneDrive de um contratado</b> '
    '(João Almeida), porque é a conta que criou o formulário. Se essa conta for desativada, os links das '
    'fotos podem se tornar inacessíveis.', body))

story += h2_block('2.3 Projeção: o que acontece mantendo a prática atual')
story.append(Paragraph(
    'Com o ritmo atual de 52 registros por mês e o padrão observado (37% das fotos acabam embutidas, '
    'média de 1,6 MB), o arquivo cresce cerca de <b>30,5 MB por mês</b>. Em seis meses passaria de '
    '22 MB para algo em torno de 206 MB, e em um ano chegaria perto de 389 MB, como mostra a Figura 3. '
    'O Excel começa a degradar bem antes disso: arquivos com centenas de megabytes abrem devagar, '
    'travam ao salvar e falham na sincronização do OneDrive, principalmente no celular. A experiência '
    'dos dois inspetores pioraria mês a mês.', body))

story += figure(CH + 'chart_projecao.png',
                'Figura 3 - Projeção do tamanho do arquivo em 12 meses. Premissas: 52 registros/mês, '
                '37% das fotos embutidas, média de 1,6 MB por foto.',
                max_width=AVAIL_W * 0.95)

story += h2_block('2.4 Fragilidades além do peso')
story.append(Paragraph(
    'O peso é o sintoma mais visível, mas a análise identificou outros pontos que a solução escolhida '
    'pode resolver de quebra:', body))
for item in [
    '<b>Erro visível em produção:</b> as 16 células com #VALUE! passam a impressão de planilha abandonada e escondem as fotos de quem não abre link por link.',
    '<b>Sem alerta de atraso:</b> o status "Atrasada" existe, mas ninguém é notificado; hoje são 16 pendências atrasadas, 6 delas críticas ou altas descobertas só ao abrir a planilha.',
    '<b>Resumos manuais:</b> as abas de resumo dependem de tabelas dinâmicas atualizadas à mão; fora do Excel desktop, não se atualizam.',
    '<b>Edição simultânea frágil:</b> filtros aplicados por uma pessoa afetam a visão das demais; não há histórico de quem alterou um status e quando.',
    '<b>Fotos dependentes de uma pessoa:</b> os arquivos de imagem vivem no OneDrive pessoal do criador do Forms, não em um local institucional.',
]:
    story.append(Paragraph(item, bullet, bulletText='•'))
story.append(Spacer(1, 4))

# ================= 3. AS TRES OPCOES =================
story += h1_block('3. As três opções avaliadas')

story += h2_block('3.1 Opção A - Otimizar a planilha atual (Forms + Excel)')
story.append(Paragraph(
    'É a correção cirúrgica: manter todo o fluxo como está e eliminar apenas a causa do peso. O escopo '
    'cabe em uma hora: excluir a coluna "Imagem exibida" (as fórmulas =IMAGE que falham), apagar as 14 '
    'imagens embutidas das células e manter a coluna "Imagem" com os links do SharePoint, que continuam '
    'funcionando com um clique. Opcionalmente, criar uma aba "Galeria" com hyperlinks organizados por '
    'registro, para quem preferir navegar pelas fotos.', body))
story.append(Paragraph('<b>Pontos a favor</b>', h3))
for item in [
    'Custo zero e esforço mínimo - é ajuste de configuração, não projeto.',
    'Não muda nada na rotina de quem registra via Forms e de quem executa.',
    'Resolve 100% do problema declarado (peso), com risco praticamente nulo.',
]:
    story.append(Paragraph(item, bullet, bulletText='•'))
story.append(Paragraph('<b>Limitações</b>', h3))
for item in [
    'A foto deixa de aparecer na célula: vê-se a miniatura apenas se clicar no link (ou abrir a imagem na aba Galeria).',
    'Não endereça alertas de atraso, histórico de alterações nem edição simultânea - continua sendo Excel.',
    'As fotos seguem no OneDrive pessoal do criador do Forms, com o risco de dependência já descrito.',
]:
    story.append(Paragraph(item, bullet, bulletText='•'))
story.append(Paragraph(
    'Esta opção é o mínimo indispensável e está incluída como Fase 1 da recomendação, independentemente '
    'do que for decidido para o médio prazo.', body))

story += h2_block('3.2 Opção B - Power Platform: Lista do SharePoint + Power Apps')
story.append(Paragraph(
    'É o caminho nativo do ecossistema Microsoft que a empresa já usa, e encaixa nas suas restrições '
    '(Power Apps e Power Automate liberados, volume estável, prioridade em leveza). A ideia: os registros '
    'passam a morar em uma <b>Lista do SharePoint</b>, que é um banco de dados visual - cada item é uma '
    'linha com campos tipados, e a coluna do tipo "Imagem" armazena a foto separadamente, exibindo '
    '<b>miniatura leve</b> direto na lista. O arquivo pesado deixa de existir: a lista cresce para '
    'sempre sem engordar, porque a imagem não é gravada dentro de um documento.', body))
story.append(Paragraph(
    'Sobre essa lista, o Power Apps gera um aplicativo automaticamente (Integrar > Power Apps > Criar '
    'aplicativo): formulário para registrar pendência com foto pela câmera do celular, galeria para '
    'acompanhar com filtros por status, local e responsável. O Microsoft Forms pode continuar como ponto '
    'de entrada durante a transição - os dois convivem. E o Power Automate cobre o que falta: fluxo '
    'diário que avisa o responsável quando o prazo vence e resumo semanal para você.', body))
story.append(Paragraph('<b>Pontos a favor</b>', h3))
for item in [
    'Leveza estrutural: miniaturas sob demanda, sem arquivo para engordar - atende diretamente à prioridade declarada.',
    'Fotos no dia a dia: miniatura na lista e no app, com a foto grande em dois cliques.',
    'Incluído no Microsoft 365 corporativo existente, sem custo adicional na maioria dos planos.',
    'Multiusuário com histórico de versões e permissões por lista - fim dos conflitos de filtro.',
    'Alertas automáticos de atraso via Power Automate; dashboards possíveis com Power BI depois.',
    'Migração suave: Forms continua funcionando em paralelo durante a transição.',
]:
    story.append(Paragraph(item, bullet, bulletText='•'))
story.append(Paragraph('<b>Limitações</b>', h3))
for item in [
    'Curva de aprendizado inicial: montar lista, app e fluxo leva de 4 a 8 horas na primeira vez, com templates prontos.',
    'Personalização limitada ao que a plataforma oferece (telas padronizadas, dependência de conexão).',
    'Passa pela governança de TI da empresa (criação do app em ambiente corporativo) - hoje sem restrição para vocês, mas é um passo formal.',
]:
    story.append(Paragraph(item, bullet, bulletText='•'))

story += h2_block('3.3 Opção C - Aplicação web/mobile própria (desenvolvimento sob medida)')
story.append(Paragraph(
    'É a opção que o novo cenário reabilita. Duas informações mudam a avaliação feita na primeira '
    'edição deste relatório: o processo de verificar os problemas da fábrica e registrá-los para '
    'correção <b>não tem relação direta com a empresa</b>, portanto <b>não é necessária nenhuma '
    'liberação do T.I.</b> para desenvolver uma ferramenta que o auxilie; e o desenvolvimento pode ser '
    'feito de forma assistida e enxuta, com escopo de MVP e hospedagem gratuita, em vez do projeto '
    'clássico de 40 a 120 horas com aprovação de arquitetura. O resultado é uma aplicação sob medida, '
    'instalável no celular como atalho (PWA), sem loja de aplicativos, sem licença e sem depender de '
    'qualquer ambiente corporativo.', body))
story.append(Paragraph(
    'Sobretudo, o aplicativo seria desenhado em torno dos dois requisitos declarados como essenciais: '
    '<b>visualização das imagens</b> - foto registrada pela câmera já comprimida para cerca de 300 KB, '
    'miniatura na lista e abertura em tela cheia com zoom - e <b>acompanhamento do progresso</b> das '
    'tarefas - quadro com as pendências separadas em Atrasadas, Em andamento e Concluídas, destaque '
    'para o que passou do prazo e filtros por local, responsável e prioridade. É exatamente nesses dois '
    'pontos que uma ferramenta dedicada supera qualquer planilha e qualquer tela padronizada de '
    'plataforma. A seção 5 detalha as telas e comportamentos propostos.', body))
story.append(Paragraph(
    'O custo real desta opção não é financeiro, é de <b>continuidade</b>: uma ferramenta própria '
    'precisa de alguém que a mantenha - corrigir eventuais falhas, renovar a hospedagem gratuita, '
    'cuidar de um backup periódico. As mitigações são conhecidas e baratas: código simples e '
    'documentado, dados exportáveis para planilha a qualquer momento (o que também elimina o risco de '
    'ficar preso à ferramenta) e escopo mínimo sem dependências exóticas. O risco organizacional '
    'clássico - o app que envelhece quando quem o criou sai de cena - é proporcional à complexidade; '
    'um MVP de seis telas, como o proposto, fica na extremidade manejável desse risco.', body))
story.append(Paragraph('<b>Por que a opção volta à recomendação</b>', h3))
for item in [
    'Sem liberação do T.I.: o processo é autônomo da empresa, então nem o desenvolvimento nem a hospedagem precisam de aprovação.',
    'Os dois requisitos essenciais - fotos e progresso - são o coração do app, não acessórios.',
    'Custo de licença zero: hospedagem gratuita comporta folgado o volume de ~52 registros/mês com fotos comprimidas.',
    'Desenvolvimento assistido e enxuto: MVP em dias, não meses; migração dos 38 registros atuais por importação.',
]:
    story.append(Paragraph(item, bullet, bulletText='•'))
story.append(Paragraph('<b>Quando o app próprio passaria de MVP a projeto</b>', h3))
story.append(Paragraph(
    'Estes gatilhos, já registrados na primeira edição, continuam válidos como fronteira de escala - '
    'ultrapassá-los mudaria o tamanho do investimento, não a viabilidade da opção:', body))
for item in [
    'Integração obrigatória com sistema corporativo de ordens de serviço ou estoque, sem API acessível para o app.',
    'Operação em área sem sinal, exigindo registro offline verdadeiro com sincronização posterior.',
    'Escala de dezenas de unidades ou centenas de usuários, com variações de fluxo por unidade.',
    'Exigência formal de conformidade ou auditoria que precise de infraestrutura corporativa.',
]:
    story.append(Paragraph(item, bullet, bulletText='•'))
story.append(Paragraph(
    'Com a barreira organizacional removida e o custo próximo de zero, a Opção C deixa de ser '
    'superdimensionada e passa a ser a recomendada, em versão MVP - com a Opção B preservada como '
    'alternativa pronta e de menor manutenção.', body))

# ================= 4. MATRIZ DE DECISAO =================
story += h1_block('4. Matriz de decisão revisada')
story.append(Paragraph(
    'A matriz abaixo compara as três opções nos critérios relevantes para o seu contexto. Esta versão '
    'incorpora o cenário atualizado informado após a primeira edição: o processo não tem relação direta '
    'com a empresa e dispensa liberação do T.I. - o que entra como o novo critério "Autonomia e '
    'burocracia"; o acompanhamento do progresso foi declarado requisito essencial e ganha critério '
    'próprio; e as notas do app próprio foram revisadas em esforço, custo, manutenção e adequação ao '
    'volume, refletindo o desenvolvimento assistido com escopo de MVP e hospedagem gratuita. Notas de 1 '
    '(ruim) a 5 (ótimo); a nota final é a média ponderada pelos pesos.', body))

t2 = styled_table([
    ['Critério (peso)', 'A - Otimizar planilha', 'B - Power Apps', 'C - App próprio (MVP)'],
    ['Leveza e velocidade com fotos (5)', '2', '5', '5'],
    ['Fotos no dia a dia (4)', '2', '5', '5'],
    ['Acompanhamento do progresso (3)', '2', '3', '5'],
    ['Manutenção futura (4)', '4', '4', '3'],
    ['Adequação ao volume atual (3)', '5', '5', '3'],
    ['Esforço de implantação (3)', '5', '3', '3'],
    ['Custo adicional (3)', '5', '4', '4'],
    ['Colaboração e histórico (2)', '2', '5', '4'],
    ['Alertas de atraso (2)', '1', '5', '5'],
    ['Autonomia e burocracia (2)', '5', '3', '5'],
    ['Escalabilidade (1)', '2', '4', '5'],
    ['<b>Nota final ponderada</b>', '<b>3,2</b>', '<b>4,3</b>', '<b>4,2</b>'],
], [0.40, 0.20, 0.20, 0.20], align_center_cols=[1, 2, 3])
story += table_block('Tabela 2 - Matriz de decisão revisada (notas de 1 a 5, ponderada pelos pesos)', t2,
                     'Notas revisadas em relação à primeira edição do relatório, com dois critérios novos.')

story.append(Paragraph(
    'O movimento em relação à primeira edição é grande: o app próprio salta de 3,3 para 4,2 e passa a '
    'empatar tecnicamente com o Power Apps (4,3), que recua de 4,5 para 4,3 porque passou a ser a única '
    'opção que ainda exige um passo formal no ambiente corporativo. As duas líderes têm perfis '
    'complementares: o Power Apps vence em manutenção (a Microsoft cuida da plataforma) e em '
    'colaboração e histórico; o app próprio vence exatamente nos critérios declarados como essenciais - '
    'visualização das fotos, acompanhamento do progresso e autonomia. Com empate técnico na matriz, o '
    'desempate é qualitativo e favorece o app próprio: o processo é autônomo da empresa e a ferramenta '
    'pode ser moldada ao fluxo real, e não o contrário.', body))

story += figure(CH + 'chart_matriz.png',
                'Figura 4 - Nota final ponderada por opção: cenário original versus cenário atualizado.',
                max_width=AVAIL_W * 0.92)

# ================= 5. O APLICATIVO PROPOSTO =================
story += h1_block('5. O aplicativo proposto: funcionalidades e telas')

story.append(Paragraph(
    'Esta seção traduz os dois requisitos essenciais em um desenho concreto, para que o desenvolvimento '
    'comece com o escopo fechado. O princípio geral: um aplicativo leve, pensado primeiro para o '
    'celular, no qual a foto e o progresso são a interface principal - não campos escondidos em uma '
    'planilha. Tudo o que a planilha faz de útil (regras de prazo, responsável por tipo de solução, '
    'resumos por local e por área) é preservado; tudo o que ela faz de mal (engordar, esconder a foto, '
    'não avisar o atraso) é eliminado.', body))

story += h2_block('5.1 Requisito essencial 1 - Visualização das imagens')
for item in [
    'Foto direto da câmera no momento do registro, com compressão automática no envio (alvo de ~300 KB por foto) - a leveza fica garantida por desenho, não por disciplina do usuário.',
    'Miniatura da foto visível no cartão de cada pendência, para reconhecimento visual imediato do problema.',
    'Abertura em tela cheia com zoom (pinça) em dois toques, para inspecionar o detalhe que motivou o registro.',
    'Galeria filtrável: ver apenas as fotos de um local, de um responsável ou das pendências em atraso.',
    'As fotos ficam fora de qualquer arquivo: nada engorda, nada quebra, nada depende de fórmula ou de link autenticado.',
]:
    story.append(Paragraph(item, bullet, bulletText='•'))

story += h2_block('5.2 Requisito essencial 2 - Acompanhamento do progresso')
for item in [
    'Quadro de progresso com três colunas - Atrasada, Em andamento, Concluída - e cartões que mudam de coluna com um toque.',
    'Destaque automático do que passou do prazo, com contadores por coluna, por responsável e por local.',
    'Filtros combináveis por local, responsável, prioridade e período.',
    'Histórico de cada pendência: quando foi criada, quem alterou o status e quando foi concluída.',
    'Status calculado com a mesma regra atual (concluído se "Resolvido?"; atrasado se passou da data limite), preservando os prazos da Tabela 1.',
]:
    story.append(Paragraph(item, bullet, bulletText='•'))

t3 = styled_table([
    ['Tela', 'O que faz', 'Requisito atendido'],
    ['Registro', 'Formulário curto: local, problema, solução necessária, prioridade e foto pela câmera', 'Registro leve'],
    ['Lista / Galeria', 'Pendências em cartões com miniatura da foto e filtro rápido por status e local', 'Visualização das imagens'],
    ['Detalhe da pendência', 'Foto em tela cheia com zoom, todos os campos, histórico e ações (concluir, reabrir)', 'Visualização das imagens'],
    ['Quadro de progresso', 'Três colunas com arrastar-e-soltar, contadores e destaque de atraso', 'Acompanhamento do progresso'],
    ['Resumo', 'Totais por local e por responsável, equivalentes às abas de resumo da planilha', 'Acompanhamento do progresso'],
    ['Acesso', 'Abertura por PIN simples do time; instalável na tela inicial do celular (PWA)', 'Simplicidade'],
], [0.20, 0.54, 0.26])
story += table_block('Tabela 3 - Telas do aplicativo proposto', t3,
                     'Escopo de MVP: seis telas, sem integrações corporativas.')

story += h2_block('5.3 Aspectos técnicos e de operação')
story.append(Paragraph(
    'Nada nesta proposta exige infraestrutura incomum. O aplicativo é uma PWA: abre no navegador do '
    'celular e pode ser fixado na tela inicial com ícone próprio, comportando-se como um aplicativo '
    'nativo, sem loja de aplicativos e sem atualização manual. O acesso é por PIN compartilhado do '
    'time - suficiente para um processo autônomo conduzido por 2 a 3 pessoas - e os dados ficam em um '
    'serviço gratuito de banco de dados com armazenamento de arquivos, sob conta dedicada ao processo, '
    'não à conta pessoal de um integrante.', body))
for item in [
    'Volume estimado: ~52 registros/mês com foto de ~300 KB equivalem a cerca de 15 MB por mês - anos de capacidade dentro do plano gratuito.',
    'Backup e portabilidade: exportação completa para planilha (CSV/Excel) a qualquer momento, a um clique.',
    'Regras de negócio (prazos e responsáveis da Tabela 1) implementadas no app, substituindo as fórmulas da planilha.',
    'Migração: os 38 registros atuais entram por importação da planilha leve da Fase 1, com os links das fotos antigas preservados.',
]:
    story.append(Paragraph(item, bullet, bulletText='•'))
story.append(Spacer(1, 4))

# ================= 6. RECOMENDACAO =================
story += h1_block('6. Recomendação: plano em três fases')

story.append(Paragraph(
    'A recomendação consolidada: <b>adotar a Opção A imediatamente como alívio, colocar o app próprio '
    '(Opção C) no ar em versão MVP nas próximas duas semanas e manter a Opção B documentada como '
    'alternativa pronta e de menor manutenção</b>. Nada do que existe hoje é descartado - o Forms segue '
    'como coleta durante a transição, as regras da Base de dados seguem como negócio e a planilha atual '
    'vira histórico.', body))

story += callout_strip([
    ('Fase 1', 'Esta semana · cerca de 1 hora · arquivo volta a menos de 100 KB'),
    ('Fase 2', '1 a 2 semanas · app MVP no ar, em paralelo com a planilha'),
    ('Fase 3', 'Opcional · alertas de atraso e resumo automático no app'),
])

story += h2_block('6.1 Fase 1 - Enxugar o arquivo (esta semana)')
story.append(Paragraph('Passo a passo, em ordem:', body))
for i, item in enumerate([
    'Abra a planilha e vá até a aba "Reportes".',
    'Exclua a coluna "Imagem exibida" inteira (botão direito no cabeçalho da coluna, Excluir). É a coluna com os erros #VALUE! - as fórmulas =IMAGE não funcionam com links autenticados do SharePoint.',
    'Localize e apague as imagens embutidas: percorra a planilha e, nas células que exibem foto dentro da célula, selecione-as e pressione Delete (o link da coluna "Imagem" permanece intacto).',
    'Salve como novo arquivo ("Pendências - Instalações (leve).xlsx") e confira o tamanho: deve cair para menos de 100 KB.',
    'Distribua o arquivo leve no lugar do antigo e mantenha o antigo salvo como histórico congelado.',
], start=1):
    story.append(Paragraph('<b>%d.</b> %s' % (i, item), numitem))
story.append(Paragraph(
    'Resultado imediato: abertura em segundos no computador e no celular, fim dos erros visíveis, e o '
    'processo continua funcionando exatamente como hoje enquanto a Fase 2 é preparada.', body))

story += h2_block('6.2 Fase 2 - Construir e validar o app próprio (1 a 2 semanas)')
story.append(Paragraph(
    'O objetivo desta fase é substituir o arquivo por uma ferramenta desenhada para o processo, nos '
    'termos da seção 5. O roteiro mínimo viável:', body))
for i, item in enumerate([
    'Fechar o escopo com base na seção 5: seis telas, dois requisitos essenciais (fotos e progresso) e as regras de prazo da Tabela 1 implementadas no app.',
    'Criar o banco de dados gratuito e o acesso por PIN do time, em conta dedicada ao processo.',
    'Construir o MVP: registro com foto comprimida, lista com miniaturas, detalhe com zoom em tela cheia, quadro de progresso com três colunas e resumo por local e responsável.',
    'Importar as 38 pendências atuais da planilha leve da Fase 1, preservando os links das fotos antigas.',
    'Testar por uma semana com os inspetores, com planilha e app em paralelo; ajustar o que incomodar no dia a dia.',
    'Estabilizado, congelar a planilha como histórico (somente leitura) e registrar pendência apenas no app, com data de corte comunicada ao time.',
], start=1):
    story.append(Paragraph('<b>%d.</b> %s' % (i, item), numitem))

story += h2_block('6.3 Fase 3 - Alertas e resumo automático (opcional, 2 a 4 horas)')
story.append(Paragraph(
    'Com os dados no app, o alerta de atraso deixa de depender de alguém abrir a planilha: uma rotina '
    'diária varre as pendências não concluídas cuja data limite já passou e avisa o responsável de cada '
    'uma (e-mail ou notificação no celular), com cópia para você; um resumo semanal consolida o que '
    'entrou, o que foi concluído e o que continua atrasado. É o mecanismo que transforma os 16 '
    'atrasados de hoje em exceções tratadas no dia seguinte, e não descobertas casuais. Na alternativa '
    'Power Apps (seção 6.4), o mesmo efeito é obtido com um fluxo Power Automate agendado para rodar '
    'todo dia às 8h.', body))

story += h2_block('6.4 Alternativa preservada: Lista do SharePoint + Power Apps (Opção B)')
story.append(Paragraph(
    'Se o time preferir não assumir a continuidade de uma ferramenta própria, a Opção B permanece '
    'inteira e pronta: os registros migram para uma Lista do SharePoint, o Power Apps gera o aplicativo '
    'automaticamente a partir da lista e o Power Automate cobre os alertas. É o caminho de menor '
    'manutenção - a plataforma é cuidada pela Microsoft - em troca de telas padronizadas e de um passo '
    'formal no ambiente corporativo. O mapeamento das colunas para a lista é o da Tabela 4.', body))

t4 = styled_table([
    ['Coluna atual (Forms / Excel)', 'Tipo de coluna na Lista do SharePoint'],
    ['ID', 'Número (ou ID automático da lista)'],
    ['Hora de início / Data', 'Data e hora'],
    ['Nome / Email do inspetor', 'Pessoa (diretório corporativo)'],
    ['Resolvido?', 'Sim/Não'],
    ['Status', 'Calculada (mesma regra atual: concluído, atrasada, em andamento)'],
    ['Data limite', 'Data'],
    ['Nível de prioridade', 'Escolha: Crítico, Alto, Moderado, Baixo'],
    ['Problema encontrado', 'Texto de várias linhas'],
    ['Onde o problema foi identificado?', 'Escolha (lista padronizada de locais)'],
    ['Solução necessária', 'Escolha (regras da Tabela 1)'],
    ['Detalhamento', 'Texto de várias linhas'],
    ['Ação / Responsável', 'Escolha: Manutenção, Limpeza, Facilities'],
    ['Imagem', 'Imagem - exibe miniatura leve, a foto grande abre por clique'],
], [0.46, 0.54])
story += table_block('Tabela 4 - Mapeamento das colunas para a Lista do SharePoint', t4,
                     'Usado apenas se a alternativa Power Apps for escolhida no lugar do app próprio.')

story += h2_block('6.5 Metas de sucesso')
for item in [
    'Registro e consulta abrindo em segundos, no computador e no celular, com qualquer quantidade de fotos.',
    'Foto acessível em no máximo dois toques, com visualização em tela cheia; zero erros de fórmula ou colunas quebradas.',
    'Pendência atrasada notada pelo sistema (destaque no quadro ou alerta), não pelo inspetor.',
    'Dados sob posse do próprio time, com exportação para planilha disponível a qualquer momento.',
    'Uma única fonte oficial após a data de corte; planilha congelada como histórico em somente leitura.',
]:
    story.append(Paragraph(item, bullet, bulletText='•'))

# ================= 7. RISCOS =================
story += h1_block('7. Riscos e cuidados na implantação')
story.append(Paragraph(
    'O plano é de baixo risco, mas os pontos abaixo merecem atenção explícita durante a execução. Os '
    'dois primeiros são exclusivos do caminho do app próprio e já têm mitigação definida:', body))

t5 = styled_table([
    ['Risco', 'Como mitigar'],
    ['Continuidade do app próprio (quem mantém a ferramenta)',
     'Escopo mínimo, código simples e documentado, suporte de desenvolvimento sob demanda; a exportação para planilha a um clique mantém a Opção A como plano B permanente'],
    ['Conta e hospedagem do app em nome de uma pessoa',
     'Criar conta dedicada ao processo e compartilhar as credenciais entre os gestores, como se faz com qualquer sistema do time'],
    ['Limite do plano gratuito de hospedagem/banco de dados',
     'Compressão das fotos (~15 MB/mês) mantém o uso dentro do gratuito por anos; monitorar o consumo no painel do serviço e exportar cópia mensal'],
    ['Perda de acesso às fotos antigas (estão no OneDrive pessoal do criador do Forms)',
     'Na Fase 2, copie ou mova as fotos para o armazenamento do app, com as contas de acesso revisadas; evite depender de conta de contratado'],
    ['Divergência durante a transição (registros em dois lugares)',
     'Definir data de corte: planilha e app rodando em paralelo por 1 semana no máximo; após o corte, app como única fonte'],
    ['Permissões de acesso (quem vê e quem edita)',
     'Inspetores e gestores com edição via PIN do time; demais interessados com leitura; revisar a lista de quem tem o PIN a cada mudança de equipe'],
    ['Governança e retenção das fotos',
     'Definir política simples: manter a foto enquanto a pendência estiver aberta e por 12 meses após a conclusão'],
    ['Planilha antiga virar "segunda fonte" desatualizada',
     'Congelar o arquivo leve da Fase 1 como histórico (somente leitura) e comunicar o time onde passa a estar a fonte oficial'],
], [0.44, 0.56])
story += table_block('Tabela 5 - Riscos e mitigações', t5)

story.append(Paragraph(
    'Com a Fase 1 executada esta semana, o sintoma que motivou esta análise desaparece imediatamente; '
    'com a Fase 2 concluída, o acompanhamento ganha uma ferramenta desenhada para os dois requisitos '
    'essenciais - ver as fotos e acompanhar o progresso - sem peso, sem licença e sem depender de '
    'aprovação. A Opção B permanece documentada como alternativa de plataforma, e os gatilhos de '
    'escala (offline real, integração com ordens de serviço, multiunidade) seguem registrados para '
    'quando o processo crescer.', body))

# ---------------- Build ----------------
doc = TocDocTemplate(
    OUT_BODY, pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN, topMargin=MARGIN, bottomMargin=MARGIN,
    title=DOC_TITLE, author='Z.ai', creator='Z.ai',
    subject='Análise comparativa: otimização da planilha de pendências vs aplicação web')
doc.multiBuild(story, onFirstPage=header_footer, onLaterPages=header_footer)
print('body ok:', OUT_BODY)

# ---------------- Merge capa + corpo ----------------
from pypdf import PdfReader, PdfWriter

A4_W, A4_H = 595.28, 841.89

def normalize(page):
    w, h = float(page.mediabox.width), float(page.mediabox.height)
    if abs(w - A4_W) > 0.1 or abs(h - A4_H) > 0.1:
        page.scale_to(A4_W, A4_H)
        page.mediabox.lower_left = (0, 0)
        page.mediabox.upper_right = (A4_W, A4_H)
    return page

writer = PdfWriter()
writer.add_page(normalize(PdfReader('/home/z/my-project/scripts/cover.pdf').pages[0]))
for p in PdfReader(OUT_BODY).pages:
    writer.add_page(normalize(p))
writer.add_metadata({'/Title': DOC_TITLE, '/Author': 'Z.ai', '/Creator': 'Z.ai',
                     '/Subject': 'Análise comparativa: otimização da planilha de pendências vs aplicação web'})
FINAL = '/home/z/my-project/download/Analise - Otimizar planilha ou criar app (Pendencias da fabrica).pdf'
os.makedirs(os.path.dirname(FINAL), exist_ok=True)
with open(FINAL, 'wb') as f:
    writer.write(f)
print('final ok:', FINAL)
