import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { hasPermission } from '../../lib/permissions';
import styles from './DishTypesPage.module.scss';
import { generateClient } from 'aws-amplify/api';

const client = generateClient();

const DishTypesPage = () => {
  const role = useSelector((state) => state.user.role);
  const canEdit = hasPermission('editDish', role);

  const [dishTypes, setDishTypes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDishType, setEditingDishType] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    alias: ''
  });
  const [loading, setLoading] = useState(false);
  const [togglingIds, setTogglingIds] = useState(new Set()); // 记录正在切换状态的 ID

  // 防抖 timer refs
  const toggleTimers = useRef({});

  // TODO: 从后端获取 dish types 列表
  useEffect(() => {
    fetchDishTypes();
  }, []);

  const fetchDishTypes = async () => {
    const query = /* GraphQL */`
      query ListDishTypes {
        listDishTypes {
          id
          name
          alias
          sortOrder
          isActive
        }
      }
    `;
    const resp = await client.graphql({ query });
    setDishTypes(resp?.data?.listDishTypes || []);
    
    // // 临时模拟数据
    // setDishTypes([
    //   { id: '1', name: 'Appetizers', alias: '前菜', sortOrder: 1, isActive: true },
    //   { id: '2', name: 'Main Course', alias: '主菜', sortOrder: 2, isActive: true },
    //   { id: '3', name: 'Desserts', alias: '甜点', sortOrder: 3, isActive: false },
    //   { id: '4', name: 'Beverages', alias: '饮料', sortOrder: 4, isActive: true },
    // ]);
  };

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
        // 调用更新 API
        const mutation = /* GraphQL */ `
          mutation UpdateDishType($id: ID!, $input: DishTypeInput!) {
            updateDishType(id: $id, input: $input) {
              id
              name
              alias
              sortOrder
              isActive
              updatedAt
            }
          }
        `;
        const resp = await client.graphql({
          query: mutation,
          variables: { 
            id: editingDishType.id,
            input: {
              name: formData.name,
              alias: formData.alias
              // sortOrder 可选，不传则保持原值
            }
          }
        });
        console.log('Updated Dish Type:', resp?.data?.updateDishType);
      } else {
        // 调用创建 API
        const mutation = /* GraphQL */ `
          mutation CreateDishType($input: DishTypeInput!) {
            createDishType(input: $input) {
              id
              name
              alias
              sortOrder
              isActive
              createdAt
            }
          }
        `;
        const resp = await client.graphql({
          query: mutation,
          variables: { 
            input: {
              name: formData.name,
              alias: formData.alias
              // sortOrder 可选，后端会自动计算
              // isActive 不需要传，后端默认为 true
            }
          }
        });
        console.log('Created Dish Type:', resp?.data?.createDishType);       
      }
      
      // 刷新列表
      await fetchDishTypes();
      handleCloseModal();
    } catch (error) {
      console.error('Save Error:', error);
      
      // 更详细的错误提示
      const errorMessage = error?.errors?.[0]?.message || error?.message || 'Unknown error';
      alert(`Save failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (dishTypeId) => {
    if (!window.confirm('Are you sure you want to delete this dish type?')) {
      return;
    }

    setLoading(true);
    try {
      // TODO: 调用删除 API
      console.log('Delete Dish Type:', dishTypeId);
      const mutation = /* GraphQL */ `
        mutation DeleteDishType($id: ID!) {
          deleteDishType(id: $id) {
            id
          }
        }
      `;
      const resp = await client.graphql({
        query: mutation,
        variables: { id: dishTypeId }
      });

      if(resp?.errors && resp.errors.length > 0) {
        throw new Error(resp.errors[0].message);
      }
      console.log('Deleted Dish Type:', resp?.data?.deleteDishType?.id);

      // 刷新列表
      await fetchDishTypes();
    } catch (error) {
      console.error('Delete Error:', error);
      alert('Delete failed, please try again');
    } finally {
      setLoading(false);
    }
  };

  // 切换状态处理函数（带防抖和乐观更新）
  const handleToggleStatus = useCallback((dishTypeId, newStatus) => {
    // 清除之前的定时器
    if (toggleTimers.current[dishTypeId]) {
      clearTimeout(toggleTimers.current[dishTypeId]);
    }

    // 乐观更新 UI（立即改变前端状态）
    setDishTypes(prev => 
      prev.map(dt => 
        dt.id === dishTypeId 
          ? { ...dt, isActive: newStatus }
          : dt
      )
    );

    // 标记为正在切换
    setTogglingIds(prev => new Set([...prev, dishTypeId]));

    // 300ms 防抖
    toggleTimers.current[dishTypeId] = setTimeout(async () => {
      try {
        // TODO: 调用后端 API
        // console.log('Toggle DishType Status:', { id: dishTypeId, isActive: newStatus });
        
        const mutation = `
          mutation ToggleDishTypeStatus($id: ID!, $isActive: Boolean!) {
            toggleDishTypeStatus(id: $id, isActive: $isActive) {
              id
              isActive
            }
          }
        `;
        const resp = await client.graphql({
          query: mutation,
          variables: { id: dishTypeId, isActive: newStatus }
        });
        console.log('toggle Dish Type status', resp?.data?.ToggleDishTypeStatus.id);
        

        // 成功后重新获取列表（可选，如果信任乐观更新可以不调用）
        await fetchDishTypes();
        
      } catch (error) {
        console.error('Toggle Status Error:', error);
        
        // 失败则回滚 UI 状态
        setDishTypes(prev => 
          prev.map(dt => 
            dt.id === dishTypeId 
              ? { ...dt, isActive: !newStatus }
              : dt
          )
        );
        
        alert('Failed to update status, please try again');
      } finally {
        // 移除 loading 标记
        setTogglingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(dishTypeId);
          return newSet;
        });
        delete toggleTimers.current[dishTypeId];
      }
    }, 300); // 300ms 防抖延迟
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Dish Types</h1>
        {canEdit && (
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
              <tr>
                <td colSpan="5" className={styles.emptyState}>
                  No dish types found.
                </td>
              </tr>
            ) : (
              dishTypes.map((dishType, index) => (
                <tr key={dishType.id}>
                  <td>{index + 1}</td>
                  <td>{dishType.name}</td>
                  <td>{dishType.alias}</td>
                  <td>
                    <div className={styles.statusCell}>
                      <span className={dishType.isActive ? styles.activeTag : styles.disabledTag}>
                        {dishType.isActive ? 'Active' : 'Disabled'}
                      </span>
                      {canEdit && (
                        <label className={styles.switch}>
                          <input
                            type="checkbox"
                            checked={dishType.isActive}
                            onChange={() => handleToggleStatus(dishType.id, !dishType.isActive)}
                            disabled={togglingIds.has(dishType.id)}
                          />
                          <span className={styles.slider}></span>
                        </label>
                      )}
                    </div>
                  </td>
                  <td className={styles.actions}>
                    {canEdit && (
                      <>
                        <button
                          className={styles.editButton}
                          onClick={() => handleOpenModal(dishType)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          className={styles.deleteButton}
                          onClick={() => handleDelete(dishType.id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </td>
                </tr>
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
