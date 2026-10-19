/* Product data and image generation.
   Images are original SVG illustrations generated in the browser, so nothing can break.
   To use real photos: give a product an `images: ['assets/images/my-photo.jpg', ...]` array.
   If `images` is missing, illustrations are generated from `type` and the chosen colour. */

const CATEGORIES = [
  { id: 'sofas',     name: 'Sofas',          type: 'sofa' },
  { id: 'beds',      name: 'Beds',           type: 'bed' },
  { id: 'dining',    name: 'Dining Sets',    type: 'dining' },
  { id: 'wardrobes', name: 'Wardrobes',      type: 'storage' },
  { id: 'coffee',    name: 'Coffee Tables',  type: 'coffee' },
  { id: 'study',     name: 'Study Tables',   type: 'desk' },
  { id: 'tv',        name: 'TV Units',       type: 'tv' },
  { id: 'recliners', name: 'Recliners',      type: 'recliner' },
  { id: 'chairs',    name: 'Lounge Chairs',  type: 'chair' },
  { id: 'storage',   name: 'Shelves & Racks', type: 'shelf' },
  { id: 'lighting',  name: 'Lighting',       type: 'lamp' },
  { id: 'mirrors',   name: 'Mirrors & Decor', type: 'mirror' }
];

const C = {
  walnut: { name: 'Walnut', hex: '#8A5A3B' }, oak: { name: 'Natural Oak', hex: '#C49A6C' },
  teak: { name: 'Teak', hex: '#A8683A' }, white: { name: 'Ivory White', hex: '#E9E3D7' },
  black: { name: 'Charcoal', hex: '#3A3D40' }, olive: { name: 'Olive Green', hex: '#6F7A4A' },
  terracotta: { name: 'Terracotta', hex: '#C4684A' }, navy: { name: 'Navy Blue', hex: '#2F4466' },
  grey: { name: 'Stone Grey', hex: '#8E9296' }, sand: { name: 'Sand Beige', hex: '#CDB690' },
  rust: { name: 'Rust Orange', hex: '#B5532E' }, teal: { name: 'Deep Teal', hex: '#2F6B6B' },
  wine: { name: 'Wine Red', hex: '#7A2A3E' }, gold: { name: 'Brass Gold', hex: '#B8923A' }
};
const pick = (...k) => k.map(x => C[x]);

/* P(id, name, category, type, price, mrp, badge, [colour keys], material, dimensions, description) */
const P = (id, name, category, type, price, mrp, badge, colors, material, dim, desc) => {
  let h = 7; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return {
    id, name, category, type, price, mrp, badge, colors: pick(...colors), material, desc,
    rating: +(4 + (h % 8) / 10).toFixed(1), reviews: 40 + (h % 460),
    specs: { Dimensions: dim, Material: material, Warranty: price > 15000 ? '3 years' : '1 year', Assembly: 'Free, by our carpenters' }
  };
};

