import React, { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateDishLocal, toggleDishStatus } from '../../store/dishSlice';
import backendConfig from '../../config/backend-config';
import { hasPermission } from '../../lib/permissions';
import styles from './DishRow.module.scss';
import { selectUser } from '../../store/userSlice';

export default function DishRow({ index, dish, onEdit, onDelete, onOptimistic, onRequest, onSuccess, onRollback, isToggling }) {
  const dispatch = useDispatch();
  const toggleTimerRef = useRef(null);
  const [inFlight, setInFlight] = useState(false);

  const handleToggle = (opts = {}) => {
    const id = dish.id;
    const newStatus = typeof opts.newStatus === 'boolean' ? opts.newStatus : !dish.isActive;

    if (toggleTimerRef.current) {
      clearTimeout(toggleTimerRef.current);
    }

    if (typeof opts.onOptimistic === 'function') {
      try { opts.onOptimistic(id, newStatus); } catch (e) { console.log(e); }
    } else {
      dispatch(updateDishLocal({ id, isActive: newStatus }));
    }

    setInFlight(true);

    toggleTimerRef.current = setTimeout(async () => {
      try {
        if (typeof opts.onRequest === 'function') {
          await opts.onRequest(id, newStatus);
        } else {
          await dispatch(toggleDishStatus({ id, isActive: newStatus })).unwrap();
        }
        if (typeof opts.onSuccess === 'function') await opts.onSuccess();
      } catch (error) {
        if (typeof opts.onRollback === 'function') {
          try { opts.onRollback(id); } catch (e) { console.log(e); }
        } else {
          // rollback local slice
          dispatch(updateDishLocal({ id, isActive: !!dish.isActive }));
        }
        console.error('Toggle dish error', error);
        alert('Failed to update dish status: ' + (error?.message || error));
      } finally {
        setInFlight(false);
        if (toggleTimerRef.current) {
          clearTimeout(toggleTimerRef.current);
          toggleTimerRef.current = null;
        }
      }
    }, 300);
  };

  const user = useSelector(selectUser);
  const role = user?.role;
  const canEdit = hasPermission('editDish', role);

  return (
    <tr className={styles.row}>
      <td className={`${styles.cell} ${styles.imageCell}`}>
        {(() => {
          let src = dish.imageUrl || '';
          if (src && !src.startsWith('http')) {
            try { src = backendConfig.getS3PublicUrl(src); } catch (e) { /* fallback */ }
          }
          return src ? <img src={src} alt={dish.name} className={styles.dishImage} /> : <div className={styles.noImage}>No image</div>;
        })()}
      </td>
      <td className={`${styles.titleCell} ${styles.nameCell}`}>{dish.name}</td>
      <td className={`${styles.cell} ${styles.aliasCell}`}>{dish.dishType?.name || ''}</td>
      <td className={`${styles.cell} ${styles.priceCell}`}>{typeof dish.price === 'number' ? new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(dish.price / 100) : ''}</td>
      <td className={styles.cell}>{(dish.updatedAt || dish.createdAt) ? new Date(dish.updatedAt || dish.createdAt).toLocaleDateString() : ''}</td>
      <td className={`${styles.cell} ${styles.statusCell}`}>
        <div className={styles.statusInner}>
          <span className={dish.isActive ? styles.activeTag : styles.disabledTag}>{dish.isActive ? 'Active' : 'Disabled'}</span>
          {canEdit && (
            <label className={styles.switch}>
              <input
                type="checkbox"
                checked={!!dish.isActive}
                onChange={() => handleToggle({ onOptimistic, onRequest, onSuccess, onRollback, newStatus: !dish.isActive })}
                disabled={!canEdit || inFlight || !!isToggling}
                aria-label={`Toggle ${dish.name} status`}
              />
              <span className={styles.slider}></span>
            </label>
          )}
        </div>
      </td>
      <td className={styles.cell}>
        <div className={styles.actions}>
          {canEdit ? (
            <>
              <button className={styles.editButton} onClick={() => onEdit?.(dish)} title="Edit">✏️</button>
              <button className={styles.deleteButton} onClick={() => onDelete?.(dish)} title="Delete">🗑️</button>
            </>
          ) : (
            <span className={styles.naText}>N/A</span>
          )}
        </div>
      </td>
    </tr>
  );
}
