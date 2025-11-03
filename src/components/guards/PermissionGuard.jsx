/**
 * Role-based route guard component
 * Redirects to home page if user doesn't have permission
 */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { hasPermission } from '../../lib/permissions';

/**
 * Guard wrapper for routes that require specific permissions
 * @param {Object} props
 * @param {React.ReactNode} props.children - The component to render if authorized
 * @param {string} props.permission - Permission key to check
 * @param {string} props.redirectTo - Path to redirect if not authorized (default: '/')
 */
export const PermissionGuard = ({ children, permission, redirectTo = '/' }) => {
  const userRole = useSelector((state) => state.user.role);
  const isAuthenticated = useSelector((state) => state.user.isAuthenticated);
  
  // Wait for authentication state to load
  if (!isAuthenticated) {
    return null; // Or a loading spinner
  }
  
  // Check permission
  if (!hasPermission(permission, userRole)) {
    console.warn(`Permission "${permission}" denied for role "${userRole}"`);
    return <Navigate to={redirectTo} replace />;
  }
  
  return children;
};

export default PermissionGuard;
