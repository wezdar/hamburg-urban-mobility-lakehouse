export type Language = "de" | "en" | "fr" | "ar";

type SourceCopy = {
  domain: string;
  shortName: string;
  description: string;
};

export type Translation = {
  locale: string;
  direction: "ltr" | "rtl";
  languageName: string;
  languageSelector: string;
  brandLabel: string;
  navLabel: string;
  nav: { overview: string; sources: string; network: string; pipeline: string; quality: string };
  live: { live: string; connecting: string; snapshot: string };
  time: { seconds: string; minutes: string; hours: string };
  hero: { eyebrow: string; title: string; accent: string; description: string; streams: string };
  metrics: {
    aria: string;
    streams: string;
    streamsNote: string;
    history: string;
    historyNote: string;
    sample: string;
    sampleNote: string;
    coverage: string;
    coverageNote: string;
  };
  atlas: {
    eyebrow: string;
    title: string;
    accent: string;
    description: string;
    live: string;
    streams: string;
    since: string;
    eventDriven: string;
    officialSource: string;
    coverage: string;
    openSource: string;
  };
  sources: Record<string, SourceCopy>;
  status: { all: string; healthy: string; low: string; empty: string; stale: string };
  map: {
    title: string;
    filterAria: string;
    mapAria: string;
    stationsInView: string;
    bikes: string;
  };
  ranking: { title: string; bikes: string; download: string };
  chart: {
    title: string;
    rangeAria: string;
    average: string;
    sampledStations: string;
    aria: string;
    observations: string;
  };
  quality: {
    title: string;
    sourcesVerified: string;
    provenance: string;
    provenanceNote: string;
    identity: string;
    identityNote: string;
    cadence: string;
    cadenceNote: string;
  };
  pipeline: {
    eyebrow: string;
    title: string;
    accent: string;
    description: string;
    sourceDomains: string;
    officialStreams: string;
    bronze: string;
    bronzeNote: string;
    silver: string;
    silverNote: string;
    gold: string;
    goldNote: string;
  };
  footer: { builtWith: string; dataSource: string };
};

export const languageOptions: Array<{ code: Language; short: string; name: string }> = [
  { code: "de", short: "DE", name: "Deutsch" },
  { code: "en", short: "EN", name: "English" },
  { code: "fr", short: "FR", name: "Français" },
  { code: "ar", short: "AR", name: "العربية" },
];

