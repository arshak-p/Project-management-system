import os
import re
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

# Color Palette
PRIMARY_COLOR = colors.HexColor('#4f46e5')   # Indigo
SECONDARY_COLOR = colors.HexColor('#7c3aed') # Violet
TEXT_DARK = colors.HexColor('#1f2937')       # Slate 800
TEXT_MUTED = colors.HexColor('#4b5563')      # Slate 600
BORDER_COLOR = colors.HexColor('#e5e7eb')    # Gray 200
BG_LIGHT = colors.HexColor('#f9fafb')        # Gray 50

# Styles Setup
styles = getSampleStyleSheet()

h1_style = ParagraphStyle(
    'H1Style',
    parent=styles['Heading1'],
    fontName='Helvetica-Bold',
    fontSize=18,
    leading=22,
    textColor=PRIMARY_COLOR,
    spaceBefore=22,
    spaceAfter=12,
    keepWithNext=True
)

h2_style = ParagraphStyle(
    'H2Style',
    parent=styles['Heading2'],
    fontName='Helvetica-Bold',
    fontSize=13,
    leading=17,
    textColor=SECONDARY_COLOR,
    spaceBefore=16,
    spaceAfter=8,
    keepWithNext=True
)

h3_style = ParagraphStyle(
    'H3Style',
    parent=styles['Heading3'],
    fontName='Helvetica-Bold',
    fontSize=11,
    leading=14,
    textColor=TEXT_DARK,
    spaceBefore=12,
    spaceAfter=6,
    keepWithNext=True
)

body_style = ParagraphStyle(
    'BodyStyle',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=9.5,
    leading=14,
    textColor=TEXT_DARK,
    spaceAfter=8,
)

bullet_style = ParagraphStyle(
    'BulletStyle',
    parent=body_style,
    leftIndent=15,
    bulletIndent=5,
    spaceAfter=5,
)

blockquote_style = ParagraphStyle(
    'BlockquoteStyle',
    parent=body_style,
    fontName='Helvetica-Oblique',
    textColor=TEXT_MUTED,
    leftIndent=20,
    rightIndent=20,
    backColor=BG_LIGHT,
    borderColor=BORDER_COLOR,
    borderWidth=1,
    borderPadding=10,
    spaceBefore=10,
    spaceAfter=10,
)

table_body_style = ParagraphStyle(
    'TableBodyStyle',
    parent=body_style,
    fontSize=8.5,
    leading=11,
    spaceAfter=0,
)

table_header_style = ParagraphStyle(
    'TableHeaderStyle',
    parent=table_body_style,
    fontName='Helvetica-Bold',
    textColor=colors.white,
)

def clean_markdown_formatting(line):
    # Bold **text** -> <b>text</b>
    line = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', line)
    # Italic *text* -> <i>text</i>
    line = re.sub(r'\*(.*?)\*', r'<i>\1</i>', line)
    # Code `text` -> mono styled font
    line = re.sub(r'`(.*?)`', r'<font face="Courier" size="8.5" color="#475569"><b>\1</b></font>', line)
    # File scheme links [text](file:///...) -> just text
    line = re.sub(r'\[(.*?)\]\(file:///.*?\)', r'\1', line)
    
    # Internal anchor links [text](#...) -> just text
    line = re.sub(r'\[(.*?)\]\(#.*?\)', r'\1', line)
    
    # Web links [text](url) -> formatted link (only if starts with http/https)
    def web_link_repl(match):
        text, url = match.groups()
        if url.startswith('http'):
            return f'<a href="{url}"><font color="#4f46e5"><u>{text}</u></font></a>'
        return text
    line = re.sub(r'\[(.*?)\]\((.*?)\)', web_link_repl, line)
    
    # Clean emoji representations or icons if any
    return line

def parse_markdown(md_file_path):
    print(f"Parsing: {md_file_path}")
    flowables = []
    
    if not os.path.exists(md_file_path):
        print(f"File not found: {md_file_path}")
        return flowables
        
    with open(md_file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    in_table = False
    table_data = []
    
    i = 0
    while i < len(lines):
        line = lines[i].rstrip('\n')
        
        # Check for table row starting with |
        if line.strip().startswith('|'):
            if '---' in line:
                i += 1
                continue
            
            row_cells = [cell.strip() for cell in line.split('|')[1:-1]]
            table_data.append(row_cells)
            i += 1
            in_table = True
            continue
            
        elif in_table:
            # We exited the table block, render it
            if table_data:
                headers = table_data[0]
                rows = table_data[1:]
                
                formatted_data = []
                # Header row
                formatted_data.append([Paragraph(clean_markdown_formatting(cell), table_header_style) for cell in headers])
                # Data rows
                for r in rows:
                    formatted_data.append([Paragraph(clean_markdown_formatting(cell), table_body_style) for cell in r])
                
                # Column widths allocation
                col_widths = None
                if len(headers) == 2:
                    col_widths = [1.8*inch, 5.2*inch]
                elif len(headers) == 3:
                    col_widths = [1.5*inch, 1.8*inch, 3.7*inch]
                elif len(headers) == 4:
                    col_widths = [1.5*inch, 1.5*inch, 2.0*inch, 2.0*inch]
                elif len(headers) == 5:
                    col_widths = [1.0*inch, 1.2*inch, 1.2*inch, 1.3*inch, 2.3*inch]
                
                t = Table(formatted_data, colWidths=col_widths, hAlign='LEFT')
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,0), PRIMARY_COLOR),
                    ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                    ('VALIGN', (0,0), (-1,-1), 'TOP'),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                    ('TOPPADDING', (0,0), (-1,-1), 6),
                    ('LEFTPADDING', (0,0), (-1,-1), 6),
                    ('RIGHTPADDING', (0,0), (-1,-1), 6),
                    ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
                    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT])
                ]))
                flowables.append(t)
                flowables.append(Spacer(1, 10))
            
            table_data = []
            in_table = False
            
        # Clean inline formatting on regular lines
        line = clean_markdown_formatting(line)
        
        # Determine element type
        if line.startswith('# '):
            flowables.append(Paragraph(line[2:], h1_style))
        elif line.startswith('## '):
            flowables.append(Paragraph(line[3:], h2_style))
        elif line.startswith('### '):
            flowables.append(Paragraph(line[4:], h3_style))
        elif line.startswith('#### '):
            flowables.append(Paragraph(line[5:], h3_style))
        elif line.startswith('> '):
            quote_text = line[2:]
            while i + 1 < len(lines) and lines[i+1].startswith('> '):
                i += 1
                quote_text += " " + clean_markdown_formatting(lines[i].rstrip('\n')[2:])
            flowables.append(Paragraph(quote_text, blockquote_style))
        elif line.strip().startswith('- ') or line.strip().startswith('* '):
            bullet_text = line.strip()[2:]
            flowables.append(Paragraph(f"&bull; {bullet_text}", bullet_style))
        elif re.match(r'^\d+\.\s', line.strip()):
            match = re.match(r'^(\d+\.)\s(.*)', line.strip())
            num = match.group(1)
            text = match.group(2)
            flowables.append(Paragraph(f"{num} {text}", bullet_style))
        elif line.strip() == '---':
            flowables.append(Spacer(1, 15))
        elif line.strip() == '':
            flowables.append(Spacer(1, 4))
        else:
            flowables.append(Paragraph(line, body_style))
            
        i += 1
        
    return flowables

