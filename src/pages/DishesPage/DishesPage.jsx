import React from 'react';
import { useSelector } from 'react-redux';
import { hasPermission } from '../../lib/permissions';

const DishesPage = () => {
  const role = useSelector((state) => state.user.role);
  const canEdit = hasPermission('editDish', role);

  return (
    <div>
      <h1>Dishes</h1>
      {!canEdit && (
        <p style={{ color: '#888' }}>You have read-only access.</p>
      )}
      <p>Coming soon: list/create/update/delete dishes.</p>
    </div>
  );
};

export default DishesPage;
