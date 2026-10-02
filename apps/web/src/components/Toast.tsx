import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useGarden } from '../store';

export function Toast() {
  const toast = useGarden((s) => s.toast);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 3600);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <AnimatePresence>
      {visible && toast && (
        <motion.div key={toast.id} className="toast" role="status" initial={{ opacity: 0, y: 20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 10, x: '-50%' }}>
          {toast.text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