def draw_cover(canvas, doc):
    canvas.saveState()
    # Dark Slate background
    canvas.setFillColor(colors.HexColor('#0f172a'))
    canvas.rect(0, 0, 8.5*inch, 11*inch, fill=1, stroke=0)
    
    # Glowing color accent bars
    canvas.setFillColor(PRIMARY_COLOR)
    canvas.rect(0, 7.5*inch, 8.5*inch, 0.4*inch, fill=1, stroke=0)
    canvas.setFillColor(SECONDARY_COLOR)
    canvas.rect(0, 7.1*inch, 8.5*inch, 0.4*inch, fill=1, stroke=0)
    
    # Large Title
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 34)
    canvas.drawString(1.0*inch, 5.0*inch, "COLOUR PARROT")
    
    canvas.setFont("Helvetica", 22)
    canvas.setFillColor(colors.HexColor('#94a3b8'))
    canvas.drawString(1.0*inch, 4.3*inch, "Task Management System")
    
    canvas.setFont("Helvetica-Bold", 12)
    canvas.setFillColor(SECONDARY_COLOR)
    canvas.drawString(1.0*inch, 3.7*inch, "COMPLETE SYSTEM MANUALS & GUIDES")
    
    # Footer info
    canvas.setFont("Helvetica", 10)
    canvas.setFillColor(colors.HexColor('#64748b'))
    canvas.drawString(1.0*inch, 1.6*inch, "Prepared for internal agency training, presentation, and onboarding")
    canvas.drawString(1.0*inch, 1.35*inch, "Version 2.0  |  Published June 2026")
    
    canvas.restoreState()

def draw_normal_page(canvas, doc):
    canvas.saveState()
    # Header
    canvas.setFont("Helvetica-Bold", 8)
    canvas.setFillColor(colors.HexColor('#64748b'))
    canvas.drawString(0.75*inch, 10.3*inch, "COLOUR PARROT — SYSTEM MANUALS & GUIDES")
    canvas.setStrokeColor(BORDER_COLOR)
    canvas.setLineWidth(0.5)
    canvas.line(0.75*inch, 10.2*inch, 7.75*inch, 10.2*inch)
    
    # Footer Page Number
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor('#64748b'))
    canvas.drawCentredString(4.25*inch, 0.5*inch, f"Page {doc.page}")
    canvas.restoreState()

def main():
    pdf_filename = "Colour_Parrot_System_Guides.pdf"
    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=letter,
        leftMargin=0.75*inch,
        rightMargin=0.75*inch,
        topMargin=1.0*inch,
        bottomMargin=1.0*inch
    )
    
    story = []
    
    # Add Cover Page trigger (cover will be drawn by onFirstPage callback)
    story.append(Spacer(1, 2*inch)) # Spacer to align content flows correctly
    story.append(PageBreak())
    
    # Document Header - Section 1: Complete User Manual
    story.append(Paragraph("Part 1: Complete User Manual", h1_style))
    story.append(Spacer(1, 10))
    story.extend(parse_markdown("Colour_Parrot_Complete_User_Manual.md"))
    story.append(PageBreak())
    
    # Document Header - Section 2: Role-Based Guide
    story.append(Paragraph("Part 2: Role-Based User Guide", h1_style))
    story.append(Spacer(1, 10))
    story.extend(parse_markdown("Colour_Parrot_User_Guide.md"))
    story.append(PageBreak())
    
    # Document Header - Section 3: Simple How-To Guide
    story.append(Paragraph("Part 3: Simple How-To Tutorial Guide", h1_style))
    story.append(Spacer(1, 10))
    story.extend(parse_markdown("Colour_Parrot_How_To_Use.md"))
    
    print("Building PDF...")
    doc.build(story, onFirstPage=draw_cover, onLaterPages=draw_normal_page)
    print(f"PDF successfully built: {pdf_filename}")

if __name__ == "__main__":
    main()
