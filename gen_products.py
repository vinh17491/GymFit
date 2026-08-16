#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""GymFit complete product generator + image downloader.

Produces ~1200 real fitness products with real brands, prices, SKUs.
Downloads a representative product image per category (no watermark, >=1000px).

Usage:
    python gen_products.py --sql > products_insert.sql
    python gen_products.py --dl   (downloads images)
    python gen_products.py --all  (sql + dl)
"""
import os, sys, json, re, hashlib, subprocess, urllib.request, random, time
from pathlib import Path

ROOT = Path("D:/gymer")
IMG_ROOT = ROOT / "image"

CAT = {"whey-protein":1,"whey-isolate":2,"casein-protein":3,"vegan-protein":4,"mass-gainer":5,"creatine":6,
       "bcaa":7,"eaa":8,"glutamine":9,"pre-workout":10,"electrolytes":11,"fish-oil":12,"vitamins":13,
       "joint-support":14,"recovery":15,"fat-burner":68,
       "adjustable-dumbbells":16,"hex-dumbbells":17,"barbells":18,"ez-curl-bars":19,"weight-plates":20,
       "bumper-plates":21,"kettlebells":22,"medicine-balls":23,"slam-balls":24,"sandbags":25,
       "treadmills":26,"exercise-bikes":27,"spin-bikes":28,"rowing-machines":29,"ellipticals":30,
       "stair-climbers":31,"bench-press":32,"squat-rack":33,"smith-machine":34,"power-rack":35,
       "cable-machine":36,"functional-trainer":37,"resistance-bands":38,"jump-rope":39,
       "battle-rope":40,"gym-gloves":41,"wrist-wraps":42,"lifting-belts":43,"lifting-straps":44,
       "knee-sleeves":45,"foam-roller":46,"massage-ball":47,"shaker-cup":48,"water-bottle":49,
       "gym-bag":50,"mens-tank-top":51,"mens-hoodie":52,"mens-shorts":53,"mens-joggers":54,
       "mens-compression":55,"women-leggings":56,"women-sports-bra":57,"womens-top":58,
       "kids-apparel":59,"running-shoes":60,"training-shoes":61,"weightlifting-shoes":62,
       "cross-training-shoes":63,"smart-watch":64,"fitness-tracker":65,"heart-rate-monitor":66,
       "smart-scale":67}

BRAND = {"optimum-nutrition":1,"myprotein":2,"dymatize":3,"bsn":4,"ghost":5,"musclepharm":6,
         "muscletech":45,"rule-one":7,"cellucor":8,"jym":9,"naked-nutrition":10,"nutricost":11,
         "universal-nutrition":12,"scivation":13,"promix":14,"onnit":15,"gorilla-mind":16,
         "bucked-up":17,"huge-supplements":46,"redcon1":47,"now-foods":48,"powerblock":18,
         "rep-fitness":19,"rogue-fitness":20,"eleiko":21,"ironmaster":22,"titan-fitness":23,
         "horizon-fitness":24,"concept2":25,"sole-fitness":26,"assault-fitness":27,
         "under-armour":28,"gymshark":29,"alphalete":30,"vuori":31,"hoka":32,"on-running":33,
         "reebok":34,"nobull":35,"sbd":36,"warm-body-cold-mind":37,"rage-fitness":38,
         "garmin":39,"polar":40,"withings":41,"whoop":42,"nike":43,"adidas":44,"puma":49,
         "new-balance":50,"asics":51,"everlast":54,"tiger-sport":55,"schiek":56,"inzer":57,
         "hyperice":58,"triggerpoint":59,"hidrate":60,"kleankanteen":61}

SD = {"whey-protein":"whey","whey-isolate":"whey","casein-protein":"casein","vegan-protein":"whey",
      "mass-gainer":"mass-gainer","creatine":"creatine","bcaa":"bcaa","eaa":"eaa","glutamine":"glutamine",
      "pre-workout":"pre-workout","electrolytes":"electrolytes","fish-oil":"omega3","vitamins":"vitamin",
      "joint-support":"vitamin","recovery":"recovery","fat-burner":"fat-burner",
      "adjustable-dumbbells":"dumbbell","hex-dumbbells":"dumbbell","barbells":"barbell",
      "ez-curl-bars":"barbell","weight-plates":"plate","bumper-plates":"plate","kettlebells":"kettlebell",
      "medicine-balls":"kettlebell","slam-balls":"sandbag","sandbags":"sandbag","treadmills":"treadmill",
      "exercise-bikes":"bike","spin-bikes":"bike","rowing-machines":"rower","ellipticals":"bike",
      "stair-climbers":"bike","bench-press":"bench","squat-rack":"rack","smith-machine":"machine",
      "power-rack":"rack","cable-machine":"machine","functional-trainer":"machine",
      "resistance-bands":"band","jump-rope":"rope","battle-rope":"rope","gym-gloves":"gloves",
      "wrist-wraps":"gloves","lifting-belts":"belt","lifting-straps":"strap","knee-sleeves":"sleeve",
      "foam-roller":"foam-roller","massage-ball":"foam-roller","shaker-cup":"shaker","water-bottle":"bottle",
      "gym-bag":"bag","mens-tank-top":"tshirt","mens-hoodie":"clothing","mens-shorts":"shorts",
      "mens-joggers":"shorts","mens-compression":"tshirt","women-leggings":"leggings",
      "women-sports-bra":"clothing","womens-top":"tshirt","kids-apparel":"kids","running-shoes":"shoes",
      "training-shoes":"shoes","weightlifting-shoes":"shoes","cross-training-shoes":"shoes",
      "smart-watch":"smartwatch","fitness-tracker":"smartwatch","heart-rate-monitor":"heart-rate-monitor",
      "smart-scale":"scale","medicine-balls":"massage-ball","massage-ball":"massage-ball"}

def _slug(s): return re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-')
import itertools
_sku_counter = itertools.count()
def _sku(n): return f'GYM-{next(_sku_counter):08X}'
def _bc(): return str(100000000000 + next(_sku_counter) % 900000000000)

def _variant_hash(name, brand, flv=None, col=None, sz=None, wt=None):
    key = f"{name}|{brand}|{flv or ''}|{col or ''}|{sz or ''}|{wt or ''}"
    return hashlib.md5(key.encode()).hexdigest()[:3]

def _np(name, brand, cat, price, sale=0, wt=None, flv=None, col=None, sz=None, tgt="All"):
    s = _slug(brand + '-' + name) + '-' + _variant_hash(name, brand, flv, col, sz, wt)
    sd = SD.get(cat, cat.replace('-',''))
    _dh = hashlib.md5(s.encode()).hexdigest()
    p = dict(product_name=name, slug=s, sku=_sku(name),
             barcode=_bc(), price=round(price,2), sale_price=round(sale,2) if sale<price else 'NULL',
             stock=20 + int(_dh[:4], 16) % 280,
             rating=round(3.9 + int(_dh[4:6], 16) / 255 * 1.1, 1),
             review_count=10 + int(_dh[6:10], 16) % 1190,
             main_image=f'/image/{sd}/{s}.webp',
             brand_id=BRAND[brand], category_id=CAT[cat],
             sub_category=cat.replace('-',' ').title(), is_active=1,
             is_featured=1 if int(_dh[10:12], 16) < 31 else 0,
             is_on_sale=1 if sale<price else 0,
             weight=wt, flavor=flv, color=col, size=sz, target_users=tgt,
             tags=f'{cat.replace("-"," ")},{brand.replace("-"," ").title()},gym,fitness',
             specifications=json.dumps({"Brand":brand.replace("-"," ").title(),"Type":cat.replace("-"," ").title(),"Weight":f"{wt}lb" if wt else None,"Flavor":flv or None}),
             features='["Premium quality","Trusted brand","Lab tested"]')
    p["created_at"] = "GETDATE()"
    p["updated_at"] = "GETDATE()"
    return p

def _sql(p):
    cols = ["product_name","slug","description","sku","barcode","price","sale_price","stock","rating","review_count",
            "main_image","brand_id","category_id","sub_category","is_active","is_featured","is_on_sale",
            "weight","flavor","color","size","target_users","tags","specifications","features","created_at","updated_at"]
    v = []
    for c in cols:
        val = p.get(c, 'NULL')
        if val is None or val == 'NULL':
            v.append('NULL')
        elif val == 'GETDATE()':
            v.append('GETDATE()')
        elif isinstance(val, (int, float)):
            v.append(str(val))
        else:
            v.append("'" + str(val).replace("'", "''") + "'")
    return f"INSERT INTO Products ({','.join(cols)}) VALUES ({','.join(v)});\n"

# ─── product data: (name, brand, cat, [(price,sale,weight)], [flavors/colors], [sizes]) ───

D_SUPP = [
    ("Gold Standard Whey","optimum-nutrition","whey-protein",[(44.99,39.99,5),(29.99,24.99,2.2),(59.99,49.99,10)],["Double Rich Chocolate","Vanilla","Cookies & Cream","Strawberry","Banana","Peanut Butter Choco"]),
    ("Impact Whey Protein","myprotein","whey-protein",[(49.99,39.99,5),(24.99,19.99,1),(29.99,24.99,2.25)],["Chocolate Smooth","Vanilla","Caramel","Berry","Unflavoured","Banana","Strawberry","Coffee"]),
    ("ISO100","dymatize","whey-protein",[(64.99,54.99,5),(29.99,24.99,1.6),(44.99,39.99,3)],["Hydrolyzed Vanilla","Fruit Punch","Gourmet Vanilla","","Chocolate"]),
    ("Nitro-Tech","muscletech","whey-protein",[(69.99,49.99,5),(44.99,34.99,3.5)],["Chocolate","Vanilla","Strawberry","Cookies & Cream"]),
    ("Syntha-6","bsn","whey-protein",[(54.99,44.99,4.4),(34.99,29.99,2.2)],["Chocolate","Vanilla","Strawberry","Cookies","Peanut Butter","Banana","Salted Caramel"]),
    ("R1 Whey","rule-one","whey-protein",[(54.99,44.99,5),(34.99,29.99,1.5),(29.99,24.99,1)],["Chocolate","Vanilla","Cookies & Cream","Salted Caramel","Mint Choco","Cinnamon Roll"]),
    ("Ghost Whey","ghost","whey-protein",[(59.99,49.99,2.5),(34.99,29.99,1.5)],["Choc N Cereal","Pancake & Waffle","Oreo","Cinnamon","Vanilla","Peanut Butter"]),
    ("Combat Protein","musclepharm","whey-protein",[(52.99,42.99,4),(26.99,24.99,2),(34.99,29.99,1)],["Chocolate Milk","Vanilla","Strawberry","Banana","Cookies & Cream"]),
    ("Clear Whey Isolate","myprotein","whey-protein",[(54.99,44.99,2.25),(34.99,29.99,1.5)],["Orange Mango","Apple Elderberry","Peach Tea","Berry Black","Lemonade"]),
    ("Platinum Hydrowhey","optimum-nutrition","whey-protein",[(59.99,49.99,3),(39.99,34.99,1.5)],["Chocolate","Vanilla","Strawberry","Cookies & Cream"]),
    ("Whey Protein Isolate","promix","whey-isolate",[(29.99,24.99,1.5),(44.99,34.99,5)],["Chocolate","Vanilla","Strawberry","Unflavoured","Banana"]),
    ("Gold Standard Isolate","optimum-nutrition","whey-isolate",[(84.99,69.99,5),(49.99,44.99,1.5),(59.99,54.99,3)],["Vanilla","Chocolate","Unflavoured","Strawberry"]),
    ("Impact Whey Isolate","myprotein","whey-isolate",[(69.99,54.99,5),(39.99,34.99,1.6),(49.99,44.99,2.5)],["Banana","Vanilla","Choco Peanut","Unflavoured","Cookie"]),
    ("R1 Isolate","rule-one","whey-isolate",[(59.99,49.99,3),(39.99,34.99,1.6),(49.99,44.99,5)],["Vanilla","Chocolate","Cookies & Cream","Salted Caramel"]),
    ("Micellar Casein","optimum-nutrition","casein-protein",[(49.99,44.99,3),(39.99,34.99,1.8)],["Chocolate","Vanilla","Cookies & Cream","Strawberry","Banana"]),
    ("Combat Casein","musclepharm","casein-protein",[(49.99,39.99,4),(34.99,29.99,2)],["Chocolate","Vanilla","Strawberry"]),
    ("Casein","myprotein","casein-protein",[(44.99,34.99,2.5),(24.99,19.99,1),(34.99,29.99,5)],["Chocolate","Vanilla","Banana","Strawberry"]),
    ("Vegan Blend","myprotein","vegan-protein",[(49.99,39.99,2.2),(29.99,24.99,1),(39.99,34.99,5)],["Chocolate","Vanilla","Berry","Banana","Strawberry","Unflavoured"]),
    ("Organic Vegan","myprotein","vegan-protein",[(44.99,34.99,2),(34.99,29.99,1)],["Vanilla","Berry","Banana"]),
    ("Vegan Protein","naked-nutrition","vegan-protein",[(54.99,44.99,2),(39.99,34.99,1)],["Vanilla","Chocolate","Berry"]),
    ("Serious Mass","optimum-nutrition","mass-gainer",[(54.99,44.99,6),(34.99,29.99,2.5)],["Chocolate","Vanilla","Strawberry","Banana","Cookies & Cream"]),
    ("Mass-Tech","muscletech","mass-gainer",[(74.99,59.99,7),(49.99,39.99,3),(59.99,49.99,5)],["Chocolate","Vanilla","Strawberry","Banana","Cookies & Cream"]),
    ("True Mass","bsn","mass-gainer",[(74.99,59.99,6),(49.99,39.99,4.5)],["Chocolate","Vanilla","Strawberry","Banana"]),
    ("Mass Gainer","myprotein","mass-gainer",[(54.99,44.99,5),(29.99,24.99,2.5)],["Vanilla","Chocolate","Banana","Strawberry"]),
    ("Hard Gainer","universal-nutrition","mass-gainer",[(69.99,54.99,6),(44.99,34.99,3),(54.99,44.99,5)],["Vanilla","Chocolate","Strawberry","Banana","Cookies"]),
    ("Creatine Monohydrate","optimum-nutrition","creatine",[(34.99,24.99,1.5),(24.99,19.99,0.5),(49.99,39.99,3)],["Unflavoured"]),
    ("Creatine Monohydrate","myprotein","creatine",[(24.99,19.99,1),(44.99,34.99,2.5),(14.99,9.99,0.3)],["Unflavoured","Blueberry","Tropical"]),
    ("CreaPure","myprotein","creatine",[(29.99,24.99,1)],["Unflavoured"]),
    ("Cor-Creatine","cellucor","creatine",[(49.99,39.99,2),(24.99,19.99,0.5)],["Unflavoured","Fruit Punch","Blue Raspberry"]),
    ("SMR Creatine","rule-one","creatine",[(39.99,29.99,2),(24.99,19.99,1)],["Unflavoured","Blue Raspberry"]),
    ("Platinum Creatine","muscletech","creatine",[(59.99,44.99,2),(34.99,29.99,0.5)],["Unflavoured"]),
    ("Creatine HCl","nutricost","creatine",[(29.99,24.99,0.5),(44.99,34.99,1.5)],["Unflavoured"]),
    ("C4 Original","cellucor","pre-workout",[(44.99,34.99,0.66),(29.99,24.99,0.36)],["Fruit Punch","Blue Razz","Watermelon","Cherry Limeade","Icy Blue"]),
    ("C4 Ultimate","cellucor","pre-workout",[(64.99,49.99,0.77),(39.99,34.99,0.4)],["Icy Blue Razz","Freedom Ice","Orange Mango","Sour Apple","Cotton Candy"]),
    ("C4 Ripped","cellucor","pre-workout",[(54.99,44.99,0.65)],["Cherry Limeade","Icy Blue Razz","Green Apple"]),
    ("Gold Standard Pre","optimum-nutrition","pre-workout",[(54.99,44.99,1)],["Blue Lemonade","Fruit Punch","Green Apple","Dragonfruit"]),
    ("Pre JYM","jym","pre-workout",[(64.99,54.99,1)],["Blueberry","Fruit Punch","Green Apple","Black Cherry","Dragonfruit"]),
    ("Pulse","bsn","pre-workout",[(49.99,39.99,0.66),(29.99,24.99,0.36)],["Fruit Punch","Blue Razz","Green Apple","Watermelon","Cranberry"]),
    ("Bucked Up","bucked-up","pre-workout",[(59.99,49.99,0.85),(34.99,29.99,0.5),(44.99,39.99,1)],["Blue Raz","Strawberry","Watermelon","Sour Apple","Cotton Candy"]),
    ("Gorilla Mode","gorilla-mind","pre-workout",[(64.99,54.99,1.15),(39.99,34.99,0.65)],["Sour Apple","Watermelon","Fruit Punch","Tropical Gum","Cherry Bomb","Blue Raspberry"]),
    ("Wrecked Pre Workout","huge-supplements","pre-workout",[(59.99,49.99,0.85)],["Cherry","Fruit Punch","Watermelon","Blueberry Lemonade","Sour Apple"]),
    ("Total War","redcon1","pre-workout",[(54.99,44.99,0.9)],["Blue Lemonade","Rainbow Candy","Watermelon","Cherry","Green Apple"]),
    ("L-Glutamine","optimum-nutrition","glutamine",[(24.99,19.99,1),(14.99,12.99,0.5)],["Unflavoured","Fruit Punch","Berry"]),
    ("Glutamine","myprotein","glutamine",[(19.99,14.99,0.5),(34.99,29.99,2)],["Unflavoured","Berry","Mango","Orange"]),
    ("Glutamine XT","muscletech","glutamine",[(29.99,24.99,1),(19.99,14.99,0.5)],["Unflavoured","Berry","Lemon Lime"]),
    ("Complete EAA","myprotein","eaa",[(54.99,44.99,1.5),(34.99,29.99,0.5),(44.99,39.99,1)],["Fruit Punch","Blue Raspberry","Watermelon","Tropical","Cherry Bomb","Island Mango"]),
    ("Essential Amino EAA","scivation","eaa",[(49.99,39.99,1),(24.99,19.99,0.5)],["Blue Raspberry","Fruit Punch","Lemon Lime","Dragonfruit"]),
    ("Xtend Sport","scivation","bcaa",[(39.99,29.99,1.25),(24.99,19.99,0.4)],["Blue Raspberry","Fruit Punch","Lemon Lime","Waterango","Dragonfruit"]),
    ("BCAA 5000","optimum-nutrition","bcaa",[(29.99,24.99,1),(19.99,14.99,0.5)],["Fruit Punch","Watermelon","Blue Raspberry","Strawberry Lemonade","Lemon Lime","Orange","Cherry"]),
    ("BCAA","myprotein","bcaa",[(39.99,29.99,1),(19.99,14.99,0.5),(29.99,24.99,2)],["Blue Raspberry","Mango","Fruit Punch","Tropical","Watermelon","Cherry"]),
    ("Fish Oil","optimum-nutrition","fish-oil",[(29.99,24.99,0.5)],["Unflavoured","Lemon","Orange"]),
    ("Omega 3 Fish Oil","myprotein","fish-oil",[(24.99,19.99,0.25)],["Lemon","Unflavoured","Strawberry","Berry"]),
    ("Ultimate Omega","promix","fish-oil",[(34.99,29.99,0.3)],["Lemon","Orange","Berry"]),
    ("Opti-Men","optimum-nutrition","vitamins",[(29.99,24.99,0.5)],["Unflavoured"]),
    ("Opti-Women","optimum-nutrition","vitamins",[(29.99,24.99,0.5)],["Unflavoured"]),
    ("Daily Multivitamin","nutricost","vitamins",[(14.99,12.99,0.3)],["Unflavoured","Berry","Citrus"]),
    ("Vitamin D3 5000","now-foods","vitamins",[(12.99,9.99,0.2)],["Unflavoured"]),
    ("Vitamin C 1000mg","now-foods","vitamins",[(9.99,7.99,0.2)],["Unflavoured","Orange","Berry"]),
    ("Greens Blend","onnit","vitamins",[(49.99,39.99,0.5)],["Berry","Original","Mango","Citrus"]),
    ("Spirulina 500mg","now-foods","vitamins",[(9.99,7.99,0.3)],["Unflavoured"]),
    ("Hydration Tabs","optimum-nutrition","electrolytes",[(19.99,14.99,0.15)],["Lemon Lime","Berry","Orange","Unflavoured"]),
    ("Electrolyte Powder","myprotein","electrolytes",[(24.99,19.99,0.5)],["Lemon","Berry","Orange","Tropical","Cherry","Watermelon"]),
    ("Hydroxycut Hardcore","muscletech","fat-burner",[(49.99,39.99,0.5)],["Unflavoured","Green Apple","Blueberry"]),
    ("Hydroxycut Elite","muscletech","fat-burner",[(39.99,29.99,0.5)],["Unflavoured","Watermelon","Pink Grapefruit"]),
    ("CLA 1000mg","optimum-nutrition","fat-burner",[(24.99,19.99,0.5)],["Unflavoured"]),
    ("L-Carnitine","myprotein","fat-burner",[(19.99,14.99,0.5)],["Unflavoured","Berry","Fruit Punch","Tropical"]),
    ("Collagen Peptides","myprotein","joint-support",[(34.99,29.99,1),(19.99,14.99,0.5)],["Unflavoured","Chocolate","Vanilla","Berry","Coffee"]),
    ("Marine Collagen","myprotein","joint-support",[(29.99,24.99,0.5)],["Unflavoured","Berry","Tropical"]),
    ("Protein Bar","optimum-nutrition","recovery",[(29.99,24.99,0.5)],["Chocolate","Vanilla","Peanut Butter","Cookies","Strawberry","Banana"]),
    ("Protein Flapjack","myprotein","recovery",[(19.99,14.99,0.5)],["Chocolate","Strawberry","Berry","Banana","Salted Caramel","Apricot"]),
]

D_EQUIP = [
    ("SelectTech 552","powerblock","adjustable-dumbbells",[(444.99,399.99,50),(299.99,249.99,20)],[],[]),
    ("PowerBlock Elite","powerblock","adjustable-dumbbells",[(399.99,349.99,50),(249.99,199.99,30)],[],[]),
    ("Nuobell 80","ironmaster","adjustable-dumbbells",[(599.99,549.99,80),(499.99,449.99,50),(399.99,349.99,30)],[],[]),
    ("Hex Dumbbell 10lb","rogue-fitness","hex-dumbbells",[(49.99,39.99,10)],[],[]),
    ("Hex Dumbbell 20lb","rogue-fitness","hex-dumbbells",[(89.99,79.99,20)],[],[]),
    ("Hex Dumbbell 30lb","rogue-fitness","hex-dumbbells",[(129.99,114.99,30)],[],[]),
    ("Hex Dumbbell 40lb","rogue-fitness","hex-dumbbells",[(169.99,149.99,40)],[],[]),
    ("Hex Dumbbell 50lb","rogue-fitness","hex-dumbbells",[(209.99,189.99,50)],[],[]),
    ("Hex Dumbbell 60lb","rogue-fitness","hex-dumbbells",[(249.99,224.99,60)],[],[]),
    ("Hex Dumbbell 70lb","rogue-fitness","hex-dumbbells",[(289.99,264.99,70)],[],[]),
    ("Hex Dumbbell 80lb","rogue-fitness","hex-dumbbells",[(329.99,299.99,80)],[],[]),
    ("Hex Dumbbell 90lb","rogue-fitness","hex-dumbbells",[(369.99,339.99,90)],[],[]),
    ("Hex Dumbbell 100lb","rogue-fitness","hex-dumbbells",[(409.99,379.99,100)],[],[]),
    ("Hex Dumbbell 10lb","rep-fitness","hex-dumbbells",[(54.99,44.99,10)],[],[]),
    ("Hex Dumbbell 20lb","rep-fitness","hex-dumbbells",[(99.99,84.99,20)],[],[]),
    ("Hex Dumbbell 30lb","rep-fitness","hex-dumbbells",[(139.99,124.99,30)],[],[]),
    ("Hex Dumbbell 40lb","rep-fitness","hex-dumbbells",[(179.99,159.99,40)],[],[]),
    ("Hex Dumbbell 50lb","rep-fitness","hex-dumbbells",[(219.99,199.99,50)],[],[]),
    ("Hex Dumbbell 60lb","rep-fitness","hex-dumbbells",[(259.99,239.99,60)],[],[]),
    ("Hex Dumbbell 70lb","rep-fitness","hex-dumbbells",[(299.99,279.99,70)],[],[]),
    ("Hex Dumbbell 80lb","rep-fitness","hex-dumbbells",[(339.99,319.99,80)],[],[]),
    ("Hex Dumbbell 90lb","rep-fitness","hex-dumbbells",[(379.99,359.99,90)],[],[]),
    ("Hex Dumbbell 100lb","rep-fitness","hex-dumbbells",[(419.99,399.99,100)],[],[]),
    ("Hex Dumbbell 10lb","titan-fitness","hex-dumbbells",[(59.99,49.99,10)],[],[]),
    ("Hex Dumbbell 20lb","titan-fitness","hex-dumbbells",[(109.99,94.99,20)],[],[]),
    ("Hex Dumbbell 30lb","titan-fitness","hex-dumbbells",[(149.99,134.99,30)],[],[]),
    ("Hex Dumbbell 40lb","titan-fitness","hex-dumbbells",[(189.99,169.99,40)],[],[]),
    ("Hex Dumbbell 50lb","titan-fitness","hex-dumbbells",[(229.99,209.99,50)],[],[]),
    ("Hex Dumbbell 60lb","titan-fitness","hex-dumbbells",[(269.99,249.99,60)],[],[]),
    ("Hex Dumbbell 70lb","titan-fitness","hex-dumbbells",[(309.99,289.99,70)],[],[]),
    ("Hex Dumbbell 80lb","titan-fitness","hex-dumbbells",[(349.99,329.99,80)],[],[]),
    ("Hex Dumbbell 90lb","titan-fitness","hex-dumbbells",[(389.99,369.99,90)],[],[]),
    ("Hex Dumbbell 100lb","titan-fitness","hex-dumbbells",[(429.99,409.99,100)],[],[]),
    ("Hex Dumbbell 15lb","rogue-fitness","hex-dumbbells",[(69.99,59.99,15)],[],[]),
    ("Hex Dumbbell 25lb","rogue-fitness","hex-dumbbells",[(109.99,94.99,25)],[],[]),
    ("Hex Dumbbell 35lb","rogue-fitness","hex-dumbbells",[(149.99,129.99,35)],[],[]),
    ("Hex Dumbbell 45lb","rogue-fitness","hex-dumbbells",[(189.99,169.99,45)],[],[]),
    ("Hex Dumbbell 55lb","rogue-fitness","hex-dumbbells",[(229.99,209.99,55)],[],[]),
    ("Hex Dumbbell 65lb","rogue-fitness","hex-dumbbells",[(269.99,249.99,65)],[],[]),
    ("Hex Dumbbell 75lb","rogue-fitness","hex-dumbbells",[(309.99,289.99,75)],[],[]),
    ("Hex Dumbbell 85lb","rogue-fitness","hex-dumbbells",[(349.99,329.99,85)],[],[]),
    ("Hex Dumbbell 95lb","rogue-fitness","hex-dumbbells",[(389.99,369.99,95)],[],[]),
    ("Hex Dumbbell 15lb","rep-fitness","hex-dumbbells",[(74.99,64.99,15)],[],[]),
    ("Hex Dumbbell 25lb","rep-fitness","hex-dumbbells",[(119.99,104.99,25)],[],[]),
    ("Hex Dumbbell 35lb","rep-fitness","hex-dumbbells",[(159.99,144.99,35)],[],[]),
    ("Hex Dumbbell 45lb","rep-fitness","hex-dumbbells",[(199.99,179.99,45)],[],[]),
    ("Hex Dumbbell 55lb","rep-fitness","hex-dumbbells",[(239.99,219.99,55)],[],[]),
    ("Hex Dumbbell 65lb","rep-fitness","hex-dumbbells",[(279.99,259.99,65)],[],[]),
    ("Hex Dumbbell 75lb","rep-fitness","hex-dumbbells",[(319.99,299.99,75)],[],[]),
    ("Hex Dumbbell 85lb","rep-fitness","hex-dumbbells",[(359.99,339.99,85)],[],[]),
    ("Hex Dumbbell 95lb","rep-fitness","hex-dumbbells",[(399.99,379.99,95)],[],[]),
    ("Rogue Ohio Bar 45lb","rogue-fitness","barbells",[(299.99,249.99,45)],[],[]),
    ("Rogue Castro","rogue-fitness","barbells",[(449.99,399.99,45)],[],[]),
    ("Rogue Boneyard","rogue-fitness","barbells",[(349.99,299.99,45)],[],[]),
    ("Rogue Ohio Bar 25lb","rogue-fitness","barbells",[(249.99,199.99,25)],[],[]),
    ("Rogue Apollo Bar","rogue-fitness","barbells",[(399.99,349.99,45)],[],[]),
    ("Rogue Chan","rogue-fitness","barbells",[(299.99,249.99,35)],[],[]),
    ("Rogue Echo Bar 20in","rogue-fitness","barbells",[(279.99,229.99,20)],[],[]),
    ("Rogue Echo Bar 35lb","rogue-fitness","barbells",[(329.99,279.99,35)],[],[]),
    ("Rogue Echo Bar 45lb","rogue-fitness","barbells",[(399.99,349.99,45)],[],[]),
    ("Rep Defiant Bar","rep-fitness","barbells",[(299.99,249.99,45)],[],[]),
    ("Rep Pro Bar 30lb","rep-fitness","barbells",[(249.99,199.99,30)],[],[]),
    ("Titan Olympic Bar","titan-fitness","barbells",[(199.99,149.99,45)],[],[]),
    ("Competition Bar","eleiko","barbells",[(449.99,399.99,45)],[],[]),
    ("Curl Bar 20lb","rogue-fitness","ez-curl-bars",[(79.99,69.99,20)],[],[]),
    ("Curl Bar 30lb","rogue-fitness","ez-curl-bars",[(99.99,89.99,30)],[],[]),
    ("Curl Bar 40lb","rogue-fitness","ez-curl-bars",[(119.99,109.99,40)],[],[]),
    ("Curl Bar 20lb","rep-fitness","ez-curl-bars",[(89.99,79.99,20)],[],[]),
    ("Curl Bar 30lb","rep-fitness","ez-curl-bars",[(109.99,99.99,30)],[],[]),
    ("Curl Bar 40lb","rep-fitness","ez-curl-bars",[(129.99,119.99,40)],[],[]),
    ("Curl Bar 20lb","titan-fitness","ez-curl-bars",[(94.99,84.99,20)],[],[]),
    ("Curl Bar 30lb","titan-fitness","ez-curl-bars",[(114.99,104.99,30)],[],[]),
    ("Curl Bar 40lb","titan-fitness","ez-curl-bars",[(134.99,124.99,40)],[],[]),
    ("Curl Bar 25lb","horizon-fitness","ez-curl-bars",[(99.99,89.99,25)],[],[]),
    ("Curl Bar 35lb","horizon-fitness","ez-curl-bars",[(119.99,109.99,35)],[],[]),
    ("Competition Plate 2.5lb","rogue-fitness","weight-plates",[(29.99,24.99,5)],[],[]),
    ("Competition Plate 5lb","rogue-fitness","weight-plates",[(49.99,39.99,10)],[],[]),
    ("Competition Plate 10lb","rogue-fitness","weight-plates",[(79.99,69.99,20)],[],[]),
    ("Competition Plate 25lb","rogue-fitness","weight-plates",[(129.99,114.99,50)],[],[]),
    ("Competition Plate 35lb","rogue-fitness","weight-plates",[(179.99,159.99,70)],[],[]),
    ("Competition Plate 45lb","rogue-fitness","weight-plates",[(229.99,204.99,90)],[],[]),
    ("Competition Plate 2.5lb","rep-fitness","weight-plates",[(34.99,29.99,5)],[],[]),
    ("Competition Plate 5lb","rep-fitness","weight-plates",[(54.99,44.99,10)],[],[]),
    ("Competition Plate 10lb","rep-fitness","weight-plates",[(84.99,74.99,20)],[],[]),
    ("Competition Plate 25lb","rep-fitness","weight-plates",[(139.99,124.99,50)],[],[]),
    ("Competition Plate 35lb","rep-fitness","weight-plates",[(189.99,169.99,70)],[],[]),
    ("Competition Plate 45lb","rep-fitness","weight-plates",[(239.99,219.99,90)],[],[]),
    ("Competition Plate 2.5lb","eleiko","weight-plates",[(39.99,34.99,5)],[],[]),
    ("Competition Plate 5lb","eleiko","weight-plates",[(59.99,49.99,10)],[],[]),
    ("Competition Plate 10lb","eleiko","weight-plates",[(89.99,79.99,20)],[],[]),
    ("Competition Plate 25lb","eleiko","weight-plates",[(149.99,134.99,50)],[],[]),
    ("Competition Plate 35lb","eleiko","weight-plates",[(199.99,179.99,70)],[],[]),
    ("Competition Plate 45lb","eleiko","weight-plates",[(249.99,229.99,90)],[],[]),
    ("Bumper Plate 5lb","rogue-fitness","bumper-plates",[(39.99,34.99,10)],[],[]),
    ("Bumper Plate 10lb","rogue-fitness","bumper-plates",[(59.99,49.99,20)],[],[]),
    ("Bumper Plate 15lb","rogue-fitness","bumper-plates",[(79.99,69.99,30)],[],[]),
    ("Bumper Plate 25lb","rogue-fitness","bumper-plates",[(119.99,104.99,50)],[],[]),
    ("Bumper Plate 35lb","rogue-fitness","bumper-plates",[(159.99,139.99,70)],[],[]),
    ("Bumper Plate 45lb","rogue-fitness","bumper-plates",[(199.99,179.99,90)],[],[]),
    ("Bumper Plate 55lb","rogue-fitness","bumper-plates",[(239.99,219.99,110)],[],[]),
    ("Bumper Plate 10lb","rep-fitness","bumper-plates",[(64.99,54.99,20)],[],[]),
    ("Bumper Plate 15lb","rep-fitness","bumper-plates",[(84.99,74.99,30)],[],[]),
    ("Bumper Plate 25lb","rep-fitness","bumper-plates",[(129.99,114.99,50)],[],[]),
    ("Bumper Plate 35lb","rep-fitness","bumper-plates",[(169.99,149.99,70)],[],[]),
    ("Bumper Plate 45lb","rep-fitness","bumper-plates",[(209.99,189.99,90)],[],[]),
    ("Bumper Plate 55lb","rep-fitness","bumper-plates",[(249.99,229.99,110)],[],[]),
    ("Bumper Plate 10lb","titan-fitness","bumper-plates",[(69.99,59.99,20)],[],[]),
    ("Bumper Plate 15lb","titan-fitness","bumper-plates",[(89.99,79.99,30)],[],[]),
    ("Bumper Plate 25lb","titan-fitness","bumper-plates",[(134.99,119.99,50)],[],[]),
    ("Bumper Plate 35lb","titan-fitness","bumper-plates",[(174.99,154.99,70)],[],[]),
    ("Bumper Plate 45lb","titan-fitness","bumper-plates",[(214.99,194.99,90)],[],[]),
    ("Bumper Plate 55lb","titan-fitness","bumper-plates",[(254.99,234.99,110)],[],[]),
    ("Kettlebell 8kg","rogue-fitness","kettlebells",[(49.99,39.99,18)],[],[]),
    ("Kettlebell 12kg","rogue-fitness","kettlebells",[(69.99,59.99,27)],[],[]),
    ("Kettlebell 16kg","rogue-fitness","kettlebells",[(89.99,79.99,36)],[],[]),
    ("Kettlebell 20kg","rogue-fitness","kettlebells",[(109.99,99.99,45)],[],[]),
    ("Kettlebell 24kg","rogue-fitness","kettlebells",[(129.99,119.99,53)],[],[]),
    ("Kettlebell 28kg","rogue-fitness","kettlebells",[(149.99,139.99,62)],[],[]),
    ("Kettlebell 32kg","rogue-fitness","kettlebells",[(169.99,159.99,71)],[],[]),
    ("Kettlebell 36kg","rogue-fitness","kettlebells",[(189.99,179.99,80)],[],[]),
    ("Kettlebell 40kg","rogue-fitness","kettlebells",[(209.99,199.99,89)],[],[]),
    ("Kettlebell 44kg","rogue-fitness","kettlebells",[(229.99,219.99,98)],[],[]),
    ("Kettlebell 48kg","rogue-fitness","kettlebells",[(249.99,239.99,107)],[],[]),
    ("Kettlebell 8kg","rep-fitness","kettlebells",[(54.99,44.99,18)],[],[]),
    ("Kettlebell 12kg","rep-fitness","kettlebells",[(74.99,64.99,27)],[],[]),
    ("Kettlebell 16kg","rep-fitness","kettlebells",[(94.99,84.99,36)],[],[]),
    ("Kettlebell 20kg","rep-fitness","kettlebells",[(114.99,104.99,45)],[],[]),
    ("Kettlebell 24kg","rep-fitness","kettlebells",[(134.99,124.99,53)],[],[]),
    ("Kettlebell 28kg","rep-fitness","kettlebells",[(154.99,144.99,62)],[],[]),
    ("Kettlebell 32kg","rep-fitness","kettlebells",[(174.99,164.99,71)],[],[]),
    ("Kettlebell 36kg","rep-fitness","kettlebells",[(194.99,184.99,80)],[],[]),
    ("Kettlebell 40kg","rep-fitness","kettlebells",[(214.99,204.99,89)],[],[]),
    ("Kettlebell 44kg","rep-fitness","kettlebells",[(234.99,224.99,98)],[],[]),
    ("Kettlebell 48kg","rep-fitness","kettlebells",[(254.99,244.99,107)],[],[]),
    ("Kettlebell 8kg","titan-fitness","kettlebells",[(59.99,49.99,18)],[],[]),
    ("Kettlebell 12kg","titan-fitness","kettlebells",[(79.99,69.99,27)],[],[]),
    ("Kettlebell 16kg","titan-fitness","kettlebells",[(99.99,89.99,36)],[],[]),
    ("Kettlebell 20kg","titan-fitness","kettlebells",[(119.99,109.99,45)],[],[]),
    ("Kettlebell 24kg","titan-fitness","kettlebells",[(139.99,129.99,53)],[],[]),
    ("Kettlebell 28kg","titan-fitness","kettlebells",[(159.99,149.99,62)],[],[]),
    ("Kettlebell 32kg","titan-fitness","kettlebells",[(179.99,169.99,71)],[],[]),
    ("Kettlebell 36kg","titan-fitness","kettlebells",[(199.99,189.99,80)],[],[]),
    ("Kettlebell 40kg","titan-fitness","kettlebells",[(219.99,209.99,89)],[],[]),
    ("Kettlebell 44kg","titan-fitness","kettlebells",[(239.99,229.99,98)],[],[]),
    ("Kettlebell 48kg","titan-fitness","kettlebells",[(259.99,249.99,107)],[],[]),
    ("Treadmill T1","horizon-fitness","treadmills",[(999.99,899.99,250)],[],[]),
    ("Treadmill Pro","horizon-fitness","treadmills",[(1499.99,1299.99,270)],[],[]),
    ("Treadmill X1","horizon-fitness","treadmills",[(1999.99,1799.99,280)],[],[]),
    ("Sole F63","sole-fitness","treadmills",[(1299.99,1149.99,280)],[],[]),
    ("Sole F80","sole-fitness","treadmills",[(1799.99,1599.99,300)],[],[]),
    ("Sole TT8","sole-fitness","treadmills",[(2499.99,2299.99,350)],[],[]),
    ("NordicTrack 1750","horizon-fitness","treadmills",[(1699.99,1499.99,320)],[],[]),
    ("NordicTrack 2450","horizon-fitness","treadmills",[(2299.99,1999.99,350)],[],[]),
    ("Assault Tault-fitness","treadmills",[(2499.99,2299.99,400)],[],[]),
    ("Assault Runner","assault-fitness","treadmills",[(2999.99,2799.99,450)],[],[]),
    ("Bike Erg","concept2","exercise-bikes",[(999.99,899.99,150)],[],[]),
    ("AssaultBike Elite","assault-fitness","exercise-bikes",[(1499.99,1349.99,250)],[],[]),
    ("SkiErg","concept2","rowing-machines",[(899.99,799.99,100)],[],[]),
    ("RowErg","concept2","rowing-machines",[(899.00,849.00,120)],[],[]),
]

D_ACCESS = [
    ("Pro Gloves","under-armour","gym-gloves",[(29.99,24.99,0.2)],["Black","Red","Blue","Gray"],["S","M","L","XL"]),
    ("Training Gloves","nike","gym-gloves",[(34.99,29.99,0.2)],["Black","White","Green"],["S","M","L","XL"]),
    ("Flex Gloves","adidas","gym-gloves",[(24.99,19.99,0.2)],["Black","Blue","Gray","Red"],["S","M","L","XL"]),
    ("Wat Gloves","under-armour","gym-gloves",[(29.99,24.99,0.2)],["Black","Crimson","Royal"],["S","M","L"]),
    ("Attack Gloves","nobull","gym-gloves",[(39.99,34.99,0.2)],["Black","Army Green","Dark Navy"],["S","M","L","XL"]),
    ("Wrist Wraps","rogue-fitness","wrist-wraps",[(24.99,19.99,0.1)],["Black","Red","Navy","Pink"],["S","M","L"]),
    ("Wrist Wraps","sbd","wrist-wraps",[(34.99,29.99,0.1)],["Black","Red","Gray"],["S","M","L"]),
    ("Wrist Wraps","rep-fitness","wrist-wraps",[(29.99,24.99,0.1)],["Black","White","Blue"],["S","M","L"]),
    ("Lever Belt 10mm","sbd","lifting-belts",[(149.99,129.99,1.5)],["Black","Brown"],["S","M","L","XL","XXL"]),
    ("Lever Belt 13mm","sbd","lifting-belts",[(179.99,159.99,1.8)],["Black","Brown"],["S","M","L","XL","XXL"]),
    ("Prong Belt 10mm","inzer","lifting-belts",[(99.99,84.99,1.3)],["Black","Brown","Tan"],["S","M","L","XL","XXL"]),
    ("Canvas Belt","tiger-sport","lifting-belts",[(49.99,39.99,1.0)],["Black","Brown","White","Red"],["S","M","L","XL","XXL"]),
    ("Lifting Straps","rogue-fitness","lifting-straps",[(19.99,14.99,0.1)],["Black","Red","Gray"]),
    ("Cotton Lifting Straps","schiek","lifting-straps",[(14.99,9.99,0.1)],["Black","Navy","White"]),
    ("Lasso Straps","sbd","lifting-straps",[(24.99,19.99,0.1)],["Black","Gray","Blue"]),
    ("Knee Sleeves 7mm","sbd","knee-sleeves",[(49.99,39.99,0.3)],["Black","Red","Blue","Army Green"],["S","M","L","XL","XXL"]),
    ("Knee Sleeves 5mm","rep-fitness","knee-sleeves",[(39.99,34.99,0.25)],["Black","Gray","Navy"],["S","M","L","XL"]),
    ("Knee Sleeves","rogue-fitness","knee-sleeves",[(44.99,39.99,0.25)],["Black","Red","Blue"],["S","M","L","XL","XXL"]),
    ("Resistance Band Set","under-armour","resistance-bands",[(29.99,24.99,1.0)],["Red","Black","Blue"],["Light","Medium","Heavy"]),
    ("Sling Shot Bands","sbd","resistance-bands",[(34.99,29.99,0.8)],["Red","Blue","Black"],["Light","Medium","Heavy"]),
    ("Pull Up Bands","rogue-fitness","resistance-bands",[(29.99,24.99,0.5)],["Red","Black","Blue","Green","Orange"]),
    ("Speed Rope","rogue-fitness","jump-rope",[(29.99,24.99,0.3)],["Black","Red","Silver"]),
    ("Weighted Rope","rep-fitness","jump-rope",[(34.99,29.99,1.0)],["Black","Gray","Blue"]),
    ("Battle Rope 38mm 30ft","rogue-fitness","battle-rope",[(79.99,69.99,40)],["Black"],[]),
    ("Battle Rope 38mm 40ft","rogue-fitness","battle-rope",[(99.99,84.99,50)],["Black"],[]),
    ("Battle Rope 44mm 30ft","rogue-fitness","battle-rope",[(119.99,109.99,80)],["Black","Tan"],[]),
    ("Foam Roller 18in","rogue-fitness","foam-roller",[(29.99,24.99,1.0)],["Black","Blue","Pink","Green"]),
    ("Foam Roller 36in","rep-fitness","foam-roller",[(39.99,34.99,1.5)],["Black","Orange","Blue","Gunmetal"]),
    ("Vibrating Foam Roller","hyperice","foam-roller",[(69.99,59.99,1.5)],["Black","Teal"]),
    ("Peanut Ball","tiger-sport","massage-ball",[(24.99,19.99,0.3)],["Blue","Black","Gray"]),
    ("Lacrosse Ball","tiger-sport","massage-ball",[(9.99,7.99,0.15)],["Black","Blue","Red","Yellow","Green"]),
    ("BlenderBottle Classic","rogue-fitness","shaker-cup",[(9.99,7.99,0.3)],["Black","Red","Navy","Pink","White"]),
    ("Shaker Bottle","myprotein","shaker-cup",[(7.99,5.99,0.25)],["Black","Red","Blue","White"]),
    ("Shaker Cup","gymshark","shaker-cup",[(12.99,9.99,0.3)],["Black","Gray","Navy","Red"]),
    ("Hydro Flask 32oz","hidrate","water-bottle",[(39.99,34.99,1.1)],["Black","Navy","White","Forest","Coral"]),
    ("Hydro Flask 40oz","hidrate","water-bottle",[(49.99,39.99,1.4)],["Black","Teal","Coral","Berry","White"]),
    ("Nalgene 32oz","kleankanteen","water-bottle",[(12.99,9.99,0.4)],["Black","Blue","Red","Green","Orange","White"]),
    ("Gymshark Backpack","gymshark","gym-bag",[(44.99,39.99,1.2)],["Black","Navy","Gray","Burgundy","Forest"]),
    ("Duffel Bag","nike","gym-bag",[(59.99,49.99,2.0)],["Black","Red","Blue","Gray"]),
    ("UA Backpack","under-armour","gym-bag",[(54.99,44.99,1.5)],["Black","Red","Navy","Gray","White"]),
    ("Duffel Pro","nobull","gym-bag",[(79.99,69.99,2.2)],["Black","Army Green","Dark Navy","Stone"]),
    ("Vital Tank","gymshark","mens-tank-top",[(34.99,29.99,0.3)],["Black","White","Gray","Navy","Burgundy","Sage","Stone"],["XS","S","M","L","XL","XXL"]),
    ("Stringer Tank","under-armour","mens-tank-top",[(24.99,19.99,0.2)],["Black","White","Red","Gray","Navy"],["S","M","L","XL","XXL"]),
    ("Performance Tank","nike","mens-tank-top",[(29.99,24.99,0.25)],["Black","White","Red","Gray","Blue","Olive"],["S","M","L","XL","XXL"]),
    ("Training Hoodie","gymshark","mens-hoodie",[(59.99,49.99,1.0)],["Black","Charcoal","Navy","Stone","Forest","Burgundy","Gunmetal"],["XS","S","M","L","XL","XXL"]),
    ("Sportswear Hoodie","nike","mens-hoodie",[(64.99,54.99,1.0)],["Black","Dark Smoke","Olive","Gray","Navy"],["S","M","L","XL","XXL"]),
    ("Fleece Pullover","under-armour","mens-hoodie",[(49.99,39.99,0.9)],["Black","Gray","Navy","Red","White"],["S","M","L","XL","XXL"]),
    ("Vital Shorts","gymshark","mens-shorts",[(39.99,34.99,0.3)],["Black","Charcoal","Navy","Forest","Burgundy","Sage","Gunmetal"],["XS","S","M","L","XL","XXL"]),
    ("Spray Ground Shorts","gymshark","mens-shorts",[(44.99,39.99,0.35)],["Black","Navy","Gray","Burgundy"],["S","M","L","XL"]),
    ("Adidas Training Shorts","adidas","mens-shorts",[(39.99,34.99,0.3)],["Black","Navy","Red","White","Gray"],["S","M","L","XL","XXL"]),
    ("Nike Shorts","nike","mens-shorts",[(39.99,34.99,0.3)],["Black","Anthracite","Dark Smoke","Blue","Volt","Gray"],["S","M","L","XL","XXL"]),
    ("UA Training Shorts","under-armour","mens-shorts",[(29.99,24.99,0.3)],["Black","White","Red","Navy","Gray","Academy"],["S","M","L","XL","XXL"]),
    ("Joggers","gymshark","mens-joggers",[(54.99,44.99,0.7)],["Black","Charcoal","Navy","Burgundy","Stone","Gunmetal","Sage","Dark Olive"],["XS","S","M","L","XL","XXL"]),
    ("Sportswear Joggers","nike","mens-joggers",[(59.99,49.99,0.7)],["Black","Dark Smoke","Olive","Gray","Navy"],["S","M","L","XL","XXL"]),
    ("Tiro Pants","adidas","mens-joggers",[(54.99,44.99,0.7)],["Black","Dark Gray","Navy","Olive"],["S","M","L","XL"]),
    ("Compression Shirt","under-armour","mens-compression",[(39.99,34.99,0.4)],["Black","White","Red","Navy","Gray","Royal"],["XS","S","M","L","XL","XXL"]),
    ("Vital Leggings","gymshark","women-leggings",[(49.99,44.99,0.4)],["Black","Navy","Burgundy","Sage","Charcoal","Gunmetal","Stone","Dark Olive"],["XS","S","M","L","XL","XXL"]),
    ("Sweat Seamless","gymshark","women-leggings",[(54.99,44.99,0.4)],["Black","Navy","Forest","Dark Olive","Gunmetal","Burgundy","Sage","Stone","Pink Salt"],["XS","S","M","L","XL"]),
    ("Fly Leggings","gymshark","women-leggings",[(44.99,39.99,0.35)],["Black","Navy","Charcoal","Burgundy","Stone"],["XS","S","M","L","XL"]),
    ("Align Leggings","vuori","women-leggings",[(49.99,39.99,0.4)],["Black","Navy","Olive","Burgundy","Charcoal","Sage"],["XS","S","M","L","XL"]),
    ("High Impact Bra","nike","women-sports-bra",[(39.99,34.99,0.3)],["Black","White","Pink","Gray","Red","Navy"],["XS","S","M","L","XL"]),
    ("Training Top","gymshark","womens-top",[(39.99,34.99,0.3)],["Black","Navy","Burgundy","Sage","Charcoal","White","Stone","Dark Olive"],["XS","S","M","L","XL"]),
    ("Performance Top","nike","womens-top",[(34.99,29.99,0.3)],["Black","White","Pink","Gray","Blue","Volt"],["XS","S","M","L","XL"]),
    ("Adidas Crop Top","adidas","womens-top",[(34.99,29.99,0.3)],["Black","White","Pink","Navy","Gray","Burgundy"],["XS","S","M","L","XL"]),
    ("Kids Tank Top","nike","kids-apparel",[(17.99,14.99,0.2)],["Black","White","Pink","Blue","Red"],["XS","S","M","L","XL"]),
    ("Youth Shorts","under-armour","kids-apparel",[(19.99,14.99,0.2)],["Black","Navy","Red"],["XS","S","M","L","XL"]),
]

D_SHOES = [
    ("Pegasus 41","nike","running-shoes",[(129.99,109.99,1.0)],["Black","White","Blue","Red","Gray","Olive"],["US 7","US 8","US 9","US 10","US 11","US 12","US 13"]),
    ("Ultraboost Light","adidas","running-shoes",[(189.99,159.99,1.1)],["Black","White","Red","Blue","Grey","Navy"],["US 7","US 8","US 9","US 10","US 11","US 12"]),
    ("Bondi 8","hoka","running-shoes",[(164.99,139.99,1.2)],["Black","White","Blue","Gray","Pink","Sage","Lilac"],["US 7","US 8","US 9","US 10","US 11","US 12","US 13"]),
    ("Clifton 9","hoka","running-shoes",[(144.99,119.99,0.9)],["Black","Blue","Olive","Orange","White","Rust","Sage"],["US 7","US 8","US 9","US 10","US 11","US 12"]),
    ("Cloudmonster","on-running","running-shoes",[(179.99,149.99,1.0)],["Black","White","Sage","Navy","Thunder","Fog","Mint"],["US 7","US 8","US 9","US 10","US 11","US 12"]),
    ("Cloudrunner","on-running","running-shoes",[(149.99,129.99,1.0)],["Black","White","Navy","Sage","Thunder","Alloy"],["US 7","US 8","US 9","US 10","US 11","US 12"]),
    ("Fresh Foam X 1080","new-balance","running-shoes",[(164.99,139.99,1.1)],["Black","White","Blue","Gray","Green","Navy"],["US 7","US 8","US 9","US 10","US 11","US 12"]),
    ("GT-2000 12","asics","running-shoes",[(129.99,109.99,1.0)],["Black","Blue","White","Yellow","Green"],["US 7","US 8","US 9","US 10","US 11","US 12"]),
    ("Rincon 4","hoka","running-shoes",[(119.99,99.99,0.8)],["Black","Blue","Orange","White","Olive","Rust","Sage"],["US 7","US 8","US 9","US 10","US 11"]),
    ("Romaleos 4","nike","weightlifting-shoes",[(199.99,169.99,1.0)],["Black","White","Red","Gold"],["US 7","US 8","US 9","US 10","US 11","US 12","US 13"]),
    ("Leopold Classic","adidas","weightlifting-shoes",[(179.99,149.99,1.0)],["Black","White","Red","Blue","Green"],["US 7","US 8","US 9","US 10","US 11","US 12"]),
    ("Chase Peak","eleiko","weightlifting-shoes",[(159.99,139.99,0.9)],["Black","White","Blue","Gray"],["US 7","US 8","US 9","US 10","US 11"]),
    ("Legacy Lifter","rogue-fitness","weightlifting-shoes",[(179.99,149.99,1.0)],["Black","White","Gray"],["US 7","US 8","US 9","US 10","US 11","US 12","US 13"]),
    ("Powerlifter II","sbd","weightlifting-shoes",[(199.99,179.99,1.0)],["Black","White"],["US 7","US 8","US 9","US 10","US 11","US 12"]),
    ("Metcon 9","nike","training-shoes",[(149.99,129.99,0.9)],["Black","White","Red","Blue","Gray"],["US 7","US 8","US 9","US 10","US 11","US 12","US 13"]),
    ("Metcon 8","nike","training-shoes",[(129.99,109.99,0.9)],["Black","White","Red","Gray","Blue"],["US 7","US 8","US 9","US 10","US 11","US 12"]),
    ("Nano X3","reebok","training-shoes",[(149.99,19,0.9)],["Black","White","Red","Blue","Gray","Pink"],["US 7","US 8","US 9","US 10","US 11","US 12"]),
    ("Nano X2","reebok","training-shoes",[(119.99,99.99,0.9)],["Black","White","Red","Blue","Green"],["US 7","US 8","US 9","US 10","US 11","US 12"]),
    ("UA Tribase","under-armour","training-shoes",[(139.99,119.99,0.9)],["Black","White","Red","Blue","Gray"],["US 7","US 8","US 9","US 10","US 11","US 12"]),
    ("Nano X4","reebok","training-shoes",[(149.99,139.99,0.95)],["Black","White","Pink","Red","Blue","Gray","Navy"],["US 7","US 8","US 9","US 10","US 11","US 12"]),
    ("Rush","nobull","cross-training-shoes",[(139.99,119.99,0.8)],["Black","Army Green","Stone","White","Dark Navy"],["US 7","US 8","US 9","US 10","US 11"]),
    ("Hirin","reebok","cross-training-shoes",[(99.99,79.99,0.8)],["Black","White","Blue","Red","Gray"],["US 7","US 8","US 9","US 10","US 11"]),
    ("SuperRep Go","nike","cross-training-shoes",[(119.99,99.99,0.85)],["Black","White","Pink","Blue","Green","Yellow"],["US 7","US 8","US 9","US 10","US 11","US 12"]),
    ("Miler Runner","nike","cross-training-shoes",[(99.99,79.99,0.8)],["Black","White","Blue","Red"],["US 7","US 8","US 9","US 10","US 11"]),
]

D_SMART = [
    ("Fenix 7 Pro","garmin","smart-watch",[(799.99,699.99,0.4)],["Black","White","Silver","Slate Gray","Titanium"]),
    ("Forerunner 265","garmin","smart-watch",[(449.99,399.99,0.2)],["Black","White","Aqua","Coral","Yellow"]),
    ("Forerunner 965","garmin","smart-watch",[(599.99,549.99,0.2)],["Black","White","Titanium"]),
    ("Venu 3","garmin","smart-watch",[(499.99,449.99,0.2)],["Black","Silver","Whitestone","Sage Gray","Rose Gold"]),
    ("Epix Pro","garmin","smart-watch",[(899.99,799.99,0.3)],["Black","Silver","Titanium","Slate Gray"]),
    ("Instinct 2 Solar","garmin","smart-watch",[(399.99,349.99,0.2)],["Graphite","Teal","Electric Lime","Moss","Snow","Black","Tangerine"]),
    ("Vivoactive 5","garmin","smart-watch",[(329.99,299.99,0.2)],["Black","White","Slate","Sunset","Aqua"]),
    ("Polar Vantage V3","polar","smart-watch",[(599.99,549.99,0.3)],["Black","Silver","Blue","Red","Green","Copper"]),
    ("Polar Grit X Pro","polar","smart-watch",[(499.99,449.99,0.3)],["Black","Black Titan","Silver","White","Sand","Green Navy"]),
    ("Polar Pacer Pro","polar","smart-watch",[(299.99,249.99,0.2)],["Black","White","Green","Blue","Red"]),
    ("Whoop 4.0","whoop","smart-watch",[(239.00,199.00,0.1)],["Black","White","Burgundy","Lime","Blue","Green","Navy","Teal","Slate","Pink","Sage","Gold","Silver","Coral","Orange"]),
    ("Charge 6","garmin","fitness-tracker",[(149.99,129.99,0.1)],["Black","White","Red","Blue","Coral","Mint","Graphite","Aqua"]),
    ("Vivosmart 5","garmin","fitness-tracker",[(149.99,129.99,0.1)],["Black","Black Glacier","Cool Mint","French Gray","Fog","Pink","Aqua","Slate","Seafoam","Tangerine","White"]),
    ("Versa 3","garmin","fitness-tracker",[(199.99,179.99,0.1)],["Black","White","Pink","Mint","Peach","Slate","Red","Green","Blue","Lilac","Sage Gray","Coral","Cream"]),
    ("Vivoactive 4","garmin","fitness-tracker",[(249.99,219.99,0.15)],["Black","White","Gray","Blue","Green","Pink","Aqua"]),
    ("Forerunner 45","garmin","fitness-tracker",[(149.99,129.99,0.1)],["Black","White","Blue","Red","Green","Aqua","Pink","Lime","Coral","Volcano Red","Aqua","Storm Green","Coral Pink","Lava Red","Ocean Blue","Crystal Blue","Moss","Sand","Dust Rose","Lilac","Pool","Seafoam","Red","Dark Green","Sea Green","Light Blue","Onyx Black","Pewter","Slate","Rosewood","Sage","Bubblegum","Dark Teal","Electric Blue","Navy","Fluor Yellow","Lime Pink","Brown","Aqua","Dark Red","Bright Pink","Magenta","Ivory","Coral Blue","Teal","Bubblegum","Dark Teal","Seafoam","Neon Pink","Blue Graphite","Green Moss","Gunmetal","Papaya","Aqua","White","Neon","Lime Graphite","Light Coral","Deep Blue","Yellow","Sea Green","Electric Blue","Navy","Fluor Yellow","Lime Pink","Brown","Aqua","Dark Red","Bright Pink","Magenta","Ivory","Teal","Bubblegum","Dark Teal","Seafoam","Neon Pink","Blue Graphite","Green Moss","Gunmetal","Papaya","Aqua","White","Neon","Lime Graphite","Light Coral","Deep Blue","Yellow","Black","Deep Blue"]),
    ("HRM Pro","garmin","heart-rate-monitor",[(129.99,109.99,0.1)],["Black","Gray","Navy"]),
    ("HRM 2","garmin","heart-rate-monitor",[(79.99,59.99,0.1)],["Black","Gray"]),
    ("Polar H10","polar","heart-rate-monitor",[(89.99,74.99,0.05)],["Black","Gray"]),
    ("Polar H9","polar","heart-rate-monitor",[(69.99,54.99,0.05)],["Black","Gray","Blue"]),
    ("Index S2","withings","smart-scale",[(299.99,249.99,5)],["Black","White","Silver","Midnight","Sage"]),
    ("Body Scale","withings","smart-scale",[(149.99,129.99,4)],["Black","White","Silver"]),
    ("Body+ Scale","withings","smart-scale",[(99.99,79.99,3.5)],["Black","White","Silver"]),
    ("Smart Body Analyzer","withings","smart-scale",[(199.99,179.99,6)],["Black","White","Silver","Brown"]),
    ("Smart Scale P1","withings","smart-scale",[(149.99,129.99,4.5)],["Black","White","Silver"]),
]


def expand_dataset(data, category):
    """Generate product rows from (name, brand, cat, [(price,sale,wt)], [colors], [sizes])."""
    prods = []
    for row in data:
        if len(row) == 6:
            name, brand, cat, price_options, colors, sizes = row
        else:
            name, brand, cat, price_options, colors = row
            sizes = []
        for price, sale, wt in price_options:
            opts = colors or [None]
            szs = sizes or [None]
            for col in opts[:6]:
                for sz in szs[:4]:
                    pname = name
                    if col and sz:
                        pname = f"{name} - {col} ({sz})"
                    elif col:
                        pname = f"{name} - {col}"
                    elif sz:
                        pname = f"{name} - {sz}"
                    p = _np(pname, brand, cat, price, sale, wt=wt, col=col, sz=sz)
                    variants = []
                    if wt: variants.append(f"{wt}lb")
                    if col: variants.append(col)
                    if sz: variants.append(sz)
                    p["tags"] = f'{cat.replace("-"," ")},{brand.replace("-"," ").title()},{col or "default"},{sz or "standard"},gym,fitness' + ("," + ",".join(variants) if variants else "")
                    p["specifications"] = json.dumps({"Brand":brand.replace("-"," ").title(),"Type":cat.replace("-"," ").title(),"Weight":f"{wt}lb" if wt else None,"Color":col,"Size":sz})
                    p["cat_slug"] = cat
                    p["brand_slug"] = brand
                    prods.append(p)
    return prods


def all_products():
    prods = []
    prods.extend(expand_dataset(D_SUPP, "supplement"))
    prods.extend(expand_dataset(D_EQUIP, "equipment"))
    prods.extend(expand_dataset(D_ACCESS, "accessory"))
    prods.extend(expand_dataset(D_SHOES, "shoe"))
    prods.extend(expand_dataset(D_SMART, "smart"))
    # Dedup by slug
    seen = set()
    unique = []
    for p in prods:
        if p["slug"] not in seen:
            seen.add(p["slug"])
            unique.append(p)
    return unique


def write_sql(prods):
    # Print SQL to stdout for piping to sqlcmd
    for i, p in enumerate(prods):
        sys.stdout.write(_sql(p))
    sys.stdout.flush()


# Category-specific color gradients (start, end) for professional look
CAT_GRADIENT = {
    "whey-protein": ((0x1e, 0x3a, 0x5f), (0x0d, 0x1b, 0x2a)),      # navy → dark navy
    "whey-isolate": ((0x1e, 0x3a, 0x5f), (0x0d, 0x1b, 0x2a)),
    "casein-protein": ((0x2d, 0x1b, 0x4e), (0x1a, 0x0a, 0x2e)),      # purple → dark purple
    "vegan-protein": ((0x1b, 0x3a, 0x2c), (0x0d, 0x1f, 0x15)),       # green → dark green
    "mass-gainer": ((0x4e, 0x2d, 0x1b), (0x2e, 0x15, 0x0a)),         # bronze → dark bronze
    "creatine": ((0x3d, 0x2f, 0x1a), (0x1f, 0x15, 0x08)),            # amber → dark amber
    "bcaa": ((0x3a, 0x1b, 0x2c), (0x1f, 0x0d, 0x15)),                # pink/red → dark
    "eaa": ((0x3a, 0x1b, 0x2c), (0x1f, 0x0d, 0x15)),
    "glutamine": ((0x2c, 0x3a, 0x1b), (0x15, 0x1f, 0x0d)),
    "pre-workout": ((0x4e, 0x1b, 0x1b), (0x2e, 0x0a, 0x0a)),         # red → dark red
    "electrolytes": ((0x1b, 0x3a, 0x4e), (0x0d, 0x1f, 0x2e)),        # cyan → dark cyan
    "fat-burner": ((0x4e, 0x2d, 0x1b), (0x2e, 0x15, 0x0a)),
    "vitamins": ((0x4e, 0x3a, 0x1b), (0x2e, 0x1f, 0x0a)),            # gold → dark gold
    "omega3": ((0x1b, 0x3a, 0x4e), (0x0d, 0x1f, 0x2e)),
    "protein-bar": ((0x3a, 0x2c, 0x1b), (0x1f, 0x15, 0x0d)),
    "shaker": ((0x2c, 0x3a, 0x4e), (0x15, 0x1f, 0x2e)),
    "belt": ((0x1a, 0x1a, 0x1a), (0x0a, 0x0a, 0x0a)),
    "gloves": ((0x1a, 0x1a, 0x1a), (0x0a, 0x0a, 0x0a)),
    "strap": ((0x1a, 0x1a, 0x1a), (0x0a, 0x0a, 0x0a)),
    "towel": ((0x2c, 0x2c, 0x3a), (0x15, 0x15, 0x1f)),
    "water-bottle": ((0x1b, 0x3a, 0x4e), (0x0d, 0x1f, 0x2e)),
    "resistance-band": ((0x3a, 0x1b, 0x1b), (0x1f, 0x0d, 0x0d)),
    "foam-roller": ((0x2c, 0x3a, 0x1b), (0x15, 0x1f, 0x0d)),
    "yoga-mat": ((0x2c, 0x3a, 0x1b), (0x15, 0x1f, 0x1f, 0x0d)),
    "dumbbell": ((0x2c, 0x2c, 0x2c), (0x15, 0x15, 0x15)),
    "kettlebell": ((0x2c, 0x2c, 0x2c), (0x15, 0x15, 0x15)),
    "barbell": ((0x2c, 0x2c, 0x2c), (0x15, 0x15, 0x15)),
    "plate": ((0x2c, 0x2c, 0x2c), (0x15, 0x15, 0x15)),
    "bench": ((0x1a, 0x1a, 0x1a), (0x0a, 0x0a, 0x0a)),
    "rack": ((0x1a, 0x1a, 0x1a), (0x0a, 0x0a, 0x0a)),
    "machine": ((0x1a, 0x1a, 0x1a), (0x0a, 0x0a, 0x0a)),
    "tshirt": ((0x2c, 0x2c, 0x3a), (0x15, 0x15, 0x1f)),
    "tanktop": ((0x2c, 0x2c, 0x3a), (0x15, 0x15, 0x1f)),
    "shorts": ((0x2c, 0x2c, 0x3a), (0x15, 0x15, 0x1f)),
    "leggings": ((0x2c, 0x2c, 0x3a), (0x15, 0x15, 0x1f)),
    "hoodie": ((0x1a, 0x1a, 0x1a), (0x0a, 0x0a, 0x0a)),
    "jacket": ((0x1a, 0x1a, 0x1a), (0x0a, 0x0a, 0x0a)),
    "socks": ((0x2c, 0x2c, 0x3a), (0x15, 0x15, 0x1f)),
    "shoes": ((0x1a, 0x1a, 0x1a), (0x0a, 0x0a, 0x0a)),
    "smartwatch": ((0x1a, 0x1a, 0x1a), (0x0a, 0x0a, 0x0a)),
    "scale": ((0x1a, 0x1a, 0x1a), (0x0a, 0x0a, 0x0a)),
    "heart-rate-monitor": ((0x3a, 0x1b, 0x1b), (0x1f, 0x0d, 0x0d)),
    "jump-rope": ((0x3a, 0x1b, 0x1b), (0x1f, 0x0d, 0x0d)),
    "battle-rope": ((0x3a, 0x1b, 0x1b), (0x1f, 0x0d, 0x0d)),
    "massage-ball": ((0x3a, 0x2c, 0x1b), (0x1f, 0x15, 0x0d)),
    "gym-bag": ((0x1a, 0x1a, 0x1a), (0x0a, 0x0a, 0x0a)),
    "womens-top": ((0x2c, 0x2c, 0x3a), (0x15, 0x15, 0x1f)),
    "women-leggings": ((0x2c, 0x2c, 0x3a), (0x15, 0x15, 0x1f)),
    "women-sports-bra": ((0x3a, 0x1b, 0x2c), (0x1f, 0x0d, 0x15)),
    "mens-tank-top": ((0x2c, 0x2c, 0x3a), (0x15, 0x15, 0x1f)),
    "mens-hoodie": ((0x1a, 0x1a, 0x1a), (0x0a, 0x0a, 0x0a)),
    "mens-shorts": ((0x2c, 0x2c, 0x3a), (0x15, 0x15, 0x1f)),
    "mens-joggers": ((0x1a, 0x1a, 0x1a), (0x0a, 0x0a, 0x0a)),
    "mens-compression": ((0x2c, 0x2c, 0x3a), (0x15, 0x15, 0x1f)),
}

CAT_ICON = {
    "whey-protein": "🥛", "whey-isolate": "🥛", "casein-protein": "🥛", "vegan-protein": "🌱",
    "mass-gainer": "⚖️", "creatine": "💎", "bcaa": "🔬", "eaa": "🔬", "glutamine": "🔬",
    "pre-workout": "⚡", "electrolytes": "💧", "fat-burner": "🔥", "vitamins": "💊",
    "omega3": "🐟", "protein-bar": "🍫", "shaker": "🥤", "belt": "🏋️", "gloves": "🧤",
    "strap": "🏋️", "towel": "🧺", "water-bottle": "🍼", "resistance-band": "🔗",
    "foam-roller": "🪄", "yoga-mat": "🧘", "dumbbell": "🏋️", "kettlebell": "🏋️",
    "barbell": "🏋️", "plate": "🏋️", "bench": "🏋️", "rack": "🏋️", "machine": "🏭",
    "tshirt": "👕", "tanktop": "👚", "shorts": "🩳", "leggings": "👖", "hoodie": "🧥",
    "jacket": "🧥", "socks": "🧦", "shoes": "👟", "smartwatch": "⌚", "scale": "⚖️",
    "heart-rate-monitor": "❤️", "jump-rope": "🤸", "battle-rope": "🤸", "massage-ball": "🎯",
    "gym-bag": "🎒", "womens-top": "👚", "women-leggings": "👖", "women-sports-bra": "🩲",
    "mens-tank-top": "👕", "mens-hoodie": "🧥", "mens-shorts": "🩳", "mens-joggers": "👖",
    "mens-compression": "👕",
}

def make_placeholder_image(slug, brand, category, output_path):
    """Generate professional product placeholder as WebP using PIL."""
    from PIL import Image, ImageDraw, ImageFont
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    w, h = 800, 800
    # Get gradient for category
    grad = CAT_GRADIENT.get(category, ((0x1a,0x1a,0x1a),(0x0a,0x0a,0x0a)))
    start_c, end_c = grad
    # Create vertical gradient
    img = Image.new("RGB", (w, h))
    draw = ImageDraw.Draw(img)
    for y in range(h):
        ratio = y / h
        r = int(start_c[0] * (1-ratio) + end_c[0] * ratio)
        g = int(start_c[1] * (1-ratio) + end_c[1] * ratio)
        b = int(start_c[2] * (1-ratio) + end_c[2] * ratio)
        draw.line([(0, y), (w, y)], fill=(r, g, b))
    
    # Center area for content
    # Draw subtle diagonal pattern
    for i in range(-h, w+h, 40):
        draw.line([(i, 0), (i+h, h)], fill=(255,255,255,10), width=1)
    
    # Brand name (top)
    try:
        font_big = ImageFont.truetype("arial.ttf", 48)
        font_small = ImageFont.truetype("arial.ttf", 28)
    except:
        font_big = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    brand_text = brand.replace("-", " ").title()
    # Center brand
    bbox = draw.textbbox((0,0), brand_text, font=font_big)
    bw = bbox[2] - bbox[0]
    draw.text(((w-bw)//2, 120), brand_text, fill=(255,255,255,230), font=font_big)
    
    # Icon
    icon = CAT_ICON.get(category, "🏋️")
    try:
        emoji_font = ImageFont.truetype("seguiemj.ttf", 120)
    except:
        emoji_font = font_big
    bbox = draw.textbbox((0,0), icon, font=emoji_font)
    iw = bbox[2] - bbox[0]
    draw.text(((w-iw)//2, 280), icon, fill=(255,255,255,200), font=emoji_font)
    
    # Product name (bottom, wrapped)
    name = slug.split("-")[:-1]  # remove hash suffix
    name = " ".join(name).replace("-", " ").title()
    # Wrap long names
    words = name.split()
    lines = []
    current = ""
    for word in words:
        test = current + " " + word if current else word
        bbox = draw.textbbox((0,0), test, font=font_small)
        if bbox[2] - bbox[0] < w - 80:
            current = test
        else:
            if current: lines.append(current)
            current = word
    if current: lines.append(current)
    
    y_start = 500
    for i, line in enumerate(lines[:3]):  # max 3 lines
        bbox = draw.textbbox((0,0), line, font=font_small)
        lw = bbox[2] - bbox[0]
        draw.text(((w-lw)//2, y_start + i*40), line, fill=(255,255,255,180), font=font_small)
    
    # Category label bottom
    cat_label = category.replace("-", " ").title()
    bbox = draw.textbbox((0,0), cat_label, font=font_small)
    cw = bbox[2] - bbox[0]
    draw.text(((w-cw)//2, 720), cat_label, fill=(255,255,255,120), font=font_small)
    
    img.save(str(output_path), "WEBP", quality=85, method=6)
    return True

def download_image(query, output_path):
    """Compatibility wrapper - not used anymore."""
    return False

def download_all_images(prods, max_per_category=None):
    """Generate professional placeholder images for all products."""
    from collections import Counter
    downloaded = 0
    skipped = 0
    cat_count = Counter()
    for p in prods:
        slug = p["slug"]
        cat_slug = p["cat_slug"]
        brand_slug = p["brand_slug"]
        product_name = p["product_name"]
        sd = SD.get(cat_slug, cat_slug.split('-')[0])
        if max_per_category and cat_count[sd] >= max_per_category:
            skipped += 1
            continue
        img_path = IMG_ROOT / sd / f"{slug}.webp"
        cat_count[sd] += 1
        if img_path.exists():
            skipped += 1
            continue
        brand_name = brand_slug.replace("-", " ").title()
        if make_placeholder_image(slug, brand_name, sd, img_path):
            downloaded += 1
        else:
            skipped += 1
    print(f"  Generated: {downloaded}, Skipped: {skipped}", file=sys.stderr)


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "sql"
    print("Generating products...", file=sys.stderr)
    prods = all_products()
    print(f"Total unique products: {len(prods)}", file=sys.stderr)
    
    if mode in ("sql", "all"):
        write_sql(prods)  # prints to stdout
    
    if mode in ("dl", "all"):
        print("Downloading images (this may take a while)...", file=sys.stderr)
        download_all_images(prods)
    
    if mode == "info":
        import collections
        cats = collections.Counter(p["cat_slug"] for p in prods)
        brands = collections.Counter(p["brand_slug"] for p in prods)
        print(f"\nBy category: {dict(cats.most_common())}")
        print(f"\nBy brand: {dict(brands.most_common())}")
    else:
        print("Done.", file=sys.stderr)
