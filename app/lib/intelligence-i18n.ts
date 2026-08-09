import type { Language } from "./i18n";

type IntelligenceCopy = {
  nav: { intelligence: string; operations: string };
  map: {
    layers: string;
    bikes: string;
    traffic: string;
    transit: string;
    all: string;
    clearTitle: string;
    close: string;
    departures: string;
    lines: string;
    officialLayers: string;
    loading: string;
    unavailable: string;
    resetView: string;
    zoom: string;
    coordinates: string;
  };
  intelligence: {
    eyebrow: string;
    title: string;
    accent: string;
    description: string;
    events: string;
    hubs: string;
    forecast: string;
    confidence: string;
    forecastTitle: string;
    forecastNote: string;
    historyTitle: string;
    historyNote: string;
    activeDomains: string;
    annualCapacity: string;
    selectedYear: string;
  };
  operations: {
    eyebrow: string;
    title: string;
    description: string;
    alerts: string;
    alertsNote: string;
    stale: string;
    empty: string;
    closure: string;
    sustainability: string;
    co2: string;
    co2Note: string;
    modelTitle: string;
    modelNote: string;
    mae: string;
    holdout: string;
  };
  lineage: {
    eyebrow: string;
    title: string;
    accent: string;
    description: string;
    healthy: string;
    cloudReady: string;
    source: string;
    ingest: string;
    bronze: string;
    silver: string;
    quality: string;
    warehouse: string;
    api: string;
    product: string;
  };
};