export const translations: Record<Language, Translation> = {
  de: {
    locale: "de-DE",
    direction: "ltr",
    languageName: "Deutsch",
    languageSelector: "Sprache auswählen",
    brandLabel: "ElbeFlow Übersicht",
    navLabel: "Dashboard-Bereiche",
    nav: { overview: "Übersicht", sources: "Quellen", network: "Netzwerk", pipeline: "Pipeline", quality: "Qualität" },
    live: { live: "LIVE-DATEN", connecting: "VERBINDUNG", snapshot: "LETZTER SNAPSHOT" },
    time: { seconds: "vor {value} Sek.", minutes: "vor {value} Min.", hours: "vor {value} Std." },
    hero: {
      eyebrow: "Hamburgs urbane Datenintelligenz",
      title: "Mobilität,",
      accent: "in Bewegung.",
      description: "Ein produktionsnahes Lakehouse, das {count} offizielle Hamburger Systeme zu verlässlichen, entscheidungsreifen Daten verbindet.",
      streams: "Datenströme",
    },
    metrics: {
      aria: "Kennzahlen des Mobilitätsnetzwerks",
      streams: "Datenströme",
      streamsNote: "Aus {count} offiziellen Datenbereichen",
      history: "Historisches Potenzial",
      historyNote: "Abdeckungsschätzung · Ereignisfeeds ausgenommen",
      sample: "Verifizierte Stichprobe",
      sampleNote: "Reale Datensätze für reproduzierbare Prüfung",
      coverage: "Historische Abdeckung",
      coverageNote: "{year} → live",
    },
    atlas: {
      eyebrow: "Offizielles Datenuniversum",
      title: "Fünf Systeme.",
      accent: "Ein urbaner Puls.",
      description: "Die Plattform verbindet Leihfahrräder, permanente Radzählstellen, Straßenverkehr, Ladeinfrastruktur und Lichtsignalsteuerung. Die Anzahlen stammen direkt aus Hamburgs SensorThings-APIs.",
      live: "LIVE",
      streams: "Sensorströme",
      since: "Seit",
      eventDriven: "ereignisbasiert",
      officialSource: "Offizielle Quelle ↗",
      coverage: "Historische Abdeckung",
      openSource: "Offiziellen Datensatz öffnen",
    },
    sources: {
      "traffic-lights": { domain: "Signale", shortName: "Verkehrssteuerung", description: "Signalzustände, Detektoranfragen, ÖPNV-Meldungen und Umlaufphasen." },
      "ev-charging": { domain: "Energie", shortName: "E-Ladepunkte", description: "Verfügbarkeitsstatus öffentlicher Ladepunkte im Hamburger Stadtgebiet." },
      "motor-traffic": { domain: "Straße", shortName: "Kfz-Verkehr", description: "Viertelstündliche Fahrzeugmengen automatisierter Infrarot-Zählstellen." },
      "cycle-counters": { domain: "Radverkehr", shortName: "Radzählstellen", description: "Fünfminütige Radverkehrsmengen des permanenten Hamburger Zählnetzes." },
      stadtrad: { domain: "Geteilte Mobilität", shortName: "StadtRAD", description: "Live-Verfügbarkeit und historische Messwerte der Fahrradstationen." },
    },
    status: { all: "Alle", healthy: "Verfügbar", low: "Wenig", empty: "Leer", stale: "Veraltet" },
    map: {
      title: "StadtRAD live",
      filterAria: "Karte nach Stationsstatus filtern",
      mapAria: "Geografische Verteilung der StadtRAD-Stationen",
      stationsInView: "Stationen im Ausschnitt",
      bikes: "Räder",
    },
    ranking: { title: "Höchster Bestand", bikes: "RÄDER", download: "{count} reale Zeilen herunterladen" },
    chart: {
      title: "Verfügbarkeitsrhythmus",
      rangeAria: "Zeitraum des Diagramms",
      average: "durchschnittliche Fahrräder",
      sampledStations: "an ausgewählten Stationen",
      aria: "Durchschnittlich verfügbare Fahrräder über {range}",
      observations: "Beobachtungen",
    },
    quality: {
      title: "Datenvertrag",
      sourcesVerified: "Quellen verifiziert",
      provenance: "Quellenherkunft",
      provenanceNote: "Offizielle URLs und Lizenzen bleiben erhalten",
      identity: "Zusammengesetzte Identität",
      identityNote: "Deduplizierung nach Quelle + Beobachtungs-ID",
      cadence: "Taktverträge",
      cadenceNote: "5 Min., 15 Min. und ereignisbasierte Feeds",
    },
    pipeline: {
      eyebrow: "Lakehouse-Architektur",
      title: "Vom Rohsignal",
      accent: "zur verlässlichen Kennzahl.",
      description: "Wiederholbare Ingestion, quellenbezogene Partitionen und getestete Transformationen. Ausgelegt für mehr als 450 Mio. geplante Beobachtungen plus ereignisbasierte Hamburger Feeds.",
      sourceDomains: "5 Datenbereiche",
      officialStreams: "84K+ offizielle Ströme",
      bronze: "Bronze",
      bronzeNote: "Gzip JSON · unveränderlich",
      silver: "Silver",
      silverNote: "Parquet · partitioniert",
      gold: "Gold",
      goldNote: "DuckDB · dbt Marts",
    },
    footer: { builtWith: "Erstellt mit öffentlichen Daten der Freien und Hansestadt Hamburg.", dataSource: "DATENQUELLE ↗" },
  },
  en: {
    locale: "en-GB",
    direction: "ltr",
    languageName: "English",
    languageSelector: "Select language",
    brandLabel: "ElbeFlow overview",
    navLabel: "Dashboard sections",
    nav: { overview: "Overview", sources: "Sources", network: "Network", pipeline: "Pipeline", quality: "Quality" },
    live: { live: "LIVE DATA", connecting: "CONNECTING", snapshot: "LATEST SNAPSHOT" },
    time: { seconds: "{value}s ago", minutes: "{value}m ago", hours: "{value}h ago" },
    hero: {
      eyebrow: "Hamburg urban intelligence",
      title: "Mobility,",
      accent: "in motion.",
      description: "A production-minded lakehouse joining {count} official Hamburg systems into trusted, decision-ready data.",
      streams: "streams",
    },
    metrics: {
      aria: "Live network metrics",
      streams: "Signal streams",
      streamsNote: "Across {count} official data domains",
      history: "Scheduled history",
      historyNote: "Coverage estimate · event feeds excluded",
      sample: "Verified sample",
      sampleNote: "Real rows committed for reproducible review",
      coverage: "Historical coverage",
      coverageNote: "{year} → live",
    },
    atlas: {
      eyebrow: "Official data universe",
      title: "Five systems.",
      accent: "One urban pulse.",
      description: "The platform joins shared bicycles, permanent cycle counters, road traffic, charging infrastructure and signal control. Stream counts come directly from Hamburg's SensorThings APIs.",
      live: "LIVE",
      streams: "sensor streams",
      since: "Since",
      eventDriven: "event-driven",
      officialSource: "Official source ↗",
      coverage: "Historical coverage",
      openSource: "Open official dataset",
    },
    sources: {
      "traffic-lights": { domain: "signals", shortName: "Traffic control", description: "Signals, detector calls, public-transport requests and cycle phases." },
      "ev-charging": { domain: "energy", shortName: "EV charging", description: "Availability status for public charging points across Hamburg." },
      "motor-traffic": { domain: "road", shortName: "Motor traffic", description: "Quarter-hour vehicle volumes from automated infrared counters." },
      "cycle-counters": { domain: "cycling", shortName: "Cycle counters", description: "Five-minute bicycle flows from Hamburg's permanent counting network." },
      stadtrad: { domain: "shared mobility", shortName: "StadtRAD", description: "Live bicycle availability and historical station observations." },
    },
    status: { all: "All", healthy: "Available", low: "Low stock", empty: "Empty", stale: "Stale" },
    map: {
      title: "StadtRAD live pulse",
      filterAria: "Filter map by station status",
      mapAria: "Geographic distribution of StadtRAD stations",
      stationsInView: "stations in view",
      bikes: "bikes",
    },
    ranking: { title: "Highest supply", bikes: "BIKES", download: "Download {count} real rows" },
    chart: {
      title: "Availability rhythm",
      rangeAria: "Chart time range",
      average: "average bicycles",
      sampledStations: "across sampled stations",
      aria: "Average available bicycles over {range}",
      observations: "observations",
    },
    quality: {
      title: "Data contract",
      sourcesVerified: "sources verified",
      provenance: "Source provenance",
      provenanceNote: "Official URLs and licences retained",
      identity: "Composite identity",
      identityNote: "Source + observation ID deduplication",
      cadence: "Cadence contracts",
      cadenceNote: "5 min, 15 min and event-driven feeds",
    },
    pipeline: {
      eyebrow: "Lakehouse architecture",
      title: "From raw signal",
      accent: "to trusted metric.",
      description: "Replay-safe ingestion, source-aware partitions and tested transformations. Designed for 450M+ scheduled observations plus Hamburg's event-driven feeds.",
      sourceDomains: "5 source domains",
      officialStreams: "84K+ official streams",
      bronze: "Bronze",
      bronzeNote: "Gzip JSON · immutable",
      silver: "Silver",
      silverNote: "Parquet · partitioned",
      gold: "Gold",
      goldNote: "DuckDB · dbt marts",
    },
    footer: { builtWith: "Built with public data from the Freie und Hansestadt Hamburg.", dataSource: "DATA SOURCE ↗" },
  },
  fr: {
    locale: "fr-FR",
    direction: "ltr",
    languageName: "Français",
    languageSelector: "Choisir la langue",
    brandLabel: "Vue d'ensemble ElbeFlow",
    navLabel: "Sections du tableau de bord",
    nav: { overview: "Vue d'ensemble", sources: "Sources", network: "Réseau", pipeline: "Pipeline", quality: "Qualité" },
    live: { live: "DONNÉES LIVE", connecting: "CONNEXION", snapshot: "DERNIER SNAPSHOT" },
    time: { seconds: "il y a {value} s", minutes: "il y a {value} min", hours: "il y a {value} h" },
    hero: {
      eyebrow: "Intelligence urbaine de Hambourg",
      title: "La mobilité,",
      accent: "en mouvement.",
      description: "Un lakehouse orienté production qui réunit {count} systèmes officiels de Hambourg en données fiables et prêtes à décider.",
      streams: "flux",
    },
    metrics: {
      aria: "Indicateurs du réseau de mobilité",
      streams: "Flux de données",
      streamsNote: "Répartis sur {count} domaines officiels",
      history: "Historique potentiel",
      historyNote: "Estimation de couverture · événements exclus",
      sample: "Échantillon vérifié",
      sampleNote: "Lignes réelles pour une revue reproductible",
      coverage: "Couverture historique",
      coverageNote: "{year} → live",
    },
    atlas: {
      eyebrow: "Univers officiel des données",
      title: "Cinq systèmes.",
      accent: "Un pouls urbain.",
      description: "La plateforme réunit vélos partagés, compteurs cyclistes permanents, trafic routier, infrastructure de recharge et signalisation. Les volumes viennent directement des API SensorThings de Hambourg.",
      live: "LIVE",
      streams: "flux capteurs",
      since: "Depuis",
      eventDriven: "événementiel",
      officialSource: "Source officielle ↗",
      coverage: "Couverture historique",
      openSource: "Ouvrir le jeu de données officiel",
    },
    sources: {
      "traffic-lights": { domain: "signaux", shortName: "Régulation du trafic", description: "Signaux, appels des détecteurs, requêtes des transports publics et cycles." },
      "ev-charging": { domain: "énergie", shortName: "Recharge électrique", description: "Disponibilité des points de recharge publics dans Hambourg." },
      "motor-traffic": { domain: "route", shortName: "Trafic automobile", description: "Volumes de véhicules par quart d'heure issus de compteurs infrarouges." },
      "cycle-counters": { domain: "vélo", shortName: "Compteurs cyclistes", description: "Flux cyclistes toutes les cinq minutes sur le réseau permanent." },
      stadtrad: { domain: "mobilité partagée", shortName: "StadtRAD", description: "Disponibilité en direct et observations historiques des stations." },
    },
    status: { all: "Toutes", healthy: "Disponible", low: "Stock faible", empty: "Vide", stale: "Obsolète" },
    map: {
      title: "Pouls StadtRAD en direct",
      filterAria: "Filtrer la carte par état de station",
      mapAria: "Répartition géographique des stations StadtRAD",
      stationsInView: "stations affichées",
      bikes: "vélos",
    },
    ranking: { title: "Disponibilité maximale", bikes: "VÉLOS", download: "Télécharger {count} lignes réelles" },
    chart: {
      title: "Rythme de disponibilité",
      rangeAria: "Période du graphique",
      average: "vélos disponibles en moyenne",
      sampledStations: "sur les stations échantillonnées",
      aria: "Moyenne des vélos disponibles sur {range}",
      observations: "observations",
    },
    quality: {
      title: "Contrat de données",
      sourcesVerified: "sources vérifiées",
      provenance: "Provenance des sources",
      provenanceNote: "URLs officielles et licences conservées",
      identity: "Identité composite",
      identityNote: "Déduplication par source + identifiant",
      cadence: "Contrats de fréquence",
      cadenceNote: "5 min, 15 min et flux événementiels",
    },
    pipeline: {
      eyebrow: "Architecture lakehouse",
      title: "Du signal brut",
      accent: "à l'indicateur fiable.",
      description: "Ingestion rejouable, partitions par source et transformations testées. Conçu pour plus de 450 M d'observations planifiées, auxquelles s'ajoutent les flux événementiels de Hambourg.",
      sourceDomains: "5 domaines sources",
      officialStreams: "84K+ flux officiels",
      bronze: "Bronze",
      bronzeNote: "Gzip JSON · immuable",
      silver: "Silver",
      silverNote: "Parquet · partitionné",
      gold: "Gold",
      goldNote: "DuckDB · marts dbt",
    },
    footer: { builtWith: "Construit avec les données publiques de la Ville libre et hanséatique de Hambourg.", dataSource: "SOURCE DES DONNÉES ↗" },
  },
  ar: {
    locale: "ar-EG-u-nu-latn",
    direction: "rtl",
    languageName: "العربية",
    languageSelector: "اختر اللغة",
    brandLabel: "نظرة عامة على ElbeFlow",
    navLabel: "أقسام لوحة المعلومات",
    nav: { overview: "نظرة عامة", sources: "المصادر", network: "الشبكة", pipeline: "خط البيانات", quality: "الجودة" },
    live: { live: "بيانات مباشرة", connecting: "جارٍ الاتصال", snapshot: "آخر لقطة" },
    time: { seconds: "منذ {value} ث", minutes: "منذ {value} د", hours: "منذ {value} س" },
    hero: {
      eyebrow: "ذكاء التنقل الحضري في هامبورغ",
      title: "التنقل،",
      accent: "في حركة.",
      description: "بحيرة بيانات جاهزة للإنتاج تجمع {count} أنظمة رسمية في هامبورغ وتحولها إلى بيانات موثوقة تدعم القرار.",
      streams: "تدفق بيانات",
    },
    metrics: {
      aria: "مؤشرات شبكة التنقل",
      streams: "تدفقات الإشارات",
      streamsNote: "عبر {count} مجالات بيانات رسمية",
      history: "السجل الزمني المتوقع",
      historyNote: "تقدير التغطية · لا يشمل التدفقات الحدثية",
      sample: "عينة موثقة",
      sampleNote: "سجلات حقيقية لمراجعة قابلة للتكرار",
      coverage: "التغطية التاريخية",
      coverageNote: "{year} ← مباشر",
    },
    atlas: {
      eyebrow: "منظومة البيانات الرسمية",
      title: "خمسة أنظمة.",
      accent: "نبض حضري واحد.",
      description: "تجمع المنصة الدراجات المشتركة وعدادات الدراجات وحركة الطرق ومحطات الشحن وإشارات المرور. تأتي أعداد التدفقات مباشرة من واجهات SensorThings الرسمية في هامبورغ.",
      live: "مباشر",
      streams: "تدفقات حساسات",
      since: "منذ",
      eventDriven: "قائم على الأحداث",
      officialSource: "المصدر الرسمي ↗",
      coverage: "التغطية التاريخية",
      openSource: "فتح مجموعة البيانات الرسمية",
    },
    sources: {
      "traffic-lights": { domain: "الإشارات", shortName: "التحكم المروري", description: "حالات الإشارات وطلبات الكواشف والنقل العام ومراحل الدورات." },
      "ev-charging": { domain: "الطاقة", shortName: "شحن المركبات", description: "حالة توفر نقاط الشحن العامة في أنحاء هامبورغ." },
      "motor-traffic": { domain: "الطرق", shortName: "حركة المركبات", description: "أحجام المركبات كل 15 دقيقة من العدادات الآلية بالأشعة تحت الحمراء." },
      "cycle-counters": { domain: "الدراجات", shortName: "عدادات الدراجات", description: "تدفقات الدراجات كل خمس دقائق ضمن شبكة العد الدائمة." },
      stadtrad: { domain: "تنقل مشترك", shortName: "StadtRAD", description: "توفر الدراجات مباشرة والمشاهدات التاريخية للمحطات." },
    },
    status: { all: "الكل", healthy: "متاح", low: "مخزون منخفض", empty: "فارغ", stale: "قديم" },
    map: {
      title: "نبض StadtRAD المباشر",
      filterAria: "تصفية الخريطة حسب حالة المحطة",
      mapAria: "التوزيع الجغرافي لمحطات StadtRAD",
      stationsInView: "محطة ظاهرة",
      bikes: "دراجة",
    },
    ranking: { title: "أعلى توفر", bikes: "دراجة", download: "تنزيل {count} سجل حقيقي" },
    chart: {
      title: "إيقاع التوفر",
      rangeAria: "النطاق الزمني للرسم",
      average: "متوسط الدراجات المتاحة",
      sampledStations: "عبر المحطات المختارة",
      aria: "متوسط الدراجات المتاحة خلال {range}",
      observations: "مشاهدة",
    },
    quality: {
      title: "عقد البيانات",
      sourcesVerified: "مصادر موثقة",
      provenance: "مصدر البيانات",
      provenanceNote: "الاحتفاظ بالروابط والتراخيص الرسمية",
      identity: "هوية مركبة",
      identityNote: "إزالة التكرار حسب المصدر ومعرف المشاهدة",
      cadence: "عقود التواتر",
      cadenceNote: "5 دقائق و15 دقيقة وتدفقات حدثية",
    },
    pipeline: {
      eyebrow: "بنية بحيرة البيانات",
      title: "من الإشارة الخام",
      accent: "إلى مؤشر موثوق.",
      description: "استيعاب قابل للإعادة وتقسيم حسب المصدر وتحويلات مختبرة. مصمم لأكثر من 450 مليون مشاهدة مجدولة إضافة إلى تدفقات هامبورغ الحدثية.",
      sourceDomains: "5 مجالات بيانات",
      officialStreams: "+84K تدفق رسمي",
      bronze: "Bronze",
      bronzeNote: "Gzip JSON · غير قابل للتغيير",
      silver: "Silver",
      silverNote: "Parquet · مقسم",
      gold: "Gold",
      goldNote: "DuckDB · نماذج dbt",
    },
    footer: { builtWith: "مبني باستخدام البيانات العامة لمدينة هامبورغ الحرة والهانزية.", dataSource: "مصدر البيانات ↗" },
  },
};

export function interpolate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}
