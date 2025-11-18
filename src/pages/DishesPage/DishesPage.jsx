import React, { useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import styles from './DishesPage.module.scss';
// row styles moved into this page's module; removed external import
import {
  fetchDishes,
  createDish,
  updateDish,
  deleteDish,
  toggleDishStatus,
  updateDishLocal,
  selectAllDishes,
  selectDishesLoading,
} from '../../store/dishSlice';
import { selectDishTypeOptions, fetchDishTypes as fetchDishTypesThunk } from '../../store/dishTypeSlice';
import backendConfig from '../../config/backend-config';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import ImageUploader from '../../components/ImageUploader/ImageUploader';
import DishRow from '../../components/DishRow/DishRow';

const DishesPage = () => {
  const dispatch = useDispatch();
  const dishes = useSelector(selectAllDishes);
  const loading = useSelector(selectDishesLoading);
  const dishTypeOptions = useSelector(selectDishTypeOptions);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState(null);
  const [form, setForm] = useState({ name: '', dishTypeId: '', price: '', description: '' });
  const [saving, setSaving] = useState(false);
  // image upload state: only keep the final uploaded image URL used when creating new dishes
  const [dishUploadedImageUrl, setDishUploadedImageUrl] = useState(null);

  useEffect(() => {
    dispatch(fetchDishes());
    dispatch(fetchDishTypesThunk());
  }, [dispatch]);

  const openModal = (dish = null) => {
    // refresh dish types each time modal opens to avoid stale options (helps prevent server-side DishType not found errors)
    dispatch(fetchDishTypesThunk());
    if (dish) {
      setEditingDish(dish);
      // fetched Dish objects include a nested `dishType` object (with `id`),
      // not always a `dishTypeId` scalar. Prefer nested id when available.
      setForm({ name: dish.name || '', dishTypeId: dish.dishType?.id || dish.dishTypeId || '', price: dish.price || '', description: dish.description || '' });
      // if editing and dish has imageUrl, show it
      setDishUploadedImageUrl(dish.imageUrl || null);
    } else {
      setEditingDish(null);
      setForm({ name: '', dishTypeId: '', price: '', description: '' });
      setDishUploadedImageUrl(null);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDish(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };  

  // uploadFn for ImageUploader: presign -> PUT -> poll processed key -> return public URL
  const uploadFn = async (file, onProgress) => {
    try {
      const now = () => new Date().toISOString();
      console.log(`[uploadFn] starting upload for file=${file.name} at ${now()}`);
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession({ forceRefresh: false });
      const token = session.tokens?.idToken?.toString();
      if (!token) throw new Error('Unable to get authentication token');

      const lambdaUrl = backendConfig.presignedUrlGenerator;
      const presignPayload = { authToken: token, fileName: file.name, contentType: file.type, imageType: 'dish-image' };
      console.log('[uploadFn] presign request payload:', presignPayload, 'at', now());
      const presignResp = await fetch(lambdaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(presignPayload)
      });
      console.log('[uploadFn] presign response status:', presignResp.status, 'at', now());
      if (!presignResp.ok) {
        const err = await presignResp.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to get presigned URL');
      }
      const responseData = await presignResp.json();
      const { presignedUrl, s3Key, expectedProcessedKey, s3Bucket } = responseData;
      console.log('[uploadFn] presign response body:', { presignedUrl, s3Key, expectedProcessedKey, s3Bucket }, 'at', now());
          
      const uploadResponse = await fetch(presignedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      console.log('[uploadFn] upload completed with status:', uploadResponse.status, 'for s3Key:', s3Key, 'at', now());
      if (!uploadResponse.ok) throw new Error('Failed to upload file to S3');

      // Reduce polling to minimize S3 HEAD requests: 3 total attempts (1 initial + 2 retries) at 2s interval
      const maxAttempts = 3;
      let attempts = 0;
          
      // Use the bucket returned by the presign generator to construct the public URL.
      const bucketForPublic = s3Bucket || backendConfig.dishImagesBucket;
      const publicUrl = `https://${bucketForPublic}.s3.${backendConfig.s3Region}.amazonaws.com/${expectedProcessedKey}`;
      // wait a short delay before first check
      await new Promise((res) => setTimeout(res, 2000));
      console.log('[uploadFn] begin polling for processed object at', publicUrl, 'at', now());
      while (attempts < maxAttempts) {
        try {
          const attemptNum = attempts + 1;
          const head = await fetch(publicUrl, { method: 'HEAD' });
          console.log(`[uploadFn] HEAD attempt ${attemptNum} status=${head.status} at ${now()}`);
          if (head.ok) {
            console.log('[uploadFn] processed object available at', publicUrl, 'at', now());
            // store for create-case
            setDishUploadedImageUrl(publicUrl);
            return publicUrl;
          }
        } catch (e) {
          console.log('[uploadFn] HEAD attempt error:', e, 'at', now());
        }
        attempts += 1;
        // wait 2 seconds between attempts
        await new Promise((res) => setTimeout(res, 2000));
      }
      console.log('[uploadFn] image processing timeout after attempts=', attempts, 'at', now());
      throw new Error('Image processing timeout');
    } catch (err) {
      console.error('[uploadFn] error:', err);
      throw err;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // client-side validation: ensure a dish type is selected and exists in known options
    if (!form.dishTypeId) {
      alert('请选择菜品分类');
      return;
    }
    const matchedType = dishTypeOptions.find((opt) => opt.value === form.dishTypeId);
    if (!matchedType) {
      // The selected dishTypeId isn't in the current options. Avoid sending a request that will fail server-side.
      alert('所选菜品分类不存在或不属于当前餐厅，请重新选择');
      return;
    }
    setSaving(true);
    try {
      if (editingDish) {
        await dispatch(updateDish({ id: editingDish.id, dishData: { name: form.name, dishTypeId: form.dishTypeId, price: Number(form.price), description: form.description, imageUrl: dishUploadedImageUrl || editingDish.imageUrl || null } })).unwrap();
      } else {
        await dispatch(createDish({ name: form.name, dishTypeId: form.dishTypeId, price: Number(form.price), description: form.description, imageUrl: dishUploadedImageUrl || null })).unwrap();
      }
      closeModal();
    } catch (err) {
      console.error('Save dish error', err);
      // show GraphQL/server error message when available
      alert(err?.message || err || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure to delete this dish?')) return;
    try {
      await dispatch(deleteDish(id)).unwrap();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Delete dish error', err);
      alert('Delete failed');
    }
  };

  const handleToggle = async (dish) => {
    // optimistic local update
    dispatch(updateDishLocal({ id: dish.id, isActive: !dish.isActive }));
    try {
      await dispatch(toggleDishStatus({ id: dish.id, isActive: !dish.isActive })).unwrap();
    } catch (err) {
      // rollback
      dispatch(updateDishLocal({ id: dish.id, isActive: dish.isActive }));
      console.error('Toggle dish status failed', err);
      alert('Toggle failed');
    }
  };

  const allRows = useMemo(() => dishes || [], [dishes]);
  // client-side filter state for Dish Type ('' means all)
  const [filterDishTypeId, setFilterDishTypeId] = useState('');
  const filteredRows = useMemo(() => {
    if (!filterDishTypeId) return allRows;
    // fetched dishes include `dishType` object; compare against its id when present
    return allRows.filter((d) => (d.dishType?.id || d.dishTypeId) === filterDishTypeId);
  }, [allRows, filterDishTypeId]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Dishes</h1>
        <button className={styles.addButton} onClick={() => openModal()}>Add Dish</button>
      </div>

      <div className={styles.filterRow}>
        <label>Dish Type:</label>
        <select value={filterDishTypeId} onChange={(e) => setFilterDishTypeId(e.target.value)}>
          <option value="">All</option>
          {dishTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button type="button" className={styles.resetButton} onClick={() => setFilterDishTypeId('')}>Reset</button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Image</th>
              <th>Dish Name</th>
              <th>Dish Type</th>
              <th>Price</th>
              <th>Updated At</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
                <tr><td colSpan="7">Loading...</td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td colSpan="7">No dishes found.</td></tr>
              ) : (
                filteredRows.map((dish, i) => (
                  <DishRow
                    key={dish.id}
                    index={i}
                    dish={dish}
                    onEdit={(d) => openModal(d)}
                    onDelete={(d) => handleDelete(d.id)}
                    onOptimistic={(id, isActive) => dispatch(updateDishLocal({ id, isActive }))}
                  />
                ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination stub matching screenshot */}
      <div className={styles.pagination}>
        <div className={styles.pagerLeft}>
          Go to <input type="number" defaultValue={1} className={styles.pageInput} /> page, total {filteredRows.length} items
        </div>
        <div className={styles.pagerRight}>
          <button disabled className={styles.pageBtn}>&lt;</button>
          <button className={styles.pageBtnActive}>1</button>
          <button disabled className={styles.pageBtn}>&gt;</button>
        </div>
      </div>

      {/* Modal for create/edit */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>{editingDish ? 'Edit Dish' : 'Add Dish'}</h2>
                <button className={styles.closeButton} onClick={closeModal}>✕</button>
              </div>
              <form onSubmit={handleSubmit} className={styles.form}>

                <div className={`${styles.formGroup} ${styles.formRow}`}>
                  <label className={styles.formLabel}>
                    <span className={styles.required}>*</span> Dish Name
                  </label>
                  <input name="name" value={form.name} onChange={handleChange} required className={styles.formControl} />
                </div>

                <div className={`${styles.formGroup} ${styles.formRow}`}>
                  <label className={styles.formLabel}>
                    <span className={styles.required}>*</span> Dish Type
                  </label>
                  <select name="dishTypeId" value={form.dishTypeId} onChange={handleChange} required className={styles.formControl}>
                    <option value="">Select</option>
                    {dishTypeOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>

                <div className={`${styles.formGroup} ${styles.formRow}`}>
                  <label className={styles.formLabel}>
                    <span className={styles.required}>*</span> Price
                  </label>
                  <input name="price" value={form.price} onChange={handleChange} placeholder="Enter price in cents (e.g. 1000)" className={styles.formControlSmall} />
                  <div className={styles.hintText}> (unit: cents)</div>
                </div>

                <div className={styles.formGroup}>
                  <label>
                    <span className={styles.required}>*</span> Dish Image
                  </label>
                  <div className={styles.formColumn}>
                    <ImageUploader
                      imageUrl={editingDish?.imageUrl || dishUploadedImageUrl}
                      uploadFn={uploadFn}
                      onUpload={(url) => {
                        setEditingDish(prev => prev ? ({...prev, imageUrl: url}) : prev);
                        setDishUploadedImageUrl(url);
                      }}
                      previewSize={160}
                    />
                  </div>
                </div>

                <div className={`${styles.formGroup} ${styles.formRow}`}>
                  <label className={styles.formLabel}>
                    <span className={styles.required}>*</span> Dish Description
                  </label>
                  <input name="description" value={form.description} onChange={handleChange} className={styles.formControl} />
                </div>

                <div className={styles.formActions}>
                  <button type="submit" className={styles.submitButton} disabled={saving}>
                    {saving ? (editingDish ? 'Updating...' : 'Creating...') : (editingDish ? 'Update' : 'Create')}
                  </button>
                  <button type="button" className={styles.cancelButton} onClick={closeModal}>Cancel</button>
                </div>
              </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default DishesPage;