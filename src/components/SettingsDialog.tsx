import { useEffect } from "react";
import { useT } from "../i18n";
import BackupActions from "./BackupActions";
import LangToggle from "./LangToggle";
import ThemeToggle from "./ThemeToggle";

interface Props {
  onClose: () => void;
  onOpenHelp: () => void;
  onChanged: () => void;
}

export default function SettingsDialog({ onClose, onOpenHelp, onChanged }: Props) {
  const { t } = useT();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="scrim" onMouseDown={onClose}>
      <div className="dialog settings-dialog" onMouseDown={(event) => event.stopPropagation()}>
        <div className="help-head">
          <h2>{t("设置", "Settings")}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t("关闭", "Close")}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="settings-section">
          <div className="settings-section-title">{t("帮助", "Help")}</div>
          <button
            className="settings-row"
            onClick={() => {
              onClose();
              onOpenHelp();
            }}
          >
            <span>?</span>
            <span>{t("使用说明 / 快捷键", "Guide / Shortcuts")}</span>
          </button>
        </div>

        <div className="settings-section">
          <div className="settings-section-title">{t("数据", "Data")}</div>
          <BackupActions onChanged={onChanged} />
        </div>

        <div className="settings-section">
          <div className="settings-section-title">{t("偏好", "Preferences")}</div>
          <LangToggle />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
