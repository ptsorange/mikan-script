"use client";

import { useLocale } from "@/app/_components/LocaleProvider";
import { PANELS, ICONS, type Panel } from "./panels";

type Props = {
  panel: Panel | null; // 開いているパネル(null = 閉じている)
  onSelect: (id: Panel) => void;
};

// 左端の縦バー(VS Code のアクティビティバー)
export default function ActivityBar({ panel, onSelect }: Props) {
  const { t } = useLocale();

  return (
    <nav className="kc-activity" aria-label={t.editor.activityAria}>
      {PANELS.map(({ id }) => {
        const active = panel === id;
        const label = t.editor.panels[id];
        return (
          <button
            key={id}
            className={`kc-act${active ? " is-active" : ""}`}
            aria-label={label}
            aria-pressed={active}
            title={label}
            onClick={() => onSelect(id)}
          >
            {ICONS[id]}
          </button>
        );
      })}
    </nav>
  );
}
