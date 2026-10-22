import sys
path = r'd:\c p web\web site code CP\python\frontend\src\pages\StrategistPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('border-white/5', 'border-border/50')
content = content.replace('border-white/10', 'border-border')
content = content.replace('bg-white/5', 'bg-surface/50')
content = content.replace('bg-white/[0.03]', 'bg-surface/30')
content = content.replace('hover:bg-white/5', 'hover:bg-surface/70')
content = content.replace('bg-white/20', 'bg-surface/20')

content = content.replace('text-white placeholder:text-white/20', 'text-text placeholder:text-text-muted/50')
content = content.replace('text-white appearance-none', 'text-text appearance-none')
content = content.replace('z-10 text-white', 'z-10 text-text')
content = content.replace('transition-all text-white"', 'transition-all text-text"')
content = content.replace('bg-background text-white', 'bg-background text-text')
content = content.replace('transition-all text-white disabled:opacity-50"', 'transition-all text-text disabled:opacity-50"')
content = content.replace('text-sm text-white placeholder:text-white/20"', 'text-sm text-text placeholder:text-text-muted/50"')
content = content.replace('hover:text-white', 'hover:text-text')
content = content.replace('transition-all text-white disabled:opacity-30', 'transition-all text-text disabled:opacity-30')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