const PRODUCTS = [
  P('sf01', 'Aarav 3-Seater Fabric Sofa', 'sofas', 'sofa', 32999, 45999, 'Bestseller', ['grey', 'olive', 'terracotta', 'navy'], 'Fabric, Sheesham wood frame', '208 L x 88 D x 82 H cm', 'A deep, supportive three-seater with high-density foam cushions and a solid wood frame. Removable covers make everyday cleaning easy.'),
  P('sf02', 'Meera L-Shaped Sectional', 'sofas', 'sofa', 54999, 74999, 'New', ['sand', 'grey', 'navy'], 'Fabric, Engineered wood', '270 L x 160 D x 85 H cm', 'A generous sectional for family movie nights, with a reversible chaise that fits either corner.'),
  P('sf04', 'Ira 2-Seater Loveseat', 'sofas', 'sofa', 18999, 24999, 'Sale', ['terracotta', 'teal', 'grey'], 'Fabric, Mango wood legs', '150 L x 80 D x 80 H cm', 'Compact and comfortable, ideal for apartments, reading corners and bedrooms.'),
  P('sf05', 'Zorawar Sofa Cum Bed', 'sofas', 'sofa', 22999, 33999, '', ['olive', 'grey', 'wine'], 'Fabric, Metal frame', '190 L x 85 D x 80 H cm', 'Seats three by day and folds flat into a sleeping surface for guests.'),
  P('sf06', 'Naina Velvet 3-Seater', 'sofas', 'sofa', 41999, 59999, 'New', ['wine', 'teal', 'navy'], 'Velvet, Sheesham wood', '215 L x 90 D x 84 H cm', 'Rich velvet upholstery with tufted arms and tapered wooden legs.'),

  P('rc01', 'Kabir Leatherette Recliner', 'recliners', 'recliner', 21499, 28999, '', ['black', 'walnut'], 'Leatherette, Steel', '90 L x 92 D x 102 H cm', 'A single-seater recliner with a smooth manual mechanism and a padded headrest.'),
  P('rc02', 'Lekha 3-Seater Recliner Sofa', 'recliners', 'recliner', 69999, 99999, 'Bestseller', ['sand', 'grey', 'rust'], 'Leatherette, Steel mechanism', '215 L x 95 D x 100 H cm', 'Three motorised recliner seats with USB charging and cup holders.'),
  P('rc03', 'Omkar Fabric Recliner', 'recliners', 'recliner', 17999, 26999, 'Sale', ['navy', 'grey', 'olive'], 'Fabric, Steel', '88 L x 90 D x 100 H cm', 'Soft fabric recliner with a pull-lever and a rocking base.'),
  P('rc04', 'Tanvi Rocker Recliner', 'recliners', 'recliner', 15499, 21999, '', ['terracotta', 'grey'], 'Fabric, Plywood', '85 L x 88 D x 98 H cm', 'Gentle rocking motion with a full-length footrest.'),

  P('bd01', 'Nila King Bed with Storage', 'beds', 'bed', 38999, 52999, 'Bestseller', ['walnut', 'oak', 'white'], 'Sheesham wood', '205 L x 183 W x 100 H cm', 'A solid wood king bed with a hydraulic lift-up base that hides a full-length storage box.'),
  P('bd02', 'Rohan Queen Bed', 'beds', 'bed', 24999, 33999, '', ['oak', 'walnut', 'black'], 'Mango wood', '212 L x 160 W x 105 H cm', 'A clean-lined queen bed with a tall headboard and a sturdy slatted base.'),
  P('bd03', 'Tara Upholstered Bed', 'beds', 'bed', 29999, 41999, 'New', ['grey', 'sand', 'teal'], 'Fabric, Plywood', '210 L x 170 W x 115 H cm', 'A softly padded headboard in textured fabric on a solid plywood base.'),
  P('bd04', 'Dev Single Bed', 'beds', 'bed', 12499, 16999, '', ['white', 'oak'], 'Engineered wood', '200 L x 100 W x 85 H cm', 'A simple single bed for kids and guest rooms with a durable laminate finish.'),
  P('bd05', 'Veda Hydraulic Queen Bed', 'beds', 'bed', 33999, 47999, 'Sale', ['walnut', 'teak', 'olive'], 'Sheesham wood', '208 L x 163 W x 102 H cm', 'Lift the mattress with one hand to reach the roomy hydraulic storage underneath.'),

  P('dn01', 'Sahil 6-Seater Dining Set', 'dining', 'dining', 36999, 49999, 'Bestseller', ['walnut', 'oak', 'black'], 'Sheesham wood', 'Table 180 L x 90 W x 76 H cm', 'A solid wood dining table with six cushioned chairs, built for family meals.'),
  P('dn02', 'Kiara 4-Seater Dining Set', 'dining', 'dining', 19999, 27999, 'Sale', ['white', 'walnut', 'teal'], 'Engineered wood, Metal legs', 'Table 120 L x 75 W x 75 H cm', 'A compact four-seater for smaller dining areas, with a scratch-resistant top.'),
  P('dn03', 'Ritu Round Dining Table', 'dining', 'dining', 15499, 20999, '', ['oak', 'walnut', 'white'], 'Mango wood', 'Diameter 105, Height 76 cm', 'A round table that seats four and makes any room feel more open.'),
  P('dn05', 'Mohan 6-Seater Marble-Top Set', 'dining', 'dining', 44999, 62999, 'New', ['black', 'walnut'], 'Marble, Sheesham wood', 'Table 170 L x 90 W x 76 H cm', 'A marble-finish top on a solid wood base with six upholstered chairs.'),

  P('wd01', 'Leela 3-Door Wardrobe', 'wardrobes', 'storage', 27999, 38999, 'Bestseller', ['walnut', 'white', 'grey'], 'Engineered wood', '135 W x 52 D x 195 H cm', 'A roomy wardrobe with a hanging rail, shelves and a lockable drawer.'),
  P('wd02', 'Sagar 2-Door Wardrobe', 'wardrobes', 'storage', 18999, 25999, '', ['oak', 'white'], 'Engineered wood', '90 W x 52 D x 190 H cm', 'A neat two-door wardrobe for kids and guest rooms.'),
  P('wd03', 'Pranav 4-Door Sliding Wardrobe', 'wardrobes', 'storage', 36999, 52999, 'Sale', ['walnut', 'grey'], 'Engineered wood, Glass', '180 W x 60 D x 210 H cm', 'Sliding doors save floor space, with a full-length mirror panel.'),
  P('wd04', 'Rhea Mirror Wardrobe', 'wardrobes', 'storage', 31999, 44999, 'New', ['white', 'oak'], 'Engineered wood', '120 W x 52 D x 200 H cm', 'A wardrobe with a mirrored door and a deep drawer for linen.'),

  P('cf01', 'Zoya Coffee Table', 'coffee', 'coffee', 7999, 10999, 'Bestseller', ['walnut', 'oak', 'black'], 'Sheesham wood', '100 L x 55 W x 42 H cm', 'A low coffee table with a lower shelf for magazines and remotes.'),
  P('cf02', 'Kaya Solid Wood Coffee Table', 'coffee', 'coffee', 15999, 20999, '', ['walnut', 'teak'], 'Sheesham wood', '110 L x 60 W x 40 H cm', 'Slatted solid wood top with chunky tapered legs.'),
  P('cf03', 'Tetra Nesting Coffee Tables', 'coffee', 'coffee', 12999, 17999, 'Sale', ['oak', 'black'], 'Mango wood, Metal', '90 L x 50 W x 42 H cm', 'Two nesting tables that you can pull apart when guests arrive.'),
  P('cf04', 'Sona Gold Metal Coffee Table', 'coffee', 'coffee', 6999, 11999, '', ['gold', 'black'], 'Metal, Glass', '90 L x 50 W x 40 H cm', 'A slim metal frame with a tempered glass top.'),
  P('cf05', 'Veer Side Table Set', 'coffee', 'coffee', 4999, 6999, 'Sale', ['black', 'white', 'oak'], 'Metal, Engineered wood', '45 and 35 cm diameter', 'A set of two nesting side tables you can pull apart or tuck together.'),

  P('sd01', 'Aditya Study Desk', 'study', 'desk', 11999, 15999, 'New', ['oak', 'white', 'walnut'], 'Engineered wood', '120 L x 60 W x 75 H cm', 'A spacious work desk with a cable cut-out and a side drawer.'),
  P('sd02', 'Bond Study Table with Shelf', 'study', 'desk', 6999, 10999, '', ['walnut', 'oak'], 'Engineered wood', '110 L x 55 W x 140 H cm', 'A compact desk with a bookshelf hutch above.'),
  P('sd03', 'Strio Solid Wood Study Table', 'study', 'desk', 29999, 49999, 'Bestseller', ['walnut', 'teak'], 'Sheesham wood', '140 L x 65 W x 76 H cm', 'Three drawers and a solid wood top, made to last decades.'),
  P('sd04', 'Truman Study Table', 'study', 'desk', 14999, 25299, 'Sale', ['black', 'oak'], 'Metal, Engineered wood', '125 L x 60 W x 75 H cm', 'A sturdy metal-legged desk with a scratch-resistant top.'),

  P('tv01', 'Linnea TV Cabinet', 'tv', 'tv', 20999, 32999, 'Bestseller', ['walnut', 'oak'], 'Sheesham wood', '150 L x 40 D x 55 H cm', 'A low cabinet with drawers and open shelves for your set-top box.'),
  P('tv02', 'Dorian TV Unit with Ceramic Top', 'tv', 'tv', 43999, 74999, 'New', ['grey', 'white'], 'Engineered wood, Ceramic', '180 L x 40 D x 50 H cm', 'A high-gloss unit with a ceramic-finish top.'),
  P('tv03', 'Tavo Free-Standing TV Unit', 'tv', 'tv', 16999, 29999, 'Sale', ['oak', 'walnut', 'black'], 'Engineered wood', '160 L x 35 D x 45 H cm', 'A clean free-standing unit that fits TVs up to 55 inches.'),
  P('tv04', 'Liam Compact TV Stand', 'tv', 'tv', 3999, 8999, 'Sale', ['black', 'white'], 'Engineered wood', '100 L x 30 D x 40 H cm', 'A budget-friendly stand for bedrooms and small rooms.'),

  P('ch01', 'Anaya Accent Chair', 'chairs', 'chair', 9499, 12999, 'Bestseller', ['terracotta', 'olive', 'navy', 'sand'], 'Fabric, Rubberwood legs', '70 W x 72 D x 80 H cm', 'A rounded accent chair that brings colour and comfort to any corner.'),
  P('ch04', 'Florence Lounge Chair', 'chairs', 'chair', 9999, 14999, '', ['sand', 'rust'], 'Fabric, Wood', '68 W x 70 D x 82 H cm', 'A patterned lounge chair with curved wooden arms.'),
  P('ch05', 'Genoa Wing Chair', 'chairs', 'chair', 19999, 32999, 'New', ['grey', 'navy', 'wine'], 'Fabric, Metal legs', '75 W x 78 D x 105 H cm', 'A tall wing-back chair with deep, supportive padding.'),
  P('ch03', 'Sana Dining Chairs (Set of 2)', 'chairs', 'chair', 6999, 9499, '', ['oak', 'walnut', 'black'], 'Rubberwood', 'Seat height 46 cm', 'Two sturdy chairs with a curved backrest for long meals.'),

  P('st01', 'Isha Bookshelf', 'storage', 'shelf', 9999, 13999, 'Bestseller', ['walnut', 'oak', 'white'], 'Sheesham wood', '80 W x 30 D x 180 H cm', 'An open five-tier bookshelf that doubles as a display unit.'),
  P('st02', 'Arjun Shoe Cabinet', 'storage', 'shelf', 8499, 11999, '', ['oak', 'white', 'black'], 'Engineered wood', '80 W x 25 D x 110 H cm', 'Tilt-out shelves hold up to 18 pairs of shoes.'),
  P('st03', 'Neel Chest of Drawers', 'storage', 'storage', 13499, 18499, 'Sale', ['oak', 'walnut', 'grey'], 'Mango wood', '90 W x 45 D x 100 H cm', 'Four deep drawers on smooth runners, with brass-finish handles.'),
  P('st04', 'Kunal 5-Tier Shoe Rack', 'storage', 'shelf', 5999, 8999, 'New', ['black', 'oak'], 'Metal, Engineered wood', '70 W x 30 D x 90 H cm', 'A slim open rack that fits by the front door.'),
  P('st05', 'Vihan Bar Cabinet', 'storage', 'storage', 17999, 23999, '', ['walnut', 'black'], 'Sheesham wood, Glass', '90 L x 40 D x 150 H cm', 'A bar cabinet with a glass-holder rack and a closed cupboard.'),

  P('lt01', 'Luma Table Lamp', 'lighting', 'lamp', 2499, 3499, '', ['terracotta', 'white', 'black'], 'Ceramic, Linen shade', 'Height 45 cm', 'A warm ceramic-base lamp with a linen shade.'),
  P('lt02', 'Orbit Floor Lamp', 'lighting', 'lamp', 4999, 7999, 'Bestseller', ['gold', 'black'], 'Metal, Fabric shade', 'Height 150 cm', 'A slim floor lamp with a soft, round shade.'),
  P('lt03', 'Arc Floor Lamp', 'lighting', 'lamp', 6999, 10999, 'New', ['black', 'gold'], 'Metal, Marble base', 'Height 190 cm', 'An arching lamp that reaches over your sofa.'),

  P('mr01', 'Jaal Wall Mirror', 'mirrors', 'mirror', 3999, 5499, 'Sale', ['walnut', 'black', 'oak'], 'Wood frame, Glass', 'Diameter 70 cm', 'A round mirror with a slim wooden frame, ready to hang.'),
  P('mr02', 'Arch Full-Length Mirror', 'mirrors', 'mirror', 5999, 8999, 'Bestseller', ['gold', 'black', 'walnut'], 'Metal frame, Glass', '60 W x 160 H cm', 'A tall arched mirror you can lean against the wall.'),
  P('mr03', 'Clay Vase Trio', 'mirrors', 'decor', 1799, 2599, '', ['terracotta', 'sand', 'olive'], 'Terracotta', 'Heights 15, 22 and 30 cm', 'Three hand-finished vases in graduated heights.')
];

