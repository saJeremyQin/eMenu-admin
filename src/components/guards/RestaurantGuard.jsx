import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, Outlet } from 'react-router-dom';
import { selectHasRestaurant, selectRestaurant } from '../../store/restaurantSlice';
import { selectUser } from '../../store/userSlice';

const RestaurantGuard = ({ children }) => {
  const hasRestaurant = useSelector(selectHasRestaurant);
  const restaurant = useSelector(selectRestaurant);
  const user = useSelector(selectUser);
  const navigate = useNavigate();

  useEffect(() => {
  // debug logging removed
    // 没餐厅 -> 去创建
    if (hasRestaurant === false) {
      navigate('/restaurant/create', { replace: true });
      return;
    }
    // 若需要更严格的校验：user.restaurantId 必须匹配当前 restaurant.id
    if (hasRestaurant === true && user?.restaurantId && restaurant?.id && user.restaurantId !== restaurant.id) {
      // 非本餐厅用户，跳回首页或显示无权限
      navigate('/', { replace: true });
    }
  }, [hasRestaurant, user, restaurant, navigate]);

  if (hasRestaurant === null || hasRestaurant === undefined) return null;

  return children ?? <Outlet />;
};

export default RestaurantGuard;