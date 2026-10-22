import os

def fix_colors():
    src_dir = r'd:\c p web\web site code CP\python\frontend\src'
    
    # Safe replacements for background and border colors
    replacements = {
        'bg-white/5': 'bg-surface/50',
        'bg-white/10': 'bg-surface',
        'bg-white/20': 'bg-surface',
        'border-white/5': 'border-border/50',
        'border-white/10': 'border-border',
        'border-white/20': 'border-border',
        'bg-white/[0.02]': 'bg-surface/20',
        'bg-white/[0.03]': 'bg-surface/30',
        'text-white/40': 'text-text-muted/50',
        'text-white/20': 'text-text-muted/30',
        'hover:text-white': 'hover:text-text',
        'hover:bg-white/5': 'hover:bg-surface/60',
        'hover:bg-white/10': 'hover:bg-surface',
        'placeholder:text-white/20': 'placeholder:text-text-muted/50',
        'placeholder:text-white/40': 'placeholder:text-text-muted',
    }

    # Keywords indicating a colored background where text-white IS appropriate
    safe_bg_keywords = [
        'bg-primary', 'bg-emerald', 'bg-blue', 'bg-indigo', 'bg-red', 
        'bg-amber', 'bg-gradient', 'from-', 'bg-[#', 'cardColors.bg'
    ]

    files_modified = 0

    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith('.tsx'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original_content = content
                
                # Apply simple string replacements
                for old, new in replacements.items():
                    content = content.replace(old, new)
                
                # Carefully replace text-white line by line
                lines = content.split('\n')
                for i in range(len(lines)):
                    line = lines[i]
                    if 'text-white' in line:
                        # Don't replace if line has a safe background
                        if not any(bg in line for bg in safe_bg_keywords):
                            # Ensure we don't accidentally replace a partial word
                            lines[i] = line.replace('text-white', 'text-text')
                
                content = '\n'.join(lines)
                
                if content != original_content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    files_modified += 1
                    print(f"Fixed colors in {file}")

    print(f"Total files modified: {files_modified}")

if __name__ == '__main__':
    fix_colors()
