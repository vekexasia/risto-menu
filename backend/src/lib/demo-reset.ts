import type { Env } from '../types';

const now = 1700000000000;

const settings = {
  name: 'Trattoria Demo',
  payoff: 'A living demo menu you can edit safely',
  theme: {
    primaryColor: '#C47A4F',
    backgroundColor: '#FBFAF9',
    textColor: '#1F1A14',
  },
  info: {
    phone: '+39 041 000 0000',
    addressLine1: 'Campo San Demo, 1',
    city: 'Venezia',
    zip: '30100',
    region: 'VE',
    headerImage: '/demo-images/restaurant.jpg',
    menuNotice: {
      enabled: true,
      text: 'Demo data resets automatically. Do not enter real customer data.',
      i18n: {
        it: { text: 'I dati demo vengono azzerati automaticamente. Non inserire dati reali dei clienti.' },
        en: { text: 'Demo data resets automatically. Do not enter real customer data.' },
      },
    },
  },
  socials: {
    instagram: 'https://www.instagram.com/',
    facebook: 'https://www.facebook.com/',
    whatsapp: '+390410000000',
  },
  openingSchedule: {
    seated: {
      open: true,
      schedule: {
        0: [{ start: '12:00', end: '15:00' }, { start: '19:00', end: '23:00' }],
        1: [{ start: '12:00', end: '15:00' }, { start: '19:00', end: '23:00' }],
        2: [],
        3: [{ start: '12:00', end: '15:00' }, { start: '19:00', end: '23:00' }],
        4: [{ start: '12:00', end: '15:00' }, { start: '19:00', end: '23:00' }],
        5: [{ start: '12:00', end: '15:00' }, { start: '19:00', end: '23:30' }],
        6: [{ start: '12:00', end: '15:00' }, { start: '19:00', end: '23:30' }],
      },
    },
  },
  promotionAlert: {
    title: 'Demo tasting menu',
    content: 'Try editing this promotion from the admin panel.',
    tillDate: '2030-12-31T22:59:59.999Z',
  },
  chatAgentPrompt: 'You are the friendly assistant for Trattoria Demo. Recommend dishes from the demo menu only.',
  aiChatEnabled: true,
  enabledLocales: ['it', 'en', 'de', 'fr'],
  disabledLocales: ['es', 'nl', 'ru', 'pt'],
  customLocales: [{ code: 'vec', name: 'Veneto' }],
  publicationState: 'published',
};

const menus = [
  { id: 'demo-menu-seated', code: 'seated', title: 'Menu al tavolo', i18n: { en: { title: 'Table menu' }, de: { title: 'Speisekarte' }, fr: { title: 'Menu à table' } } },
  { id: 'demo-menu-drinks', code: 'takeaway', title: 'Drink list', i18n: { it: { title: 'Bevande' }, en: { title: 'Drinks' } } },
];

const categories = [
  { id: 'demo-cat-starters', menuId: 'demo-menu-seated', name: 'Antipasti', sortOrder: 0, i18n: { en: { name: 'Starters' }, de: { name: 'Vorspeisen' }, fr: { name: 'Entrées' } } },
  { id: 'demo-cat-pasta', menuId: 'demo-menu-seated', name: 'Primi', sortOrder: 1, i18n: { en: { name: 'Pasta' }, de: { name: 'Pasta' }, fr: { name: 'Pâtes' } } },
  { id: 'demo-cat-mains', menuId: 'demo-menu-seated', name: 'Secondi', sortOrder: 2, i18n: { en: { name: 'Main courses' }, de: { name: 'Hauptgerichte' }, fr: { name: 'Plats principaux' }, vec: { name: 'Secondi' } } },
  { id: 'demo-cat-desserts', menuId: 'demo-menu-seated', name: 'Dolci', sortOrder: 3, i18n: { en: { name: 'Desserts' }, de: { name: 'Desserts' }, fr: { name: 'Desserts' } } },
  { id: 'demo-cat-wines', menuId: 'demo-menu-drinks', name: 'Vini al calice', sortOrder: 0, i18n: { en: { name: 'Wine by the glass' }, de: { name: 'Wein im Glas' }, fr: { name: 'Vins au verre' } } },
];

