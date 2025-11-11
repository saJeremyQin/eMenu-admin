import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import styles from './DishesPage.module.scss';
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

const DishesPage = () => {
  const dispatch = useDispatch();
  const dishes = useSelector(selectAllDishes);
  const loading = useSelector(selectDishesLoading);
  const dishTypeOptions = useSelector(selectDishTypeOptions);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState(null);
  const [form, setForm] = useState({ name: '', dishTypeId: '', price: '', description: '' });
  const [saving, setSaving] = useState(false);
  // image upload states (re-using CreateRestaurant upload flow)
  const [dishSelectedFile, setDishSelectedFile] = useState(null);
  const [dishPreviewUrl, setDishPreviewUrl] = useState(null);
  const [dishUploading, setDishUploading] = useState(false);
  const [dishUploadedImageUrl, setDishUploadedImageUrl] = useState(null);
  const [dishProcessing, setDishProcessing] = useState(false);
  const dishFileInputRef = useRef(null);

  useEffect(() => {
    dispatch(fetchDishes());
    dispatch(fetchDishTypesThunk());
  }, [dispatch]);

  const openModal = (dish = null) => {
    if (dish) {
      setEditingDish(dish);
      setForm({ name: dish.name || '', dishTypeId: dish.dishTypeId || '', price: dish.price || '', description: dish.description || '' });
      // if editing and dish has image URL, show it
      setDishUploadedImageUrl(dish.image || null);
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

  // rich-text contentEditable handler
  

  // image upload helpers (adapted from CreateRestaurant)
  const handleDishFileSelect = () => {
    dishFileInputRef.current?.click();
  };

  const handleDishFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      setDishSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setDishPreviewUrl(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const checkDishImageProcessing = async (processedKey, attempts = 0) => {
    if (attempts > 10) {
      setDishProcessing(false);
      alert('Image processing is taking longer than expected. You can still save the dish.');
      return;
    }

    try {
      const publicUrl = backendConfig.getS3PublicUrl(processedKey);
      const response = await fetch(publicUrl, { method: 'HEAD' });
      if (response.ok) {
        setDishProcessing(false);
        setDishUploadedImageUrl(publicUrl);
      } else {
        throw new Error('Image not ready');
      }
    } catch (err) {
      setTimeout(() => checkDishImageProcessing(processedKey, attempts + 1), 2000);
    }
  };

  const handleDishUpload = async () => {
    if (!dishSelectedFile) {
      alert('Please select a file first');
      return;
    }
    setDishUploading(true);
    setDishProcessing(false);
    try {
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession({ forceRefresh: false });
      const token = session.tokens?.idToken?.toString();
      if (!token) throw new Error('Unable to get authentication token');

      const lambdaUrl = backendConfig.presignedUrlGenerator;
      const response = await fetch(lambdaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authToken: token, fileName: dishSelectedFile.name, contentType: dishSelectedFile.type })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get presigned URL');
      }
      const { presignedUrl, s3Key, expectedProcessedKey } = await response.json();
      const uploadResponse = await fetch(presignedUrl, { method: 'PUT', headers: { 'Content-Type': dishSelectedFile.type }, body: dishSelectedFile });
      if (!uploadResponse.ok) throw new Error('Failed to upload file to S3');
      setDishProcessing(true);
      setTimeout(() => checkDishImageProcessing(expectedProcessedKey), 3000);
      alert('Image uploaded successfully! Processing in background...');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setDishUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingDish) {
        await dispatch(updateDish({ id: editingDish.id, dishData: { name: form.name, dishTypeId: form.dishTypeId, price: Number(form.price), description: form.description, image: dishUploadedImageUrl || editingDish.image || null } })).unwrap();
      } else {
        await dispatch(createDish({ name: form.name, dishTypeId: form.dishTypeId, price: Number(form.price), description: form.description, image: dishUploadedImageUrl || null })).unwrap();
      }
      closeModal();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Save dish error', err);
      alert('Save failed');
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

  const rows = useMemo(() => dishes || [], [dishes]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Dishes</h1>
        <button className={styles.addButton} onClick={() => openModal()}>Add Dish</button>
      </div>

      <div className={styles.filterRow}>
        <label>Dish Type:</label>
        <select>
          <option value="">Select</option>
          {dishTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <label>Publish Status:</label>
        <select>
          <option value="">Select</option>
          <option value="active">Published</option>
          <option value="draft">Draft</option>
        </select>

        <button className={styles.searchBtn}>Search</button>
        <button className={styles.resetBtn}>Reset</button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Dish Name</th>
              <th>Dish Type</th>
              <th>Publish Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan="5">No dishes found.</td></tr>
            ) : (
              rows.map((dish) => (
                <tr key={dish.id}>
                  <td className={styles.titleCell}>{dish.name}</td>
                  <td>{dish.dishTypeId}</td>
                  <td>{dish.createdAt ? new Date(dish.createdAt).toLocaleDateString() : ''}</td>
                  <td>{dish.isActive ? 'Published' : 'Draft'}</td>
                  <td>
                    <button className={styles.iconBtn} onClick={() => openModal(dish)}>Edit</button>
                    <button className={styles.iconBtn} onClick={() => handleDelete(dish.id)}>Delete</button>
                    <button className={styles.iconBtn} onClick={() => handleToggle(dish)}>{dish.isActive ? 'Unpublish' : 'Publish'}</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination stub matching screenshot */}
      <div className={styles.pagination}>
        <div className={styles.pagerLeft}>
          Go to <input type="number" defaultValue={1} className={styles.pageInput} /> page, total {rows.length} items
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

                <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <label style={{ minWidth: 160 }}>
                    <span className={styles.required}>*</span> Dish Name
                  </label>
                  <input name="name" value={form.name} onChange={handleChange} required style={{ flex: 1 }} />
                </div>

                <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <label style={{ minWidth: 160 }}>
                    <span className={styles.required}>*</span> Dish Type
                  </label>
                  <select name="dishTypeId" value={form.dishTypeId} onChange={handleChange} required style={{ flex: 1 }}>
                    <option value="">Select</option>
                    {dishTypeOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>

                <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <label style={{ minWidth: 160 }}>
                    <span className={styles.required}>*</span> Price
                  </label>
                  <input name="price" value={form.price} onChange={handleChange} placeholder="Enter price in cents (e.g. 1000)" style={{ width: 240 }} />
                  <div style={{ color: '#888', fontSize: 13 }}> (unit: cents)</div>
                </div>

                <div className={styles.formGroup}>
                  <label>
                    <span className={styles.required}>*</span> Dish Image
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div>
                      {(dishPreviewUrl || dishUploadedImageUrl) ? (
                        <img src={dishUploadedImageUrl || dishPreviewUrl} alt="Dish preview" style={{ width: 200, height: 200, objectFit: 'cover', borderRadius: 6 }} />
                      ) : (
                        <div className={styles.coverBox} style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className={styles.selectButton} onClick={handleDishFileSelect}>Select Image</button>
                      <button type="button" className={styles.uploadButton} onClick={handleDishUpload} disabled={!dishSelectedFile || dishUploading}>{dishUploading ? 'Uploading...' : 'Upload'}</button>
                    </div>

                    <input ref={dishFileInputRef} type="file" accept="image/*" onChange={handleDishFileChange} style={{ display: 'none' }} />
                    <div style={{ color: '#888', fontSize: 12 }}>Supported: JPG/PNG. Max 5MB. Images processed in background.</div>
                    {dishProcessing && <div style={{ marginTop: 8, color: '#999' }}>Processing...</div>}
                  </div>
                </div>

                <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <label style={{ minWidth: 160 }}>
                    <span className={styles.required}>*</span> Dish Description
                  </label>
                  <input name="description" value={form.description} onChange={handleChange} style={{ flex: 1 }} />
                </div>

                <div className={styles.formActions}>
                  <button type="submit" className={styles.submitButton} disabled={saving}>{saving ? 'Publishing...' : 'Publish'}</button>
                  <button type="button" className={styles.cancelButton} onClick={() => alert('Save as draft (example)')}>Draft</button>
                </div>
              </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default DishesPage;