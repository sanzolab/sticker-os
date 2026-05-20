export const supportedLocales = ["en", "es"] as const;

export type Locale = (typeof supportedLocales)[number];

const translations = {
  en: {
    "common.cancel": "Cancel",
    "common.clearSearch": "Clear search",
    "common.close": "Close",
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
    "topbar.addStickersAria": "Add stickers",
    "topbar.shareAria": "Open share options",
    "topbar.tradeAria": "Open sticker trade",
    "topbar.tradeBadge.pendingCount": "Pending trade: {count} selected",
    "topbar.tradeBadge.pendingNeedsSelection":
      "Pending trade: selection needed",
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
    "settings.animations.title": "Animations",
    "settings.animations.description": "Subtle press feedback.",
    "settings.haptics.title": "Haptic feedback",
    "settings.haptics.description": "Tactile response on tap.",
    "settings.cacheVersion.title": "Cache version",
    "settings.cacheVersion.description":
      "Current service worker cache name from this app build.",
    "settings.cacheVersion.loading": "Reading...",
    "settings.cacheVersion.unavailable": "Unavailable",
    "settings.export.title": "Export",
    "settings.export.copyTxt": "Copy TXT",
    "settings.export.download": "Download",
    "settings.migration.title": "Migration",
    "settings.migration.description":
      "Import album progress from another app using an exchange QR code.",
    "settings.migration.button": "Migrate album from another app",
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
    "share.action.shareAlbumLink": "Share album link",
    "share.link.title": "StickerOS shared album",
    "share.link.description": "Open this link in StickerOS to compare or import.",
    "share.link.preparing": "Preparing link...",
    "share.link.errorTooLong":
      "This album is too large to share as a link on this device.",
    "share.link.errorGeneric":
      "Could not prepare the shared album link. Try reopening share options.",
    "share.link.manualCopyHint":
      "Automatic copy was blocked. You can copy this link manually.",
    "share.link.manualCopyFieldAria": "Shared album link",
    "share.link.manualCopyAction": "Copy link",
    "share.toast.copied": "Copied",
    "share.toast.downloaded": "Downloaded",
    "toast.action.undo": "Undo",
    "toast.common.copiedSuccess": "Copied successfully",
    "toast.common.copyFailed": "Could not copy text",
    "toast.common.txtDownloaded": "TXT downloaded",
    "toast.common.txtDownloadedDescription":
      "Your list was saved successfully.",
    "toast.common.downloadFailed": "Could not download TXT",
    "toast.sticker.added": "Sticker {code} added",
    "toast.sticker.removed": "Sticker {code} removed",
    "toast.sticker.changesSaved": "Changes saved",
    "toast.exchange.completed": "Exchange completed",
    "toast.exchange.failed": "Could not complete exchange",
    "toast.exchange.undoTitle": "Undo exchange?",
    "toast.exchange.undoDescription":
      "This will revert the completed exchange and restore the previous sticker state.",
    "toast.exchange.undoOverwriteDescription":
      "You made newer changes after this exchange. Undoing now will replace those newer changes with the previous exchange snapshot.",
    "toast.exchange.undoConfirm": "Undo exchange",
    "toast.exchange.reverted": "Exchange reverted",
    "toast.exchange.revertFailed": "Could not undo exchange",
    "toast.detected.added": "{count} detected stickers added",
    "toast.detected.discarded": "Detected stickers discarded",
    "toast.detected.failed": "Could not detect stickers",
    "toast.detected.unmatched": "Some stickers could not be matched",
    "toast.scan.success": "Code scanned successfully",
    "toast.scan.invalid": "Invalid code",
    "toast.scan.duplicate": "Code already scanned",
    "toast.scan.failed": "Could not scan code",
    "toast.scan.cameraUnavailable": "Camera access is unavailable",
    "toast.reset.completed": "Album reset",
    "toast.reset.undoTitle": "Restore previous album?",
    "toast.reset.undoDescription":
      "This will restore the album state before the reset.",
    "toast.reset.undoOverwriteDescription":
      "You made newer changes after the reset. Restoring now will replace those newer changes.",
    "toast.reset.undoConfirm": "Restore album",
    "toast.reset.reverted": "Album restored",
    "toast.reset.revertFailed": "Could not restore album",
    "toast.import.completed": "Album imported",
    "toast.migration.completed": "Album migrated successfully.",
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
    "stats.overview.title": "Album progress",
    "stats.overview.remaining": "{count} left to complete",
    "stats.group.quickStats": "Quick stats",
    "stats.group.breakdown": "Breakdown",
    "stats.group.breakdownHelp": "Progress by album section.",
    "stats.group.teamHelp": "Sorted by completion.",
    "stats.metric.missingHelp": "Still needed",
    "stats.metric.duplicatesHelp": "Available for trades",
    "stats.metric.specialHelp": "Special stickers collected",
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
    "trade.section.selectAll": "All",
    "trade.section.clear": "Clear",
    "trade.confirm.label": "Confirm Trade ({receive} for {give})",
    "trade.confirm.dialogTitle": "Confirm Trade?",
    "trade.confirm.dialogDescription":
      "Review the sticker count changes before updating your album.",
    "trade.exit.dialogTitle": "Discard this trade?",
    "trade.exit.dialogDescription":
      "Your scanned exchange and current selections will be lost.",
    "trade.exit.dialogConfirm": "Discard Trade",
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
    "trade.error.staleReceive":
      "One or more stickers you want to receive are no longer missing. Re-scan to get updated matches.",
    "trade.myQr.title": "My Trade QR",
    "sharedLink.loadingTitle": "Loading shared album",
    "sharedLink.loadingDescription":
      "Validating this shared snapshot before showing options.",
    "sharedLink.error.title": "Could not open shared album",
    "sharedLink.error.invalid":
      "This shared link is invalid or unreadable.",
    "sharedLink.error.invalidCollection":
      "This shared link belongs to a different StickerOS collection.",
    "sharedLink.error.invalidVersion":
      "This shared link was created by an unsupported version.",
    "sharedLink.error.invalidCompression":
      "This device cannot decode the shared link format.",
    "sharedLink.goHome": "Back to app",
    "sharedLink.snapshotBadge": "Shared snapshot",
    "sharedLink.title": "{name}'s shared album",
    "sharedLink.description":
      "Choose what to do with this album snapshot.",
    "sharedLink.senderFallback": "Collector",
    "sharedLink.back": "Back",
    "sharedLink.openMainApp": "Open main album",
    "sharedLink.actions.exchange": "Exchange stickers",
    "sharedLink.actions.exchangeDescription":
      "Compare this shared album with yours to find possible trades.",
    "sharedLink.actions.import": "Copy / Recover album",
    "sharedLink.actions.importDescription":
      "Import this shared snapshot into this device.",
    "sharedLink.actions.view": "View shared album",
    "sharedLink.actions.viewDescription":
      "Review this shared album in read-only mode.",
    "sharedLink.exchange.title": "Exchange from shared link",
    "sharedLink.exchange.description":
      "These matches are based on the shared album snapshot.",
    "sharedLink.exchange.receiveDetail":
      "{name} can give you {count} stickers from this snapshot.",
    "sharedLink.exchange.giveDetail":
      "You can give {name} {count} stickers based on this snapshot.",
    "sharedLink.exchange.confirmDescription":
      "Review this snapshot-based exchange before applying changes.",
    "sharedLink.exchange.confirmAction": "Apply exchange",
    "sharedLink.import.strategyTitle": "Choose import strategy",
    "sharedLink.import.strategyDescription":
      "Your local album has progress. Choose how to combine data.",
    "sharedLink.import.strategy.replace": "Replace current album",
    "sharedLink.import.strategy.add": "Add copies together",
    "sharedLink.import.strategy.highest": "Keep highest count",
    "sharedLink.import.warning.replace":
      "This will overwrite local progress with the shared snapshot.",
    "sharedLink.import.warning.add":
      "This adds local and shared counts. Using it on a backup of the same album may inflate duplicates.",
    "sharedLink.import.warning.highest":
      "This keeps the highest copy count per sticker and avoids duplicate inflation.",
    "sharedLink.import.cancel": "Cancel",
    "sharedLink.import.continue": "Continue",
    "sharedLink.import.confirmTitle": "Confirm album import",
    "sharedLink.import.confirmDescription":
      "Review the impact before changing your local album.",
    "sharedLink.import.finalWarning":
      "Local album data will change only after your final confirmation.",
    "sharedLink.import.apply": "Import album",
    "sharedLink.import.successBanner":
      "Album imported successfully.",
    "sharedLink.import.dialogTitle": "Apply import now?",
    "sharedLink.import.dialogDescription":
      "This action updates the local album on this device.",
    "sharedLink.summary.localCollected": "Current local collected",
    "sharedLink.summary.sharedCollected": "Shared album collected",
    "sharedLink.summary.resultCollected": "Result collected",
    "sharedLink.summary.localDuplicates": "Current local duplicates",
    "sharedLink.summary.sharedDuplicates": "Shared album duplicates",
    "sharedLink.summary.resultDuplicates": "Result duplicates",
    "sharedLink.summary.localCompletion": "Current local completion",
    "sharedLink.summary.resultCompletion": "Result completion",
    "sharedLink.viewer.title": "Read-only shared album",
    "sharedLink.viewer.description":
      "This view never changes your local album.",
    "addStickers.badge": "Quick capture",
    "addStickers.title": "Add stickers",
    "addStickers.description":
      "Add several stickers quickly using a photo or voice.",
    "addStickers.photo.title": "Photo",
    "addStickers.photo.description":
      "Take or upload a photo where sticker numbers and codes are visible.",
    "addStickers.photo.button": "Choose photo",
    "addStickers.photoPanel.title": "Capture photo",
    "addStickers.photoPanel.description":
      "Upload or capture an image with visible sticker codes and numbers.",
    "addStickers.photoPanel.dropLabel": "Add image",
    "addStickers.photoPanel.dropTitle": "Add image",
    "addStickers.photoPanel.dropHint": "PNG, JPG, or direct photo capture",
    "addStickers.photoPanel.takePhoto": "Take photo",
    "addStickers.photoPanel.chooseFromGallery": "Choose from gallery",
    "addStickers.photoPanel.close": "Close photo panel",
    "addStickers.voice.title": "Voice",
    "addStickers.voice.description":
      "Say several stickers in one sentence. You will review everything before adding.",
    "addStickers.voice.example":
      "Example: Mexico thirteen, Coca Cola fourteen, FWC zero zero.",
    "addStickers.voice.start": "Start listening",
    "addStickers.voice.stop": "Stop listening",
    "addStickers.voice.analyzeTranscript": "Analyze transcript",
    "addStickers.voice.retry": "Try again",
    "addStickers.voice.upload": "Upload audio",
    "addStickers.voice.listening": "Listening...",
    "addStickers.voice.processing": "Processing voice locally first...",
    "addStickers.voice.deepProcessing": "Deep Processing...",
    "addStickers.voice.transcriptLabel": "Transcript",
    "addStickers.voice.transcriptPlaceholder":
      "Mexico thirteen, Coca Cola fourteen, FWC zero zero",
    "addStickers.voice.unsupported":
      "Voice recognition is not available in this browser. Try Photo or type the stickers manually.",
    "addStickers.voice.permissionError":
      "Microphone access was blocked or unavailable. Try Photo or type the stickers manually.",
    "addStickers.voice.empty":
      "No audio was captured. Try recording again or upload an audio file.",
    "addStickers.voice.emptyTranscript":
      "I did not catch any sticker text. Try again or type it manually.",
    "addStickers.voice.recognitionError":
      "I could not understand that voice input. Try again, use Photo, or type it manually.",
    "addStickers.voice.offline":
      "No internet connection. I could not understand this locally, and AI analysis requires internet.",
    "addStickers.voice.connectionError":
      "I could not reach AI analysis. Check your connection or provider settings, then try again.",
    "addStickers.manual.label": "Or type them manually",
    "addStickers.manual.placeholder": "MEX 13, CC14, FWC 00...",
    "addStickers.manual.hint":
      "Examples: MEX 13, CC14, FWC 00. Clear codes are parsed without AI.",
    "addStickers.manual.submit": "Add",
    "addStickers.loading.title": "Analyzing stickers",
    "addStickers.loading.description":
      "Checking this capture and matching it against the album.",
    "addStickers.analyzing": "Analyzing...",
    "addStickers.review.heading": "Confirm stickers",
    "addStickers.review.provider": "Source: {provider}",
    "addStickers.review.geminiAssisted": "Gemini assisted",
    "addStickers.review.title": "Detected stickers",
    "addStickers.review.description":
      "Tap any sticker to choose whether it will be added.",
    "addStickers.review.source": "From: {source}",
    "addStickers.review.album.missing": "Faltantes detectadas por IA",
    "addStickers.review.album.present": "Presentes inferidas por diferencia",
    "addStickers.review.album.method": "Método: faltantes detectadas + complemento 1..20",
    "addStickers.review.album.uncertain": "Ranuras vacías inciertas",
    "addStickers.review.album.needsReview":
      "No se infirieron presentes porque la página no fue segura para procesar.",
    "addStickers.pending.review": "Review pending ({count})",
    "addStickers.pending.reviewShort": "Review pending",
    "addStickers.pending.discard": "Discard pending",
    "addStickers.pending.captureMore": "Capture more",
    "addStickers.pending.warning.title": "Pending stickers need review",
    "addStickers.pending.warning.description":
      "You have {count} stickers pending review. Resume that list or start a new capture and append more.",
    "addStickers.pending.startNew": "Start new capture",
    "addStickers.pending.sourceMixed": "mixed session",
    "addStickers.unresolved.title": "Needs review",
    "addStickers.empty.title": "No stickers found",
    "addStickers.empty.description":
      "Try a clearer code like MEX 13, FWC 00, or CC14.",
    "addStickers.error.title": "Could not analyze stickers",
    "addStickers.error.generic":
      "Something went wrong while analyzing those stickers.",
    "addStickers.error.imagePreparation":
      "This photo format could not be prepared on this device. Please try again, select the photo from your gallery, or use a JPEG/PNG image.",
    "addStickers.error.timeout":
      "Analysis took too long. Try again with a clearer photo.",
    "addStickers.back": "Back",
    "addStickers.analyzeAnother": "Analyze another",
    "addStickers.confirm": "Confirm add selected stickers ({count})",
    "scanner.message.preparing": "Preparing camera...",
    "scanner.message.ready": "Point the camera at a StickerOS trade QR.",
    "scanner.message.cameraUnavailable":
      "Camera access is unavailable. Upload a QR image instead.",
    "scanner.message.noQrFound":
      "No readable StickerOS QR was found in that image.",
    "scanner.overlay.preparing": "Preparing camera",
    "scanner.upload": "Upload QR Image",
    "migration.title": "Migrate album from another app",
    "migration.description":
      "Scan an exchange QR code to import progress into this device.",
    "migration.warning.replace":
      "Importing from another app will replace your current album progress.",
    "migration.warning.loss":
      "If you already have saved progress, it will be lost.",
    "migration.warning.duplicatesTitle": "Duplicate quantity limitation",
    "migration.warning.duplicatesBody":
      "The QR code only tells us which stickers/cards are repeated, but not how many copies you have. Any repeated sticker/card found in the QR will be imported as 1 extra copy only.",
    "migration.startScan": "I understand, continue to scan",
    "migration.back": "Back",
    "migration.scanTitle": "Scan exchange QR",
    "migration.scanDescription":
      "Use your camera or upload an image with the exchange QR code.",
    "migration.error.invalidQr":
      "This QR code could not be used to migrate your album. Please check that it is a valid exchange QR.",
    "migration.reviewTitle": "Review migration data",
    "migration.reviewDescription":
      "Confirm the scanned data before replacing your local album.",
    "migration.summary.collected": "Stickers/cards marked as collected",
    "migration.summary.duplicates": "Stickers/cards marked as repeated",
    "migration.summary.ignored": "Unsupported stickers/cards ignored",
    "migration.confirmTitle": "Migrate album now?",
    "migration.confirmDescription":
      "Are you sure you want to migrate your album? This will overwrite your current progress.",
    "migration.confirmAction": "Migrate album",
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
    "common.clearSearch": "Limpiar búsqueda",
    "common.close": "Cerrar",
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
    "topbar.addStickersAria": "Agregar figuritas",
    "topbar.shareAria": "Abrir opciones para compartir",
    "topbar.tradeAria": "Abrir intercambio de figuritas",
    "topbar.tradeBadge.pendingCount":
      "Intercambio pendiente: {count} seleccionadas",
    "topbar.tradeBadge.pendingNeedsSelection":
      "Intercambio pendiente: faltan selecciones",
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
    "settings.animations.title": "Animaciones",
    "settings.animations.description": "Respuesta sutil al pulsar.",
    "settings.haptics.title": "Retroalimentación háptica",
    "settings.haptics.description": "Respuesta táctil al pulsar.",
    "settings.cacheVersion.title": "Versión de caché",
    "settings.cacheVersion.description":
      "Nombre de caché actual del service worker de esta versión.",
    "settings.cacheVersion.loading": "Leyendo...",
    "settings.cacheVersion.unavailable": "No disponible",
    "settings.export.title": "Exportar",
    "settings.export.copyTxt": "Copiar TXT",
    "settings.export.download": "Descargar",
    "settings.migration.title": "Migración",
    "settings.migration.description":
      "Importa el progreso del álbum desde otra app usando un QR de intercambio.",
    "settings.migration.button": "Migrar álbum desde otra app",
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
    "share.action.shareAlbumLink": "Compartir enlace del álbum",
    "share.link.title": "Álbum compartido de StickerOS",
    "share.link.description":
      "Abre este enlace en StickerOS para comparar o importar.",
    "share.link.preparing": "Preparando enlace...",
    "share.link.errorTooLong":
      "Este álbum es demasiado grande para compartirlo como enlace en este dispositivo.",
    "share.link.errorGeneric":
      "No se pudo preparar el enlace del álbum compartido. Vuelve a abrir las opciones de compartir.",
    "share.link.manualCopyHint":
      "La copia automática fue bloqueada. Puedes copiar este enlace manualmente.",
    "share.link.manualCopyFieldAria": "Enlace de álbum compartido",
    "share.link.manualCopyAction": "Copiar enlace",
    "share.toast.copied": "Copiado",
    "share.toast.downloaded": "Descargado",
    "toast.action.undo": "Deshacer",
    "toast.common.copiedSuccess": "Copiado correctamente",
    "toast.common.copyFailed": "No se pudo copiar el texto",
    "toast.common.txtDownloaded": "TXT descargado",
    "toast.common.txtDownloadedDescription":
      "Tu lista se guardó correctamente.",
    "toast.common.downloadFailed": "No se pudo descargar el TXT",
    "toast.sticker.added": "Figurita {code} agregada",
    "toast.sticker.removed": "Figurita {code} eliminada",
    "toast.sticker.changesSaved": "Cambios guardados",
    "toast.exchange.completed": "Intercambio completado",
    "toast.exchange.failed": "No se pudo completar el intercambio",
    "toast.exchange.undoTitle": "¿Deshacer intercambio?",
    "toast.exchange.undoDescription":
      "Esto revertirá el intercambio completado y restaurará el estado anterior de las figuritas.",
    "toast.exchange.undoOverwriteDescription":
      "Hiciste cambios más recientes después de este intercambio. Deshacer ahora reemplazará esos cambios más recientes con la instantánea anterior al intercambio.",
    "toast.exchange.undoConfirm": "Deshacer intercambio",
    "toast.exchange.reverted": "Intercambio revertido",
    "toast.exchange.revertFailed": "No se pudo deshacer el intercambio",
    "toast.detected.added": "Se agregaron {count} figuritas detectadas",
    "toast.detected.discarded": "Figuritas detectadas descartadas",
    "toast.detected.failed": "No se pudieron detectar figuritas",
    "toast.detected.unmatched": "Algunas figuritas no se pudieron identificar",
    "toast.scan.success": "Código escaneado correctamente",
    "toast.scan.invalid": "Código inválido",
    "toast.scan.duplicate": "Código ya escaneado",
    "toast.scan.failed": "No se pudo escanear el código",
    "toast.scan.cameraUnavailable": "El acceso a la cámara no está disponible",
    "toast.reset.completed": "Álbum restablecido",
    "toast.reset.undoTitle": "¿Restaurar álbum anterior?",
    "toast.reset.undoDescription":
      "Esto restaurará el estado del álbum anterior al restablecimiento.",
    "toast.reset.undoOverwriteDescription":
      "Hiciste cambios más recientes después del restablecimiento. Restaurar ahora reemplazará esos cambios más recientes.",
    "toast.reset.undoConfirm": "Restaurar álbum",
    "toast.reset.reverted": "Álbum restaurado",
    "toast.reset.revertFailed": "No se pudo restaurar el álbum",
    "toast.import.completed": "Álbum importado",
    "toast.migration.completed": "Álbum migrado correctamente.",
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
    "stats.overview.title": "Progreso del álbum",
    "stats.overview.remaining": "Faltan {count} para completar",
    "stats.group.quickStats": "Datos clave",
    "stats.group.breakdown": "Desglose",
    "stats.group.breakdownHelp": "Progreso por sección del álbum.",
    "stats.group.teamHelp": "Ordenado por progreso.",
    "stats.metric.missingHelp": "Aún faltan",
    "stats.metric.duplicatesHelp": "Disponibles para intercambiar",
    "stats.metric.specialHelp": "Especiales conseguidas",
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
    "trade.section.selectAll": "Todas",
    "trade.section.clear": "Limpiar",
    "trade.confirm.label": "Confirmar intercambio ({receive} por {give})",
    "trade.confirm.dialogTitle": "¿Confirmar intercambio?",
    "trade.confirm.dialogDescription":
      "Revisa los cambios en la cantidad de figuritas antes de actualizar tu álbum.",
    "trade.exit.dialogTitle": "¿Descartar este intercambio?",
    "trade.exit.dialogDescription":
      "Se perderán el intercambio escaneado y las selecciones actuales.",
    "trade.exit.dialogConfirm": "Descartar intercambio",
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
    "trade.error.staleReceive":
      "Una o más figuritas que quieres recibir ya las tienes. Vuelve a escanear para obtener coincidencias actualizadas.",
    "trade.myQr.title": "Mi QR de intercambio",
    "sharedLink.loadingTitle": "Cargando álbum compartido",
    "sharedLink.loadingDescription":
      "Validando esta instantánea compartida antes de mostrar opciones.",
    "sharedLink.error.title": "No se pudo abrir el álbum compartido",
    "sharedLink.error.invalid":
      "Este enlace compartido no es válido o no se puede leer.",
    "sharedLink.error.invalidCollection":
      "Este enlace compartido pertenece a otra colección de StickerOS.",
    "sharedLink.error.invalidVersion":
      "Este enlace compartido fue creado con una versión no compatible.",
    "sharedLink.error.invalidCompression":
      "Este dispositivo no puede decodificar el formato del enlace compartido.",
    "sharedLink.goHome": "Volver a la app",
    "sharedLink.snapshotBadge": "Instantánea compartida",
    "sharedLink.title": "Álbum compartido de {name}",
    "sharedLink.description":
      "Elige qué quieres hacer con esta instantánea del álbum.",
    "sharedLink.senderFallback": "Coleccionista",
    "sharedLink.back": "Volver",
    "sharedLink.openMainApp": "Abrir álbum principal",
    "sharedLink.actions.exchange": "Intercambiar figuritas",
    "sharedLink.actions.exchangeDescription":
      "Compara este álbum compartido con el tuyo para ver posibles intercambios.",
    "sharedLink.actions.import": "Copiar / Recuperar álbum",
    "sharedLink.actions.importDescription":
      "Importa esta instantánea compartida en este dispositivo.",
    "sharedLink.actions.view": "Ver álbum compartido",
    "sharedLink.actions.viewDescription":
      "Revisa este álbum compartido en modo de solo lectura.",
    "sharedLink.exchange.title": "Intercambio desde enlace compartido",
    "sharedLink.exchange.description":
      "Estas coincidencias se basan en la instantánea compartida.",
    "sharedLink.exchange.receiveDetail":
      "{name} puede darte {count} figuritas según esta instantánea.",
    "sharedLink.exchange.giveDetail":
      "Puedes darle a {name} {count} figuritas según esta instantánea.",
    "sharedLink.exchange.confirmDescription":
      "Revisa este intercambio basado en instantánea antes de aplicar cambios.",
    "sharedLink.exchange.confirmAction": "Aplicar intercambio",
    "sharedLink.import.strategyTitle": "Elige estrategia de importación",
    "sharedLink.import.strategyDescription":
      "Tu álbum local tiene progreso. Elige cómo combinar los datos.",
    "sharedLink.import.strategy.replace": "Reemplazar álbum actual",
    "sharedLink.import.strategy.add": "Sumar copias",
    "sharedLink.import.strategy.highest": "Conservar mayor cantidad",
    "sharedLink.import.warning.replace":
      "Esto reemplazará tu progreso local con la instantánea compartida.",
    "sharedLink.import.warning.add":
      "Esto suma cantidades locales y compartidas. Si importas un respaldo del mismo álbum, puede inflar las repetidas.",
    "sharedLink.import.warning.highest":
      "Esto conserva la mayor cantidad por figurita y evita inflar repetidas.",
    "sharedLink.import.cancel": "Cancelar",
    "sharedLink.import.continue": "Continuar",
    "sharedLink.import.confirmTitle": "Confirmar importación del álbum",
    "sharedLink.import.confirmDescription":
      "Revisa el impacto antes de cambiar tu álbum local.",
    "sharedLink.import.finalWarning":
      "Los datos del álbum local solo cambiarán después de tu confirmación final.",
    "sharedLink.import.apply": "Importar álbum",
    "sharedLink.import.successBanner":
      "Álbum importado con éxito.",
    "sharedLink.import.dialogTitle": "¿Aplicar importación ahora?",
    "sharedLink.import.dialogDescription":
      "Esta acción actualiza el álbum local en este dispositivo.",
    "sharedLink.summary.localCollected": "Conseguidas locales actuales",
    "sharedLink.summary.sharedCollected": "Conseguidas del álbum compartido",
    "sharedLink.summary.resultCollected": "Conseguidas resultado",
    "sharedLink.summary.localDuplicates": "Repetidas locales actuales",
    "sharedLink.summary.sharedDuplicates": "Repetidas del álbum compartido",
    "sharedLink.summary.resultDuplicates": "Repetidas resultado",
    "sharedLink.summary.localCompletion": "Progreso local actual",
    "sharedLink.summary.resultCompletion": "Progreso resultado",
    "sharedLink.viewer.title": "Álbum compartido de solo lectura",
    "sharedLink.viewer.description":
      "Esta vista nunca modifica tu álbum local.",
    "addStickers.badge": "Captura rápida",
    "addStickers.title": "Agregar figuritas",
    "addStickers.description":
      "Agrega varias figuritas rápido usando una foto o la voz.",
    "addStickers.photo.title": "Foto",
    "addStickers.photo.description":
      "Toma o sube una foto donde se vean los números y códigos de las figuritas.",
    "addStickers.photo.button": "Elegir foto",
    "addStickers.photoPanel.title": "Capturar foto",
    "addStickers.photoPanel.description":
      "Sube o toma una imagen donde se vean los códigos y números de figuritas.",
    "addStickers.photoPanel.dropLabel": "Agregar imagen",
    "addStickers.photoPanel.dropTitle": "Agregar imagen",
    "addStickers.photoPanel.dropHint": "PNG, JPG o foto directa",
    "addStickers.photoPanel.takePhoto": "Tomar foto",
    "addStickers.photoPanel.chooseFromGallery": "Elegir de galería",
    "addStickers.photoPanel.close": "Cerrar panel de foto",
    "addStickers.voice.title": "Voz",
    "addStickers.voice.description":
      "Di varias figuritas en una sola frase. Revisarás todo antes de agregar.",
    "addStickers.voice.example":
      "Ejemplo: México trece, Coca Cola catorce, FWC cero cero.",
    "addStickers.voice.start": "Empezar a escuchar",
    "addStickers.voice.stop": "Dejar de escuchar",
    "addStickers.voice.analyzeTranscript": "Analizar transcripción",
    "addStickers.voice.retry": "Intentar otra vez",
    "addStickers.voice.upload": "Subir audio",
    "addStickers.voice.listening": "Escuchando...",
    "addStickers.voice.processing": "Procesando la voz localmente primero...",
    "addStickers.voice.deepProcessing": "Procesando en profundidad...",
    "addStickers.voice.transcriptLabel": "Transcripción",
    "addStickers.voice.transcriptPlaceholder":
      "México trece, Coca Cola catorce, FWC cero cero",
    "addStickers.voice.unsupported":
      "El reconocimiento de voz no está disponible en este navegador. Prueba con Foto o escribe las figuritas manualmente.",
    "addStickers.voice.permissionError":
      "El acceso al micrófono fue bloqueado o no está disponible. Prueba con Foto o escribe las figuritas manualmente.",
    "addStickers.voice.empty":
      "No se capturó audio. Intenta grabar de nuevo o sube un archivo de audio.",
    "addStickers.voice.emptyTranscript":
      "No alcancé a detectar texto de figuritas. Intenta de nuevo o escríbelo manualmente.",
    "addStickers.voice.recognitionError":
      "No pude entender esa entrada de voz. Intenta de nuevo, usa Foto o escríbelo manualmente.",
    "addStickers.voice.offline":
      "No hay conexión a internet. No pude entenderlo localmente y el análisis con IA requiere internet.",
    "addStickers.voice.connectionError":
      "No pude conectar con el análisis de IA. Revisa tu conexión o la configuración del proveedor e intenta de nuevo.",
    "addStickers.manual.label": "O escríbelas manualmente",
    "addStickers.manual.placeholder": "MEX 13, CC14, FWC 00...",
    "addStickers.manual.hint":
      "Ejemplos: MEX 13, CC14, FWC 00. Los códigos claros se interpretan sin IA.",
    "addStickers.manual.submit": "Agregar",
    "addStickers.loading.title": "Analizando figuritas",
    "addStickers.loading.description":
      "Revisando esta captura y comparándola con el álbum.",
    "addStickers.analyzing": "Analizando...",
    "addStickers.review.heading": "Confirmar figuritas",
    "addStickers.review.provider": "Fuente: {provider}",
    "addStickers.review.geminiAssisted": "Asistido por Gemini",
    "addStickers.review.title": "Figuritas detectadas",
    "addStickers.review.description":
      "Toca cualquier figurita para elegir si se agregará.",
    "addStickers.review.source": "De: {source}",
    "addStickers.review.album.missing": "Faltantes detectadas por IA",
    "addStickers.review.album.present": "Presentes inferidas por diferencia",
    "addStickers.review.album.method": "Método: faltantes detectadas + complemento 1..20",
    "addStickers.review.album.uncertain": "Ranuras vacías inciertas",
    "addStickers.review.album.needsReview":
      "No se infirieron presentes porque la página no fue segura para procesar.",
    "addStickers.pending.review": "Revisar pendientes ({count})",
    "addStickers.pending.reviewShort": "Ver pendientes",
    "addStickers.pending.discard": "Descartar pendientes",
    "addStickers.pending.captureMore": "Capturar más",
    "addStickers.pending.warning.title": "Tienes figuritas pendientes",
    "addStickers.pending.warning.description":
      "Hay {count} figuritas pendientes de revisión. Puedes retomar esa lista o iniciar una nueva captura y agregar más.",
    "addStickers.pending.startNew": "Iniciar nueva captura",
    "addStickers.pending.sourceMixed": "sesión mixta",
    "addStickers.unresolved.title": "Requiere revisión",
    "addStickers.empty.title": "No se encontraron figuritas",
    "addStickers.empty.description":
      "Prueba con un código más claro como MEX 13, FWC 00 o CC14.",
    "addStickers.error.title": "No se pudieron analizar las figuritas",
    "addStickers.error.generic":
      "Algo salió mal al analizar esas figuritas.",
    "addStickers.error.imagePreparation":
      "No se pudo preparar este formato de foto en este dispositivo. Intenta de nuevo, elige la foto desde la galería o usa una imagen JPEG/PNG.",
    "addStickers.error.timeout":
      "El análisis tardó demasiado. Intenta de nuevo con una foto más clara.",
    "addStickers.back": "Volver",
    "addStickers.analyzeAnother": "Analizar otra",
    "addStickers.confirm": "Confirmar figuritas seleccionadas ({count})",
    "scanner.message.preparing": "Preparando cámara...",
    "scanner.message.ready":
      "Apunta la cámara a un QR de intercambio de StickerOS.",
    "scanner.message.cameraUnavailable":
      "La cámara no está disponible. Sube una imagen del QR en su lugar.",
    "scanner.message.noQrFound":
      "No se encontró un QR legible de StickerOS en esa imagen.",
    "scanner.overlay.preparing": "Preparando cámara",
    "scanner.upload": "Subir imagen del QR",
    "migration.title": "Migrar álbum desde otra app",
    "migration.description":
      "Escanea un QR de intercambio para importar el progreso en este dispositivo.",
    "migration.warning.replace":
      "Importar desde otra app reemplazará el progreso actual de tu álbum.",
    "migration.warning.loss":
      "Si ya tienes progreso guardado, se perderá.",
    "migration.warning.duplicatesTitle": "Límite en cantidades repetidas",
    "migration.warning.duplicatesBody":
      "El código QR solo indica qué figuritas/tarjetas están repetidas, pero no cuántas copias tienes. Cualquier figurita/tarjeta repetida encontrada en el QR se importará como solo 1 copia extra.",
    "migration.startScan": "Entiendo, continuar para escanear",
    "migration.back": "Volver",
    "migration.scanTitle": "Escanear QR de intercambio",
    "migration.scanDescription":
      "Usa la cámara o sube una imagen con el QR de intercambio.",
    "migration.error.invalidQr":
      "Este código QR no se pudo usar para migrar tu álbum. Verifica que sea un QR de intercambio válido.",
    "migration.reviewTitle": "Revisar datos de migración",
    "migration.reviewDescription":
      "Confirma los datos escaneados antes de reemplazar tu álbum local.",
    "migration.summary.collected": "Figuritas/tarjetas marcadas como conseguidas",
    "migration.summary.duplicates": "Figuritas/tarjetas marcadas como repetidas",
    "migration.summary.ignored": "Figuritas/tarjetas no compatibles ignoradas",
    "migration.confirmTitle": "¿Migrar álbum ahora?",
    "migration.confirmDescription":
      "¿Seguro que quieres migrar tu álbum? Esto sobrescribirá tu progreso actual.",
    "migration.confirmAction": "Migrar álbum",
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
