export const supportedLocales = ["en", "es"] as const;

export type Locale = (typeof supportedLocales)[number];

const translations = {
  en: {
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.share": "Share",
    "common.copyTxt": "Copy TXT",
    "common.downloadTxt": "Download TXT",
    "common.searchPlaceholder": "Search ARG13, Mexico, shield...",
    "common.settings": "Settings",
    "common.dark": "Dark",
    "common.light": "Light",
    "common.system": "System",
    "common.english": "English",
    "common.spanish": "Spanish",
    "topbar.shareAria": "Open share options",
    "topbar.tradeAria": "Open sticker trade",
    "topbar.settingsAria": "Open settings",
    "topbar.shareStatus.copied": "Copied",
    "topbar.shareStatus.downloaded": "Downloaded",
    "album.tab.all": "All",
    "album.tab.missing": "Missing",
    "album.tab.duplicates": "Duplicates",
    "album.tab.special": "Special",
    "album.empty.title": "No stickers found",
    "album.empty.description": "Try a code like ARG13 or a country name.",
    "album.group.summary": "{missing} missing",
    "album.group.summaryWithDuplicates":
      "{missing} missing · {duplicates} duplicates",
    "filters.sort.grouped": "Grouped order",
    "filters.sort.alphabetical": "A-Z order",
    "collection.progressLabel": "Collection Progress",
    "collection.viewMore": "View More",
    "collection.collected": "Collected",
    "collection.missing": "Missing",
    "collection.duplicates": "Duplicates",
    "collection.special": "Special",
    "collection.complete": "Complete",
    "collection.ratio": "Ratio",
    "collection.percent": "Percent",
    "collection.total": "Total",
    "settings.title": "Settings",
    "settings.description": "Stored locally with automatic persistence.",
    "settings.language.title": "Language",
    "settings.language.english": "English",
    "settings.language.spanish": "Spanish",
    "settings.theme.dark": "Dark",
    "settings.theme.light": "Light",
    "settings.theme.system": "System",
    "settings.compactGrid.title": "Compact grid",
    "settings.compactGrid.description": "Tighter sticker spacing.",
    "settings.animations.title": "Animations",
    "settings.animations.description": "Subtle press feedback.",
    "settings.export.title": "Export",
    "settings.export.copyTxt": "Copy TXT",
    "settings.export.download": "Download",
    "settings.reset.title": "Collection Reset",
    "settings.reset.description":
      "Clear all local sticker progress and duplicate counts.",
    "settings.reset.button": "Reset Album",
    "settings.reset.dialogTitle": "Reset Album?",
    "settings.reset.dialogDescription":
      "This will permanently remove all your collection progress and duplicate counts from this device.",
    "settings.reset.dialogCancel": "Cancel",
    "settings.reset.dialogConfirm": "Reset Album",
    "share.title": "What do you want to share?",
    "share.description":
      "Choose a list of stickers, then share or save it as TXT.",
    "share.action.share": "Share",
    "share.action.copyTxt": "Copy TXT",
    "share.action.downloadTxt": "Download TXT",
    "share.toast.copied": "Copied",
    "share.toast.downloaded": "Downloaded",
    "export.kind.missing": "Missing",
    "export.kind.duplicates": "Duplicate",
    "export.kind.both": "Both",
    "export.shareTitle.missing": "StickerOS missing list",
    "export.shareTitle.duplicates": "StickerOS duplicate list",
    "export.shareTitle.both": "StickerOS collection list",
    "export.txt.documentTitle": "StickerOS - List",
    "export.txt.missingSection": "I am missing:",
    "export.txt.missingSectionVoid": "❌ I have no missing stickers. I have a complete album!",
    "export.txt.duplicatesSection": "I have duplicates:",
    "export.txt.duplicatesSectionVoid": "❌ I have no duplicates to trade.",
    "stats.title": "Collection Summary",
    "stats.description": "Progress is calculated from the current album data.",
    "stats.tabs.summary": "Summary",
    "stats.tabs.teams": "Teams",
    "stats.summary.albumCompletion": "Album completion",
    "stats.summary.specialCompletion": "Special completion",
    "stats.summary.teams": "Teams",
    "stats.summary.shields": "Shields",
    "stats.sort.most": "Most complete first",
    "stats.sort.least": "Least complete first",
    "trade.title": "Trade stickers",
    "trade.description":
      "Share your missing and duplicate stickers with another collector.",
    "trade.scan.title": "Scan trade QR",
    "trade.scan.button": "Scan QR",
    "trade.scan.description":
      "Compare collections locally from another StickerOS QR.",
    "trade.scan.back": "Back to my QR",
    "trade.comparison.title": "Trade comparison",
    "trade.comparison.description":
      "Matched with {name}. Choose what to exchange.",
    "trade.comparison.noMatchesTitle": "No trade matches found",
    "trade.comparison.noMatchesDescription":
      "Your duplicate and missing lists do not overlap yet.",
    "trade.section.receive.title": "What you can receive ({count})",
    "trade.section.receive.detail": "{name} has {count} stickers you need.",
    "trade.section.give.title": "What you can give ({count})",
    "trade.section.give.detail": "You have {count} stickers {name} needs.",
    "trade.confirm.label": "Confirm Trade ({receive} for {give})",
    "trade.confirm.dialogTitle": "Confirm Trade?",
    "trade.confirm.dialogDescription":
      "Review the sticker count changes before updating your album.",
    "trade.summary.receive": "You'll receive",
    "trade.summary.give": "You'll give",
    "trade.albumImpact": "Album impact",
    "trade.scanAnother": "Scan another QR",
    "trade.collectorFallback": "Collector",
    "trade.error.invalidCollection":
      "This QR was created for a different StickerOS collection.",
    "trade.error.invalidLength":
      "This QR was created for a different StickerOS collection.",
    "trade.error.invalidHash":
      "This QR was created for a different StickerOS collection.",
    "trade.error.invalidVersion":
      "This QR was created by an unsupported StickerOS trade version.",
    "trade.error.invalidBitset": "This QR contains unreadable collection data.",
    "trade.error.invalidQr":
      "This does not look like a valid StickerOS trade QR.",
    "trade.error.staleDuplicates":
      "Your duplicates changed. Review this trade before trying again.",
    "trade.error.invalidSelection":
      "Select at least one sticker to receive and one to give.",
    "scanner.message.preparing": "Preparing camera...",
    "scanner.message.ready": "Point the camera at a StickerOS trade QR.",
    "scanner.message.cameraUnavailable":
      "Camera access is unavailable. Upload a QR image instead.",
    "scanner.message.noQrFound":
      "No readable StickerOS QR was found in that image.",
    "scanner.overlay.preparing": "Preparing camera",
    "scanner.upload": "Upload QR Image",
    "duplicate.title": "Edit duplicates",
    "duplicate.description": "Set extra copies for {group}.",
    "duplicate.decrease": "Decrease duplicates",
    "duplicate.increase": "Increase duplicates",
    "duplicate.confirm": "Confirm",
    "sticker.aria.select": "Select {code}",
    "sticker.aria.remove": "Remove {code}",
  },
  es: {
    "common.cancel": "Cancelar",
    "common.confirm": "Confirmar",
    "common.share": "Compartir",
    "common.copyTxt": "Copiar TXT",
    "common.downloadTxt": "Descargar TXT",
    "common.searchPlaceholder": "Busca ARG13, México, escudo...",
    "common.settings": "Ajustes",
    "common.dark": "Oscuro",
    "common.light": "Claro",
    "common.system": "Sistema",
    "common.english": "Inglés",
    "common.spanish": "Español",
    "topbar.shareAria": "Abrir opciones para compartir",
    "topbar.tradeAria": "Abrir intercambio de figuritas",
    "topbar.settingsAria": "Abrir ajustes",
    "topbar.shareStatus.copied": "Copiado",
    "topbar.shareStatus.downloaded": "Descargado",
    "album.tab.all": "Todas",
    "album.tab.missing": "Faltantes",
    "album.tab.duplicates": "Repetidas",
    "album.tab.special": "Especiales",
    "album.empty.title": "No se encontraron figuritas",
    "album.empty.description":
      "Prueba con un código como ARG13 o con el nombre de un país.",
    "album.group.summary": "{missing} faltan",
    "album.group.summaryWithDuplicates":
      "{missing} faltan · {duplicates} repetidas",
    "filters.sort.grouped": "Orden agrupado",
    "filters.sort.alphabetical": "A-Z",
    "collection.progressLabel": "Progreso de la colección",
    "collection.viewMore": "Ver más",
    "collection.collected": "Conseguidas",
    "collection.missing": "Faltan",
    "collection.duplicates": "Repetidas",
    "collection.special": "Especial",
    "collection.complete": "Completado",
    "collection.ratio": "Proporción",
    "collection.percent": "Porcentaje",
    "collection.total": "Total",
    "settings.title": "Ajustes",
    "settings.description": "Se guarda localmente con persistencia automática.",
    "settings.language.title": "Idioma",
    "settings.language.english": "Inglés",
    "settings.language.spanish": "Español",
    "settings.theme.dark": "Oscuro",
    "settings.theme.light": "Claro",
    "settings.theme.system": "Sistema",
    "settings.compactGrid.title": "Cuadrícula compacta",
    "settings.compactGrid.description": "Más espacio entre figuritas.",
    "settings.animations.title": "Animaciones",
    "settings.animations.description": "Respuesta sutil al pulsar.",
    "settings.export.title": "Exportar",
    "settings.export.copyTxt": "Copiar TXT",
    "settings.export.download": "Descargar",
    "settings.reset.title": "Restablecer colección",
    "settings.reset.description":
      "Borra todo el progreso local y los duplicados.",
    "settings.reset.button": "Restablecer álbum",
    "settings.reset.dialogTitle": "¿Restablecer álbum?",
    "settings.reset.dialogDescription":
      "Esto eliminará de forma permanente todo el progreso de la colección y los duplicados de este dispositivo.",
    "settings.reset.dialogCancel": "Cancelar",
    "settings.reset.dialogConfirm": "Restablecer álbum",
    "share.title": "¿Qué quieres compartir?",
    "share.description":
      "Elige una lista de figuritas y luego compártela o guárdala como TXT.",
    "share.action.share": "Compartir",
    "share.action.copyTxt": "Copiar TXT",
    "share.action.downloadTxt": "Descargar TXT",
    "share.toast.copied": "Copiado",
    "share.toast.downloaded": "Descargado",
    "export.kind.missing": "Faltantes",
    "export.kind.duplicates": "Repetidas",
    "export.kind.both": "Ambas",
    "export.shareTitle.missing": "Lista de faltantes de StickerOS",
    "export.shareTitle.duplicates": "Lista de repetidas de StickerOS",
    "export.shareTitle.both": "Lista de colección de StickerOS",
    "export.txt.documentTitle": "StickerOS - Lista",
    "export.txt.missingSection": "Me faltan:",
    "export.txt.missingSectionVoid": "❌ No me faltan figuritas. ¡Tengo el álbum completo!",
    "export.txt.duplicatesSection": "Tengo repetidas:",
    "export.txt.duplicatesSectionVoid": "❌ No tengo repetidas para intercambiar.",
    "stats.title": "Resumen de la colección",
    "stats.description":
      "El progreso se calcula a partir de los datos actuales del álbum.",
    "stats.tabs.summary": "Resumen",
    "stats.tabs.teams": "Equipos",
    "stats.summary.albumCompletion": "Progreso del álbum",
    "stats.summary.specialCompletion": "Progreso de especiales",
    "stats.summary.teams": "Equipos",
    "stats.summary.shields": "Escudos",
    "stats.sort.most": "Más completas primero",
    "stats.sort.least": "Menos completas primero",
    "trade.title": "Intercambiar figuritas",
    "trade.description":
      "Comparte tus figuritas faltantes y repetidas con otro coleccionista.",
    "trade.scan.title": "Escanear QR de intercambio",
    "trade.scan.button": "Escanear QR",
    "trade.scan.description":
      "Compara colecciones localmente con otro QR de StickerOS.",
    "trade.scan.back": "Volver a mi QR",
    "trade.comparison.title": "Comparación de intercambio",
    "trade.comparison.description":
      "Emparejado con {name}. Elige qué intercambiar.",
    "trade.comparison.noMatchesTitle": "No se encontraron coincidencias",
    "trade.comparison.noMatchesDescription":
      "Tus listas de repetidas y faltantes aún no se cruzan.",
    "trade.section.receive.title": "Lo que puedes recibir ({count})",
    "trade.section.receive.detail": "{name} tiene {count} figuritas que necesitas.",
    "trade.section.give.title": "Lo que puedes dar ({count})",
    "trade.section.give.detail": "Tienes {count} figuritas que {name} necesita.",
    "trade.confirm.label": "Confirmar intercambio ({receive} por {give})",
    "trade.confirm.dialogTitle": "¿Confirmar intercambio?",
    "trade.confirm.dialogDescription":
      "Revisa los cambios en la cantidad de figuritas antes de actualizar tu álbum.",
    "trade.summary.receive": "Recibirás",
    "trade.summary.give": "Darás",
    "trade.albumImpact": "Impacto en el álbum",
    "trade.scanAnother": "Escanear otro QR",
    "trade.collectorFallback": "Coleccionista",
    "trade.error.invalidCollection":
      "Este QR fue creado para una colección diferente de StickerOS.",
    "trade.error.invalidLength":
      "Este QR fue creado para una colección diferente de StickerOS.",
    "trade.error.invalidHash":
      "Este QR fue creado para una colección diferente de StickerOS.",
    "trade.error.invalidVersion":
      "Este QR fue creado con una versión de intercambio no compatible de StickerOS.",
    "trade.error.invalidBitset":
      "Este QR contiene datos de colección que no se pueden leer.",
    "trade.error.invalidQr":
      "Esto no parece un QR de intercambio válido de StickerOS.",
    "trade.error.staleDuplicates":
      "Tus repetidas cambiaron. Revisa este intercambio antes de intentarlo de nuevo.",
    "trade.error.invalidSelection":
      "Selecciona al menos una figurita para recibir y una para dar.",
    "scanner.message.preparing": "Preparando cámara...",
    "scanner.message.ready":
      "Apunta la cámara a un QR de intercambio de StickerOS.",
    "scanner.message.cameraUnavailable":
      "La cámara no está disponible. Sube una imagen del QR en su lugar.",
    "scanner.message.noQrFound":
      "No se encontró un QR legible de StickerOS en esa imagen.",
    "scanner.overlay.preparing": "Preparando cámara",
    "scanner.upload": "Subir imagen del QR",
    "duplicate.title": "Editar repetidas",
    "duplicate.description": "Define copias extra para {group}.",
    "duplicate.decrease": "Disminuir repetidas",
    "duplicate.increase": "Aumentar repetidas",
    "duplicate.confirm": "Confirmar",
    "sticker.aria.select": "Seleccionar {code}",
    "sticker.aria.remove": "Quitar {code}",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export type TranslationParams = Record<string, string | number>;

export const localeOptions = [
  { id: "en" as const, labelKey: "settings.language.english" as const },
  { id: "es" as const, labelKey: "settings.language.spanish" as const },
];

export function t(
  locale: Locale,
  key: TranslationKey,
  params?: TranslationParams,
) {
  const base = translations[locale][key] ?? translations.en[key] ?? key;
  return interpolate(base, params);
}

function interpolate(value: string, params?: TranslationParams) {
  if (!params) return value;

  return value.replace(/\{(\w+)\}/g, (match, name) => {
    const replacement = params[name];
    return replacement === undefined ? match : String(replacement);
  });
}
