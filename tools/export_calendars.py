"""Exports Data/CropCalendars.cs to JSON (used by the single-file preview and as a structure check)."""
import json, re, sys
src = open(sys.argv[1], encoding='utf-8').read()
S = r'"((?:[^"\\]|\\.)*)"'
out = {}
for m in re.finditer(r'\["(\w+)"\] = new\("\w+", (true|false),(.*?)\n            \}\)', src, re.S):
    crop, transplant, body = m.group(1), m.group(2) == 'true', m.group(3)
    stages = [dict(f=int(a), t=int(b), hi=c, en=d) for a, b, c, d in re.findall(r'G\((-?\d+), (-?\d+), ' + S + ', ' + S + r'\)', body)]
    steps = []
    for p in re.finditer(r'PrepStep\((-?\d+), ' + S + r',\s*' + S + r',\s*' + S + r',\s*' + S + r'\)', body):
        steps.append(dict(id='prep', f=int(p.group(1)), t=-1, k='prep', title=[p.group(2), p.group(3)], det=[p.group(4), p.group(5)]))
    for p in re.finditer(r'new\("(\w+)", (-?\d+), (-?\d+), (?:TaskKind\.)?(\w+), T\(' + S + r', ' + S + r'\),\s*T\(' + S + r',\s*' + S + r'\)((?:,\s*\w+: [\w.]+)*)\)', body, re.S):
        opts = dict(re.findall(r'(\w+): ([\w.]+)', p.group(9)))
        steps.append(dict(id=p.group(1), f=int(p.group(2)), t=int(p.group(3)), k=p.group(4).lower(), title=[p.group(5), p.group(6)], det=[p.group(7), p.group(8)],
                          urea=float(opts.get('UreaShare', 0)), basal=opts.get('Basal') == 'true', irr=opts.get('IrrigatedOnly') == 'true', opt=opts.get('Optional') == 'true'))
    steps.sort(key=lambda s: s['f'])
    expected = len(re.findall(r'new\("\w+", -?\d+, -?\d+,', body)) + body.count('PrepStep(')
    assert len(steps) == expected, (crop, len(steps), expected)
    share = sum(s.get('urea', 0) for s in steps)
    assert abs(share - 1) < 1e-6, (crop, 'urea shares', share)
    out[crop] = dict(transplant=transplant, stages=stages, steps=steps)
assert len(out) == 8, out.keys()
zones = {}
if len(sys.argv) > 3:   # AgroZones.cs: regions, sowing windows, water, soils
    z = open(sys.argv[3], encoding='utf-8').read()
    consts = dict(re.findall(r'(\w+) = "(\w+)"', z.split('RegionNames')[0]))
    consts.update(dict(re.findall(r'(\w+) = "(\w+)"', z.split('public static readonly string[] Soils')[0].split('// ---------------- Soils')[1])))
    def body(name):
        i = z.index(name); j = z.index('\n    };', i); return z[i:j]
    zones['regionNames'] = {consts[k]: [h, e] for k, h, e in re.findall(r'\[(\w+)\] = T\(' + S + ', ' + S + r'\)', body('RegionNames'))}
    zones['regionTips'] = {consts[k]: [h, e] for k, h, e in re.findall(r'\[(\w+)\] = T\(' + S + r',\s*' + S + r'\)', body('RegionTips'))}
    zones['stateRegion'] = {st: consts[r] for st, r in re.findall(r'\["([^"]+)"\] = (\w+)', body('StateRegion'))}
    zones['bundelkhand'] = re.findall(r'"(\w+)"', body('BundelkhandDistricts').split('{', 1)[1])
    win = {}
    wb = body('public static readonly IReadOnlyDictionary<string, IReadOnlyDictionary<string, SowWindow[]>> Windows')
    for cm in re.finditer(r'\["(\w+)"\] = new Dictionary<string, SowWindow\[\]>(.*?)\n            \}', wb, re.S):
        win[cm.group(1)] = {consts[r]: [dict(fm=int(a), fd=int(b), tm=int(c), td=int(d), season=e, irr=bool(f)) for a, b, c, d, e, f in
                            re.findall(r'W\((\d+), (\d+), (\d+), (\d+), "(\w+)"(, true)?\)', ws)]
                            for r, ws in re.findall(r'\[(\w+)\] = new\[\] \{(.*?)\}', cm.group(2))}
    zones['windows'] = win
    zones['water'] = dict(re.findall(r'\["(\w+)"\] = "(\w+)"', body('IReadOnlyDictionary<string, string> Water')))
    soils = {}
    for sm in re.finditer(r'\[(\w+)\] = new\(T\(' + S + ', ' + S + r'\),\s*T\(' + S + r',\s*' + S + r'\),\s*T\(' + S + r',\s*' + S + r'\),\s*(null|T\(' + S + r',\s*' + S + r'\)),\s*(true|false)\)', z):
        g = sm.groups()
        soils[consts[g[0]]] = dict(name=[g[1], g[2]], tip=[g[3], g[4]], irr=[g[5], g[6]], fert=None if g[7] == 'null' else [g[8], g[9]], skip=g[10] == 'true')
    assert len(soils) == 5, soils.keys()
    zones['soils'] = soils
    fit = {}
    for cm in re.finditer(r'\["(\w+)"\] = Fit\(good: new\[\] \{([^}]*)\}, ok: (?:new\[\] \{([^}]*)\}|Array.Empty<string>\(\)), poor: (?:new\[\] \{([^}]*)\}|Array.Empty<string>\(\))\)', z):
        f = {}
        for lvl, grp in (('good', cm.group(2)), ('ok', cm.group(3)), ('poor', cm.group(4))):
            for x in re.findall(r'\w+', grp or ''): f[consts[x]] = lvl
        fit[cm.group(1)] = f
    assert len(fit) == 8 and len(win) == 8, (len(fit), len(win))
    zones['fit'] = fit
out['_zones'] = zones
json.dump(out, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False)
for c, v in out.items():
    if c != '_zones': print(c, len(v['steps']), 'steps', len(v['stages']), 'stages')
if zones: print('zones', len(zones['stateRegion']), 'states', len(zones['soils']), 'soils')
