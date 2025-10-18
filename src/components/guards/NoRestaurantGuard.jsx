import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, Outlet } from 'react-router-dom';
import { selectHasRestaurant } from '../../store/restaurantSlice';

const NoRestaurantGuard = ({ children }) => {
  const hasRestaurant = useSelector(selectHasRestaurant);
  const navigate = useNavigate();

  useEffect(() => {
    if (hasRestaurant === false) {
      navigate('/restaurant/create', { replace: true });
    }
  }, [hasRestaurant, navigate]);

  // 等待状态时可以显示占位或 null
  if (hasRestaurant === null || hasRestaurant === undefined) return null;

  return children ?? <Outlet />;
};

export default NoRestaurantGuard;
