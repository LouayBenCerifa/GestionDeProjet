export const ROUTES_CONST = {
	root: '/',
	signin: '/signin',
	register: '/signin/register',
	dashboardAdmin: '/dashboard/admin',
	dashboardEmployee: '/dashboard/employee',
	legacyAdmin: '/dashboard-admin',
	legacyEmployee: '/dashboard-employee',
} as const;

export type AppRouteKey = keyof typeof ROUTES_CONST;
