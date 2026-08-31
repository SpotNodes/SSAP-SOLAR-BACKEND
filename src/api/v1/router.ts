import { Router } from 'express';
import { adminAuthRouter } from '../../modules/admin/admin-auth.routes.js';
import { authRouter } from '../../modules/auth/auth.routes.js';
import { usersRouter } from '../../modules/users/user.routes.js';

export const v1Router = Router();

v1Router.use('/auth', authRouter);
v1Router.use('/users', usersRouter);
v1Router.use('/admin/auth', adminAuthRouter);

// More feature routers land here in later phases: categories, products, orders, devices,
// enquiries, admin/orders, admin/products, admin/categories.