/* ---------- image generation ---------- */
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(v + amt * (amt < 0 ? v : 255 - v))));
  return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join('');
}

const SHAPES = {
  sofa: c => `<rect x="42" y="58" width="156" height="54" rx="18" fill="${c}"/><rect x="22" y="86" width="42" height="58" rx="15" fill="${shade(c,-.12)}"/><rect x="176" y="86" width="42" height="58" rx="15" fill="${shade(c,-.12)}"/><rect x="56" y="96" width="128" height="44" rx="12" fill="${shade(c,.12)}"/><rect x="60" y="100" width="58" height="30" rx="9" fill="${shade(c,.25)}"/><rect x="122" y="100" width="58" height="30" rx="9" fill="${shade(c,.25)}"/><rect x="34" y="144" width="9" height="13" rx="2" fill="#4a3220"/><rect x="197" y="144" width="9" height="13" rx="2" fill="#4a3220"/>`,
  bed: c => `<rect x="38" y="30" width="164" height="82" rx="12" fill="${shade(c,-.18)}"/><rect x="50" y="42" width="140" height="60" rx="7" fill="${c}"/><rect x="34" y="100" width="172" height="34" rx="9" fill="#F0E7DB"/><rect x="50" y="82" width="54" height="26" rx="9" fill="#fff"/><rect x="112" y="82" width="54" height="26" rx="9" fill="#fff"/><rect x="34" y="132" width="172" height="26" rx="4" fill="${shade(c,-.18)}"/><rect x="48" y="138" width="66" height="14" rx="2" fill="${c}"/><rect x="126" y="138" width="66" height="14" rx="2" fill="${c}"/>`,
  dining: c => `<ellipse cx="120" cy="96" rx="82" ry="22" fill="${c}"/><ellipse cx="120" cy="92" rx="82" ry="20" fill="${shade(c,.14)}"/><rect x="62" y="104" width="8" height="48" fill="${shade(c,-.2)}"/><rect x="170" y="104" width="8" height="48" fill="${shade(c,-.2)}"/><rect x="40" y="62" width="30" height="22" rx="5" fill="${shade(c,-.25)}"/><rect x="170" y="62" width="30" height="22" rx="5" fill="${shade(c,-.25)}"/><rect x="40" y="122" width="30" height="24" rx="5" fill="${shade(c,-.3)}"/><rect x="170" y="122" width="30" height="24" rx="5" fill="${shade(c,-.3)}"/>`,
  storage: c => `<rect x="62" y="14" width="116" height="142" rx="7" fill="${shade(c,-.22)}"/><rect x="68" y="20" width="50" height="130" rx="3" fill="${c}"/><rect x="122" y="20" width="50" height="130" rx="3" fill="${shade(c,.1)}"/><rect x="110" y="78" width="3" height="24" rx="1" fill="#E9D3A0"/><rect x="127" y="78" width="3" height="24" rx="1" fill="#E9D3A0"/><rect x="74" y="34" width="38" height="3" fill="${shade(c,-.3)}" opacity=".5"/><rect x="74" y="110" width="38" height="3" fill="${shade(c,-.3)}" opacity=".5"/>`,
  shelf: c => `<rect x="70" y="14" width="100" height="144" rx="4" fill="${shade(c,-.22)}"/><rect x="76" y="20" width="88" height="132" fill="${shade(c,.18)}"/>${[48, 78, 108].map(y => `<rect x="76" y="${y}" width="88" height="5" fill="${c}"/>`).join('')}<rect x="84" y="28" width="12" height="20" fill="#B5532E"/><rect x="100" y="32" width="10" height="16" fill="#2F6B6B"/><rect x="92" y="58" width="22" height="20" rx="3" fill="#CDB690"/><rect x="124" y="86" width="26" height="22" rx="3" fill="#6F7A4A"/><rect x="84" y="118" width="40" height="32" rx="3" fill="${shade(c,-.1)}"/>`,
  table: c => `<rect x="38" y="76" width="164" height="14" rx="4" fill="${shade(c,.1)}"/><rect x="38" y="88" width="164" height="6" rx="2" fill="${shade(c,-.25)}"/><rect x="52" y="94" width="9" height="62" rx="2" fill="${c}"/><rect x="179" y="94" width="9" height="62" rx="2" fill="${c}"/><rect x="60" y="124" width="120" height="6" rx="2" fill="${shade(c,-.1)}"/>`,
  coffee: c => `<ellipse cx="120" cy="104" rx="84" ry="20" fill="${shade(c,-.25)}"/><ellipse cx="120" cy="98" rx="84" ry="20" fill="${shade(c,.1)}"/><rect x="58" y="108" width="8" height="44" rx="2" fill="${c}"/><rect x="174" y="108" width="8" height="44" rx="2" fill="${c}"/><rect x="92" y="114" width="8" height="38" rx="2" fill="${shade(c,-.15)}"/><rect x="140" y="114" width="8" height="38" rx="2" fill="${shade(c,-.15)}"/>`,
  desk: c => `<rect x="30" y="64" width="180" height="12" rx="3" fill="${shade(c,.1)}"/><rect x="34" y="76" width="9" height="80" rx="2" fill="${c}"/><rect x="150" y="76" width="54" height="78" rx="3" fill="${shade(c,-.1)}"/><rect x="156" y="82" width="42" height="20" rx="2" fill="${c}"/><rect x="156" y="106" width="42" height="20" rx="2" fill="${c}"/><rect x="172" y="90" width="10" height="3" fill="#E9D3A0"/><rect x="172" y="114" width="10" height="3" fill="#E9D3A0"/><rect x="62" y="30" width="60" height="34" rx="3" fill="#2d3033"/><rect x="66" y="34" width="52" height="26" fill="#8fb4c8"/><rect x="88" y="60" width="8" height="4" fill="#2d3033"/>`,
  tv: c => `<rect x="30" y="110" width="180" height="40" rx="4" fill="${shade(c,-.1)}"/><rect x="36" y="116" width="52" height="28" rx="2" fill="${c}"/><rect x="92" y="116" width="52" height="28" rx="2" fill="${shade(c,.12)}"/><rect x="148" y="116" width="56" height="28" rx="2" fill="${c}"/><rect x="40" y="150" width="8" height="8" fill="#4a3220"/><rect x="192" y="150" width="8" height="8" fill="#4a3220"/><rect x="48" y="30" width="144" height="76" rx="3" fill="#15181a"/><rect x="52" y="34" width="136" height="68" fill="#24313a"/><rect x="112" y="106" width="16" height="6" fill="#15181a"/>`,
  chair: c => `<rect x="76" y="26" width="88" height="62" rx="22" fill="${c}"/><rect x="62" y="82" width="116" height="32" rx="12" fill="${shade(c,.1)}"/><rect x="62" y="70" width="18" height="44" rx="9" fill="${shade(c,-.12)}"/><rect x="160" y="70" width="18" height="44" rx="9" fill="${shade(c,-.12)}"/><rect x="76" y="114" width="7" height="44" rx="2" fill="#4a3220"/><rect x="157" y="114" width="7" height="44" rx="2" fill="#4a3220"/>`,
  recliner: c => `<rect x="60" y="22" width="80" height="78" rx="22" fill="${c}"/><rect x="50" y="76" width="100" height="40" rx="14" fill="${shade(c,.1)}"/><rect x="42" y="62" width="22" height="58" rx="11" fill="${shade(c,-.12)}"/><rect x="136" y="62" width="22" height="58" rx="11" fill="${shade(c,-.12)}"/><rect x="132" y="104" width="76" height="22" rx="10" fill="${shade(c,.2)}"/><rect x="60" y="120" width="8" height="34" fill="#333"/><rect x="132" y="120" width="8" height="34" fill="#333"/>`,
  lamp: c => `<rect x="118" y="44" width="4" height="104" fill="#444"/><path d="M82 52 L158 52 L146 14 L94 14 Z" fill="${c}"/><ellipse cx="120" cy="152" rx="28" ry="8" fill="#444"/>`,
  mirror: c => `<path d="M78 156 L78 62 A42 42 0 0 1 162 62 L162 156 Z" fill="${c}"/><path d="M86 150 L86 62 A34 34 0 0 1 154 62 L154 150 Z" fill="#CFE1E8"/><path d="M96 140 L128 60" stroke="#fff" stroke-width="6" opacity=".5"/>`,
  decor: c => `<path d="M80 150 C 54 150 54 106 70 92 L 70 76 L 94 76 L 94 92 C 110 106 106 150 80 150 Z" fill="${c}"/><path d="M150 150 C 130 150 130 118 142 106 L 142 96 L 160 96 L 160 106 C 172 118 170 150 150 150 Z" fill="${shade(c,-.15)}"/><path d="M82 76 C 80 52 90 38 106 30" stroke="#5a7a3a" stroke-width="3" fill="none"/><ellipse cx="108" cy="30" rx="9" ry="5" fill="#6f9a45"/>`
};

