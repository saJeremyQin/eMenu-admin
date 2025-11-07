import React from 'react';
import { useSelector } from 'react-redux';
import { hasPermission } from '../../lib/permissions';

const DishTypesPage = () => {
  const role = useSelector((state) => state.user.role);
  const canEdit = hasPermission('editDish', role); // reuse editDish permission for now

  return (
    <div>
      <h1>Dish Types</h1>
      {!canEdit && (
        <p style={{ color: '#888' }}>You have read-only access.</p>
      )}
      <p>Coming soon: list/create/update/delete dish types.</p>
    </div>
  );
};

export default DishTypesPage;
