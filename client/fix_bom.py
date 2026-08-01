from pathlib import Path

paths = [Path('src/pages/CreateParty.jsx'), Path('src/pages/JoinParty.jsx')]

for p in paths:
    text = p.read_text(encoding='utf-8-sig')
    p.write_text(text, encoding='utf-8')
    print('fixed', p)