const entries = [
  {
    id: 'demo-entry-bruschetta',
    categoryId: 'demo-cat-starters',
    name: 'Bruschetta al pomodoro',
    description: 'Pane tostato, pomodorini, basilico e olio extravergine.',
    price: 750,
    imageUrl: '/demo-images/bruschetta.jpg',
    sortOrder: 0,
    allergens: ['Glutine'],
    i18n: {
      en: { name: 'Tomato bruschetta', desc: 'Toasted bread, cherry tomatoes, basil and extra virgin olive oil.' },
      de: { name: 'Tomaten-Bruschetta', desc: 'Geröstetes Brot, Kirschtomaten, Basilikum und natives Olivenöl extra.' },
      fr: { name: 'Bruschetta à la tomate', desc: 'Pain grillé, tomates cerises, basilic et huile d’olive extra vierge.' },
      vec: { name: 'Bruscheta al pomodoro', desc: 'Pan brustolà, pomodorini, basìlego e ojo bon.' },
    },
  },
  {
    id: 'demo-entry-carpaccio',
    categoryId: 'demo-cat-starters',
    name: 'Carpaccio di zucchine',
    description: 'Zucchine marinate, limone, menta e scaglie di mandorla.',
    price: 950,
    imageUrl: '/demo-images/zucchini.jpg',
    sortOrder: 1,
    allergens: ['Frutta-a-Guscio'],
    i18n: {
      en: { name: 'Zucchini carpaccio', desc: 'Marinated zucchini, lemon, mint and almond flakes.' },
      de: { name: 'Zucchini-Carpaccio', desc: 'Marinierte Zucchini, Zitrone, Minze und Mandelblättchen.' },
      fr: { name: 'Carpaccio de courgettes', desc: 'Courgettes marinées, citron, menthe et copeaux d’amande.' },
      vec: { name: 'Carpacio de suchine', desc: 'Suchine marinàe, limon, menta e mandorle a scaie.' },
    },
  },
  {
    id: 'demo-entry-polpo',
    categoryId: 'demo-cat-starters',
    name: 'Polpo alla griglia',
    description: 'Polpo croccante con crema di patate, prezzemolo e olio al limone.',
    price: 1350,
    imageUrl: '/demo-images/polpo.jpg',
    sortOrder: 2,
    allergens: ['Molluschi'],
    i18n: {
      en: { name: 'Grilled octopus', desc: 'Crispy octopus with potato cream, parsley and lemon oil.' },
      de: { name: 'Gegrillter Oktopus', desc: 'Knuspriger Oktopus mit Kartoffelcreme, Petersilie und Zitronenöl.' },
      fr: { name: 'Poulpe grillé', desc: 'Poulpe croustillant avec crème de pommes de terre, persil et huile au citron.' },
      vec: { name: 'Folpo ai ferri', desc: 'Folpo crocante co crema de patate, persemolo e ojo al limon.' },
    },
  },
  {
    id: 'demo-entry-burrata',
    categoryId: 'demo-cat-starters',
    name: 'Burrata, datterini e pesto',
    description: 'Burrata pugliese con pomodorini dolci, pesto leggero e focaccia croccante.',
    price: 1200,
    imageUrl: '/demo-images/burrata.jpg',
    sortOrder: 3,
    allergens: ['Latte-e-Derivati', 'Glutine', 'Frutta-a-Guscio'],
    i18n: {
      en: { name: 'Burrata, cherry tomatoes and pesto', desc: 'Apulian burrata with sweet cherry tomatoes, light pesto and crisp focaccia.' },
      de: { name: 'Burrata, Datteltomaten und Pesto', desc: 'Burrata aus Apulien mit süßen Kirschtomaten, leichtem Pesto und knuspriger Focaccia.' },
      fr: { name: 'Burrata, tomates cerises et pesto', desc: 'Burrata des Pouilles avec tomates cerises douces, pesto léger et focaccia croustillante.' },
      vec: { name: 'Burrata, datterini e pesto', desc: 'Burrata pugliese co pomodorini dolsi, pesto liziero e focaccia crocante.' },
    },
  },
  {
    id: 'demo-entry-ravioli',
    categoryId: 'demo-cat-pasta',
    name: 'Ravioli ricotta e spinaci',
    description: 'Ravioli fatti in casa con burro e salvia.',
    price: 1450,
    imageUrl: '/demo-images/ravioli.jpg',
    sortOrder: 0,
    allergens: ['Glutine', 'Uova', 'Latte-e-Derivati'],
    i18n: {
      en: { name: 'Ricotta and spinach ravioli', desc: 'Homemade ravioli with butter and sage.' },
      de: { name: 'Ravioli mit Ricotta und Spinat', desc: 'Hausgemachte Ravioli mit Butter und Salbei.' },
      fr: { name: 'Ravioli ricotta-épinards', desc: 'Ravioli maison au beurre et à la sauge.' },
      vec: { name: 'Ravioli ricota e spinasi', desc: 'Ravioli fati in casa co buro e salvia.' },
    },
  },
  {
    id: 'demo-entry-spaghetti',
    categoryId: 'demo-cat-pasta',
    name: 'Spaghetti alle vongole',
    description: 'Spaghetti con vongole, aglio, prezzemolo e vino bianco.',
    price: 1650,
    imageUrl: '/demo-images/spaghetti.jpg',
    sortOrder: 1,
    allergens: ['Glutine', 'Molluschi', 'Anidride-Solforosa-e-Solfiti'],
    i18n: {
      en: { name: 'Spaghetti with clams', desc: 'Spaghetti with clams, garlic, parsley and white wine.' },
      de: { name: 'Spaghetti mit Venusmuscheln', desc: 'Spaghetti mit Muscheln, Knoblauch, Petersilie und Weißwein.' },
      fr: { name: 'Spaghetti aux palourdes', desc: 'Spaghetti aux palourdes, ail, persil et vin blanc.' },
      vec: { name: 'Spaghetti co le vongole', desc: 'Spaghetti co vongole, ajo, persemolo e vin bianco.' },
    },
  },
  {
    id: 'demo-entry-branzino',
    categoryId: 'demo-cat-mains',
    name: 'Filetto di branzino',
    description: 'Branzino al forno con verdure di stagione, limone e timo.',
    price: 2150,
    imageUrl: '/demo-images/branzino.jpg',
    sortOrder: 0,
    allergens: ['Pesce'],
    i18n: {
      en: { name: 'Sea bass fillet', desc: 'Baked sea bass with seasonal vegetables, lemon and thyme.' },
      de: { name: 'Wolfsbarschfilet', desc: 'Gebackener Wolfsbarsch mit Saisongemüse, Zitrone und Thymian.' },
      fr: { name: 'Filet de bar', desc: 'Bar au four avec légumes de saison, citron et thym.' },
      vec: { name: 'Fileto de branzin', desc: 'Branzin al forno co verdure de stagion, limon e timo.' },
    },
  },
  {
    id: 'demo-entry-tagliata',
    categoryId: 'demo-cat-mains',
    name: 'Tagliata di manzo',
    description: 'Manzo scottato, rucola, scaglie di grana e riduzione al balsamico.',
    price: 2400,
    imageUrl: '/demo-images/tagliata.jpg',
    sortOrder: 1,
    allergens: ['Latte-e-Derivati'],
    i18n: {
      en: { name: 'Sliced beef tagliata', desc: 'Seared beef with arugula, parmesan flakes and balsamic reduction.' },
      de: { name: 'Rindertagliata', desc: 'Kurz gebratenes Rindfleisch mit Rucola, Parmesan und Balsamico-Reduktion.' },
      fr: { name: 'Tagliata de bœuf', desc: 'Bœuf saisi, roquette, copeaux de parmesan et réduction balsamique.' },
      vec: { name: 'Taiata de manzo', desc: 'Manzo scotà, rucola, scaie de grana e ridusion al balsamico.' },
    },
  },
  {
    id: 'demo-entry-tiramisu',
    categoryId: 'demo-cat-desserts',
    name: 'Tiramisù della casa',
    description: 'Mascarpone, caffè e cacao.',
    price: 650,
    imageUrl: '/demo-images/tiramisu.jpg',
    sortOrder: 0,
    allergens: ['Uova', 'Latte-e-Derivati', 'Glutine'],
    i18n: {
      en: { name: 'House tiramisu', desc: 'Mascarpone, coffee and cocoa.' },
      de: { name: 'Hausgemachtes Tiramisù', desc: 'Mascarpone, Kaffee und Kakao.' },
      fr: { name: 'Tiramisu maison', desc: 'Mascarpone, café et cacao.' },
      vec: { name: 'Tiramisù de casa', desc: 'Mascarpone, cafè e cacao.' },
    },
  },
  {
    id: 'demo-entry-prosecco',
    categoryId: 'demo-cat-wines',
    name: 'Prosecco Brut',
    description: 'Calice di prosecco fresco e floreale.',
    price: 550,
    imageUrl: '/demo-images/prosecco.jpg',
    sortOrder: 0,
    allergens: ['Anidride-Solforosa-e-Solfiti'],
    i18n: {
      en: { name: 'Prosecco Brut', desc: 'A fresh and floral glass of prosecco.' },
      de: { name: 'Prosecco Brut', desc: 'Ein frisches, blumiges Glas Prosecco.' },
      fr: { name: 'Prosecco Brut', desc: 'Un verre de prosecco frais et floral.' },
      vec: { name: 'Prosecco Brut', desc: 'Un calice de prosecco fresco e fiorìo.' },
    },
  },
];

