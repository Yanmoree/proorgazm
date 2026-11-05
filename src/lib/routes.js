// Старые адреса (этого сайта и proorgazm.ru) → новые английские.
// Используется и на фронте (клиентский редирект), и на сервере (301).

export const SLUG_RENAMES = {
  massages: {
    'massage-v-4-ruki': 'four-hands-massage',
    'massage-dlya-zheny': 'massage-for-wife-with-husband',
  },
  masters: {
    'sergej-bog': 'sergey-bogdanov',
    ilya: 'ilya-sobolev',
    'andrey-stahov': 'andrey-stakhov',
    eduard: 'eduard-bondarenko',
  },
  articles: {
    'chem-massazh-luchshe-seksa': 'why-massage-is-better-than-sex',
    'eroticheskij-massazh': 'erotic-massage',
    'eroticheskij-massazh-dlya-par': 'erotic-massage-for-couples',
    'eroticheskij-massazh-vs-stress': 'erotic-massage-vs-stress',
    'gde-nahoditsja-tochka-g': 'where-is-the-g-spot',
    'intimnyj-massazh-joni-preklonenie-pered-zhenskoj-krasotoj': 'yoni-massage-celebrating-female-beauty',
    'kak-ehroticheskij-massazh-uchit-k-lyubvi-k-sebe': 'massage-and-self-love',
    'kak-izbavitsja-ot-seksualnih-kompleksov': 'how-to-overcome-sexual-insecurities',
    'kak-podnjat-libido': 'how-to-boost-libido',
    'kak-vernut-interes-k-zhizni-cherez-rabotu-s-telom': 'regain-interest-in-life-through-body-work',
    'kak-vosstanovit-svyaz-mezhdu-telom-i-ehmociyami-intimnyj-massazh-kak-sposob-poznakomitsya-so-svoim-telom': 'reconnect-body-and-emotions',
    'massazh-v-proorgazm-luchshe-chem-znakomstva-na-sajtah': 'massage-vs-dating-sites',
    'plyusy-eroticheskogo-massazha-dlya-zhenshchin': 'benefits-of-erotic-massage-for-women',
    'pochemu-ehmocionalnaya-razgruzka-i-kachestvennoe-rasslablenie-povyshayut-produktivnost': 'emotional-release-and-productivity',
    'pochemu-ehmocionalnaya-razgruzka-povyshaet-produktivnost': 'emotional-release-and-productivity',
    'podavlenie-ehmocij-i-zhelanij-zhenshchin-pochemu-ehto-proiskhodit-i-kak-s-ehtim-borotsya': 'suppressed-emotions-and-desires-in-women',
    'polza-eromassazha': 'erotic-massage-benefits',
    'polza-eroticheskogo-massazha-dlya-zhenshchin': 'health-benefits-of-erotic-massage-for-women',
    'sekret-joni-massazha': 'secret-of-yoni-massage',
    'seksualnost-i-samoocenka-kakaya-svyaz': 'sexuality-and-self-esteem',
    skvirt: 'squirting-orgasm',
    swinger: 'swinging',
    'vibrator-dlya-tochki-g-osobennosti-konstrukcii-i-vybor-modeli': 'g-spot-vibrator-guide',
    'vidy-vibratorov-dlya-zhenshchin-chem-otlichayutsya-raznye-modeli': 'types-of-vibrators-for-women',
    'kak-govorit-s-partnerom-o-svoikh-zhelaniyakh-bez-stesneniya': 'talking-to-your-partner-about-desires',
    'kak-smena-obstanovki-pomogaet-ehmocionalno-perezagruzitsya': 'change-of-scenery-emotional-reset',
  },
}

const SECTIONS = [
  { old: ['massazhi'], now: 'massages', slugs: 'massages' },
  { old: ['massazhisty'], now: 'masters', slugs: 'masters' },
  { old: ['stati'], now: 'blog', slugs: 'articles' },
  { old: ['otzyvy'], now: 'reviews' },
  { old: ['kontakty'], now: 'contacts' },
]

const rename = (kind, slug) => SLUG_RENAMES[kind]?.[slug] || slug

export function legacyRedirect(pathname) {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean)
  if (!parts.length) return null

  // Страницы мастеров на оригинальном сайте жили в корне: /sergej-bog
  if (parts.length === 1 && SLUG_RENAMES.masters[parts[0]]) return `/masters/${SLUG_RENAMES.masters[parts[0]]}`
  if (parts.length === 1 && SLUG_RENAMES.articles[parts[0]]) return `/blog/${SLUG_RENAMES.articles[parts[0]]}`

  const section = SECTIONS.find((s) => s.old.includes(parts[0]) || s.now === parts[0])
  if (!section) return null
  // Страницы списка блога оригинала: /stati/p/1 — это вторая страница
  if (section.now === 'blog' && parts[1] === 'p' && /^\d+$/.test(parts[2] || '')) {
    const n = Number(parts[2]) + 1
    return n > 1 ? `/blog?page=${n}` : '/blog'
  }
  // /stati/post/slug — формат статей оригинального сайта
  const rest = parts[1] === 'post' ? parts.slice(2) : parts.slice(1)
  const slug = rest[0]
  const next = `/${section.now}${slug ? `/${section.slugs ? rename(section.slugs, slug) : slug}` : ''}`
  return next === `/${parts.join('/')}` ? null : next
}