/* view 0-3: warm room backdrops (product photos); view 4: dark green fluted panel (banners); view 5: dusk plum */
const WALLS = ['#F3EDE4', '#E8EEF0', '#F4E7E1', '#EDEBE2'];
const imgCache = {};
function artImage(type, hex, view) {
  const key = type + hex + view;
  if (imgCache[key]) return imgCache[key];
  const shape = (SHAPES[type] || SHAPES.sofa)(hex);
  let bg, floor;
  if (view === 4) {
    bg = `<defs><pattern id="f" width="8" height="10" patternUnits="userSpaceOnUse"><rect width="4" height="10" fill="#1B3528"/><rect x="4" width="4" height="10" fill="#254635"/></pattern><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset=".7" stop-color="#000" stop-opacity="0"/></linearGradient></defs><rect width="240" height="180" fill="url(#f)"/><rect width="240" height="180" fill="url(#g)"/>`;
    floor = '<rect x="0" y="152" width="240" height="28" fill="#CFCAC2"/>';
  } else if (view === 5) {
    bg = `<defs><linearGradient id="d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A1220"/><stop offset="1" stop-color="#8A4A58"/></linearGradient></defs><rect width="240" height="180" fill="url(#d)"/><circle cx="40" cy="30" r="1.2" fill="#fff" opacity=".7"/><circle cx="190" cy="22" r="1" fill="#fff" opacity=".6"/><circle cx="120" cy="14" r="1.2" fill="#fff" opacity=".6"/>`;
    floor = '<rect x="0" y="152" width="240" height="28" fill="#C99AA2"/>';
  } else if (view === 6) {
    bg = ''; floor = '';
  } else {
    bg = `<rect width="240" height="180" fill="${WALLS[view % 4]}"/>` + (view === 2 ? '<rect x="188" y="40" width="40" height="70" fill="#CFE1E8" opacity=".7"/>' : '');
    floor = view === 2 ? '<rect x="0" y="150" width="240" height="30" fill="#D9CBB4"/>' : '<rect x="0" y="152" width="240" height="28" fill="#E3DACB"/>';
  }
  const vb = view === 1 ? '40 30 170 130' : view === 6 ? '24 10 192 152' : '0 0 240 180';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" preserveAspectRatio="xMidYMid slice">${bg}${floor}<ellipse cx="120" cy="158" rx="96" ry="6" fill="#000" opacity=".12"/>${shape}</svg>`;
  return (imgCache[key] = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg));
}
function productImages(p, colorIdx) {
  if (p.images && p.images.length) return p.images;
  const hex = (p.colors[colorIdx || 0] || p.colors[0]).hex;
  return [0, 1, 2, 3].map(v => artImage(p.type, hex, v));
}
function categoryImage(cat, view) { return artImage(cat.type, C.walnut.hex, view || 0); }
function getProduct(id) { return PRODUCTS.find(p => p.id === id); }
function getCategory(id) { return CATEGORIES.find(c => c.id === id); }
function discountPct(p) { return p.mrp > p.price ? Math.round((p.mrp - p.price) / p.mrp * 100) : 0; }
