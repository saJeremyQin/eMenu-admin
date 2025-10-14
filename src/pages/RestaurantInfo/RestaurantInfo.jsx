import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './RestaurantInfo.module.scss';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';

const client = generateClient();

const RestaurantInfo = () => {
  const [loading, setLoading] = React.useState(true);
  const [restaurant, setRestaurant] = React.useState(null);
  const [formData, setFormData] = React.useState({
    name: '',
    address: '',
    phone: ''
  });
  const navigate = useNavigate();

  React.useEffect(() => {
    const run = async () => {
      try {
        const user = await getCurrentUser();
        
        // 直接获取餐厅信息（后端会根据用户身份自动查找关联的餐厅）
        const restaurantQuery = /* GraphQL */ `
          query GetRestaurant {
            getRestaurant {
              id name address phone image subscriptionPlan subscriptionExpiry
            }
          }
        `;
        const restaurantRes = await client.graphql({ 
          query: restaurantQuery
        });
        
        console.log('Restaurant data:', restaurantRes?.data?.getRestaurant);
        const restaurantData = restaurantRes?.data?.getRestaurant;
        setRestaurant(restaurantData);
        
        if (restaurantData) {
          setFormData({
            name: restaurantData.name || '',
            address: restaurantData.address || '',
            phone: restaurantData.phone || ''
          });
        }
      } catch (e) {
        console.error('Load restaurant failed', e);
        setRestaurant(null);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

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
            id name address phone image
          }
        }
      `;
      await client.graphql({ 
        query: mutation, 
        variables: { 
          input: formData 
        } 
      });
      alert('Restaurant updated successfully!');
      
      // 重新加载餐厅数据
      window.location.reload();
    } catch (e) {
      console.error('Update failed', e);
      alert('Update failed: ' + (e.message || 'Unknown error'));
    }
  };

  if (loading) return <div className={styles.container}><p>Loading...</p></div>;
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
