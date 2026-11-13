#!/usr/bin/env python3
"""
Builds KisanGuru's location data: State → District → Tehsil/Taluka/Mandal → Village (all of India).

Sources
  - Local Government Directory (LGD), Ministry of Panchayati Raj, Govt. of India — https://lgdirectory.gov.in
    Government Open Data License – India (GODL). Files as mirrored in
    https://github.com/planemad/india-local-government-directory :
      administrative/2-district.csv, administrative/3-subdistrict.csv, administrative/4-village.csv(.zip)
  - District centres: DataMeet "Maps of India", Census 2011 district boundaries (CC BY 2.5 India)
      https://github.com/datameet/maps  Districts/Census_2011/2011_Dist.shp + .dbf
  - Hindi state names: kept from the previous places.json (originally VaidikPandit's districts.json)

Districts created after 2011 (no Census-2011 code) take the centre of the district they were carved from,
found from their tehsils' Census-2011 codes (codes run in order within a district).

Usage
  python3 tools/build_places.py <lgd_dir> <datameet_maps_dir>
  (lgd_dir holds 2-district.csv, 3-subdistrict.csv and 4-village.csv)

Outputs
  frontend/kisanguru-web/src/app/core/data/places.json            states + districts: [name, lat, lng, lgdCode, approx?]
  backend/KisanGuru.Api/App_Data/places/subdistricts.json         { districtCode: [[code, name], ...] }
  backend/KisanGuru.Api/App_Data/places/villages/{stateCode}.json { subdistrictCode: [[code, name, local?], ...] }
"""
import csv, json, os, re, struct, sys
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONT = os.path.join(ROOT, 'frontend/kisanguru-web/src/app/core/data')
BACK = os.path.join(ROOT, 'backend/KisanGuru.Api/App_Data/places')

SMALL = {'and', 'of', 'the', 'ki', 'ka', 'ke'}


def nice(name: str) -> str:
    """'NORTH AND MIDDLE ANDAMAN' -> 'North and Middle Andaman'; mixed-case names are kept."""
    name = re.sub(r'\s+', ' ', name).strip()
    if name != name.upper():
        return name
    words = name.lower().split(' ')
    return ' '.join(w if (i and w in SMALL) else (w[:1].upper() + w[1:]) for i, w in enumerate(words))


def norm(s: str) -> str:
    s = s.lower().replace('&', ' and ')
    s = re.sub(r'^the\s+', '', s)
    return re.sub(r'[^a-z]', '', s)


def read_dbf(path):
    with open(path, 'rb') as f:
        h = f.read(32)
        n, hl, rl = struct.unpack('<I', h[4:8])[0], struct.unpack('<H', h[8:10])[0], struct.unpack('<H', h[10:12])[0]
        fields = []
        while True:
            b = f.read(32)
            if b[0] == 0x0D:
                break
            fields.append((b[:11].split(b'\0')[0].decode(), b[16]))
        f.seek(hl)
        rows = []
        for _ in range(n):
            r = f.read(rl)
            pos, d = 1, {}
            for name, ln in fields:
                d[name] = r[pos:pos + ln].decode('latin1').strip()
                pos += ln
            rows.append(d)
    return rows


def read_shp_centroids(path):
    """Area-weighted centroid of the largest ring of each polygon record."""
    out = []
    with open(path, 'rb') as f:
        f.seek(100)
        while True:
            head = f.read(8)
            if len(head) < 8:
                break
            length = struct.unpack('>i', head[4:8])[0] * 2
            rec = f.read(length)
            stype = struct.unpack('<i', rec[:4])[0]
            if stype != 5:
                out.append(None)
                continue
            nparts, npoints = struct.unpack('<2i', rec[36:44])
            parts = list(struct.unpack(f'<{nparts}i', rec[44:44 + 4 * nparts]))
            base = 44 + 4 * nparts
            pts = [struct.unpack('<2d', rec[base + 16 * i: base + 16 * i + 16]) for i in range(npoints)]
            best = None
            for k, start in enumerate(parts):
                end = parts[k + 1] if k + 1 < nparts else npoints
                ring = pts[start:end]
                a = cx = cy = 0.0
                for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
                    c = x1 * y2 - x2 * y1
                    a += c
                    cx += (x1 + x2) * c
                    cy += (y1 + y2) * c
                if a and (best is None or abs(a) > abs(best[0])):
                    best = (a, cx / (3 * a), cy / (3 * a))
            out.append((round(best[2], 3), round(best[1], 3)) if best else None)
    return out


