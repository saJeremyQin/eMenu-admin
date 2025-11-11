import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { hasPermission } from '../../lib/permissions';
import styles from './DishTypesPage.module.scss';
import DishTypeRow from '../../components/DishTypeRow/DishTypeRow';
import {
  fetchDishTypes as fetchDishTypesThunk,
  createDishType,
  updateDishType,
  deleteDishType,
  toggleDishTypeStatus,
  updateDishTypeLocal,
  selectAllDishTypes,
  selectDishTypesLoading
} from '../../store/dishTypeSlice';

const DishTypesPage = () => {
  const dispatch = useDispatch();
  const role = useSelector((state) => state.user.role);
  const canEdit = hasPermission('editDishType', role);
  const canCreate = hasPermission('createDishType', role);

  const dishTypes = useSelector(selectAllDishTypes);
  const loadingList = useSelector(selectDishTypesLoading);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDishType, setEditingDishType] = useState(null);
  const [formData, setFormData] = useState({ name: '', alias: '' });
  const [loading, setLoading] = useState(false);
  const [togglingIds, setTogglingIds] = useState(new Set()); // 记录正在切换状态的 ID

  // fetch via thunk
  useEffect(() => {
    dispatch(fetchDishTypesThunk());
  }, [dispatch]);

  const handleOpenModal = (dishType = null) => {
    if (dishType) {
      setEditingDishType(dishType);
      setFormData({
        name: dishType.name,
        alias: dishType.alias
      });
    } else {
      setEditingDishType(null);
      setFormData({ name: '', alias: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDishType(null);
    setFormData({ name: '', alias: '' });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.alias.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      if (editingDishType) {
        // conservative update via thunk
        await dispatch(updateDishType({ id: editingDishType.id, input: { name: formData.name, alias: formData.alias } })).unwrap();
      } else {
        // conservative create via thunk
        await dispatch(createDishType({ name: formData.name, alias: formData.alias })).unwrap();
      }

      handleCloseModal();
    } catch (error) {
      // better error reporting
      const errorMessage = error?.message || 'Save failed';
      console.error('Save Error:', error);
      alert(`Save failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (dishTypeId) => {
    if (!window.confirm('Are you sure you want to delete this dish type?')) return;
    setLoading(true);
    try {
      await dispatch(deleteDishType(dishTypeId)).unwrap();
    } catch (error) {
      console.error('Delete Error:', error);
      alert('Delete failed, please try again');
    } finally {
      setLoading(false);
    }
  };

  // Note: row-level toggle is handled by DishTypeRow with optimistic update;
  // parent only manages togglingIds set for UX (disable while in-flight).

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Dish Types</h1>
        {canCreate && (
          <button 
            className={styles.addButton}
            onClick={() => handleOpenModal()}
          >
            Add Dish Type
          </button>
        )}
      </div>

      {!canEdit && (
        <p className={styles.readOnlyNotice}>You currently have read-only access</p>
      )}

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>No.</th>
              <th>Dish Type Name</th>
              <th>Dish Type Alias</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {dishTypes.length === 0 ? (
              loadingList ? (
                <tr>
                  <td colSpan="5" className={styles.emptyState}>
                    Loading dish types...
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan="5" className={styles.emptyState}>
                    No dish types found.
                  </td>
                </tr>
              )
            ) : (
              dishTypes.map((dishType, index) => (
                <DishTypeRow
                  key={dishType.id}
                  index={index}
                  dishType={dishType}
                  onEdit={() => handleOpenModal(dishType)}
                  onDelete={() => handleDelete(dishType.id)}
                  isToggling={togglingIds.has(dishType.id)}
                  onOptimistic={(id, newStatus) => {
                    // optimistic update in redux-local slice and mark loading
                    dispatch(updateDishTypeLocal({ id, isActive: newStatus }));
                    setTogglingIds(prev => new Set([...prev, id]));
                  }}
                  onRequest={async (id, newStatus) => {
                    // dispatch thunk that updates server conservatively
                    await dispatch(toggleDishTypeStatus({ id, isActive: newStatus })).unwrap();
                  }}
                  onSuccess={() => {
                    // toggle thunk updates slice on success; clear loading mark
                    setTogglingIds(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(dishType.id);
                      return newSet;
                    });
                  }}
                  onRollback={(id) => {
                    // rollback optimistic update in slice and clear loading mark
                    // revert by setting isActive to the opposite of current optimistic value
                    const current = dishTypes.find((d) => d.id === id);
                    if (current) {
                      dispatch(updateDishTypeLocal({ id, isActive: !!current.isActive }));
                    }
                    setTogglingIds(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(id);
                      return newSet;
                    });
                  }}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingDishType ? 'Edit Dish Type' : 'Add Dish Type'}</h2>
              <button 
                className={styles.closeButton}
                onClick={handleCloseModal}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label>
                  <span className={styles.required}>*</span> Dish Type Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Please enter dish type name"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>
                  <span className={styles.required}>*</span> Dish Type Alias
                </label>
                <input
                  type="text"
                  name="alias"
                  value={formData.alias}
                  onChange={handleInputChange}
                  placeholder="Please enter dish type alias"
                  required
                />
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={handleCloseModal}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DishTypesPage;
