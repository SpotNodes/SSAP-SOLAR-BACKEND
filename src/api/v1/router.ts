import { Router } from 'express';
import { adminAuthRouter } from '../../modules/admin/admin-auth.routes.js';
import { adminRouter } from '../../modules/admin/admin.routes.js';
import { authRouter } from '../../modules/auth/auth.routes.js';
import { catalogRouter } from '../../modules/catalog/catalog.routes.js';
import { ordersRouter } from '../../modules/orders/order.routes.js';
import { usersRouter } from '../../modules/users/user.routes.js';

export const v1Router = Router();

v1Router.use('/auth', authRouter);
v1Router.use('/users', usersRouter);
v1Router.use('/admin/auth', adminAuthRouter);
v1Router.use(catalogRouter);
v1Router.use('/orders', ordersRouter);
v1Router.use('/admin', adminRouter);

// More feature routers land here in later phases: devices, enquiries.
