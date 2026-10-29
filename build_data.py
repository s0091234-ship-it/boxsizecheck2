# sizelist.xls -> data.js 변환 스크립트 (엑셀 수정 후 다시 실행: python build_data.py)
import json, re
import pandas as pd

df = pd.read_excel('sizelist.xls', dtype=str).fillna('')
items = []
for _, r in df.iterrows():
    name = r.iloc[1]
    m = re.search(r'\(\s*(\d+)\s*[xX×*]\s*(\d+)\s*[xX×*]\s*(\d+)\s*\)', name)
    if not m:
        continue
    w, d, h = map(int, m.groups())
    code = name[:m.start()].strip()
    items.append({
        'cat': r.iloc[0].strip(), 'code': code, 'w': w, 'd': d, 'h': h,
        'type': r.iloc[2].strip(), 'flute': r.iloc[3].strip(),
        'unit': r.iloc[4].strip(), 'proc': r.iloc[5].strip(),
    })

with open('data.js', 'w', encoding='utf-8') as f:
    f.write('// 자동 생성 파일 - build_data.py 로 재생성하세요\nconst BOXES = ')
    json.dump(items, f, ensure_ascii=False)
    f.write(';\n')
print(len(items), 'items')