const variants = [
  { id: 'demo-variant-pasta-size', name: 'Porzione', description: 'Scegli la dimensione', sortOrder: 0, selections: [{ id: 'regular', name: 'Normale', price: 0 }, { id: 'large', name: 'Abbondante', price: 300 }], i18n: { en: { name: 'Portion', desc: 'Choose the size' } } },
];

const extras = [
  { id: 'demo-extra-bread', name: 'Pane extra', type: 'zeroorone', max: 1, options: [{ id: 'bread', name: 'Pane extra', price: 150 }], i18n: { en: { name: 'Extra bread' } } },
];

export async function resetDemoData(env: Env): Promise<void> {
  if (!env.DB) throw new Error('Database not configured');

  const statements: D1PreparedStatement[] = [
    env.DB.prepare('DELETE FROM catalog_views'),
    env.DB.prepare('DELETE FROM chat_sessions'),
    env.DB.prepare('DELETE FROM audit_events'),
    env.DB.prepare('DELETE FROM menu_entries'),
    env.DB.prepare('DELETE FROM menu_categories'),
    env.DB.prepare('DELETE FROM menus'),
    env.DB.prepare('DELETE FROM menu_variants'),
    env.DB.prepare('DELETE FROM menu_extras'),
    env.DB.prepare(`UPDATE settings SET name = ?, payoff = ?, theme = ?, info = ?, socials = ?, opening_schedule = ?, promotion_alert = ?, chat_agent_prompt = ?, ai_chat_enabled = ?, enabled_locales = ?, disabled_locales = ?, custom_locales = ?, publication_state = ?, updated_at = ? WHERE id = 1`).bind(
      settings.name,
      settings.payoff,
      JSON.stringify(settings.theme),
      JSON.stringify(settings.info),
      JSON.stringify(settings.socials),
      JSON.stringify(settings.openingSchedule),
      JSON.stringify(settings.promotionAlert),
      settings.chatAgentPrompt,
      settings.aiChatEnabled ? 1 : 0,
      JSON.stringify(settings.enabledLocales),
      JSON.stringify(settings.disabledLocales),
      JSON.stringify(settings.customLocales),
      settings.publicationState,
      Date.now(),
    ),
  ];

  for (const menu of menus) {
    statements.push(env.DB.prepare('INSERT INTO menus (id, code, title, i18n, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').bind(menu.id, menu.code, menu.title, JSON.stringify(menu.i18n), now, now));
  }
  for (const category of categories) {
    statements.push(env.DB.prepare('INSERT INTO menu_categories (id, menu_id, name, sort_order, i18n, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(category.id, category.menuId, category.name, category.sortOrder, JSON.stringify(category.i18n), now, now));
  }
  for (const entry of entries) {
    statements.push(env.DB.prepare('INSERT INTO menu_entries (id, category_id, name, description, price, image_url, sort_order, visibility, allergens, i18n, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(entry.id, entry.categoryId, entry.name, entry.description, entry.price, entry.imageUrl, entry.sortOrder, 'all', JSON.stringify(entry.allergens), JSON.stringify(entry.i18n), now, now));
  }
  for (const variant of variants) {
    statements.push(env.DB.prepare('INSERT INTO menu_variants (id, name, description, sort_order, selections, i18n, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(variant.id, variant.name, variant.description, variant.sortOrder, JSON.stringify(variant.selections), JSON.stringify(variant.i18n), now, now));
  }
  for (const extra of extras) {
    statements.push(env.DB.prepare('INSERT INTO menu_extras (id, name, type, max, options, i18n, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(extra.id, extra.name, extra.type, extra.max, JSON.stringify(extra.options), JSON.stringify(extra.i18n), now, now));
  }

  await env.DB.batch(statements);
  await deleteR2Prefix(env.PUBLIC_MENU_BUCKET, 'images/');
}

async function deleteR2Prefix(bucket: R2Bucket | undefined, prefix: string): Promise<void> {
  if (!bucket) return;

  let cursor: string | undefined;
  do {
    const listed = await bucket.list({ prefix, cursor });
    await Promise.all(listed.objects.map((object) => bucket.delete(object.key)));
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
}
