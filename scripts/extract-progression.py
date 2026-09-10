"""Extract spell preparation limits and feat descriptions from the bundled SRD."""
import json, re, pathlib, subprocess
root = pathlib.Path(__file__).resolve().parents[1]
raw = subprocess.check_output(['pdftotext','-raw',str(root/'frontend/public/rules/SRD_CC_v5.2.1.pdf'),'-']).decode()
progression = {}
for name in ['Bard','Cleric','Druid','Paladin','Ranger','Sorcerer','Warlock','Wizard']:
    table = re.search(name+r' Features\n(?:Proficiency|Level)[\s\S]*?\f',raw)[0]
    rows=list(re.finditer(r'^(\d+) \+[2-6] ([\s\S]*?)(?=^\d+ \+[2-6]|\f)',table,re.M))
    result=[]
    for row in rows:
        tail=re.search(r'((?:\d+|—)(?:\s+(?:\d+|—))*)\s*$',row[2])[1]
        nums=[0 if n=='—' else int(n) for n in tail.split()]
        if name in ['Paladin','Ranger']: cantrips,prepared=0,nums[-6]
        elif name=='Warlock': cantrips,prepared=nums[-4:-2]
        else: cantrips,prepared=nums[-11:-9]
        result.append({'level':int(row[1]),'cantrips':cantrips,'prepared':prepared})
    assert len(result)==20,(name,len(result))
    progression[name.lower()]=result
pages=raw.split('\f')
text='\n'.join(pages[86:88])
feats=[]
found=list(re.finditer(r'^([^\n]+)\n(Origin|General|Fighting Style|Epic Boon) Feat\b(?:[^\n]*\n)',text,re.M))
for i,m in enumerate(found):
    name=m[1];description=text[m.end():found[i+1].start() if i+1<len(found) else len(text)]
    feats.append({'id':re.sub('[^a-z0-9]+','-',name.lower()),'name':name,'category':m[2],'text':description.strip(),'page':87 if m.start()<len(pages[86]) else 88})
assert len(feats)==17,len(feats)
(root/'backend/src/modules/rules/domain/progression.json').write_text(json.dumps({'progression':progression,'feats':feats},indent=2,ensure_ascii=False)+'\n')
print('Extracted 160 spell-progression rows and 17 feats')
