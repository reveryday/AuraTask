import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export default function WindowControls() {
  const [maximized, setMaximized] = useState(false);
  const win = getCurrentWindow();

  useEffect(() => {
    let mounted = true;
    win.isMaximized().then((v) => {
      if (mounted) setMaximized(v);
    });
    const unlistenP = win.onResized(async () => {
      const v = await win.isMaximized();
      if (mounted) setMaximized(v);
    });
    return () => {
      mounted = false;
      unlistenP.then((un) => un());
    };
  }, [win]);

  return (
    <div className="window-controls" data-tauri-drag-region={false}>
      <button
        className="winctrl winctrl-min"
        title="最小化"
        onClick={() => win.minimize()}
        aria-label="最小化"
      />
      <button
        className="winctrl winctrl-max"
        title={maximized ? "还原" : "最大化"}
        onClick={() => win.toggleMaximize()}
        aria-label="最大化"
      />
      <button
        className="winctrl winctrl-close"
        title="关闭"
        onClick={() => win.close()}
        aria-label="关闭"
      />
    </div>
  );
}
