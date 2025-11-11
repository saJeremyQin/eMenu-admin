import React, { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateDishTypeLocal, toggleDishTypeStatus } from '../../store/dishTypeSlice';
import { hasPermission, ROLES } from '../../lib/permissions';
import styles from './DishTypeRow.module.scss';
import { selectUser } from '../../store/userSlice';
// use Redux thunk for network requests (no direct client here)

export default function DishTypeRow({ index, dishType, onEdit, onDelete, onOptimistic, onRequest, onSuccess, onRollback, isToggling }) {
    const dispatch = useDispatch();

    // per-row debounce + optimistic toggle
    const toggleTimerRef = useRef(null);
    const [inFlight, setInFlight] = useState(false);

    const handleToggle = (opts = {}) => {
        const id = dishType.id;
        const newStatus = typeof opts.newStatus === 'boolean' ? opts.newStatus : !dishType.isActive;

        // clear previous timer
        if (toggleTimerRef.current) {
            clearTimeout(toggleTimerRef.current);
        }

        // optimistic update: prefer parent callback if provided
        if (typeof opts.onOptimistic === 'function') {
            try {
                opts.onOptimistic(id, newStatus);
            } catch (e) { 
                /* swallow */ 
                console.log(e);  
            }
        } else {
            dispatch(updateDishTypeLocal({ id, isActive: newStatus }));
        }

        setInFlight(true);

        toggleTimerRef.current = setTimeout(async () => {
            try {
                if (typeof opts.onRequest === 'function') {
                    await opts.onRequest(id, newStatus);
                } else {
                    // use thunk from slice to perform server update
                    await dispatch(toggleDishTypeStatus({ id, isActive: newStatus })).unwrap();
                }

                if (typeof opts.onSuccess === 'function') {
                    await opts.onSuccess();
                }
            } catch (error) {
                if (typeof opts.onRollback === 'function') {
                    try { 
                        opts.onRollback(id); 
                    } catch (e) { 
                        /* swallow */ 
                        console.log(e);  
                    }
                } else {
                    // rollback local slice
                    dispatch(updateDishTypeLocal({ id, isActive: !!dishType.isActive }));
                }
                console.error('Toggle row error', error);
                alert('Failed to update status: ' + (error?.message || error));
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
    const canEdit = hasPermission('editDishType', role);

    return (
        <tr className={styles.row}>
            <td className={`${styles.cell} ${styles.numberCell}`}>{typeof index === 'number' ? index + 1 : '-'}</td>
            <td className={`${styles.cell} ${styles.nameCell}`}>
                <span className={styles.nameText}>{dishType.name}</span>
            </td>
            <td className={`${styles.cell} ${styles.aliasCell}`}>{dishType.alias || '-'}</td>
            <td className={`${styles.cell} ${styles.statusCell}`}>
                <div className={styles.statusInner}>
                    <span className={dishType.isActive ? styles.activeTag : styles.disabledTag}>
                        {dishType.isActive ? 'Active' : 'Disabled'}
                    </span>
                    {canEdit && (
                        <label className={styles.switch}>
                            <input
                                type="checkbox"
                                checked={!!dishType.isActive}
                                onChange={() => handleToggle({ onOptimistic, onRequest, onSuccess, onRollback, newStatus: !dishType.isActive })}
                                disabled={!canEdit || inFlight || !!isToggling}
                                aria-label={`Toggle ${dishType.name} status`}
                            />
                            <span className={styles.slider}></span>
                        </label>
                    )}
                </div>
            </td>
            <td className={`${styles.cell} ${styles.actions}`}>
                {canEdit ? (
                        <>
                            <button
                                className={styles.editButton}
                                onClick={() => onEdit?.(dishType)}
                                title="Edit"
                            >
                                ✏️
                            </button>
                            <button
                                className={styles.deleteButton}
                                onClick={() => onDelete?.(dishType)}
                                title="Delete"
                            >
                                🗑️
                            </button>
                        </>
                ) : (
                        <span className={styles.naText}>N/A</span>
                )}
            </td>
        </tr>
    );
}