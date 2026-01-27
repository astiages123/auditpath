#!/usr/bin/env python3
import re
import sys
import os

def fix_markdown_hierarchy(file_path):
    """
    Pandoc dönüşümünde bozulan liste hiyerarşisini düzeltir.
    Liste maddelerinden sonra gelen tablo, formül veya paragrafları
    bir sonraki listeye veya başlığa kadar girintiler.
    """
    if not os.path.exists(file_path):
        print(f"Hata: Dosya bulunamadı: {file_path}")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    fixed_lines = []
    in_list_block = False
    
    # Liste belirteçleri: satır başındaki -, *, + veya 1. gibi sayılar
    # Opsiyonel boşlukları da kapsar (alt listeler için)
    list_marker_regex = re.compile(r'^\s*([-*+]|\d+\.)\s+')
    # Başlık belirteci: # ile başlayan satırlar
    heading_regex = re.compile(r'^#+\s+')

    for line in lines:
        stripped = line.strip()
        
        # Eğer satır bir başlıksa, liste bloğunu sonlandır
        if heading_regex.match(line):
            fixed_lines.append(line)
            in_list_block = False
            continue
            
        # Eğer satır bir liste maddesiyse, liste bloğunu başlat/devam ettir
        # Ancak liste maddesinin kendisini ekstra girintileme (kendi girintisini koru)
        if list_marker_regex.match(line):
            fixed_lines.append(line)
            in_list_block = True
            continue
            
        # Eğer bir liste bloğu içindeysek ve satır liste maddesi veya başlık değilse
        if in_list_block:
            if stripped == "":
                # Boş satırları olduğu gibi bırak (opsiyonel: 4 boşluk eklenebilir)
                fixed_lines.append(line)
            else:
                # İçeriği 4 boşluk içeriden başlat
                fixed_lines.append("    " + line)
        else:
            fixed_lines.append(line)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(fixed_lines)
    
    print(f"Tamamlandı: {file_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Kullanım: python3 md_hierarchy_fixer.py <dosya_yolu>")
        sys.exit(1)
        
    for path in sys.argv[1:]:
        fix_markdown_hierarchy(path)