def main(lgd_dir, maps_dir):
    # --- 2011 district centres by census code
    rows = read_dbf(os.path.join(maps_dir, 'Districts/Census_2011/2011_Dist.dbf'))
    cents = read_shp_centroids(os.path.join(maps_dir, 'Districts/Census_2011/2011_Dist.shp'))
    centre_by_census = {int(r['censuscode']): c for r, c in zip(rows, cents) if c and int(r['censuscode'] or 0) > 0}

    # --- Hindi state names
    # (Hindi names: from the previous places.json, or VaidikPandit's districts.json on the first run)
    src = 'places.json' if os.path.exists(os.path.join(FRONT, 'places.json')) else 'districts.json'
    old = json.load(open(os.path.join(FRONT, src), encoding='utf-8'))['states']
    hindi = {norm(s['n']): (s['n'], s['h']) for s in old}

    # --- LGD districts and tehsils
    districts = list(csv.DictReader(open(os.path.join(lgd_dir, '2-district.csv'), encoding='utf-8-sig')))
    subs = list(csv.DictReader(open(os.path.join(lgd_dir, '3-subdistrict.csv'), encoding='utf-8-sig')))

    dist_census = {int(d['District Code']): int(d['Census 2011 Code'] or 0) for d in districts}
    # Census-2011 tehsil code -> Census-2011 district code (from districts that still have their 2011 code)
    sub_to_old = {}
    subs_by_district = defaultdict(list)
    for s in subs:
        dc, sc = int(s['District Code']), int(s['Sub-district Code'])
        c11 = int(s['Census 2011 code'] or 0)
        subs_by_district[dc].append((sc, nice(s['Sub-district Name']), c11))
        if c11 and dist_census.get(dc) in centre_by_census:
            sub_to_old[c11] = dist_census[dc]
    known_codes = sorted(sub_to_old)

    def parent_centre(dc):
        votes = Counter()
        for _, _, c11 in subs_by_district.get(dc, []):
            if not c11 or not known_codes:
                continue
            nearest = min(known_codes, key=lambda k: abs(k - c11))
            votes[sub_to_old[nearest]] += 1
        return centre_by_census.get(votes.most_common(1)[0][0]) if votes else None

    states = {}
    missing_centre = []
    for d in districts:
        stc = int(d['State Code'])
        st = states.setdefault(stc, {'c': stc, 'lgd': d['State Name'], 'd': []})
        dc = int(d['District Code'])
        centre = (centre_by_census.get(dist_census[dc]) if dist_census[dc] else None) or parent_centre(dc)
        exact = bool(dist_census[dc] and dist_census[dc] in centre_by_census)
        entry = [nice(d['District Name']), centre[0] if centre else None, centre[1] if centre else None, dc]
        st['d'].append(entry + ([] if exact else [1]))   # 1 = approximate centre (new district): the API refines it by name
        if not centre:
            missing_centre.append(d['District Name'])

    out_states = []
    for stc, st in states.items():
        en, hi = hindi.get(norm(st['lgd']), (nice(st['lgd']), nice(st['lgd'])))
        known = [x for x in st['d'] if x[1] is not None]
        lat = round(sum(x[1] for x in known) / len(known), 3) if known else None
        lng = round(sum(x[2] for x in known) / len(known), 3) if known else None
        for x in st['d']:
            if x[1] is None:
                x[1], x[2] = lat, lng   # last resort: middle of the state
        st['d'].sort(key=lambda x: x[0])
        out_states.append({'c': stc, 'n': en, 'h': hi, 'd': st['d']})
    out_states.sort(key=lambda s: s['n'])

    # --- Villages, grouped by state then tehsil
    vfile = os.path.join(lgd_dir, '4-village.csv')
    villages = defaultdict(lambda: defaultdict(list))
    sub_names = {sc: (dc, name) for dc, lst in subs_by_district.items() for sc, name, _ in lst}
    total = 0
    for r in csv.DictReader(open(vfile, encoding='utf-8-sig')):
        stc, dc, sc = int(r['State Code']), int(r['District Code']), int(r['Subdistrict Code'])
        name = nice(r['Village Name (In Englsih)'])
        local = re.sub(r'\s+', ' ', r['Village Name (In Local)'] or '').strip()
        entry = [int(r['Village Code']), name] + ([local] if local and local.lower() != name.lower() else [])
        villages[stc][sc].append(entry)
        if sc not in sub_names:  # tehsil present in the village file only
            sub_names[sc] = (dc, nice(r['Subdistrict Name (In English)']))
            subs_by_district[dc].append((sc, sub_names[sc][1], 0))
        total += 1

    sub_out = {str(dc): sorted([[sc, name] for sc, name, _ in lst], key=lambda x: x[1]) for dc, lst in subs_by_district.items()}

    os.makedirs(os.path.join(BACK, 'villages'), exist_ok=True)
    with open(os.path.join(FRONT, 'places.json'), 'w', encoding='utf-8') as f:
        json.dump({'source': 'LGD (lgdirectory.gov.in, GODL-India) + DataMeet 2011 district centres (CC BY 2.5 India)',
                   'states': out_states}, f, ensure_ascii=False, separators=(',', ':'))
    with open(os.path.join(BACK, 'subdistricts.json'), 'w', encoding='utf-8') as f:
        json.dump(sub_out, f, ensure_ascii=False, separators=(',', ':'))
    for stc, by_sub in villages.items():
        data = {str(sc): sorted(v, key=lambda x: x[1]) for sc, v in by_sub.items()}
        with open(os.path.join(BACK, 'villages', f'{stc}.json'), 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, separators=(',', ':'))

    print(f'states {len(out_states)}, districts {sum(len(s["d"]) for s in out_states)}, '
          f'tehsils {sum(len(v) for v in sub_out.values())}, villages {total}')
    print('districts placed at state centre (no centre found):', missing_centre)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
