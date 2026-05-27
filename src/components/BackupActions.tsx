import { useState } from "react";
import { exportBackup, importBackup } from "../utils/backup";

interface Props {
  onChanged: () => void;
}

export default function BackupActions({ onChanged }: Props) {
  const [busy, setBusy] = useState(false);

  const onExport = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const path = await exportBackup();
      if (path) alert(`已导出到\n${path}`);
    } catch (e) {
      alert(`导出失败：${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const onImport = async () => {
    if (busy) return;
    if (!confirm("导入会清空当前所有数据并替换为备份文件中的数据，是否继续？")) return;
    setBusy(true);
    try {
      const res = await importBackup();
      if (res) {
        alert(`已导入 ${res.replaced} 个任务（及其他数据）。`);
        onChanged();
      }
    } catch (e) {
      alert(`导入失败：${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="backup-actions">
      <button className="nav-item" onClick={onExport} disabled={busy}>
        <span>💾</span>
        <span>导出备份</span>
      </button>
      <button className="nav-item" onClick={onImport} disabled={busy}>
        <span>📂</span>
        <span>导入备份</span>
      </button>
    </div>
  );
}
