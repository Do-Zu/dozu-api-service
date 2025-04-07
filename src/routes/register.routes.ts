import { Router } from 'express';

interface IRouterRegister {
  path: string;
  router: Router;
}
const routes: IRouterRegister[] = [];

export const registerRoute = (path: string, router: Router) => {
  routes.push({ path, router });
};

export const getRoutes = () => routes;
