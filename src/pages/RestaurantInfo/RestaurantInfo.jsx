import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './RestaurantInfo.module.scss';
import { generateClient } from 'aws-amplify/api';
import { useSelector, useDispatch } from 'react-redux';
import { selectRestaurant, selectRestaurantLoaded, setRestaurant } from '../../store/restaurantSlice';

const client = generateClient();

const RestaurantInfo = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // read restaurant from redux
  const restaurant = useSelector(selectRestaurant);
  const restaurantLoaded = useSelector(selectRestaurantLoaded);

  const [formData, setFormData] = React.useState({
    name: '',
    address: '',
    phone: ''
  });

  // initialize form when restaurant is loaded/changes
  React.useEffect(() => {
    if (restaurant && restaurantLoaded) {
      setFormData({
        name: restaurant.name || '',
        address: restaurant.address || '',
        phone: restaurant.phone || ''
      });
    }
  }, [restaurant, restaurantLoaded]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.address || !formData.phone) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const mutation = /* GraphQL */ `
        mutation UpdateRestaurantInfo($input: RestaurantInfoInput!) {
          updateRestaurantInfo(input: $input) {
            id
            name
            address
            phone
            image
          }
        }
      `;
      const res = await client.graphql({ 
        query: mutation, 
        variables: { input: formData } 
      });
      const updated = res?.data?.updateRestaurantInfo;
      alert('Restaurant updated successfully!');
      // update redux store with latest restaurant info
      if (updated) {
        dispatch(setRestaurant(updated));
        console.log('Updated restaurant stored in redux:', updated);
      }
    } catch (e) {
      console.error('Update failed', e);
      alert('Update failed: ' + (e.message || 'Unknown error'));
    }
  };

  if (!restaurantLoaded) return <div className={styles.container}><p>Loading...</p></div>;
  if (!restaurant) return <div className={styles.container}><p>No restaurant found.</p></div>;

  return (
    <div className={styles.container}>
      <h1>Restaurant Info</h1>
      
      <form onSubmit={onSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label htmlFor="name">Restaurant Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            placeholder="Enter restaurant name"
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="address">Address *</label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            required
            placeholder="Enter restaurant address"
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="phone">Phone Number *</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            required
            placeholder="Enter phone number"
          />
        </div>

        <div className={styles.logoSection}>
          <h3>Restaurant Logo</h3>
          
          <div className={styles.imagePreview}>
            {restaurant.image ? (
              <img 
                src={restaurant.image} 
                alt="Restaurant logo" 
                className={styles.previewImage}
              />
            ) : (
              <div className={styles.placeholderImage}>
                <span>No logo uploaded</span>
              </div>
            )}
          </div>
          
          <p className={styles.uploadNote}>
            Logo upload functionality can be added here
          </p>
        </div>

        <div className={styles.submitSection}>
          <button type="submit" className={styles.submitButton}>
            Save Changes
          </button>
          <button 
            type="button" 
            onClick={() => navigate('/restaurant')}
            className={styles.cancelButton}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default RestaurantInfo;
