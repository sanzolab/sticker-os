"use client";

import { Copy, Download, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useTheme } from "next-themes";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { AppDrawer } from "@/components/ui/app-drawer";
import { Button } from "@/components/ui/button";
import { DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { OptionGroup } from "@/components/ui/option-group";
import { localeOptions, t } from "@/lib/i18n";
import { useStickerStore, type ThemePreference } from "@/lib/store";
import { stickerExportOptions, buildTxtExportByKind, getExportMeta, type ExportKind } from "@/lib/export";
import { copyText, downloadText } from "./export-actions";
import { SettingRow } from "./setting-row";

export function SettingsDrawer({
  open,
  onOpenChange,
  collectionName,
  collectionByStickerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionName: string;
  collectionByStickerId: Record<string, number>;
}) {
  const { setTheme } = useTheme();
  const [exportKind, setExportKind] = useState<ExportKind>("both");
  const settings = useStickerStore((state) => state.settings);
  const updateSetting = useStickerStore((state) => state.updateSetting);
  const resetCollection = useStickerStore((state) => state.resetCollection);
  const locale = useStickerStore((state) => state.settings.locale);

  const getExportText = () =>
    buildTxtExportByKind(
      exportKind,
      collectionName,
      collectionByStickerId,
      locale,
    );
  const exportMeta = getExportMeta(exportKind, locale);

  const updateTheme = (theme: ThemePreference) => {
    updateSetting("theme", theme);
    setTheme(theme);
  };

  return (
    <AppDrawer open={open} onOpenChange={onOpenChange}>
      <div className="space-y-5">
        <div>
          <DrawerTitle className="text-lg font-semibold">
            {t(locale, "settings.title")}
          </DrawerTitle>
          <DrawerDescription className="mt-1 text-sm text-muted-foreground">
            {t(locale, "settings.description")}
          </DrawerDescription>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {t(locale, "settings.language.title")}
          </p>
          <OptionGroup
            options={localeOptions.map((option) => ({
              value: option.id,
              label: t(locale, option.labelKey),
            }))}
            value={settings.locale}
            onChange={(value) => updateSetting("locale", value)}
            columns={2}
            buttonClassName="h-10 rounded-sm border text-sm font-medium transition-colors"
          />
        </div>
        <OptionGroup
          options={[
            { value: "dark", label: t(locale, "settings.theme.dark") },
            { value: "light", label: t(locale, "settings.theme.light") },
            { value: "system", label: t(locale, "settings.theme.system") },
          ]}
          value={settings.theme}
          onChange={updateTheme}
          columns={3}
          buttonClassName="h-10 rounded-sm border text-sm font-medium transition-colors"
        />
        <div className="space-y-4">
          <SettingRow
            title={t(locale, "settings.compactGrid.title")}
            description={t(locale, "settings.compactGrid.description")}
            checked={settings.compactMode}
            onChange={(checked) => updateSetting("compactMode", checked)}
          />
          <SettingRow
            title={t(locale, "settings.animations.title")}
            description={t(locale, "settings.animations.description")}
            checked={settings.animations}
            onChange={(checked) => updateSetting("animations", checked)}
          />
        </div>
        <div className="space-y-3 border-t pt-4">
          <div>
            <p className="mb-2 text-sm font-medium">
              {t(locale, "settings.export.title")}
            </p>
            <OptionGroup
              options={stickerExportOptions.map((option) => ({
                value: option.id,
                label: t(locale, option.labelKey),
              }))}
              value={exportKind}
              onChange={setExportKind}
              columns={3}
              buttonClassName="min-h-11 rounded-sm border px-2 text-sm font-medium transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="pill"
              className="shadow-none"
              onClick={async () => {
                const exportText = getExportText();
                const copied = await copyText(exportText);
                if (!copied) downloadText(exportMeta.fileName, exportText);
              }}
            >
              <Copy className="size-4" />
              {t(locale, "settings.export.copyTxt")}
            </Button>
            <Button
              size="pill"
              className="shadow-none"
              onClick={() => downloadText(exportMeta.fileName, getExportText())}
            >
              <Download className="size-4" />
              {t(locale, "settings.export.download")}
            </Button>
          </div>
        </div>
        <div className="space-y-3 border-t pt-4">
          <div>
            <p className="text-sm font-medium">
              {t(locale, "settings.reset.title")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t(locale, "settings.reset.description")}
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="pill"
                className="w-full border-destructive/40 text-destructive shadow-none hover:bg-destructive/10 hover:text-destructive"
              >
                <RotateCcw className="size-4" />
                {t(locale, "settings.reset.button")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t(locale, "settings.reset.dialogTitle")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t(locale, "settings.reset.dialogDescription")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel asChild>
                  <Button variant="secondary" className="shadow-none">
                    {t(locale, "settings.reset.dialogCancel")}
                  </Button>
                </AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button
                    variant="destructive"
                    className="shadow-none"
                    onClick={resetCollection}
                  >
                    {t(locale, "settings.reset.dialogConfirm")}
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </AppDrawer>
  );
}