export const intelligenceTranslations: Record<Language, IntelligenceCopy> = {
  de: {
    nav: { intelligence: "Intelligenz", operations: "Betrieb" },
    map: {
      layers: "Kartenebenen", bikes: "StadtRAD", traffic: "Verkehr", transit: "HVV", all: "Alle",
      clearTitle: "Interaktive Vektorkarte von ganz Hamburg", close: "Details schließen",
      departures: "Abfahrten", lines: "Linien", officialLayers: "3 geocodierte Mobilitätsebenen",
      loading: "Hamburg-Karte wird geladen", unavailable: "Die Kartenebene ist momentan nicht erreichbar.",
      resetView: "Ganz Hamburg", zoom: "Zoom", coordinates: "Offizielle Koordinaten",
    },
    intelligence: {
      eyebrow: "Prädiktive Mobilität", title: "Stadt verstehen.", accent: "Bevor sie reagiert.",
      description: "Offizielle Verkehrs- und HVV-Geodaten treffen auf erklärbare Prognosen und einen reproduzierbaren historischen Backfill.",
      events: "aktive Meldungen", hubs: "HVV-Knoten", forecast: "Prognosepunkte", confidence: "Modellvertrauen",
      forecastTitle: "12-Stunden-Verfügbarkeitsprognose", forecastNote: "Saisonale Baseline mit ehrlichem Konfidenzband.",
      historyTitle: "Historischer Explorer", historyNote: "Zeigt die reproduzierbare Quellenabdeckung - keine erfundenen Messwerte.",
      activeDomains: "aktive Bereiche", annualCapacity: "jährliche geplante Kapazität", selectedYear: "ausgewähltes Jahr",
    },
    operations: {
      eyebrow: "Betriebszentrale", title: "Anomalien, Wirkung und Modellgüte.",
      description: "Der operative Bereich macht Datenprobleme, Schließungen und Annahmen sichtbar, bevor Entscheidungen getroffen werden.",
      alerts: "Priorisierte Warnungen", alertsNote: "Direkt aus Stationsstatus und Polizeimeldungen berechnet.",
      stale: "Veraltete Station", empty: "Leere Station", closure: "Straßensperrung",
      sustainability: "Nachhaltigkeitsszenario", co2: "kg CO₂ potenziell vermieden", co2Note: "Transparente Szenarioschätzung, keine gemessene Emission.",
      modelTitle: "Erklärbare Modellkarte", modelNote: "Moving-average Baseline, rückgetestet auf den letzten Stunden.",
      mae: "mittlerer absoluter Fehler", holdout: "Backtest-Punkte",
    },
    lineage: {
      eyebrow: "Observability & Cloud", title: "Jede Kennzahl.", accent: "Vollständig nachvollziehbar.",
      description: "Die Datenlinie verbindet sieben offizielle Ebenen mit Qualität, Warehouse, API und Produkt. Terraform, Container und OpenTelemetry bilden den Cloud-Pfad.",
      healthy: "gesund", cloudReady: "cloud-ready", source: "7 Quellen", ingest: "Ingestion", bronze: "Bronze",
      silver: "Silver", quality: "Verträge", warehouse: "DuckDB + dbt", api: "Live API", product: "Dashboard",
    },
  },
  en: {
    nav: { intelligence: "Intelligence", operations: "Operations" },
    map: {
      layers: "Map layers", bikes: "StadtRAD", traffic: "Traffic", transit: "HVV", all: "All",
      clearTitle: "Interactive vector map of greater Hamburg", close: "Close details",
      departures: "departures", lines: "lines", officialLayers: "3 geocoded mobility layers",
      loading: "Loading the Hamburg map", unavailable: "The basemap is temporarily unavailable.",
      resetView: "All Hamburg", zoom: "Zoom", coordinates: "Official coordinates",
    },
    intelligence: {
      eyebrow: "Predictive mobility", title: "Understand the city.", accent: "Before it reacts.",
      description: "Official traffic and HVV geodata meet explainable forecasting and a reproducible historical backfill.",
      events: "active notices", hubs: "HVV hubs", forecast: "forecast points", confidence: "model confidence",
      forecastTitle: "12-hour availability forecast", forecastNote: "Seasonal baseline with an honest confidence band.",
      historyTitle: "Historical explorer", historyNote: "Shows reproducible source coverage - never invented measurements.",
      activeDomains: "active domains", annualCapacity: "annual scheduled capacity", selectedYear: "selected year",
    },
    operations: {
      eyebrow: "Operations centre", title: "Anomalies, impact and model quality.",
      description: "Operational intelligence exposes data issues, closures and assumptions before decisions are made.",
      alerts: "Prioritised alerts", alertsNote: "Computed directly from station status and police notices.",
      stale: "Stale station", empty: "Empty station", closure: "Road closure",
      sustainability: "Sustainability scenario", co2: "kg CO₂ potentially avoided", co2Note: "Transparent scenario estimate, not measured emissions.",
      modelTitle: "Explainable model card", modelNote: "Moving-average baseline back-tested on the latest hourly points.",
      mae: "mean absolute error", holdout: "back-test points",
    },
    lineage: {
      eyebrow: "Observability & cloud", title: "Every metric.", accent: "Fully traceable.",
      description: "Lineage connects seven official layers to quality, warehouse, API and product. Terraform, containers and OpenTelemetry define the cloud path.",
      healthy: "healthy", cloudReady: "cloud-ready", source: "7 sources", ingest: "Ingestion", bronze: "Bronze",
      silver: "Silver", quality: "Contracts", warehouse: "DuckDB + dbt", api: "Live API", product: "Dashboard",
    },
  },
  fr: {
    nav: { intelligence: "Intelligence", operations: "Opérations" },
    map: {
      layers: "Couches cartographiques", bikes: "StadtRAD", traffic: "Trafic", transit: "HVV", all: "Toutes",
      clearTitle: "Carte vectorielle interactive du Grand Hambourg", close: "Fermer les détails",
      departures: "départs", lines: "lignes", officialLayers: "3 couches de mobilité géocodées",
      loading: "Chargement de la carte de Hambourg", unavailable: "Le fond de carte est temporairement indisponible.",
      resetView: "Tout Hambourg", zoom: "Zoom", coordinates: "Coordonnées officielles",
    },
    intelligence: {
      eyebrow: "Mobilité prédictive", title: "Comprendre la ville.", accent: "Avant qu'elle ne réagisse.",
      description: "Les données officielles du trafic et du HVV rencontrent une prévision explicable et un historique reproductible.",
      events: "alertes actives", hubs: "pôles HVV", forecast: "points prévus", confidence: "confiance du modèle",
      forecastTitle: "Prévision de disponibilité sur 12 heures", forecastNote: "Baseline saisonnière avec intervalle de confiance transparent.",
      historyTitle: "Explorateur historique", historyNote: "Affiche la couverture reproductible des sources, sans inventer de mesures.",
      activeDomains: "domaines actifs", annualCapacity: "capacité annuelle planifiée", selectedYear: "année sélectionnée",
    },
    operations: {
      eyebrow: "Centre d'exploitation", title: "Anomalies, impact et qualité du modèle.",
      description: "La vue opérationnelle rend visibles les problèmes, fermetures et hypothèses avant toute décision.",
      alerts: "Alertes prioritaires", alertsNote: "Calculées depuis l'état des stations et les informations de la police.",
      stale: "Station obsolète", empty: "Station vide", closure: "Route fermée",
      sustainability: "Scénario environnemental", co2: "kg de CO₂ potentiellement évités", co2Note: "Estimation transparente, pas une émission mesurée.",
      modelTitle: "Fiche du modèle explicable", modelNote: "Baseline moyenne mobile, rétrotestée sur les dernières heures.",
      mae: "erreur absolue moyenne", holdout: "points de rétrotest",
    },
    lineage: {
      eyebrow: "Observabilité & cloud", title: "Chaque indicateur.", accent: "Entièrement traçable.",
      description: "Le lineage relie sept couches officielles à la qualité, au warehouse, à l'API et au produit. Terraform, les conteneurs et OpenTelemetry définissent le chemin cloud.",
      healthy: "sain", cloudReady: "prêt pour le cloud", source: "7 sources", ingest: "Ingestion", bronze: "Bronze",
      silver: "Silver", quality: "Contrats", warehouse: "DuckDB + dbt", api: "API live", product: "Dashboard",
    },
  },
  ar: {
    nav: { intelligence: "الذكاء", operations: "العمليات" },
    map: {
      layers: "طبقات الخريطة", bikes: "StadtRAD", traffic: "المرور", transit: "HVV", all: "الكل",
      clearTitle: "خريطة متجهة تفاعلية لهامبورغ الكبرى", close: "إغلاق التفاصيل",
      departures: "رحلة", lines: "خطوط", officialLayers: "3 طبقات تنقل محددة جغرافيًا",
      loading: "جارٍ تحميل خريطة هامبورغ", unavailable: "خلفية الخريطة غير متاحة مؤقتًا.",
      resetView: "هامبورغ كاملة", zoom: "التكبير", coordinates: "الإحداثيات الرسمية",
    },
    intelligence: {
      eyebrow: "تنقل تنبؤي", title: "فهم المدينة.", accent: "قبل أن تتفاعل.",
      description: "تجمع المنصة بيانات المرور وHVV الرسمية مع تنبؤ قابل للتفسير وسجل تاريخي قابل لإعادة البناء.",
      events: "تنبيهات نشطة", hubs: "محاور HVV", forecast: "نقاط التنبؤ", confidence: "ثقة النموذج",
      forecastTitle: "توقع التوفر لمدة 12 ساعة", forecastNote: "خط أساس موسمي مع نطاق ثقة واضح.",
      historyTitle: "المستكشف التاريخي", historyNote: "يعرض تغطية المصادر القابلة للتكرار دون اختلاق قياسات.",
      activeDomains: "مجالات نشطة", annualCapacity: "السعة السنوية المجدولة", selectedYear: "السنة المختارة",
    },
    operations: {
      eyebrow: "مركز العمليات", title: "الشذوذ والأثر وجودة النموذج.",
      description: "تعرض الرؤية التشغيلية مشاكل البيانات والإغلاقات والافتراضات قبل اتخاذ القرار.",
      alerts: "تنبيهات مرتبة", alertsNote: "محسوبة مباشرة من حالة المحطات وإشعارات الشرطة.",
      stale: "محطة قديمة", empty: "محطة فارغة", closure: "إغلاق طريق",
      sustainability: "سيناريو الاستدامة", co2: "كغ من CO₂ يمكن تجنبها", co2Note: "تقدير سيناريو شفاف وليس انبعاثات مقاسة.",
      modelTitle: "بطاقة نموذج قابلة للتفسير", modelNote: "خط أساس متوسط متحرك مختبر على أحدث الساعات.",
      mae: "متوسط الخطأ المطلق", holdout: "نقاط الاختبار",
    },
    lineage: {
      eyebrow: "المراقبة والسحابة", title: "كل مؤشر.", accent: "قابل للتتبع بالكامل.",
      description: "يربط مسار البيانات سبع طبقات رسمية بالجودة والمستودع والواجهة والمنتج. تحدد Terraform والحاويات وOpenTelemetry مسار السحابة.",
      healthy: "سليم", cloudReady: "جاهز للسحابة", source: "7 مصادر", ingest: "الاستيعاب", bronze: "Bronze",
      silver: "Silver", quality: "العقود", warehouse: "DuckDB + dbt", api: "واجهة مباشرة", product: "لوحة المعلومات",
    },
  },
};
