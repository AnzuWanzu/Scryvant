"""Rebuild searchable SRD text from the unmodified, attributed official PDF (Poppler required)."""
import json, re, subprocess, pathlib
root=pathlib.Path(__file__).resolve().parents[1]
raw=subprocess.check_output(['pdftotext','-raw',str(root/'frontend/public/rules/SRD_CC_v5.2.1.pdf'),'-']).decode()
pages=[]
for page_number, p in enumerate(raw.split('\f'), 1):
    m=re.search(r'System Reference Document 5.2.1',p)
    if m: pages.append({'page':page_number,'text':re.sub(r'System Reference Document 5.2.1 \d+\n','',p).strip()})
spells=[]
text='\n'.join(p['text'] for p in pages if 107<=p['page']<=175)
pattern=re.compile(r'^([^\n]+)\n((?:Level [0-9] [^\n]+|[^\n]+ Cantrip [^\n]+)(?:\n[^\n]+)*?)\nCasting Time:',re.M)
# Restrict metadata to one optional continuation line, avoiding matches across spells.
pattern=re.compile(r'^([^\n]+)\n((?:Level [0-9] [^\n]+|\w+ Cantrip [^\n]+)(?:\n[^\n]{1,90})?)\nCasting Time:',re.M)
matches=list(pattern.finditer(text))
for i,m in enumerate(matches):
    name=m[1].strip(); meta=m[2].replace('\n',' ')
    if not re.match(r'^[A-Z][\w’\u0027 /-]+$',name): continue
    body=text[m.end()-len('Casting Time:'):matches[i+1].start() if i+1<len(matches) else len(text)].strip()
    level=int(re.search(r'Level (\d)',meta)[1]) if meta.startswith('Level') else 0
    classes=re.search(r'\((.*?)\)',meta)
    page=next((p['page'] for p in pages if 107<=p['page']<=175 and name+'\n' in p['text']),107)
    spells.append({'id':re.sub(r'[^a-z0-9]+','-',name.lower()).strip('-'),'name':name,'level':level,'classes':[v.strip().lower() for v in classes[1].split(',')] if classes else [],'text':body,'page':page,'concentration':'Duration: Concentration' in body,'ritual':'or Ritual' in body})
assert len(spells)>300, len(spells)
(root/'backend/src/modules/rules/domain/srd.json').write_text(json.dumps({'pages':[p for p in pages if 5<=p['page']<=201], 'spells':spells},ensure_ascii=False,indent=2))
print(f'Built {len(spells)} spells and {len(pages)} page references')
